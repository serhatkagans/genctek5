"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { paydasGirdisiniCoz, type PaydasGirdisi } from "@/lib/paydas/kurallar";
import { koordinatorIlKodu, paydasYonetebilirMi } from "@/lib/yetki/izinler";
import { paydasKapsamFiltresi } from "@/lib/yetki/kapsam";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Paydaş envanteri sunucu eylemleri.
 *
 * Kararlar burada verilmez: doğrulama src/lib/paydas/kurallar.ts'e, yetki
 * src/lib/yetki'ye sorulur. Bu dosyanın işi formu çözmek, kuralı çağırmak,
 * yazmak ve loglamaktır.
 */

const YOL = "/panel/paydaslar";

function metin(veri: FormData, alan: string): string {
  return String(veri.get(alan) ?? "").trim();
}

function sayi(veri: FormData, alan: string): number | null {
  const deger = Number.parseInt(metin(veri, alan), 10);
  return Number.isFinite(deger) ? deger : null;
}

function hataylaDon(yol: string, mesaj: string): never {
  redirect(`${yol}?hata=${encodeURIComponent(mesaj)}`);
}

function formuCoz(veri: FormData): PaydasGirdisi {
  return {
    ad: metin(veri, "ad"),
    tur: metin(veri, "tur"),
    ilKodu: metin(veri, "ilKodu"),
    yetkiliKisi: metin(veri, "yetkiliKisi"),
    eposta: metin(veri, "eposta"),
    telefon: metin(veri, "telefon"),
    adres: metin(veri, "adres"),
    isBirligiAlani: metin(veri, "isBirligiAlani"),
    notlar: metin(veri, "notlar"),
  };
}

/**
 * İl koordinatörü hangi il için kayıt açarsa açsın kendi iline yazar: form
 * alanı taşımak yerine roldan okunur. Merkez (YEĞİTEK) ise ili formdan seçer,
 * çünkü tüm illerde kayıt açabilir.
 */
function hedefIlKodu(
  kullanici: Awaited<ReturnType<typeof oturumKullanicisiZorunlu>>,
  formdakiIl: string,
): string {
  return koordinatorIlKodu(kullanici) ?? formdakiIl;
}

export async function paydasEkleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const girdi = formuCoz(veri);
  girdi.ilKodu = hedefIlKodu(kullanici, girdi.ilKodu);

  // Yetki, kaydın İLİNE bakar: il koordinatörü başka ilin paydaşını ekleyemez.
  if (!paydasYonetebilirMi(kullanici, girdi.ilKodu)) {
    throw new YetkiHatasi(
      "Paydaş kaydını yalnızca ilin koordinatörü ve proje yöneticisi ekleyebilir.",
    );
  }

  const karar = paydasGirdisiniCoz(girdi);
  if (!karar.olurMu) hataylaDon(YOL, karar.neden);

  const il = await prisma.il.findUnique({
    where: { ilKodu: karar.kayit.ilKodu },
    select: { ilKodu: true },
  });
  if (!il) hataylaDon(YOL, "Seçilen il bulunamadı.");

  /*
   * Aynı ilde aynı adla ikinci AKTİF kayıt açılmaz (veritabanında kısmi unique
   * index olarak da duruyor). Kontrolü burada da yapıyoruz ki kullanıcı ham
   * veritabanı hatası yerine ne yapması gerektiğini söyleyen bir mesaj görsün.
   */
  const mevcut = await prisma.paydas.findFirst({
    where: {
      ilKodu: karar.kayit.ilKodu,
      ad: { equals: karar.kayit.ad, mode: "insensitive" },
      aktif: true,
    },
    select: { id: true },
  });
  if (mevcut) {
    hataylaDon(
      YOL,
      "Bu ilde aynı adla aktif bir paydaş zaten var; mevcut kaydı düzenleyin.",
    );
  }

  const paydas = await prisma.paydas.create({
    data: { ...karar.kayit, ekleyenKullaniciId: kullanici.id },
    select: { id: true },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PAYDAS",
    hedefId: paydas.id,
    detay: `Paydaş eklendi: ${karar.kayit.ad} (${karar.kayit.ilKodu})`,
  });

  revalidatePath(YOL);
  redirect(`${YOL}/${paydas.id}?durum=eklendi`);
}

/**
 * Kayda erişim önce KAPSAM filtresinden geçer: kapsam dışındaki bir paydaş
 * 404 döner, 403 değil — kaydın varlığı bile sızmamalı
 * (references/permissions.md Bölüm 4).
 */
async function yonetilebilirPaydasGetir(paydasId: number) {
  const kullanici = await oturumKullanicisiZorunlu();

  const paydas = await prisma.paydas.findFirst({
    where: { AND: [{ id: paydasId }, paydasKapsamFiltresi(kullanici)] },
    select: { id: true, ad: true, ilKodu: true, aktif: true },
  });
  if (!paydas) throw new BulunamadiHatasi();

  if (!paydasYonetebilirMi(kullanici, paydas.ilKodu)) {
    throw new YetkiHatasi("Bu paydaş kaydını düzenleme yetkiniz yok.");
  }

  return { kullanici, paydas, yol: `${YOL}/${paydasId}` };
}

export async function paydasGuncelleEylemi(veri: FormData): Promise<void> {
  const paydasId = sayi(veri, "paydasId");
  if (paydasId === null) throw new BulunamadiHatasi();

  const { kullanici, paydas, yol } = await yonetilebilirPaydasGetir(paydasId);

  const girdi = formuCoz(veri);
  // İl DEĞİŞTİRİLEMEZ: kaydı başka ile taşımak, o ilin koordinatörünün
  // envanterine onun haberi olmadan satır eklemek olurdu.
  girdi.ilKodu = paydas.ilKodu;

  const karar = paydasGirdisiniCoz(girdi);
  if (!karar.olurMu) hataylaDon(yol, karar.neden);

  const cakisan = await prisma.paydas.findFirst({
    where: {
      ilKodu: paydas.ilKodu,
      ad: { equals: karar.kayit.ad, mode: "insensitive" },
      aktif: true,
      NOT: { id: paydas.id },
    },
    select: { id: true },
  });
  if (cakisan) {
    hataylaDon(yol, "Bu ilde aynı adla aktif başka bir paydaş var.");
  }

  await prisma.paydas.update({
    where: { id: paydas.id },
    data: karar.kayit,
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PAYDAS",
    hedefId: paydas.id,
    detay: `Paydaş güncellendi: ${karar.kayit.ad}`,
  });

  revalidatePath(YOL);
  revalidatePath(yol);
  redirect(`${yol}?durum=guncellendi`);
}

/**
 * Paydaş SİLİNMEZ, pasife alınır.
 *
 * Geçmiş faaliyetlerin paydaş bağlantısı bozulmamalı: "2025 Zirvesi'ne şu
 * üniversite destek verdi" bilgisi, iş birliği bugün sürmese de doğru
 * kalmalıdır.
 */
export async function paydasDurumEylemi(veri: FormData): Promise<void> {
  const paydasId = sayi(veri, "paydasId");
  if (paydasId === null) throw new BulunamadiHatasi();

  const { kullanici, paydas, yol } = await yonetilebilirPaydasGetir(paydasId);
  const aktif = metin(veri, "aktif") === "evet";

  if (aktif) {
    // Pasif kaydı geri açarken ad çakışması yeniden mümkün: kısmi unique index
    // yalnızca aktif satırları kapsıyor.
    const cakisan = await prisma.paydas.findFirst({
      where: {
        ilKodu: paydas.ilKodu,
        ad: { equals: paydas.ad, mode: "insensitive" },
        aktif: true,
        NOT: { id: paydas.id },
      },
      select: { id: true },
    });
    if (cakisan) {
      hataylaDon(
        yol,
        "Bu ilde aynı adla aktif bir paydaş var; önce onu pasife alın.",
      );
    }
  }

  await prisma.paydas.update({
    where: { id: paydas.id },
    data: { aktif },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PAYDAS",
    hedefId: paydas.id,
    detay: `Paydaş ${aktif ? "yeniden aktifleştirildi" : "pasife alındı"}: ${paydas.ad}`,
  });

  revalidatePath(YOL);
  revalidatePath(yol);
  redirect(`${yol}?durum=${aktif ? "aktif" : "pasif"}`);
}
