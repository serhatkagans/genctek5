import { z } from "zod";

/**
 * Ortam değişkenleri — eksik veya hatalı yapılandırma uygulamayı AÇILIŞTA
 * durdurur. Yanlış yapılandırmayla ayakta kalan bir sistem, hatayı ilk gerçek
 * kullanıcı isteğinde gösterir; o noktada zaten geç kalınmıştır.
 */

/**
 * Üretimde kullanılması yasak varsayılan anahtar.
 *
 * Bu değerle imzalanan oturum çerezi taklit edilebilir: anahtar depoda ve
 * .env.example'da açıkça yazılıdır.
 */
const GELISTIRME_ANAHTARI = "gelistirme-ortami-icin-gecici-anahtar-degistirin";

const semaOrtam = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL tanımlı değil"),
  AUTH_PROVIDER: z.enum(["mock", "eba"]).default("mock"),
  OTURUM_GIZLI_ANAHTARI: z
    .string()
    .min(16, "OTURUM_GIZLI_ANAHTARI en az 16 karakter olmalı"),
  DEPOLAMA_SAGLAYICI: z.enum(["yerel", "s3"]).default("yerel"),
  DEPOLAMA_YEREL_DIZIN: z.string().default("./depolama"),

  /**
   * Uygulamanın kök dizini. Kendi alan adına kurulduğunda boş kalır; bir alt
   * dizine kurulduğunda (ör. https://ornek.gov.tr/genctek) "/genctek" olur.
   *
   * DERLEME ZAMANINDA da okunur (next.config.ts · basePath): değeri
   * değiştirdiğinizde yeniden derlemek ZORUNLUDUR, yoksa varlık adresleri eski
   * kökü işaret eder. Ayrıca oturum çerezinin yolunu belirler — alan adını
   * başka uygulamalarla paylaşırken çerez onlara sızmasın diye.
   */
  TEMEL_YOL: z
    .string()
    .default("")
    .refine(
      (deger) => deger === "" || /^\/[A-Za-z0-9._~-]+$/.test(deger),
      'TEMEL_YOL ya boş olmalı ya da "/genctek" gibi tek parçalı, eğik çizgiyle başlayan ve sonu eğik çizgisiz bir yol olmalı',
    ),

  // S3 uyumlu depolama; yalnızca DEPOLAMA_SAGLAYICI="s3" iken aranır.
  S3_UC_NOKTASI: z.string().optional(),
  S3_BOLGE: z.string().optional(),
  S3_KOVA: z.string().optional(),
  S3_ERISIM_ANAHTARI: z.string().optional(),
  S3_GIZLI_ANAHTAR: z.string().optional(),

  // EBA SSO; yalnızca AUTH_PROVIDER="eba" iken aranır.
  EBA_SSO_URL: z.string().optional(),
  EBA_ISTEMCI_ID: z.string().optional(),
  EBA_ISTEMCI_SIFRE: z.string().optional(),

  /**
   * E-posta bildirimi. Varsayılan "gunluk": ileti gönderilmez, sunucu
   * günlüğüne yazılır. Yanlış yapılandırmayla gerçek öğrencilere posta
   * gitmesindense hiç gitmemesi yeğdir.
   */
  EPOSTA_SAGLAYICI: z.enum(["kapali", "gunluk", "smtp"]).default("gunluk"),
  EPOSTA_GONDEREN: z.string().optional(),
  SMTP_SUNUCU: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_KULLANICI: z.string().optional(),
  SMTP_SIFRE: z.string().optional(),
});

const sonuc = semaOrtam.safeParse(process.env);

if (!sonuc.success) {
  const eksikler = sonuc.error.issues
    .map((sorun) => `  - ${sorun.path.join(".")}: ${sorun.message}`)
    .join("\n");
  throw new Error(`Ortam değişkenleri hatalı:\n${eksikler}`);
}

const veri = sonuc.data;

/*
 * `next build` de NODE_ENV=production ile çalışır ama o bir çalışma zamanı
 * değildir: derleme yapan makinede üretim sırlarının bulunmasını şart koşmak,
 * sırları derleme ortamına taşımaya zorlardı. Üretim kontrolleri yalnızca
 * gerçekten sunucu ayaktayken uygulanır.
 */
const derlemeAsamasiMi = process.env.NEXT_PHASE === "phase-production-build";
const uretimMi = process.env.NODE_ENV === "production" && !derlemeAsamasiMi;

/*
 * Koşullu zorunluluklar şemada değil burada: bir alanın gerekliliği başka bir
 * alanın değerine bağlı olduğunda, hata mesajının hangi seçim yüzünden
 * çıktığını söylemesi gerekir.
 */
const yapilandirmaHatalari: string[] = [];

if (uretimMi && veri.OTURUM_GIZLI_ANAHTARI === GELISTIRME_ANAHTARI) {
  yapilandirmaHatalari.push(
    "OTURUM_GIZLI_ANAHTARI hâlâ örnek değerde. Üretimde mutlaka değiştirin:\n" +
      '      node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  );
}

if (veri.DEPOLAMA_SAGLAYICI === "s3") {
  for (const anahtar of [
    "S3_UC_NOKTASI",
    "S3_KOVA",
    "S3_ERISIM_ANAHTARI",
    "S3_GIZLI_ANAHTAR",
  ] as const) {
    if (!veri[anahtar]) {
      yapilandirmaHatalari.push(
        `${anahtar} tanımlı değil (DEPOLAMA_SAGLAYICI="s3" seçildiğinde zorunlu).`,
      );
    }
  }
}

if (veri.AUTH_PROVIDER === "eba") {
  for (const anahtar of [
    "EBA_SSO_URL",
    "EBA_ISTEMCI_ID",
    "EBA_ISTEMCI_SIFRE",
  ] as const) {
    if (!veri[anahtar]) {
      yapilandirmaHatalari.push(
        `${anahtar} tanımlı değil (AUTH_PROVIDER="eba" seçildiğinde zorunlu).`,
      );
    }
  }
}

if (veri.EPOSTA_SAGLAYICI === "smtp") {
  for (const anahtar of ["SMTP_SUNUCU", "EPOSTA_GONDEREN"] as const) {
    if (!veri[anahtar]) {
      yapilandirmaHatalari.push(
        `${anahtar} tanımlı değil (EPOSTA_SAGLAYICI="smtp" seçildiğinde zorunlu).`,
      );
    }
  }
}

if (yapilandirmaHatalari.length > 0) {
  throw new Error(
    `Ortam değişkenleri hatalı:\n${yapilandirmaHatalari
      .map((satir) => `  - ${satir}`)
      .join("\n")}`,
  );
}

export const ortam = veri;

/**
 * Çerezlerin geçerli olduğu yol.
 *
 * Uygulama bir alt dizine kurulduğunda çerez yolu da oraya daraltılır. Aksi
 * halde aynı alan adındaki diğer uygulamalar (ör. /baska-uygulama) her istekte
 * GençTek oturum çerezini de alır — oturum jetonu ilgisiz yazılımlara sızar.
 */
export const CEREZ_YOLU = veri.TEMEL_YOL === "" ? "/" : veri.TEMEL_YOL;
