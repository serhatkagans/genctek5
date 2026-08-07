import { prisma } from "../db";
import type {
  KatkiFaaliyeti,
  KatkiGorevi,
  KatkiGrubu,
} from "@/components/KatkiKarti";

/**
 * Katkı kartının verisi — temsilcilikler, çalışma grupları ve öğrencinin
 * düzenlediği faaliyetler.
 *
 * Üç sorgu tek yerde toplanır çünkü kartı basan her ekran üçünü de ister;
 * ekranların kendi sorgularını yazması, birinde çekilen bir alanın diğerinde
 * unutulması demekti (kart o zaman aynı öğrenci için iki ekranda iki farklı şey
 * gösterirdi).
 *
 * Kapsam kontrolü BURADA YAPILMAZ: çağıran ekran öğrenciyi zaten
 * `ogrenciKapsamFiltresi`den geçirmiş olur. Bu fonksiyon yalnızca id alır.
 */

export interface KatkiVerisi {
  gorevler: KatkiGorevi[];
  gruplar: KatkiGrubu[];
  faaliyetler: KatkiFaaliyeti[];
}

export async function katkiVerisiGetir(
  ogrenciId: number,
): Promise<KatkiVerisi> {
  const [gorevler, gruplar, faaliyetler] = await Promise.all([
    /*
     * Dönem filtresi YOKTUR: geçmiş dönemin temsilciliği de bir katkıdır ve
     * kartta dönemiyle birlikte görünür. Yalnızca bu dönem gösterilseydi
     * öğrencinin geçmiş emeği eylül ayında sessizce silinmiş olurdu.
     */
    prisma.ogrenciGorevRolu.findMany({
      where: { ogrenciId },
      orderBy: { egitimOgretimYili: "desc" },
      select: {
        rolKodu: true,
        egitimOgretimYili: true,
        il: { select: { ad: true } },
        ilce: { select: { ad: true } },
        kurum: { select: { ad: true } },
        // CALISMA_GRUBU_YONETICISI rolünün kapsamı (7 Ağustos 2026); diğer
        // rollerde boş gelir ve etiket yer adını il/ilçe/kurumdan okur.
        calismaGrubu: { select: { ad: true } },
      },
    }),
    prisma.ogrenciCalismaGrubu.findMany({
      where: { ogrenciId },
      orderBy: { secimTarihi: "asc" },
      select: {
        calismaGrubuId: true,
        secimTarihi: true,
        calismaGrubu: { select: { ad: true, aktif: true } },
        ekleyen: { select: { ad: true, soyad: true } },
      },
    }),
    /*
     * Reddedilen öneri kartta yer almaz: kart bir katkı vitrinidir, red kararı
     * öğrencinin bildirimlerinde ve faaliyet listesinde zaten duruyor.
     */
    prisma.faaliyet.findMany({
      where: {
        duzenleyenKullaniciId: ogrenciId,
        onayDurumu: { not: "REDDEDILDI" },
      },
      orderBy: { tarih: "desc" },
      select: {
        id: true,
        ad: true,
        tarih: true,
        durum: true,
        onayDurumu: true,
      },
    }),
  ]);

  return { gorevler, gruplar, faaliyetler };
}
