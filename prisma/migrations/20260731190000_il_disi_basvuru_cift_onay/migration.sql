-- İl dışı başvuruda çift onay.
--
-- Analiz isteği: "önce başvuran öğrencinin koordinatörü onaylayacak, sonra
-- etkinliğin yapıldığı ildeki koordinatör onay verecek."
--
-- İKİNCİ ONAY YENİ BİR ADIM DEĞİLDİR: faaliyeti düzenleyenin yaptığı mevcut
-- başvuru değerlendirmesi (SECILDI / YEDEK / REDDEDILDI) zaten o ilin
-- koordinatörünün kararıdır. Eklenen tek şey ÖNCEKİ adımdır — öğrencinin kendi
-- ilinin koordinatörünün, öğrencisini başka bir ile göndermeye onay vermesi.
--
-- Bu ayrım bilinçli: ikinci bir onay sütunu daha açmak, aynı kararı iki yerde
-- tutup ikisini senkron tutma zorunluluğu doğururdu.

-- Kaynak il = başvuran öğrencinin ili. Faaliyetin ilinden farklıysa doldurulur.
ALTER TABLE "basvuru"
  ADD COLUMN IF NOT EXISTS "kaynak_il_onay_durumu" "OnayDurumu" NOT NULL DEFAULT 'ONAY_GEREKMEZ',
  ADD COLUMN IF NOT EXISTS "kaynak_il_onaylayan_kullanici_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "kaynak_il_onay_tarihi" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "kaynak_il_ret_gerekcesi" TEXT;

-- Varsayılan ONAY_GEREKMEZ: mevcut başvuruların hepsi bu akıştan önce yapıldı
-- ve geriye dönük onay bekletmek, değerlendirilmiş başvuruları yeniden
-- askıya almak olurdu.
ALTER TABLE "basvuru"
  DROP CONSTRAINT IF EXISTS "basvuru_kaynak_il_onaylayan_kullanici_id_fkey";
ALTER TABLE "basvuru" ADD CONSTRAINT "basvuru_kaynak_il_onaylayan_kullanici_id_fkey"
  FOREIGN KEY ("kaynak_il_onaylayan_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Karar verilmişse kim ve ne zaman verdiği de yazılı olmalı. Onaylayansız bir
-- ONAYLANDI kaydı, "kim izin verdi" sorusunu cevapsız bırakır ve bu akışın tek
-- amacı o sorunun cevabını tutmaktır.
ALTER TABLE "basvuru" DROP CONSTRAINT IF EXISTS "ck_basvuru_kaynak_il_karari";
ALTER TABLE "basvuru" ADD CONSTRAINT "ck_basvuru_kaynak_il_karari"
  CHECK (
    "kaynak_il_onay_durumu" IN ('ONAY_GEREKMEZ', 'BEKLIYOR')
    OR ("kaynak_il_onaylayan_kullanici_id" IS NOT NULL
        AND "kaynak_il_onay_tarihi" IS NOT NULL)
  );

-- Koordinatörün ekranı "ilimden çıkan, kararı bekleyen başvurular" sorgusudur;
-- durum üzerinden filtrelenir.
CREATE INDEX IF NOT EXISTS "basvuru_kaynak_il_onay_durumu_idx"
  ON "basvuru"("kaynak_il_onay_durumu");
