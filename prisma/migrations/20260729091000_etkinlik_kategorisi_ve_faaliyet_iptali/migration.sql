-- Etkinlik kategorisi, faaliyet iptali ve çalışma grubu üst sınırının
-- kaldırılması.

-- ---------------------------------------------------------------------------
-- 1. Temel Etkinlik / Çalışma Grubu Etkinliği programları
-- ---------------------------------------------------------------------------
-- calisma_grubu tablosuyla aynı mantık: liste koda gömülmez, proje yöneticisi
-- yönetir, SİLME YOKTUR — kapanan program aktif=false yapılır ki geçmiş
-- faaliyetlerin bağlantısı kopmasın.
CREATE TABLE "temel_etkinlik_programi" (
    "id" SERIAL NOT NULL,
    "ad" VARCHAR(200) NOT NULL,
    "grup" "TemelEtkinlikGrubu" NOT NULL,
    "sira_no" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "temel_etkinlik_programi_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "temel_etkinlik_programi_ad_key" ON "temel_etkinlik_programi"("ad");
CREATE INDEX "temel_etkinlik_programi_grup_sira_no_idx" ON "temel_etkinlik_programi"("grup", "sira_no");

-- ---------------------------------------------------------------------------
-- 2. Faaliyete etkinlik kategorisi
-- ---------------------------------------------------------------------------
-- Kategori ZORUNLUDUR. Mevcut satırlar kategorisiz açılmıştı; hepsi
-- IL_ETKINLIGI'ne alınır çünkü adları serbest metin olarak girilmişti ve sabit
-- program listesine karşılık gelmiyorlar. Varsayılan hemen kaldırılıyor:
-- bundan sonra her faaliyet kategorisini açıkça belirtmek zorunda.
ALTER TABLE "faaliyet" ADD COLUMN "etkinlik_kategorisi" "EtkinlikKategorisi" NOT NULL DEFAULT 'IL_ETKINLIGI';
ALTER TABLE "faaliyet" ALTER COLUMN "etkinlik_kategorisi" DROP DEFAULT;

ALTER TABLE "faaliyet" ADD COLUMN "temel_etkinlik_programi_id" INTEGER;

ALTER TABLE "faaliyet" ADD CONSTRAINT "faaliyet_temel_etkinlik_programi_id_fkey"
  FOREIGN KEY ("temel_etkinlik_programi_id") REFERENCES "temel_etkinlik_programi"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "faaliyet_etkinlik_kategorisi_idx" ON "faaliyet"("etkinlik_kategorisi");
CREATE INDEX "faaliyet_temel_etkinlik_programi_id_idx" ON "faaliyet"("temel_etkinlik_programi_id");

-- Program bağlantısı kategoriden türer: adı sabit olan iki kategoride ZORUNLU,
-- il etkinliğinde YASAK (orada faaliyetin ad alanı temayı taşır).
ALTER TABLE "faaliyet" ADD CONSTRAINT "ck_faaliyet_etkinlik_kategorisi"
  CHECK (
    ("etkinlik_kategorisi" = 'IL_ETKINLIGI' AND "temel_etkinlik_programi_id" IS NULL)
    OR ("etkinlik_kategorisi" <> 'IL_ETKINLIGI' AND "temel_etkinlik_programi_id" IS NOT NULL)
  );

-- ---------------------------------------------------------------------------
-- 3. Faaliyet iptali
-- ---------------------------------------------------------------------------
-- İptal SİLME DEĞİLDİR: faaliyet listelerde "İptal edildi" etiketiyle görünür,
-- mevcut yorum ve dosyalar geçmiş kaydı olarak kalır, yalnızca yeni başvuru ve
-- içerik eklenmesi kapanır.
ALTER TABLE "faaliyet" ADD COLUMN "durum" "FaaliyetDurumu" NOT NULL DEFAULT 'AKTIF';
ALTER TABLE "faaliyet" ADD COLUMN "iptal_gerekcesi" TEXT;
ALTER TABLE "faaliyet" ADD COLUMN "iptal_eden_kullanici_id" INTEGER;
ALTER TABLE "faaliyet" ADD COLUMN "iptal_tarihi" TIMESTAMPTZ(6);

ALTER TABLE "faaliyet" ADD CONSTRAINT "faaliyet_iptal_eden_kullanici_id_fkey"
  FOREIGN KEY ("iptal_eden_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- "Kim ne zaman iptal etti" bilgisi kaybolmamalı (yorum/ek silme izindeki
-- kuralın aynısı).
ALTER TABLE "faaliyet" ADD CONSTRAINT "ck_faaliyet_iptal_izi"
  CHECK (
    ("durum" = 'AKTIF' AND "iptal_eden_kullanici_id" IS NULL AND "iptal_tarihi" IS NULL)
    OR ("durum" = 'IPTAL_EDILDI' AND "iptal_eden_kullanici_id" IS NOT NULL AND "iptal_tarihi" IS NOT NULL)
  );

-- İptal edilen faaliyetin başvuruları listelenirken hızlı bulunsun.
CREATE INDEX "faaliyet_durum_idx" ON "faaliyet"("durum");

-- ---------------------------------------------------------------------------
-- 4. Öğrenci çalışma grubu seçim sınırı kaldırıldı
-- ---------------------------------------------------------------------------
-- Öğrenci başına üst sınır YOKTUR; ayarın kendisi anlamsızlaştığı için siliniyor.
DELETE FROM "sistem_ayari" WHERE "anahtar" = 'OGRENCI_CALISMA_GRUBU_UST_SINIRI';
