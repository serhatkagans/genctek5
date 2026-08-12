import { prisma } from "../db";
import type { KatkiSayilari } from "./katki-ozeti";
import type {
  OgretmenKatkiFaaliyeti,
  OgretmenKatkiGorevi,
} from "@/components/OgretmenKatkiKarti";

/**
 * Öğretmenin katkı kartının verisi — görevleri, danışmanlığı ve düzenlediği
 * faaliyetler.
 *
 * Öğrencininkinden AYRI bir fonksiyondur (bkz. lib/ogrenci/katki.ts): kaynaklar
 * bambaşka tablolardır. Öğrencinin katkısı temsilcilik ve çalışma grubu
 * seçiminde, öğretmeninki üstlendiği görevde ve açtığı faaliyettedir; tek
 * fonksiyona sıkıştırılsaydı her çağrının yarısı boş dönerdi.
 *
 * Kapsam kontrolü BURADA YAPILMAZ: çağıran ekran öğretmeni zaten
 * `ogretmenKapsamFiltresi`nden geçirmiş olur ya da kişinin kendi ekranıdır.
 */

export interface OgretmenKatkiVerisi {
  gorevler: OgretmenKatkiGorevi[];
  /** Süren danışmanlık sayısı; biten atamalar sayılmaz. */
  aktifDanismanlik: number;
  faaliyetler: OgretmenKatkiFaaliyeti[];
}

export async function ogretmenKatkiVerisiGetir(
  ogretmenId: number,
): Promise<OgretmenKatkiVerisi> {
  const [gorevler, aktifDanismanlik, faaliyetler] = await Promise.all([
    /*
     * Biten görevler de gelir: "iki yıl il koordinatörlüğü yaptı" bir katkıdır
     * ve görevden ayrılınca kartın boşalması, geçmiş emeği silmek olurdu.
     */
    prisma.kullaniciRol.findMany({
      where: { kullaniciId: ogretmenId },
      orderBy: { baslangicTarihi: "desc" },
      select: {
        id: true,
        rolKodu: true,
        ilKodu: true,
        baslangicTarihi: true,
        bitisTarihi: true,
      },
    }),
    prisma.danismanAtama.count({
      where: { danismanKullaniciId: ogretmenId, bitisTarihi: null },
    }),
    /*
     * Reddedilen faaliyet kartta yer almaz: kart bir katkı vitrinidir, red
     * kararı bildirimlerde ve faaliyet listesinde zaten duruyor.
     */
    prisma.faaliyet.findMany({
      where: {
        duzenleyenKullaniciId: ogretmenId,
        onayDurumu: { not: "REDDEDILDI" },
      },
      orderBy: { tarih: "desc" },
      select: {
        id: true,
        ad: true,
        tarih: true,
        kapsam: true,
        durum: true,
        onayDurumu: true,
      },
    }),
  ]);

  return { gorevler, aktifDanismanlik, faaliyetler };
}

/**
 * Panelim'deki katkı kartının SAYILARI (12 Ağustos 2026).
 *
 * `ogretmenKatkiVerisiGetir` ile aynı ölçütler ama satırları değil sayıları
 * çeker: panel kartında listelere hiç dokunulmuyor, üç kayıt kümesinin tamamını
 * belleğe almak boşuna iş olurdu. Ölçütlerin ikinci kez yazılması bilinçli bir
 * bedel — ayrışmasınlar diye ikisi yan yana duruyor ve aynı yorumları paylaşıyor:
 * reddedilen faaliyet sayılmaz, biten görev sayılır, danışmanlık yalnızca aktif.
 */
export async function ogretmenKatkiSayilariGetir(
  ogretmenId: number,
): Promise<KatkiSayilari> {
  const [gorev, aktifDanismanlik, faaliyet] = await Promise.all([
    prisma.kullaniciRol.count({ where: { kullaniciId: ogretmenId } }),
    prisma.danismanAtama.count({
      where: { danismanKullaniciId: ogretmenId, bitisTarihi: null },
    }),
    prisma.faaliyet.count({
      where: {
        duzenleyenKullaniciId: ogretmenId,
        onayDurumu: { not: "REDDEDILDI" },
      },
    }),
  ]);

  return { gorev, aktifDanismanlik, faaliyet };
}
