import { prisma } from "./db";

/**
 * Sistem ayarları proje yöneticisi tarafından yapılandırılabilir; koda
 * gömülmez. Varsayılan değerler yalnızca kayıt henüz yoksa devreye girer.
 */

/*
 * Öğrenci başına çalışma grubu üst sınırı BURADA YOKTUR: sınır kaldırıldı,
 * öğrenci istediği kadar grup seçebilir. Anahtarı geri eklemeyin.
 */
export const AYAR_ANAHTARLARI = {
  GORSEL_MAKS_BAYT: "GORSEL_MAKS_BAYT",
  BELGE_MAKS_BAYT: "BELGE_MAKS_BAYT",
  IZINLI_GORSEL_TIPLERI: "IZINLI_GORSEL_TIPLERI",
  IZINLI_BELGE_TIPLERI: "IZINLI_BELGE_TIPLERI",
  /*
   * CV sınırları faaliyet eklerinden AYRI tutulur: CV'de doc/docx kabul
   * ediliyor, faaliyet ekinde edilmiyor. Ortak ayar kullanılsaydı CV için
   * açılan bir tip faaliyet eklerinde de açılırdı.
   */
  IZINLI_CV_TIPLERI: "IZINLI_CV_TIPLERI",
  CV_MAKS_BAYT: "CV_MAKS_BAYT",
  ERISIM_LOGU_SAKLAMA_AYI: "ERISIM_LOGU_SAKLAMA_AYI",
  BILDIRIM_SAKLAMA_AYI: "BILDIRIM_SAKLAMA_AYI",
  KVKK_AYDINLATMA_METNI: "KVKK_AYDINLATMA_METNI",
  DISA_AKTARMA_UST_SINIRI: "DISA_AKTARMA_UST_SINIRI",
} as const;

/** Tek dışa aktarmada indirilebilecek satır sayısı. */
export const VARSAYILAN_DISA_AKTARMA_UST_SINIRI = 5000;

/**
 * Yönetim ekranında düzenlenebilen ayarların biçimi.
 *
 * Biçim bilgisi ekranın hangi girdiyi göstereceğini ve doğrulamayı belirler;
 * serbest metin bir ayarı sayı alanında düzenletmek sessiz veri bozulması
 * demektir.
 */
export type AyarBicimi = "sayi" | "liste" | "metin" | "uzun-metin";

export interface AyarTanimi {
  anahtar: string;
  baslik: string;
  bicim: AyarBicimi;
  yardim: string;
}

export const YONETILEBILIR_AYARLAR: AyarTanimi[] = [
  {
    anahtar: AYAR_ANAHTARLARI.GORSEL_MAKS_BAYT,
    baslik: "Görsel boyut sınırı (bayt)",
    bicim: "sayi",
    yardim: "Faaliyete eklenen görsel başına üst sınır. 5 MB = 5242880.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.BELGE_MAKS_BAYT,
    baslik: "Belge boyut sınırı (bayt)",
    bicim: "sayi",
    yardim: "Faaliyete eklenen belge başına üst sınır. 10 MB = 10485760.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.IZINLI_GORSEL_TIPLERI,
    baslik: "İzinli görsel tipleri",
    bicim: "liste",
    yardim: "Virgülle ayrılmış MIME tipleri: image/jpeg,image/png,image/webp",
  },
  {
    anahtar: AYAR_ANAHTARLARI.IZINLI_BELGE_TIPLERI,
    baslik: "İzinli belge tipleri",
    bicim: "liste",
    yardim: "Virgülle ayrılmış MIME tipleri: application/pdf",
  },
  {
    anahtar: AYAR_ANAHTARLARI.IZINLI_CV_TIPLERI,
    baslik: "İzinli CV tipleri",
    bicim: "liste",
    yardim:
      "Öğrencinin CV olarak yükleyebileceği MIME tipleri. Yeni bir tip eklerseniz karşılığını src/lib/depolama/yerel.ts içindeki uzantı listesine de ekleyin.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.CV_MAKS_BAYT,
    baslik: "CV boyut sınırı (bayt)",
    bicim: "sayi",
    yardim: "Öğrenci CV'si için üst sınır. 5 MB = 5242880.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.ERISIM_LOGU_SAKLAMA_AYI,
    baslik: "Erişim kaydı saklama süresi (ay)",
    bicim: "sayi",
    yardim:
      "Süresi dolan kayıtlar bakım işiyle silinir. KVKK denetimi için kısa tutmayın.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.BILDIRIM_SAKLAMA_AYI,
    baslik: "Bildirim saklama süresi (ay)",
    bicim: "sayi",
    yardim: "Yalnızca okunmuş bildirimler silinir; okunmamışlara dokunulmaz.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
    baslik: "Dışa aktarma satır sınırı",
    bicim: "sayi",
    yardim:
      "Tek CSV indirmesinde en fazla kaç kayıt olabilir. Sınır aşıldığında indirme yapılmaz, filtre daraltılması istenir.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.KVKK_AYDINLATMA_METNI,
    baslik: "KVKK aydınlatma metni",
    bicim: "uzun-metin",
    yardim:
      "Boş bırakılırsa koddaki varsayılan metin gösterilir. Metni değiştirmek öğrencilerden YENİDEN ONAY ister.",
  },
];

/**
 * Ayar değerinin biçime uygunluğu. Hatalıysa kullanıcıya gösterilecek gerekçe,
 * uygunsa null döner.
 */
export function ayarDegeriGecerliMi(
  bicim: AyarBicimi,
  deger: string,
): string | null {
  if (bicim === "sayi") {
    const sayi = Number.parseInt(deger, 10);
    if (!Number.isFinite(sayi) || sayi < 1) {
      return "Değer 1 veya daha büyük bir tam sayı olmalıdır.";
    }
    return null;
  }
  if (bicim === "liste") {
    const parcalar = deger
      .split(",")
      .map((parca) => parca.trim())
      .filter(Boolean);
    if (parcalar.length === 0) return "En az bir değer girilmelidir.";
    return null;
  }
  return null;
}

export async function ayarMetin(
  anahtar: string,
  varsayilan: string,
): Promise<string> {
  const kayit = await prisma.sistemAyari.findUnique({ where: { anahtar } });
  return kayit?.deger ?? varsayilan;
}

export async function ayarSayi(
  anahtar: string,
  varsayilan: number,
): Promise<number> {
  const deger = await ayarMetin(anahtar, String(varsayilan));
  const sayi = Number.parseInt(deger, 10);
  return Number.isFinite(sayi) ? sayi : varsayilan;
}

export async function ayarListe(
  anahtar: string,
  varsayilan: string[],
): Promise<string[]> {
  const deger = await ayarMetin(anahtar, varsayilan.join(","));
  return deger
    .split(",")
    .map((parca) => parca.trim())
    .filter(Boolean);
}
