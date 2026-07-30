-- Bir ilin aynı anda en fazla bir aktif koordinatörü olur.
--
-- Kural şimdiye kadar yalnızca uygulamadaydı ve sinsi bir belirsizlik
-- bırakıyordu: `ilKoordinatoruGetir` findFirst kullanır, aynı ilde iki aktif
-- koordinatör olduğunda okulunda danışman bulunmayan öğrencilerin HANGİSİNE
-- bağlanacağı sıralamaya kalırdı. Devir, eskisinin rolü kapatılıp yenisinin
-- açılmasıyla yapılır; iki koordinatörün bir arada bulunduğu bir geçiş dönemi
-- tanımlı değildir.
--
-- Kısıt eklenmeden önce mevcut çakışmalar kapatılır: bir ilde birden fazla
-- aktif koordinatör varsa EN SON atanan görevde bırakılır, öncekiler kapatılır.
-- Sessizce silinmez, geçmiş kaydı bitiş tarihiyle korunur.

UPDATE "kullanici_rol" AS eski
SET "bitis_tarihi" = NOW()
WHERE eski."rol_kodu" = 'IL_KOORDINATOR'
  AND eski."bitis_tarihi" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "kullanici_rol" AS guncel
    WHERE guncel."rol_kodu" = 'IL_KOORDINATOR'
      AND guncel."bitis_tarihi" IS NULL
      AND guncel."il_kodu" = eski."il_kodu"
      AND (guncel."baslangic_tarihi", guncel."id") > (eski."baslangic_tarihi", eski."id")
  );

CREATE UNIQUE INDEX "ux_il_koordinator_tek_aktif"
  ON "kullanici_rol" ("il_kodu")
  WHERE "bitis_tarihi" IS NULL AND "rol_kodu" = 'IL_KOORDINATOR';
