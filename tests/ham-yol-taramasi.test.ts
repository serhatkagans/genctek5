import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Alt dizin kurulumunu bozan ham yolları yakalar.
 *
 * NEDEN BÖYLE BİR TEST VAR: uygulama `aiotechs.cloud/genctek` altına kurulu.
 * Next.js'in `<Link>` bileşeni ve `redirect()` basePath'i kendisi ekler, ama
 * HAM HTML öznitelikleri (`<img src>`, `<a href>`, `<form action>`) eklemez.
 * Böyle bir öznitelik tarayıcıyı alan adının köküne gönderir; orada uygulama
 * olmadığı için kullanıcı Next.js'in değil Apache'nin 404 sayfasını görür ve
 * hata hiçbir yerde loglanmaz — teşhisi en zor sınıftan.
 *
 * Bu hata üç ayrı yerde üretildi (rol envanteri "Koordinatör ata" bağlantısı,
 * faaliyet görselleri, profil fotoğrafı). Tip denetimi ve lint yakalamadığı
 * için tarama testle yapılıyor.
 *
 * DÜZELTME: ham özniteliklerde `uygulamaYolu()` kullanın, `<Link>`'te KULLANMAYIN.
 *
 * `uygulamaYolu` burada İÇE AKTARILMAZ: ortam.ts yüklendiği anda ortam
 * değişkenlerini doğruluyor ve test ortamında DATABASE_URL yok. Bu testin işi
 * zaten kaynak taraması, çalışma zamanı davranışı değil.
 */

const KAYNAK_DIZINI = join(__dirname, "..", "src");

/** `src=` ya da `href=` ardından doğrudan `/panel` veya `/giris` ile başlayan yol. */
const HAM_YOL = /(?:src|href|action)=\{?[`"']\/(?:panel|giris)/g;

function tsxDosyalari(dizin: string, toplanan: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    const tam = join(dizin, ad);
    if (statSync(tam).isDirectory()) {
      tsxDosyalari(tam, toplanan);
    } else if (ad.endsWith(".tsx")) {
      toplanan.push(tam);
    }
  }
  return toplanan;
}

/**
 * `<Link href="/panel/...">` sorun DEĞİLDİR; taramada yanlış alarm üretmemesi
 * için Link bloklarındaki href'ler ayıklanır. Kabaca ama yeterli: `<Link`
 * etiketinin açılışından kapanışına kadar olan aralık atlanır.
 */
function linkBloklariniCikar(icerik: string): string {
  return icerik.replace(/<Link\b[\s\S]*?>/g, "");
}

describe("ham yol taraması", () => {
  it("hiçbir .tsx dosyasında basePath'siz ham src/href/action kalmamalı", () => {
    const bulgular: string[] = [];

    for (const dosya of tsxDosyalari(KAYNAK_DIZINI)) {
      const ham = linkBloklariniCikar(readFileSync(dosya, "utf8"));
      for (const eslesme of ham.matchAll(HAM_YOL)) {
        const oncesi = ham.slice(0, eslesme.index);
        const satir = oncesi.split("\n").length;
        bulgular.push(
          `${dosya.replace(KAYNAK_DIZINI, "src")}:${satir} -> ${eslesme[0]}`,
        );
      }
    }

    expect(bulgular).toEqual([]);
  });
});
