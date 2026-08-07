-- Öğretmen özgeçmişi (7 Ağustos 2026).
--
-- İSTEK: öğretmen profili listesinde "Özgeçmiş".
--
-- ALANLAR KOPYALANDI, ORTAK TABLOYA TAŞINMADI. `ogrenci_profil` ile
-- `ogretmen_profil` için ortak bir "cv" tablosu açmak, iki profil satırının
-- yaşam döngüsünü birbirine bağlardı: öğrenci mezun olduğunda öğrenci profili
-- kapanır, öğretmeninki kapanmaz. Beş sütunluk tekrar, o bağı kurmaktan ucuz.
--
-- SINIRLAR ORTAK: `sistem_ayari` içindeki IZINLI_CV_TIPLERI ve CV_MAKS_BAYT
-- ikisi için de geçerli (bkz. lib/ogrenci/cv.ts). Öğretmenin CV'si için ayrı
-- bir sınır tutmanın karşılığı yok — aynı türde dosya, aynı depolama.
--
-- KİMLER İNDİREBİLİR: kişinin kendisi, il koordinatörü ve proje yöneticisi.
-- Öğrenci hiçbir koşulda göremez; öğretmen envanteri zaten ona kapalı
-- (bkz. lib/yetki/kapsam.ts · ogretmenKapsamFiltresi).

ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "cv_dosya_adi" VARCHAR(255);
ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "cv_depolama_yolu" TEXT;
ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "cv_mime_tipi" VARCHAR(100);
ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "cv_boyut_bayt" BIGINT;
ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "cv_yuklenme_tarihi" TIMESTAMPTZ(6);

-- Dosya varsa adı ve tipi de olmalı: eksik satır, indirme rotasında sessizce
-- 404'e düşen ve sebebi anlaşılmayan bir kayıt bırakırdı.
ALTER TABLE "ogretmen_profil" DROP CONSTRAINT IF EXISTS "ck_ogretmen_cv_butunlugu";
ALTER TABLE "ogretmen_profil"
  ADD CONSTRAINT "ck_ogretmen_cv_butunlugu"
  CHECK (
    "cv_depolama_yolu" IS NULL
    OR ("cv_dosya_adi" IS NOT NULL AND "cv_mime_tipi" IS NOT NULL)
  );
