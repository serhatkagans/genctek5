import {
  type DanismanAdayi,
  devirKarariVer,
  ilkAtamaKarariVer,
  yeniDanismanGeldigindeDevredilirMi,
} from "@/lib/danisman/karar";

/**
 * Danışman atama ve devir kararları — references/domain-rules.md Bölüm 3.
 *
 * Temel değişmez: boşta öğrenci kalamaz. Danışman yoksa öğrenci il
 * koordinatörüne bağlanır.
 */

function aday(kullaniciId: number): DanismanAdayi {
  return {
    kullaniciId,
    ad: `Öğretmen${kullaniciId}`,
    soyad: "Test",
    brans: "Bilişim Teknolojileri",
  };
}

const KOORDINATOR_ID = 300;

describe("ilk atama", () => {
  it("okulda birden fazla aday varsa öğrenci seçer", () => {
    const karar = ilkAtamaKarariVer([aday(201), aday(202)], KOORDINATOR_ID);
    expect(karar.tur).toBe("SECIM_GEREKLI");
    if (karar.tur === "SECIM_GEREKLI") {
      expect(karar.adaylar).toHaveLength(2);
    }
  });

  it("tek aday varsa otomatik atanır", () => {
    const karar = ilkAtamaKarariVer([aday(201)], KOORDINATOR_ID);
    expect(karar).toEqual({ tur: "OTOMATIK", danismanKullaniciId: 201 });
  });

  it("okulda aday yoksa il koordinatörüne bağlanır", () => {
    const karar = ilkAtamaKarariVer([], KOORDINATOR_ID);
    expect(karar).toEqual({
      tur: "IL_KOORDINATORUNE",
      danismanKullaniciId: KOORDINATOR_ID,
    });
  });

  it("aday da koordinatör de yoksa atanamaz ve neden bildirilir", () => {
    const karar = ilkAtamaKarariVer([], null);
    expect(karar).toEqual({
      tur: "ATANAMADI",
      neden: "IL_KOORDINATORU_YOK",
    });
  });

  it("koordinatör yoksa ama okulda aday varsa yine atanır", () => {
    const karar = ilkAtamaKarariVer([aday(201)], null);
    expect(karar).toEqual({ tur: "OTOMATIK", danismanKullaniciId: 201 });
  });
});

describe("danışman ayrıldığında devir", () => {
  it("okulda tek danışman kaldıysa öğrenciler otomatik ona devredilir", () => {
    const karar = devirKarariVer([aday(202)], KOORDINATOR_ID);
    expect(karar).toEqual({
      tur: "OTOMATIK_DEVIR",
      yeniDanismanKullaniciId: 202,
    });
  });

  it("birden fazla danışman varsa yeniden seçim istenir ve öğrenci geçici olarak koordinatöre bağlanır", () => {
    const karar = devirKarariVer([aday(202), aday(203)], KOORDINATOR_ID);
    expect(karar.tur).toBe("YENIDEN_SECIM");
    if (karar.tur === "YENIDEN_SECIM") {
      expect(karar.geciciDanismanKullaniciId).toBe(KOORDINATOR_ID);
      expect(karar.adaylar).toHaveLength(2);
    }
  });

  it("hiç danışman kalmadıysa il koordinatörüne devredilir", () => {
    const karar = devirKarariVer([], KOORDINATOR_ID);
    expect(karar).toEqual({
      tur: "IL_KOORDINATORUNE",
      yeniDanismanKullaniciId: KOORDINATOR_ID,
    });
  });

  it("koordinatör de yoksa devredilemez", () => {
    expect(devirKarariVer([], null)).toEqual({
      tur: "ATANAMADI",
      neden: "IL_KOORDINATORU_YOK",
    });
  });

  it("yeniden seçim gerekirken koordinatör yoksa geçici atama yapılmaz", () => {
    const karar = devirKarariVer([aday(202), aday(203)], null);
    expect(karar.tur).toBe("YENIDEN_SECIM");
    if (karar.tur === "YENIDEN_SECIM") {
      expect(karar.geciciDanismanKullaniciId).toBeNull();
    }
  });
});

describe("okula sonradan danışman gelmesi", () => {
  it("il koordinatörüne bağlı öğrenciler otomatik devredilmez", () => {
    // Devri koordinatör onaylar; sistem kendiliğinden taşımaz.
    expect(yeniDanismanGeldigindeDevredilirMi()).toBe(false);
  });
});
