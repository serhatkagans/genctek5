-- Öğrenci paneli genişlemesi: ilçe temsilciliğinin veri karşılığı, profil
-- bağlantı adresleri ve kazanım kayıtlarının yeni alanları.
--
-- Dördü de mevcut kayıtları etkilemez: eklenen sütunların hepsi NULL kabul eder
-- ve hiçbirine varsayılan değer verilmez.

-- ---------------------------------------------------------------------------
-- 1. İlçe temsilciliğinin kapsam sütunu
-- ---------------------------------------------------------------------------
-- ILCE_TEMSILCISI enum değeri bir önceki migration'da eklendi ama KAPSAM
-- SÜTUNU eklenmedi ve ck_ogrenci_gorev_kapsam güncellenmedi. Sonuç: rol kodu
-- tanımlı olmasına rağmen böyle bir satır veritabanına hiç yazılamıyordu, CHECK
-- kısıtı her denemede reddediyordu. Rol ancak bu migration'la kullanılabilir
-- hâle geliyor.
--
-- Kapsam öğrencinin kendi ilçe kodundan OKUNMAZ, kayda yazılır: öğrenci dönem
-- içinde okul (dolayısıyla ilçe) değiştirdiğinde görev verildiği ilçede
-- kalmalıdır, yoksa görev sessizce başka bir ilçeye taşınırdı.
ALTER TABLE "ogrenci_gorev_rolu"
  ADD COLUMN IF NOT EXISTS "ilce_kodu" CHAR(4);

ALTER TABLE "ogrenci_gorev_rolu" DROP CONSTRAINT IF EXISTS "ogrenci_gorev_rolu_ilce_kodu_fkey";
ALTER TABLE "ogrenci_gorev_rolu" ADD CONSTRAINT "ogrenci_gorev_rolu_ilce_kodu_fkey"
  FOREIGN KEY ("ilce_kodu") REFERENCES "ilce"("ilce_kodu") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ogrenci_gorev_rolu_ilce_kodu_idx"
  ON "ogrenci_gorev_rolu"("ilce_kodu");

-- Her rol KENDİ kapsam sütununu doldurmak zorunda. Üç rolün üçü de burada
-- sayılıyor; sayılmayan bir rol kodu eklenirse kısıt onu reddeder ve eksiklik
-- ilk denemede görülür (enum'a değer eklenip kapsamı unutulduğunda yaşanan
-- durum tam olarak buydu).
ALTER TABLE "ogrenci_gorev_rolu" DROP CONSTRAINT IF EXISTS "ck_ogrenci_gorev_kapsam";
ALTER TABLE "ogrenci_gorev_rolu" ADD CONSTRAINT "ck_ogrenci_gorev_kapsam"
  CHECK (
    ("rol_kodu" = 'IL_TEMSILCISI' AND "il_kodu" IS NOT NULL)
    OR ("rol_kodu" = 'ILCE_TEMSILCISI' AND "ilce_kodu" IS NOT NULL)
    OR ("rol_kodu" = 'OKUL_TEMSILCISI' AND "kurum_kodu" IS NOT NULL)
  );

-- İl ve okulda olduğu gibi ilçede de dönem başına tek temsilci bulunur.
CREATE UNIQUE INDEX IF NOT EXISTS "ux_ilce_temsilcisi"
  ON "ogrenci_gorev_rolu" ("ilce_kodu", "egitim_ogretim_yili")
  WHERE "rol_kodu" = 'ILCE_TEMSILCISI';

-- ---------------------------------------------------------------------------
-- 2. Öğrenci profilinin bağlantı adresleri
-- ---------------------------------------------------------------------------
-- GitHub, kişisel site ve LinkedIn; e-posta ve telefonla aynı kategoridedir
-- (kişinin kendi girdiği, e-Okul'dan gelmeyen iletişim bilgisi).
--
-- Tek bir "bağlantılar" metni yerine üç ayrı sütun: ekran her birini kendi
-- adıyla gösteriyor ve tek metinde hangi adresin ne olduğu ayrıştırılamazdı.
-- 200 karakter, gerçek profil adreslerinin çok üstünde bir sınırdır; adresin
-- http/https olduğu uygulama katmanında doğrulanır (bkz.
-- src/lib/ogrenci/iletisim-kurallar.ts) çünkü CHECK kısıtı protokol ayrıştırması
-- yapamaz.
ALTER TABLE "ogrenci_profil"
  ADD COLUMN IF NOT EXISTS "github_url" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "kisisel_site_url" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "linkedin_url" VARCHAR(200);

-- ---------------------------------------------------------------------------
-- 3. Katılım biçimi
-- ---------------------------------------------------------------------------
-- Yalnızca kazanım kayıtlarında sorulur. Faaliyetlerde YOKTUR: faaliyetin yeri
-- kapsamından ve açıklamasından okunuyor, oysa kazanım dışarıdan gelen bir
-- beyandır ve "nerede yapıldı" bilgisi başka hiçbir alandan çıkarılamaz.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KatilimBicimi') THEN
    CREATE TYPE "KatilimBicimi" AS ENUM ('YUZ_YUZE', 'ONLINE', 'KARMA');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 4. Kazanım kaydının yeni alanları
-- ---------------------------------------------------------------------------
-- temel_etkinlik_programi_id: kaydın adı bilinen bir GençTek programından
-- geliyorsa ona işaret eder; "Diğer" seçilip serbest metin yazıldığında boş
-- kalır. Bu durumda bile `baslik` DOLDURULUR (programın adı kopyalanır) —
-- program pasife alındığında ya da adı değiştiğinde öğrencinin geçmiş kaydı
-- okunamaz hâle gelmemeli.
--
-- hedef_kitle: serbest metin. Sabit bir liste akran eğitiminin çeşitliliğini
-- ("9. sınıflar", "veliler", "öğretmenler") taşımıyor.
ALTER TABLE "ogrenci_kazanim"
  ADD COLUMN IF NOT EXISTS "temel_etkinlik_programi_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "katilim_bicimi" "KatilimBicimi",
  ADD COLUMN IF NOT EXISTS "hedef_kitle" VARCHAR(200);

ALTER TABLE "ogrenci_kazanim" DROP CONSTRAINT IF EXISTS "ogrenci_kazanim_temel_etkinlik_programi_id_fkey";
ALTER TABLE "ogrenci_kazanim" ADD CONSTRAINT "ogrenci_kazanim_temel_etkinlik_programi_id_fkey"
  FOREIGN KEY ("temel_etkinlik_programi_id") REFERENCES "temel_etkinlik_programi"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ogrenci_kazanim_temel_etkinlik_programi_id_idx"
  ON "ogrenci_kazanim"("temel_etkinlik_programi_id");
