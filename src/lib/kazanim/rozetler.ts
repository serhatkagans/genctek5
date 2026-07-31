import type { EtkinlikKategorisi, Kapsam } from "@/generated/prisma/enums";

/**
 * Katkı nişanları (rozetler) — öğrenci ve öğretmen için ayrı listeler.
 *
 * Rozetler ELLE VERİLMEZ, geçmişten türetilir. Manuel verilseydi kişinin
 * gördüğü rozetle sistemdeki kayıt zamanla ayrışır, kimin neyi neden aldığı
 * tartışma konusu olurdu. Türetilmiş rozet her hesaplamada aynı veriden aynı
 * sonucu verir ve geri alınması gerekmez.
 *
 * "Katılım" = faaliyete SEÇİLDİ + faaliyet tarihi geçti + faaliyet iptal
 * edilmedi. Sadece seçilmiş olmak katılım sayılmaz; henüz gerçekleşmemiş bir
 * etkinlik için rozet vermek, kişiye yapmadığı bir şeyi başarmış gibi göstermek
 * olurdu.
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

/**
 * Öğretmenin katkısını oluşturan sayılar.
 *
 * Öğrenciyle ORTAK olan tek şey katılım geçmişidir; gerisi ayrıdır. Öğretmenin
 * çalışma grubu seçimi ve temsilcilik görevi yoktur — onun katkısı düzenlediği
 * faaliyetlerde, üstlendiği danışmanlıklarda ve kurduğu iş birliklerindedir.
 */
export interface OgretmenKatkiGirdisi {
  katilimlar: KatilimKaydi[];
  /** Onaylı ve iptal edilmemiş, kendi açtığı faaliyetler. */
  duzenledigiFaaliyetSayisi: number;
  /** Süren danışmanlıklar; biten atamalar sayılmaz. */
  aktifDanismanlikSayisi: number;
  /** Faaliyetlerine bağladığı paydaş kurum bağlantısı sayısı. */
  paydasliFaaliyetSayisi: number;
}

export interface RozetTanimi<TGirdi = KazanimGirdisi> {
  kod: string;
  ad: string;
  aciklama: string;
  /** Kaç adımda kazanılır. 1 ise "yaptın / yapmadın" rozetidir. */
  hedef: number;
  ilerleme: (girdi: TGirdi) => number;
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

/**
 * Öğretmen nişanları.
 *
 * Öğrenci listesi olduğu gibi kullanılamazdı: "Çalışma grubu seçtin" ve "temsil
 * görevi üstlendin" öğretmende hiçbir zaman dolmayacak, buna karşılık asıl
 * katkısı olan danışmanlık ve faaliyet düzenlemek hiç sayılmayacaktı. Ölçütler
 * KATILIMDAN çok EMEĞE bakar; öğretmen GençTek'e çoğunlukla katılımcı olarak
 * değil, öğrencinin önünü açarak dahil oluyor.
 */
export const OGRETMEN_ROZETLERI: RozetTanimi<OgretmenKatkiGirdisi>[] = [
  {
    kod: "ILK_FAALIYET",
    ad: "İlk Faaliyet",
    aciklama: "İlk GençTek faaliyetinizi düzenlediniz.",
    hedef: 1,
    ilerleme: (girdi) => girdi.duzenledigiFaaliyetSayisi,
  },
  {
    kod: "SUREKLI_DUZENLEYICI",
    ad: "Sürekli Düzenleyici",
    aciklama: "Beş faaliyet düzenlediniz.",
    hedef: 5,
    ilerleme: (girdi) => girdi.duzenledigiFaaliyetSayisi,
  },
  {
    kod: "REHBER",
    ad: "Rehber",
    aciklama: "Bir öğrencinin danışmanlığını üstlendiniz.",
    hedef: 1,
    ilerleme: (girdi) => girdi.aktifDanismanlikSayisi,
  },
  {
    kod: "YOL_ACAN",
    ad: "Yol Açan",
    aciklama: "On öğrencinin danışmanısınız.",
    hedef: 10,
    ilerleme: (girdi) => girdi.aktifDanismanlikSayisi,
  },
  {
    kod: "SAHADA",
    ad: "Sahada",
    aciklama: "Bir GençTek etkinliğine katılımcı olarak katıldınız.",
    hedef: 1,
    ilerleme: (girdi) => girdi.katilimlar.length,
  },
  {
    kod: "IS_BIRLIGI",
    ad: "İş Birliği",
    aciklama: "Faaliyetinize bir paydaş kurumu dahil ettiniz.",
    hedef: 1,
    ilerleme: (girdi) => girdi.paydasliFaaliyetSayisi,
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

function durumlariHesapla<TGirdi>(
  tanimlar: RozetTanimi<TGirdi>[],
  girdi: TGirdi,
): RozetDurumu[] {
  return tanimlar.map((rozet) => {
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

export function rozetDurumlari(girdi: KazanimGirdisi): RozetDurumu[] {
  return durumlariHesapla(ROZETLER, girdi);
}

export function ogretmenRozetDurumlari(
  girdi: OgretmenKatkiGirdisi,
): RozetDurumu[] {
  return durumlariHesapla(OGRETMEN_ROZETLERI, girdi);
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
