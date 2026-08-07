-- dis_basvuru_tur_alanlari, MENTOR türünü tanımıyordu (7 Ağustos 2026).
--
-- ===========================================================================
-- HATA
-- ===========================================================================
-- Kısıt, dış giriş kurulurken (20260805150100) iki türe göre yazılmıştı:
--
--   ("tur" = 'PAYDAS' AND "paydas_id" IS NOT NULL AND "mezun_kurum_kodu" IS NULL)
--   OR ("tur" = 'MEZUN' AND "paydas_id" IS NULL)
--
-- Üçüncü tür MENTOR aynı gün (20260807170000_mentorluk) `DisKullaniciTuru`
-- enum'una eklendi ama bu kısıt genişletilmedi. MENTOR başvurusunda ne paydaş
-- kurumu ne mezuniyet okulu sorulur (bkz. disBasvuruGirdisiniCoz — ikisi de
-- null kalır), dolayısıyla satır iki koşulun da dışına düşüyor ve
-- **hiçbir mentör başvurusu kaydedilemiyordu**: form 23514 ile hata veriyordu.
--
-- `ck_kullanici_rol_kapsam` ile aynı sınıftan bir eksik (bkz. bir önceki
-- migration): enum genişledi, kısıtlar genişlemedi. Birim testler saf
-- fonksiyonları sınadığı için ikisini de yakalayamazdı.
--
-- ===========================================================================
-- DÜZELTME
-- ===========================================================================
-- MENTOR için iki alanın da BOŞ olması şart koşuluyor. Serbest bırakılıp
-- "OR tur = 'MENTOR'" denebilirdi ama o zaman paydaş kurumu seçilmiş bir
-- mentör başvurusu geçerli olurdu; oysa mentörlük kişiseldir ve kurumu
-- temsil etmez — temsil edecekse tür zaten PAYDAS'tır.
ALTER TABLE "dis_kullanici_basvurusu"
  DROP CONSTRAINT IF EXISTS "dis_basvuru_tur_alanlari";

ALTER TABLE "dis_kullanici_basvurusu"
  ADD CONSTRAINT "dis_basvuru_tur_alanlari" CHECK (
    ("tur" = 'PAYDAS' AND "paydas_id" IS NOT NULL AND "mezun_kurum_kodu" IS NULL)
    OR
    ("tur" = 'MEZUN' AND "paydas_id" IS NULL)
    OR
    ("tur" = 'MENTOR' AND "paydas_id" IS NULL AND "mezun_kurum_kodu" IS NULL)
  );
