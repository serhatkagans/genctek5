-- İl bazlı paydaş envanteri, başvurunun katılımcı temeline geçmesi ve
-- bildirimlerin SMS kopyası.
--
-- Üç ayrı eksiği tek migration kapatıyor çünkü üçü de aynı analiz dokümanının
-- (GençTek Kurumsal Bilgi Sistemi) kapatılmamış maddeleridir ve birbirine
-- değiyorlar: faaliyetin "paydaş bilgisi (varsa)" sonuç alanı paydaş tablosunu,
-- "öğretmenler de başvurabilmeli" maddesi başvurunun katılımcı temeline
-- geçmesini gerektiriyor.

-- ---------------------------------------------------------------------------
-- 1. Gönderim durumu enum'unun adı
-- ---------------------------------------------------------------------------
-- Aynı üç değer (GEREKMIYOR/GONDERILDI/BASARISIZ) artık iki kanal için de
-- kullanılıyor; "EpostaDurumu" adı SMS sütununda yanlış olurdu. Enum'u
-- KOPYALAMAK yerine yeniden adlandırıyoruz: iki özdeş enum, ileride birine
-- eklenen değerin öbürüne eklenmesini unutturur.
ALTER TYPE "EpostaDurumu" RENAME TO "GonderimDurumu";

-- ---------------------------------------------------------------------------
-- 2. Bildirimin SMS kopyası
-- ---------------------------------------------------------------------------
-- E-postadan bağımsız izlenir: biri gitmiş öbürü gitmemiş olabilir ve
-- "bildirim ulaşmadı" şikâyetinde hangi kanalın düştüğü bilinmeden bakılacak
-- yer yoktur. Varsayılan GEREKMIYOR, çünkü mevcut kayıtların hiçbirinde SMS
-- denenmedi — bu bir hata değil, o kanalın kapalı olmasıdır.
ALTER TABLE "bildirim"
  ADD COLUMN IF NOT EXISTS "sms_durumu" "GonderimDurumu" NOT NULL DEFAULT 'GEREKMIYOR',
  ADD COLUMN IF NOT EXISTS "sms_hatasi" TEXT;

-- ---------------------------------------------------------------------------
-- 3. Yeni log hedef tipleri
-- ---------------------------------------------------------------------------
-- Paydaş kaydı kişisel veri (yetkili kişi, telefon, e-posta) içerir; kim
-- görüntüledi sorusu diğer envanterlerde olduğu gibi loglanmak zorunda.
-- Bildirim şablonu kişisel veri değildir ama TÜM kullanıcılara giden metni
-- belirler: değiştiren kişinin kayda geçmesi gerekir.
ALTER TYPE "LogHedefTip" ADD VALUE IF NOT EXISTS 'PAYDAS';
ALTER TYPE "LogHedefTip" ADD VALUE IF NOT EXISTS 'BILDIRIM_SABLONU';

-- ---------------------------------------------------------------------------
-- 4. Başvuru: öğrenci değil KATILIMCI
-- ---------------------------------------------------------------------------
-- Analiz dokümanı 4.2: "Öğrenci ve öğretmenler etkinliklere başvurabilmeli" ve
-- "Danışman öğretmen öğrenci adına başvurabilir".
--
-- Sütun YENİDEN ADLANDIRILIYOR, yenisi eklenmiyor: mevcut satırların hepsi
-- geçerli katılım başvurusudur, veri taşınmasına gerek yoktur. Ayrı bir
-- "ogretmen_id" sütunu açmak, her sorguda iki sütundan hangisinin dolu olduğunu
-- sormayı gerektirir ve "tam olarak biri dolu" kısıtını elle korumaya zorlardı.
--
-- Katılımcının öğrenci mi öğretmen mi olduğu SÜTUNDA TUTULMAZ, kişinin aktif
-- rolünden okunur: kopyalanan bir tip alanı, öğrenci mezun olduğunda ya da
-- öğretmen görev değiştirdiğinde eskir.
ALTER TABLE "basvuru" RENAME COLUMN "ogrenci_id" TO "katilimci_id";

ALTER INDEX IF EXISTS "basvuru_ogrenci_id_idx" RENAME TO "basvuru_katilimci_id_idx";

ALTER TABLE "basvuru" RENAME CONSTRAINT "basvuru_ogrenci_id_fkey"
  TO "basvuru_katilimci_id_fkey";

-- Değişmez 5 (aynı faaliyete aktif ikinci başvuru yok) sütun adına bağlıydı;
-- index yeni sütun adıyla yeniden kuruluyor. Geri çekilmiş başvurular kısıt
-- dışında kalmaya devam ediyor.
DROP INDEX IF EXISTS "ux_basvuru_tek_aktif";
CREATE UNIQUE INDEX "ux_basvuru_tek_aktif"
  ON "basvuru" ("faaliyet_id", "katilimci_id")
  WHERE "durum" <> 'GERI_CEKILDI';

-- Vekaleten başvuru: NULL ise başvuruyu katılımcının kendisi yapmıştır.
-- Ayrı bir "başvuru tipi" enum'u tutulmuyor; bu alanın dolu olması zaten
-- vekaleten başvuru demek ve kimin yaptığını da söylüyor.
ALTER TABLE "basvuru"
  ADD COLUMN IF NOT EXISTS "adina_basvuran_kullanici_id" INTEGER;

ALTER TABLE "basvuru"
  DROP CONSTRAINT IF EXISTS "basvuru_adina_basvuran_kullanici_id_fkey";
ALTER TABLE "basvuru" ADD CONSTRAINT "basvuru_adina_basvuran_kullanici_id_fkey"
  FOREIGN KEY ("adina_basvuran_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Kimse kendi adına "vekaleten" başvuramaz: alan dolu olduğunda başvuruyu
-- gerçekten başkası yapmış olmalı, aksi halde ekranlarda "X adına Y başvurdu"
-- satırı kendi kendini gösterirdi.
ALTER TABLE "basvuru" DROP CONSTRAINT IF EXISTS "ck_basvuru_vekalet_baskasi";
ALTER TABLE "basvuru" ADD CONSTRAINT "ck_basvuru_vekalet_baskasi"
  CHECK (
    "adina_basvuran_kullanici_id" IS NULL
    OR "adina_basvuran_kullanici_id" <> "katilimci_id"
  );

-- ---------------------------------------------------------------------------
-- 5. İl bazlı paydaş envanteri
-- ---------------------------------------------------------------------------
-- Analiz dokümanı Bölüm 3. Kayıt İLE bağlıdır ve ilin koordinatörü tarafından
-- yönetilir: paydaş listesinin değeri yerelliğindedir, merkezden tutulan bir
-- kurum listesi il koordinatörünün gerçekten arayabileceği kişiyi göstermez.
CREATE TYPE "PaydasTuru" AS ENUM (
  'UNIVERSITE',
  'OZEL_SEKTOR',
  'STK',
  'KAMU_KURUMU',
  'MESLEK_KURULUSU',
  'BELEDIYE',
  'DIGER'
);

CREATE TABLE "paydas" (
    "id" SERIAL NOT NULL,
    "il_kodu" CHAR(2) NOT NULL,
    "ad" VARCHAR(250) NOT NULL,
    "tur" "PaydasTuru" NOT NULL,
    "yetkili_kisi" VARCHAR(150),
    "eposta" VARCHAR(150),
    "telefon" VARCHAR(20),
    "adres" TEXT,
    "is_birligi_alani" TEXT NOT NULL,
    "notlar" TEXT,
    -- SİLME YOKTUR: iş birliği biten paydaş pasife alınır, geçmiş faaliyetlerin
    -- paydaş bağlantısı bozulmaz.
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "ekleyen_kullanici_id" INTEGER NOT NULL,
    "olusturma_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paydas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "paydas_il_kodu_aktif_idx" ON "paydas"("il_kodu", "aktif");
CREATE INDEX "paydas_tur_idx" ON "paydas"("tur");

ALTER TABLE "paydas" ADD CONSTRAINT "paydas_il_kodu_fkey"
  FOREIGN KEY ("il_kodu") REFERENCES "il"("il_kodu")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "paydas" ADD CONSTRAINT "paydas_ekleyen_kullanici_id_fkey"
  FOREIGN KEY ("ekleyen_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Aynı ilde aynı adla ikinci bir aktif paydaş açılamaz. Kısmi index: pasife
-- alınmış bir kayıt aynı adın yeniden açılmasını engellemez, çünkü kurum
-- gerçekten yeniden iş birliğine dönebilir.
CREATE UNIQUE INDEX "ux_paydas_il_ad_aktif"
  ON "paydas" (LOWER("ad"), "il_kodu")
  WHERE "aktif";

-- İş birliği alanı boş bırakılamaz: adı ve türü olan ama ne için işbirliği
-- yapılacağı yazılmayan bir kayıt, listeyi kalabalıklaştırmaktan başka işe
-- yaramaz (aynı gerekçeyle başvuru gerekçesi de zorunludur).
ALTER TABLE "paydas" ADD CONSTRAINT "ck_paydas_is_birligi_alani_dolu"
  CHECK (LENGTH(TRIM("is_birligi_alani")) > 0);

ALTER TABLE "paydas" ADD CONSTRAINT "ck_paydas_ad_dolu"
  CHECK (LENGTH(TRIM("ad")) > 0);

-- ---------------------------------------------------------------------------
-- 6. Faaliyetin paydaş bilgisi
-- ---------------------------------------------------------------------------
-- Analiz dokümanı 4.3 "Paydaş bilgisi (varsa)". Paydaşın ili faaliyetin iliyle
-- aynı olmak ZORUNDA DEĞİLDİR: ulusal bir faaliyete başka ilden bir üniversite
-- destek verebilir.
CREATE TABLE "faaliyet_paydas" (
    "faaliyet_id" INTEGER NOT NULL,
    "paydas_id" INTEGER NOT NULL,
    "katkisi" VARCHAR(250),
    "ekleme_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faaliyet_paydas_pkey" PRIMARY KEY ("faaliyet_id", "paydas_id")
);

CREATE INDEX "faaliyet_paydas_paydas_id_idx" ON "faaliyet_paydas"("paydas_id");

-- Faaliyet silinirse bağlantı da gider (ekler ve yorumlarla aynı davranış);
-- paydaş silinmez, o yüzden RESTRICT.
ALTER TABLE "faaliyet_paydas" ADD CONSTRAINT "faaliyet_paydas_faaliyet_id_fkey"
  FOREIGN KEY ("faaliyet_id") REFERENCES "faaliyet"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "faaliyet_paydas" ADD CONSTRAINT "faaliyet_paydas_paydas_id_fkey"
  FOREIGN KEY ("paydas_id") REFERENCES "paydas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 7. Bildirim şablonlarının yönetilebilir hâle gelmesi
-- ---------------------------------------------------------------------------
-- Şablonlar zaten veritabanındaydı ama yalnızca seed ile yazılıyordu; artık
-- Yönetim ekranından düzenleniyor. Açıklama alanı, hangi şablonun hangi olayda
-- gittiğini ekranda göstermek için gerekli — kod adı ("BASVURU_SONUCU") tek
-- başına yeterince anlatıcı değil.
ALTER TABLE "bildirim_sablonu"
  ADD COLUMN IF NOT EXISTS "aciklama" TEXT;
