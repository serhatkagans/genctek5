import { baglantiAdresi, metniParcala } from "@/lib/metin/baglanti";

/**
 * Metindeki bağlantıların ayrıştırılması.
 *
 * Kritik olan iki şey: (1) tehlikeli şemaların hiç bağlantıya dönüşmemesi,
 * (2) metnin tek karakterinin bile kaybolmaması — parçalar birleştirildiğinde
 * özgün metin aynen çıkmalı, yoksa kullanıcının yazdığı şey ekranda eksilir.
 */

/** Parçaları birleştirip özgün metni geri verir. */
function birlestir(metin: string): string {
  return metniParcala(metin)
    .map((p) => p.deger)
    .join("");
}

describe("metniParcala", () => {
  it("bağlantı içermeyen metni tek parça bırakır", () => {
    const parcalar = metniParcala("Yarın saat 10'da toplanıyoruz.");
    expect(parcalar).toEqual([
      { tip: "metin", deger: "Yarın saat 10'da toplanıyoruz." },
    ]);
  });

  it("https adresini bağlantıya çevirir", () => {
    const parcalar = metniParcala("Kayıt: https://genctek.meb.gov.tr/kayit");
    expect(parcalar[1]).toEqual({
      tip: "baglanti",
      deger: "https://genctek.meb.gov.tr/kayit",
      adres: "https://genctek.meb.gov.tr/kayit",
    });
  });

  it("www ile başlayan adrese https ekler", () => {
    const [parca] = metniParcala("www.meb.gov.tr");
    expect(parca).toEqual({
      tip: "baglanti",
      deger: "www.meb.gov.tr",
      adres: "https://www.meb.gov.tr",
    });
  });

  it("cümle sonundaki noktayı bağlantıya katmaz", () => {
    const parcalar = metniParcala("Detay https://ornek.gov.tr/sayfa.");
    expect(parcalar[1].deger).toBe("https://ornek.gov.tr/sayfa");
    expect(parcalar[2]).toEqual({ tip: "metin", deger: "." });
  });

  it("parantez içindeki adresin kapanışını dışarıda bırakır", () => {
    const parcalar = metniParcala("(bkz https://ornek.gov.tr/a)");
    expect(parcalar[1].deger).toBe("https://ornek.gov.tr/a");
    expect(parcalar[2].deger).toBe(")");
  });

  it("adresin kendi parantezini korur", () => {
    const [parca] = metniParcala("https://ornek.gov.tr/a_(b)");
    expect(parca.deger).toBe("https://ornek.gov.tr/a_(b)");
  });

  it("birden çok adresi ayrı ayrı yakalar", () => {
    const baglantilar = metniParcala(
      "İlki https://bir.gov.tr ikincisi www.iki.gov.tr oldu",
    ).filter((p) => p.tip === "baglanti");
    expect(baglantilar).toHaveLength(2);
  });

  it("metnin hiçbir parçasını kaybetmez", () => {
    const metin = "Başla https://a.gov.tr/x, sonra (www.b.gov.tr) ve bitti.";
    expect(birlestir(metin)).toBe(metin);
  });

  it("satır sonlarını korur", () => {
    const metin = "Birinci satır\nhttps://a.gov.tr\nÜçüncü satır";
    expect(birlestir(metin)).toBe(metin);
  });

  // --- Güvenlik ---------------------------------------------------------

  it("javascript: şemasını bağlantıya ÇEVİRMEZ", () => {
    const parcalar = metniParcala("javascript:alert(1)");
    expect(parcalar.every((p) => p.tip === "metin")).toBe(true);
  });

  it("data: şemasını bağlantıya ÇEVİRMEZ", () => {
    const parcalar = metniParcala("data:text/html;base64,PHNjcmlwdD4=");
    expect(parcalar.every((p) => p.tip === "metin")).toBe(true);
  });

  it("HTML etiketlerini metin olarak bırakır", () => {
    const metin = '<script>alert(1)</script>';
    expect(metniParcala(metin).every((p) => p.tip === "metin")).toBe(true);
    expect(birlestir(metin)).toBe(metin);
  });

  it("adres bir HTML etiketinin içindeyse etiketi bağlantıya katmaz", () => {
    // `<` ve `>` desende dışlanıyor; aksi halde bağlantı metni etiketi yutardı.
    const parcalar = metniParcala('<a href="https://kotu.example">tık</a>');
    const baglanti = parcalar.find((p) => p.tip === "baglanti");
    expect(baglanti?.deger).toBe("https://kotu.example");
  });

  it("tek başına www. metin sayılır", () => {
    expect(metniParcala("www.").every((p) => p.tip === "metin")).toBe(true);
  });

  it("ardışık çağrılarda sonuç değişmez", () => {
    // Desen `g` bayrağı taşıyor; lastIndex sıfırlanmazsa ikinci çağrı bozulurdu.
    const metin = "https://a.gov.tr ve https://b.gov.tr";
    expect(metniParcala(metin)).toEqual(metniParcala(metin));
  });
});

describe("baglantiAdresi", () => {
  it("http ve https adresleri olduğu gibi bırakır", () => {
    expect(baglantiAdresi("http://a.gov.tr")).toBe("http://a.gov.tr");
    expect(baglantiAdresi("https://a.gov.tr")).toBe("https://a.gov.tr");
  });

  it("şemasız adrese https ekler", () => {
    // Şemasız href tarayıcıda GÖRELİ yol sayılır ve panel içinde 404'e gider.
    expect(baglantiAdresi("www.a.gov.tr")).toBe("https://www.a.gov.tr");
  });
});
