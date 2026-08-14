-- Panodaki ÖĞRENCİ ilanları proje yöneticisi onayından geçer (14 Ağustos 2026).
--
-- İSTEK:
--   "panodaki öğrenci ilanları şimdilik proje yöneticilerine düşsün oradan
--    onay versin"
--
-- ===========================================================================
-- NEDEN İLANIN KENDİ SÜTUNU, AYRI TABLO DEĞİL
-- ===========================================================================
-- Onay, ilanın bir DURUMUDUR; ayrı bir "onay kaydı" tablosu her sorguya bir
-- birleştirme ekler ve panonun asıl sorusu ("şu an görünen ilanlar") tek
-- tablodan cevaplanamaz hâle gelirdi. Emsali `faaliyet.onay_durumu`.
--
-- ===========================================================================
-- VARSAYILAN 'ONAY_GEREKMEZ' — GEÇMİŞ İLANLAR KAYBOLMAZ
-- ===========================================================================
-- Sütun 'BEKLIYOR' varsayılanıyla eklenseydi, panoda duran her ilan bu
-- migration'la birlikte görünmez olur ve sahiplerinin beklediği bağlantı
-- sessizce kesilirdi. Aynı gerekçe tür süzgeci notlarında da var: açılmış
-- ilanları görünmez yapmak veri taşımaktan daha pahalıdır.
--
-- 'ONAY_GEREKMEZ' ayrıca ÖĞRENCİ DIŞINDAKİ açanların kalıcı değeridir
-- (öğretmen, mezun, paydaş temsilcisi): istek yalnızca öğrenci ilanları için
-- onay istiyor. Kimin onaya düşeceği uygulama katmanında duruyor
-- (bkz. lib/yetki/izinler.ts · panoIlaniOnayGerekiyorMu).
--
-- ===========================================================================
-- RET GEREKÇESİ
-- ===========================================================================
-- Reddederken zorunlu (bkz. istekKarariniCoz): gerekçesiz ret, öğrenciye
-- ilanını düzeltip yeniden açması için hiçbir bilgi bırakmıyor.

ALTER TABLE "talep"
  ADD COLUMN IF NOT EXISTS "onay_durumu" "OnayDurumu" NOT NULL DEFAULT 'ONAY_GEREKMEZ',
  ADD COLUMN IF NOT EXISTS "onaylayan_kullanici_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "onay_tarihi" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "ret_gerekcesi" TEXT;

-- Onay kuyruğu "bekleyenler, en eski üstte" diye okunuyor.
CREATE INDEX IF NOT EXISTS "talep_onay_durumu_olusturma_tarihi_idx"
  ON "talep" ("onay_durumu", "olusturma_tarihi");

DO $$
BEGIN
  -- Karar veren kullanıcı silinirse ilan düşmez, yalnızca kararın sahibi
  -- boşalır: ilan öğrencinindir, onaylayanın değil.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'talep_onaylayan_fkey'
  ) THEN
    ALTER TABLE "talep"
      ADD CONSTRAINT "talep_onaylayan_fkey"
      FOREIGN KEY ("onaylayan_kullanici_id") REFERENCES "kullanici"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- Bildirim şablonları
-- --------------------------------------------------------------------------
-- İKİ UÇTA DA HABER VAR — sistemdeki her onay kuyruğunun kuralı bu
-- (bkz. 20260813190000_mentorluk_bildirimleri): kararı verecek olan uyarılır,
-- kararı bekleyen sonucu öğrenir. Uyarısız kuyruk, günlerce bakılmayan
-- kuyruktur; öğrencinin ilanı da o kadar süre panoda görünmez.
--
-- Şablonlar SEED'e de eklendi (prisma/seed.ts); buradaki INSERT, seed'i
-- yeniden çalıştırmayan kurulumlar içindir.
INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'ONAY_BEKLEYEN_PANO_ILANI',
  'Onay bekleyen pano ilanı: {{acanAdSoyad}}',
  'Merhaba,' || chr(10) || chr(10) ||
  '{{acanAdSoyad}} panoya bir ilan açtı ve onayınızı bekliyor.' || chr(10) || chr(10) ||
  'İlan türü: {{tur}}' || chr(10) ||
  'Başlık: {{talepBasligi}}' || chr(10) || chr(10) ||
  'İlanı Yönetim Paneli''ndeki "Pano ilanları" kartından inceleyip onaylayabilir ya da gerekçesiyle reddedebilirsiniz. Onaylanana kadar ilan panoda görünmez.' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;

INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'PANO_ILANI_KARARI',
  'Pano ilanınız {{sonuc}}',
  'Merhaba,' || chr(10) || chr(10) ||
  '"{{talepBasligi}}" başlıklı pano ilanınız {{sonuc}}.' || chr(10) || chr(10) ||
  'Gerekçe: {{gerekce}}' || chr(10) || chr(10) ||
  'Onaylandıysa ilanınız panoda yayımlandı ve diğer kullanıcılar bağlantı isteği gönderebilir. Reddedildiyse gerekçeyi dikkate alarak yeni bir ilan açabilirsiniz.' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;
