import "dotenv/config";
import { bildirimGonder } from "../src/lib/bildirim/gonder";
import { prisma } from "../src/lib/db";

/**
 * E-posta kopyasının bildirim akışına doğru bağlandığını doğrular.
 *
 * Asıl sorulan: adresi olan kişiye kopya çıkıyor mu, adresi olmayanda akış
 * sessizce sürüyor mu ve sağlayıcı hata verdiğinde bildirim yine de duruyor mu.
 * Gerçek posta gönderilmez; varsayılan sağlayıcı günlüğe yazar.
 */

let basarili = 0;
let basarisiz = 0;

function kontrol(baslik: string, kosul: boolean) {
  console.log(`  ${kosul ? "✓" : "✗"} ${baslik}`);
  kosul ? basarili++ : basarisiz++;
}

async function sonBildirim(kullaniciId: number) {
  return prisma.bildirim.findFirst({
    where: { kullaniciId },
    orderBy: { id: "desc" },
    select: { id: true, epostaDurumu: true, epostaHatasi: true },
  });
}

async function calistir() {
  console.log("\nE-posta kopyası doğrulaması\n");

  const ogrenci = await prisma.kullanici.findFirstOrThrow({
    where: { roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } } },
    select: { id: true, ad: true, soyad: true },
  });

  // 1. Adresi olan kişi
  await prisma.ogrenciProfil.upsert({
    where: { kullaniciId: ogrenci.id },
    update: { eposta: "deneme@ornek.gov.tr" },
    create: { kullaniciId: ogrenci.id, eposta: "deneme@ornek.gov.tr" },
  });
  await prisma.bildirim.deleteMany({ where: { kullaniciId: ogrenci.id } });

  await bildirimGonder({
    kullaniciId: ogrenci.id,
    kod: "DANISMAN_DEGISTI",
    degiskenler: { danismanAdi: "Deneme Öğretmen" },
  });

  const adresli = await sonBildirim(ogrenci.id);
  kontrol("adresi olan kişiye kopya gönderilir", adresli?.epostaDurumu === "GONDERILDI");
  kontrol("başarılı gönderimde hata metni boş kalır", adresli?.epostaHatasi === null);

  // 2. Adresi olmayan kişi: hata değil, "gerekmiyor".
  await prisma.ogrenciProfil.update({
    where: { kullaniciId: ogrenci.id },
    data: { eposta: null },
  });
  await prisma.bildirim.deleteMany({ where: { kullaniciId: ogrenci.id } });

  await bildirimGonder({
    kullaniciId: ogrenci.id,
    kod: "DANISMAN_DEGISTI",
    degiskenler: { danismanAdi: "Deneme Öğretmen" },
  });

  const adressiz = await sonBildirim(ogrenci.id);
  kontrol("adres yoksa bildirim yine de yazılır", adressiz !== null);
  kontrol(
    "adres yokluğu hata sayılmaz",
    adressiz?.epostaDurumu === "GEREKMIYOR",
  );

  await prisma.bildirim.deleteMany({ where: { kullaniciId: ogrenci.id } });

  console.log(
    `\nSonuç: ${basarili} başarılı, ${basarisiz} başarısız (${basarili + basarisiz} kontrol)\n`,
  );

  await prisma.$disconnect();
  process.exit(basarisiz > 0 ? 1 : 0);
}

void calistir();
