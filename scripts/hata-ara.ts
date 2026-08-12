import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type HataKaydi,
  hataGunlukDizini,
} from "../src/lib/hata-kaydi";

/**
 * Hata kimliğini günlükte arar.
 *
 *   npm run hata:ara 598556021     → o kimliğe ait kayıtlar
 *   npm run hata:ara               → son 20 hata
 *
 * Kullanıcı ekranda yalnızca kimliği görüyor; bu betik o kimliğin karşılığını
 * (hangi adres, hangi hata, ne zaman) çıkarır. Yığın izi TAM basılır — betik
 * yöneticinin sunucusunda çalışıyor, ekranda kısaltmanın bir faydası yok.
 */

const SON_KAYIT_SAYISI = 20;

async function gunlukSatirlari(): Promise<HataKaydi[]> {
  const dizin = hataGunlukDizini();

  let dosyalar: string[];
  try {
    dosyalar = (await readdir(dizin))
      .filter((ad) => ad.endsWith(".jsonl"))
      .sort();
  } catch {
    console.log(`Günlük dizini yok: ${dizin}`);
    console.log("Henüz hiç sunucu hatası kaydedilmemiş olabilir.");
    return [];
  }

  const kayitlar: HataKaydi[] = [];
  for (const dosya of dosyalar) {
    const icerik = await readFile(join(dizin, dosya), "utf8");
    for (const satir of icerik.split("\n")) {
      if (!satir.trim()) continue;
      try {
        kayitlar.push(JSON.parse(satir) as HataKaydi);
      } catch {
        // Yarım yazılmış son satır olabilir; kayıt akışını durdurmaz.
      }
    }
  }
  return kayitlar;
}

function yaz(kayit: HataKaydi): void {
  console.log("─".repeat(72));
  console.log(`Kimlik : ${kayit.kimlik}`);
  console.log(`Zaman  : ${kayit.zaman}`);
  console.log(`İstek  : ${kayit.yontem ?? "—"} ${kayit.yol ?? "—"}`);
  console.log(`Hata   : ${kayit.ad}: ${kayit.mesaj}`);
  if (kayit.yiginIzi) console.log(kayit.yiginIzi);
}

async function main() {
  const aranan = process.argv[2]?.trim();
  const kayitlar = await gunlukSatirlari();
  if (kayitlar.length === 0) return;

  if (!aranan) {
    console.log(`Toplam ${kayitlar.length} kayıt · son ${SON_KAYIT_SAYISI}:`);
    kayitlar.slice(-SON_KAYIT_SAYISI).forEach(yaz);
    return;
  }

  const eslesenler = kayitlar.filter((kayit) => kayit.kimlik === aranan);
  if (eslesenler.length === 0) {
    console.log(`"${aranan}" kimliğiyle kayıt bulunamadı.`);
    console.log(
      "Hata, günlük açılmadan önce oluşmuş olabilir; sunucunun terminal çıktısına bakın.",
    );
    return;
  }

  console.log(`"${aranan}" için ${eslesenler.length} kayıt:`);
  eslesenler.forEach(yaz);
}

main();
