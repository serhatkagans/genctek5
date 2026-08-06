-- EBA dışı giriş — numaralandırma değişiklikleri.
--
-- NEDEN AYRI MIGRATION: PostgreSQL'de `ALTER TYPE ... ADD VALUE` ile eklenen
-- bir enum değeri AYNI transaction içinde kullanılamaz ("unsafe use of new
-- value"). Prisma her migration dosyasını tek transaction'da çalıştırdığı için
-- yeni değerlere dokunan tablo ve kısıtlar bir sonraki dosyadadır
-- (20260805150100_dis_kullanici_girisi). Aynı ayrım 20260729090000'da da
-- yapılmıştı.

-- ---------------------------------------------------------------------------
-- 1. İki yeni rol
-- ---------------------------------------------------------------------------
-- MEZUN ve PAYDAS_TEMSILCISI, mevcut dört rolden iki bakımdan ayrılır:
-- kurum kodları YOKTUR ve kimlikleri AuthProvider'dan gelmez. Kapsam
-- filtreleri il/kurum ekseninde çalıştığı için bu iki rol her filtrede AÇIKÇA
-- ele alınmak zorundadır; varsayılanları "hiçbir şey görmez"dir
-- (bkz. lib/yetki/kapsam.ts).
--
-- PostgreSQL enum değeri DÜŞÜRMEZ: buraya eklenen değer geri alınamaz. Bu
-- yüzden liste iki değerle sınırlı tutuldu.
ALTER TYPE "RolKodu" ADD VALUE IF NOT EXISTS 'MEZUN';
ALTER TYPE "RolKodu" ADD VALUE IF NOT EXISTS 'PAYDAS_TEMSILCISI';

-- ---------------------------------------------------------------------------
-- 2. Başvuru işlemlerinin denetim izi
-- ---------------------------------------------------------------------------
-- Başvurunun kendisi, onayı ve reddi erisim_logu'na yazılır. Hedef tipi
-- "OGRENCI/OGRETMEN" olamaz: karar anında ortada henüz bir kullanıcı yoktur,
-- hedef başvurunun kendisidir.
ALTER TYPE "LogHedefTip" ADD VALUE IF NOT EXISTS 'DIS_BASVURU';

-- ---------------------------------------------------------------------------
-- 3. Başvuru türü
-- ---------------------------------------------------------------------------
-- RolKodu ile birebir eşleşir (MEZUN → MEZUN, PAYDAS → PAYDAS_TEMSILCISI) ama
-- ayrı tutulur: başvuru henüz bir rol DEĞİLDİR, rol yalnızca onayla doğar.
-- Aynı enum kullanılsaydı onaysız bir başvuru satırı rol adı taşırdı.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisKullaniciTuru') THEN
    CREATE TYPE "DisKullaniciTuru" AS ENUM ('MEZUN', 'PAYDAS');
  END IF;
END
$$;
