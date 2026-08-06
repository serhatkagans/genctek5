-- EBA dışı giriş: mezun ve paydaş temsilcisi.
--
-- ÖNCEKİ DURUM: sisteme kayıt YOKTU. Kimlik yalnızca AuthProvider'dan (mock,
-- sonra EBA SSO) gelirdi; şifre alanı, kayıt formu ve parola sıfırlama akışı
-- bilinçli olarak hiç yazılmamıştı ("dış kayıt yoktur", açılış ekranında da
-- yazılıydı).
--
-- YENİ DURUM: EBA hesabı olmayan iki grup kendi başvurusunu açar, proje
-- yöneticisi onaylar. İki tablo geliyor ve ikisinin AYRI olması bu göçün
-- taşıdığı asıl karardır:
--
--   1. dis_kullanici_basvurusu — başvurunun kendisi. Onaylanana kadar
--      "kullanici" satırı AÇILMAZ; açılsaydı onaysız kişi kapsam
--      filtrelerine ve envanter sayılarına sızardı.
--   2. dis_kimlik — onaylanmış kişinin şifresi ve kilit durumu. Sistemin
--      şifre tutan tek tablosudur; "kullanici" tablosuna sütun eklenseydi
--      EBA kimlikli her satırda boş bir şifre sütunu dururdu ve "şifresi
--      olmayan giriş yapamaz" garantisi şemadan değil uygulamadan gelirdi.
--
-- YETKİ NOTU: yeni iki rol (MEZUN, PAYDAS_TEMSILCISI) hiçbir kapsam
-- filtresinde varsayılan olarak "görür" tarafına düşmez; kapsam kararları
-- lib/yetki/kapsam.ts içinde açıkça yazılıdır.
--
-- Enum değerleri bir önceki migration'da (20260805150000_dis_giris_enumlari):
-- ALTER TYPE ... ADD VALUE ile eklenen değer aynı transaction'da kullanılamaz.

-- ---------------------------------------------------------------------------
-- 1. Başvuru tablosu
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "dis_kullanici_basvurusu" (
  "id"                     SERIAL PRIMARY KEY,
  "tur"                    "DisKullaniciTuru" NOT NULL,
  "ad"                     VARCHAR(100) NOT NULL,
  "soyad"                  VARCHAR(100) NOT NULL,
  -- Küçük harfe indirgenmiş olarak yazılır (bkz. lib/dis-kimlik/kurallar.ts):
  -- büyük/küçük harf farkı iki ayrı hesap doğurmamalı.
  "eposta"                 VARCHAR(150) NOT NULL,
  "telefon"                VARCHAR(20),
  "il_kodu"                CHAR(2) NOT NULL,
  -- Onayda dis_kimlik'e taşınır ve NULL'lanır; rette de NULL'lanır. Sır,
  -- karara bağlanmış bir başvuru satırında süresiz durmaz.
  "sifre_ozeti"            VARCHAR(200),
  "mezun_kurum_kodu"       INTEGER,
  "mezuniyet_yili"         INTEGER,
  "paydas_id"              INTEGER,
  "gorev_unvani"           VARCHAR(150),
  "beyan"                  TEXT NOT NULL,
  -- Aydınlatma onayı kullanici_onayi'nda TUTULAMAZ: başvuru anında kullanıcı
  -- kaydı yoktur, oysa veri işleme o anda başlar.
  "aydinlatma_onay_tarihi" TIMESTAMPTZ(6) NOT NULL,
  "durum"                  "OnayDurumu" NOT NULL DEFAULT 'BEKLIYOR',
  "karar_veren_kullanici_id" INTEGER,
  "karar_tarihi"           TIMESTAMPTZ(6),
  "ret_gerekcesi"          TEXT,
  "olusan_kullanici_id"    INTEGER,
  "olusturma_tarihi"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "dis_basvuru_il_fkey"
    FOREIGN KEY ("il_kodu") REFERENCES "il"("il_kodu")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dis_basvuru_mezun_kurum_fkey"
    FOREIGN KEY ("mezun_kurum_kodu") REFERENCES "kurum"("kurum_kodu")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dis_basvuru_paydas_fkey"
    FOREIGN KEY ("paydas_id") REFERENCES "paydas"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dis_basvuru_karar_veren_fkey"
    FOREIGN KEY ("karar_veren_kullanici_id") REFERENCES "kullanici"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dis_basvuru_olusan_kullanici_fkey"
    FOREIGN KEY ("olusan_kullanici_id") REFERENCES "kullanici"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,

  -- Bir kullanıcıyı en fazla bir başvuru doğurur.
  CONSTRAINT "dis_basvuru_olusan_kullanici_key" UNIQUE ("olusan_kullanici_id"),

  -- Türe göre zorunluluklar veritabanında duruyor: paydaş temsilcisi serbest
  -- metin kurum adı yazamaz, envanterdeki kayıttan seçer. Uygulama katmanında
  -- da doğrulanıyor ama tek doğruluk kaynağı burasıdır.
  CONSTRAINT "dis_basvuru_tur_alanlari" CHECK (
    ("tur" = 'PAYDAS' AND "paydas_id" IS NOT NULL AND "mezun_kurum_kodu" IS NULL)
    OR
    ("tur" = 'MEZUN' AND "paydas_id" IS NULL)
  ),

  -- Ret gerekçesizse kişi tekrar başvururken neyi düzelteceğini bilemez.
  CONSTRAINT "dis_basvuru_ret_gerekcesi" CHECK (
    "durum" <> 'REDDEDILDI' OR ("ret_gerekcesi" IS NOT NULL AND btrim("ret_gerekcesi") <> '')
  ),

  -- Onaylanan başvuru bir kullanıcı doğurmuş olmak ZORUNDADIR: "onaylandı ama
  -- hesabı açılmadı" durumu sessizce oluşamamalı.
  CONSTRAINT "dis_basvuru_onay_kullanici" CHECK (
    "durum" <> 'ONAYLANDI' OR "olusan_kullanici_id" IS NOT NULL
  ),

  -- Bu akışta ONAY_GEREKMEZ'in karşılığı yok; enum paylaşıldığı için kısıtla
  -- kapatılıyor.
  CONSTRAINT "dis_basvuru_durum_kumesi" CHECK (
    "durum" IN ('BEKLIYOR', 'ONAYLANDI', 'REDDEDILDI')
  ),

  CONSTRAINT "dis_basvuru_bosluk" CHECK (
    btrim("ad") <> '' AND btrim("soyad") <> ''
    AND btrim("eposta") <> '' AND btrim("beyan") <> ''
  )
);

CREATE INDEX IF NOT EXISTS "dis_basvuru_durum_idx"
  ON "dis_kullanici_basvurusu" ("durum", "olusturma_tarihi");
CREATE INDEX IF NOT EXISTS "dis_basvuru_il_idx"
  ON "dis_kullanici_basvurusu" ("il_kodu");
CREATE INDEX IF NOT EXISTS "dis_basvuru_paydas_idx"
  ON "dis_kullanici_basvurusu" ("paydas_id");

-- Aynı e-posta için aynı anda TEK bekleyen başvuru. Kısmi index seçilmesinin
-- sebebi: reddedilen kişi tekrar başvurabilmeli, onaylanan kişinin eski
-- başvurusu da tarihte kalmalı — tam unique kısıt ikisini de engellerdi.
-- (Aynı desen: basvuru tablosundaki aktif başvuru tekilliği.)
CREATE UNIQUE INDEX IF NOT EXISTS "ux_dis_basvuru_bekleyen_eposta"
  ON "dis_kullanici_basvurusu" ("eposta")
  WHERE "durum" = 'BEKLIYOR';

-- ---------------------------------------------------------------------------
-- 2. Giriş kimliği
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "dis_kimlik" (
  "kullanici_id"             INTEGER PRIMARY KEY,
  "eposta"                   VARCHAR(150) NOT NULL,
  -- Biçim: scrypt$N$r$p$tuz$ozet (bkz. lib/dis-kimlik/sifre.ts). Algoritma
  -- parametreleri özetin İÇİNDE: parametreler ileride sertleştirildiğinde eski
  -- özetler doğrulanmaya devam etmeli.
  "sifre_ozeti"              VARCHAR(200) NOT NULL,
  "basarisiz_deneme"         INTEGER NOT NULL DEFAULT 0,
  "kilit_bitis_tarihi"       TIMESTAMPTZ(6),
  -- Jetonun KENDİSİ değil özeti tutulur: veritabanını okuyabilen biri jetonla
  -- hesap ele geçirememeli.
  "sifirlama_jetonu_ozeti"   VARCHAR(200),
  "sifirlama_son_gecerlilik" TIMESTAMPTZ(6),
  "son_giris_tarihi"         TIMESTAMPTZ(6),
  "olusturma_tarihi"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "guncelleme_tarihi"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "dis_kimlik_kullanici_fkey"
    FOREIGN KEY ("kullanici_id") REFERENCES "kullanici"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dis_kimlik_eposta_key" UNIQUE ("eposta"),
  CONSTRAINT "dis_kimlik_bosluk" CHECK (
    btrim("eposta") <> '' AND btrim("sifre_ozeti") <> ''
  )
);
