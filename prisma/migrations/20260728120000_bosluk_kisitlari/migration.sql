-- DEĞİŞMEZ DÜZELTMESİ: boş gerekçe/yorum yasağı
--
-- İlk kurulumdaki kısıtlar `length(btrim(...)) > 0` kullanıyordu. Postgres'te
-- tek argümanlı btrim YALNIZCA boşluk (space) karakterini kırpar; satır sonu,
-- sekme ve benzeri boşluk karakterlerine dokunmaz. Bu yüzden yalnızca "\n"
-- içeren bir gerekçe/yorum kısıttan geçiyordu — duman testi bunu yakaladı.
--
-- Yerine POSIX boşluk sınıfı kullanılıyor: en az bir boşluk-olmayan karakter
-- zorunlu. Uygulama katmanı zaten trim ediyor, ama değişmez veritabanında
-- durmak zorunda (SKILL.md "Değişmezler").

ALTER TABLE "basvuru" DROP CONSTRAINT IF EXISTS "ck_basvuru_gerekce_dolu";
ALTER TABLE "basvuru" ADD CONSTRAINT "ck_basvuru_gerekce_dolu"
  CHECK ("gerekce" ~ '[^[:space:]]');

ALTER TABLE "yorum" DROP CONSTRAINT IF EXISTS "ck_yorum_icerik_dolu";
ALTER TABLE "yorum" ADD CONSTRAINT "ck_yorum_icerik_dolu"
  CHECK ("icerik" ~ '[^[:space:]]');
