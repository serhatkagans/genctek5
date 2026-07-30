-- Öğrenci profilinin genişletilmesi: kazanım kayıtları, CV ve çalışma grubuna
-- danışman/koordinatör/yönetici eliyle ekleme.
--
-- Kapsam dosyasında (references/domain-rules.md Bölüm 14) sayılan profil
-- bölümleri veri modelinde eksikti: öğrenci GençTek dışı etkinliklerini,
-- ürünlerini, verdiği akran eğitimlerini ve derece aldığı yarışmaları hiçbir
-- ekrandan giremiyordu; CV'sini de yükleyemiyordu.
--
-- YENİ TABLO AÇILMADI: kazanım kayıtları için `ogrenci_kazanim` zaten vardı,
-- yalnızca eksik alanları eklendi (domain-rules.md Bölüm 13'ün açık talimatı).

-- ---------------------------------------------------------------------------
-- 1. Kazanım kaydına derece, düzenleyen ve giriş tarihi
-- ---------------------------------------------------------------------------
-- `derece` serbest metindir: "Türkiye 1.si", "Bölge 3.sü", "Mansiyon" gibi
-- adlandırma yarışmadan yarışmaya değişiyor, sabit liste tutulmuyor.
--
-- `olusturma_tarihi` sıralama için gerekli: kullanıcının girdiği `tarih` boş
-- olabildiği için tek başına listeleme ölçütü olamıyor. Mevcut satırlarda
-- gerçek giriş anı bilinmediğinden varsayılan now() ile doldurulur.
ALTER TABLE "ogrenci_kazanim"
  ADD COLUMN IF NOT EXISTS "derece" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "duzenleyen" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "olusturma_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- 2. Öğrenci CV'si
-- ---------------------------------------------------------------------------
-- CV, faaliyet ekleriyle AYNI depolama soyutlamasını kullanır: diskteki ad
-- üretilir (`cv_depolama_yolu` bir anahtardır, dosya yolu değildir), orijinal
-- ad yalnızca indirirken gösterilmek üzere veritabanında durur.
--
-- Tek kayıt tutulur: yeni yükleme eskisinin yerine geçer. İstenen "güncel CV",
-- sürüm arşivi değil.
ALTER TABLE "ogrenci_profil"
  ADD COLUMN IF NOT EXISTS "cv_dosya_adi" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "cv_depolama_yolu" TEXT,
  ADD COLUMN IF NOT EXISTS "cv_mime_tipi" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "cv_boyut_bayt" BIGINT,
  ADD COLUMN IF NOT EXISTS "cv_yuklenme_tarihi" TIMESTAMPTZ(6);

-- Alanlar birlikte dolar ya da birlikte boşalır. Kısmi dolu bir satır
-- "dosyası olmayan CV" ya da "adı olmayan dosya" demek olurdu; indirme
-- endpoint'i böyle bir kayıtta sessizce 404 döndürerek hatayı gizlerdi.
ALTER TABLE "ogrenci_profil" DROP CONSTRAINT IF EXISTS "ck_ogrenci_profil_cv";
ALTER TABLE "ogrenci_profil" ADD CONSTRAINT "ck_ogrenci_profil_cv"
  CHECK (
    (
      "cv_depolama_yolu" IS NULL
      AND "cv_dosya_adi" IS NULL
      AND "cv_mime_tipi" IS NULL
      AND "cv_boyut_bayt" IS NULL
      AND "cv_yuklenme_tarihi" IS NULL
    )
    OR (
      "cv_depolama_yolu" IS NOT NULL
      AND "cv_dosya_adi" IS NOT NULL
      AND "cv_mime_tipi" IS NOT NULL
      AND "cv_boyut_bayt" IS NOT NULL
      AND "cv_yuklenme_tarihi" IS NOT NULL
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Çalışma grubu seçimini kimin yaptığı
-- ---------------------------------------------------------------------------
-- Grubu artık yalnızca öğrenci seçmiyor: danışmanı, il koordinatörü ve proje
-- yöneticisi de öğrencinin profilinden ekleyebiliyor. NULL, seçimin öğrencinin
-- kendisine ait olduğu anlamına gelir — mevcut satırların hepsi böyledir.
--
-- Alan YETKİ KARARINDA KULLANILMAZ; yalnızca öğrenci "bu grubu kim ekledi"
-- sorusunun cevabını görebilsin diye tutulur.
ALTER TABLE "ogrenci_calisma_grubu"
  ADD COLUMN IF NOT EXISTS "ekleyen_kullanici_id" INTEGER;

ALTER TABLE "ogrenci_calisma_grubu"
  DROP CONSTRAINT IF EXISTS "ogrenci_calisma_grubu_ekleyen_kullanici_id_fkey";
ALTER TABLE "ogrenci_calisma_grubu" ADD CONSTRAINT "ogrenci_calisma_grubu_ekleyen_kullanici_id_fkey"
  FOREIGN KEY ("ekleyen_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 4. CV yükleme sınırları
-- ---------------------------------------------------------------------------
-- Faaliyet eklerinin belge ayarlarından AYRI tutuluyor: CV'de doc/docx kabul
-- ediliyor, faaliyet ekinde edilmiyor. Ortak ayar kullanılsaydı CV için
-- doc/docx açmak faaliyet eklerini de açardı.
INSERT INTO "sistem_ayari" ("anahtar", "deger", "aciklama") VALUES
  (
    'IZINLI_CV_TIPLERI',
    'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Öğrencinin CV olarak yükleyebileceği MIME tipleri (pdf, doc, docx).'
  ),
  (
    'CV_MAKS_BAYT',
    '5242880',
    'Öğrenci CV''si için üst boyut sınırı. 5 MB = 5242880.'
  )
ON CONFLICT ("anahtar") DO NOTHING;
