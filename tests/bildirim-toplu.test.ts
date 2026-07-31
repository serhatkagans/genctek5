import {
  aliciOzeti,
  DUYURU_HEDEF_ETIKETLERI,
  duyuruHedefiMi,
  duyuruyuCoz,
} from "@/lib/bildirim/toplu";

/**
 * Toplu duyuru kuralları.
 *
 * Kurallar bilerek "gönderilmesin" tarafına eğimli: eksik bir duyuruyu tekrar
 * göndermek, yanlış bir duyuruyu geri almaktan kolaydır.
 */

const GECERLI = {
  hedef: "HERKES",
  baslik: "Yaz kampı başvuruları açıldı",
  icerik: "Ayrıntılar panelde.",
  onaylandiMi: true,
};

describe("duyuruyuCoz", () => {
  it("geçerli girdiyi kabul eder ve boşlukları kırpar", () => {
    const sonuc = duyuruyuCoz({
      ...GECERLI,
      baslik: "  Duyuru  ",
      icerik: "  Metin  ",
    });
    expect(sonuc).toEqual({
      olurMu: true,
      hedef: "HERKES",
      baslik: "Duyuru",
      icerik: "Metin",
    });
  });

  it("onay kutusu işaretlenmeden göndermez", () => {
    const sonuc = duyuruyuCoz({ ...GECERLI, onaylandiMi: false });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("geri alınamaz");
  });

  it("onay kutusu EN SON kontrol edilir", () => {
    /*
     * Kullanıcı metnini boş bırakıp kutuyu da unuttuysa önce metin hatasını
     * görmeli; aksi halde formu iki kez doldurmak zorunda kalır.
     */
    const sonuc = duyuruyuCoz({
      ...GECERLI,
      baslik: "",
      onaylandiMi: false,
    });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("başlığı boş");
  });

  it("geçersiz alıcı grubunu reddeder", () => {
    const sonuc = duyuruyuCoz({ ...GECERLI, hedef: "VELILER" });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("Alıcı grubu");
  });

  it("boş başlığı ve boş metni reddeder", () => {
    expect(duyuruyuCoz({ ...GECERLI, baslik: "   " }).olurMu).toBe(false);
    expect(duyuruyuCoz({ ...GECERLI, icerik: "   " }).olurMu).toBe(false);
  });

  it("çok uzun başlığı reddeder", () => {
    const sonuc = duyuruyuCoz({ ...GECERLI, baslik: "a".repeat(201) });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("200");
  });

  it("çok uzun metni reddeder", () => {
    const sonuc = duyuruyuCoz({ ...GECERLI, icerik: "a".repeat(4001) });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("4000");
  });

  it("sınırdaki uzunlukları kabul eder", () => {
    expect(duyuruyuCoz({ ...GECERLI, baslik: "a".repeat(200) }).olurMu).toBe(true);
    expect(duyuruyuCoz({ ...GECERLI, icerik: "a".repeat(4000) }).olurMu).toBe(true);
  });
});

describe("duyuruHedefiMi", () => {
  it("tanımlı hedefleri tanır", () => {
    expect(duyuruHedefiMi("OGRENCI")).toBe(true);
    expect(duyuruHedefiMi("OGRETMEN")).toBe(true);
    expect(duyuruHedefiMi("HERKES")).toBe(true);
  });

  it("tanımsız hedefi reddeder", () => {
    expect(duyuruHedefiMi("VELI")).toBe(false);
  });

  it("her hedefin ekran etiketi vardır", () => {
    for (const hedef of ["OGRENCI", "OGRETMEN", "HERKES"] as const) {
      expect(DUYURU_HEDEF_ETIKETLERI[hedef]).toBeTruthy();
    }
  });
});

describe("aliciOzeti", () => {
  const sayilar = { ogrenci: 120, ogretmen: 30 };

  it("öğrenci hedefinde yalnızca öğrencileri sayar", () => {
    expect(aliciOzeti("OGRENCI", sayilar)).toBe("120 kişi");
  });

  it("öğretmen hedefinde yalnızca öğretmenleri sayar", () => {
    expect(aliciOzeti("OGRETMEN", sayilar)).toBe("30 kişi");
  });

  it("herkes hedefinde ikisini toplar", () => {
    expect(aliciOzeti("HERKES", sayilar)).toBe("150 kişi");
  });
});
