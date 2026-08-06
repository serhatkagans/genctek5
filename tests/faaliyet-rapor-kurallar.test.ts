import {
  raporMetniniCoz,
  raporYazilabilirMi,
} from "@/lib/faaliyet/rapor-kurallar";

/**
 * Faaliyet raporu kuralları.
 */

const SIMDI = new Date("2026-07-31T12:00:00+03:00");

describe("raporYazilabilirMi", () => {
  it("bitmiş tek günlük faaliyette yazılabilir", () => {
    expect(
      raporYazilabilirMi({
        tarih: new Date("2026-07-20T10:00:00+03:00"),
        bitisTarihi: null,
        durum: "AKTIF",
        simdi: SIMDI,
      }).olurMu,
    ).toBe(true);
  });

  it("gelecekteki faaliyette yazılamaz", () => {
    const karar = raporYazilabilirMi({
      tarih: new Date("2026-08-10T10:00:00+03:00"),
      bitisTarihi: null,
      durum: "AKTIF",
      simdi: SIMDI,
    });
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toContain("henüz bitmedi");
  });

  it("çok günlü faaliyette BİTİŞ tarihine bakar", () => {
    /*
     * Üç aylık bir programın raporu ilk gününde yazılamaz. Başlangıca
     * bakılsaydı süren bir faaliyetin raporu yazılabilirdi.
     */
    const karar = raporYazilabilirMi({
      tarih: new Date("2026-07-01T10:00:00+03:00"),
      bitisTarihi: new Date("2026-09-30T18:00:00+03:00"),
      durum: "AKTIF",
      simdi: SIMDI,
    });
    expect(karar.olurMu).toBe(false);
  });

  it("bitişi geçmiş çok günlü faaliyette yazılabilir", () => {
    expect(
      raporYazilabilirMi({
        tarih: new Date("2026-07-01T10:00:00+03:00"),
        bitisTarihi: new Date("2026-07-05T18:00:00+03:00"),
        durum: "AKTIF",
        simdi: SIMDI,
      }).olurMu,
    ).toBe(true);
  });

  it("iptal edilmiş faaliyette yazılamaz", () => {
    // Yapılmamış bir etkinliğin değerlendirmesi anlamsızdır.
    const karar = raporYazilabilirMi({
      tarih: new Date("2026-07-20T10:00:00+03:00"),
      bitisTarihi: null,
      durum: "IPTAL_EDILDI",
      simdi: SIMDI,
    });
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toContain("İptal edilmiş");
  });
});

describe("raporMetniniCoz", () => {
  it("değerlendirmeyi kırpar, kazanımı isteğe bağlı bırakır", () => {
    expect(
      raporMetniniCoz({ degerlendirme: "  İyi geçti.  ", kazanimlar: "  " }),
    ).toEqual({ olurMu: true, degerlendirme: "İyi geçti.", kazanimlar: null });
  });

  it("kazanım yazılmışsa korur", () => {
    const sonuc = raporMetniniCoz({
      degerlendirme: "İyi geçti.",
      kazanimlar: "Takım çalışması gelişti.",
    });
    expect(sonuc).toEqual({
      olurMu: true,
      degerlendirme: "İyi geçti.",
      kazanimlar: "Takım çalışması gelişti.",
    });
  });

  it("boş değerlendirmeyi reddeder", () => {
    // Değerlendirmesi olmayan kayıt "rapor yazıldı" göstergesini yalancı çıkarır.
    const sonuc = raporMetniniCoz({ degerlendirme: "   ", kazanimlar: "x" });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("boş bırakılamaz");
  });

  it("çok uzun metinleri reddeder", () => {
    expect(
      raporMetniniCoz({ degerlendirme: "a".repeat(5001), kazanimlar: "" }).olurMu,
    ).toBe(false);
    expect(
      raporMetniniCoz({ degerlendirme: "ok", kazanimlar: "a".repeat(3001) })
        .olurMu,
    ).toBe(false);
  });
});
