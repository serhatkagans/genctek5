-- Onay belgeleri: KVKK açık rıza, taahhütname ve gizlilik sözleşmesi.
--
-- ÖNCEKİ DURUM: iki onay vardı ve ikisi de profil tablosunda bir SÜTUNDU —
-- ogrenci_profil.aydinlatma_metni_onay_tarihi (öğrenci) ve
-- ogretmen_profil.taahhut_onay_tarihi (il koordinatörü). Belge sayısı ikiden
-- dörde çıkınca sütun başına bir onay tutmak sürdürülemedi; ayrıca YEĞİTEK
-- personelinin ne öğrenci ne öğretmen profili açılıyor (bkz. lib/kullanici/
-- sagla.ts), oysa açık rıza ondan da isteniyor — sütun modelinde personelin
-- onayını yazacak yer YOKTU.
--
-- YENİ DURUM: kullanici_onayi tablosu, kullanıcı + belge başına tek satır.
-- Onay bir DURUMDUR, geçmiş tutulmaz: yeniden onay tarihi günceller. Onayın
-- kendisi ayrıca erisim_logu'na yazılır, denetim izi orada.
--
-- Hangi belgenin kimden isteneceği KODDA (lib/kvkk/kurallar.ts ·
-- BELGE_TANIMLARI); veritabanı bu eşlemeyi bilmez, çünkü rol eşlemesi bir iş
-- kuralıdır ve rol tanımları değiştikçe migration yazmak gerekmemeli.

-- ---------------------------------------------------------------------------
-- 1. Belge türü
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OnayBelgesi') THEN
    CREATE TYPE "OnayBelgesi" AS ENUM (
      'AYDINLATMA',
      'ACIK_RIZA',
      'TAAHHUTNAME',
      'GIZLILIK_SOZLESMESI'
    );
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Onay tablosu
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "kullanici_onayi" (
  "kullanici_id" INTEGER NOT NULL,
  "belge"        "OnayBelgesi" NOT NULL,
  "onay_tarihi"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "kullanici_onayi_pkey" PRIMARY KEY ("kullanici_id", "belge"),
  CONSTRAINT "kullanici_onayi_kullanici_id_fkey"
    FOREIGN KEY ("kullanici_id") REFERENCES "kullanici"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------------
-- 3. Mevcut onayların taşınması
-- ---------------------------------------------------------------------------
-- Öğrencinin aydınlatma onayı olduğu gibi taşınır.
INSERT INTO "kullanici_onayi" ("kullanici_id", "belge", "onay_tarihi")
SELECT "kullanici_id", 'AYDINLATMA', "aydinlatma_metni_onay_tarihi"
FROM "ogrenci_profil"
WHERE "aydinlatma_metni_onay_tarihi" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Koordinatörün eski "gizlilik taahhütnamesi" onayı GIZLILIK_SOZLESMESI'ne
-- taşınır, TAAHHUTNAME'ye değil: eski metnin içeriği baştan sona veri gizliliği
-- yükümlülüğüydü (eriştiğim veriyi paylaşmam, dışa aktardığımı silerim, görev
-- bitince imha ederim). Yeni taahhütname ise görevin nasıl yürütüleceğini
-- anlatan AYRI bir metindir; kimse onu okumadığı için onaylamış sayılamaz.
-- Sonuç: mevcut koordinatörlerden taahhütname yeniden istenecek, gizlilik
-- sözleşmesi istenmeyecek.
INSERT INTO "kullanici_onayi" ("kullanici_id", "belge", "onay_tarihi")
SELECT "kullanici_id", 'GIZLILIK_SOZLESMESI', "taahhut_onay_tarihi"
FROM "ogretmen_profil"
WHERE "taahhut_onay_tarihi" IS NOT NULL
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Eski sütunların kaldırılması
-- ---------------------------------------------------------------------------
-- Taşıma yukarıda yapıldığı için veri kaybı yok. Sütunlar BIRAKILSAYDI iki ayrı
-- doğruluk kaynağı olurdu ve bir sonraki geliştirici hangisini okuyacağını
-- bilemezdi — sessiz sapmanın en sık sebebi budur.
ALTER TABLE "ogrenci_profil" DROP COLUMN IF EXISTS "aydinlatma_metni_onay_tarihi";
ALTER TABLE "ogretmen_profil" DROP COLUMN IF EXISTS "taahhut_onay_tarihi";

-- ---------------------------------------------------------------------------
-- 5. Sistem ayarı anahtarının yeniden adlandırılması
-- ---------------------------------------------------------------------------
-- KOORDINATOR_TAAHHUT_METNI artık gizlilik sözleşmesinin metnidir (3. adımdaki
-- gerekçe). Yönetici metni elle düzenlemişse o düzenleme korunur.
UPDATE "sistem_ayari"
SET "anahtar" = 'GIZLILIK_SOZLESMESI_METNI'
WHERE "anahtar" = 'KOORDINATOR_TAAHHUT_METNI'
  AND NOT EXISTS (
    SELECT 1 FROM "sistem_ayari" WHERE "anahtar" = 'GIZLILIK_SOZLESMESI_METNI'
  );
