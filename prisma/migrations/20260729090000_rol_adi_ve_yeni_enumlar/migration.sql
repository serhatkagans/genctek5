-- Numaralandırma değişiklikleri.
--
-- NEDEN AYRI MIGRATION: PostgreSQL'de `ALTER TYPE ... ADD VALUE` ile eklenen
-- bir enum değeri, AYNI transaction içinde kullanılamaz ("unsafe use of new
-- value"). Prisma her migration dosyasını tek transaction'da çalıştırdığı için
-- yeni değerleri kullanan kısıtlar bir sonraki dosyaya bırakıldı.

-- ---------------------------------------------------------------------------
-- 1. Rol adı düzeltmesi: "İl Yöneticisi" yanlıştı, doğrusu "İl Temsilcisi".
-- ---------------------------------------------------------------------------
-- RENAME VALUE etiketin OID'sini korur; bu değere bakan kısmi index ve CHECK
-- kısıtları geçerli kalır, yalnızca metinleri yeni adla görünür.
ALTER TYPE "GorevRolKodu" RENAME VALUE 'IL_YONETICISI' TO 'IL_TEMSILCISI';

-- Index adı da rolün adını taşır; eski adla bırakmak yanıltıcı olurdu.
ALTER INDEX "ux_il_yoneticisi" RENAME TO "ux_il_temsilcisi";

-- ---------------------------------------------------------------------------
-- 2. Danışman atamasının yeni kapanma nedenleri
-- ---------------------------------------------------------------------------
-- IL_KOORDINATORU_OLDU: danışman öğretmen il koordinatörü olarak atandı.
-- OGRENCI_ISTEGI: öğrenci kendi isteğiyle danışmanını değiştirdi (ayrılma
-- beklenmez, istediği zaman değiştirebilir).
ALTER TYPE "KapanmaNedeni" ADD VALUE IF NOT EXISTS 'IL_KOORDINATORU_OLDU';
ALTER TYPE "KapanmaNedeni" ADD VALUE IF NOT EXISTS 'OGRENCI_ISTEGI';

-- ---------------------------------------------------------------------------
-- 3. Faaliyet iptalinde başvuruların düştüğü durum
-- ---------------------------------------------------------------------------
-- Öğrencinin kendi geri çekmesinden (GERI_CEKILDI) AYRI bir değerdir: bunu
-- sistem tetikler, öğrenci değil.
ALTER TYPE "BasvuruDurumu" ADD VALUE IF NOT EXISTS 'IPTAL_EDILDI';

-- ---------------------------------------------------------------------------
-- 4. Etkinlik kategorisi ve faaliyet durumu
-- ---------------------------------------------------------------------------
-- Kapsam (kim başvurabilir) ile kategori (etkinlik nedir) BAĞIMSIZ iki alandır.
CREATE TYPE "EtkinlikKategorisi" AS ENUM ('TEMEL_ETKINLIK', 'CALISMA_GRUBU_ETKINLIGI', 'IL_ETKINLIGI');

-- Referans tablosundaki programın hangi kategoriye ait olduğu. IL_ETKINLIGI
-- burada YOKTUR: il etkinliklerinin sabit isim listesi yoktur.
CREATE TYPE "TemelEtkinlikGrubu" AS ENUM ('TEMEL_ETKINLIK', 'CALISMA_GRUBU_ETKINLIGI');

CREATE TYPE "FaaliyetDurumu" AS ENUM ('AKTIF', 'IPTAL_EDILDI');
