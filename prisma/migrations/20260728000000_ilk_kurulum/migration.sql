-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RolKodu" AS ENUM ('OGRENCI', 'DANISMAN', 'IL_KOORDINATOR', 'PROJE_YONETICISI');

-- CreateEnum
CREATE TYPE "AtamaTipi" AS ENUM ('OGRENCI_SECTI', 'OTOMATIK', 'IL_KOORDINATOR_FALLBACK', 'DEVIR');

-- CreateEnum
CREATE TYPE "KapanmaNedeni" AS ENUM ('OGRETMEN_AYRILDI', 'OGRENCI_OKUL_DEGISTIRDI', 'YENIDEN_SECIM', 'DEVIR', 'DANISMANLIK_BIRAKILDI');

-- CreateEnum
CREATE TYPE "GorevRolKodu" AS ENUM ('IL_YONETICISI', 'OKUL_TEMSILCISI');

-- CreateEnum
CREATE TYPE "KazanimTipi" AS ENUM ('DIS_ETKINLIK', 'URUN', 'AKRAN_EGITIMI', 'YARISMA_DERECESI');

-- CreateEnum
CREATE TYPE "Kapsam" AS ENUM ('OKUL', 'IL', 'ULUSAL');

-- CreateEnum
CREATE TYPE "OnayDurumu" AS ENUM ('ONAY_GEREKMEZ', 'BEKLIYOR', 'ONAYLANDI', 'REDDEDILDI');

-- CreateEnum
CREATE TYPE "BasvuruDurumu" AS ENUM ('BEKLIYOR', 'SECILDI', 'REDDEDILDI', 'YEDEK', 'GERI_CEKILDI');

-- CreateEnum
CREATE TYPE "LogIslemi" AS ENUM ('GORUNTULEME', 'DEGISIKLIK', 'SILME');

-- CreateEnum
CREATE TYPE "LogHedefTip" AS ENUM ('OGRENCI', 'OGRETMEN', 'FAALIYET', 'YORUM', 'FAALIYET_EK', 'BASVURU', 'ROL', 'DANISMAN_ATAMA', 'PROFIL');

-- CreateEnum
CREATE TYPE "GonderimKanali" AS ENUM ('EPOSTA', 'SMS', 'SISTEM');

-- CreateTable
CREATE TABLE "il" (
    "il_kodu" CHAR(2) NOT NULL,
    "ad" VARCHAR(100) NOT NULL,

    CONSTRAINT "il_pkey" PRIMARY KEY ("il_kodu")
);

-- CreateTable
CREATE TABLE "ilce" (
    "ilce_kodu" CHAR(4) NOT NULL,
    "il_kodu" CHAR(2) NOT NULL,
    "ad" VARCHAR(100) NOT NULL,

    CONSTRAINT "ilce_pkey" PRIMARY KEY ("ilce_kodu")
);

-- CreateTable
CREATE TABLE "kurum" (
    "kurum_kodu" INTEGER NOT NULL,
    "ad" VARCHAR(250) NOT NULL,
    "il_kodu" CHAR(2) NOT NULL,
    "ilce_kodu" CHAR(4) NOT NULL,
    "okul_turu" VARCHAR(120) NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "kurum_pkey" PRIMARY KEY ("kurum_kodu")
);

-- CreateTable
CREATE TABLE "kullanici" (
    "id" SERIAL NOT NULL,
    "auth_provider_id" VARCHAR(64) NOT NULL,
    "ad" VARCHAR(100) NOT NULL,
    "soyad" VARCHAR(100) NOT NULL,
    "cinsiyet" CHAR(1) NOT NULL,
    "kurum_kodu" INTEGER,
    "il_kodu" CHAR(2),
    "ilce_kodu" CHAR(4),
    "sinif" VARCHAR(10),
    "brans" VARCHAR(100),
    "egitim_ogretim_yili" VARCHAR(9) NOT NULL,
    "son_senkron_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturma_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kullanici_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kullanici_rol" (
    "id" SERIAL NOT NULL,
    "kullanici_id" INTEGER NOT NULL,
    "rol_kodu" "RolKodu" NOT NULL,
    "il_kodu" CHAR(2),
    "kurum_kodu" INTEGER,
    "baslangic_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis_tarihi" TIMESTAMPTZ(6),
    "atayan_kullanici_id" INTEGER,

    CONSTRAINT "kullanici_rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ogretmen_profil" (
    "kullanici_id" INTEGER NOT NULL,
    "danisman_olmak_istiyor" BOOLEAN NOT NULL DEFAULT false,
    "isaretleme_tarihi" TIMESTAMPTZ(6),

    CONSTRAINT "ogretmen_profil_pkey" PRIMARY KEY ("kullanici_id")
);

-- CreateTable
CREATE TABLE "danisman_atama" (
    "id" SERIAL NOT NULL,
    "ogrenci_id" INTEGER NOT NULL,
    "danisman_kullanici_id" INTEGER NOT NULL,
    "atama_tipi" "AtamaTipi" NOT NULL,
    "baslangic_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis_tarihi" TIMESTAMPTZ(6),
    "kapanma_nedeni" "KapanmaNedeni",

    CONSTRAINT "danisman_atama_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calisma_grubu" (
    "id" SERIAL NOT NULL,
    "ad" VARCHAR(150) NOT NULL,
    "sira_no" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "calisma_grubu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ogrenci_calisma_grubu" (
    "ogrenci_id" INTEGER NOT NULL,
    "calisma_grubu_id" INTEGER NOT NULL,
    "secim_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ogrenci_calisma_grubu_pkey" PRIMARY KEY ("ogrenci_id","calisma_grubu_id")
);

-- CreateTable
CREATE TABLE "ogrenci_profil" (
    "kullanici_id" INTEGER NOT NULL,
    "eposta" VARCHAR(150),
    "telefon" VARCHAR(20),
    "aydinlatma_metni_onay_tarihi" TIMESTAMPTZ(6),

    CONSTRAINT "ogrenci_profil_pkey" PRIMARY KEY ("kullanici_id")
);

-- CreateTable
CREATE TABLE "ogrenci_gorev_rolu" (
    "id" SERIAL NOT NULL,
    "ogrenci_id" INTEGER NOT NULL,
    "rol_kodu" "GorevRolKodu" NOT NULL,
    "egitim_ogretim_yili" VARCHAR(9) NOT NULL,
    "il_kodu" CHAR(2),
    "kurum_kodu" INTEGER,
    "atayan_kullanici_id" INTEGER NOT NULL,
    "atama_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ogrenci_gorev_rolu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ogrenci_kazanim" (
    "id" SERIAL NOT NULL,
    "ogrenci_id" INTEGER NOT NULL,
    "tip" "KazanimTipi" NOT NULL,
    "baslik" VARCHAR(250) NOT NULL,
    "aciklama" TEXT,
    "tarih" TIMESTAMPTZ(6),
    "baglanti_url" TEXT,

    CONSTRAINT "ogrenci_kazanim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faaliyet" (
    "id" SERIAL NOT NULL,
    "ad" VARCHAR(250) NOT NULL,
    "aciklama" TEXT NOT NULL,
    "tarih" TIMESTAMPTZ(6) NOT NULL,
    "kapsam" "Kapsam" NOT NULL,
    "kurum_kodu" INTEGER,
    "il_kodu" CHAR(2),
    "ilce_kodu" CHAR(4),
    "kontenjan" INTEGER NOT NULL,
    "duzenleyen_kullanici_id" INTEGER NOT NULL,
    "duzenleyen_birim" VARCHAR(200) NOT NULL,
    "onay_durumu" "OnayDurumu" NOT NULL DEFAULT 'ONAY_GEREKMEZ',
    "onaylayan_kullanici_id" INTEGER,
    "onay_tarihi" TIMESTAMPTZ(6),
    "basvuru_baslangic" TIMESTAMPTZ(6) NOT NULL,
    "basvuru_bitis" TIMESTAMPTZ(6) NOT NULL,
    "olusturma_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faaliyet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faaliyet_calisma_grubu" (
    "faaliyet_id" INTEGER NOT NULL,
    "calisma_grubu_id" INTEGER NOT NULL,

    CONSTRAINT "faaliyet_calisma_grubu_pkey" PRIMARY KEY ("faaliyet_id","calisma_grubu_id")
);

-- CreateTable
CREATE TABLE "faaliyet_ek" (
    "id" SERIAL NOT NULL,
    "faaliyet_id" INTEGER NOT NULL,
    "yukleyen_kullanici_id" INTEGER NOT NULL,
    "dosya_adi" VARCHAR(255) NOT NULL,
    "depolama_yolu" TEXT NOT NULL,
    "mime_tipi" VARCHAR(100) NOT NULL,
    "boyut_bayt" BIGINT NOT NULL,
    "yuklenme_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "silindi_mi" BOOLEAN NOT NULL DEFAULT false,
    "silen_kullanici_id" INTEGER,
    "silinme_tarihi" TIMESTAMPTZ(6),

    CONSTRAINT "faaliyet_ek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yorum" (
    "id" SERIAL NOT NULL,
    "faaliyet_id" INTEGER NOT NULL,
    "yazan_kullanici_id" INTEGER NOT NULL,
    "ust_yorum_id" INTEGER,
    "icerik" TEXT NOT NULL,
    "olusturma_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "silindi_mi" BOOLEAN NOT NULL DEFAULT false,
    "silen_kullanici_id" INTEGER,
    "silinme_tarihi" TIMESTAMPTZ(6),

    CONSTRAINT "yorum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "basvuru" (
    "id" SERIAL NOT NULL,
    "faaliyet_id" INTEGER NOT NULL,
    "ogrenci_id" INTEGER NOT NULL,
    "gerekce" TEXT NOT NULL,
    "durum" "BasvuruDurumu" NOT NULL DEFAULT 'BEKLIYOR',
    "basvuru_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geri_cekme_tarihi" TIMESTAMPTZ(6),
    "degerlendiren_kullanici_id" INTEGER,
    "degerlendirme_tarihi" TIMESTAMPTZ(6),

    CONSTRAINT "basvuru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erisim_logu" (
    "id" SERIAL NOT NULL,
    "kullanici_id" INTEGER NOT NULL,
    "islem" "LogIslemi" NOT NULL,
    "hedef_tip" "LogHedefTip" NOT NULL,
    "hedef_id" VARCHAR(64) NOT NULL,
    "tarih" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_adresi" VARCHAR(64),
    "detay" TEXT,

    CONSTRAINT "erisim_logu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bildirim" (
    "id" SERIAL NOT NULL,
    "kullanici_id" INTEGER NOT NULL,
    "tip" VARCHAR(60) NOT NULL,
    "baslik" VARCHAR(200) NOT NULL,
    "icerik" TEXT NOT NULL,
    "okundu_mu" BOOLEAN NOT NULL DEFAULT false,
    "gonderim_kanali" "GonderimKanali" NOT NULL DEFAULT 'SISTEM',
    "olusturma_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bildirim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bildirim_sablonu" (
    "id" SERIAL NOT NULL,
    "kod" VARCHAR(60) NOT NULL,
    "konu" VARCHAR(200) NOT NULL,
    "govde_sablonu" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bildirim_sablonu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sistem_ayari" (
    "anahtar" VARCHAR(80) NOT NULL,
    "deger" TEXT NOT NULL,
    "aciklama" TEXT,
    "guncelleme_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sistem_ayari_pkey" PRIMARY KEY ("anahtar")
);

-- CreateIndex
CREATE INDEX "ilce_il_kodu_idx" ON "ilce"("il_kodu");

-- CreateIndex
CREATE INDEX "kurum_il_kodu_idx" ON "kurum"("il_kodu");

-- CreateIndex
CREATE INDEX "kurum_ilce_kodu_idx" ON "kurum"("ilce_kodu");

-- CreateIndex
CREATE UNIQUE INDEX "kullanici_auth_provider_id_key" ON "kullanici"("auth_provider_id");

-- CreateIndex
CREATE INDEX "kullanici_kurum_kodu_idx" ON "kullanici"("kurum_kodu");

-- CreateIndex
CREATE INDEX "kullanici_il_kodu_idx" ON "kullanici"("il_kodu");

-- CreateIndex
CREATE INDEX "kullanici_rol_kullanici_id_bitis_tarihi_idx" ON "kullanici_rol"("kullanici_id", "bitis_tarihi");

-- CreateIndex
CREATE INDEX "kullanici_rol_rol_kodu_il_kodu_idx" ON "kullanici_rol"("rol_kodu", "il_kodu");

-- CreateIndex
CREATE INDEX "kullanici_rol_rol_kodu_kurum_kodu_idx" ON "kullanici_rol"("rol_kodu", "kurum_kodu");

-- CreateIndex
CREATE INDEX "danisman_atama_ogrenci_id_bitis_tarihi_idx" ON "danisman_atama"("ogrenci_id", "bitis_tarihi");

-- CreateIndex
CREATE INDEX "danisman_atama_danisman_kullanici_id_bitis_tarihi_idx" ON "danisman_atama"("danisman_kullanici_id", "bitis_tarihi");

-- CreateIndex
CREATE UNIQUE INDEX "calisma_grubu_ad_key" ON "calisma_grubu"("ad");

-- CreateIndex
CREATE INDEX "ogrenci_gorev_rolu_ogrenci_id_idx" ON "ogrenci_gorev_rolu"("ogrenci_id");

-- CreateIndex
CREATE INDEX "ogrenci_kazanim_ogrenci_id_idx" ON "ogrenci_kazanim"("ogrenci_id");

-- CreateIndex
CREATE INDEX "faaliyet_kapsam_onay_durumu_idx" ON "faaliyet"("kapsam", "onay_durumu");

-- CreateIndex
CREATE INDEX "faaliyet_kurum_kodu_idx" ON "faaliyet"("kurum_kodu");

-- CreateIndex
CREATE INDEX "faaliyet_il_kodu_idx" ON "faaliyet"("il_kodu");

-- CreateIndex
CREATE INDEX "faaliyet_duzenleyen_kullanici_id_idx" ON "faaliyet"("duzenleyen_kullanici_id");

-- CreateIndex
CREATE INDEX "faaliyet_ek_faaliyet_id_silindi_mi_idx" ON "faaliyet_ek"("faaliyet_id", "silindi_mi");

-- CreateIndex
CREATE INDEX "yorum_faaliyet_id_olusturma_tarihi_idx" ON "yorum"("faaliyet_id", "olusturma_tarihi");

-- CreateIndex
CREATE INDEX "basvuru_faaliyet_id_durum_idx" ON "basvuru"("faaliyet_id", "durum");

-- CreateIndex
CREATE INDEX "basvuru_ogrenci_id_idx" ON "basvuru"("ogrenci_id");

-- CreateIndex
CREATE INDEX "erisim_logu_kullanici_id_tarih_idx" ON "erisim_logu"("kullanici_id", "tarih");

-- CreateIndex
CREATE INDEX "erisim_logu_hedef_tip_hedef_id_idx" ON "erisim_logu"("hedef_tip", "hedef_id");

-- CreateIndex
CREATE INDEX "bildirim_kullanici_id_okundu_mu_idx" ON "bildirim"("kullanici_id", "okundu_mu");

-- CreateIndex
CREATE UNIQUE INDEX "bildirim_sablonu_kod_key" ON "bildirim_sablonu"("kod");

-- AddForeignKey
ALTER TABLE "ilce" ADD CONSTRAINT "ilce_il_kodu_fkey" FOREIGN KEY ("il_kodu") REFERENCES "il"("il_kodu") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kurum" ADD CONSTRAINT "kurum_il_kodu_fkey" FOREIGN KEY ("il_kodu") REFERENCES "il"("il_kodu") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kurum" ADD CONSTRAINT "kurum_ilce_kodu_fkey" FOREIGN KEY ("ilce_kodu") REFERENCES "ilce"("ilce_kodu") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kullanici" ADD CONSTRAINT "kullanici_kurum_kodu_fkey" FOREIGN KEY ("kurum_kodu") REFERENCES "kurum"("kurum_kodu") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kullanici" ADD CONSTRAINT "kullanici_il_kodu_fkey" FOREIGN KEY ("il_kodu") REFERENCES "il"("il_kodu") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kullanici" ADD CONSTRAINT "kullanici_ilce_kodu_fkey" FOREIGN KEY ("ilce_kodu") REFERENCES "ilce"("ilce_kodu") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kullanici_rol" ADD CONSTRAINT "kullanici_rol_kullanici_id_fkey" FOREIGN KEY ("kullanici_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kullanici_rol" ADD CONSTRAINT "kullanici_rol_atayan_kullanici_id_fkey" FOREIGN KEY ("atayan_kullanici_id") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kullanici_rol" ADD CONSTRAINT "kullanici_rol_il_kodu_fkey" FOREIGN KEY ("il_kodu") REFERENCES "il"("il_kodu") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kullanici_rol" ADD CONSTRAINT "kullanici_rol_kurum_kodu_fkey" FOREIGN KEY ("kurum_kodu") REFERENCES "kurum"("kurum_kodu") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogretmen_profil" ADD CONSTRAINT "ogretmen_profil_kullanici_id_fkey" FOREIGN KEY ("kullanici_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danisman_atama" ADD CONSTRAINT "danisman_atama_ogrenci_id_fkey" FOREIGN KEY ("ogrenci_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danisman_atama" ADD CONSTRAINT "danisman_atama_danisman_kullanici_id_fkey" FOREIGN KEY ("danisman_kullanici_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogrenci_calisma_grubu" ADD CONSTRAINT "ogrenci_calisma_grubu_ogrenci_id_fkey" FOREIGN KEY ("ogrenci_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogrenci_calisma_grubu" ADD CONSTRAINT "ogrenci_calisma_grubu_calisma_grubu_id_fkey" FOREIGN KEY ("calisma_grubu_id") REFERENCES "calisma_grubu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogrenci_profil" ADD CONSTRAINT "ogrenci_profil_kullanici_id_fkey" FOREIGN KEY ("kullanici_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogrenci_gorev_rolu" ADD CONSTRAINT "ogrenci_gorev_rolu_ogrenci_id_fkey" FOREIGN KEY ("ogrenci_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogrenci_gorev_rolu" ADD CONSTRAINT "ogrenci_gorev_rolu_atayan_kullanici_id_fkey" FOREIGN KEY ("atayan_kullanici_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogrenci_gorev_rolu" ADD CONSTRAINT "ogrenci_gorev_rolu_il_kodu_fkey" FOREIGN KEY ("il_kodu") REFERENCES "il"("il_kodu") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogrenci_gorev_rolu" ADD CONSTRAINT "ogrenci_gorev_rolu_kurum_kodu_fkey" FOREIGN KEY ("kurum_kodu") REFERENCES "kurum"("kurum_kodu") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogrenci_kazanim" ADD CONSTRAINT "ogrenci_kazanim_ogrenci_id_fkey" FOREIGN KEY ("ogrenci_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faaliyet" ADD CONSTRAINT "faaliyet_duzenleyen_kullanici_id_fkey" FOREIGN KEY ("duzenleyen_kullanici_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faaliyet" ADD CONSTRAINT "faaliyet_onaylayan_kullanici_id_fkey" FOREIGN KEY ("onaylayan_kullanici_id") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faaliyet" ADD CONSTRAINT "faaliyet_kurum_kodu_fkey" FOREIGN KEY ("kurum_kodu") REFERENCES "kurum"("kurum_kodu") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faaliyet" ADD CONSTRAINT "faaliyet_il_kodu_fkey" FOREIGN KEY ("il_kodu") REFERENCES "il"("il_kodu") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faaliyet" ADD CONSTRAINT "faaliyet_ilce_kodu_fkey" FOREIGN KEY ("ilce_kodu") REFERENCES "ilce"("ilce_kodu") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faaliyet_calisma_grubu" ADD CONSTRAINT "faaliyet_calisma_grubu_faaliyet_id_fkey" FOREIGN KEY ("faaliyet_id") REFERENCES "faaliyet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faaliyet_calisma_grubu" ADD CONSTRAINT "faaliyet_calisma_grubu_calisma_grubu_id_fkey" FOREIGN KEY ("calisma_grubu_id") REFERENCES "calisma_grubu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faaliyet_ek" ADD CONSTRAINT "faaliyet_ek_faaliyet_id_fkey" FOREIGN KEY ("faaliyet_id") REFERENCES "faaliyet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faaliyet_ek" ADD CONSTRAINT "faaliyet_ek_yukleyen_kullanici_id_fkey" FOREIGN KEY ("yukleyen_kullanici_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faaliyet_ek" ADD CONSTRAINT "faaliyet_ek_silen_kullanici_id_fkey" FOREIGN KEY ("silen_kullanici_id") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yorum" ADD CONSTRAINT "yorum_faaliyet_id_fkey" FOREIGN KEY ("faaliyet_id") REFERENCES "faaliyet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yorum" ADD CONSTRAINT "yorum_yazan_kullanici_id_fkey" FOREIGN KEY ("yazan_kullanici_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yorum" ADD CONSTRAINT "yorum_silen_kullanici_id_fkey" FOREIGN KEY ("silen_kullanici_id") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yorum" ADD CONSTRAINT "yorum_ust_yorum_id_fkey" FOREIGN KEY ("ust_yorum_id") REFERENCES "yorum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basvuru" ADD CONSTRAINT "basvuru_faaliyet_id_fkey" FOREIGN KEY ("faaliyet_id") REFERENCES "faaliyet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basvuru" ADD CONSTRAINT "basvuru_ogrenci_id_fkey" FOREIGN KEY ("ogrenci_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basvuru" ADD CONSTRAINT "basvuru_degerlendiren_kullanici_id_fkey" FOREIGN KEY ("degerlendiren_kullanici_id") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erisim_logu" ADD CONSTRAINT "erisim_logu_kullanici_id_fkey" FOREIGN KEY ("kullanici_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bildirim" ADD CONSTRAINT "bildirim_kullanici_id_fkey" FOREIGN KEY ("kullanici_id") REFERENCES "kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- DEĞİŞMEZLER
-- ===========================================================================
-- Buradan aşağısı Prisma şema dilinde ifade edilemeyen kısmi (partial) unique
-- index'ler ve CHECK kısıtlarıdır. Uygulama katmanındaki kontroller eşzamanlı
-- iki isteği kaçırdığı için bu kısıtlar veritabanında durmak ZORUNDADIR.
-- Kaynak: references/data-model.md Bölüm 9, SKILL.md "Değişmezler".
-- Şema değişirse bu blok elle güncellenmelidir; prisma migrate diff üretmez.
-- ===========================================================================

-- Değişmez 1: Bir öğretmen aynı anda hem danışman öğretmen hem il
-- koordinatörü olamaz. Aynı rolün iki kez aktif olmasını da engeller.
CREATE UNIQUE INDEX "ux_kullanici_rol_cakisan"
  ON "kullanici_rol" ("kullanici_id")
  WHERE "bitis_tarihi" IS NULL
    AND "rol_kodu" IN ('DANISMAN', 'IL_KOORDINATOR');

-- Aynı rol aynı kullanıcıda iki kez aktif olamaz.
CREATE UNIQUE INDEX "ux_kullanici_rol_tek_aktif"
  ON "kullanici_rol" ("kullanici_id", "rol_kodu")
  WHERE "bitis_tarihi" IS NULL;

-- Değişmez 2: Bir öğrencinin aynı anda tek aktif danışmanı vardır.
CREATE UNIQUE INDEX "ux_danisman_atama_tek_aktif"
  ON "danisman_atama" ("ogrenci_id")
  WHERE "bitis_tarihi" IS NULL;

-- Değişmez 5: Aynı faaliyete aktif ikinci başvuru yapılamaz. Geri çekilmiş
-- başvurular kısıt dışıdır — kontenjan dolmadıysa yeniden başvurulabilir.
CREATE UNIQUE INDEX "ux_basvuru_tek_aktif"
  ON "basvuru" ("faaliyet_id", "ogrenci_id")
  WHERE "durum" <> 'GERI_CEKILDI';

-- Öğrenci görev rolleri dönem başına tekildir (il başına bir İl Yöneticisi,
-- okul başına bir Okul Temsilcisi).
CREATE UNIQUE INDEX "ux_il_yoneticisi"
  ON "ogrenci_gorev_rolu" ("il_kodu", "egitim_ogretim_yili")
  WHERE "rol_kodu" = 'IL_YONETICISI';

CREATE UNIQUE INDEX "ux_okul_temsilcisi"
  ON "ogrenci_gorev_rolu" ("kurum_kodu", "egitim_ogretim_yili")
  WHERE "rol_kodu" = 'OKUL_TEMSILCISI';

-- Rol kapsamı rolün kendisinden değil bağlı olduğu kurum/ilden gelir:
-- kapsamsız bir danışman veya il koordinatörü kaydı yetki filtresini bozar.
ALTER TABLE "kullanici_rol" ADD CONSTRAINT "ck_kullanici_rol_kapsam"
  CHECK (
    ("rol_kodu" = 'IL_KOORDINATOR' AND "il_kodu" IS NOT NULL)
    OR ("rol_kodu" = 'DANISMAN' AND "kurum_kodu" IS NOT NULL)
    OR "rol_kodu" IN ('OGRENCI', 'PROJE_YONETICISI')
  );

ALTER TABLE "ogrenci_gorev_rolu" ADD CONSTRAINT "ck_ogrenci_gorev_kapsam"
  CHECK (
    ("rol_kodu" = 'IL_YONETICISI' AND "il_kodu" IS NOT NULL)
    OR ("rol_kodu" = 'OKUL_TEMSILCISI' AND "kurum_kodu" IS NOT NULL)
  );

-- Faaliyet kapsamı ile alanların tutarlılığı: okul içi faaliyette kurum kodu,
-- il içi faaliyette il kodu dolu olmalı; ulusal faaliyette ikisi de boş.
ALTER TABLE "faaliyet" ADD CONSTRAINT "ck_faaliyet_kapsam"
  CHECK (
    ("kapsam" = 'OKUL' AND "kurum_kodu" IS NOT NULL)
    OR ("kapsam" = 'IL' AND "il_kodu" IS NOT NULL)
    OR ("kapsam" = 'ULUSAL' AND "kurum_kodu" IS NULL AND "il_kodu" IS NULL)
  );

ALTER TABLE "faaliyet" ADD CONSTRAINT "ck_faaliyet_basvuru_araligi"
  CHECK ("basvuru_bitis" >= "basvuru_baslangic");

ALTER TABLE "faaliyet" ADD CONSTRAINT "ck_faaliyet_kontenjan"
  CHECK ("kontenjan" > 0);

-- Başvuru gerekçesi zorunludur; boşluktan oluşan metin kabul edilmez.
ALTER TABLE "basvuru" ADD CONSTRAINT "ck_basvuru_gerekce_dolu"
  CHECK (length(btrim("gerekce")) > 0);

ALTER TABLE "yorum" ADD CONSTRAINT "ck_yorum_icerik_dolu"
  CHECK (length(btrim("icerik")) > 0);

-- Bir öğrenci kendisinin danışmanı olamaz.
ALTER TABLE "danisman_atama" ADD CONSTRAINT "ck_danisman_atama_farkli_kisi"
  CHECK ("ogrenci_id" <> "danisman_kullanici_id");

-- Kapatılan atamada kapanma nedeni zorunlu, aktif atamada boş olmalı.
ALTER TABLE "danisman_atama" ADD CONSTRAINT "ck_danisman_atama_kapanma"
  CHECK (
    ("bitis_tarihi" IS NULL AND "kapanma_nedeni" IS NULL)
    OR ("bitis_tarihi" IS NOT NULL AND "kapanma_nedeni" IS NOT NULL)
  );

-- Soft delete tutarlılığı: silinen kayıtta silen kullanıcı ve tarih zorunlu
-- (KVKK denetimi için "kim ne zaman sildi" bilgisi kaybolmamalı).
ALTER TABLE "yorum" ADD CONSTRAINT "ck_yorum_silme_izi"
  CHECK (
    ("silindi_mi" = false AND "silen_kullanici_id" IS NULL AND "silinme_tarihi" IS NULL)
    OR ("silindi_mi" = true AND "silen_kullanici_id" IS NOT NULL AND "silinme_tarihi" IS NOT NULL)
  );

ALTER TABLE "faaliyet_ek" ADD CONSTRAINT "ck_faaliyet_ek_silme_izi"
  CHECK (
    ("silindi_mi" = false AND "silen_kullanici_id" IS NULL AND "silinme_tarihi" IS NULL)
    OR ("silindi_mi" = true AND "silen_kullanici_id" IS NOT NULL AND "silinme_tarihi" IS NOT NULL)
  );

-- Bir yorum kendisinin üstü olamaz.
ALTER TABLE "yorum" ADD CONSTRAINT "ck_yorum_kendine_baglanmaz"
  CHECK ("ust_yorum_id" IS NULL OR "ust_yorum_id" <> "id");
