-- GençTek Market — görüntülenme ve bağlantı sayaçları (I).
--
-- İSTEK:
--   "Yeni Sekme: 'Ürünlerim' GençTek Market
--    Ürün Listele: Kendi Ürünlerim, Öğrenci ürünleri, Öğretmen Ürünleri,
--    DİLİM vb
--    Ürünlerin görüntülenme sayıları, indirilme sayıları görüntülenecek
--    Ürün Ekle: 'Profilden ekleyebilirsiniz' notu girilecek"
--
-- ===========================================================================
-- "İNDİRİLME SAYISI" — İNDİRİLECEK BİR ŞEY YOK
-- ===========================================================================
-- Ürünlerde DOSYA YÜKLEME KAPSAM DIŞI bırakılmıştı; istek listesinin kendi
-- ifadesi: "Şimdilik sadece tanıtım yapsınlar" (D5 · K bölümü). Ürün kaydının
-- taşıdığı şey tanıtım metni, görseller ve BAĞLANTILAR — indirilebilir bir
-- dosya değil. Dolayısıyla "indirilme" diye sayılabilecek bir olay bugün
-- sistemde YOKTUR.
--
-- Üç yol vardı:
--   (a) Sayacı hiç koymamak — istekte açıkça isteniyor, atlanamaz.
--   (b) Koyup her üründe 0 göstermek — ekranda bozuk görünen ölü bir sayı.
--   (c) Ölçülebilen en yakın olayı saymak: ürünün bağlantısına GİDİLMESİ.
--
-- (c) seçildi. Kullanıcı bir ürünü edinmek istediğinde yaptığı şey tam olarak
-- budur: deposuna, canlı sürümüne ya da tanıtım videosuna gider. Sütun adı
-- gerçeği söylüyor (`baglanti_tiklamasi`), ekran da "İndirilme" demiyor.
-- Dosya yükleme açılırsa gerçek indirme ayrı bir sütun olur ve bu sayaç
-- anlamını korur.
--
-- → SORULAR.md · S22 hâlâ açık: "indirilme sayısı neyi sayacak" sorusunun
--   cevabı gelirse değişecek tek yer bu iki sütun ve market ekranıdır.

-- ---------------------------------------------------------------------------
-- 1. Sayaçlar
-- ---------------------------------------------------------------------------
-- AYRI TABLO AÇILMADI. "Her görüntülemeyi satır olarak tut" (kim, ne zaman)
-- daha zengin olurdu ama market ekranının ihtiyacı tek bir sayı ve o tasarım,
-- popüler bir üründe milyonlarca satır demekti. Kim neye baktı bilgisi zaten
-- erişim logunda duruyor; oradan sayılabilir. Buradaki sütunlar VİTRİN
-- SAYAÇLARIDIR, denetim kaydı değil.
ALTER TABLE "kullanici_kazanim"
  ADD COLUMN IF NOT EXISTS "goruntulenme_sayisi" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "kullanici_kazanim"
  ADD COLUMN IF NOT EXISTS "baglanti_tiklamasi" INTEGER NOT NULL DEFAULT 0;

-- Negatif sayaç bir hata belirtisidir; sessizce yaşamasın.
ALTER TABLE "kullanici_kazanim"
  DROP CONSTRAINT IF EXISTS "ck_kazanim_sayaclar_negatif_degil";
ALTER TABLE "kullanici_kazanim"
  ADD CONSTRAINT "ck_kazanim_sayaclar_negatif_degil"
  CHECK ("goruntulenme_sayisi" >= 0 AND "baglanti_tiklamasi" >= 0);

-- ---------------------------------------------------------------------------
-- 2. Market listesinin dizini
-- ---------------------------------------------------------------------------
-- Market yalnızca tip=URUN ve markette_paylasilsin=true kayıtları listeliyor.
-- Kısmi dizin, kazanım tablosunun tamamını (her tipten kayıt) taramaktan
-- kurtarır; ürünler o tablonun küçük bir azınlığı.
CREATE INDEX IF NOT EXISTS "kullanici_kazanim_market_idx"
  ON "kullanici_kazanim" ("olusturma_tarihi" DESC)
  WHERE "tip" = 'URUN' AND "markette_paylasilsin" = true;

-- ---------------------------------------------------------------------------
-- 3. SAHİBİNİN KENDİ GÖRÜNTÜLEMESİ SAYILMAZ
-- ---------------------------------------------------------------------------
-- Kısıt veritabanında değil uygulama katmanında (bkz.
-- app/panel/urunler/[id]/page.tsx): kendi ürününü açan kişi sayacı
-- artırmıyor. Şemada ifade edilemez çünkü sayacı artıran şey bir INSERT değil,
-- bir sayfa görüntülemesi.
--
-- Gerekçe: sayaç bir VİTRİN sayısı ve sahibinin kendi sayfasını yenilemesiyle
-- şişebilseydi ürünler arası karşılaştırma anlamını yitirirdi.
--
-- TEKİLLEŞTİRME YOK: aynı kişi iki kez bakarsa iki sayılır. Tekil ziyaretçi
-- saymak, kişi başına görüntüleme kaydı tutmayı (yukarıda elenen tasarım) ya
-- da çerez/oturum işaretlemesi gerektirirdi; vitrin sayacı için bu maliyet
-- gereksiz.
