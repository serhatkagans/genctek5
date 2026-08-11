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

/**
 * RAPOR ALANLARININ EKRANDAKİ ADLARI (11 Ağustos 2026 · istek: "etkinlik
 * raporunda Değerlendirme yazan yer bilgi notu olsun, özet bilgi yazsın,
 * Kazanımlar (isteğe bağlı) yazan yere sosyal medya / haber metni yazsın").
 *
 * VERİTABANI SÜTUNLARI DEĞİŞMEDİ (`degerlendirme`, `kazanimlar`): yazılmış
 * raporları taşımak, geri alınması pahalı bir işi bedavaya yapmak olurdu —
 * aynı karar talep türü etiketlerinde de verildi (bkz. lib/iletisim/kurallar).
 *
 * Adlar TEK YERDE duruyor çünkü üç yerde birden basılıyor: rapor ekranı, Word
 * çıktısı ve CSV çıktısı. Üçü ayrı yazılsaydı biri güncellenip öbürleri
 * unutulur, indirilen belge ekranda görünenden başka bir şey derdi.
 */
export const RAPOR_ALAN_ADLARI = {
  degerlendirme: "Bilgi notu",
  kazanimlar: "Sosyal medya / haber metni",
} as const;

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
 * BİLGİ NOTU ZORUNLU, sosyal medya metni değil: bilgi notu olmayan bir kayıt
 * "rapor yazıldı" göstergesini yalancı çıkarır. Haber metni ise her faaliyette
 * yazılacak bir şey olmayabilir.
 *
 * Hata mesajları alan adlarını TEK KAYNAKTAN okur (RAPOR_ALAN_ADLARI): ekranda
 * "Bilgi notu" yazan alan için "Değerlendirme boş bırakılamaz" demek,
 * kullanıcıyı olmayan bir alanı aramaya gönderirdi.
 */
export function raporMetniniCoz(girdi: RaporGirdisi): RaporKarari {
  const degerlendirme = girdi.degerlendirme.trim();
  const kazanimlar = girdi.kazanimlar.trim();

  if (!degerlendirme) {
    return {
      olurMu: false,
      neden: `${RAPOR_ALAN_ADLARI.degerlendirme} boş bırakılamaz: raporun taşıdığı asıl bilgi budur.`,
    };
  }
  if (degerlendirme.length > DEGERLENDIRME_MAKS) {
    return {
      olurMu: false,
      neden: `${RAPOR_ALAN_ADLARI.degerlendirme} en fazla ${DEGERLENDIRME_MAKS} karakter olabilir.`,
    };
  }
  if (kazanimlar.length > KAZANIM_MAKS) {
    return {
      olurMu: false,
      neden: `${RAPOR_ALAN_ADLARI.kazanimlar} en fazla ${KAZANIM_MAKS} karakter olabilir.`,
    };
  }

  return { olurMu: true, degerlendirme, kazanimlar: kazanimlar || null };
}
