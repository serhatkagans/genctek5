import type { FaaliyetDurumu } from "@/generated/prisma/enums";

/**
 * Faaliyet raporunun yazılabilirlik kuralları — analiz isteği Bölüm 4.
 *
 * Saf tutulur: veritabanına ve oturuma bakmaz. "Kim yazabilir" sorusunun yetki
 * tarafı `izinler.ts`tedir; burada yalnızca "faaliyet rapora hazır mı"
 * sorusu cevaplanır.
 */

const DEGERLENDIRME_MAKS = 5000;
const KAZANIM_MAKS = 3000;

/**
 * Faaliyet rapor yazmaya hazır mı?
 *
 * İKİ KOŞUL: bitmiş olmalı ve iptal edilmemiş olmalı.
 *
 * Bitiş, çok günlü faaliyette BİTİŞ tarihine bakar — üç aylık bir programın
 * raporu ilk gününde yazılamaz. İptal edilmiş faaliyetin raporu ise yoktur;
 * yapılmamış bir etkinliğin değerlendirmesi anlamsızdır (iptal gerekçesi zaten
 * faaliyetin kendisinde duruyor).
 */
export function raporYazilabilirMi(girdi: {
  tarih: Date;
  bitisTarihi: Date | null;
  durum: FaaliyetDurumu;
  simdi: Date;
}): { olurMu: boolean; neden?: string } {
  if (girdi.durum !== "AKTIF") {
    return {
      olurMu: false,
      neden: "İptal edilmiş etkinliğin raporu yazılmaz.",
    };
  }

  const bitis = girdi.bitisTarihi ?? girdi.tarih;
  if (girdi.simdi < bitis) {
    return {
      olurMu: false,
      neden: "Etkinlik henüz bitmedi; rapor bitiş tarihinden sonra yazılır.",
    };
  }

  return { olurMu: true };
}

export interface RaporGirdisi {
  degerlendirme: string;
  kazanimlar: string;
}

export type RaporKarari =
  | { olurMu: true; degerlendirme: string; kazanimlar: string | null }
  | { olurMu: false; neden: string };

/**
 * Rapor metnini doğrular.
 *
 * DEĞERLENDİRME ZORUNLU, kazanımlar değil: değerlendirmesi olmayan bir kayıt
 * "rapor yazıldı" göstergesini yalancı çıkarır. Kazanım notu ise her faaliyette
 * söylenecek bir şey olmayabilir.
 */
export function raporMetniniCoz(girdi: RaporGirdisi): RaporKarari {
  const degerlendirme = girdi.degerlendirme.trim();
  const kazanimlar = girdi.kazanimlar.trim();

  if (!degerlendirme) {
    return {
      olurMu: false,
      neden: "Değerlendirme boş bırakılamaz: raporun taşıdığı asıl bilgi budur.",
    };
  }
  if (degerlendirme.length > DEGERLENDIRME_MAKS) {
    return {
      olurMu: false,
      neden: `Değerlendirme en fazla ${DEGERLENDIRME_MAKS} karakter olabilir.`,
    };
  }
  if (kazanimlar.length > KAZANIM_MAKS) {
    return {
      olurMu: false,
      neden: `Kazanım notu en fazla ${KAZANIM_MAKS} karakter olabilir.`,
    };
  }

  return { olurMu: true, degerlendirme, kazanimlar: kazanimlar || null };
}
