-- Akış: gönderi, yorum ve "Hakkımda" (12 Ağustos 2026).
--
-- İSTEK:
--   "kullanıcı linkedin gibi mesaj yazabilsin, o alanda kendini tanıtabilsin
--    diğer kişiler altına mesaj yazabilsin, kariyeri hakkında paylaşım
--    yapabilsin"
--
-- ===========================================================================
-- GÖNDERİ, YAZIŞMA DEĞİLDİR
-- ===========================================================================
-- Yazışma (model Yazisma) İKİ KİŞİ arasındadır ve danışman onayı olmadan
-- açılmaz. Gönderi YAYINDIR: ekosistemdeki herkes okur, kimseden onay
-- istemez. Bağlantı kapısı bu yüzden buraya UYGULANMADI — o kapı "bu iki kişi
-- birbirine özel yazabilsin mi" sorusunu çözer, "bu kişi herkese açık bir şey
-- yayınlayabilir mi" sorusunu değil.
--
-- Emsal panodaki ilandır (model Talep): öğrenci yıllardır oraya onaysız ilan
-- açıyor ve ilan bütün ekosisteme görünüyor. Gönderi aynı kategoridedir.
--
-- GÖRÜNÜRLÜK EKOSİSTEMLE SINIRLI (S21 ile aynı ilke): gönderiyi yalnızca
-- sisteme girmiş kullanıcılar okur. Dışarıya açık akış AYRI BİR KARARDIR.
--
-- ===========================================================================
-- SİLME YOK, GİZLEME VAR
-- ===========================================================================
-- model Mesaj ile birebir aynı gerekçe: içerik korunur çünkü şikâyet
-- incelemesinde en çok ihtiyaç duyulan kayıt silinmiş olandır. Bu yüzden
-- gizlendi_mi/gizleyen/gizlenme_tarihi üçlüsü, DELETE değil.
--
-- Kullanıcıların çoğu 18 yaş altı; moderasyon iz bırakmadan çalışmamalı.

-- --------------------------------------------------------------------------
-- 1. Hakkımda
-- --------------------------------------------------------------------------
-- kullanici tablosunda, profil tablolarında DEĞİL: her kullanıcı tipinde
-- vardır, oysa YEĞİTEK personeline ne ogrenci_profil ne ogretmen_profil
-- satırı açılır (bkz. lib/kullanici/sagla.ts).
--
-- SALT OKUNUR KİMLİK ALANI DEĞİLDİR: e-Okul'dan gelmez, gecelik senkron bu
-- sütuna dokunmaz (güncelleme yalnızca adı geçen sütunlara yazar).
ALTER TABLE "kullanici"
  ADD COLUMN IF NOT EXISTS "hakkinda" TEXT;

-- --------------------------------------------------------------------------
-- 2. Gönderi
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "gonderi" (
  "id"                    SERIAL       PRIMARY KEY,
  "yazan_kullanici_id"    INTEGER      NOT NULL,
  "icerik"                TEXT         NOT NULL,
  "olusturma_tarihi"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "gizlendi_mi"           BOOLEAN      NOT NULL DEFAULT false,
  "gizleyen_kullanici_id" INTEGER,
  "gizlenme_tarihi"       TIMESTAMPTZ(6)
);

-- Akış her zaman tarihe göre tersten okunur; yazarın kendi gönderileri ise
-- profilinde listelenecek, ikinci indeks onun içindir.
CREATE INDEX IF NOT EXISTS "gonderi_olusturma_tarihi_idx"
  ON "gonderi" ("olusturma_tarihi");
CREATE INDEX IF NOT EXISTS "gonderi_yazan_kullanici_id_olusturma_tarihi_idx"
  ON "gonderi" ("yazan_kullanici_id", "olusturma_tarihi");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gonderi_yazan_fkey'
  ) THEN
    ALTER TABLE "gonderi"
      ADD CONSTRAINT "gonderi_yazan_fkey"
      FOREIGN KEY ("yazan_kullanici_id") REFERENCES "kullanici"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gonderi_gizleyen_fkey'
  ) THEN
    ALTER TABLE "gonderi"
      ADD CONSTRAINT "gonderi_gizleyen_fkey"
      FOREIGN KEY ("gizleyen_kullanici_id") REFERENCES "kullanici"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- 3. Gönderi yorumu
-- --------------------------------------------------------------------------
-- model Yorum'dan AYRI TABLO: o tablo faaliyet_id üzerine kurulu ve NOT NULL.
-- Gönderi yorumunu oraya sığdırmak, sütunu isteğe bağlı yapıp "ikisinden biri
-- dolu" kısıtını uygulama katmanına taşımak demekti. İki ayrı tablo, iki ayrı
-- yabancı anahtar kısıtı bırakır.
--
-- Gönderi silinirse yorumları da gider (CASCADE): yorum, gönderisi olmadan
-- okunamaz bir metindir. Gizleme zaten silme değildir, bu yol yalnızca
-- veri saklama bakımında (bkz. scripts/veri-saklama.ts) kullanılır.
CREATE TABLE IF NOT EXISTS "gonderi_yorumu" (
  "id"                    SERIAL       PRIMARY KEY,
  "gonderi_id"            INTEGER      NOT NULL,
  "yazan_kullanici_id"    INTEGER      NOT NULL,
  "icerik"                TEXT         NOT NULL,
  "olusturma_tarihi"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "gizlendi_mi"           BOOLEAN      NOT NULL DEFAULT false,
  "gizleyen_kullanici_id" INTEGER,
  "gizlenme_tarihi"       TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS "gonderi_yorumu_gonderi_id_olusturma_tarihi_idx"
  ON "gonderi_yorumu" ("gonderi_id", "olusturma_tarihi");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gonderi_yorumu_gonderi_fkey'
  ) THEN
    ALTER TABLE "gonderi_yorumu"
      ADD CONSTRAINT "gonderi_yorumu_gonderi_fkey"
      FOREIGN KEY ("gonderi_id") REFERENCES "gonderi"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gonderi_yorumu_yazan_fkey'
  ) THEN
    ALTER TABLE "gonderi_yorumu"
      ADD CONSTRAINT "gonderi_yorumu_yazan_fkey"
      FOREIGN KEY ("yazan_kullanici_id") REFERENCES "kullanici"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gonderi_yorumu_gizleyen_fkey'
  ) THEN
    ALTER TABLE "gonderi_yorumu"
      ADD CONSTRAINT "gonderi_yorumu_gizleyen_fkey"
      FOREIGN KEY ("gizleyen_kullanici_id") REFERENCES "kullanici"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
