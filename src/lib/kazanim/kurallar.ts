import type { KatilimBicimi, KazanimTipi } from "@/generated/prisma/enums";

/**
 * Kişinin kendi girdiği kazanım kayıtlarının kabul kuralları —
 * references/domain-rules.md Bölüm 14.
 *
 * Saf tutulur: veritabanına ve dosya sistemine gitmez, böylece birim testle
 * eksiksiz kapsanabilir. Kayıt bir BEYANdır — sistem doğrulamaz, onaya da tabi
 * değildir; buradaki kontroller yalnızca biçimseldir.
 *
 * Kayıt sahibi öğrenci de öğretmen de olabilir. Kurallar ikisinde de AYNIdır
 * (aynı tipler, aynı alanlar, aynı sınırlar); değişen yalnızca etiketlerdir.
 */

/**
 * Etkinliğin/eğitimin nasıl yürütüldüğü.
 *
 * Faaliyetlerde SORULMAZ: orada yer kapsamdan ve açıklamadan okunuyor. Kazanım
 * dışarıdan gelen bir beyandır ve "nerede yapıldı" bilgisi başka hiçbir alandan
 * çıkarılamaz — çevrim içi bir hackathona katılmakla üç gün başka bir şehirde
 * kalmak aynı kayıt değildir.
 */
export const KATILIM_BICIMI_ETIKETLERI: Record<KatilimBicimi, string> = {
  YUZ_YUZE: "Yüz yüze",
  ONLINE: "Çevrim içi",
  KARMA: "Karma",
};

export const KATILIM_BICIMLERI: KatilimBicimi[] = [
  "YUZ_YUZE",
  "ONLINE",
  "KARMA",
];

export function katilimBicimiGecerliMi(deger: string): deger is KatilimBicimi {
  return (KATILIM_BICIMLERI as string[]).includes(deger);
}

/**
 * Kaydın kime ait olduğu — yalnızca ETİKETLERİ belirler, kuralları değil.
 *
 * Veritabanında tutulmaz; kaydı açan kişinin aktif rolünden okunur. Sütuna
 * kopyalansaydı öğrenci mezun olduğunda ya da öğretmen görev değiştirdiğinde
 * eskirdi (aynı gerekçeyle `basvuru` da katılımcının tipini tutmuyor).
 */
export type KazanimSahibi = "OGRENCI" | "OGRETMEN";

/** Sahibe göre değişen metinler. */
interface KazanimMetinleri {
  /** Bölüm başlığı (çoğul): "Yaptığım ürünler". */
  baslik: string;
  /** Formdaki "başlık" alanının etiketi — tipe göre farklı şey sorulur. */
  baslikEtiketi: string;
  baslikOrnegi: string;
  aciklama: string;
}

/** Kazanım tipinin ekranda nasıl anlatılacağı ve hangi alanları taşıdığı. */
export interface KazanimTipiTanimi extends KazanimMetinleri {
  tip: KazanimTipi;
  /** Derece alanı yalnızca yarışmalarda sorulur. */
  dereceVarMi: boolean;
  /** Düzenleyen kurum alanı ürünlerde anlamsızdır. */
  duzenleyenVarMi: boolean;
  /**
   * Adı, GençTek programları listesinden seçilebilir mi?
   *
   * Listeden seçim ZORUNLU DEĞİLDİR; "Diğer" seçilip ad serbest yazılabilir.
   * GençTek DIŞI etkinlik ve öğrencinin kendi ürünü tanımı gereği listede
   * olamayacağı için o iki tipte seçim hiç sunulmaz.
   */
  programSecimiVarMi: boolean;
  /** Yüz yüze / çevrim içi ayrımı ürünlerde anlamsızdır. */
  katilimBicimiVarMi: boolean;
  /** Hedef kitle yalnızca birine bir şey ANLATILAN kayıtlarda sorulur. */
  hedefKitleVarMi: boolean;
}

/**
 * Tiplerin öğrenci metinleri; öğretmende değişenler `OGRETMEN_METINLERI`'nde.
 *
 * Alan kuralları (hangi tipte derece sorulur, hangisinde hedef kitle) burada
 * TEK yerde durur ve sahibe göre değişmez: bir yarışma derecesi kimin girdiğine
 * bağlı olarak başka bir şey olmuyor.
 */
export const KAZANIM_TIPLERI: KazanimTipiTanimi[] = [
  {
    /*
     * GençTek katılımı normalde OTOMATİK gelir (basvuru + faaliyet) ve profilde
     * "Katıldığım faaliyetler" olarak görünür. Bu tip, sisteme hiç girilmemiş
     * eski etkinlikler için elle giriş sağlar.
     *
     * Kayıt bir BEYANDIR: sistem doğrulamaz ve otomatik listeyle çakışabilir.
     * Rozetler bu kayıtlardan hesaplanmaz (bkz. lib/kazanim/rozetler.ts), yani
     * beyanla nişan kazanılamaz.
     */
    tip: "GENCTEK_ETKINLIGI",
    baslik: "GençTek etkinlikleri",
    baslikEtiketi: "Etkinliğin adı",
    baslikOrnegi: "Genç Gölge — Ankara",
    aciklama:
      "Katıldığınız GençTek etkinlikleri. Sistem üzerinden başvurduklarınız zaten otomatik listelenir; burayı yalnızca sisteme girilmemiş eski etkinlikler için kullanın.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
    programSecimiVarMi: true,
    katilimBicimiVarMi: true,
    hedefKitleVarMi: false,
  },
  {
    tip: "DIS_ETKINLIK",
    baslik: "GençTek dışı etkinlikler",
    baslikEtiketi: "Etkinliğin adı",
    baslikOrnegi: "TEKNOFEST Bilgi Teknolojileri Zirvesi",
    aciklama:
      "GençTek programı dışında katıldığınız ulusal ya da uluslararası etkinlikler.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
    programSecimiVarMi: false,
    katilimBicimiVarMi: true,
    hedefKitleVarMi: false,
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
    programSecimiVarMi: false,
    katilimBicimiVarMi: false,
    hedefKitleVarMi: false,
  },
  {
    tip: "AKRAN_EGITIMI",
    baslik: "Verdiğim akran eğitimleri",
    baslikEtiketi: "Eğitimin konusu",
    baslikOrnegi: "9. sınıflara Python'a giriş atölyesi",
    aciklama: "GençTek kapsamında akranlarınıza verdiğiniz eğitimler.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
    programSecimiVarMi: true,
    katilimBicimiVarMi: true,
    hedefKitleVarMi: true,
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
    programSecimiVarMi: true,
    katilimBicimiVarMi: true,
    hedefKitleVarMi: false,
  },
  {
    /*
     * Sonda duruyor: bir kayıt hangi tipe girdiğini bilmiyorsa buraya düşer.
     * Başta olsaydı kullanıcı diğer tipleri okumadan bunu seçerdi.
     */
    tip: "DIGER",
    baslik: "Diğer etkinlikler",
    baslikEtiketi: "Kaydın adı",
    baslikOrnegi: "Mahalle kütüphanesi gönüllülüğü",
    aciklama:
      "Yukarıdaki başlıkların hiçbirine girmeyen katkı ve deneyimleriniz.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
    programSecimiVarMi: false,
    katilimBicimiVarMi: true,
    hedefKitleVarMi: false,
  },
];

/**
 * Öğretmende BAŞKA TÜRLÜ söylenmesi gereken metinler.
 *
 * Yalnızca farklı olanlar yazılır; yazılmayan tip öğrenci metnini kullanır
 * (ürün ürün, dış etkinlik dış etkinliktir). Asıl fark akran eğitimindedir:
 * öğretmenin öğrencisine verdiği eğitim "akran" eğitimi DEĞİLDİR ve o başlığı
 * öğretmene göstermek, kaydın ne olduğunu yanlış anlatmak olurdu. Yarışmada da
 * öğretmen çoğunlukla yarışmacı değil danışman/eğitmen olarak yer alır.
 */
const OGRETMEN_METINLERI: Partial<Record<KazanimTipi, Partial<KazanimMetinleri>>> =
  {
    AKRAN_EGITIMI: {
      baslik: "Verdiğim eğitimler",
      baslikEtiketi: "Eğitimin konusu",
      baslikOrnegi: "Meslektaşlarıma yapay zekâ araçları semineri",
      aciklama:
        "Öğrencilere, meslektaşlarınıza ya da velilere verdiğiniz eğitim ve atölyeler.",
    },
    YARISMA_DERECESI: {
      baslik: "Derece aldığımız yarışmalar",
      aciklama:
        "Kendinizin ya da danışmanlığını yaptığınız takımın derece aldığı bilişim yarışmaları.",
    },
    URUN: {
      baslikOrnegi: "Bilişim dersleri için etkileşimli ders materyali",
      aciklama:
        "Geliştirdiğiniz web sitesi, uygulama, oyun, ders materyali ve benzeri ürünler.",
    },
  };

export function kazanimTipiTanimi(
  tip: KazanimTipi,
  sahip: KazanimSahibi = "OGRENCI",
): KazanimTipiTanimi {
  const tanim = KAZANIM_TIPLERI.find((aday) => aday.tip === tip);
  if (!tanim) {
    // Enum'a yeni bir değer eklenip buraya tanım yazılmadığında sessizce boş
    // ekran çıkmasın diye erken patlıyor.
    throw new Error(`Kazanım tipi tanımı eksik: ${tip}`);
  }
  if (sahip === "OGRENCI") return tanim;
  return { ...tanim, ...OGRETMEN_METINLERI[tip] };
}

/** Sekme ve bölüm listesi — sırası sahibe göre değişmez. */
export function kazanimTipleri(
  sahip: KazanimSahibi = "OGRENCI",
): KazanimTipiTanimi[] {
  return KAZANIM_TIPLERI.map((tanim) => kazanimTipiTanimi(tanim.tip, sahip));
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
const HEDEF_KITLE_SINIRI = 200;

export interface KazanimGirdisi {
  tip: string;
  baslik: string;
  aciklama?: string | null;
  tarih?: Date | null;
  baglantiUrl?: string | null;
  derece?: string | null;
  duzenleyen?: string | null;
  katilimBicimi?: string | null;
  hedefKitle?: string | null;
  /**
   * Listeden seçilen GençTek programı. Seçilmediyse (ya da "Diğer" seçildiyse)
   * null gelir ve ad serbest metinden okunur.
   */
  program?: { id: number; ad: string } | null;
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
  temelEtkinlikProgramiId: number | null;
  katilimBicimi: KatilimBicimi | null;
  hedefKitle: string | null;
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

  /*
   * Program seçildiyse ADI KOPYALANIR, bağlantıya güvenilmez: program pasife
   * alındığında ya da adı değiştiğinde öğrencinin geçmiş kaydı okunamaz hâle
   * gelmemeli. Bağlantı yalnızca aynı programa ait kayıtları gruplayabilmek
   * için tutulur.
   */
  const program = tanim.programSecimiVarMi ? (girdi.program ?? null) : null;
  const baslik = program ? program.ad : kirp(girdi.baslik);
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

  const hamKatilim = tanim.katilimBicimiVarMi ? kirp(girdi.katilimBicimi) : null;
  let katilimBicimi: KatilimBicimi | null = null;
  if (hamKatilim !== null) {
    if (!katilimBicimiGecerliMi(hamKatilim)) {
      return { olurMu: false, neden: "Katılım biçimi anlaşılamadı." };
    }
    katilimBicimi = hamKatilim;
  }

  const hedefKitle = tanim.hedefKitleVarMi ? kirp(girdi.hedefKitle) : null;
  if (hedefKitle && hedefKitle.length > HEDEF_KITLE_SINIRI) {
    return {
      olurMu: false,
      neden: `Hedef kitle en fazla ${HEDEF_KITLE_SINIRI} karakter olabilir.`,
    };
  }

  const tarih = girdi.tarih ?? null;
  if (tarih && Number.isNaN(tarih.getTime())) {
    return { olurMu: false, neden: "Tarih anlaşılamadı." };
  }

  return {
    olurMu: true,
    kayit: {
      tip: girdi.tip,
      baslik,
      aciklama,
      tarih,
      baglantiUrl,
      derece,
      duzenleyen,
      temelEtkinlikProgramiId: program?.id ?? null,
      katilimBicimi,
      hedefKitle,
    },
  };
}
