import { ortam } from "../ortam";
import { S3Depolama } from "./s3";
import type { DepolamaSaglayici } from "./tipler";
import { YerelDepolama } from "./yerel";

let saglayici: DepolamaSaglayici | null = null;

/**
 * Yapılandırmaya göre depolama sağlayıcısını döndürür. Uygulamanın geri kalanı
 * dosyanın nerede durduğunu bilmez, yalnızca anahtarı tanır.
 */
export function depolama(): DepolamaSaglayici {
  if (!saglayici) {
    saglayici =
      ortam.DEPOLAMA_SAGLAYICI === "s3" ? new S3Depolama() : new YerelDepolama();
  }
  return saglayici;
}

export { DepolamaHatasi } from "./tipler";
export type { DepolamaSaglayici, YazmaIstegi } from "./tipler";
