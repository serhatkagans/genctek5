-- Çalışma Grubu Yöneticisi görev rolü + "Mentöre sor" pano türü
-- (7 Ağustos 2026, menü ve bölüm yeniden düzenlemesi).
--
-- İSTEK:
--   · Profil > GençTek Yolculuğum > "Görevlerim (İl Temsilcisi/Okul
--     Temsilcisi/Çalışma Grubu Yöneticisi / Görev Aldığı GençTek
--     Organizasyonları)"
--   · Pano: "Destek Talebi / Mentöre sor / Genel / Ekip Arkadaşı arama"

-- ---------------------------------------------------------------------------
-- 1. Çalışma Grubu Yöneticisi
-- ---------------------------------------------------------------------------
-- Diğer üç temsilcilikten farkı KAPSAMININ TÜRÜ: onlar bir YERE (il, ilçe,
-- okul) bağlanır, bu bir ÇALIŞMA GRUBUNA. Yer sütunlarına sığdırmak mümkündü
-- ama "Robotik" bir okul adıymış gibi durur ve `gorevRolAdi()` etiketi yanlış
-- yazardı ("Robotik Çalışma Grubu Yöneticisi" yerine kurum adı arardı).
--
-- Rol bugün ek YETKİ getirmiyor, bir unvan. Yetki eklenecekse permissions.md
-- ile birlikte düşünülmeli — bu migration yalnızca unvanı tanımlıyor.
ALTER TYPE "GorevRolKodu" ADD VALUE IF NOT EXISTS 'CALISMA_GRUBU_YONETICISI';

ALTER TABLE "ogrenci_gorev_rolu"
  ADD COLUMN IF NOT EXISTS "calisma_grubu_id" INTEGER;

ALTER TABLE "ogrenci_gorev_rolu"
  DROP CONSTRAINT IF EXISTS "ogrenci_gorev_rolu_calisma_grubu_id_fkey";
ALTER TABLE "ogrenci_gorev_rolu"
  ADD CONSTRAINT "ogrenci_gorev_rolu_calisma_grubu_id_fkey"
  FOREIGN KEY ("calisma_grubu_id") REFERENCES "calisma_grubu" ("id");

-- ---------------------------------------------------------------------------
-- 2. "Mentöre sor"
-- ---------------------------------------------------------------------------
-- TEKNIK_DESTEK'ten AYRI bir tür: o bir SORUNU çözdürmek için açılır ("kodum
-- çalışmıyor"), bu bir YOL sorar ("hangi alana gitmeliyim"). Tek türde
-- toplansalardı mentor arayan öğrenci teknik soruların arasında kaybolurdu.
--
-- SPONSOR KAPATILMADI: açılmış ilanları türsüz bırakmamak için duruyor.
-- Ekranda görünen adlar değişti (TEKNIK_DESTEK → "Destek Talebi",
-- DUYURU → "Genel") ama enum değerleri AYNI kaldı — etiket değişikliği için
-- veri taşımak, geri alınması pahalı bir işi bedavaya yapmak olurdu.
ALTER TYPE "TalepTuru" ADD VALUE IF NOT EXISTS 'MENTORE_SOR';
