-- Öğretmen/personel iletişim bilgileri.
--
-- Öğrenci profilinde zaten bulunan bu iki alan öğretmen tarafında eksikti;
-- il koordinatörü ve YEĞİTEK personeli de kendilerine ulaşılacak bilgiyi
-- giremiyordu. Alanlar e-Okul kaynaklı DEĞİLDİR, senkron bunlara dokunmaz.

ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "eposta" VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "telefon" VARCHAR(20);
