/**
 * Salt okunur alan koruması.
 *
 * EBA/e-Okul kaynaklı alanlar hiçbir ekranda düzenlenemez. Profil güncelleme
 * isteğinde bu alanlar gelirse SESSİZCE yok sayılır — hata döndürülmez, ama
 * loglanır (references/permissions.md Bölüm 7).
 *
 * Bu dosya veritabanına gitmez; kural birim testlerle doğrulanır.
 */

export const SALT_OKUNUR_ALANLAR = [
  "ad",
  "soyad",
  "cinsiyet",
  "kurumKodu",
  "ilKodu",
  "ilceKodu",
  "sinif",
  "brans",
  "egitimOgretimYili",
  "okulAdi",
  "okulTuru",
] as const;

export const SALT_OKUNUR_ACIKLAMASI =
  "Bu bilgi e-Okul kayıtlarından gelmektedir; hatalı ise okul idaresine başvurunuz.";

export interface AyiklamaSonucu<T> {
  temizVeri: T;
  yoksayilanAlanlar: string[];
}

export function saltOkunurAlanlariAyikla<T extends Record<string, unknown>>(
  gelenVeri: Record<string, unknown>,
  izinliAlanlar: readonly (keyof T & string)[],
): AyiklamaSonucu<Partial<T>> {
  const temizVeri: Record<string, unknown> = {};
  const yoksayilanAlanlar: string[] = [];

  for (const [anahtar, deger] of Object.entries(gelenVeri)) {
    if (izinliAlanlar.includes(anahtar as keyof T & string)) {
      temizVeri[anahtar] = deger;
    } else {
      yoksayilanAlanlar.push(anahtar);
    }
  }

  return {
    temizVeri: temizVeri as Partial<T>,
    yoksayilanAlanlar,
  };
}
