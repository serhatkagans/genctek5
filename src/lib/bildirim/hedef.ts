import type { BildirimHedefTipi } from "@/generated/prisma/enums";

/**
 * Bildirimin işaret ettiği kaydın ekran karşılığı (10 Ağustos 2026 · istek:
 * "okundu işaretlemenin yanına bir de etkinliğe git butonu olsun").
 *
 * Bu dosya veritabanına BAKMAZ: hedef zaten bildirim satırında yazılı, burada
 * yalnızca yola ve düğme metnine çevriliyor. Saf tutulmasının sebebi, eşlemeyi
 * birim testle kapatabilmek — yanlış yol üreten bir bildirim, kullanıcıyı
 * başka birinin kaydına götürebilecek tek yerdir.
 *
 * YETKİ BURADA SORULMAZ ve sorulmamalı. Düğme yalnızca bir bağlantıdır;
 * kapsam kontrolü hedef sayfanın kendi işidir ve kapsam dışında 404 döner
 * (SKILL.md · Değişmezler 10). Burada "gösterme/gösterme" kararı verilseydi
 * yetki mantığı ikinci bir yerde daha yaşamaya başlardı.
 */

export interface BildirimHedefi {
  hedefTip: BildirimHedefTipi | null;
  hedefId: number | null;
}

export interface BildirimBaglantisi {
  yol: string;
  etiket: string;
}

const ETIKETLER: Record<BildirimHedefTipi, string> = {
  FAALIYET: "Etkinliğe git",
};

/**
 * Bildirimin gidilecek ekranı; hedefi olmayan bildirimde `null`.
 *
 * Hedefsizlik OLAĞAN bir durumdur: danışman değişikliği gibi bildirimlerin
 * gidilecek bir kaydı yok, ayrıca alanlar eklenmeden önce yazılmış
 * bildirimlerde de boş. Çağıran, null geldiğinde düğmeyi hiç basmaz.
 */
export function bildirimBaglantisi(
  bildirim: BildirimHedefi,
): BildirimBaglantisi | null {
  const { hedefTip, hedefId } = bildirim;
  /*
   * İkisi birlikte anlamlı: türü olup kimliği olmayan (ya da tersi) bir satır
   * veri bozulmasıdır ve bağlantıya çevrilmez.
   *
   * Karşılaştırma `== null` — undefined'ı da kapsıyor. Tipler "null" diyor ama
   * alanların HİÇ GELMEDİĞİ bir durum var: sunucu, sütunlar eklenmeden önce
   * üretilmiş bir Prisma istemcisiyle ayaktaysa sorgu o sütunları seçmez ve
   * alanlar undefined olur. Sıkı eşitlik bu hâlde ilk kapıdan geçip aşağıda
   * sessizce null döndürüyordu; ayrımı burada kapatmak, teşhisi zor bir
   * "düğme neden çıkmıyor" sorusunu ortadan kaldırıyor.
   */
  if (hedefTip == null || hedefId == null) return null;

  if (hedefTip === "FAALIYET") {
    return { yol: `/panel/etkinlikler/${hedefId}`, etiket: ETIKETLER.FAALIYET };
  }

  return null;
}
