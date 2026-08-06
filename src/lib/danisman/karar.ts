/**
 * Danışman atama ve devir kararları — references/domain-rules.md Bölüm 3.
 *
 * Bu dosya veritabanına gitmez. Kararlar saf fonksiyonlarda üretilir ki
 * birim testlerle eksiksiz kapsanabilsinler; veritabanı işlemlerini atama.ts
 * yürütür.
 *
 * Eşleştirme anahtarı KURUM KODUDUR. Boşta öğrenci kalamaz: danışman yoksa
 * öğrenci il koordinatörüne bağlanır.
 */

export interface DanismanAdayi {
  kullaniciId: number;
  ad: string;
  soyad: string;
  brans: string | null;
}

export type IlkAtamaKarari =
  /** Okulda birden fazla aday var: öğrenci kendi danışmanını seçer. */
  | { tur: "SECIM_GEREKLI"; adaylar: DanismanAdayi[] }
  /** Tek aday var: otomatik atanır. */
  | { tur: "OTOMATIK"; danismanKullaniciId: number }
  /** Okulda aday yok: il koordinatörüne bağlanır. */
  | { tur: "IL_KOORDINATORUNE"; danismanKullaniciId: number }
  /**
   * Ne aday ne il koordinatörü var. Öğrenci atanamaz; proje yöneticisine uyarı
   * düşer (kenar durum: "İl koordinatörü olmayan ilde okul danışmansız").
   */
  | { tur: "ATANAMADI"; neden: "IL_KOORDINATORU_YOK" };

export function ilkAtamaKarariVer(
  adaylar: DanismanAdayi[],
  ilKoordinatoruKullaniciId: number | null,
): IlkAtamaKarari {
  if (adaylar.length > 1) {
    return { tur: "SECIM_GEREKLI", adaylar };
  }

  if (adaylar.length === 1) {
    return { tur: "OTOMATIK", danismanKullaniciId: adaylar[0].kullaniciId };
  }

  if (ilKoordinatoruKullaniciId !== null) {
    return {
      tur: "IL_KOORDINATORUNE",
      danismanKullaniciId: ilKoordinatoruKullaniciId,
    };
  }

  return { tur: "ATANAMADI", neden: "IL_KOORDINATORU_YOK" };
}

export type DevirKarari =
  /** Okulda tek danışman kaldı: öğrenciler otomatik ona devredilir. */
  | { tur: "OTOMATIK_DEVIR"; yeniDanismanKullaniciId: number }
  /**
   * Birden fazla danışman var: öğrenciye "danışmanın değişti, yeniden seç"
   * bildirimi gider; seçim yapılana kadar GEÇİCİ olarak il koordinatörüne
   * bağlanır.
   */
  | {
      tur: "YENIDEN_SECIM";
      geciciDanismanKullaniciId: number | null;
      adaylar: DanismanAdayi[];
    }
  /** Hiç danışman kalmadı: il koordinatörüne devredilir. */
  | { tur: "IL_KOORDINATORUNE"; yeniDanismanKullaniciId: number }
  | { tur: "ATANAMADI"; neden: "IL_KOORDINATORU_YOK" };

export function devirKarariVer(
  kalanAdaylar: DanismanAdayi[],
  ilKoordinatoruKullaniciId: number | null,
): DevirKarari {
  if (kalanAdaylar.length === 1) {
    return {
      tur: "OTOMATIK_DEVIR",
      yeniDanismanKullaniciId: kalanAdaylar[0].kullaniciId,
    };
  }

  if (kalanAdaylar.length > 1) {
    return {
      tur: "YENIDEN_SECIM",
      geciciDanismanKullaniciId: ilKoordinatoruKullaniciId,
      adaylar: kalanAdaylar,
    };
  }

  if (ilKoordinatoruKullaniciId !== null) {
    return {
      tur: "IL_KOORDINATORUNE",
      yeniDanismanKullaniciId: ilKoordinatoruKullaniciId,
    };
  }

  return { tur: "ATANAMADI", neden: "IL_KOORDINATORU_YOK" };
}

/**
 * Okula sonradan danışman geldiğinde il koordinatörüne bağlı öğrenciler
 * OTOMATİK DEVREDİLMEZ. İl koordinatörüne "okulunuzda yeni danışman öğretmen
 * var, X öğrenci devredilebilir" bildirimi gider; devri o onaylar.
 */
export function yeniDanismanGeldigindeDevredilirMi(): false {
  return false;
}

/** Tekil bırakma gerekçesinin alt ve üst sınırı. */
const BIRAKMA_GEREKCESI_ENAZ = 10;
const BIRAKMA_GEREKCESI_ENFAZLA = 500;

export type BirakmaKarari =
  | { olurMu: true; gerekce: string }
  | { olurMu: false; neden: string };

/**
 * Öğretmenin TEK bir öğrencinin danışmanlığını bırakma gerekçesi.
 *
 * GEREKÇE ZORUNLUDUR ve bu bir biçim kaygısı değil: burada açık bir kötüye
 * kullanım kapısı var — "zor" bulunan öğrencinin sessizce bırakılması. Gerekçe
 * yazılmak zorunda olduğunda ve erişim kaydına geçtiğinde, karar sahibi
 * hesap verebilir hâle gelir. İl koordinatörüne de bildirim gider (istek:
 * "koordinatöre bilgi gitsin gerekçe şart").
 *
 * Alt sınır var çünkü tek harflik bir gerekçe, gerekçe zorunluluğunu biçimsel
 * olarak karşılayıp anlamını boşaltırdı.
 */
export function birakmaGerekcesiniCoz(ham: string): BirakmaKarari {
  const gerekce = ham.trim().replace(/\s+/g, " ");

  if (!gerekce) {
    return {
      olurMu: false,
      neden:
        "Danışmanlığı bırakma gerekçesi zorunludur; gerekçe il koordinatörüne iletilir ve erişim kaydına yazılır.",
    };
  }
  if (gerekce.length < BIRAKMA_GEREKCESI_ENAZ) {
    return {
      olurMu: false,
      neden: `Gerekçe en az ${BIRAKMA_GEREKCESI_ENAZ} karakter olmalıdır.`,
    };
  }
  if (gerekce.length > BIRAKMA_GEREKCESI_ENFAZLA) {
    return {
      olurMu: false,
      neden: `Gerekçe en fazla ${BIRAKMA_GEREKCESI_ENFAZLA} karakter olabilir.`,
    };
  }

  return { olurMu: true, gerekce };
}
