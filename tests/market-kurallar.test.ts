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
    expect(suzgeciCoz("OGRENCI")).toBe("OGRENCI");
    expect(suzgeciCoz("BENIM")).toBe("BENIM");
  });

  it("tanınmayanı ve boşu TUMU'ye düşürür — hata sayfası değil", () => {
    expect(suzgeciCoz("UYDURMA")).toBe("TUMU");
    expect(suzgeciCoz(undefined)).toBe("TUMU");
  });

  it("TANIMI BEKLENEN süzgeci de TUMU'ye düşürür", () => {
    // DİLİM'in ne olduğu bilinmiyor; adres elle yazılsa bile boş liste
    // gösterilmemeli (→ S22).
    expect(suzgeciCoz("DILIM")).toBe("TUMU");
  });
});

describe("urunleriSuz", () => {
  it("TUMU: paylaşılanlar + kendi paylaşmadıklarım", () => {
    // 6 yok: başkasının paylaşmadığı ürün.
    expect(kimlikler("TUMU")).toEqual([1, 2, 3, 4, 5]);
  });

  it("BENIM: paylaşmadıklarım DA burada — sekmenin adı 'Kendi ürünlerim'", () => {
    expect(kimlikler("BENIM")).toEqual([4, 5]);
  });

  it("OGRENCI: yalnızca paylaşılmış öğrenci ürünleri", () => {
    // 5 yok: kendi ürünüm ama paylaşılmamış; öğrenci vitrininde yeri olmaz.
    expect(kimlikler("OGRENCI")).toEqual([1, 4]);
  });

  it("OGRETMEN: yalnızca paylaşılmış öğretmen ürünleri", () => {
    expect(kimlikler("OGRETMEN")).toEqual([2]);
  });

  it("mezun ürünü rol sekmelerinde YOK ama TUMU'de VAR", () => {
    expect(kimlikler("OGRENCI")).not.toContain(3);
    expect(kimlikler("OGRETMEN")).not.toContain(3);
    expect(kimlikler("TUMU")).toContain(3);
  });

  it("BAŞKASININ paylaşmadığı ürün hiçbir süzgeçte görünmez", () => {
    for (const suzgec of ["TUMU", "BENIM", "OGRENCI", "OGRETMEN"] as const) {
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

  it("istekte sayılan dört başlık da listede", () => {
    const kodlar = MARKET_SUZGECLERI.map((s) => s.kod);
    expect(kodlar).toEqual(
      expect.arrayContaining(["BENIM", "OGRENCI", "OGRETMEN", "DILIM"]),
    );
  });

  it("DİLİM tanım bekliyor ve nedeni yazılı", () => {
    const dilim = suzgecTanimi("DILIM");
    expect(dilim?.tanimBekliyorMu).toBe(true);
    expect(dilim?.aciklama).toMatch(/tanımlanmadı/);
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
