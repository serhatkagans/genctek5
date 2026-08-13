import {
  buEkibiYonetebilirMi,
  ekipAdiniCoz,
  ekipMesajiniCoz,
  ekipSohbetiOkuyabilirMi,
  ekipSohbetineYazabilirMi,
  ekipYonetebilirMi,
} from "@/lib/ekip/kurallar";
import {
  danismanYap,
  koordinatorYap,
  mezunYap,
  ogrenciYap,
  projeYoneticisiYap,
} from "./yardimcilar";

/**
 * Ekip kuralları (13 Ağustos 2026).
 *
 * Bu dosyanın varlık sebebi: ekip üyeliği, danışman onayından GEÇMEDEN
 * yazışma hakkı doğuran tek yapıdır. Yanlış yazılmış bir koşul hata vermez —
 * yalnızca başka ilin öğrencisini bir sohbete sokar.
 */

describe("ekip yönetme yetkisi", () => {
  it("il koordinatörü ve proje yöneticisi ekip kurar", () => {
    expect(ekipYonetebilirMi(koordinatorYap())).toBe(true);
    expect(ekipYonetebilirMi(projeYoneticisiYap())).toBe(true);
  });

  it("öğrenci, öğretmen ve mezun ekip kuramaz", () => {
    expect(ekipYonetebilirMi(ogrenciYap())).toBe(false);
    expect(ekipYonetebilirMi(danismanYap())).toBe(false);
    expect(ekipYonetebilirMi(mezunYap())).toBe(false);
  });

  it("koordinatör YALNIZCA kendi ilinin ekibini yönetir", () => {
    const koordinator = koordinatorYap({ ilKodu: "34" });
    expect(buEkibiYonetebilirMi(koordinator, "34")).toBe(true);
    expect(buEkibiYonetebilirMi(koordinator, "06")).toBe(false);
  });

  it("proje yöneticisi her ilin ekibini yönetir", () => {
    expect(buEkibiYonetebilirMi(projeYoneticisiYap(), "06")).toBe(true);
  });
});

describe("ekip sohbeti", () => {
  const ekip = { ilKodu: "34", aktif: true, uyeKullaniciIdleri: [] as number[] };

  it("üye okur ve yazar", () => {
    const ogrenci = ogrenciYap();
    const uyeli = { ...ekip, uyeKullaniciIdleri: [ogrenci.id] };
    expect(ekipSohbetiOkuyabilirMi(ogrenci, uyeli)).toBe(true);
    expect(ekipSohbetineYazabilirMi(ogrenci, uyeli)).toBe(true);
  });

  it("üye olmayan öğrenci okuyamaz", () => {
    expect(ekipSohbetiOkuyabilirMi(ogrenciYap(), ekip)).toBe(false);
  });

  it("ilin koordinatörü üye olmasa da okur (gizli kanal yok)", () => {
    expect(ekipSohbetiOkuyabilirMi(koordinatorYap({ ilKodu: "34" }), ekip)).toBe(
      true,
    );
  });

  it("başka ilin koordinatörü okuyamaz", () => {
    expect(ekipSohbetiOkuyabilirMi(koordinatorYap({ ilKodu: "06" }), ekip)).toBe(
      false,
    );
  });

  it("kapatılmış ekibe kimse yazamaz, okumak serbest", () => {
    const ogrenci = ogrenciYap();
    const kapali = { ...ekip, aktif: false, uyeKullaniciIdleri: [ogrenci.id] };
    expect(ekipSohbetiOkuyabilirMi(ogrenci, kapali)).toBe(true);
    expect(ekipSohbetineYazabilirMi(ogrenci, kapali)).toBe(false);
    expect(
      ekipSohbetineYazabilirMi(koordinatorYap({ ilKodu: "34" }), kapali),
    ).toBe(false);
  });
});

describe("ekip adı", () => {
  it("boş ad kabul edilmez", () => {
    expect(ekipAdiniCoz({ ad: "   ", aciklama: "" }).olurMu).toBe(false);
  });

  it("fazladan boşluklar tek boşluğa iner", () => {
    const karar = ekipAdiniCoz({ ad: "  Robotik   Ekibi ", aciklama: " " });
    expect(karar).toEqual({
      olurMu: true,
      ad: "Robotik Ekibi",
      aciklama: null,
    });
  });

  it("çok uzun ad ve açıklama reddedilir", () => {
    expect(ekipAdiniCoz({ ad: "a".repeat(151), aciklama: "" }).olurMu).toBe(
      false,
    );
    expect(
      ekipAdiniCoz({ ad: "Ekip", aciklama: "a".repeat(501) }).olurMu,
    ).toBe(false);
  });
});

describe("ekip mesajı", () => {
  it("boş mesaj gitmez", () => {
    expect(ekipMesajiniCoz("  ").olurMu).toBe(false);
  });

  it("sınırın üstü reddedilir", () => {
    expect(ekipMesajiniCoz("a".repeat(2001)).olurMu).toBe(false);
  });

  it("metin kırpılarak kabul edilir", () => {
    expect(ekipMesajiniCoz("  merhaba  ")).toEqual({
      olurMu: true,
      icerik: "merhaba",
    });
  });
});
