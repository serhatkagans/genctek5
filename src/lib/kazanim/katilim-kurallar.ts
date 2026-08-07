import type { EtkinlikKategorisi, Kapsam } from "@/generated/prisma/enums";

/**
 * "Katıldığı GençTek etkinlikleri" listesine neyin gireceği (7 Ağustos 2026).
 *
 * Saf tutulur: veritabanına ve React'e bakmaz, birim testle kapsanır. Sorgunun
 * kendisi `getir.ts` içinde; buradaki iş yalnızca KARAR.
 *
 * ---------------------------------------------------------------------------
 * KURALIN DEĞİŞMESİ
 * ---------------------------------------------------------------------------
 * Eski kural: "başvurusu SEÇİLDİ + tarihi geçti". Yani katılımcı listesine
 * alınan herkes, etkinliğe gelmese bile profilinde katılmış görünüyordu.
 *
 * Yeni kural (istek): "ismine belge oluşturulan öğrencilerin profiline
 * katıldığı etkinlik düşecek". Belge üretimi, etkinliği yürüten öğretmenin
 * "bu kişi gerçekten katıldı" beyanıdır — seçilmiş olmaktan daha güçlü bir
 * kanıt.
 */

/**
 * Belge temelli katılımın yürürlüğe girdiği an.
 *
 * NEDEN BİR GEÇİŞ TARİHİ VAR: bu tarihten önce üretilmiş belgelerin kaydı
 * YOK ve üretilemez (bkz. migration 20260807100000). Kural geriye dönük
 * uygulansaydı, bugün profilinde katılım görünen her öğrencinin listesi
 * bir anda boşalırdı — ve o listeden hesaplanan rozetler ile "Seferlerim"
 * seviyeleri de kazanılmış hâlden kazanılmamış hâle düşerdi. Nişanın geri
 * alınması, öğrenciye sistemin verdiği en kötü mesajdır.
 *
 * Bu yüzden sınır tarihten geçiyor:
 *   · bu andan ÖNCE yapılmış etkinlikler → eski kural (seçilmiş olmak yeter)
 *   · bu andan SONRA yapılacak etkinlikler → yalnızca belge
 *
 * Geçiş tamamlandığında (bu tarihten önceki etkinlikler artık kimsenin
 * profilinde anlamlı olmadığında) sabit ileri alınabilir ya da kural tek
 * kaynağa indirilebilir.
 */
export const BELGE_TEMELLI_KATILIM_BASLANGICI = new Date(
  "2026-08-07T00:00:00.000Z",
);

/** Katılım listesine giren tek bir etkinlik. */
export interface KatilimAdayi {
  faaliyetId: number;
  ad: string;
  tarih: Date;
  kapsam: Kapsam;
  etkinlikKategorisi: EtkinlikKategorisi;
  /** Adına bu etkinlikten belge üretilmiş mi? */
  belgeVarMi: boolean;
  /** Başvurusu SEÇİLDİ durumunda mı? */
  secildiMi: boolean;
}

/**
 * Tek bir etkinliğin katılım sayılıp sayılmayacağı.
 *
 * Belge her zaman yeter ve geçiş tarihine BAKMAZ: eski bir etkinlik için
 * bugün belge üretilirse o da katılımdır. Sınır yalnızca "belgesi olmayan
 * ama seçilmiş" durumu için işler.
 */
export function katilimSayilirMi(
  aday: Pick<KatilimAdayi, "tarih" | "belgeVarMi" | "secildiMi">,
  baslangic: Date = BELGE_TEMELLI_KATILIM_BASLANGICI,
): boolean {
  if (aday.belgeVarMi) return true;
  return aday.secildiMi && aday.tarih < baslangic;
}

/**
 * Adayları süzer ve tarihe göre yeniden sıralar.
 *
 * SIRALAMA BURADA yapılıyor, SQL'de değil: liste iki ayrı sorgunun birleşimi
 * (başvurular ve belgeler) ve veritabanı ikisini tek sıraya dizemez. Aynı
 * tarihli iki etkinlikte sıra `faaliyetId` ile kırılır — yoksa her sayfa
 * yenilemesinde sıra değişebilir ve liste "oynuyor" görünürdü.
 */
export function katilimlariSuz(
  adaylar: readonly KatilimAdayi[],
  baslangic: Date = BELGE_TEMELLI_KATILIM_BASLANGICI,
): KatilimAdayi[] {
  return adaylar
    .filter((aday) => katilimSayilirMi(aday, baslangic))
    .sort((a, b) => {
      const fark = b.tarih.getTime() - a.tarih.getTime();
      return fark !== 0 ? fark : b.faaliyetId - a.faaliyetId;
    });
}
