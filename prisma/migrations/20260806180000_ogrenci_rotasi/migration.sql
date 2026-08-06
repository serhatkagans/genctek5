-- "Rotam": öğrencinin hedefleri (D6).
--
-- İSTEK: "Profilim bölümünde 'Rotam' kısmı oluşturulmasını talep ediyoruz.
--         Öğrencinin yapmak istedikleri bu bölümde görüntülenecek. Hedefleri,
--         yapmak istedikleri vb."
--
-- ---------------------------------------------------------------------------
-- NEDEN SERBEST METİN DEĞİL, HEDEF LİSTESİ
-- ---------------------------------------------------------------------------
-- İki biçim mümkündü: (a) tek serbest metin kutusu, (b) her hedefin ayrı satır
-- olduğu liste. (b) seçildi ve bu seçim GERİ DÖNÜŞÜ OLAN yöndür:
--
--   · liste → serbest metin geçişi kayıpsızdır (satırlar alt alta yazılır),
--   · serbest metin → liste geçişi DEĞİLDİR (yazılmış paragraf hedeflere
--     bölünemez; "durum" bilgisi hiç yoktur ve sonradan üretilemez).
--
-- İstekteki "Hedefleri, yapmak istedikleri" ifadesi ÇOĞULDUR ve "Rotam" adı
-- bir yön ile ilerleme ima eder; tek paragraf ilerlemeyi taşıyamaz.
--
-- ---------------------------------------------------------------------------
-- GÖRÜNÜRLÜK
-- ---------------------------------------------------------------------------
-- Bu tablo KİŞİYE ÖZELDİR. Kazanımlardan farkı budur: kazanım "yaptım" beyanıdır
-- ve danışman/koordinatör görür; hedef "yapmak istiyorum" beyanıdır ve istekte
-- kimsenin göreceği YAZMIYOR. Danışmana açmak sonradan eklenebilir; açılmış bir
-- görünürlüğü geri almak, öğrenciler özel hedeflerini yazdıktan SONRA mümkün
-- değildir. Dar taraftan başlandı.

CREATE TYPE "HedefDurumu" AS ENUM ('PLANLANDI', 'SURUYOR', 'TAMAMLANDI');

CREATE TABLE "kullanici_hedefi" (
  "id"           SERIAL       PRIMARY KEY,
  "kullanici_id" INTEGER      NOT NULL,
  "baslik"       VARCHAR(250) NOT NULL,
  "aciklama"     TEXT,
  "durum"        "HedefDurumu" NOT NULL DEFAULT 'PLANLANDI',

  -- Yalnızca TARİH (saat yok): "bu yıl içinde" ölçeğinde bir niyet beyanı,
  -- randevu değil. Timestamptz olsaydı saat dilimi kayması yüzünden hedef
  -- tarihi bir gün geriye/ileriye görünebilirdi.
  "hedef_tarihi" DATE,

  -- Tamamlanma ANI. `durum` alanından türetilemez: durum TAMAMLANDI'ya
  -- çevrildiğinde ne zaman olduğunu başka hiçbir alan tutmuyor.
  "tamamlanma_tarihi" TIMESTAMPTZ(6),

  "olusturma_tarihi"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "guncelleme_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "kullanici_hedefi_kullanici_id_fkey"
    FOREIGN KEY ("kullanici_id") REFERENCES "kullanici" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "ck_kullanici_hedefi_baslik" CHECK (btrim("baslik") <> ''),

  -- Tamamlanma tarihi YALNIZCA tamamlanmış hedefte dolu olabilir. Uygulama
  -- katmanı bunu zaten sağlıyor; kısıt, durumu SQL'den değiştiren bir bakım
  -- betiğinin iki alanı tutarsız bırakmasını engeller.
  CONSTRAINT "ck_kullanici_hedefi_tamamlanma" CHECK (
    ("durum" = 'TAMAMLANDI') OR ("tamamlanma_tarihi" IS NULL)
  )
);

CREATE INDEX "kullanici_hedefi_kullanici_id_idx"
  ON "kullanici_hedefi" ("kullanici_id");
