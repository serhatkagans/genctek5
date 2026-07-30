-- Bildirimin e-posta kopyasının akıbeti.
--
-- Panel bildirimi her koşulda yazılır; e-posta yalnızca bir kopyadır. Kopyanın
-- gidip gitmediği kayda geçmezse "başvuru sonucunu göremedim" şikâyetinde
-- e-postanın hiç denenmediği mi yoksa sunucudan mı döndüğü ayırt edilemez.

CREATE TYPE "EpostaDurumu" AS ENUM ('GEREKMIYOR', 'GONDERILDI', 'BASARISIZ');

ALTER TABLE "bildirim"
  ADD COLUMN IF NOT EXISTS "eposta_durumu" "EpostaDurumu" NOT NULL DEFAULT 'GEREKMIYOR',
  ADD COLUMN IF NOT EXISTS "eposta_hatasi" TEXT;
