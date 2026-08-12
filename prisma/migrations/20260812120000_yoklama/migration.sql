-- Etkinlik sonrası yoklama (12 Ağustos 2026).
--
-- İSTEK:
--   "Öğrenci bir etkinlik için başvuru yaptı, etkinliği oluşturan kişi
--    onayladı, ancak etkinlik anında öğrenci etkinliğe gelmedi. GençTek
--    Yolculuğum kısmında etkinliğe katıldı görünüyor otomatik olarak, ama
--    gerçekte katılmadı; bunun kontrolünü nasıl sağlarız."
--
-- ===========================================================================
-- NEDEN YENİ ALAN GEREKTİ
-- ===========================================================================
-- Başvurunun `durum` alanı KATILABİLİR demektir, KATILDI demez. Katılım
-- geçmişi bugüne kadar iki dolaylı kanıttan hesaplanıyordu (bkz.
-- lib/kazanim/katilim-kurallar.ts):
--
--   1. adına belge üretilmiş olması,
--   2. 7 Ağustos 2026 öncesi etkinliklerde SECILDI olması.
--
-- İkisi de yoklamanın yerini tutmuyor: birincisi belge basılmadan önce
-- sessiz kalıyor, ikincisi gelmeyen öğrenciyi de katılmış sayıyor. Yoklama,
-- etkinliği yürüten kişinin "bu kişi buradaydı" beyanıdır ve dolaylı
-- kanıtların hepsinden güçlüdür.
--
-- ÜÇ HÂL: NULL (yoklama alınmadı) · true (geldi) · false (gelmedi).
-- NOT NULL DEFAULT false OLAMAZ: o, geçmişteki bütün başvuruları "gelmedi"
-- işaretlemek olurdu ve öğrencilerin kazanılmış katılımları bir gecede
-- silinirdi. Eski kayıtlar NULL kalır, eski kural onlarda yürümeye devam eder.

ALTER TABLE "basvuru"
  ADD COLUMN IF NOT EXISTS "katildi_mi" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "yoklama_alan_kullanici_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "yoklama_tarihi" TIMESTAMPTZ(6);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'basvuru_yoklama_alan_fkey'
  ) THEN
    ALTER TABLE "basvuru"
      ADD CONSTRAINT "basvuru_yoklama_alan_fkey"
      FOREIGN KEY ("yoklama_alan_kullanici_id") REFERENCES "kullanici"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Yoklama listesi her zaman TEK etkinliğin seçilmiş başvurularıdır; mevcut
-- (faaliyet_id, durum) indeksi bu sorguyu zaten karşılıyor, yeni indeks
-- açılmadı. Katılım geçmişi sorgusu ise `katilimci_id` üzerinden gidiyor ve
-- onun da indeksi var.
