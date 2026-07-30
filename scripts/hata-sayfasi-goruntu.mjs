import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

/**
 * Hata ve bulunamadı ekranlarının görüntüsünü alır.
 *
 * Bu ekranlar akış içinde denk gelinmediği için gözden kaçar; kaçırıldığında da
 * kullanıcı en kırılgan anında bozuk bir sayfayla karşılaşır.
 */

const ADRES = process.env.ADRES ?? "http://localhost:3000";
const DIZIN = "goruntuler/hata";

const tarayici = await chromium.launch();
const sayfa = await tarayici.newPage({ viewport: { width: 1280, height: 720 } });

await mkdir(DIZIN, { recursive: true });

for (const tema of ["d", "a", "b", "c"]) {
  await sayfa.context().addCookies([
    { name: "genctek_tema", value: tema, url: ADRES },
  ]);
  await sayfa.goto(`${ADRES}/boyle-bir-sayfa-yok`, { waitUntil: "networkidle" });
  await sayfa.screenshot({ path: `${DIZIN}/bulunamadi-tema-${tema}.png` });
  console.log(`  ✓ bulunamadi-tema-${tema}.png`);
}

await tarayici.close();
