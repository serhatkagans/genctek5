-- Kazanım kayıtlarına destekleyici belge (fotoğraf / belge) eklenebilmesi.
--
-- İSTEK: "Etkinliğe dair 'Destekleyici Belgeler' kısmı oluşturulacak
-- (etkinliğe dair fotoğraf, belge ekleyebilmesi için)".
--
-- Neden AYRI TABLO: bir kayda birden çok dosya eklenebilir. Sütun olarak
-- eklenseydi ya tek dosyayla sınırlı kalırdık ya da "dosya_1, dosya_2" gibi
-- sürdürülemez bir şema çıkardı.
--
-- Depolama deseni faaliyet_ek ile AYNI: diskte gerçek dosya adı tutulmaz,
-- depolama soyutlamasının döndürdüğü anahtar saklanır. Böylece VPS'ten S3'e
-- geçişte tablo değişmez (bkz. lib/depolama/).
--
-- SOFT-DELETE YOK, faaliyet_ek'ten ayrıldığı tek nokta burası: faaliyet eki
-- başkalarının göreceği ortak bir içeriktir ve moderasyon gereği "kim sildi"
-- kaydı kalır. Kazanım eki ise kişinin KENDİ beyanının parçasıdır; kazanım
-- kaydının kendisi de kalıcı olarak siliniyor (bkz. kazanimSilEylemi).
-- Yarısı hard, yarısı soft silinen bir kayıt çifti tutarsız olurdu. Silme
-- işlemi erisim_logu'na yazılır, denetim izi orada.

CREATE TABLE IF NOT EXISTS "kazanim_ek" (
  "id"              SERIAL       PRIMARY KEY,
  "kazanim_id"      INTEGER      NOT NULL,
  "dosya_adi"       VARCHAR(255) NOT NULL,
  -- Depolama soyutlamasının anahtarı; dosya sistemi yolu DEĞİLDİR.
  "depolama_yolu"   TEXT         NOT NULL,
  "mime_tipi"       VARCHAR(100) NOT NULL,
  "boyut_bayt"      BIGINT       NOT NULL,
  "yuklenme_tarihi" TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Kısıt ve index adları PRISMA'NIN ÜRETTİĞİ adlarla birebir aynı tutuluyor
  -- (kazanim_ek_kazanim_id_fkey / _idx). Farklı adlandırılsaydı `migrate diff`
  -- her çalışmada sapma (drift) bildirir, gerçek bir sapma olmadığı hâlde.
  CONSTRAINT "kazanim_ek_kazanim_id_fkey"
    FOREIGN KEY ("kazanim_id") REFERENCES "kullanici_kazanim" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  -- Boş ad ya da sıfır boyutlu dosya, uygulama katmanında da reddediliyor;
  -- kısıt burada da duruyor çünkü tabloya tek yoldan yazılacağının garantisi
  -- yok (bakım betiği, elle düzeltme).
  CONSTRAINT "ck_kazanim_ek_dosya_adi" CHECK (btrim("dosya_adi") <> ''),
  CONSTRAINT "ck_kazanim_ek_boyut" CHECK ("boyut_bayt" > 0)
);

-- Kayıt listelenirken ekleri tek sorguda gelsin.
CREATE INDEX IF NOT EXISTS "kazanim_ek_kazanim_id_idx"
  ON "kazanim_ek" ("kazanim_id");
