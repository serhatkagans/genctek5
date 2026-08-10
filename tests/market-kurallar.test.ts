import type { RolKodu } from "@/generated/prisma/enums";
import {
  MARKET_SUZGECLERI,
  type MarketUrunu,
  sahipKumesi,
  sayacArtmaliMi,
  sayiYaz,
  suzgeciCoz,
  suzgecTanimi,
  urunGorunurMu,
  urunleriSuz,
} from "@/lib/market/kurallar";

/** GençTek Market — süzgeç ve görünürlük kuralları (I). */

const BEN = 1;
const BASKA_OGRENCI = 2;
const OGRETMEN = 3;
const MEZUN = 4;

function urun(ustune: Partial<MarketUrunu> & { id: number }): MarketUrunu {
  return {
    sahipKullaniciId: BASKA_OGRENCI,
    sahipKumesi: "OGRENCI",
    markettePaylasilsin: true,
    ...ustune,
  };
}

const VITRIN: MarketUrunu[] = [
  urun({ id: 1, sahipKullaniciId: BASKA_OGRENCI, sahipKumesi: "OGRENCI" }),
  urun({ id: 2, sahipKullaniciId: OGRETMEN, sahipKumesi: "OGRETMEN" }),
  urun({ id: 3, sahipKullaniciId: MEZUN, sahipKumesi: "DIGER" }),
  urun({ id: 4, sahipKullaniciId: BEN, sahipKumesi: "OGRENCI" }),
  // Kendi paylaşmadığım ürün.
  urun({ id: 5, sahipKullaniciId: BEN, sahipKumesi: "OGRENCI", markettePaylasilsin: false }),
  // BAŞKASININ paylaşmadığı ürün — sorgu bunu hiç getirmemeli, getirse bile
  // süzgeçten geçmemeli.
  urun({
    id: 6,
    sahipKullaniciId: BASKA_OGRENCI,
    sahipKumesi: "OGRENCI",
    markettePaylasilsin: false,
  }),
];

function kimlikler(suzgec: Parameters<typeof urunleriSuz>[1]): number[] {
  return urunleriSuz(VITRIN, suzgec, BEN).map((u) => u.id);
}

describe("sahipKumesi", () => {
  it("öğrenci rolü varsa öğrencidir", () => {
    expect(sahipKumesi(["OGRENCI"])).toBe("OGRENCI");
  });

  it("danışman, koordinatör ve proje yöneticisi öğretmen kümesindedir", () => {
    expect(sahipKumesi(["DANISMAN"])).toBe("OGRETMEN");
    expect(sahipKumesi(["IL_KOORDINATOR"])).toBe("OGRETMEN");
    expect(sahipKumesi(["PROJE_YONETICISI"])).toBe("OGRETMEN");
  });

  it("birden çok rolde ÖĞRENCİ önce gelir", () => {
    // Öğrenci hem öğrenci hem (ileride) başka bir rol taşıyabilir; ürünü
    // öğretmen ürünü diye listelemek yanlış olurdu.
    const roller: RolKodu[] = ["DANISMAN", "OGRENCI"];
    expect(sahipKumesi(roller)).toBe("OGRENCI");
  });

  it("mezun ve paydaş temsilcisi ikisine de girmez", () => {
    expect(sahipKumesi(["MEZUN"])).toBe("DIGER");
    expect(sahipKumesi(["PAYDAS_TEMSILCISI"])).toBe("DIGER");
  });

  it("rolsüz kişi DIGER", () => {
    expect(sahipKumesi([])).toBe("DIGER");
  });
});

describe("suzgeciCoz", () => {
  it("tanınan süzgeci geçirir", () => {
    expect(suzgeciCoz("TUMU")).toBe("TUMU");
    expect(suzgeciCoz("BENIM")).toBe("BENIM");
  });

  it("tanınmayanı ve boşu TUMU'ye düşürür — hata sayfası değil", () => {
    expect(suzgeciCoz("UYDURMA")).toBe("TUMU");
    expect(suzgeciCoz(undefined)).toBe("TUMU");
  });
});

describe("urunleriSuz", () => {
  it("TUMU: paylaşılanlar + kendi paylaşmadıklarım", () => {
    // 6 yok: başkasının paylaşmadığı ürün.
    expect(kimlikler("TUMU")).toEqual([1, 2, 3, 4, 5]);
  });

  it("BENIM: paylaşmadıklarım DA burada — sekmenin adı 'Ürünlerim'", () => {
    expect(kimlikler("BENIM")).toEqual([4, 5]);
  });

  /*
   * 10 AĞUSTOS 2026 · istek: "öğrenci ve öğretmen ürünleri ayrı olmayacak".
   * Vitrin artık sahibin rolüne göre bölünmüyor; mezun/paydaş ürünü de
   * (id 3) hiçbir sekmenin dışında kalmıyor.
   */
  it("vitrin sahibin rolüne göre bölünmez", () => {
    expect(kimlikler("TUMU")).toEqual(expect.arrayContaining([1, 2, 3]));
  });

  it("BAŞKASININ paylaşmadığı ürün hiçbir süzgeçte görünmez", () => {
    for (const suzgec of ["TUMU", "BENIM"] as const) {
      expect(kimlikler(suzgec)).not.toContain(6);
    }
  });
});

describe("urunGorunurMu", () => {
  it("paylaşılan ürünü herkes görür", () => {
    expect(
      urunGorunurMu({ sahipKullaniciId: BASKA_OGRENCI, markettePaylasilsin: true }, BEN),
    ).toBe(true);
  });

  it("paylaşılmayan ürünü yalnızca sahibi görür", () => {
    expect(
      urunGorunurMu({ sahipKullaniciId: BEN, markettePaylasilsin: false }, BEN),
    ).toBe(true);
    expect(
      urunGorunurMu(
        { sahipKullaniciId: BASKA_OGRENCI, markettePaylasilsin: false },
        BEN,
      ),
    ).toBe(false);
  });
});

describe("sayacArtmaliMi", () => {
  it("başkasının bakışı sayılır", () => {
    expect(sayacArtmaliMi(BASKA_OGRENCI, BEN)).toBe(true);
  });

  it("SAHİBİNİN kendi bakışı SAYILMAZ — yenileyerek şişirilemesin", () => {
    expect(sayacArtmaliMi(BEN, BEN)).toBe(false);
  });
});

describe("süzgeç tanımları", () => {
  it("kodlar benzersiz", () => {
    const kodlar = MARKET_SUZGECLERI.map((s) => s.kod);
    expect(new Set(kodlar).size).toBe(kodlar.length);
  });

  it("yalnızca iki süzgeç kaldı: vitrin ve kendi ürünlerim", () => {
    expect(MARKET_SUZGECLERI.map((s) => s.kod)).toEqual(["TUMU", "BENIM"]);
    expect(suzgecTanimi("BENIM")?.etiket).toBe("Ürünlerim");
  });

  /*
   * Kalkan süzgeçlerin adresleri yer imlerinde ve eski bağlantılarda kalmış
   * olabilir; hata sayfası değil vitrin gösteriliyor.
   */
  it("kalkan süzgeç adresleri vitrine düşer", () => {
    for (const eski of ["OGRENCI", "OGRETMEN", "DILIM", "SACMA"]) {
      expect(suzgeciCoz(eski)).toBe("TUMU");
    }
    expect(suzgecTanimi("DILIM")).toBeNull();
  });

  it("çalışan süzgeçlerin hepsinin açıklaması var", () => {
    for (const suzgec of MARKET_SUZGECLERI) {
      expect(suzgec.etiket.trim().length).toBeGreaterThan(0);
      expect(suzgec.aciklama.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("sayiYaz", () => {
  it("binlik ayracı koyar", () => {
    expect(sayiYaz(1240)).toBe("1.240");
    expect(sayiYaz(0)).toBe("0");
  });
});
