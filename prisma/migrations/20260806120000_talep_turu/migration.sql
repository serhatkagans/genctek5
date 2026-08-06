-- Panoya (eski adıyla Talep Panosu) talep türü.
--
-- İSTEK: "Talepler: Ekip arkadaşı, teknik destek, sponsor, duyuru
-- (tanıtım/yaygınlaştırma)".
--
-- Bugüne kadar pano serbest metinli ilan + çalışma grubu filtresinden ibaretti;
-- "ne aradığı" yalnızca başlıktan okunabiliyordu ve bu yüzden filtrelenemiyordu.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TalepTuru') THEN
    CREATE TYPE "TalepTuru" AS ENUM (
      'EKIP_ARKADASI',
      'TEKNIK_DESTEK',
      'SPONSOR',
      'DUYURU'
    );
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Sütun NULL KABUL EDER ve geriye dönük DOLDURULMAZ
-- ---------------------------------------------------------------------------
-- Mevcut ilanların türü bilinmiyor. Varsayılan atamak (ör. hepsini 'DUYURU'
-- saymak) veriyi uydurmak olurdu: panoda "duyuru" diye filtrelenen liste,
-- aslında ekip arkadaşı arayan eski ilanlarla dolardı ve bu yanlışlık hiçbir
-- yerde hata vermeden raporlara geçerdi.
--
-- Zorunluluk UYGULAMA KATMANINDA ve yalnızca YENİ ilanlarda (bkz.
-- lib/iletisim/kurallar.ts · talebiCoz). Aynı karar 5 Ağustos'ta kazanım
-- kayıtlarının katılım biçimi için de verilmişti; desen bilinçli olarak aynı.
ALTER TABLE "talep" ADD COLUMN IF NOT EXISTS "tur" "TalepTuru";

-- Panoda tür filtresi, aktiflik koşuluyla birlikte kullanılıyor.
CREATE INDEX IF NOT EXISTS "talep_tur_idx" ON "talep" ("tur");
