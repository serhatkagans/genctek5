-- ck_kullanici_rol_kapsam, dış kullanıcı rollerini tanımıyordu (7 Ağustos 2026).
--
-- ===========================================================================
-- HATA
-- ===========================================================================
-- Kısıt ilk kurulumda (20260728000000) şöyle yazılmıştı:
--
--   ("rol_kodu" = 'IL_KOORDINATOR' AND "il_kodu" IS NOT NULL)
--   OR ("rol_kodu" = 'DANISMAN' AND "kurum_kodu" IS NOT NULL)
--   OR "rol_kodu" IN ('OGRENCI', 'PROJE_YONETICISI')
--
-- Son satır bir BEYAZ LİSTEDİR: listede olmayan her rol reddedilir. MEZUN ve
-- PAYDAS_TEMSILCISI rolleri 5 Ağustos'ta (20260805150000_dis_giris_enumlari)
-- eklendi ama bu kısıt genişletilmedi. Sonuç: `basvuruyuOnayla` içindeki
-- `kullanici_rol` INSERT'i her seferinde 23514 ile düşüyordu — yani
-- **onaylanmış tek bir dış kullanıcı açılamıyordu**. Onay tek transaction
-- olduğu için yarım kayıt kalmadı; işlem tamamen geri alındı ve proje
-- yöneticisi ekranında ham bir veritabanı hatası gördü.
--
-- Birim testler yakalayamazdı: yetki ve başvuru kuralları saf fonksiyonlar
-- olarak sınanıyor, bu kısıt ise yalnızca veritabanında yaşıyor.
--
-- ===========================================================================
-- DÜZELTME
-- ===========================================================================
-- İki rol için kapsam alanlarının BOŞ olması AÇIKÇA şart koşuluyor.
-- Beyaz listeye eklenip geçilebilirdi (OGRENCI/PROJE_YONETICISI'de öyle) ama
-- bu iki rolde kapsamın boş olması sıradan bir varsayılan değil, tanımın
-- kendisidir: dış kullanıcının kurumu yoktur ve ili rol kaydında değil
-- kullanıcı satırında durur. Dolu bir il_kodu, kapsam filtrelerinde bugün
-- okunmuyor ama okunduğu gün sessizce yanlış veri gösterirdi.
--
-- Mevcut satırlar etkilenmez: kısıt zaten bu rollerin yazılmasına izin
-- vermediği için veritabanında hiç MEZUN/PAYDAS_TEMSILCISI kaydı yok.
ALTER TABLE "kullanici_rol" DROP CONSTRAINT IF EXISTS "ck_kullanici_rol_kapsam";

ALTER TABLE "kullanici_rol" ADD CONSTRAINT "ck_kullanici_rol_kapsam"
  CHECK (
    ("rol_kodu" = 'IL_KOORDINATOR' AND "il_kodu" IS NOT NULL)
    OR ("rol_kodu" = 'DANISMAN' AND "kurum_kodu" IS NOT NULL)
    OR "rol_kodu" IN ('OGRENCI', 'PROJE_YONETICISI')
    OR (
      "rol_kodu" IN ('MEZUN', 'PAYDAS_TEMSILCISI')
      AND "il_kodu" IS NULL
      AND "kurum_kodu" IS NULL
    )
  );
