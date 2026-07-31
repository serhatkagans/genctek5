-- Biten faaliyetin raporu ve koordinatör gizlilik taahhüdü.

-- ---------------------------------------------------------------------------
-- 1. Faaliyet raporu
-- ---------------------------------------------------------------------------
-- Faaliyet BAŞINA TEK rapor: id yerine faaliyet_id birincil anahtar. Ayrı bir
-- id + unique index de aynı işi görürdü ama "bir faaliyetin bir raporu vardır"
-- ilişkisi şemadan doğrudan okunsun istiyoruz.
--
-- SAYILAR BURADA TUTULMAZ. Kaç kişi katıldığı başvuru kayıtlarından her
-- görüntülemede hesaplanır; rapora kopyalansaydı bir başvuru sonradan
-- güncellendiğinde rapor sessizce yanlış olurdu. Raporun taşıdığı tek şey
-- İNSANIN YAZDIĞI değerlendirmedir.
CREATE TABLE IF NOT EXISTS "faaliyet_raporu" (
    "faaliyet_id"        INTEGER NOT NULL,
    "degerlendirme"      TEXT NOT NULL,
    -- Hedeflenen kazanimlar gerceklesti mi, aksayan ne oldu.
    "kazanimlar"         TEXT,
    "yazan_kullanici_id" INTEGER NOT NULL,
    "olusturma_tarihi"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme_tarihi"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faaliyet_raporu_pkey" PRIMARY KEY ("faaliyet_id")
);

ALTER TABLE "faaliyet_raporu" DROP CONSTRAINT IF EXISTS "faaliyet_raporu_faaliyet_id_fkey";
ALTER TABLE "faaliyet_raporu" ADD CONSTRAINT "faaliyet_raporu_faaliyet_id_fkey"
  FOREIGN KEY ("faaliyet_id") REFERENCES "faaliyet"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "faaliyet_raporu" DROP CONSTRAINT IF EXISTS "faaliyet_raporu_yazan_kullanici_id_fkey";
ALTER TABLE "faaliyet_raporu" ADD CONSTRAINT "faaliyet_raporu_yazan_kullanici_id_fkey"
  FOREIGN KEY ("yazan_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "faaliyet_raporu_yazan_kullanici_id_idx"
  ON "faaliyet_raporu"("yazan_kullanici_id");

-- Boş değerlendirme rapor sayılmaz: başlığı olup içi olmayan bir kayıt,
-- "rapor yazıldı" göstergesini yalancı çıkarır.
ALTER TABLE "faaliyet_raporu" DROP CONSTRAINT IF EXISTS "ck_faaliyet_raporu_degerlendirme_dolu";
ALTER TABLE "faaliyet_raporu" ADD CONSTRAINT "ck_faaliyet_raporu_degerlendirme_dolu"
  CHECK (LENGTH(TRIM("degerlendirme")) > 0);

-- ---------------------------------------------------------------------------
-- 2. Koordinatör gizlilik taahhüdü
-- ---------------------------------------------------------------------------
-- İl koordinatörü ilindeki ÖĞRETMENLERİN kişisel verilerini (iletişim bilgisi,
-- görev geçmişi) görebiliyor. Öğrenci tarafında aydınlatma metni onayı vardı;
-- öğretmen tarafında karşılığı yoktu.
--
-- Onay tarihi ogretmen_profil'de tutuluyor çünkü koordinatör de bir
-- öğretmendir ve profili orada. Metnin kendisi sistem_ayari'nda; öğrenci
-- aydınlatma metniyle aynı desen — metin güncellenince onay tazeliğini yitirir.
ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "taahhut_onay_tarihi" TIMESTAMPTZ(6);
