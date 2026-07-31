/**
 * Katılım ve teşekkür belgesi kuralları.
 *
 * Belge VERİTABANINDA TUTULMAZ: her istekte faaliyet ve katılım kayıtlarından
 * üretilir. Ayrı bir tablo, aynı bilgiyi ikinci kez saklayıp güncel tutma
 * zorunluluğu doğururdu — faaliyetin adı düzeltildiğinde basılmış belgeler
 * eski adı göstermeye devam ederdi. Kim ne zaman belge ürettiği erişim
 * kaydına yazılır; izlenebilirlik oradan sağlanır.
 *
 * Saf tutulur: veritabanına ve React'e bakmaz, birim testle kapsanır.
 */

export const BELGE_TURLERI = ["KATILIM", "TESEKKUR"] as const;
export type BelgeTuru = (typeof BELGE_TURLERI)[number];

export const BELGE_TURU_ETIKETLERI: Record<BelgeTuru, string> = {
  KATILIM: "Katılım Belgesi",
  TESEKKUR: "Teşekkür Belgesi",
};

export function belgeTuruMu(deger: string): deger is BelgeTuru {
  return (BELGE_TURLERI as readonly string[]).includes(deger);
}

export interface BelgeGirdisi {
  tur: BelgeTuru;
  adSoyad: string;
  faaliyetAdi: string;
  /** Belgede yazılacak tarih; faaliyetin tarihi kullanılır, üretim tarihi değil. */
  tarihMetni: string;
  /** Serbest metin girildiyse gövde onunla değiştirilir. */
  ozelMetin?: string | null;
}

export interface BelgeMetni {
  baslik: string;
  adSoyad: string;
  govde: string;
  tarihMetni: string;
}

/**
 * Belge metnini üretir.
 *
 * İki tür AYRI cümle kurar ve bu bilinçli: katılım belgesi bir OLGUYU
 * belgeler ("katılmıştır"), teşekkür belgesi bir DEĞERLENDİRME taşır
 * ("katkılarından dolayı teşekkür ederiz"). Aynı metni paylaşsalardı teşekkür
 * belgesi katılım belgesinin süslü hâline dönerdi.
 *
 * Özel metin verildiğinde gövde tamamen onunla değişir: teşekkür belgesi
 * çoğu zaman katılımcıya değil, konuşmacıya ya da destek veren kuruma
 * yazılır ve kalıp cümle oraya uymaz.
 */
export function belgeMetniUret(girdi: BelgeGirdisi): BelgeMetni {
  const ozel = girdi.ozelMetin?.trim();

  const govde = ozel
    ? ozel
    : girdi.tur === "KATILIM"
      ? `${girdi.faaliyetAdi} adlı faaliyete katılmıştır.`
      : `${girdi.faaliyetAdi} adlı faaliyete verdiği katkılardan dolayı teşekkür ederiz.`;

  return {
    baslik: BELGE_TURU_ETIKETLERI[girdi.tur],
    adSoyad: girdi.adSoyad.trim(),
    govde,
    tarihMetni: girdi.tarihMetni,
  };
}

export type AliciKarari =
  | { olurMu: true; adSoyad: string }
  | { olurMu: false; neden: string };

const AD_MAKS = 120;

/**
 * Belge alıcısının adını doğrular.
 *
 * Alıcı sistemdeki bir katılımcı OLMAK ZORUNDA DEĞİL: teşekkür belgesi çoğu
 * zaman dışarıdan gelen bir konuşmacıya ya da destek veren kuruma yazılır ve
 * o kişinin sistemde kaydı olmaz. Bu yüzden ad serbest metin olarak da
 * girilebiliyor.
 */
export function aliciAdiniCoz(ham: string): AliciKarari {
  const adSoyad = ham.trim().replace(/\s+/g, " ");

  if (!adSoyad) {
    return { olurMu: false, neden: "Belgenin kime verileceği yazılmalıdır." };
  }
  if (adSoyad.length > AD_MAKS) {
    return {
      olurMu: false,
      neden: `Ad en fazla ${AD_MAKS} karakter olabilir.`,
    };
  }
  return { olurMu: true, adSoyad };
}
