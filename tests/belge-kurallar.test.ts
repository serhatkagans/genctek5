import {
  aliciAdiniCoz,
  BELGE_TURU_ETIKETLERI,
  belgeMetniUret,
  belgeTuruMu,
} from "@/lib/belge/kurallar";

/**
 * Katılım ve teşekkür belgesi kuralları.
 */

const TEMEL = {
  adSoyad: "Elif Yılmaz",
  faaliyetAdi: "Robotik Atölyesi",
  tarihMetni: "12 Mart 2026",
};

describe("belgeMetniUret", () => {
  it("katılım belgesi OLGU cümlesi kurar", () => {
    const metin = belgeMetniUret({ ...TEMEL, tur: "KATILIM" });
    expect(metin.baslik).toBe("Katılım Belgesi");
    expect(metin.govde).toBe("Robotik Atölyesi adlı faaliyete katılmıştır.");
  });

  it("teşekkür belgesi DEĞERLENDİRME cümlesi kurar", () => {
    /*
     * İki tür ayrı cümle kuruyor: katılım bir olguyu belgeler, teşekkür bir
     * değerlendirme taşır. Aynı metni paylaşsalardı teşekkür belgesi katılım
     * belgesinin süslü hâli olurdu.
     */
    const metin = belgeMetniUret({ ...TEMEL, tur: "TESEKKUR" });
    expect(metin.baslik).toBe("Teşekkür Belgesi");
    expect(metin.govde).toContain("teşekkür ederiz");
    expect(metin.govde).not.toContain("katılmıştır");
  });

  it("özel metin verildiğinde gövdeyi tamamen değiştirir", () => {
    // Teşekkür belgesi çoğu zaman konuşmacıya ya da destek veren kuruma
    // yazılır; kalıp cümle oraya uymaz.
    const metin = belgeMetniUret({
      ...TEMEL,
      tur: "TESEKKUR",
      ozelMetin: "  Atölyenin yürütülmesindeki desteği için.  ",
    });
    expect(metin.govde).toBe("Atölyenin yürütülmesindeki desteği için.");
  });

  it("boş özel metin kalıbı bozmaz", () => {
    const metin = belgeMetniUret({ ...TEMEL, tur: "KATILIM", ozelMetin: "   " });
    expect(metin.govde).toContain("katılmıştır");
  });

  it("adı kırpar", () => {
    const metin = belgeMetniUret({
      ...TEMEL,
      tur: "KATILIM",
      adSoyad: "  Elif Yılmaz  ",
    });
    expect(metin.adSoyad).toBe("Elif Yılmaz");
  });

  it("tarih ÜRETİM tarihi değil, verilen tarihtir", () => {
    // Belgede faaliyetin tarihi yazar; belgeyi ne zaman bastığınız değil.
    expect(belgeMetniUret({ ...TEMEL, tur: "KATILIM" }).tarihMetni).toBe(
      "12 Mart 2026",
    );
  });
});

describe("belgeTuruMu", () => {
  it("tanımlı türleri tanır", () => {
    expect(belgeTuruMu("KATILIM")).toBe(true);
    expect(belgeTuruMu("TESEKKUR")).toBe(true);
  });

  it("tanımsız türü reddeder", () => {
    expect(belgeTuruMu("ODUL")).toBe(false);
  });

  it("her türün ekran etiketi vardır", () => {
    for (const tur of ["KATILIM", "TESEKKUR"] as const) {
      expect(BELGE_TURU_ETIKETLERI[tur]).toBeTruthy();
    }
  });
});

describe("aliciAdiniCoz", () => {
  it("adı kırpar ve iç boşlukları teke indirir", () => {
    expect(aliciAdiniCoz("  Ayşe   Demir  ")).toEqual({
      olurMu: true,
      adSoyad: "Ayşe Demir",
    });
  });

  it("boş adı reddeder", () => {
    const sonuc = aliciAdiniCoz("   ");
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("kime verileceği");
  });

  it("çok uzun adı reddeder", () => {
    expect(aliciAdiniCoz("a".repeat(121)).olurMu).toBe(false);
  });

  it("sistemde kaydı olmayan kişi de alıcı olabilir", () => {
    // Teşekkür belgesi dışarıdan gelen konuşmacıya da yazılır; alıcının
    // sistemde kullanıcı kaydı olması ZORUNLU DEĞİL.
    expect(aliciAdiniCoz("Prof. Dr. Mehmet Kaya").olurMu).toBe(true);
  });
});
