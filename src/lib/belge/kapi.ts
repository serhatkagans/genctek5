/**
 * Belge üretiminin ÖN KOŞULLARI (12 Ağustos 2026).
 *
 * İki istek bu dosyada birleşiyor:
 *   · "etkinlik raporu yazılmadan belge oluştur seçeneği olmamalı"
 *   · "gelmeyen öğrenci katılmış görünmesin" — belge katılımın kanıtı olduğu
 *     için, gelmediği işaretlenmiş kişiye belge de basılamamalı.
 *
 * SAF TUTULUR: veritabanına ve React'e bakmaz. Kapı hem ekranlarda (düğmeyi
 * göstermemek için) hem belge üreten yollarda (adresi elle yazana karşı)
 * soruluyor; kural tek yerde durmazsa ikisi er geç ayrışır ve ekranda kapalı
 * görünen bir yol sunucuda açık kalır.
 */

/** Kapının cevabı: geçilir mi, geçilmiyorsa kullanıcıya ne denir. */
export interface KapiKarari {
  olurMu: boolean;
  /** Kullanıcıya gösterilecek gerekçe; `olurMu` true ise null. */
  neden: string | null;
}

const OLUR: KapiKarari = { olurMu: true, neden: null };

/**
 * Bu etkinlikten HERHANGİ bir belge üretilebilir mi?
 *
 * TEK KOŞUL RAPOR: etkinliğin bitmiş olması ayrıca sorulmuyor, çünkü rapor
 * zaten bitmeden yazılamıyor (bkz. faaliyetRaporuYazilabilirMi) — iki koşul
 * yazmak, aynı şeyi iki kez sormak olurdu.
 *
 * Raporun belgeden ÖNCE gelmesi bir sıralama tercihi değil, denetim
 * gerekçesidir: belge dağıtılmış ama etkinliğin ne olduğu hiçbir yerde yazılı
 * olmayan bir kayıt, sonradan kimsenin doğrulayamayacağı bir belge demektir.
 */
export function belgeKapisi(girdi: { raporVarMi: boolean }): KapiKarari {
  if (!girdi.raporVarMi) {
    return {
      olurMu: false,
      neden:
        "Belge üretilebilmesi için önce etkinlik raporunun yazılması gerekiyor.",
    };
  }
  return OLUR;
}

/**
 * Listedeki BU kişiye belge üretilebilir mi?
 *
 * Yoklama alınmamış (null) kişi de dışarıda kalır: "tamamen engellensin"
 * kararı (12 Ağustos 2026) yoklamayı belgenin ön koşulu yapıyor. Aksi hâlde
 * yoklama almayan bir etkinlikte toplu belge, eski davranışın aynısını üretir
 * ve gelmeyen öğrencinin profiline yine katılım düşerdi.
 *
 * "Listede olmayan biri için" formu (konuşmacı, destek veren kurum) bu kapıya
 * TABİ DEĞİLDİR: o kişinin başvurusu da yoklaması da yoktur ve belgesi kimsenin
 * profiline katılım düşürmez.
 */
export function katilimciBelgeKapisi(girdi: {
  katildiMi: boolean | null;
}): KapiKarari {
  if (girdi.katildiMi === true) return OLUR;

  return {
    olurMu: false,
    neden:
      girdi.katildiMi === false
        ? "Yoklamada gelmedi işaretlendiği için belge üretilemez."
        : "Yoklaması alınmadan belge üretilemez.",
  };
}

/** Etkinlik yoklaması alınabilir hâlde mi? */
export function yoklamaAlinabilirMi(girdi: {
  bittiMi: boolean;
  iptalMi: boolean;
}): KapiKarari {
  if (girdi.iptalMi) {
    return { olurMu: false, neden: "İptal edilen etkinlikte yoklama alınmaz." };
  }
  if (!girdi.bittiMi) {
    return {
      olurMu: false,
      neden: "Yoklama, etkinlik bittikten sonra alınır.",
    };
  }
  return OLUR;
}

/** Yoklama formundan gelen değerin karşılığı. */
export function yoklamaDegeriCoz(deger: string | null): boolean | null {
  if (deger === "evet") return true;
  if (deger === "hayir") return false;
  // Tanınmayan değer "işaretlenmedi" sayılır: yoklama formu üç seçenekli ve
  // boş seçenek geçerli bir cevap ("henüz bilmiyorum").
  return null;
}

/** Yoklama özetinin sayıları — ekranda ve rapor kartında aynı cümle kurulur. */
export interface YoklamaOzeti {
  toplam: number;
  gelen: number;
  gelmeyen: number;
  isaretlenmeyen: number;
  /** Listedeki herkes işaretlendi mi? */
  tamamlandiMi: boolean;
}

export function yoklamaOzeti(
  katilimcilar: readonly { katildiMi: boolean | null }[],
): YoklamaOzeti {
  const gelen = katilimcilar.filter((k) => k.katildiMi === true).length;
  const gelmeyen = katilimcilar.filter((k) => k.katildiMi === false).length;
  const isaretlenmeyen = katilimcilar.length - gelen - gelmeyen;

  return {
    toplam: katilimcilar.length,
    gelen,
    gelmeyen,
    isaretlenmeyen,
    // Boş listede yoklama "tamamlandı" sayılır: işaretlenecek kimse yok ve
    // aksi hâlde katılımcısız etkinlikte belge kapısı hiç açılmazdı
    // (konuşmacıya teşekkür belgesi tam da böyle bir etkinlikte üretiliyor).
    tamamlandiMi: isaretlenmeyen === 0,
  };
}
