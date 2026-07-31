import {
  BAGLANTI_TANIMLARI,
  baglantilariDogrula,
} from "@/lib/ogrenci/iletisim-kurallar";

/**
 * Öğrencinin profiline yazdığı GitHub / kişisel site / LinkedIn adresleri.
 *
 * Adresler beyandır; testler sahipliği değil biçimi ve güvenliği sınıyor.
 */

/** Kabul edilen sonucu çıkarır, reddedilirse patlar. */
function kabulEdilen(
  girdi: Parameters<typeof baglantilariDogrula>[0],
) {
  const karar = baglantilariDogrula(girdi);
  if (!karar.olurMu) {
    throw new Error(`Beklenmedik şekilde reddedildi: ${karar.neden}`);
  }
  return karar.baglantilar;
}

describe("bağlantı tanımları", () => {
  it("üç alanı da kapsar", () => {
    expect(BAGLANTI_TANIMLARI.map((tanim) => tanim.alan)).toEqual([
      "githubUrl",
      "kisiselSiteUrl",
      "linkedinUrl",
    ]);
  });

  it("kişisel siteye alan adı şartı koymaz", () => {
    // Öğrencinin kendi alan adı ne olursa olsun geçerlidir; şart koymak
    // kutuyu işe yaramaz hâle getirirdi.
    const kisisel = BAGLANTI_TANIMLARI.find(
      (tanim) => tanim.alan === "kisiselSiteUrl",
    );
    expect(kisisel?.beklenenAlanAdi).toBeNull();
  });
});

describe("adres kabulü", () => {
  it("boş girdide üçünü de null bırakır", () => {
    expect(kabulEdilen({})).toEqual({
      githubUrl: null,
      kisiselSiteUrl: null,
      linkedinUrl: null,
    });
  });

  it("yalnızca boşluk içeren değeri null sayar", () => {
    expect(kabulEdilen({ kisiselSiteUrl: "   " }).kisiselSiteUrl).toBeNull();
  });

  it("protokolsüz adresi https ile tamamlar", () => {
    // Doğru bilgiyi vermiş öğrenciyi biçim yüzünden geri çevirmiyoruz.
    expect(kabulEdilen({ githubUrl: "github.com/ali" }).githubUrl).toBe(
      "https://github.com/ali",
    );
  });

  it("http adresini olduğu gibi bırakır", () => {
    expect(
      kabulEdilen({ kisiselSiteUrl: "http://ornek.gov.tr" }).kisiselSiteUrl,
    ).toBe("http://ornek.gov.tr/");
  });

  it("javascript: şemasını reddeder", () => {
    // Adres profilde tıklanabilir basılıyor; kabul edilseydi profile bakan
    // danışmanın tarayıcısında kod çalışırdı.
    const karar = baglantilariDogrula({
      kisiselSiteUrl: "javascript:alert(1)",
    });
    expect(karar.olurMu).toBe(false);
  });

  it("200 karakteri aşan adresi reddeder", () => {
    const karar = baglantilariDogrula({
      kisiselSiteUrl: `https://ornek.gov.tr/${"a".repeat(200)}`,
    });
    expect(karar.olurMu).toBe(false);
  });
});

describe("alan adı eşleşmesi", () => {
  it("GitHub kutusuna başka bir siteyi kabul etmez", () => {
    const karar = baglantilariDogrula({ githubUrl: "https://gitlab.com/ali" });
    expect(karar.olurMu).toBe(false);
  });

  it("LinkedIn alt alan adını kabul eder", () => {
    expect(
      kabulEdilen({ linkedinUrl: "https://tr.linkedin.com/in/ali" }).linkedinUrl,
    ).toBe("https://tr.linkedin.com/in/ali");
  });

  it("kişisel siteye her alan adını kabul eder", () => {
    expect(
      kabulEdilen({ kisiselSiteUrl: "https://gitlab.com/ali" }).kisiselSiteUrl,
    ).toBe("https://gitlab.com/ali");
  });
});
