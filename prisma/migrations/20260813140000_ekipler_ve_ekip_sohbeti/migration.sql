-- Ekipler ve ekip sohbeti (13 Ağustos 2026).
--
-- İSTEK:
--   "il koordinatörü ekipler kurabilsin, ekip ismini kendileri girsin,
--    ekiplere katılanlarla mesajlaşma sohbet yapabilsin, bunu da yönetim
--    paneline kart olarak ekleyelim, ismi ekiplerim olsun"
--
-- ===========================================================================
-- ÇALIŞMA GRUBUNDAN AYRI TABLO
-- ===========================================================================
-- calisma_grubu MERKEZİN tanımladığı sabit listedir (Yapay Zekâ, Robotik…),
-- ülke genelinde aynıdır ve öğrenci ona kendisi katılır. Ekip ise ilin kendi
-- kurduğu, adını kendi koyduğu, üyesini tek tek seçtiği topluluktur.
--
-- Tek tabloya konsalardı "ilimdeki ekip" ile "ülke genelindeki çalışma alanı"
-- aynı süzgece düşer, öğrencinin katılabildiği liste ilden ile değişir ve
-- faaliyet/mentörlük ekranlarındaki grup seçimleri il ekipleriyle kirlenirdi.
--
-- ===========================================================================
-- GİZLİ KANAL YOK
-- ===========================================================================
-- Ekip sohbeti, yazışma modülüyle aynı ilkeye tabidir: ekibi kuran koordinatör
-- ve proje yöneticisi mesajları okur. Kullanıcıların çoğu 18 yaş altı;
-- okunmayan bir kanal vaadi verilmiyor çünkü tutulamazdı.
--
-- SİLME YOK, GİZLEME VAR (mesaj/gonderi ile aynı gerekçe).

-- --------------------------------------------------------------------------
-- 1. Ekip
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ekip" (
  "id"                 SERIAL         PRIMARY KEY,
  "ad"                 VARCHAR(150)   NOT NULL,
  "aciklama"           TEXT,
  "il_kodu"            VARCHAR(2)     NOT NULL,
  "kuran_kullanici_id" INTEGER        NOT NULL,
  "aktif"              BOOLEAN        NOT NULL DEFAULT true,
  "olusturma_tarihi"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ekip_il_kodu_aktif_idx" ON "ekip" ("il_kodu", "aktif");
CREATE INDEX IF NOT EXISTS "ekip_kuran_kullanici_id_idx" ON "ekip" ("kuran_kullanici_id");

-- AYNI İLDE AYNI ADLA İKİ AKTİF EKİP OLMAZ. Ad ülke genelinde tekil DEĞİL:
-- iki ilin "Robotik Ekibi" adında ekibi olması sorun değil, aynı ilde iki
-- tanesi olması karışıklıktır (üye hangisine yazdığını bilemez).
CREATE UNIQUE INDEX IF NOT EXISTS "ux_ekip_il_ad_aktif"
  ON "ekip" ("il_kodu", "ad") WHERE "aktif";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ekip_il_fkey') THEN
    ALTER TABLE "ekip" ADD CONSTRAINT "ekip_il_fkey"
      FOREIGN KEY ("il_kodu") REFERENCES "il"("il_kodu")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ekip_kuran_fkey') THEN
    ALTER TABLE "ekip" ADD CONSTRAINT "ekip_kuran_fkey"
      FOREIGN KEY ("kuran_kullanici_id") REFERENCES "kullanici"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- 2. Ekip üyesi
-- --------------------------------------------------------------------------
-- Bileşik birincil anahtar aynı zamanda tekilliği kurar: bir kişi bir ekibe
-- iki kez eklenemez. Çıkarılan üyenin satırı SİLİNİR — üyelik bir görev değil
-- bir katılımdır ve geçmişi raporlanmıyor; yazdığı mesajlar ise kalır.
CREATE TABLE IF NOT EXISTS "ekip_uyesi" (
  "ekip_id"        INTEGER        NOT NULL,
  "kullanici_id"   INTEGER        NOT NULL,
  "eklenme_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ekip_uyesi_pkey" PRIMARY KEY ("ekip_id", "kullanici_id")
);

CREATE INDEX IF NOT EXISTS "ekip_uyesi_kullanici_id_idx"
  ON "ekip_uyesi" ("kullanici_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ekip_uyesi_ekip_fkey') THEN
    ALTER TABLE "ekip_uyesi" ADD CONSTRAINT "ekip_uyesi_ekip_fkey"
      FOREIGN KEY ("ekip_id") REFERENCES "ekip"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ekip_uyesi_kullanici_fkey') THEN
    ALTER TABLE "ekip_uyesi" ADD CONSTRAINT "ekip_uyesi_kullanici_fkey"
      FOREIGN KEY ("kullanici_id") REFERENCES "kullanici"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- 3. Ekip mesajı
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ekip_mesaji" (
  "id"                    SERIAL         PRIMARY KEY,
  "ekip_id"               INTEGER        NOT NULL,
  "yazan_kullanici_id"    INTEGER        NOT NULL,
  "icerik"                TEXT           NOT NULL,
  "olusturma_tarihi"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "gizlendi_mi"           BOOLEAN        NOT NULL DEFAULT false,
  "gizleyen_kullanici_id" INTEGER,
  "gizlenme_tarihi"       TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS "ekip_mesaji_ekip_id_olusturma_tarihi_idx"
  ON "ekip_mesaji" ("ekip_id", "olusturma_tarihi");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ekip_mesaji_ekip_fkey') THEN
    ALTER TABLE "ekip_mesaji" ADD CONSTRAINT "ekip_mesaji_ekip_fkey"
      FOREIGN KEY ("ekip_id") REFERENCES "ekip"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ekip_mesaji_yazan_fkey') THEN
    ALTER TABLE "ekip_mesaji" ADD CONSTRAINT "ekip_mesaji_yazan_fkey"
      FOREIGN KEY ("yazan_kullanici_id") REFERENCES "kullanici"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ekip_mesaji_gizleyen_fkey') THEN
    ALTER TABLE "ekip_mesaji" ADD CONSTRAINT "ekip_mesaji_gizleyen_fkey"
      FOREIGN KEY ("gizleyen_kullanici_id") REFERENCES "kullanici"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- 4. Bildirim şablonu
-- --------------------------------------------------------------------------
-- Ekibe eklenen kişi bunu ÖĞRENMELİ: ekip onun kurmadığı, kendiliğinden
-- uğramayacağı bir ekran ve haberi olmadan üyesi olduğu bir sohbete yazılan
-- mesajlar okunmadan kalırdı.
INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'EKIBE_EKLENDINIZ',
  '{{ekipAdi}} ekibine eklendiniz',
  'Merhaba,' || chr(10) || chr(10) ||
  '{{ekleyenAdSoyad}} sizi "{{ekipAdi}}" ekibine ekledi. Ekip sohbetine Panel''deki Ekiplerim kartından ulaşabilirsiniz.' || chr(10) || chr(10) ||
  'Ekip sohbeti gizli değildir: ekibi kuran il koordinatörü ve proje yöneticisi mesajları okuyabilir.' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;
