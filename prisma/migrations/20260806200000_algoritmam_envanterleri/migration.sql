-- Algoritmam — öz değerlendirme envanterleri (E).
--
-- İSTEK:
--   "Yeni Bölüm: Algoritmam: Öğrencinin güçlü yönlerini, öğrenme stilini,
--    çalışma biçimini ve teknoloji alanındaki eğilimlerini keşfetmesini
--    sağlayan bir yapı (envanter) ile öğrenciler kendilerini
--    geliştirebilecekleri alanları keşfeder."
--   Sayılan envanterler: Teknoloji Liderliği Özyeterlilik Ölçeği · Dick
--   Kişilik Envanteri · İlgi Envanteri · Beceri Envanteri · Mesleki Yaklaşım
--   Envanteri · EPAI · entcom. "yapay zeka ile öz değerlendirme fırsatı
--   ileride yapılacak" → K bölümü.
--
-- ===========================================================================
-- ENVANTER TANIMLARI BU ŞEMADA YOKTUR — bilerek.
-- ===========================================================================
-- Madde metinleri, ölçek ve puanlama anahtarı KODDA duruyor
-- (`lib/envanter/tanimlar.ts`), tıpkı KAZANIM_TANIMLARI ve BELGE_TANIMLARI
-- gibi. Üç gerekçe:
--
--   1. SÜRÜM. Bir maddenin metni değişirse eski cevapların anlamı da değişir.
--      Kodda duran tanımın sürümü var (`surum` sütunu aşağıda); veritabanında
--      düzenlenen bir madde, geçmişte verilmiş cevapları sessizce yeniden
--      yorumlardı.
--   2. Envanter EDİTÖRÜ İSTENMEDİ. Tabloya alınsaydı ekleme/düzenleme/silme
--      ekranı, yetkisi ve logu da gerekirdi — istekte olmayan bir modül.
--   3. TELİF. Yayımlanmış ölçeklerin madde metinleri izne tabidir; kodda
--      durduklarında hangi metnin nereden geldiği tek dosyada görünür ve
--      veri dışa aktarımlarına/yedeklerine karışmaz.
--
-- Veritabanında yalnızca KİŞİYE AİT olan şey tutulur: uygulama ve cevaplar.

-- ---------------------------------------------------------------------------
-- 1. Uygulama durumu
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "EnvanterDurumu" AS ENUM ('SURUYOR', 'TAMAMLANDI');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Envanter uygulaması — "bu kişi bu envanteri şu tarihte çözdü"
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "envanter_uygulamasi" (
  "id"           SERIAL           PRIMARY KEY,
  "kullanici_id" INTEGER          NOT NULL,
  -- lib/envanter/tanimlar.ts içindeki kod. Yabancı anahtar YOK: karşılığı
  -- veritabanında değil kodda. Uygulama katmanı, tanımı olmayan bir koda
  -- kayıt açmaz (envanterTanimi).
  "envanter_kodu" VARCHAR(60)     NOT NULL,
  -- Cevapların hangi madde listesine göre verildiği. Tanım değişip sürüm
  -- artınca ESKİ uygulamalar PUANLANMAZ, "eski sürümle çözüldü" diye
  -- gösterilir: yeni anahtarla eski cevapları puanlamak sessizce yanlış bir
  -- sonuç üretirdi ve kişi bunu anlayamazdı.
  "surum"        INTEGER          NOT NULL,
  "durum"        "EnvanterDurumu" NOT NULL DEFAULT 'SURUYOR',

  "baslama_tarihi"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  -- Yalnızca durum=TAMAMLANDI iken doludur; `durum`dan türetilemez.
  "tamamlanma_tarihi" TIMESTAMPTZ(6),

  CONSTRAINT "envanter_uygulamasi_kullanici_id_fkey"
    FOREIGN KEY ("kullanici_id") REFERENCES "kullanici" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  -- Tamamlanmamış uygulamanın tamamlanma tarihi olamaz, tamamlananın olmalı.
  CONSTRAINT "ck_envanter_uygulamasi_tamamlanma" CHECK (
    ("durum" = 'TAMAMLANDI' AND "tamamlanma_tarihi" IS NOT NULL) OR
    ("durum" <> 'TAMAMLANDI' AND "tamamlanma_tarihi" IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS "envanter_uygulamasi_kullanici_idx"
  ON "envanter_uygulamasi" ("kullanici_id", "envanter_kodu");

-- YENİDEN ÇÖZMEK SERBEST, geçmiş korunur: aynı envanterin birden çok
-- TAMAMLANDI kaydı olabilir (kişi bir yıl sonra yeniden çözer ve değişimi
-- görür). Ama aynı anda İKİ YARIM uygulama olamaz — yarısı bir sekmede,
-- yarısı öbüründe dolan iki kayıt, hangisinin sürdüğü belirsiz bir ekran
-- üretirdi.
CREATE UNIQUE INDEX IF NOT EXISTS "envanter_uygulamasi_tek_suren"
  ON "envanter_uygulamasi" ("kullanici_id", "envanter_kodu")
  WHERE "durum" = 'SURUYOR';

-- ---------------------------------------------------------------------------
-- 3. Cevaplar
-- ---------------------------------------------------------------------------
-- Cevaplar JSON değil SATIR olarak tutuluyor: puanlama madde madde çalışıyor
-- (ters puanlanan maddeler var) ve eksik/fazla madde JSON'da sessizce geçer,
-- satırda benzersizlik kısıtına takılır.
CREATE TABLE IF NOT EXISTS "envanter_cevabi" (
  "id"          SERIAL     PRIMARY KEY,
  "uygulama_id" INTEGER    NOT NULL,
  -- Tanımdaki madde kodu (örn. "ILGI_YAZILIM_1").
  "madde_kodu"  VARCHAR(80) NOT NULL,
  -- Likert derecesi. Aralık 1–5 olarak SABİT kısıtlanmadı: tanım dosyası
  -- ölçek uzunluğunu envanter başına taşıyor (bir ölçek 4'lü, öbürü 5'li
  -- olabilir) ve asıl doğrulama uygulama katmanında, tanıma bakarak yapılıyor.
  -- Buradaki kısıt yalnızca akla yatkın bir üst sınır — bozuk yazmayı keser.
  "deger"       SMALLINT   NOT NULL,

  CONSTRAINT "envanter_cevabi_uygulama_id_fkey"
    FOREIGN KEY ("uygulama_id") REFERENCES "envanter_uygulamasi" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "ck_envanter_cevabi_deger" CHECK ("deger" BETWEEN 1 AND 9),

  -- Bir maddeye bir cevap. Kişi fikrini değiştirirse satır GÜNCELLENİR.
  CONSTRAINT "envanter_cevabi_tekil" UNIQUE ("uygulama_id", "madde_kodu")
);

CREATE INDEX IF NOT EXISTS "envanter_cevabi_uygulama_idx"
  ON "envanter_cevabi" ("uygulama_id");

-- ---------------------------------------------------------------------------
-- 4. SONUÇ PUANLARI SAKLANMIYOR
-- ---------------------------------------------------------------------------
-- Boyut puanları cevaplardan HESAPLANIYOR (`lib/envanter/kurallar.ts`), tabloya
-- yazılmıyor — nişanlarda (lib/kazanim/rozetler.ts) verilen kararın aynısı.
-- Saklansaydı iki doğruluk kaynağı olurdu ve puanlama anahtarındaki bir
-- düzeltme geçmiş kayıtlara yansımazdı.
--
-- GÖRÜNÜRLÜK: sonuçlar YALNIZCA kişinin kendisine açıktır. Danışman, il
-- koordinatörü ve proje yöneticisi GÖREMEZ; şemada bunu sağlayan bir alan
-- yok, kural sorgu katmanında (`kullanici_id` = oturumdaki kişi). Kişilik ve
-- mesleki eğilim sonucu hassas veridir ve kullanıcıların çoğu 18 yaş altıdır;
-- dar taraftan başlandı — açmak kolay, geri almak değil. Bu bir VARSAYIMDIR
-- (→ SORULAR.md · S16), cevap gelirse burası ve `lib/yetki` birlikte değişir.
