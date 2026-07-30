import { chromium } from "playwright";

/**
 * CSV dışa aktarmanın kapsam kurallarına uyduğunu canlı sistemde doğrular.
 *
 * Asıl sorulan şey dosyanın üretilip üretilmediği değil: indirilen satır
 * sayısının kişinin ekranda gördüğü kayıt sayısıyla aynı olup olmadığı ve
 * kapsam dışındaki kişinin dosyaya hiç ulaşamadığı.
 */

const kok = process.env.GENCTEK_URL ?? "http://localhost:3000";
const tarayici = await chromium.launch();
const rapor = [];

async function girisYap(kisiAdi) {
  const baglam = await tarayici.newContext();
  const sayfa = await baglam.newPage();
  await sayfa.goto(`${kok}/giris?ara=${encodeURIComponent(kisiAdi)}`, {
    waitUntil: "networkidle",
  });
  await sayfa
    .locator('form:has(input[name="kimlikBilgisi"]:not([value^="uretilen-"]))')
    .filter({ hasText: kisiAdi })
    .first()
    .getByRole("button")
    .click();
  await sayfa.waitForURL(/\/panel/);
  return { baglam, sayfa };
}

/** CSV'nin veri satırı sayısı (başlık ve son boş satır hariç). */
function veriSatiriSayisi(icerik) {
  return icerik.trim().split("\r\n").length - 1;
}

async function csvIndir(sayfa, yol) {
  const yanit = await sayfa.request.get(`${kok}${yol}`);
  return { durum: yanit.status(), govde: await yanit.text() };
}

for (const [kisi, etiket] of [
  ["Burcu Yılmaz", "YEĞİTEK"],
  ["Selim Koç", "İl koordinatörü"],
  ["Ahmet Öztürk", "Danışman öğretmen"],
]) {
  const { baglam, sayfa } = await girisYap(kisi);

  await sayfa.goto(`${kok}/panel/ogrenciler`, { waitUntil: "networkidle" });
  const baslikMetni = await sayfa.locator("main h1 + p").first().innerText();
  const ekrandaki = Number(baslikMetni.match(/(\d+) kayıt/)?.[1] ?? "0");

  const csv = await csvIndir(sayfa, "/panel/ogrenciler/disa-aktar");
  const dosyadaki = csv.durum === 200 ? veriSatiriSayisi(csv.govde) : -1;

  rapor.push(
    `${etiket} · öğrenci CSV: HTTP ${csv.durum} · ekranda ${ekrandaki} kayıt, dosyada ${dosyadaki} satır → ${
      ekrandaki === dosyadaki ? "eşleşiyor" : "*** FARKLI ***"
    }`,
  );

  await baglam.close();
}

{
  // Öğrenci envanteri göremez; indirme yolu da aynı cevabı vermeli, yoksa
  // ekranı kapatmak veriyi korumaz.
  const { baglam, sayfa } = await girisYap("Yusuf Demir");
  const csv = await csvIndir(sayfa, "/panel/ogrenciler/disa-aktar");
  rapor.push(
    `Öğrenci · öğrenci CSV: HTTP ${csv.durum} → ${
      csv.durum === 404 ? "engellendi (beklenen)" : "*** ERİŞTİ ***"
    }`,
  );

  const faaliyetCsv = await csvIndir(sayfa, "/panel/faaliyetler/disa-aktar");
  rapor.push(
    `Öğrenci · faaliyet CSV: HTTP ${faaliyetCsv.durum} · ${
      faaliyetCsv.durum === 200
        ? `${veriSatiriSayisi(faaliyetCsv.govde)} satır (kendi kapsamı)`
        : "indirilemedi"
    }`,
  );
  await baglam.close();
}

{
  // Oturumsuz istek: kaydın varlığını bile sızdırmadan 404.
  const baglam = await tarayici.newContext();
  const sayfa = await baglam.newPage();
  const csv = await csvIndir(sayfa, "/panel/ogrenciler/disa-aktar");
  rapor.push(
    `Oturumsuz · öğrenci CSV: HTTP ${csv.durum} → ${
      csv.durum === 404 ? "engellendi (beklenen)" : "*** ERİŞTİ ***"
    }`,
  );
  await baglam.close();
}

{
  // Filtre daraltması dosyaya da yansımalı.
  const { baglam, sayfa } = await girisYap("Burcu Yılmaz");
  const tumu = await csvIndir(sayfa, "/panel/ogrenciler/disa-aktar");
  const daraltilmis = await csvIndir(
    sayfa,
    "/panel/ogrenciler/disa-aktar?il=34",
  );
  rapor.push(
    `YEĞİTEK · filtresiz ${veriSatiriSayisi(tumu.govde)} satır, il=34 ile ${veriSatiriSayisi(
      daraltilmis.govde,
    )} satır → ${
      veriSatiriSayisi(daraltilmis.govde) < veriSatiriSayisi(tumu.govde)
        ? "daraldı (beklenen)"
        : "*** DARALMADI ***"
    }`,
  );

  const ilkSatir = daraltilmis.govde.split("\r\n")[1] ?? "";
  rapor.push(`         · örnek satır: ${ilkSatir}`);
  await baglam.close();
}

await tarayici.close();

console.log(`\n${"-".repeat(70)}`);
for (const satir of rapor) console.log(satir);
console.log("-".repeat(70));
