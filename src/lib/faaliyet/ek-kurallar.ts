/**
 * Faaliyet eki (dosya/görsel) kabul kuralları — references/domain-rules.md
 * Bölüm 7.
 *
 * Saf tutulur: dosya sistemine ve veritabanına gitmez, sınırlar parametre
 * olarak gelir. Sınırların kendisi `sistem_ayari` tablosundadır, koda gömülmez
 * (proje yöneticisi değiştirebilmeli).
 */

export type EkTuru = "GORSEL" | "BELGE";

export interface EkSinirlari {
  izinliGorselTipleri: string[];
  izinliBelgeTipleri: string[];
  gorselMaksBayt: number;
  belgeMaksBayt: number;
}

export function ekTuruBelirle(
  mimeTipi: string,
  sinirlar: EkSinirlari,
): EkTuru | null {
  if (sinirlar.izinliGorselTipleri.includes(mimeTipi)) return "GORSEL";
  if (sinirlar.izinliBelgeTipleri.includes(mimeTipi)) return "BELGE";
  return null;
}

function megabayt(bayt: number): string {
  return `${(bayt / (1024 * 1024)).toFixed(0)} MB`;
}

/**
 * Tip ve boyut kontrolü. İzin verilmeyen dosya sessizce yutulmaz, açık gerekçe
 * döner (kenar durum: "izin verilmeyen dosya tipi/boyutu → açık hata mesajı").
 */
export function ekKabulEdilirMi(
  dosya: { mimeTipi: string; boyutBayt: number; dosyaAdi: string },
  sinirlar: EkSinirlari,
): { olurMu: boolean; neden?: string; tur?: EkTuru } {
  if (!dosya.dosyaAdi.trim()) {
    return { olurMu: false, neden: "Dosya seçilmedi." };
  }
  if (dosya.boyutBayt <= 0) {
    return { olurMu: false, neden: "Boş dosya yüklenemez." };
  }

  const tur = ekTuruBelirle(dosya.mimeTipi, sinirlar);
  if (!tur) {
    const izinliler = [
      ...sinirlar.izinliGorselTipleri,
      ...sinirlar.izinliBelgeTipleri,
    ].join(", ");
    return {
      olurMu: false,
      neden: `"${dosya.mimeTipi}" tipinde dosya yüklenemez. İzin verilenler: ${izinliler}`,
    };
  }

  const sinir =
    tur === "GORSEL" ? sinirlar.gorselMaksBayt : sinirlar.belgeMaksBayt;
  if (dosya.boyutBayt > sinir) {
    return {
      olurMu: false,
      neden: `Dosya ${megabayt(dosya.boyutBayt)} boyutunda; ${
        tur === "GORSEL" ? "görsel" : "belge"
      } için üst sınır ${megabayt(sinir)}.`,
    };
  }

  return { olurMu: true, tur };
}

/** Yorum içeriği boş olamaz (veritabanı kısıtıyla da korunur). */
export function yorumKabulEdilirMi(icerik: string): {
  olurMu: boolean;
  neden?: string;
} {
  const kirpilmis = icerik.trim();
  if (!kirpilmis) return { olurMu: false, neden: "Yorum boş olamaz." };
  if (kirpilmis.length > 2000) {
    return { olurMu: false, neden: "Yorum en fazla 2000 karakter olabilir." };
  }
  return { olurMu: true };
}
