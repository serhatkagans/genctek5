-- Kullanıcının kendi yüklediği profil fotoğrafı.
--
-- Sütunlar "kullanici" tablosunda, profil tablolarında DEĞİL. Gerekçe: fotoğraf
-- her kullanıcı tipinde vardır, oysa YEĞİTEK personeline sağlama akışında ne
-- ogrenci_profil ne ogretmen_profil satırı açılır (lib/kullanici/sagla.ts
-- yalnızca OGRENCI ve OGRETMEN tipleri için profil oluşturur). Profil tablosuna
-- konsaydı "tüm kullanıcılar" gereksinimi personel için sağlanamazdı.
--
-- Hepsi NULL kabul eder: fotoğraf zorunlu değildir ve mevcut kayıtların
-- hiçbirinde yoktur. Varsayılan değer verilmez — "fotoğraf yok" durumunun
-- karşılığı NULL'dur, boş metin değil.
ALTER TABLE "kullanici"
  ADD COLUMN IF NOT EXISTS "foto_depolama_yolu" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "foto_mime_tipi" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "foto_yuklenme_tarihi" TIMESTAMPTZ(6);

-- Üçü birlikte dolar ya da birlikte boşalır. Ara durum (yol var, mime yok)
-- fotoğrafı servis edilemez hâle getirir ve ekranda kırık görsel olarak çıkar;
-- kısıt bunu veritabanı seviyesinde imkânsız kılıyor.
ALTER TABLE "kullanici" DROP CONSTRAINT IF EXISTS "ck_kullanici_foto_butun";
ALTER TABLE "kullanici" ADD CONSTRAINT "ck_kullanici_foto_butun"
  CHECK (
    ("foto_depolama_yolu" IS NULL
     AND "foto_mime_tipi" IS NULL
     AND "foto_yuklenme_tarihi" IS NULL)
    OR
    ("foto_depolama_yolu" IS NOT NULL
     AND "foto_mime_tipi" IS NOT NULL
     AND "foto_yuklenme_tarihi" IS NOT NULL)
  );
