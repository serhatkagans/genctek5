import type { EtkinlikKategorisi, Kapsam } from "@/generated/prisma/enums";

/**
 * Öğrenci kazanımları — rozetler.
 *
 * Rozetler ELLE VERİLMEZ, katılım geçmişinden türetilir. Manuel verilseydi
 * öğrencinin gördüğü rozetle sistemdeki kayıt zamanla ayrışır, kimin neyi neden
 * aldığı tartışma konusu olurdu. Türetilmiş rozet her hesaplamada aynı veriden
 * aynı sonucu verir ve geri alınması gerekmez.
 *
 * "Katılım" = faaliyete SEÇİLDİ + faaliyet tarihi geçti + faaliyet iptal
 * edilmedi. Sadece seçilmiş olmak katılım sayılmaz; henüz gerçekleşmemiş bir
 * etkinlik için rozet vermek, öğrenciye yapmadığı bir şeyi başarmış gibi
 * göstermek olurdu.
 *
 * Bu dosya saf tutulur: veritabanına gitmez, tarih üretmez. Böylece kurallar
 * birim testle sınanabilir.
 */

export interface KatilimKaydi {
  kapsam: Kapsam;
  etkinlikKategorisi: EtkinlikKategorisi;
  tarih: Date;
}

export interface KazanimGirdisi {
  katilimlar: KatilimKaydi[];
  /** Öğrencinin seçtiği çalışma grubu sayısı. */
  calismaGrubuSayisi: number;
  /** Dönem içinde üstlendiği görev rolleri (İl Yöneticisi, Okul Temsilcisi). */
  gorevRolSayisi: number;
}

export interface RozetTanimi {
  kod: string;
  ad: string;
  aciklama: string;
  /** Kaç adımda kazanılır. 1 ise "yaptın / yapmadın" rozetidir. */
  hedef: number;
  ilerleme: (girdi: KazanimGirdisi) => number;
}

const benzersizSayi = <T>(degerler: T[]): number => new Set(degerler).size;

export const ROZETLER: RozetTanimi[] = [
  {
    kod: "ILK_ADIM",
    ad: "İlk Adım",
    aciklama: "İlk GençTek faaliyetine katıldın.",
    hedef: 1,
    ilerleme: (girdi) => girdi.katilimlar.length,
  },
  {
    kod: "DUZENLI_KATILIM",
    ad: "Düzenli Katılım",
    aciklama: "Üç faaliyete katıldın.",
    hedef: 3,
    ilerleme: (girdi) => girdi.katilimlar.length,
  },
  {
    kod: "GENCTEK_GONULLUSU",
    ad: "GençTek Gönüllüsü",
    aciklama: "On faaliyete katıldın.",
    hedef: 10,
    ilerleme: (girdi) => girdi.katilimlar.length,
  },
  {
    kod: "COK_YONLU",
    ad: "Çok Yönlü",
    aciklama: "Üç etkinlik kategorisinin üçünde de yer aldın.",
    hedef: 3,
    ilerleme: (girdi) =>
      benzersizSayi(girdi.katilimlar.map((k) => k.etkinlikKategorisi)),
  },
  {
    kod: "IL_SAHNESI",
    ad: "İl Sahnesi",
    aciklama: "İl geneli bir faaliyete katıldın.",
    hedef: 1,
    ilerleme: (girdi) =>
      girdi.katilimlar.filter((k) => k.kapsam === "IL").length,
  },
  {
    kod: "TURKIYE_SAHNESI",
    ad: "Türkiye Sahnesi",
    aciklama: "Ulusal bir faaliyete katıldın.",
    hedef: 1,
    ilerleme: (girdi) =>
      girdi.katilimlar.filter((k) => k.kapsam === "ULUSAL").length,
  },
  {
    kod: "ILGI_ALANI",
    ad: "İlgi Alanı",
    aciklama: "Kendine bir çalışma grubu seçtin.",
    hedef: 1,
    ilerleme: (girdi) => girdi.calismaGrubuSayisi,
  },
  {
    kod: "MERAKLI",
    ad: "Meraklı",
    aciklama: "Üç farklı çalışma grubuna kayıtlısın.",
    hedef: 3,
    ilerleme: (girdi) => girdi.calismaGrubuSayisi,
  },
  {
    kod: "SORUMLULUK",
    ad: "Sorumluluk",
    aciklama: "Bir temsil görevi üstlendin.",
    hedef: 1,
    ilerleme: (girdi) => girdi.gorevRolSayisi,
  },
];

export interface RozetDurumu {
  kod: string;
  ad: string;
  aciklama: string;
  hedef: number;
  /** Hedefi aşan ilerleme hedefe kırpılır: "12/10" gösterimi kafa karıştırır. */
  ilerleme: number;
  kazanildiMi: boolean;
}

export function rozetDurumlari(girdi: KazanimGirdisi): RozetDurumu[] {
  return ROZETLER.map((rozet) => {
    const hamIlerleme = rozet.ilerleme(girdi);
    const ilerleme = Math.min(hamIlerleme, rozet.hedef);
    return {
      kod: rozet.kod,
      ad: rozet.ad,
      aciklama: rozet.aciklama,
      hedef: rozet.hedef,
      ilerleme,
      kazanildiMi: hamIlerleme >= rozet.hedef,
    };
  });
}

export interface KatilimOzeti {
  toplamKatilim: number;
  kapsamaGore: Record<Kapsam, number>;
  kategoriyeGore: Record<EtkinlikKategorisi, number>;
}

export function katilimOzeti(katilimlar: KatilimKaydi[]): KatilimOzeti {
  const kapsamaGore: Record<Kapsam, number> = { OKUL: 0, IL: 0, ULUSAL: 0 };
  const kategoriyeGore: Record<EtkinlikKategorisi, number> = {
    TEMEL_ETKINLIK: 0,
    CALISMA_GRUBU_ETKINLIGI: 0,
    IL_ETKINLIGI: 0,
  };

  for (const katilim of katilimlar) {
    kapsamaGore[katilim.kapsam] += 1;
    kategoriyeGore[katilim.etkinlikKategorisi] += 1;
  }

  return {
    toplamKatilim: katilimlar.length,
    kapsamaGore,
    kategoriyeGore,
  };
}
