/**
 * Bildirim şablonu doldurma. Şablonlar veritabanında tutulur, koda gömülmez;
 * bu dosya yalnızca yer tutucu değiştirme işini yapar.
 */

export const BILDIRIM_KODLARI = {
  BASVURU_SONUCU: "BASVURU_SONUCU",
  DANISMAN_DEGISTI: "DANISMAN_DEGISTI",
  DANISMAN_YENIDEN_SECIM: "DANISMAN_YENIDEN_SECIM",
  KOORDINATOR_DEVREDILEBILIR_OGRENCI: "KOORDINATOR_DEVREDILEBILIR_OGRENCI",
  ONAY_BEKLEYEN_ULUSAL_FAALIYET: "ONAY_BEKLEYEN_ULUSAL_FAALIYET",
  DANISMANA_KOPYA_ULUSAL_BASVURU: "DANISMANA_KOPYA_ULUSAL_BASVURU",
  OGRENCI_ATANAMADI: "OGRENCI_ATANAMADI",
  FAALIYET_IPTAL_EDILDI: "FAALIYET_IPTAL_EDILDI",
} as const;

export type BildirimKodu =
  (typeof BILDIRIM_KODLARI)[keyof typeof BILDIRIM_KODLARI];

/** Şablondaki {{degisken}} yer tutucularını doldurur. */
export function sablonuDoldur(
  sablon: string,
  degiskenler: Record<string, string>,
): string {
  return sablon.replace(/\{\{(\w+)\}\}/g, (tamEslesme, anahtar: string) => {
    return degiskenler[anahtar] ?? tamEslesme;
  });
}
