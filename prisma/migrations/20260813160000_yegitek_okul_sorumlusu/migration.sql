-- YEĞİTEK Okul Sorumlusu işareti (13 Ağustos 2026).
--
-- İSTEK:
--   "okuldaki danışman öğretmenlerden bazıları YEĞİTEK Okul Sorumlusu olarak
--    görev alıyor olabilir, bununla ilgili panelde bir işaretleme alanı
--    yapalım, eğer YEĞİTEK okul sorumlusu ise o alanı işaretlesin, proje
--    yöneticisinin yönetim panelinde de YEĞİTEK Okul Sorumlusu isminde bir
--    kart olsun ve oradan onların listesini görebilsin"
--
-- ===========================================================================
-- ROL DEĞİL, İŞARET
-- ===========================================================================
-- kullanici_rol'e yeni bir RolKodu eklenmedi. Sebep: rol, kapsam
-- filtrelerinin okuduğu şeydir (bkz. lib/yetki/kapsam.ts) ve bu işaret hiç
-- kimseye yeni bir veri erişimi vermiyor — yalnızca "okulda YEĞİTEK'in
-- muhatabı kim" bilgisini taşıyor. Rol yapılsaydı her kapsam filtresine
-- hiçbir şeyi değiştirmeyen ikinci bir dal eklenirdi (mentörlükte de aynı
-- karar verilmişti).
--
-- Emsal `danisman_olmak_istiyor`: aynı tablo, aynı desen (bayrak + işaret
-- tarihi), aynı onaysızlık.
--
-- ===========================================================================
-- ONAY YOK
-- ===========================================================================
-- Görev, okul idaresi ile YEĞİTEK arasında zaten verilmiş bir görevdir;
-- sistem onu kaydeder, dağıtmaz. Merkez listeyi yönetim panosundaki karttan
-- görür ve yanlışını öğretmenle konuşur. Onay kuyruğu kurmak, verilmemiş bir
-- yetkiyi sistemin veriyormuş gibi görünmesine yol açardı.
ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "yegitek_okul_sorumlusu" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "yegitek_isaretleme_tarihi" TIMESTAMPTZ(6);

-- Merkezin listesi bu sütunu süzüyor ve tablo büyük (her öğretmenin bir
-- satırı var); kısmi indeks yalnızca işaretlileri taşır.
CREATE INDEX IF NOT EXISTS "ogretmen_profil_yegitek_okul_sorumlusu_idx"
  ON "ogretmen_profil" ("yegitek_okul_sorumlusu")
  WHERE "yegitek_okul_sorumlusu";

-- İŞARET KALKINCA TARİH DE KALKAR. Uygulama katmanı ikisini birlikte yazıyor;
-- kısıt, elle yapılan bir düzeltmenin tutarsız satır bırakmasını engelliyor
-- (danışmanlık işaretinde böyle bir kısıt yok — bu yeni ve doğrusu bu).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_yegitek_isaret_butunlugu'
  ) THEN
    ALTER TABLE "ogretmen_profil"
      ADD CONSTRAINT "ck_yegitek_isaret_butunlugu"
      CHECK (
        ("yegitek_okul_sorumlusu" AND "yegitek_isaretleme_tarihi" IS NOT NULL)
        OR (NOT "yegitek_okul_sorumlusu" AND "yegitek_isaretleme_tarihi" IS NULL)
      );
  END IF;
END
$$;
