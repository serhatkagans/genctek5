/**
 * SMS gövdesinin hazırlanması.
 *
 * Veritabanına ve ortam değişkenlerine BAKMAYAN ayrı bir dosyada duruyor:
 * kırpma kuralı birim testle sınanabilmeli, test için de veritabanı bağlantısı
 * gerekmemeli (aynı ayrım src/lib/faaliyet/kurallar.ts'de de var).
 */

/** SMS'in tek parçaya sığması için üst sınır. */
export const SMS_GOVDE_UST_SINIRI = 300;

/**
 * Başlık ve içerik tek metne indirilir; sınırı aşarsa kırpılır.
 *
 * Satır sonları tek boşluğa çevrilir: panel bildirimleri çok satırlı yazılıyor
 * ama SMS'te her satır sonu boşa karakter harcar. Yarım kalan cümle üç noktayla
 * bitirilir — kırpıldığı belli olmayan bir metin, eksik bilgiyi tam sanıp
 * yanlış karar verdirir.
 */
export function smsGovdesiHazirla(baslik: string, icerik: string): string {
  const tekSatir = `${baslik}: ${icerik}`.replace(/\s+/g, " ").trim();
  if (tekSatir.length <= SMS_GOVDE_UST_SINIRI) return tekSatir;
  return `${tekSatir.slice(0, SMS_GOVDE_UST_SINIRI - 3)}...`;
}
