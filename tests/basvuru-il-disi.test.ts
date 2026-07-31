import {
  baslangicOnayDurumu,
  degerlendirmeyeHazirMi,
  ilDisiBasvuruMu,
  kaynakIlKarariniCoz,
  kaynakIlKarariVerilebilirMi,
} from "@/lib/basvuru/il-disi";

/**
 * İl dışı başvurunun çift onay kuralları.
 *
 * Kritik davranış: kaynak ilin kararı verilmeden faaliyeti düzenleyen
 * değerlendirme yapamaz. Sıra bozulursa öğrenci, kendi ili izin vermeden başka
 * bir ilin etkinliğine seçilmiş olur.
 */

describe("ilDisiBasvuruMu", () => {
  it("farklı iller için doğrudur", () => {
    expect(ilDisiBasvuruMu("35", "06")).toBe(true);
  });

  it("aynı il için yanlıştır", () => {
    expect(ilDisiBasvuruMu("34", "34")).toBe(false);
  });

  it("il bilinmiyorsa onay istemez", () => {
    // Bilinmeyen ili "farklı" saymak, kimsenin çözemeyeceği bir bekleme
    // üretirdi: hangi ilin koordinatörü karar verecek belli olmaz.
    expect(ilDisiBasvuruMu(null, "06")).toBe(false);
    expect(ilDisiBasvuruMu("35", null)).toBe(false);
    expect(ilDisiBasvuruMu(null, null)).toBe(false);
  });
});

describe("baslangicOnayDurumu", () => {
  it("il dışı başvuru kaynak ilin onayını bekler", () => {
    expect(baslangicOnayDurumu("35", "06")).toBe("BEKLIYOR");
  });

  it("il içi başvuruda onay istenmez", () => {
    expect(baslangicOnayDurumu("34", "34")).toBe("ONAY_GEREKMEZ");
  });
});

describe("degerlendirmeyeHazirMi", () => {
  it("onay gerekmeyen başvuru değerlendirilebilir", () => {
    expect(degerlendirmeyeHazirMi("ONAY_GEREKMEZ")).toBe(true);
  });

  it("kaynak il onayladıysa değerlendirilebilir", () => {
    expect(degerlendirmeyeHazirMi("ONAYLANDI")).toBe(true);
  });

  it("kaynak ilin kararı beklenirken DEĞERLENDİRİLEMEZ", () => {
    // Akışın tek kritik kuralı: sıra bozulamaz.
    expect(degerlendirmeyeHazirMi("BEKLIYOR")).toBe(false);
  });

  it("kaynak il reddettiyse değerlendirilemez", () => {
    expect(degerlendirmeyeHazirMi("REDDEDILDI")).toBe(false);
  });
});

describe("kaynakIlKarariVerilebilirMi", () => {
  it("bekleyen ve canlı başvuruya karar verilebilir", () => {
    expect(
      kaynakIlKarariVerilebilirMi({
        kaynakIlOnayDurumu: "BEKLIYOR",
        basvuruDurumu: "BEKLIYOR",
      }),
    ).toBe(true);
  });

  it("kararı verilmiş başvuruya ikinci kez karar verilemez", () => {
    expect(
      kaynakIlKarariVerilebilirMi({
        kaynakIlOnayDurumu: "ONAYLANDI",
        basvuruDurumu: "BEKLIYOR",
      }),
    ).toBe(false);
  });

  it("geri çekilmiş başvuruya karar verilemez", () => {
    expect(
      kaynakIlKarariVerilebilirMi({
        kaynakIlOnayDurumu: "BEKLIYOR",
        basvuruDurumu: "GERI_CEKILDI",
      }),
    ).toBe(false);
  });

  it("faaliyeti iptal edilmiş başvuruya karar verilemez", () => {
    expect(
      kaynakIlKarariVerilebilirMi({
        kaynakIlOnayDurumu: "BEKLIYOR",
        basvuruDurumu: "IPTAL_EDILDI",
      }),
    ).toBe(false);
  });
});

describe("kaynakIlKarariniCoz", () => {
  it("onayda gerekçe zorunlu değildir", () => {
    const sonuc = kaynakIlKarariniCoz({ onaylandiMi: true, gerekce: "" });
    expect(sonuc).toEqual({ olurMu: true, durum: "ONAYLANDI", gerekce: null });
  });

  it("onayda yazılan not korunur", () => {
    const sonuc = kaynakIlKarariniCoz({
      onaylandiMi: true,
      gerekce: "  Ulaşımı okul karşılıyor.  ",
    });
    expect(sonuc).toEqual({
      olurMu: true,
      durum: "ONAYLANDI",
      gerekce: "Ulaşımı okul karşılıyor.",
    });
  });

  it("REDDE gerekçe zorunludur", () => {
    // Öğrenci alıkonuyorsa sebebini öğrenmeli.
    const sonuc = kaynakIlKarariniCoz({ onaylandiMi: false, gerekce: "   " });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("Ret gerekçesi zorunludur");
  });

  it("gerekçeli ret kabul edilir", () => {
    const sonuc = kaynakIlKarariniCoz({
      onaylandiMi: false,
      gerekce: "Aynı tarihte il içi etkinliğimiz var.",
    });
    expect(sonuc).toEqual({
      olurMu: true,
      durum: "REDDEDILDI",
      gerekce: "Aynı tarihte il içi etkinliğimiz var.",
    });
  });
});
