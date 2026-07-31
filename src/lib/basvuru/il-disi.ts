import type { BasvuruDurumu, OnayDurumu } from "@/generated/prisma/enums";

/**
 * İl dışı başvurunun çift onay kuralları — analiz isteği Bölüm 4.
 *
 * AKIŞ İKİ ADIMDIR ama sisteme YALNIZCA BİRİ eklendi:
 *
 *   1. (YENİ) Öğrencinin KENDİ ilinin koordinatörü, öğrencisini başka bir ile
 *      göndermeye onay verir.
 *   2. (MEVCUT) Faaliyeti düzenleyen değerlendirir (seçildi / yedek / reddedildi).
 *      Bu zaten etkinliğin yapıldığı ilin kararıdır; ayrı bir sütun açmak aynı
 *      kararı iki yerde tutup senkron tutma zorunluluğu doğururdu.
 *
 * Saf tutulur: veritabanına ve oturuma bakmaz, birim testle kapsanır.
 */

/**
 * Başvuru il dışına mı gidiyor?
 *
 * Karşılaştırma faaliyetin BAĞLI OLDUĞU il ile yapılır; bu, okul içi faaliyette
 * okulun ili, ulusal faaliyette düzenleyenin ilidir (bkz. faaliyetKapsamiCikar).
 * Kapsam alanlarına doğrudan bakmak yanlış sonuç verirdi: ulusal faaliyetin
 * `ilKodu` alanı boştur ama faaliyetin bir ili vardır.
 *
 * İkisinden biri bilinmiyorsa onay İSTENMEZ. Bilinmeyen bir ili "farklı" sayıp
 * başvuruyu askıya almak, kimsenin çözemeyeceği bir bekleme üretirdi.
 */
export function ilDisiBasvuruMu(
  katilimciIlKodu: string | null,
  faaliyetIlKodu: string | null,
): boolean {
  if (katilimciIlKodu === null || faaliyetIlKodu === null) return false;
  return katilimciIlKodu !== faaliyetIlKodu;
}

/** Yeni başvurunun kaynak il onay durumu. */
export function baslangicOnayDurumu(
  katilimciIlKodu: string | null,
  faaliyetIlKodu: string | null,
): OnayDurumu {
  return ilDisiBasvuruMu(katilimciIlKodu, faaliyetIlKodu)
    ? "BEKLIYOR"
    : "ONAY_GEREKMEZ";
}

/**
 * Faaliyeti düzenleyen bu başvuruyu DEĞERLENDİREBİLİR Mİ?
 *
 * Kaynak ilin kararı beklenirken değerlendirilemez: sıra bozulursa öğrenci
 * kendi ili izin vermeden başka bir ilin etkinliğine seçilmiş olur. Kaynak il
 * REDDETTİYSE de değerlendirilemez — başvuru orada bitmiştir.
 */
export function degerlendirmeyeHazirMi(kaynakIlOnayDurumu: OnayDurumu): boolean {
  return kaynakIlOnayDurumu === "ONAY_GEREKMEZ" || kaynakIlOnayDurumu === "ONAYLANDI";
}

/**
 * Kaynak ilin koordinatörü bu başvuruya karar VEREBİLİR Mİ?
 *
 * Yalnızca kararı bekleyen ve hâlâ canlı olan başvuruya. Geri çekilmiş ya da
 * faaliyeti iptal edilmiş bir başvuruyu onaylamak anlamsızdır ve ekranı
 * ölü kayıtlarla doldurur.
 */
export function kaynakIlKarariVerilebilirMi(girdi: {
  kaynakIlOnayDurumu: OnayDurumu;
  basvuruDurumu: BasvuruDurumu;
}): boolean {
  if (girdi.kaynakIlOnayDurumu !== "BEKLIYOR") return false;
  return girdi.basvuruDurumu === "BEKLIYOR";
}

export interface KaynakIlKarari {
  onaylandiMi: boolean;
  gerekce: string;
}

export type KaynakIlSonucu =
  | { olurMu: true; durum: OnayDurumu; gerekce: string | null }
  | { olurMu: false; neden: string };

/**
 * Kararı doğrular.
 *
 * RET GEREKÇESİ ZORUNLUDUR, onayınki değil: öğrenci başka bir ilin etkinliğine
 * gitmekten alıkonuyorsa sebebini öğrenmeli. Onayda söylenecek bir şey yoktur.
 */
export function kaynakIlKarariniCoz(karar: KaynakIlKarari): KaynakIlSonucu {
  const gerekce = karar.gerekce.trim();

  if (karar.onaylandiMi) {
    return { olurMu: true, durum: "ONAYLANDI", gerekce: gerekce || null };
  }

  if (!gerekce) {
    return {
      olurMu: false,
      neden:
        "Ret gerekçesi zorunludur: öğrenci başvurusunun neden ilinizden çıkamadığını görmeli.",
    };
  }
  return { olurMu: true, durum: "REDDEDILDI", gerekce };
}
