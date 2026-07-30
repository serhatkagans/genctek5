import type { KazanimTipi } from "@/generated/prisma/enums";

/**
 * Öğrencinin kendi girdiği kazanım kayıtlarının kabul kuralları —
 * references/domain-rules.md Bölüm 14.
 *
 * Saf tutulur: veritabanına ve dosya sistemine gitmez, böylece birim testle
 * eksiksiz kapsanabilir. Kayıt bir ÖĞRENCİ BEYANIdır — sistem doğrulamaz,
 * onaya da tabi değildir; buradaki kontroller yalnızca biçimseldir.
 */

/** Kazanım tipinin ekranda nasıl anlatılacağı ve hangi alanları taşıdığı. */
export interface KazanimTipiTanimi {
  tip: KazanimTipi;
  /** Bölüm başlığı (çoğul): "Yaptığım ürünler". */
  baslik: string;
  /** Formdaki "başlık" alanının etiketi — tipe göre farklı şey sorulur. */
  baslikEtiketi: string;
  baslikOrnegi: string;
  aciklama: string;
  /** Derece alanı yalnızca yarışmalarda sorulur. */
  dereceVarMi: boolean;
  /** Düzenleyen kurum alanı ürünlerde anlamsızdır. */
  duzenleyenVarMi: boolean;
}

export const KAZANIM_TIPLERI: KazanimTipiTanimi[] = [
  {
    tip: "DIS_ETKINLIK",
    baslik: "GençTek dışı etkinlikler",
    baslikEtiketi: "Etkinliğin adı",
    baslikOrnegi: "TEKNOFEST Bilgi Teknolojileri Zirvesi",
    aciklama:
      "GençTek programı dışında katıldığınız ulusal ya da uluslararası etkinlikler.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
  },
  {
    tip: "URUN",
    baslik: "Yaptığım ürünler",
    baslikEtiketi: "Ürünün adı",
    baslikOrnegi: "Okul kütüphanesi mobil uygulaması",
    aciklama:
      "Kendi geliştirdiğiniz web sitesi, uygulama, oyun, film ve benzeri ürünler.",
    dereceVarMi: false,
    duzenleyenVarMi: false,
  },
  {
    tip: "AKRAN_EGITIMI",
    baslik: "Verdiğim akran eğitimleri",
    baslikEtiketi: "Eğitimin konusu",
    baslikOrnegi: "9. sınıflara Python'a giriş atölyesi",
    aciklama: "GençTek kapsamında akranlarınıza verdiğiniz eğitimler.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
  },
  {
    tip: "YARISMA_DERECESI",
    baslik: "Derece aldığım yarışmalar",
    baslikEtiketi: "Yarışmanın adı",
    baslikOrnegi: "Ulusal Bilgisayar Olimpiyatları",
    aciklama:
      "Bilişim alanında derece aldığınız yarışmalar. GençTek etkinlikleri de (EğitiJAM, Capture The Flag gibi) buraya girilebilir.",
    dereceVarMi: true,
    duzenleyenVarMi: true,
  },
];

export function kazanimTipiTanimi(tip: KazanimTipi): KazanimTipiTanimi {
  const tanim = KAZANIM_TIPLERI.find((aday) => aday.tip === tip);
  if (!tanim) {
    // Enum'a yeni bir değer eklenip buraya tanım yazılmadığında sessizce boş
    // ekran çıkmasın diye erken patlıyor.
    throw new Error(`Kazanım tipi tanımı eksik: ${tip}`);
  }
  return tanim;
}

export function kazanimTipiGecerliMi(deger: string): deger is KazanimTipi {
  return KAZANIM_TIPLERI.some((tanim) => tanim.tip === deger);
}

/** Alan uzunlukları veritabanı sütunlarıyla birebir aynı tutulur. */
const BASLIK_SINIRI = 250;
const ACIKLAMA_SINIRI = 2000;
const DERECE_SINIRI = 120;
const DUZENLEYEN_SINIRI = 200;
const BAGLANTI_SINIRI = 500;

export interface KazanimGirdisi {
  tip: string;
  baslik: string;
  aciklama?: string | null;
  tarih?: Date | null;
  baglantiUrl?: string | null;
  derece?: string | null;
  duzenleyen?: string | null;
}

/** Doğrulamadan geçmiş, veritabanına yazılmaya hazır kayıt. */
export interface TemizKazanim {
  tip: KazanimTipi;
  baslik: string;
  aciklama: string | null;
  tarih: Date | null;
  baglantiUrl: string | null;
  derece: string | null;
  duzenleyen: string | null;
}

export type KazanimKarari =
  | { olurMu: true; kayit: TemizKazanim }
  | { olurMu: false; neden: string };

function kirp(deger: string | null | undefined): string | null {
  const kirpilmis = (deger ?? "").trim();
  return kirpilmis ? kirpilmis : null;
}

/**
 * Bağlantı adresi kontrolü.
 *
 * Yalnızca http/https kabul edilir: `javascript:` ile başlayan bir adres
 * profilde tıklanabilir bağlantı olarak gösterildiğinde profile bakan
 * danışmanın tarayıcısında kod çalıştırırdı.
 */
function baglantiGecerliMi(adres: string): boolean {
  try {
    const cozulen = new URL(adres);
    return cozulen.protocol === "http:" || cozulen.protocol === "https:";
  } catch {
    return false;
  }
}

export function kazanimKabulEdilirMi(girdi: KazanimGirdisi): KazanimKarari {
  if (!kazanimTipiGecerliMi(girdi.tip)) {
    return { olurMu: false, neden: "Geçersiz kazanım türü." };
  }
  const tanim = kazanimTipiTanimi(girdi.tip);

  const baslik = kirp(girdi.baslik);
  if (!baslik) {
    return { olurMu: false, neden: `${tanim.baslikEtiketi} boş olamaz.` };
  }
  if (baslik.length > BASLIK_SINIRI) {
    return {
      olurMu: false,
      neden: `${tanim.baslikEtiketi} en fazla ${BASLIK_SINIRI} karakter olabilir.`,
    };
  }

  const aciklama = kirp(girdi.aciklama);
  if (aciklama && aciklama.length > ACIKLAMA_SINIRI) {
    return {
      olurMu: false,
      neden: `Açıklama en fazla ${ACIKLAMA_SINIRI} karakter olabilir.`,
    };
  }

  const baglantiUrl = kirp(girdi.baglantiUrl);
  if (baglantiUrl) {
    if (baglantiUrl.length > BAGLANTI_SINIRI) {
      return {
        olurMu: false,
        neden: `Bağlantı adresi en fazla ${BAGLANTI_SINIRI} karakter olabilir.`,
      };
    }
    if (!baglantiGecerliMi(baglantiUrl)) {
      return {
        olurMu: false,
        neden: "Bağlantı adresi http:// veya https:// ile başlamalıdır.",
      };
    }
  }

  /*
   * Tipe uymayan alanlar reddedilmez, SESSİZCE DÜŞÜRÜLÜR: ekran o alanı hiç
   * göstermediği için değer ancak istek elle kurcalandığında gelir, ve bunun
   * kullanıcıya anlatılacak bir tarafı yok. Düşürmek yerine yazmak, "ürünün
   * derecesi" gibi anlamsız veri üretirdi.
   */
  const derece = tanim.dereceVarMi ? kirp(girdi.derece) : null;
  if (derece && derece.length > DERECE_SINIRI) {
    return {
      olurMu: false,
      neden: `Derece en fazla ${DERECE_SINIRI} karakter olabilir.`,
    };
  }

  const duzenleyen = tanim.duzenleyenVarMi ? kirp(girdi.duzenleyen) : null;
  if (duzenleyen && duzenleyen.length > DUZENLEYEN_SINIRI) {
    return {
      olurMu: false,
      neden: `Düzenleyen kurum en fazla ${DUZENLEYEN_SINIRI} karakter olabilir.`,
    };
  }

  const tarih = girdi.tarih ?? null;
  if (tarih && Number.isNaN(tarih.getTime())) {
    return { olurMu: false, neden: "Tarih anlaşılamadı." };
  }

  return {
    olurMu: true,
    kayit: { tip: girdi.tip, baslik, aciklama, tarih, baglantiUrl, derece, duzenleyen },
  };
}
