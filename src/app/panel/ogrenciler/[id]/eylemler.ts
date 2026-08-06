"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { BILDIRIM_KODLARI } from "@/lib/bildirim/sablon";
import { bildirimGonder } from "@/lib/bildirim/gonder";
import { ilKoordinatoruGetir, tekOgrenciyiBirak } from "@/lib/danisman/atama";
import { birakmaGerekcesiniCoz } from "@/lib/danisman/karar";
import { prisma } from "@/lib/db";
import { ogrenciCalismaGrubuYonetebilirMi } from "@/lib/yetki/izinler";
import { ogrenciKapsamFiltresi } from "@/lib/yetki/kapsam";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Öğrenciyi çalışma grubuna ekleme ve gruptan çıkarma — danışman, il
 * koordinatörü ve proje yöneticisi için.
 *
 * İki kontrol AYRI AYRI yapılır ve ikisi de zorunludur:
 *   1. rol — `ogrenciCalismaGrubuYonetebilirMi`
 *   2. kapsam — öğrenci merkezi kapsam filtresinden çekilir
 * Rol kontrolü tek başına yetmez; yoksa bir danışman, forma başka bir okulun
 * öğrenci id'sini yazarak o öğrenciyi gruba kaydedebilirdi.
 *
 * Öğrencinin kendi seçimi bu eylemlerden GEÇMEZ; o akış
 * `/panel/calisma-gruplari` ekranındadır.
 */

function ogrenciYolu(ogrenciId: number): string {
  return `/panel/ogrenciler/${ogrenciId}`;
}

function hataylaDon(ogrenciId: number, mesaj: string): never {
  redirect(`${ogrenciYolu(ogrenciId)}?hata=${encodeURIComponent(mesaj)}`);
}

interface Istek {
  ogrenciId: number;
  grupId: number;
}

function istegiCoz(veri: FormData): Istek {
  const ogrenciId = Number.parseInt(String(veri.get("ogrenciId") ?? ""), 10);
  const grupId = Number.parseInt(String(veri.get("grupId") ?? ""), 10);
  if (!Number.isFinite(ogrenciId) || !Number.isFinite(grupId)) {
    throw new BulunamadiHatasi();
  }
  return { ogrenciId, grupId };
}

/** Yetkili kullanıcı + kapsamındaki öğrenci. Biri düşerse akış burada kesilir. */
async function yetkiliOgrenciGetir(ogrenciId: number) {
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ogrenciCalismaGrubuYonetebilirMi(kullanici)) {
    throw new YetkiHatasi(
      "Öğrencinin çalışma gruplarını düzenleme yetkiniz yok.",
    );
  }

  const ogrenci = await prisma.kullanici.findFirst({
    where: { AND: [{ id: ogrenciId }, ogrenciKapsamFiltresi(kullanici)] },
    select: { id: true, ad: true, soyad: true },
  });
  // Kapsam dışı öğrenci "bulunamadı" döner: kaydın varlığı sızmasın
  // (references/permissions.md Bölüm 4).
  if (!ogrenci) throw new BulunamadiHatasi();

  return { kullanici, ogrenci };
}

export async function ogrenciyeGrupEkleEylemi(veri: FormData): Promise<void> {
  const { ogrenciId, grupId } = istegiCoz(veri);
  const { kullanici, ogrenci } = await yetkiliOgrenciGetir(ogrenciId);

  // Pasif gruba yeni kayıt açılmaz; geçmiş seçimler korunur.
  const grup = await prisma.calismaGrubu.findFirst({
    where: { id: grupId, aktif: true },
    select: { id: true, ad: true },
  });
  if (!grup) {
    hataylaDon(ogrenciId, "Seçilen çalışma grubu bulunamadı ya da kapatılmış.");
  }

  /*
   * Öğrenci zaten grupta olabilir (iki sekmeden aynı formu göndermek gibi).
   * Bileşik birincil anahtar ihlali kullanıcıya "beklenmeyen hata" olarak
   * dönmesin diye upsert kullanılıyor; var olan kaydın secimTarihi ve ekleyeni
   * KORUNUR — ilk ekleyen kim ise o kalır.
   */
  await prisma.ogrenciCalismaGrubu.upsert({
    where: {
      ogrenciId_calismaGrubuId: { ogrenciId: ogrenci.id, calismaGrubuId: grup.id },
    },
    update: {},
    create: {
      ogrenciId: ogrenci.id,
      calismaGrubuId: grup.id,
      ekleyenKullaniciId: kullanici.id,
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "OGRENCI",
    hedefId: ogrenci.id,
    detay: `Çalışma grubuna eklendi: ${grup.ad}`,
  });

  revalidatePath(ogrenciYolu(ogrenci.id));
  revalidatePath("/panel/ogrenciler");
  // Öğrenci kendi profilinde ve seçim ekranında değişikliği görsün.
  revalidatePath("/panel/profil");
  revalidatePath("/panel/calisma-gruplari");
  redirect(`${ogrenciYolu(ogrenci.id)}?durum=grup-eklendi`);
}

export async function ogrenciyiGruptanCikarEylemi(
  veri: FormData,
): Promise<void> {
  const { ogrenciId, grupId } = istegiCoz(veri);
  const { kullanici, ogrenci } = await yetkiliOgrenciGetir(ogrenciId);

  /*
   * Pasif grup da çıkarılabilir: kapanmış bir gruptan öğrenciyi almanın önünü
   * kesmenin bir gerekçesi yok, kısıt yalnızca YENİ kayıt açmaya konuldu.
   *
   * Silme gerçek silmedir (görev rollerinde olduğu gibi); iz erişim logunda
   * kalır.
   */
  const grup = await prisma.calismaGrubu.findUnique({
    where: { id: grupId },
    select: { ad: true },
  });

  const sonuc = await prisma.ogrenciCalismaGrubu.deleteMany({
    where: { ogrenciId: ogrenci.id, calismaGrubuId: grupId },
  });
  if (sonuc.count === 0) {
    hataylaDon(ogrenciId, "Öğrenci bu çalışma grubunda değil.");
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "OGRENCI",
    hedefId: ogrenci.id,
    detay: `Çalışma grubundan çıkarıldı: ${grup?.ad ?? grupId}`,
  });

  revalidatePath(ogrenciYolu(ogrenci.id));
  revalidatePath("/panel/ogrenciler");
  revalidatePath("/panel/profil");
  revalidatePath("/panel/calisma-gruplari");
  redirect(`${ogrenciYolu(ogrenci.id)}?durum=grup-cikarildi`);
}

/**
 * Danışman öğretmen TEK bir öğrencinin danışmanlığını bırakır (J1).
 *
 * Görevin TAMAMINI bırakma ayrı bir akıştır (profil ekranı); bu yalnızca bir
 * öğrenciyi bırakır ve öğretmen danışman olarak kalır.
 *
 * ÜÇ ŞEY BİRLİKTE YAPILIR ve hiçbiri isteğe bağlı değil:
 *   1. gerekçe zorunlu tutulur,
 *   2. il koordinatörüne bildirim gider (gerekçeyle birlikte),
 *   3. erişim kaydına yazılır.
 * Sebebi açık bir kötüye kullanım kapısı: "zor" bulunan öğrencinin sessizce
 * bırakılması. Üçü birden olmadan karar görünmez kalır.
 */
export async function danismanligiBirakEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const ogrenciId = Number.parseInt(String(veri.get("ogrenciId") ?? ""), 10);
  if (!Number.isFinite(ogrenciId)) throw new BulunamadiHatasi();

  const karar = birakmaGerekcesiniCoz(String(veri.get("gerekce") ?? ""));
  if (!karar.olurMu) hataylaDon(ogrenciId, karar.neden);

  const sonuc = await tekOgrenciyiBirak({
    danismanKullaniciId: kullanici.id,
    ogrenciId,
    gerekce: karar.gerekce,
  });
  if (!sonuc.olurMu) hataylaDon(ogrenciId, sonuc.neden);

  /*
   * Koordinatöre bildirim, bırakma GERÇEKLEŞTİKTEN sonra gönderilir: işlem
   * yarıda kalırsa (ör. devredilecek kimse yok) haber gitmemeli.
   */
  const okul =
    kullanici.kurumKodu !== null
      ? await prisma.kurum.findUnique({
          where: { kurumKodu: kullanici.kurumKodu },
          select: { ad: true, ilKodu: true },
        })
      : null;

  const koordinatorId = await ilKoordinatoruGetir(
    okul?.ilKodu ?? kullanici.ilKodu,
  );
  if (koordinatorId !== null) {
    await bildirimGonder({
      kullaniciId: koordinatorId,
      kod: BILDIRIM_KODLARI.DANISMANLIK_TEKIL_BIRAKILDI,
      degiskenler: {
        ogrenciAdSoyad: sonuc.ogrenciAdSoyad,
        danismanAdSoyad: `${kullanici.ad} ${kullanici.soyad}`,
        okulAdi: okul?.ad ?? "-",
        gerekce: karar.gerekce,
        yeniDurum: sonuc.yeniDurum,
      },
    });
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "DANISMAN_ATAMA",
    hedefId: ogrenciId,
    detay: `Danışmanlık bırakıldı: ${sonuc.ogrenciAdSoyad} · gerekçe: ${karar.gerekce} · ${sonuc.yeniDurum}`,
  });

  revalidatePath(ogrenciYolu(ogrenciId));
  revalidatePath("/panel/ogrenciler");
  /*
   * Öğrenci artık kapsamda olmayabilir (başka danışmana geçtiyse); listeye
   * dönülüyor, çünkü detay sayfası 404 verebilir ve bu bir hata gibi görünürdü.
   */
  redirect("/panel/ogrenciler?durum=danismanlik-birakildi");
}
