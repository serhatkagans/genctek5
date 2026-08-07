-- Mezun / paydaş / mentör profili (7 Ağustos 2026).
--
-- İSTEK, sekme sekme geldi:
--   1. sekme Profil: "Foto · Bilgileri (il kurum görevi linkedin github eposta
--      açıklamalar/katkı sağlayabileceği şeyler) · Özgeçmiş · Katkı Nişanım"
--   2. sekme Panel: "Foto ekle · Mentörlüklerim/desteklerim · Çalışma Grupları"
--   3. sekme Etkinlikler: "Etkinlik Bildir · Görüntüle"
--
-- Bu dosya bunlardan VERİ gerektiren ikisini karşılıyor: profildeki yeni
-- alanlar ve Panel'deki "Çalışma Grupları" seçimi. Etkinlik açma yetkisi
-- veri değil kural değişikliğidir (bkz. lib/yetki/izinler.ts).

-- ---------------------------------------------------------------------------
-- 1. Profil alanları
-- ---------------------------------------------------------------------------
-- TABLO `ogretmen_profil` ve adı yanıltıcı ama YERİ DOĞRU: içeriği "öğrenci
-- OLMAYAN kullanıcının profili"dir ve mezun, paydaş temsilcisi, mentör, il
-- koordinatörü, YEĞİTEK personeli hepsi bu satırı kullanıyor (bkz. tablo
-- yorumu). Dış kullanıcı için ayrı bir profil tablosu açmak, e-posta/telefon/CV
-- alanlarının ikinci bir kopyasını doğururdu.
--
-- BAĞLANTI SÜTUNLARI `ogrenci_profil`dekiyle birebir aynı (VARCHAR(200)) ve
-- aynı doğrulamadan geçiyor. Öğrencide olup burada olmaması bir eksiklikti:
-- dış kullanıcının okulu, sınıfı, branşı yok — ekosisteme ne getirdiğini
-- anlatan tek yer bu adresler ve aşağıdaki açıklama alanı.
ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "github_url"       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "kisisel_site_url" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "linkedin_url"     VARCHAR(200);

-- "Açıklamalar / katkı sağlayabileceği şeyler".
--
-- Başvurudaki `beyan` sütununun yerine GEÇMEZ: beyan, onay kararının verildiği
-- dondurulmuş belgedir ve karar sonrası değişmemelidir. Bu alan kişinin
-- bugünkü hâlidir; kendisi günceller, profilinde görünür.
ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "aciklama" TEXT;

-- Kurum ve görev.
--
-- PAYDAŞ ENVANTERİNE (paydas tablosu) BAĞLANMADI ve bu bilinçli: envanter,
-- etkinliklerde iş birliği yapılan kurumların kaydıdır, il koordinatörlerince
-- yönetilir ve serbest metin girişine kapalıdır (S18). Mezunun çalıştığı
-- şirketin oraya girmesi gerekmiyor; oysa profilinde "nerede, ne iş yapıyor"
-- yazması isteğin ta kendisi.
--
-- Başvuruda seçilmiş paydaş kurumu ve görev unvanı SİLİNMİYOR: bu alanlar
-- boşken profil onları gösteriyor, kişi kendi değerini yazınca yenisi geçerli
-- oluyor (bkz. app/panel/profil/page.tsx).
ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "kurum_adi"    VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "gorev_unvani" VARCHAR(150);

-- ---------------------------------------------------------------------------
-- 2. Destek verilebilecek çalışma grupları
-- ---------------------------------------------------------------------------
-- MENTÖRLÜKTEN AYRI TABLO. `mentorluk_calisma_grubu` onaya tabi bir GÖREVİN
-- kapsamıdır ve öğrenciyle birebir yazışma hakkı doğurur; burası yalnızca bir
-- beyandır: "bu alanlarda katkı verebilirim" — sponsorluk, mekân, eğitmen,
-- ödül desteği de olabilir. Tek tabloda tutulsalardı mentörlüğü bırakan kişi
-- destek alanlarını da kaybederdi ve panodaki mentör süzgeci, mentör olmayan
-- paydaşları da yakalardı.
--
-- `ogrenci_calisma_grubu`dan da ayrı: o tablo öğrencinin hangi grupta
-- çalıştığını söyler ve danışman/koordinatör ekranlarının kaynağıdır. Dış
-- kullanıcıyı oraya yazmak, öğrenci listelerine yetişkin karıştırırdı.
--
-- ONAY YOK: seçim kişinin kendi beyanı ve kimseye erişim açmıyor.
CREATE TABLE IF NOT EXISTS "kullanici_destek_grubu" (
  "kullanici_id"     INTEGER NOT NULL,
  "calisma_grubu_id" INTEGER NOT NULL,
  "eklenme_tarihi"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "kullanici_destek_grubu_pkey"
    PRIMARY KEY ("kullanici_id", "calisma_grubu_id"),
  -- Kullanıcı silinirse beyanı da gider: kaydın kendi başına bir anlamı yok.
  CONSTRAINT "kullanici_destek_grubu_kullanici_id_fkey"
    FOREIGN KEY ("kullanici_id") REFERENCES "kullanici"("id") ON DELETE CASCADE,
  -- Çalışma grubu SİLİNMEZ, pasife alınır; RESTRICT bunu şemayla garanti eder.
  CONSTRAINT "kullanici_destek_grubu_calisma_grubu_id_fkey"
    FOREIGN KEY ("calisma_grubu_id") REFERENCES "calisma_grubu"("id")
);

-- "Bu gruba kimler destek verebilir" sorgusu için: birincil anahtar
-- kullanıcıdan başladığı için grup tarafı indekssiz kalırdı.
CREATE INDEX IF NOT EXISTS "kullanici_destek_grubu_calisma_grubu_id_idx"
  ON "kullanici_destek_grubu" ("calisma_grubu_id");
