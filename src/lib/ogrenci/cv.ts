import { AYAR_ANAHTARLARI, ayarListe, ayarSayi } from "../ayar";
import { prisma } from "../db";
import { depolama } from "../depolama";
import { type CvSinirlari, cvKabulEdilirMi } from "./cv-kurallar";

/**
 * Öğrenci CV'sinin kaydedilmesi ve kaldırılması.
 *
 * Yetki kontrolü BURADA YAPILMAZ; çağıranın işidir (bkz.
 * lib/faaliyet/ek-kaydet.ts ile aynı ayrım). Bu dosya yalnızca "kural uygunsa
 * depola ve profile yaz" adımını tek yerde tutar.
 */

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
}): Promise<CvKayitSonucu> {
  const { dosya } = girdi;

  const karar = cvKabulEdilirMi(
    { mimeTipi: dosya.type, boyutBayt: dosya.size, dosyaAdi: dosya.name },
    girdi.sinirlar,
  );
  if (!karar.olurMu) return karar;

  const oncekiAnahtar = await mevcutCvAnahtari(girdi.ogrenciId);

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

  await prisma.ogrenciProfil.upsert({
    where: { kullaniciId: girdi.ogrenciId },
    update: cv,
    create: { kullaniciId: girdi.ogrenciId, ...cv },
  });

  if (oncekiAnahtar) await depolama().sil(oncekiAnahtar);

  return { olurMu: true };
}

/** CV kaydını ve dosyasını kaldırır. CV yoksa sessizce hiçbir şey yapmaz. */
export async function cvSil(ogrenciId: number): Promise<boolean> {
  const anahtar = await mevcutCvAnahtari(ogrenciId);
  if (!anahtar) return false;

  // Kayıt önce temizlenir: dosya silinip kayıt kalırsa profil indirilemeyen
  // bir CV gösterirdi. Ters sırada en kötü durumda yetim dosya kalır.
  await prisma.ogrenciProfil.update({
    where: { kullaniciId: ogrenciId },
    data: {
      cvDosyaAdi: null,
      cvDepolamaYolu: null,
      cvMimeTipi: null,
      cvBoyutBayt: null,
      cvYuklenmeTarihi: null,
    },
  });
  await depolama().sil(anahtar);
  return true;
}

async function mevcutCvAnahtari(ogrenciId: number): Promise<string | null> {
  const profil = await prisma.ogrenciProfil.findUnique({
    where: { kullaniciId: ogrenciId },
    select: { cvDepolamaYolu: true },
  });
  return profil?.cvDepolamaYolu ?? null;
}
