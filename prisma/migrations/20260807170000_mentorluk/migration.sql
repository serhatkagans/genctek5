-- Mentörlük (7 Ağustos 2026).
--
-- İSTEK, iki parçadan geldi:
--   · "Öğretmen hesabında 'mentör başvurusu yap' bölümü ekleyelim. hangi
--      çalışma grubunda mentörlük yapabilir seçsin. hatta mümkünse diğer
--      mentörlük konuları ekleyebilsin? yani öğretmen mentör olabilsin"
--   · "Paydaş/Mentör başvurusu tek bir formdan yapılacak."
--
-- ===========================================================================
-- TEK TABLO, İKİ GİRİŞ YOLU
-- ===========================================================================
-- Mentörlük kimde olursa olsun aynı şeydir: çalışma grupları + serbest
-- konular + onay durumu. İki ayrı yerde tutulsaydı ("öğretmen profilinde bir
-- bayrak" + "dış başvuruda bir alan") panodaki mentör süzgeci iki kaynağı
-- birleştirmek zorunda kalır ve "kimler mentör" sorusunun iki ayrı cevabı
-- olurdu.
--
--   ÖĞRETMEN   → Panel'den başvurur; kayıt BEKLIYOR doğar, il koordinatörü
--                ya da proje yöneticisi onaylar.
--   DIŞARIDAN  → başvuru formundan ister; kayıt, proje yöneticisi dış
--                başvuruyu onayladığı anda ONAYLANDI doğar. Aynı kararı iki
--                kez sormanın anlamı yok.

-- ---------------------------------------------------------------------------
-- 1. Durum
-- ---------------------------------------------------------------------------
-- `OnayDurumu` PAYLAŞILMADI: orada `ONAY_GEREKMEZ` var ve mentörlükte böyle
-- bir hâl yok — her mentörlük onaydan geçer. Paylaşılan enum, hiç
-- kullanılmayacak bir değeri her switch'te ele almayı zorunlu kılardı.
--
-- BIRAKILDI, REDDEDILDI'den ayrı: ret bir karardır, bırakma bir vazgeçmedir.
-- Tek değerde toplansalardı kendi isteğiyle ayrılan mentör, geçmişe dönük
-- "reddedilmiş" görünürdü.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MentorlukDurumu') THEN
    CREATE TYPE "MentorlukDurumu" AS ENUM
      ('BEKLIYOR', 'ONAYLANDI', 'REDDEDILDI', 'BIRAKILDI');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Mentörlük kaydı
-- ---------------------------------------------------------------------------
-- KİŞİ BAŞINA TEK SATIR (kullanici_id birincil anahtar). Mentörlük bir
-- DURUMDUR, geçmiş tablosu değil: bırakılan mentörlük BIRAKILDI olur ve
-- yeniden başvuruda aynı satır BEKLIYOR'a döner. Her başvuru yeni satır
-- açsaydı "şu an mentör mü" sorusu her seferinde tarih sıralaması
-- gerektirirdi ve pano süzgeci yanlış cevap verebilirdi.
CREATE TABLE IF NOT EXISTS "mentorluk" (
  "kullanici_id"             INTEGER PRIMARY KEY,
  "durum"                    "MentorlukDurumu" NOT NULL DEFAULT 'BEKLIYOR',
  "konular"                  TEXT,
  "basvuru_tarihi"           TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "karar_veren_kullanici_id" INTEGER,
  "karar_tarihi"             TIMESTAMPTZ(6),
  "ret_gerekcesi"            TEXT,

  CONSTRAINT "mentorluk_kullanici_id_fkey"
    FOREIGN KEY ("kullanici_id") REFERENCES "kullanici" ("id") ON DELETE CASCADE,
  CONSTRAINT "mentorluk_karar_veren_kullanici_id_fkey"
    FOREIGN KEY ("karar_veren_kullanici_id") REFERENCES "kullanici" ("id")
);

-- Pano süzgeci "onaylanmış mentörler" diye sorguluyor; durum üzerinden dizin
-- olmadan her sorgu tablo taraması olurdu.
CREATE INDEX IF NOT EXISTS "mentorluk_durum_idx" ON "mentorluk" ("durum");

-- Reddedilen kayıtta gerekçe ZORUNLU. Kısıt veritabanında duruyor çünkü karar
-- iki ayrı ekrandan verilebiliyor (mentör onay kuyruğu ve dış başvuru
-- kuyruğu); uygulama katmanındaki kontrol birinde unutulabilir.
ALTER TABLE "mentorluk" DROP CONSTRAINT IF EXISTS "ck_mentorluk_ret_gerekcesi";
ALTER TABLE "mentorluk"
  ADD CONSTRAINT "ck_mentorluk_ret_gerekcesi"
  CHECK (
    "durum" <> 'REDDEDILDI'
    OR ("ret_gerekcesi" IS NOT NULL AND "ret_gerekcesi" ~ '[^[:space:]]')
  );

-- Karara bağlanmış kayıtta karar veren ve tarih birlikte dolu olmalı; biri
-- eksikse "kim onayladı" sorusu cevapsız kalır.
ALTER TABLE "mentorluk" DROP CONSTRAINT IF EXISTS "ck_mentorluk_karar_butunlugu";
ALTER TABLE "mentorluk"
  ADD CONSTRAINT "ck_mentorluk_karar_butunlugu"
  CHECK (
    "durum" = 'BEKLIYOR'
    OR ("karar_veren_kullanici_id" IS NOT NULL AND "karar_tarihi" IS NOT NULL)
    OR "durum" = 'BIRAKILDI'
  );

-- ---------------------------------------------------------------------------
-- 3. Mentörün çalışma grupları
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "mentorluk_calisma_grubu" (
  "mentorluk_kullanici_id" INTEGER NOT NULL,
  "calisma_grubu_id"       INTEGER NOT NULL,

  PRIMARY KEY ("mentorluk_kullanici_id", "calisma_grubu_id"),
  CONSTRAINT "mentorluk_calisma_grubu_mentorluk_fkey"
    FOREIGN KEY ("mentorluk_kullanici_id") REFERENCES "mentorluk" ("kullanici_id")
    ON DELETE CASCADE,
  CONSTRAINT "mentorluk_calisma_grubu_grup_fkey"
    FOREIGN KEY ("calisma_grubu_id") REFERENCES "calisma_grubu" ("id")
);

-- Panoda "şu gruptaki mentörler" diye sorgulanıyor.
CREATE INDEX IF NOT EXISTS "mentorluk_calisma_grubu_grup_idx"
  ON "mentorluk_calisma_grubu" ("calisma_grubu_id");

-- ---------------------------------------------------------------------------
-- 4. Dış başvuru: tek form, mentörlük işareti
-- ---------------------------------------------------------------------------
-- "Paydaş/Mentör başvurusu tek bir formdan yapılacak" + "mezunlar da
-- paydaştan girsin": başvuru formu tek kaldı, içinde "kim olarak" seçimi var.
--
-- MEZUN TÜRÜ KORUNDU. Kaldırılsaydı mevcut mezun kayıtlarının mezuniyet yılı
-- ve okul bağı anlamsızlaşır, A1'in "mezun bağını sürdürsün" gerekçesi
-- zayıflardı. Değişen şey GİRİŞ KAPISI: üçü de aynı formdan ve aynı
-- düğmeden ("E-Devlet ile Giriş") geliyor.
ALTER TYPE "DisKullaniciTuru" ADD VALUE IF NOT EXISTS 'MENTOR';

ALTER TABLE "dis_kullanici_basvurusu"
  ADD COLUMN IF NOT EXISTS "mentorluk_istiyor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dis_kullanici_basvurusu"
  ADD COLUMN IF NOT EXISTS "mentorluk_konulari" TEXT;

-- GRUP KİMLİKLERİ DİZİ OLARAK, junction tablo AÇILMADAN.
-- Değerler yalnızca karar anına kadar yaşıyor; onayla birlikte
-- `mentorluk_calisma_grubu`na taşınıyor. Bekleyen bir başvuru için ayrı tablo,
-- onay sonrası boşalan ve kimsenin sorgulamadığı satırlar bırakırdı. Kimlikler
-- onay anında yeniden doğrulanır (silinmiş ya da pasife alınmış grup elenir),
-- bu yüzden yabancı anahtar kısıtı da gerekmiyor.
ALTER TABLE "dis_kullanici_basvurusu"
  ADD COLUMN IF NOT EXISTS "mentorluk_grup_idleri" INTEGER[] NOT NULL DEFAULT '{}';
