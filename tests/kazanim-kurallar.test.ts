import {
  KAZANIM_TIPLERI,
  kazanimKabulEdilirMi,
  kazanimTipiGecerliMi,
  kazanimTipiTanimi,
  kazanimTipleri,
} from "@/lib/kazanim/kurallar";

/**
 * Kişinin kendi girdiği kazanım kayıtları — references/domain-rules.md
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
  it("altı türü kapsar", () => {
    /*
     * GENCTEK_ETKINLIGI ve DIGER sonradan eklendi. GençTek katılımı normalde
     * otomatik gelir (basvuru + faaliyet); elle giriş, sisteme girilmemiş eski
     * etkinlikler için BEYAN olarak açıldı. Rozetler bu kayıtlardan
     * hesaplanmadığı için beyanla nişan kazanılamaz.
     */
    expect(KAZANIM_TIPLERI.map((tanim) => tanim.tip).sort()).toEqual([
      "AKRAN_EGITIMI",
      "DIGER",
      "DIS_ETKINLIK",
      "GENCTEK_ETKINLIGI",
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

/*
 * Kazanım kaydını öğretmen de girer. Sahip yalnızca ETİKETLERİ değiştirir:
 * alan kuralları değişseydi aynı kayıt, girenin rolüne göre farklı doğrulanır
 * ve öğretmenlikten ayrılan birinin kaydı geçersiz hâle gelirdi.
 */
describe("kazanım türlerinin öğretmen karşılığı", () => {
  it("aynı dört türü aynı sırayla verir", () => {
    expect(kazanimTipleri("OGRETMEN").map((tanim) => tanim.tip)).toEqual(
      kazanimTipleri("OGRENCI").map((tanim) => tanim.tip),
    );
  });

  it("alan kurallarını sahibe göre değiştirmez", () => {
    for (const ogrenciTanim of kazanimTipleri("OGRENCI")) {
      const ogretmenTanim = kazanimTipiTanimi(ogrenciTanim.tip, "OGRETMEN");
      expect({
        derece: ogretmenTanim.dereceVarMi,
        duzenleyen: ogretmenTanim.duzenleyenVarMi,
        program: ogretmenTanim.programSecimiVarMi,
        katilim: ogretmenTanim.katilimBicimiVarMi,
        hedefKitle: ogretmenTanim.hedefKitleVarMi,
      }).toEqual({
        derece: ogrenciTanim.dereceVarMi,
        duzenleyen: ogrenciTanim.duzenleyenVarMi,
        program: ogrenciTanim.programSecimiVarMi,
        katilim: ogrenciTanim.katilimBicimiVarMi,
        hedefKitle: ogrenciTanim.hedefKitleVarMi,
      });
    }
  });

  // Öğretmenin öğrencisine verdiği eğitim "akran" eğitimi değildir; kaydın ne
  // olduğunu yanlış anlatan bir başlık göstermemek için metin ayrışıyor.
  it("akran eğitimi başlığını öğretmende kullanmaz", () => {
    expect(kazanimTipiTanimi("AKRAN_EGITIMI", "OGRETMEN").baslik).toBe(
      "Verdiğim eğitimler",
    );
    expect(kazanimTipiTanimi("AKRAN_EGITIMI").baslik).toBe(
      "Verdiğim akran eğitimleri",
    );
  });

  it("sahip verilmediğinde öğrenci metinlerine düşer", () => {
    expect(kazanimTipiTanimi("URUN")).toEqual(
      kazanimTipiTanimi("URUN", "OGRENCI"),
    );
  });

  it("öğretmen metni yazılmayan türde öğrenci metnini korur", () => {
    expect(kazanimTipiTanimi("DIS_ETKINLIK", "OGRETMEN").baslik).toBe(
      kazanimTipiTanimi("DIS_ETKINLIK").baslik,
    );
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

describe("GençTek programı seçimi", () => {
  it("program seçildiğinde adı kopyalar, serbest metni yok sayar", () => {
    /*
     * Ad KOPYALANIR, bağlantıya güvenilmez: program pasife alındığında ya da
     * adı değiştiğinde öğrencinin geçmiş kaydı okunamaz hâle gelmemeli.
     */
    const kayit = kabulEdilenKayit({
      tip: "YARISMA_DERECESI",
      baslik: "kullanıcının yazdığı ad",
      program: { id: 7, ad: "EğitiJAM" },
    });
    expect(kayit.baslik).toBe("EğitiJAM");
    expect(kayit.temelEtkinlikProgramiId).toBe(7);
  });

  it("program seçilmediğinde serbest metni kullanır", () => {
    const kayit = kabulEdilenKayit({
      tip: "AKRAN_EGITIMI",
      baslik: "Python atölyesi",
    });
    expect(kayit.baslik).toBe("Python atölyesi");
    expect(kayit.temelEtkinlikProgramiId).toBeNull();
  });

  it("program seçimi olmayan türde gelen programı düşürür", () => {
    // Ürün ve GençTek DIŞI etkinlik tanımı gereği listede olamaz; değer ancak
    // istek elle kurcalandığında gelir.
    const kayit = kabulEdilenKayit({
      tip: "URUN",
      program: { id: 7, ad: "EğitiJAM" },
    });
    expect(kayit.temelEtkinlikProgramiId).toBeNull();
    expect(kayit.baslik).toBe("Okul kütüphanesi mobil uygulaması");
  });
});

describe("katılım biçimi ve hedef kitle", () => {
  it("akran eğitiminde ikisini de saklar", () => {
    const kayit = kabulEdilenKayit({
      tip: "AKRAN_EGITIMI",
      baslik: "Python atölyesi",
      katilimBicimi: "ONLINE",
      hedefKitle: "9. sınıflar",
    });
    expect(kayit.katilimBicimi).toBe("ONLINE");
    expect(kayit.hedefKitle).toBe("9. sınıflar");
  });

  it("üründe ikisini de düşürür", () => {
    const kayit = kabulEdilenKayit({
      tip: "URUN",
      katilimBicimi: "YUZ_YUZE",
      hedefKitle: "veliler",
    });
    expect(kayit.katilimBicimi).toBeNull();
    expect(kayit.hedefKitle).toBeNull();
  });

  it("yarışmada hedef kitleyi sormaz ama katılım biçimini saklar", () => {
    const kayit = kabulEdilenKayit({
      tip: "YARISMA_DERECESI",
      baslik: "Capture The Flag",
      katilimBicimi: "KARMA",
      hedefKitle: "öğretmenler",
    });
    expect(kayit.katilimBicimi).toBe("KARMA");
    expect(kayit.hedefKitle).toBeNull();
  });

  it("tanımsız katılım biçimini reddeder", () => {
    const karar = kazanimKabulEdilirMi(
      girdi({ tip: "DIS_ETKINLIK", katilimBicimi: "HIBRIT" }),
    );
    expect(karar.olurMu).toBe(false);
  });

  it("boş katılım biçimini null sayar", () => {
    const kayit = kabulEdilenKayit({ tip: "DIS_ETKINLIK", katilimBicimi: "" });
    expect(kayit.katilimBicimi).toBeNull();
  });

  it("hedef kitle 200 karakteri aşarsa reddeder", () => {
    const karar = kazanimKabulEdilirMi(
      girdi({ tip: "AKRAN_EGITIMI", hedefKitle: "a".repeat(201) }),
    );
    expect(karar.olurMu).toBe(false);
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

describe("beyan edilen GençTek etkinliği", () => {
  it('"Diğer" listenin SONUNDA durur', () => {
    // Başta olsaydı kullanıcı diğer tipleri okumadan onu seçerdi.
    expect(KAZANIM_TIPLERI[KAZANIM_TIPLERI.length - 1].tip).toBe("DIGER");
  });

  it("GençTek türü, otomatik listeyle çakışabileceğini açıklamasında söyler", () => {
    const tanim = KAZANIM_TIPLERI.find((t) => t.tip === "GENCTEK_ETKINLIGI");
    expect(tanim?.aciklama).toContain("otomatik");
  });
});
