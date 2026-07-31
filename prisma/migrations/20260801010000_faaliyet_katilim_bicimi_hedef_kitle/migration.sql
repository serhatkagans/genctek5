-- Faaliyete katılım biçimi ve hedef kitle.
--
-- Bu iki alan kazanım kayıtlarında zaten vardı; faaliyette yoktu. Öğrenci
-- "hangi etkinliğe katıldım" derken yüz yüze mi online mı olduğunu
-- yazabiliyordu ama faaliyeti AÇAN kişi aynı bilgiyi giremiyordu.
--
-- KatilimBicimi enum'u önceki migration'da oluşturuldu; burada yeniden
-- tanımlanmıyor.

ALTER TABLE "faaliyet"
  ADD COLUMN IF NOT EXISTS "katilim_bicimi" "KatilimBicimi",
  ADD COLUMN IF NOT EXISTS "hedef_kitle" VARCHAR(200);

-- İkisi de NULL kabul eder: mevcut faaliyetlerde bu bilgi yok ve geriye dönük
-- doldurulamaz. Varsayılan verilmiyor — "yüz yüze" varsaymak, online yapılmış
-- geçmiş faaliyetleri sessizce yanlış etiketlerdi.
