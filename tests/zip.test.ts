import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import {
  adlariTekillestir,
  crc32,
  zipAdiTemizle,
  zipOlustur,
} from "@/lib/zip";

/**
 * ZIP yazıcısı (12 Ağustos 2026 · istek: etkinlik görsellerini toplu indirme).
 *
 * Biçim elle yazıldığı için sınanması şart: bozuk bir arşiv, kullanıcının
 * açamayacağı bir dosya indirmesi demek ve hata ancak indirdikten SONRA
 * görünür. Testler baytları okuyor, "hata fırlatmadı"yla yetinmiyor.
 */

const YEREL_IMZA = 0x04034b50;
const MERKEZ_IMZA = 0x02014b50;
const SON_IMZA = 0x06054b50;

/** Arşivin sonundaki kaydı (EOCD) çözer. */
function sonKaydiOku(arsiv: Buffer) {
  const konum = arsiv.length - 22;
  expect(arsiv.readUInt32LE(konum)).toBe(SON_IMZA);
  return {
    girisSayisi: arsiv.readUInt16LE(konum + 10),
    merkezBoyutu: arsiv.readUInt32LE(konum + 12),
    merkezKonumu: arsiv.readUInt32LE(konum + 16),
  };
}

/** İlk girişin adını ve içeriğini yerel başlıktan çözer. */
function ilkGirisiOku(arsiv: Buffer) {
  expect(arsiv.readUInt32LE(0)).toBe(YEREL_IMZA);
  const yontem = arsiv.readUInt16LE(8);
  const crc = arsiv.readUInt32LE(14);
  const sikBoyut = arsiv.readUInt32LE(18);
  const hamBoyut = arsiv.readUInt32LE(22);
  const adUzunlugu = arsiv.readUInt16LE(26);
  const ekUzunlugu = arsiv.readUInt16LE(28);
  const ad = arsiv.subarray(30, 30 + adUzunlugu).toString("utf8");
  const veriBasi = 30 + adUzunlugu + ekUzunlugu;
  const veri = arsiv.subarray(veriBasi, veriBasi + sikBoyut);

  return {
    ad,
    yontem,
    crc,
    hamBoyut,
    icerik: yontem === 8 ? inflateRawSync(veri) : veri,
    bayrak: arsiv.readUInt16LE(6),
  };
}

describe("crc32", () => {
  // Bilinen değer: "123456789" → 0xCBF43926 (CRC-32/ISO-HDLC).
  it("bilinen sağlamayı üretir", () => {
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
  });

  it("boş veride sıfırdır", () => {
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });
});

describe("arşiv yapısı", () => {
  it("tek dosyayı geri okunabilir biçimde yazar", () => {
    const icerik = Buffer.from("merhaba dünya".repeat(50), "utf8");
    const arsiv = zipOlustur([{ ad: "not.txt", icerik }]);

    const giris = ilkGirisiOku(arsiv);
    expect(giris.ad).toBe("not.txt");
    expect(giris.icerik.equals(icerik)).toBe(true);
    expect(giris.hamBoyut).toBe(icerik.length);
    expect(giris.crc).toBe(crc32(icerik));
    // Ad UTF-8 bayrağı: olmadan Windows Türkçe adları bozuk gösterir.
    expect(giris.bayrak & 0x0800).toBe(0x0800);
  });

  it("merkez dizini her giriş için bir kayıt taşır", () => {
    const arsiv = zipOlustur([
      { ad: "bir.txt", icerik: Buffer.from("bir") },
      { ad: "iki.txt", icerik: Buffer.from("iki") },
      { ad: "uc.txt", icerik: Buffer.from("üç") },
    ]);

    const son = sonKaydiOku(arsiv);
    expect(son.girisSayisi).toBe(3);
    expect(arsiv.readUInt32LE(son.merkezKonumu)).toBe(MERKEZ_IMZA);
    expect(son.merkezKonumu + son.merkezBoyutu).toBe(arsiv.length - 22);
  });

  /*
   * JPEG/PNG zaten sıkıştırılmış; yeniden sıkıştırmak dosyayı büyütebiliyor.
   * O durumda ham hâli yazılır (yöntem 0) ve arşiv yine geçerli kalır.
   */
  it("sıkıştırma kazandırmıyorsa dosyayı ham yazar", () => {
    // GERÇEKTEN rastgele veri sıkışmaz. Elle üretilen "rastgele görünümlü"
    // dizi (i * 97 + 31) periyodiktir ve deflate onu rahatça sıkıştırır —
    // testin ilk hâli tam olarak buna takıldı.
    const rastgele = randomBytes(2048);
    const giris = ilkGirisiOku(zipOlustur([{ ad: "ham.bin", icerik: rastgele }]));
    expect(giris.yontem).toBe(0);
    expect(giris.icerik.equals(rastgele)).toBe(true);
  });

  it("sıkışan veride deflate kullanır", () => {
    const tekrarli = Buffer.alloc(4096, 65);
    const giris = ilkGirisiOku(zipOlustur([{ ad: "a.txt", icerik: tekrarli }]));
    expect(giris.yontem).toBe(8);
    expect(giris.icerik.equals(tekrarli)).toBe(true);
  });

  it("boş arşiv de geçerlidir", () => {
    const arsiv = zipOlustur([]);
    expect(sonKaydiOku(arsiv).girisSayisi).toBe(0);
    expect(arsiv.length).toBe(22);
  });
});

describe("dosya adları", () => {
  /*
   * ZIP SLIP: arşivdeki ad "../" içeriyorsa bazı açıcılar dosyayı hedef
   * dizinin DIŞINA yazar. Ad kullanıcı yüklemesinden geliyor.
   */
  it("klasör ayracını ve nokta başlangıcını temizler", () => {
    /*
     * Ayracı DÜŞÜRMEK yeter: "_.._etc_passwd" tek bir dosya adıdır, çıktığı
     * yer arşivin kökü. Kalan noktalar zararsız — güvenliği sağlayan şey
     * "üst dizin" ifadesinin değil, DİZİN AYRACININ ortadan kalkması.
     * Noktaları da silmek "v1..2.png" gibi meşru adları bozardı.
     */
    expect(zipAdiTemizle("../../etc/passwd")).toBe("_.._etc_passwd");
    expect(zipAdiTemizle("/kok/dosya.png")).toBe("_kok_dosya.png");
    expect(zipAdiTemizle(String.raw`..\..\gizli.png`)).toBe("_.._gizli.png");
  });

  it("Windows'ta yasak karakterleri atar, Türkçe harfleri korur", () => {
    expect(zipAdiTemizle('şenlik: "büyük" | görsel?.png')).toBe(
      "şenlik büyük  görsel.png",
    );
  });

  it("adı tamamen elenen dosyaya varsayılan ad verir", () => {
    expect(zipAdiTemizle("...")).toBe("dosya");
    expect(zipAdiTemizle("   ")).toBe("dosya");
  });

  /*
   * Aynı ad iki kez yazılabilir ama açan program birini diğerinin üzerine yazar
   * ve kullanıcı dosyayı sessizce kaybeder.
   */
  it("aynı adları numaralandırır", () => {
    expect(
      adlariTekillestir(["kare.png", "kare.png", "kare.png", "başka.png"]),
    ).toEqual(["kare.png", "kare (2).png", "kare (3).png", "başka.png"]);
  });

  it("uzantısız adlarda numarayı sona ekler", () => {
    expect(adlariTekillestir(["belge", "belge"])).toEqual([
      "belge",
      "belge (2)",
    ]);
  });

  it("büyük/küçük harf farkını aynı ad sayar", () => {
    // Windows dosya adlarında büyük/küçük harf ayrımı yok; "Kare.png" ile
    // "kare.png" aynı dosyanın üzerine yazar.
    expect(adlariTekillestir(["Kare.png", "kare.png"])).toEqual([
      "Kare.png",
      "kare (2).png",
    ]);
  });
});

/*
 * SON KONTROL: arşivi işletim sisteminin kendi aracı açabiliyor mu. Baytları
 * doğru yazmak yetmez — kullanıcı dosyayı Gezgin'de çift tıklayacak.
 * PowerShell her Windows'ta var; başka ortamda test atlanır.
 */
describe("gerçek bir açıcı", () => {
  const calisir = process.platform === "win32";

  (calisir ? it : it.skip)("PowerShell arşivi açar ve içerik korunur", () => {
    const dizin = mkdtempSync(join(tmpdir(), "genctek-zip-"));
    try {
      const arsivYolu = join(dizin, "deneme.zip");
      const icerik = Buffer.from("GençTek görsel içeriği", "utf8");
      writeFileSync(
        arsivYolu,
        zipOlustur([
          { ad: "görsel.txt", icerik },
          { ad: "ikinci.txt", icerik: Buffer.alloc(1000, 66) },
        ]),
      );

      const hedef = join(dizin, "cikti");
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `Expand-Archive -LiteralPath '${arsivYolu}' -DestinationPath '${hedef}' -Force`,
        ],
        { stdio: "pipe" },
      );

      expect(readFileSync(join(hedef, "görsel.txt")).equals(icerik)).toBe(true);
      expect(readFileSync(join(hedef, "ikinci.txt")).length).toBe(1000);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  }, 60_000);
});
