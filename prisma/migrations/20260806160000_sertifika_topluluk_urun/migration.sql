-- Sertifikalarım, Topluluklarım ve genişletilmiş ürün formu (D3, D4, D5).
--
-- İSTEK:
--   · "'Sertifikalarım' bölümü eklenecek"
--   · "içinde yer aldığı toplulukları gösterebileceği (Klüp, proje ekibi, takım
--      vb.) 'Topluluklarım' bölümü eklenecek"
--   · "Ürün Ekleme Formu: Ürün Adı, Geliştiren Ekip, Açıklamalar, Destekleyici
--      Görseller, Linkler" + "'Bu ürünü markette paylaş' check box"
--
-- ---------------------------------------------------------------------------
-- 1. İki yeni kazanım tipi
-- ---------------------------------------------------------------------------
-- AYRI TABLO AÇILMADI. Plandaki ilk öneri ürün için ayrı bir tablo açmaktı,
-- gerekçesi "çoklu görsel ve çoklu bağlantı kazanım tablosuna sığmaz"dı. O
-- gerekçe artık geçerli değil: çoklu dosya `kazanim_ek` ile çözüldü
-- (5 Ağustos), çoklu bağlantı da aşağıda `kazanim_baglanti` ile çözülüyor.
-- Geriye ürüne özgü İKİ sütun kalıyor — beş boş sütun değil.
--
-- Ayrı tablo bugün zarar verirdi: istek ürünlerin diğer kayıtlarla BİRLİKTE
-- "Bilişim Yolculuğum" bölümünde görünmesini istiyor. Ayrı tablo, aynı bölümü
-- iki kaynaktan birleştirmek ve aynı formu ikinci kez yazmak demekti.

ALTER TYPE "KazanimTipi" ADD VALUE IF NOT EXISTS 'SERTIFIKA';
ALTER TYPE "KazanimTipi" ADD VALUE IF NOT EXISTS 'TOPLULUK';

-- ---------------------------------------------------------------------------
-- 2. Ürüne özgü alanlar
-- ---------------------------------------------------------------------------
-- İkisi de NULL kabul eder ve yalnızca tip=URUN kayıtlarında anlamlıdır; diğer
-- tiplerde uygulama katmanı bunları sessizce düşürür (bkz. kazanimKabulEdilirMi).
ALTER TABLE "kullanici_kazanim"
  ADD COLUMN IF NOT EXISTS "gelistiren_ekip" VARCHAR(250);

-- "Bu ürünü markette paylaş" onay kutusu. Varsayılan FALSE: paylaşım bir
-- TERCİHTİR ve varsayılan olarak açık gelmesi, kullanıcının istemeden vitrine
-- çıkması demek olurdu. GençTek Market (I maddesi) bu bayrağı okuyacak.
ALTER TABLE "kullanici_kazanim"
  ADD COLUMN IF NOT EXISTS "markette_paylasilsin" BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 3. Çoklu bağlantı
-- ---------------------------------------------------------------------------
-- Kazanım tablosunda tek bir `baglanti_url` vardı; ürün formu "Linkler" diyor
-- (çoğul): bir ürünün deposu, canlı adresi ve tanıtım videosu ayrı ayrı
-- olabilir. Tek alana virgülle sığdırmak, adresleri doğrulanamaz ve
-- tıklanamaz bir metne çevirirdi.
--
-- Mevcut `baglanti_url` KALDIRILMADI: dolu kayıtlar var ve diğer tipler onu
-- kullanmaya devam ediyor. Taşıma yapılmadı — geçmiş kayıtları yeni tabloya
-- kopyalamak, aynı adresin iki yerde yaşamasına ve birinden silinip öbüründe
-- kalmasına yol açardı.
CREATE TABLE IF NOT EXISTS "kazanim_baglanti" (
  "id"         SERIAL       PRIMARY KEY,
  "kazanim_id" INTEGER      NOT NULL,
  "adres"      VARCHAR(500) NOT NULL,
  -- Bağlantının ne olduğu ("kaynak kod", "canlı sürüm", "tanıtım videosu").
  "etiket"     VARCHAR(100),
  "sira_no"    INTEGER      NOT NULL DEFAULT 0,

  CONSTRAINT "kazanim_baglanti_kazanim_id_fkey"
    FOREIGN KEY ("kazanim_id") REFERENCES "kullanici_kazanim" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "ck_kazanim_baglanti_adres" CHECK (btrim("adres") <> '')
);

CREATE INDEX IF NOT EXISTS "kazanim_baglanti_kazanim_id_idx"
  ON "kazanim_baglanti" ("kazanim_id");
