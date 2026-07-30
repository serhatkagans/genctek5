import "dotenv/config";
import { gecelikSenkronCalistir } from "../src/lib/kullanici/senkron";

/**
 * Gecelik senkron işi. VPS'te cron ile çalıştırılır:
 *   0 3 * * *  cd /opt/genctek && npm run senkron:danisman >> /var/log/genctek-senkron.log 2>&1
 */
async function main() {
  const baslangic = Date.now();
  const sonuc = await gecelikSenkronCalistir();
  console.log(
    `[${new Date().toISOString()}] Gecelik senkron: ${sonuc.kontrolEdilen} danışman kontrol edildi, ` +
      `${sonuc.kurumuDegisen} tanesinin kurumu değişti (${Date.now() - baslangic} ms)`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((hata) => {
    console.error("Gecelik senkron başarısız:", hata);
    process.exit(1);
  });
