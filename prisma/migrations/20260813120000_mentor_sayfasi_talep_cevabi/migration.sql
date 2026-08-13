-- Mentör sayfası: panodaki ilana yazılan cevap (13 Ağustos 2026).
--
-- İSTEK:
--   "mentörlerin kendi sayfası olsun, destek atacağı sayfayı görecek,
--    talepleri inceleyip cevap yazacak, mentör sayfası gibi"
--
-- ===========================================================================
-- AÇIK CEVAP, ÖZEL MESAJ DEĞİL
-- ===========================================================================
-- Bu sistemde yetişkin ile 18 yaş altı kullanıcı arasındaki BİREBİR yazışma
-- danışman/koordinatör onayından geçer (bkz. baglanti_istegi) ve o kural
-- GEVŞEMEDİ. Mentörün ilana yazdığı cevap ise ilanı gören herkesin okuduğu bir
-- metindir: ilan zaten açıktır, cevabın da açık olması aynı soruyu soracak
-- ikinci öğrenciye yarar ve öğretmen/koordinatör de neyin söylendiğini görür.
--
-- Mentör birebir konuşmak isterse yolu değişmedi: panodaki "Bağlantı isteği
-- gönder" kutusu ve onay akışı.
--
-- ===========================================================================
-- SİLME YOK, GİZLEME VAR
-- ===========================================================================
-- gonderi/gonderi_yorumu ile birebir aynı gerekçe: içerik korunur, çünkü
-- şikâyet incelemesinde en çok ihtiyaç duyulan kayıt silinmiş olandır.
-- Kullanıcıların çoğu 18 yaş altı; moderasyon iz bırakmadan çalışmamalı.
CREATE TABLE IF NOT EXISTS "talep_cevabi" (
  "id"                    SERIAL         PRIMARY KEY,
  "talep_id"              INTEGER        NOT NULL,
  "yazan_kullanici_id"    INTEGER        NOT NULL,
  "icerik"                TEXT           NOT NULL,
  "olusturma_tarihi"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "gizlendi_mi"           BOOLEAN        NOT NULL DEFAULT false,
  "gizleyen_kullanici_id" INTEGER,
  "gizlenme_tarihi"       TIMESTAMPTZ(6)
);

-- İlanın altındaki cevaplar tarih sırasıyla okunur; ikinci indeks mentörün
-- kendi sayfasındaki "Cevapladıklarım" listesi içindir.
CREATE INDEX IF NOT EXISTS "talep_cevabi_talep_id_olusturma_tarihi_idx"
  ON "talep_cevabi" ("talep_id", "olusturma_tarihi");
CREATE INDEX IF NOT EXISTS "talep_cevabi_yazan_kullanici_id_olusturma_tarihi_idx"
  ON "talep_cevabi" ("yazan_kullanici_id", "olusturma_tarihi");

DO $$
BEGIN
  -- İlan silinirse cevapları da gider: cevap, ilanı olmadan okunamaz bir
  -- metindir. Gizleme zaten silme değildir; bu yol yalnızca veri saklama
  -- bakımında kullanılır (bkz. scripts/veri-saklama.ts).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'talep_cevabi_talep_fkey'
  ) THEN
    ALTER TABLE "talep_cevabi"
      ADD CONSTRAINT "talep_cevabi_talep_fkey"
      FOREIGN KEY ("talep_id") REFERENCES "talep"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'talep_cevabi_yazan_fkey'
  ) THEN
    ALTER TABLE "talep_cevabi"
      ADD CONSTRAINT "talep_cevabi_yazan_fkey"
      FOREIGN KEY ("yazan_kullanici_id") REFERENCES "kullanici"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'talep_cevabi_gizleyen_fkey'
  ) THEN
    ALTER TABLE "talep_cevabi"
      ADD CONSTRAINT "talep_cevabi_gizleyen_fkey"
      FOREIGN KEY ("gizleyen_kullanici_id") REFERENCES "kullanici"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- Bildirim şablonu
-- --------------------------------------------------------------------------
-- İlanı açan kişi cevabı YAZILDIĞI ANDA öğrenmeli; panoya kendiliğinden geri
-- dönmesini beklemek, cevabın çoğu zaman hiç okunmaması demekti.
--
-- Şablon SEED'e de eklendi (prisma/seed.ts); buradaki INSERT, seed'i yeniden
-- çalıştırmayan kurulumlar içindir. ON CONFLICT ile tekrar çalıştırılabilir.
INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'TALEBE_CEVAP_GELDI',
  'Panodaki ilanınıza cevap geldi',
  'Merhaba,' || chr(10) || chr(10) ||
  '"{{talepBasligi}}" başlıklı ilanınıza {{cevaplayanAdSoyad}} cevap yazdı. Cevabı panodaki ilanınızın altında okuyabilirsiniz.' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;
