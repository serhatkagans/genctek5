import {
  basHarfler,
  profilFotoKabulEdilirMi,
  type ProfilFotoSinirlari,
  profilFotoTipAdlari,
} from "@/lib/kullanici/profil-foto-kurallar";

/**
 * Profil fotoğrafı kabul kuralları.
 *
 * Kurallar saf olduğu için veritabanı ve dosya sistemi olmadan doğrulanıyor;
 * `cv-kurallar` testleriyle aynı desen.
 */

const SINIRLAR: ProfilFotoSinirlari = {
  izinliTipler: ["image/jpeg", "image/png", "image/webp"],
  maksBayt: 2 * 1024 * 1024,
};

function dosya(ustuneYaz: Partial<Parameters<typeof profilFotoKabulEdilirMi>[0]> = {}) {
  return {
    mimeTipi: "image/jpeg",
    boyutBayt: 500 * 1024,
    dosyaAdi: "vesikalik.jpg",
    ...ustuneYaz,
  };
}

describe("profilFotoKabulEdilirMi", () => {
  it("izinli tip ve sınır içinde boyutu kabul eder", () => {
    expect(profilFotoKabulEdilirMi(dosya(), SINIRLAR).olurMu).toBe(true);
  });

  it("izinli tiplerin hepsini kabul eder", () => {
    for (const tip of SINIRLAR.izinliTipler) {
      expect(profilFotoKabulEdilirMi(dosya({ mimeTipi: tip }), SINIRLAR).olurMu).toBe(
        true,
      );
    }
  });

  it("dosya seçilmediyse reddeder", () => {
    const karar = profilFotoKabulEdilirMi(dosya({ dosyaAdi: "  " }), SINIRLAR);
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toBe("Dosya seçilmedi.");
  });

  it("boş dosyayı reddeder", () => {
    const karar = profilFotoKabulEdilirMi(dosya({ boyutBayt: 0 }), SINIRLAR);
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toBe("Boş dosya yüklenemez.");
  });

  it("izinli olmayan tipi reddeder ve izinlileri sayar", () => {
    const karar = profilFotoKabulEdilirMi(
      dosya({ mimeTipi: "application/pdf", dosyaAdi: "ozgecmis.pdf" }),
      SINIRLAR,
    );
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toContain("jpg, png, webp");
  });

  it("CV için geçerli olan doc tipini profil fotoğrafında reddeder", () => {
    // İki ayarın ayrı tutulmasının sebebi bu: CV'de açılan bir tip avatarda
    // kendiliğinden geçerli olmamalı.
    const karar = profilFotoKabulEdilirMi(
      dosya({ mimeTipi: "application/msword", dosyaAdi: "cv.doc" }),
      SINIRLAR,
    );
    expect(karar.olurMu).toBe(false);
  });

  it("sınırı aşan dosyayı reddeder ve iki boyutu da yazar", () => {
    const karar = profilFotoKabulEdilirMi(
      dosya({ boyutBayt: 3 * 1024 * 1024 }),
      SINIRLAR,
    );
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toContain("3 MB");
    expect(karar.neden).toContain("2 MB");
  });

  it("tam sınırdaki dosyayı kabul eder", () => {
    // Sınır "aşarsa reddet" demek; eşitlik reddedilmemeli.
    expect(
      profilFotoKabulEdilirMi(dosya({ boyutBayt: SINIRLAR.maksBayt }), SINIRLAR)
        .olurMu,
    ).toBe(true);
  });

  it("1 MB altındaki sınırı 0 MB diye yazmaz", () => {
    const karar = profilFotoKabulEdilirMi(dosya({ boyutBayt: 900 * 1024 }), {
      ...SINIRLAR,
      maksBayt: 512 * 1024,
    });
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toContain("0.5 MB");
  });
});

describe("profilFotoTipAdlari", () => {
  it("MIME tiplerini okunur karşılıklarına çevirir", () => {
    expect(profilFotoTipAdlari(["image/jpeg", "image/png"])).toBe("jpg, png");
  });

  it("karşılığı olmayan tipi olduğu gibi bırakır", () => {
    expect(profilFotoTipAdlari(["image/avif"])).toBe("image/avif");
  });
});

describe("basHarfler", () => {
  it("ad ve soyadın baş harflerini büyütür", () => {
    expect(basHarfler("Elif", "Yılmaz")).toBe("EY");
  });

  it("Türkçe küçük i'yi İ yapar", () => {
    // Varsayılan toUpperCase() "i" harfini "I" yapar; Türkçe'de yanlıştır.
    expect(basHarfler("irem", "şahin")).toBe("İŞ");
  });

  it("soyad boşsa tek harf döner", () => {
    expect(basHarfler("Ahmet", "")).toBe("A");
  });
});
