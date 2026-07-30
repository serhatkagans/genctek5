import {
  aydinlatmaOnayiGerekiyorMu,
  saklamaSonTarihi,
  VARSAYILAN_AYDINLATMA_METNI,
} from "@/lib/kvkk/kurallar";

/**
 * KVKK kararları — domain-rules.md Bölüm 10.
 *
 * Kullanıcıların büyük bölümü 18 yaş altı; aydınlatma ve saklama kuralları
 * gevşetilemez, bu yüzden kararlar burada sınanır.
 */

describe("aydınlatma metni onayı", () => {
  const metinTarihi = new Date("2026-03-01T10:00:00Z");

  it("hiç onaylamamış öğrenciden onay istenir", () => {
    expect(
      aydinlatmaOnayiGerekiyorMu({
        onayTarihi: null,
        metinGuncellemeTarihi: metinTarihi,
      }),
    ).toBe(true);
  });

  it("metinden sonra verilen onay geçerlidir", () => {
    expect(
      aydinlatmaOnayiGerekiyorMu({
        onayTarihi: new Date("2026-03-02T10:00:00Z"),
        metinGuncellemeTarihi: metinTarihi,
      }),
    ).toBe(false);
  });

  it("metin güncellenince eski onay geçersizleşir", () => {
    // Kişi artık başka bir metni onaylamış olur; yeniden onay istenir.
    expect(
      aydinlatmaOnayiGerekiyorMu({
        onayTarihi: new Date("2026-02-01T10:00:00Z"),
        metinGuncellemeTarihi: metinTarihi,
      }),
    ).toBe(true);
  });

  it("metin hiç düzenlenmemişse varsayılan metne verilen onay yeter", () => {
    expect(
      aydinlatmaOnayiGerekiyorMu({
        onayTarihi: new Date("2026-02-01T10:00:00Z"),
        metinGuncellemeTarihi: null,
      }),
    ).toBe(false);
  });
});

describe("saklama süresi", () => {
  it("verilen ay kadar geriye gider", () => {
    const sinir = saklamaSonTarihi(new Date("2026-07-15T00:00:00"), 24);
    expect(sinir.getFullYear()).toBe(2024);
    expect(sinir.getMonth()).toBe(6);
  });

  it("yıl sınırını doğru aşar", () => {
    const sinir = saklamaSonTarihi(new Date("2026-02-10T00:00:00"), 12);
    expect(sinir.getFullYear()).toBe(2025);
    expect(sinir.getMonth()).toBe(1);
  });
});

describe("varsayılan aydınlatma metni", () => {
  it("zorunlu başlıkları içerir", () => {
    // Metin sistem ayarından değiştirilebilir ama varsayılanı eksik olamaz:
    // veri sorumlusu, işlenen veri, saklama süresi ve haklar geçmek zorunda.
    for (const parca of [
      "Veri sorumlusu",
      "İşlenen veriler",
      "Saklama süresi",
      "Haklarınız",
    ]) {
      expect(VARSAYILAN_AYDINLATMA_METNI).toContain(parca);
    }
  });

  it("e-Okul kaynaklı alanların değiştirilemeyeceğini söyler", () => {
    expect(VARSAYILAN_AYDINLATMA_METNI).toContain("e-Okul");
    expect(VARSAYILAN_AYDINLATMA_METNI).toContain("değiştirilemez");
  });
});
