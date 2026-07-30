"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
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
