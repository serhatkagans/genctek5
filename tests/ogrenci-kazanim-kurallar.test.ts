import {
  KAZANIM_TIPLERI,
  kazanimKabulEdilirMi,
  kazanimTipiGecerliMi,
  kazanimTipiTanimi,
} from "@/lib/ogrenci/kazanim-kurallar";

/**
 * Öğrencinin kendi girdiği kazanım kayıtları — references/domain-rules.md
 * Bölüm 14.
 *
 * Kayıt bir BEYANDIR; testler doğruluğu değil biçimsel kabulü sınıyor.
 */

const girdi = (
  ozellikler: Partial<Parameters<typeof kazanimKabulEdilirMi>[0]> = {},
) => ({
  tip: "URUN",
  baslik: "Okul kütüphanesi mobil uygulaması",
  ...ozellikler,
});

/** Testte sık gereken: kabul edilen kaydı çıkarır, reddedilirse patlar. */
function kabulEdilenKayit(
  ozellikler: Partial<Parameters<typeof kazanimKabulEdilirMi>[0]> = {},
) {
  const karar = kazanimKabulEdilirMi(girdi(ozellikler));
  if (!karar.olurMu) {
    throw new Error(`Kayıt beklenmedik şekilde reddedildi: ${karar.neden}`);
  }
  return karar.kayit;
}

describe("kazanım türleri", () => {
  it("kapsam dosyasındaki dört türü kapsar", () => {
    expect(KAZANIM_TIPLERI.map((tanim) => tanim.tip).sort()).toEqual([
      "AKRAN_EGITIMI",
      "DIS_ETKINLIK",
      "URUN",
      "YARISMA_DERECESI",
    ]);
  });

  it("derece alanını yalnızca yarışmada sorar", () => {
    const dereceli = KAZANIM_TIPLERI.filter((tanim) => tanim.dereceVarMi);
    expect(dereceli.map((tanim) => tanim.tip)).toEqual(["YARISMA_DERECESI"]);
  });

  it("düzenleyen kurumu üründe sormaz", () => {
    expect(kazanimTipiTanimi("URUN").duzenleyenVarMi).toBe(false);
  });

  it("tanımsız tipi geçersiz sayar", () => {
    expect(kazanimTipiGecerliMi("ROZET")).toBe(false);
    expect(kazanimTipiGecerliMi("URUN")).toBe(true);
  });
});

describe("kazanım kaydı kabulü", () => {
  it("geçerli kaydı kabul eder ve alanları kırpar", () => {
    const kayit = kabulEdilenKayit({
      baslik: "  Kütüphane uygulaması  ",
      aciklama: "  React Native ile yazdım.  ",
    });
    expect(kayit.baslik).toBe("Kütüphane uygulaması");
    expect(kayit.aciklama).toBe("React Native ile yazdım.");
  });

  it("başlık boşsa reddeder", () => {
    const karar = kazanimKabulEdilirMi(girdi({ baslik: "   " }));
    expect(karar.olurMu).toBe(false);
  });

  it("başlık 250 karakteri aşarsa reddeder", () => {
    const karar = kazanimKabulEdilirMi(girdi({ baslik: "a".repeat(251) }));
    expect(karar.olurMu).toBe(false);
  });

  it("bilinmeyen türü reddeder", () => {
    const karar = kazanimKabulEdilirMi(girdi({ tip: "MODERATORLUK" }));
    expect(karar.olurMu).toBe(false);
  });

  it("boş metin alanlarını null'a çevirir", () => {
    const kayit = kabulEdilenKayit({ aciklama: "", baglantiUrl: "" });
    expect(kayit.aciklama).toBeNull();
    expect(kayit.baglantiUrl).toBeNull();
  });
});

describe("bağlantı adresi", () => {
  it("https adresini kabul eder", () => {
    const kayit = kabulEdilenKayit({ baglantiUrl: "https://ornek.gov.tr/proje" });
    expect(kayit.baglantiUrl).toBe("https://ornek.gov.tr/proje");
  });

  it("javascript: şemasını reddeder", () => {
    // Profil sayfası bu adresi tıklanabilir bağlantı olarak basıyor; kabul
    // edilseydi profile bakan danışmanın tarayıcısında kod çalışırdı.
    const karar = kazanimKabulEdilirMi(
      girdi({ baglantiUrl: "javascript:alert(1)" }),
    );
    expect(karar.olurMu).toBe(false);
  });

  it("şemasız adresi reddeder", () => {
    const karar = kazanimKabulEdilirMi(girdi({ baglantiUrl: "ornek.gov.tr" }));
    expect(karar.olurMu).toBe(false);
  });
});

describe("türe uymayan alanlar", () => {
  it("üründe gelen dereceyi sessizce düşürür", () => {
    const kayit = kabulEdilenKayit({ tip: "URUN", derece: "Türkiye 1.si" });
    expect(kayit.derece).toBeNull();
  });

  it("üründe gelen düzenleyeni sessizce düşürür", () => {
    const kayit = kabulEdilenKayit({ tip: "URUN", duzenleyen: "TÜBİTAK" });
    expect(kayit.duzenleyen).toBeNull();
  });

  it("yarışmada dereceyi ve düzenleyeni saklar", () => {
    const kayit = kabulEdilenKayit({
      tip: "YARISMA_DERECESI",
      baslik: "Ulusal Bilgisayar Olimpiyatları",
      derece: "Türkiye 3.sü",
      duzenleyen: "TÜBİTAK",
    });
    expect(kayit.derece).toBe("Türkiye 3.sü");
    expect(kayit.duzenleyen).toBe("TÜBİTAK");
  });

  it("dış etkinlikte düzenleyeni saklar, dereceyi düşürür", () => {
    const kayit = kabulEdilenKayit({
      tip: "DIS_ETKINLIK",
      baslik: "TEKNOFEST",
      duzenleyen: "T3 Vakfı",
      derece: "Birincilik",
    });
    expect(kayit.duzenleyen).toBe("T3 Vakfı");
    expect(kayit.derece).toBeNull();
  });
});

describe("tarih", () => {
  it("tarihsiz kayda izin verir", () => {
    expect(kabulEdilenKayit().tarih).toBeNull();
  });

  it("çözümlenemeyen tarihi reddeder", () => {
    const karar = kazanimKabulEdilirMi(girdi({ tarih: new Date("olmayan") }));
    expect(karar.olurMu).toBe(false);
  });
});
