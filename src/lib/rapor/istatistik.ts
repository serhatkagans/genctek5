import { prisma } from "../db";

/**
 * Merkez (YEĞİTEK) istatistikleri — analiz isteği Bölüm 5.
 *
 * Yalnızca proje yöneticisine gösterilir ve bilerek KAPSAM FİLTRESİZDİR: sayım
 * ülke genelidir. Çağıran ekran yetkiyi kontrol etmek zorundadır; bu dosya
 * "kim sorabilir" sorusunu cevaplamaz, yalnızca sayar.
 *
 * Sayımlar tek tek `count` ile yapılıyor, tek büyük bir sorguyla değil:
 * okunabilirlik kazancı, altı küçük sayımın maliyetinden fazla. Hepsi
 * paralel çalışıyor.
 */

export interface MerkezIstatistikleri {
  toplamOgrenci: number;
  /** En az bir çalışma grubu seçmiş öğrenci sayısı (kişi başına tekil). */
  calismaGrubunaKayitliOgrenci: number;
  okulTemsilcisi: number;
  ilTemsilcisi: number;
  ilceTemsilcisi: number;
  danismanOgretmen: number;
  ilKoordinatoru: number;
  /** Koordinatörü olmayan il sayısı — boşluk göstergesi. */
  koordinatorsuzIl: number;
}

export async function merkezIstatistikleriniGetir(
  egitimOgretimYili: string,
): Promise<MerkezIstatistikleri> {
  const aktifRol = { bitisTarihi: null } as const;

  const [
    toplamOgrenci,
    calismaGrubunaKayitliOgrenci,
    okulTemsilcisi,
    ilTemsilcisi,
    ilceTemsilcisi,
    danismanOgretmen,
    ilKoordinatoru,
    toplamIl,
    koordinatorluIl,
  ] = await Promise.all([
    prisma.kullanici.count({
      where: { aktif: true, roller: { some: { rolKodu: "OGRENCI", ...aktifRol } } },
    }),
    /*
     * ÖĞRENCİ sayılır, seçim değil: bir öğrenci birden çok grup seçebiliyor
     * (üst sınır kaldırıldı, bkz. lib/ayar.ts). Satır sayılsaydı "kaç öğrenci
     * gruba kayıtlı" sorusu, seçim sayısıyla karışırdı.
     */
    prisma.kullanici.count({
      where: { aktif: true, calismaGruplari: { some: {} } },
    }),
    prisma.ogrenciGorevRolu.count({
      where: { rolKodu: "OKUL_TEMSILCISI", egitimOgretimYili },
    }),
    prisma.ogrenciGorevRolu.count({
      where: { rolKodu: "IL_TEMSILCISI", egitimOgretimYili },
    }),
    prisma.ogrenciGorevRolu.count({
      where: { rolKodu: "ILCE_TEMSILCISI", egitimOgretimYili },
    }),
    prisma.kullanici.count({
      where: { aktif: true, roller: { some: { rolKodu: "DANISMAN", ...aktifRol } } },
    }),
    prisma.kullanici.count({
      where: {
        aktif: true,
        roller: { some: { rolKodu: "IL_KOORDINATOR", ...aktifRol } },
      },
    }),
    prisma.il.count(),
    prisma.kullaniciRol
      .findMany({
        where: { rolKodu: "IL_KOORDINATOR", ...aktifRol },
        select: { ilKodu: true },
        distinct: ["ilKodu"],
      })
      .then((satirlar) => satirlar.length),
  ]);

  return {
    toplamOgrenci,
    calismaGrubunaKayitliOgrenci,
    okulTemsilcisi,
    ilTemsilcisi,
    ilceTemsilcisi,
    danismanOgretmen,
    ilKoordinatoru,
    koordinatorsuzIl: toplamIl - koordinatorluIl,
  };
}

export interface FaaliyetKatilimSayisi {
  /** Seçilmiş başvuru sayısı — aynı kişi iki faaliyete katıldıysa iki kez. */
  toplamKatilim: number;
  /** Kaç FARKLI kişi katıldı. */
  tekilKatilimci: number;
}

/**
 * Faaliyetlere katılan kişi sayısı: toplam ve tekil.
 *
 * İKİSİ AYRI SORULARDIR ve karıştırılırsa rapor yanlış olur. "Bu yıl 400
 * katılım oldu" ile "bu yıl 120 farklı öğrenciye ulaştık" bambaşka şeyler
 * söyler; ikincisi programın erişimini, birincisi yükünü ölçer.
 *
 * Yalnızca SECILDI sayılır: yedek ve reddedilen başvuru katılım değildir.
 */
export async function faaliyetKatilimSayisi(
  faaliyetId?: number,
): Promise<FaaliyetKatilimSayisi> {
  const nerede = {
    durum: "SECILDI" as const,
    ...(faaliyetId === undefined ? {} : { faaliyetId }),
  };

  const [toplamKatilim, tekiller] = await Promise.all([
    prisma.basvuru.count({ where: nerede }),
    prisma.basvuru.findMany({
      where: nerede,
      select: { katilimciId: true },
      distinct: ["katilimciId"],
    }),
  ]);

  return { toplamKatilim, tekilKatilimci: tekiller.length };
}
