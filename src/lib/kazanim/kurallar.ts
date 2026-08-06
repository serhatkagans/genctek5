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
  /**
   * Ürüne özgü alanlar: geliştiren ekip, çoklu bağlantı ve "markette paylaş".
   * Yalnızca URUN'da açılır — bir sertifikanın "geliştiren ekibi" olmaz.
   */
  urunAlanlariVarMi?: boolean;
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
     * "Katıldığım etkinlikler" olarak görünür. Bu tip, sisteme hiç girilmemiş
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
      "Kendi geliştirdiğiniz web sitesi, uygulama, oyun, film ve benzeri ürünler. Şimdilik yalnızca TANITIM yapılır: program dosyası yüklenmez.",
    dereceVarMi: false,
    duzenleyenVarMi: false,
    programSecimiVarMi: false,
    katilimBicimiVarMi: false,
    hedefKitleVarMi: false,
    urunAlanlariVarMi: true,
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
    baslik: "Derecelerim",
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
    tip: "SERTIFIKA",
    baslik: "Sertifikalarım",
    baslikEtiketi: "Sertifikanın adı",
    baslikOrnegi: "Siber Güvenliğe Giriş — 40 saat",
    aciklama:
      "Aldığınız sertifikalar ve katılım belgeleri. Belgenin kendisini kaydın altındaki 'Destekleyici belgeler' alanından yükleyebilirsiniz.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
    programSecimiVarMi: false,
    katilimBicimiVarMi: false,
    hedefKitleVarMi: false,
  },
  {
    /*
     * Topluluk BEYANDIR, ortak bir kayıt değil: aynı kulübe iki öğrenci
     * yazdığında iki ayrı satır oluşur ve sistem bunları eşleştirmez.
     * Eşleştirilmiş bir topluluk kaydı ayrı bir referans tablosu ve üyelik
     * yönetimi demekti — istekte istenen bu değil, "gösterebileceği" bir bölüm.
     */
    tip: "TOPLULUK",
    baslik: "Topluluklarım",
    baslikEtiketi: "Topluluğun adı",
    baslikOrnegi: "Robotik Kulübü — takım kaptanı",
    aciklama:
      "İçinde yer aldığınız kulüp, proje ekibi, takım ve benzeri topluluklar. Kendi beyanınızdır; sistem doğrulamaz.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
    programSecimiVarMi: false,
    katilimBicimiVarMi: false,
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
      baslik: "Derecelerimiz",
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

/**
 * Profildeki iki yolculuk bölümü hangi kazanım tiplerini taşır.
 *
 * Ayrım kaydın NEREDE geçtiğine göredir, ne olduğuna göre değil: GençTek
 * içinde yapılan (katıldığı GençTek etkinlikleri, verdiği akran eğitimleri)
 * bir bölümde, GençTek dışında yapılan (dış etkinlikler, ürünler, dereceler)
 * öbüründe. "Diğer" bilişim tarafındadır — GençTek kapsamındaki bir kaydın
 * zaten kendi tipi var, tipini bulamayan kayıt tanımı gereği dışarıdandır.
 *
 * İki listenin birleşimi TÜM tipleri kapsamak zorundadır; aksi halde kullanıcı
 * bir kaydı girer ve profilinde hiçbir yerde göremez. `kazanimBolumuBulunmayan`
 * bunu birim testte sınar.
 */
export const GENCTEK_YOLCULUGU_TIPLERI: readonly KazanimTipi[] = [
  "GENCTEK_ETKINLIGI",
  "AKRAN_EGITIMI",
];

export const BILISIM_YOLCULUGU_TIPLERI: readonly KazanimTipi[] = [
  "DIS_ETKINLIK",
  "URUN",
  "YARISMA_DERECESI",
  // Sertifika ve topluluk da GençTek DIŞINDA kazanılır; ikisi de buraya düşer
  // (istek: "Ayrıca 'Sertifikalarım' ve ... 'Topluluklarım' bölümü eklenecek").
  "SERTIFIKA",
  "TOPLULUK",
  "DIGER",
];

/** Hiçbir yolculuk bölümüne düşmeyen tipler — boş olmalı. */
export function kazanimBolumuBulunmayan(): KazanimTipi[] {
  const yerlesenler = new Set<KazanimTipi>([
    ...GENCTEK_YOLCULUGU_TIPLERI,
    ...BILISIM_YOLCULUGU_TIPLERI,
  ]);
  return KAZANIM_TIPLERI.map((tanim) => tanim.tip).filter(
    (tip) => !yerlesenler.has(tip),
  );
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
const GELISTIREN_EKIP_SINIRI = 250;
const BAGLANTI_ETIKET_SINIRI = 100;
/**
 * Bir kayda eklenebilecek azami bağlantı. Sınırsız bırakılsaydı tek kayıt
 * yüzlerce satır taşıyabilir ve ekran kullanılamaz hâle gelirdi.
 */
const BAGLANTI_ADEDI_SINIRI = 10;

/** Ürün formundaki tek bir bağlantı satırı. */
export interface BaglantiGirdisi {
  adres: string;
  etiket?: string | null;
}

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
  /** Yalnızca üründe sorulur. */
  gelistirenEkip?: string | null;
  markettePaylasilsin?: boolean;
  /** Ürünün birden çok adresi olabilir: depo, canlı sürüm, tanıtım videosu. */
  baglantilar?: BaglantiGirdisi[];
  /**
   * Listeden seçilen GençTek programı. Seçilmediyse (ya da "Diğer" seçildiyse)
   * null gelir ve ad serbest metinden okunur.
   */
  program?: { id: number; ad: string } | null;
}

/** Doğrulamadan geçmiş, veritabanına yazılmaya hazır kayıt. */
export interface TemizBaglanti {
  adres: string;
  etiket: string | null;
  siraNo: number;
}

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
  gelistirenEkip: string | null;
  markettePaylasilsin: boolean;
}

export type KazanimKarari =
  | { olurMu: true; kayit: TemizKazanim; baglantilar: TemizBaglanti[] }
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
export function baglantiGecerliMi(adres: string): boolean {
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

  /*
   * KATILIM BİÇİMİ YENİ KAYITLARDA ZORUNLU (5 Ağustos 2026).
   *
   * Formdaki "Belirtmek istemiyorum" seçeneği kaldırıldı: bilgi zaten
   * kullanıcının kafasında var ve boş bırakılan her kayıt raporlamada
   * "bilinmiyor" olarak birikiyordu.
   *
   * ESKİ KAYITLAR GERİYE DÖNÜK DOLDURULMAZ ve sütun NULL kabul etmeye devam
   * eder: bugüne kadar boş bırakılmış beyanları "yüz yüze" diye varsaymak
   * veriyi uydurmak olurdu. Kural yalnızca bu kapıdan, yani YENİ kayıttan
   * geçenlere uygulanır.
   */
  const hamKatilim = tanim.katilimBicimiVarMi ? kirp(girdi.katilimBicimi) : null;
  let katilimBicimi: KatilimBicimi | null = null;
  if (tanim.katilimBicimiVarMi && hamKatilim === null) {
    return { olurMu: false, neden: "Katılım biçimi seçilmelidir." };
  }
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

  /*
   * ÜRÜNE ÖZGÜ ALANLAR. Tipe uymayan alanlar burada da sessizce düşürülür:
   * bir sertifikanın "geliştiren ekibi" ya da "markette paylaş" bayrağı olmaz
   * ve istek elle kurcalanarak gönderilse bile yazılmamalı.
   */
  const urunAlanlari = tanim.urunAlanlariVarMi === true;

  const gelistirenEkip = urunAlanlari ? kirp(girdi.gelistirenEkip) : null;
  if (gelistirenEkip && gelistirenEkip.length > GELISTIREN_EKIP_SINIRI) {
    return {
      olurMu: false,
      neden: `Geliştiren ekip en fazla ${GELISTIREN_EKIP_SINIRI} karakter olabilir.`,
    };
  }

  const markettePaylasilsin = urunAlanlari
    ? girdi.markettePaylasilsin === true
    : false;

  const baglantilar: TemizBaglanti[] = [];
  if (urunAlanlari) {
    // Boş satırlar formdan gelir (kullanıcı hepsini doldurmak zorunda değil);
    // sayıya girmeden önce eleniyorlar.
    const dolular = (girdi.baglantilar ?? []).filter((satir) =>
      Boolean(satir.adres?.trim()),
    );
    if (dolular.length > BAGLANTI_ADEDI_SINIRI) {
      return {
        olurMu: false,
        neden: `En fazla ${BAGLANTI_ADEDI_SINIRI} bağlantı eklenebilir.`,
      };
    }
    for (const [sira, satir] of dolular.entries()) {
      const adres = satir.adres.trim();
      if (adres.length > BAGLANTI_SINIRI) {
        return {
          olurMu: false,
          neden: `Bağlantı adresi en fazla ${BAGLANTI_SINIRI} karakter olabilir.`,
        };
      }
      /*
       * Protokol kontrolü tek bağlantıdakiyle AYNI: `javascript:` ile başlayan
       * bir adres, profile bakan danışmanın tarayıcısında kod çalıştırırdı.
       */
      if (!baglantiGecerliMi(adres)) {
        return {
          olurMu: false,
          neden: "Bağlantı adresleri http:// veya https:// ile başlamalıdır.",
        };
      }
      const etiket = kirp(satir.etiket);
      if (etiket && etiket.length > BAGLANTI_ETIKET_SINIRI) {
        return {
          olurMu: false,
          neden: `Bağlantı etiketi en fazla ${BAGLANTI_ETIKET_SINIRI} karakter olabilir.`,
        };
      }
      baglantilar.push({ adres, etiket, siraNo: sira });
    }
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
      gelistirenEkip,
      markettePaylasilsin,
    },
    baglantilar,
  };
}
