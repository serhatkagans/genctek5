-- Faaliyetin tanıtıcı (kapak) görseli.
--
-- Ayrı bir dosya alanı değil, mevcut eklerden BİRİNE işaret eder: aynı görselin
-- hem kapak hem ek olarak iki kez yüklenmesini önler ve kapak da diğer ekler
-- gibi kapsam kontrolünden geçen indirme yolunu kullanır.
--
-- Ek silindiğinde kapak boşa düşmesin diye SET NULL. Faaliyet silindiğinde
-- ekler zaten cascade ile gider; bu yön (faaliyet -> ek) silinen satırın kendi
-- alanı olduğu için sorun çıkarmaz.

ALTER TABLE "faaliyet" ADD COLUMN "kapak_ek_id" INTEGER;

ALTER TABLE "faaliyet" ADD CONSTRAINT "faaliyet_kapak_ek_id_fkey"
  FOREIGN KEY ("kapak_ek_id") REFERENCES "faaliyet_ek"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Bir ek en fazla bir faaliyetin kapağı olabilir.
CREATE UNIQUE INDEX "faaliyet_kapak_ek_id_key" ON "faaliyet"("kapak_ek_id");
