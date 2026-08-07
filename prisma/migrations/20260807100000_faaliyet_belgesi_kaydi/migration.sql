-- Üretilen katılım/teşekkür belgesinin kaydı (7 Ağustos 2026).
--
-- İSTEK:
--   "Düzenlenen GençTek Etkinliği sonunda ismine belge oluşturulan
--    öğrencilerin profiline katıldığı etkinlik düşecek"
--
-- ===========================================================================
-- NEDEN YENİ BİR TABLO GEREKTİ
-- ===========================================================================
-- Belge bugüne kadar HİÇBİR YERDE kalıcı olarak kaydedilmiyordu. Tasarım
-- bilinçliydi (bkz. lib/belge/kurallar.ts): belge metni her istekte faaliyet
-- kayıtlarından üretiliyor, çünkü metin saklansaydı faaliyetin adı
-- düzeltildiğinde basılmış belgeler eski adı göstermeye devam ederdi. Üretimin
-- izi yalnızca erişim kaydının SERBEST METNİNDE duruyordu:
--
--     detay = "Katılım Belgesi üretildi: Ayşe Yılmaz"
--
-- Bu iz iki nedenle kullanılamaz:
--   1. Erişim kayıtları KVKK saklama süresiyle SİLİNİYOR
--      (scripts/veri-saklama.ts, aylık cron). Katılım geçmişi bakım işi
--      çalıştığında sessizce boşalırdı.
--   2. Ad serbest metin; iki aynı adlı öğrenciyi ayıramaz.
--
-- Bu tablo belgenin METNİNİ değil ÜRETİLDİĞİ OLGUSUNU tutar. Metin üretimi
-- eskisi gibi çalışmaya devam ediyor; şema değişmedi, yalnızca yanına bir
-- olay kaydı eklendi.

-- ---------------------------------------------------------------------------
-- 1. Belge türü
-- ---------------------------------------------------------------------------
-- lib/belge/kurallar.ts içindeki BELGE_TURLERI ile aynı değerleri taşır.
-- İkisi ayrışırsa kaydedilemeyen bir belge türü doğar.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FaaliyetBelgeTuru') THEN
    CREATE TYPE "FaaliyetBelgeTuru" AS ENUM ('KATILIM', 'TESEKKUR');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Kayıt tablosu
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "faaliyet_belgesi" (
  "id"                  SERIAL PRIMARY KEY,
  "faaliyet_id"         INTEGER NOT NULL,
  "katilimci_id"        INTEGER NOT NULL,
  "tur"                 "FaaliyetBelgeTuru" NOT NULL,
  "uretim_tarihi"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "ureten_kullanici_id" INTEGER NOT NULL,

  CONSTRAINT "faaliyet_belgesi_faaliyet_id_fkey"
    FOREIGN KEY ("faaliyet_id") REFERENCES "faaliyet" ("id") ON DELETE CASCADE,
  CONSTRAINT "faaliyet_belgesi_katilimci_id_fkey"
    FOREIGN KEY ("katilimci_id") REFERENCES "kullanici" ("id"),
  CONSTRAINT "faaliyet_belgesi_ureten_kullanici_id_fkey"
    FOREIGN KEY ("ureten_kullanici_id") REFERENCES "kullanici" ("id")
);

-- ---------------------------------------------------------------------------
-- 3. Aynı belge iki kez kaydedilmez
-- ---------------------------------------------------------------------------
-- Kayıt "kaç kez basıldı" değil "üretildi mi" sorusunu cevaplıyor. Kısıt
-- veritabanında duruyor, uygulamada değil: belge sayfası bir GET isteğiyle
-- açılıyor ve kullanıcı sayfayı yenilediğinde/yazıcı sıkıştığında aynı istek
-- tekrar geliyor. Uygulama katmanında "önce bak, sonra yaz" yapılsaydı iki
-- sekmeden aynı anda açılan belge iki satır üretebilirdi — ve öğrencinin
-- profiline aynı etkinlik iki kez düşerdi.
CREATE UNIQUE INDEX IF NOT EXISTS "faaliyet_belgesi_faaliyet_id_katilimci_id_tur_key"
  ON "faaliyet_belgesi" ("faaliyet_id", "katilimci_id", "tur");

-- Profil ekranı "bu kişinin belgeleri" diye sorguluyor; katılımcı üzerinden
-- dizinlenmezse her profil açılışı tablo taraması olurdu.
CREATE INDEX IF NOT EXISTS "faaliyet_belgesi_katilimci_id_idx"
  ON "faaliyet_belgesi" ("katilimci_id");

-- ---------------------------------------------------------------------------
-- 4. GERİYE DÖNÜK DOLDURMA YAPILMADI — bilinçli
-- ---------------------------------------------------------------------------
-- Bu tarihten önce üretilmiş belgelerin kaydı yok ve üretilemez: erişim
-- kaydındaki serbest metinden ad eşleştirmek, aynı adlı öğrencilere yanlış
-- katılım düşürürdü.
--
-- Kayıp yok. Profildeki katılım listesi İKİ kaynaktan besleniyor
-- (bkz. lib/kazanim/getir.ts):
--
--   · bu tarihten ÖNCEKİ etkinlikler → eski kural (başvurusu SEÇİLDİ)
--   · bu tarihten SONRAKİ etkinlikler → belge üretimi
--
-- Böylece kimsenin bugüne kadarki geçmişi kaybolmuyor ve rozet/sefer
-- hesapları bozulmuyor. Geçiş tarihi kodda tek bir sabittir
-- (BELGE_TEMELLI_KATILIM_BASLANGICI); değiştirilirse iki kaynağın sınırı
-- birlikte kayar.
