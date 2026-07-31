-- Üç küçük ekleme: ilçe temsilciliği, iki yeni paydaş türü ve çok günlü
-- faaliyetlerin bitiş tarihi. Üçü de mevcut kayıtları etkilemez.

-- ---------------------------------------------------------------------------
-- 1. İlçe temsilcisi
-- ---------------------------------------------------------------------------
-- Görev rolleri il ve okul düzeyindeydi; arada ilçe basamağı eksikti. Rol
-- kapsamı OgrenciGorevRolu üzerinden zaten kullanıcının ilçe koduna bakarak
-- çözüldüğü için yeni bir sütun gerekmiyor, yalnızca enum değeri.
ALTER TYPE "GorevRolKodu" ADD VALUE IF NOT EXISTS 'ILCE_TEMSILCISI';

-- ---------------------------------------------------------------------------
-- 2. Yeni paydaş türleri
-- ---------------------------------------------------------------------------
-- GENCTEK_UNIVERSITE, UNIVERSITE'den AYRI bir değerdir: ikisi de üniversitedir
-- ama protokollü olanı listede ayırt edebilmek gerekiyor. Mevcut kayıtlar
-- UNIVERSITE olarak kalır; toplu bir dönüştürme YAPILMAZ, hangi üniversitenin
-- protokollü olduğunu yalnızca ili bilir.
ALTER TYPE "PaydasTuru" ADD VALUE IF NOT EXISTS 'GENCTEK_UNIVERSITE';
ALTER TYPE "PaydasTuru" ADD VALUE IF NOT EXISTS 'MEZUN';

-- ---------------------------------------------------------------------------
-- 3. Çok günlü faaliyetler
-- ---------------------------------------------------------------------------
-- Bazı faaliyetler bir gün değil aylarca sürüyor. "Kaç gün" diye bir SAYI
-- tutulmuyor; süre iki tarihten hesaplanıyor. Sayı tutulsaydı tarih
-- değiştiğinde güncellenmesi unutulur ve ekranda tarihle çelişen bir süre
-- görünürdü.
--
-- NULL = tek günlük faaliyet. Mevcut kayıtların hepsi böyledir ve bu bir eksik
-- veri değil, gerçek durumdur — bu yüzden varsayılan değer verilmiyor.
ALTER TABLE "faaliyet"
  ADD COLUMN IF NOT EXISTS "bitis_tarihi" TIMESTAMPTZ(6);

-- Bitiş başlangıçtan önce olamaz. Eşitliğe izin var: aynı gün başlayıp biten
-- faaliyet geçerlidir (tek günlük olduğunu ayrıca NULL ile de yazılabilir).
ALTER TABLE "faaliyet" DROP CONSTRAINT IF EXISTS "ck_faaliyet_bitis_baslangictan_sonra";
ALTER TABLE "faaliyet" ADD CONSTRAINT "ck_faaliyet_bitis_baslangictan_sonra"
  CHECK ("bitis_tarihi" IS NULL OR "bitis_tarihi" >= "tarih");
