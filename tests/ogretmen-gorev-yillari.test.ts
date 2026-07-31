import {
  egitimOgretimYili,
  egitimOgretimYiliAraligi,
  gorevYillari,
  gorevYillariYaz,
  yilBicimiGecerliMi,
} from "@/lib/ogretmen/gorev-yillari";

/**
 * Öğretmen envanterindeki "görev aldığı eğitim-öğretim yılı(ları)" hesabı —
 * analiz dokümanı Bölüm 2.
 *
 * Yıl ayrı bir sütunda tutulmuyor, rol kayıtlarının tarihlerinden türetiliyor;
 * bu yüzden sınırların (1 Eylül) doğru olması kritik.
 */

describe("eğitim-öğretim yılı sınırı", () => {
  it("eylül ayı yeni yılın başlangıcıdır", () => {
    expect(egitimOgretimYili(new Date(2025, 8, 1))).toBe("2025-2026");
    expect(egitimOgretimYili(new Date(2025, 11, 31))).toBe("2025-2026");
  });

  it("ağustos hâlâ önceki yıla aittir", () => {
    expect(egitimOgretimYili(new Date(2025, 7, 31))).toBe("2024-2025");
    expect(egitimOgretimYili(new Date(2025, 0, 15))).toBe("2024-2025");
  });
});

describe("yıl biçimi", () => {
  it("ardışık iki yıl bekler", () => {
    expect(yilBicimiGecerliMi("2025-2026")).toBe(true);
    expect(yilBicimiGecerliMi("2025-2027")).toBe(false);
    expect(yilBicimiGecerliMi("2025")).toBe(false);
    expect(yilBicimiGecerliMi("abcd-efgh")).toBe(false);
  });

  it("geçersiz biçimde aralık üretilmez", () => {
    // Filtre değerleri adres çubuğundan geliyor; doğrulanmamış bir değerin
    // sorguya sızması sorguyu sessizce yanlış aralıkla çalıştırırdı.
    expect(egitimOgretimYiliAraligi("2025")).toBeNull();
  });

  it("aralık 1 Eylül'de başlar, 31 Ağustos'ta biter", () => {
    const aralik = egitimOgretimYiliAraligi("2025-2026");
    expect(aralik).not.toBeNull();
    if (!aralik) return;
    expect(aralik.baslangic.getFullYear()).toBe(2025);
    expect(aralik.baslangic.getMonth()).toBe(8);
    expect(aralik.baslangic.getDate()).toBe(1);
    expect(aralik.bitis.getFullYear()).toBe(2026);
    expect(aralik.bitis.getMonth()).toBe(7);
    expect(aralik.bitis.getDate()).toBe(31);
  });
});

describe("görev yılları", () => {
  const simdi = new Date(2026, 2, 1); // 2025-2026 yılı içinde

  it("süren görev şimdiye kadar sayılır", () => {
    const yillar = gorevYillari(
      [{ baslangicTarihi: new Date(2024, 8, 15), bitisTarihi: null }],
      simdi,
    );
    expect(yillar).toEqual(["2024-2025", "2025-2026"]);
  });

  it("biten görev yalnızca kapsadığı yılları verir", () => {
    const yillar = gorevYillari(
      [
        {
          baslangicTarihi: new Date(2023, 9, 1),
          bitisTarihi: new Date(2024, 4, 30),
        },
      ],
      simdi,
    );
    expect(yillar).toEqual(["2023-2024"]);
  });

  it("aynı yıldaki iki ayrı rol tek yıl olarak görünür", () => {
    // Soru "hangi yıllarda görev aldı", "kaç rol aldı" değil.
    const yillar = gorevYillari(
      [
        {
          baslangicTarihi: new Date(2025, 8, 10),
          bitisTarihi: new Date(2025, 10, 1),
        },
        {
          baslangicTarihi: new Date(2025, 10, 2),
          bitisTarihi: null,
        },
      ],
      simdi,
    );
    expect(yillar).toEqual(["2025-2026"]);
  });

  it("bozuk kayıtta (bitiş başlangıçtan önce) en azından başlangıç yılı sayılır", () => {
    const yillar = gorevYillari(
      [
        {
          baslangicTarihi: new Date(2024, 9, 1),
          bitisTarihi: new Date(2024, 8, 1),
        },
      ],
      simdi,
    );
    expect(yillar).toEqual(["2024-2025"]);
  });

  it("rol yoksa liste boştur ve ekranda tire gösterilir", () => {
    expect(gorevYillari([], simdi)).toEqual([]);
    expect(gorevYillariYaz([])).toBe("—");
  });
});
