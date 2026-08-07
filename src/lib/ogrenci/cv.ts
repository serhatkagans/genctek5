import { AYAR_ANAHTARLARI, ayarListe, ayarSayi } from "../ayar";
import { prisma } from "../db";
import { depolama } from "../depolama";
import { type CvSinirlari, cvKabulEdilirMi } from "./cv-kurallar";

/**
 * CV'nin kaydedilmesi ve kaldırılması.
 *
 * ÖĞRENCİ VE ÖĞRETMEN AYNI KODU KULLANIR (7 Ağustos 2026): dosya, sınırlar ve
 * depolama aynı; değişen tek şey satırın hangi profil tablosuna yazıldığı.
 * `hedef` parametresi bunu seçer. İki ayrı fonksiyon yazılsaydı sınır
 * değişikliği birinde unutulurdu.
 *
 * ALANLAR İKİ TABLOYA KOPYALANDI, ortak bir CV tablosu açılmadı: ortak tablo
 * iki profil satırının yaşam döngüsünü birbirine bağlardı (öğrenci mezun
 * olduğunda öğrenci profili kapanır, öğretmeninki kapanmaz).
 *
 * Yetki kontrolü BURADA YAPILMAZ; çağıranın işidir (bkz.
 * lib/faaliyet/ek-kaydet.ts ile aynı ayrım).
 */

/** CV'nin hangi profil tablosunda tutulacağı. */
export type CvSahibi = "OGRENCI" | "OGRETMEN";

export async function cvSinirlariniGetir(): Promise<CvSinirlari> {
  const [izinliTipler, maksBayt] = await Promise.all([
    ayarListe(AYAR_ANAHTARLARI.IZINLI_CV_TIPLERI, [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]),
    ayarSayi(AYAR_ANAHTARLARI.CV_MAKS_BAYT, 5 * 1024 * 1024),
  ]);
  return { izinliTipler, maksBayt };
}

export interface CvKayitSonucu {
  olurMu: boolean;
  neden?: string;
}

/**
 * CV'yi depolar ve profile yazar. Öğrencinin önceki CV'si varsa dosyası
 * silinir: tek kayıt tutuluyor, sürüm arşivi değil. Silme yeni dosya
 * yazıldıktan SONRA yapılır — sıra ters olsaydı yazma hata verdiğinde öğrenci
 * hem eski hem yeni CV'sinden olurdu.
 */
export async function cvKaydet(girdi: {
  ogrenciId: number;
  dosya: File;
  sinirlar: CvSinirlari;
  sahip?: CvSahibi;
}): Promise<CvKayitSonucu> {
  const { dosya } = girdi;

  const karar = cvKabulEdilirMi(
    { mimeTipi: dosya.type, boyutBayt: dosya.size, dosyaAdi: dosya.name },
    girdi.sinirlar,
  );
  if (!karar.olurMu) return karar;

  const sahip = girdi.sahip ?? "OGRENCI";
  const oncekiAnahtar = await mevcutCvAnahtari(girdi.ogrenciId, sahip);

  const anahtar = await depolama().yaz({
    icerik: Buffer.from(await dosya.arrayBuffer()),
    dosyaAdi: dosya.name,
    mimeTipi: dosya.type,
  });

  const cv = {
    cvDosyaAdi: dosya.name.slice(0, 255),
    cvDepolamaYolu: anahtar,
    cvMimeTipi: dosya.type,
    cvBoyutBayt: BigInt(dosya.size),
    cvYuklenmeTarihi: new Date(),
  };

  if (sahip === "OGRENCI") {
    await prisma.ogrenciProfil.upsert({
      where: { kullaniciId: girdi.ogrenciId },
      update: cv,
      create: { kullaniciId: girdi.ogrenciId, ...cv },
    });
  } else {
    await prisma.ogretmenProfil.upsert({
      where: { kullaniciId: girdi.ogrenciId },
      update: cv,
      create: { kullaniciId: girdi.ogrenciId, ...cv },
    });
  }

  if (oncekiAnahtar) await depolama().sil(oncekiAnahtar);

  return { olurMu: true };
}

/** CV kaydını ve dosyasını kaldırır. CV yoksa sessizce hiçbir şey yapmaz. */
export async function cvSil(
  ogrenciId: number,
  sahip: CvSahibi = "OGRENCI",
): Promise<boolean> {
  const anahtar = await mevcutCvAnahtari(ogrenciId, sahip);
  if (!anahtar) return false;

  // Kayıt önce temizlenir: dosya silinip kayıt kalırsa profil indirilemeyen
  // bir CV gösterirdi. Ters sırada en kötü durumda yetim dosya kalır.
  const bosalt = {
    cvDosyaAdi: null,
    cvDepolamaYolu: null,
    cvMimeTipi: null,
    cvBoyutBayt: null,
    cvYuklenmeTarihi: null,
  };
  if (sahip === "OGRENCI") {
    await prisma.ogrenciProfil.update({
      where: { kullaniciId: ogrenciId },
      data: bosalt,
    });
  } else {
    await prisma.ogretmenProfil.update({
      where: { kullaniciId: ogrenciId },
      data: bosalt,
    });
  }
  await depolama().sil(anahtar);
  return true;
}

async function mevcutCvAnahtari(
  ogrenciId: number,
  sahip: CvSahibi,
): Promise<string | null> {
  const profil =
    sahip === "OGRENCI"
      ? await prisma.ogrenciProfil.findUnique({
          where: { kullaniciId: ogrenciId },
          select: { cvDepolamaYolu: true },
        })
      : await prisma.ogretmenProfil.findUnique({
          where: { kullaniciId: ogrenciId },
          select: { cvDepolamaYolu: true },
        });
  return profil?.cvDepolamaYolu ?? null;
}
