-- İletişim modülü: talep panosu, bağlantı isteği ve yazışma.
--
-- TASARIMIN TEMELİ: sistemde GİZLİ KANAL YOKTUR. Her mesaj, tarafların
-- danışman öğretmenlerine, illerinin koordinatörlerine ve proje yöneticilerine
-- görünür. Kullanıcıların çoğu 18 yaş altı olduğu için mahremiyet vaadi
-- verilmiyor; verilseydi tutulamazdı. Bu, ekranda kalıcı olarak yazılır ve
-- aydınlatma metninde beyan edilir.

-- ---------------------------------------------------------------------------
-- 1. Talep (ilan) panosu
-- ---------------------------------------------------------------------------
-- Kişiden kişiye temas İÇERMEZ: öğrenci ilan açar, kapsamındakiler görür.
-- Modülün en düşük riskli ve tek başına işe yarayan parçasıdır.
CREATE TABLE IF NOT EXISTS "talep" (
    "id"                SERIAL NOT NULL,
    "acan_kullanici_id" INTEGER NOT NULL,
    "calisma_grubu_id"  INTEGER,
    "baslik"            VARCHAR(200) NOT NULL,
    "icerik"            TEXT NOT NULL,
    -- Panonun çürümemesi için son gün. Süresi dolan ilan listelerde
    -- görünmez ama SİLİNMEZ: kimin ne aradığı geçmiş kaydıdır.
    "son_gecerlilik"    TIMESTAMPTZ(6) NOT NULL,
    "kapatildi_mi"      BOOLEAN NOT NULL DEFAULT false,
    "olusturma_tarihi"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "talep_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "talep" DROP CONSTRAINT IF EXISTS "talep_acan_kullanici_id_fkey";
ALTER TABLE "talep" ADD CONSTRAINT "talep_acan_kullanici_id_fkey"
  FOREIGN KEY ("acan_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "talep" DROP CONSTRAINT IF EXISTS "talep_calisma_grubu_id_fkey";
ALTER TABLE "talep" ADD CONSTRAINT "talep_calisma_grubu_id_fkey"
  FOREIGN KEY ("calisma_grubu_id") REFERENCES "calisma_grubu"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "talep_acan_kullanici_id_idx" ON "talep"("acan_kullanici_id");
CREATE INDEX IF NOT EXISTS "talep_calisma_grubu_id_idx" ON "talep"("calisma_grubu_id");
CREATE INDEX IF NOT EXISTS "talep_kapatildi_mi_son_gecerlilik_idx"
  ON "talep"("kapatildi_mi", "son_gecerlilik");

ALTER TABLE "talep" DROP CONSTRAINT IF EXISTS "ck_talep_metin_dolu";
ALTER TABLE "talep" ADD CONSTRAINT "ck_talep_metin_dolu"
  CHECK (LENGTH(TRIM("baslik")) > 0 AND LENGTH(TRIM("icerik")) > 0);

-- ---------------------------------------------------------------------------
-- 2. Bağlantı isteği
-- ---------------------------------------------------------------------------
-- Öğrenci bir ilana yanıt vermek istediğinde açılır ve ONAY BEKLER. Onaydan
-- önce taraflar birbirinin iletişim bilgisini görmez, yazışma açılmaz.
--
-- Onaylayan, isteği yapanın danışmanı YA DA ilinin koordinatörü olabilir.
-- Yalnızca koordinatöre bırakılsaydı il başına tek kişi yüzlerce isteğin
-- darboğazı olurdu; danışman öğrencisini zaten tanıyor.
CREATE TABLE IF NOT EXISTS "baglanti_istegi" (
    "id"                     SERIAL NOT NULL,
    "talep_id"               INTEGER,
    "isteyen_kullanici_id"   INTEGER NOT NULL,
    "hedef_kullanici_id"     INTEGER NOT NULL,
    "mesaj"                  TEXT NOT NULL,
    "onay_durumu"            "OnayDurumu" NOT NULL DEFAULT 'BEKLIYOR',
    "karar_veren_kullanici_id" INTEGER,
    "karar_tarihi"           TIMESTAMPTZ(6),
    "ret_gerekcesi"          TEXT,
    "olusturma_tarihi"       TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baglanti_istegi_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "baglanti_istegi" DROP CONSTRAINT IF EXISTS "baglanti_istegi_talep_id_fkey";
ALTER TABLE "baglanti_istegi" ADD CONSTRAINT "baglanti_istegi_talep_id_fkey"
  FOREIGN KEY ("talep_id") REFERENCES "talep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "baglanti_istegi" DROP CONSTRAINT IF EXISTS "baglanti_istegi_isteyen_kullanici_id_fkey";
ALTER TABLE "baglanti_istegi" ADD CONSTRAINT "baglanti_istegi_isteyen_kullanici_id_fkey"
  FOREIGN KEY ("isteyen_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "baglanti_istegi" DROP CONSTRAINT IF EXISTS "baglanti_istegi_hedef_kullanici_id_fkey";
ALTER TABLE "baglanti_istegi" ADD CONSTRAINT "baglanti_istegi_hedef_kullanici_id_fkey"
  FOREIGN KEY ("hedef_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "baglanti_istegi" DROP CONSTRAINT IF EXISTS "baglanti_istegi_karar_veren_kullanici_id_fkey";
ALTER TABLE "baglanti_istegi" ADD CONSTRAINT "baglanti_istegi_karar_veren_kullanici_id_fkey"
  FOREIGN KEY ("karar_veren_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "baglanti_istegi_onay_durumu_idx" ON "baglanti_istegi"("onay_durumu");
CREATE INDEX IF NOT EXISTS "baglanti_istegi_hedef_kullanici_id_idx" ON "baglanti_istegi"("hedef_kullanici_id");

-- Kimse kendine bağlantı isteği göndermez.
ALTER TABLE "baglanti_istegi" DROP CONSTRAINT IF EXISTS "ck_baglanti_istegi_farkli_kisi";
ALTER TABLE "baglanti_istegi" ADD CONSTRAINT "ck_baglanti_istegi_farkli_kisi"
  CHECK ("isteyen_kullanici_id" <> "hedef_kullanici_id");

-- Karar verilmişse kim ve ne zaman verdiği yazılı olmalı.
ALTER TABLE "baglanti_istegi" DROP CONSTRAINT IF EXISTS "ck_baglanti_istegi_karari";
ALTER TABLE "baglanti_istegi" ADD CONSTRAINT "ck_baglanti_istegi_karari"
  CHECK (
    "onay_durumu" = 'BEKLIYOR'
    OR ("karar_veren_kullanici_id" IS NOT NULL AND "karar_tarihi" IS NOT NULL)
  );

-- Aynı iki kişi arasında ikinci bir BEKLEYEN istek açılmaz; reddedilmiş ya da
-- onaylanmış olanlar geçmişte kalır.
CREATE UNIQUE INDEX IF NOT EXISTS "ux_baglanti_istegi_bekleyen"
  ON "baglanti_istegi" ("isteyen_kullanici_id", "hedef_kullanici_id")
  WHERE "onay_durumu" = 'BEKLIYOR';

-- ---------------------------------------------------------------------------
-- 3. Yazışma ve mesajlar
-- ---------------------------------------------------------------------------
-- Yazışma, ONAYLANMIŞ bir bağlantı isteğine birebir bağlıdır: bağlantı
-- olmadan yazışma açılamaz. Bu yüzden birincil anahtar isteğin kendisidir.
CREATE TABLE IF NOT EXISTS "yazisma" (
    "baglanti_istegi_id" INTEGER NOT NULL,
    "olusturma_tarihi"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kapatildi_mi"       BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "yazisma_pkey" PRIMARY KEY ("baglanti_istegi_id")
);

ALTER TABLE "yazisma" DROP CONSTRAINT IF EXISTS "yazisma_baglanti_istegi_id_fkey";
ALTER TABLE "yazisma" ADD CONSTRAINT "yazisma_baglanti_istegi_id_fkey"
  FOREIGN KEY ("baglanti_istegi_id") REFERENCES "baglanti_istegi"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "mesaj" (
    "id"                 SERIAL NOT NULL,
    "yazisma_id"         INTEGER NOT NULL,
    "yazan_kullanici_id" INTEGER NOT NULL,
    "icerik"             TEXT NOT NULL,
    -- SİLME YOKTUR, gizleme vardır: içerik korunur çünkü şikâyet
    -- incelemesinde silinmiş bir mesaj en çok ihtiyaç duyulan kayıttır.
    "gizlendi_mi"        BOOLEAN NOT NULL DEFAULT false,
    "gizleyen_kullanici_id" INTEGER,
    "olusturma_tarihi"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mesaj_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "mesaj" DROP CONSTRAINT IF EXISTS "mesaj_yazisma_id_fkey";
ALTER TABLE "mesaj" ADD CONSTRAINT "mesaj_yazisma_id_fkey"
  FOREIGN KEY ("yazisma_id") REFERENCES "yazisma"("baglanti_istegi_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mesaj" DROP CONSTRAINT IF EXISTS "mesaj_yazan_kullanici_id_fkey";
ALTER TABLE "mesaj" ADD CONSTRAINT "mesaj_yazan_kullanici_id_fkey"
  FOREIGN KEY ("yazan_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mesaj" DROP CONSTRAINT IF EXISTS "mesaj_gizleyen_kullanici_id_fkey";
ALTER TABLE "mesaj" ADD CONSTRAINT "mesaj_gizleyen_kullanici_id_fkey"
  FOREIGN KEY ("gizleyen_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "mesaj_yazisma_id_olusturma_tarihi_idx"
  ON "mesaj"("yazisma_id", "olusturma_tarihi");

ALTER TABLE "mesaj" DROP CONSTRAINT IF EXISTS "ck_mesaj_icerik_dolu";
ALTER TABLE "mesaj" ADD CONSTRAINT "ck_mesaj_icerik_dolu"
  CHECK (LENGTH(TRIM("icerik")) > 0);

-- Gizlenen mesajın kim tarafından gizlendiği yazılı olmalı; moderasyon kararı
-- sahipsiz kalmamalı.
ALTER TABLE "mesaj" DROP CONSTRAINT IF EXISTS "ck_mesaj_gizleme_sahibi";
ALTER TABLE "mesaj" ADD CONSTRAINT "ck_mesaj_gizleme_sahibi"
  CHECK ("gizlendi_mi" = false OR "gizleyen_kullanici_id" IS NOT NULL);
