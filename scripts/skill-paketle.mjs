/**
 * genctek-platform.skill paketini kökteki güncel belgelerden üretir.
 *
 * Paket ELLE oluşturulmaz: bir kez öyle yapıldı ve dosya üç tur geride kaldı
 * (paketteki domain-rules.md 11 KB'de kalmışken kökteki 24 KB olmuştu). Kuralları
 * okuyan bir ajan sessizce eski kuralları uygular — bu, yanlış kod yazdıran ama
 * hiçbir yerde hata vermeyen bir sapmadır.
 *
 * Kullanım:  npm run skill:paketle
 *
 * Paket düzeni (skill formatının beklediği yapı):
 *   genctek-platform/SKILL.md
 *   genctek-platform/references/{domain-rules,data-model,permissions}.md
 *
 * Kökteki belgeler `references/` ön ekiyle birbirine atıf yapıyor
 * (ör. "bkz. references/permissions.md Bölüm 2"); paket içinde de aynı yola
 * yerleştikleri için bu atıflar çalışır durumda kalır.
 *
 * ZIP burada elle yazılıyor, `tar`/`zip` çağrılmıyor: Git Bash'in GNU tar'ı zip
 * üretemiyor (`-a` bayrağını yok sayıp .zip adıyla tar yazıyor), PowerShell'in
 * Compress-Archive'ı ise Linux'ta yok — paket hem geliştirici makinesinde hem
 * VPS'te aynı komutla üretilebilmeli.
 */

import { deflateRawSync } from "node:zlib";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const kok = resolve(import.meta.dirname, "..");
const paketAdi = "genctek-platform";
const cikti = join(kok, `${paketAdi}.skill`);

/** Kökteki dosya -> paket içindeki yol. */
const DOSYALAR = [
  ["SKILL.md", "SKILL.md"],
  ["domain-rules.md", "references/domain-rules.md"],
  ["data-model.md", "references/data-model.md"],
  ["permissions.md", "references/permissions.md"],
];

/*
 * SKILL.md'nin frontmatter'ı olmadan paket geçersizdir: skill adı ve
 * açıklaması oradan okunur. Sessizce bozuk paket üretmek yerine erken düşüyoruz.
 */
function skillDosyasiniDogrula(ham) {
  // Depo CRLF ile checkout ediliyor (bkz. .gitattributes); satır sonu farkı
  // yüzünden geçerli bir dosyayı reddetmemek için normalleştiriyoruz.
  const icerik = ham.replace(/\r\n/g, "\n");
  if (!icerik.startsWith("---\n")) {
    throw new Error("SKILL.md frontmatter ile başlamıyor (--- satırı yok).");
  }
  const kapanis = icerik.indexOf("\n---\n", 4);
  if (kapanis === -1) {
    throw new Error("SKILL.md frontmatter'ı kapanmamış.");
  }
  const bas = icerik.slice(4, kapanis);
  for (const alan of ["name:", "description:"]) {
    if (!bas.includes(alan)) {
      throw new Error(`SKILL.md frontmatter'ında "${alan}" alanı yok.`);
    }
  }
}

// --- Asgari ZIP yazıcısı ----------------------------------------------------

const CRC_TABLOSU = (() => {
  const tablo = new Int32Array(256);
  for (let sayi = 0; sayi < 256; sayi += 1) {
    let deger = sayi;
    for (let bit = 0; bit < 8; bit += 1) {
      deger = deger & 1 ? 0xedb88320 ^ (deger >>> 1) : deger >>> 1;
    }
    tablo[sayi] = deger;
  }
  return tablo;
})();

function crc32(veri) {
  let crc = -1;
  for (let sira = 0; sira < veri.length; sira += 1) {
    crc = (crc >>> 8) ^ CRC_TABLOSU[(crc ^ veri[sira]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Girdileri tek bir ZIP arşivine yazar.
 *
 * Tüm girdiler deflate ile sıkıştırılır ve boyutlar yerel başlıkta doğrudan
 * yazılır (data descriptor kullanılmaz) — böylece akış halinde okuyan
 * çözücüler de sorun yaşamaz. Zaman damgası SABİT tutulur: aksi halde içerik
 * değişmese de her çalıştırma farklı bir dosya üretir ve depoda gereksiz
 * fark görünür.
 */
function zipYaz(girdiler) {
  const SABIT_ZAMAN = 0x0000; // 00:00:00
  const SABIT_TARIH = 0x2821; // 2000-01-01
  const yerelBloklar = [];
  const merkeziBloklar = [];
  let uzaklik = 0;

  for (const { yol, icerik } of girdiler) {
    const ad = Buffer.from(yol, "utf8");
    const sikistirilmis = deflateRawSync(icerik, { level: 9 });
    const kontrol = crc32(icerik);

    const yerel = Buffer.alloc(30);
    yerel.writeUInt32LE(0x04034b50, 0); // yerel dosya başlığı imzası
    yerel.writeUInt16LE(20, 4); // gereken sürüm: 2.0
    yerel.writeUInt16LE(0x0800, 6); // bayraklar: dosya adı UTF-8
    yerel.writeUInt16LE(8, 8); // yöntem: deflate
    yerel.writeUInt16LE(SABIT_ZAMAN, 10);
    yerel.writeUInt16LE(SABIT_TARIH, 12);
    yerel.writeUInt32LE(kontrol, 14);
    yerel.writeUInt32LE(sikistirilmis.length, 18);
    yerel.writeUInt32LE(icerik.length, 22);
    yerel.writeUInt16LE(ad.length, 26);
    yerel.writeUInt16LE(0, 28); // ek alan yok

    yerelBloklar.push(yerel, ad, sikistirilmis);

    const merkezi = Buffer.alloc(46);
    merkezi.writeUInt32LE(0x02014b50, 0); // merkezi dizin başlığı imzası
    merkezi.writeUInt16LE(20, 4); // üreten sürüm
    merkezi.writeUInt16LE(20, 6); // gereken sürüm
    merkezi.writeUInt16LE(0x0800, 8);
    merkezi.writeUInt16LE(8, 10);
    merkezi.writeUInt16LE(SABIT_ZAMAN, 12);
    merkezi.writeUInt16LE(SABIT_TARIH, 14);
    merkezi.writeUInt32LE(kontrol, 16);
    merkezi.writeUInt32LE(sikistirilmis.length, 20);
    merkezi.writeUInt32LE(icerik.length, 24);
    merkezi.writeUInt16LE(ad.length, 28);
    merkezi.writeUInt16LE(0, 30); // ek alan
    merkezi.writeUInt16LE(0, 32); // yorum
    merkezi.writeUInt16LE(0, 34); // disk numarası
    merkezi.writeUInt16LE(0, 36); // iç öznitelikler
    merkezi.writeUInt32LE(0o644 << 16, 38); // dış öznitelikler (unix izinleri)
    merkezi.writeUInt32LE(uzaklik, 42);

    merkeziBloklar.push(merkezi, ad);
    uzaklik += yerel.length + ad.length + sikistirilmis.length;
  }

  const merkeziDizin = Buffer.concat(merkeziBloklar);
  const kapanis = Buffer.alloc(22);
  kapanis.writeUInt32LE(0x06054b50, 0); // merkezi dizin sonu imzası
  kapanis.writeUInt16LE(0, 4); // bu disk
  kapanis.writeUInt16LE(0, 6); // merkezi dizinin başladığı disk
  kapanis.writeUInt16LE(girdiler.length, 8);
  kapanis.writeUInt16LE(girdiler.length, 10);
  kapanis.writeUInt32LE(merkeziDizin.length, 12);
  kapanis.writeUInt32LE(uzaklik, 16);
  kapanis.writeUInt16LE(0, 20); // arşiv yorumu yok

  return Buffer.concat([...yerelBloklar, merkeziDizin, kapanis]);
}

// --- Paketleme --------------------------------------------------------------

const girdiler = [];
const satirlar = [];

for (const [kaynak, hedef] of DOSYALAR) {
  const ham = readFileSync(join(kok, kaynak), "utf8");
  if (kaynak === "SKILL.md") skillDosyasiniDogrula(ham);

  /*
   * Paketin içine LF ile yazılır. Depo Windows'ta CRLF ile checkout ediliyor,
   * ama paketi okuyan taraf platformdan bağımsız; satır sonlarını
   * normalleştirmek hem gereksiz farkı önler hem de markdown'ı her yerde aynı
   * gösterir.
   */
  const icerik = Buffer.from(ham.replace(/\r\n/g, "\n"), "utf8");
  girdiler.push({ yol: `${paketAdi}/${hedef}`, icerik });
  satirlar.push(
    `  ${hedef.padEnd(30)} ${String(icerik.length).padStart(6)} bayt`,
  );
}

writeFileSync(cikti, zipYaz(girdiler));

console.log(`${paketAdi}.skill güncellendi:\n${satirlar.join("\n")}`);
console.log(`\n  toplam paket boyutu: ${statSync(cikti).size} bayt`);
