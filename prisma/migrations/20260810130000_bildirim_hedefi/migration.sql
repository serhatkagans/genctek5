-- Bildirimin hedefi (10 Ağustos 2026).
--
-- İSTEK: "bildirimi okundu şeklinde işaretleme var, onun yanına bir de
-- etkinliğe git butonu olsun".
--
-- ===========================================================================
-- NEDEN SÜTUN GEREKİYOR
-- ===========================================================================
-- Bildirim gövdesinde etkinliğin ADI geçiyor, kimliği geçmiyor:
--
--   "… Zeynep Kaya, Ulusal kapsamında Tek Maraton adlı etkinliği önerdi …"
--
-- Ada bakarak bağlantı üretmek, aynı adı taşıyan iki etkinlikte kullanıcıyı
-- sessizce yanlış kayda götürür — üstelik onay bekleyen bir kayda. Hedef bu
-- yüzden bildirim yazılırken KAYDEDİLİYOR, okunurken tahmin edilmiyor.
--
-- İKİ SÜTUN, tek `faaliyet_id` DEĞİL: yazışma ve dış başvuru bildirimleri de
-- bir gün hedef isteyecek; tür bilinmeden id'nin hangi tabloya ait olduğu
-- belli olmaz. Enum tek değerle başlıyor, genişletmek bir migration.
--
-- YABANCI ANAHTAR YOK ve bu bilinçli: hedef çok tablolu (bugün tek, yarın
-- değil) ve bildirim, işaret ettiği kayıt silinse bile bir GEÇMİŞ kaydıdır.
-- Kırık hedef, okuma tarafında 404 ile karşılanır (bkz. faaliyet detayı:
-- kapsam dışı ve yok olan kayıt aynı cevabı verir).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BildirimHedefTipi') THEN
    CREATE TYPE "BildirimHedefTipi" AS ENUM ('FAALIYET');
  END IF;
END
$$;

ALTER TABLE "bildirim"
  ADD COLUMN IF NOT EXISTS "hedef_tip" "BildirimHedefTipi",
  ADD COLUMN IF NOT EXISTS "hedef_id"  INTEGER;

-- GERİYE DÖNÜK DOLDURMA YAPILMADI. Eski satırlarda hedefi bulmanın tek yolu
-- başlıktaki adı aramaktı; yukarıda anlatılan yanlış eşleşme riski, bir
-- düğmenin geçmiş bildirimlerde de çıkmasından ağır basar. Eski bildirimler
-- düğmesiz görünür, yenileri düğmeli.
