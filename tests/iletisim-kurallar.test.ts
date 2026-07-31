import {
  baglantiIstegiGonderilebilirMi,
  GIZLILIK_UYARISI,
  istekKarariniCoz,
  mesajMetniniCoz,
  mesajYazilabilirMi,
  TALEP_AZAMI_GUN,
  talebiCoz,
  talepAktifMi,
} from "@/lib/iletisim/kurallar";

/**
 * İletişim modülü kuralları.
 *
 * Modülün tek cümlelik ilkesi: gizli kanal yoktur. Kurallar bu ilkeyi
 * korumak ve kötüye kullanımı zorlaştırmak üzerine kurulu.
 */

const SIMDI = new Date("2026-07-31T12:00:00+03:00");
const gun = (n: number) => new Date(SIMDI.getTime() + n * 86_400_000);

describe("talepAktifMi", () => {
  it("kapatılmamış ve süresi dolmamış ilan aktiftir", () => {
    expect(
      talepAktifMi({ kapatildiMi: false, sonGecerlilik: gun(5), simdi: SIMDI }),
    ).toBe(true);
  });

  it("kapatılan ilan görünmez", () => {
    expect(
      talepAktifMi({ kapatildiMi: true, sonGecerlilik: gun(5), simdi: SIMDI }),
    ).toBe(false);
  });

  it("süresi dolan ilan görünmez", () => {
    expect(
      talepAktifMi({ kapatildiMi: false, sonGecerlilik: gun(-1), simdi: SIMDI }),
    ).toBe(false);
  });
});

describe("talebiCoz", () => {
  const gecerli = { baslik: "Takım arkadaşı", icerik: "Robotik için", sonGecerlilik: gun(30) };

  it("geçerli ilanı kabul eder ve kırpar", () => {
    const sonuc = talebiCoz({ ...gecerli, baslik: "  A  " }, SIMDI);
    expect(sonuc.olurMu).toBe(true);
    if (sonuc.olurMu) expect(sonuc.baslik).toBe("A");
  });

  it("boş başlık ve metni reddeder", () => {
    expect(talebiCoz({ ...gecerli, baslik: "  " }, SIMDI).olurMu).toBe(false);
    expect(talebiCoz({ ...gecerli, icerik: "  " }, SIMDI).olurMu).toBe(false);
  });

  it("geçmiş tarihi reddeder", () => {
    const sonuc = talebiCoz({ ...gecerli, sonGecerlilik: gun(-1) }, SIMDI);
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("bugünden sonra");
  });

  it("çok uzak tarihi reddeder", () => {
    // Sınırsız ilan pano çürümesi demek: sahibi mezun olmuş bir ilan listede
    // durmaya devam ederdi.
    const sonuc = talebiCoz(
      { ...gecerli, sonGecerlilik: gun(TALEP_AZAMI_GUN + 1) },
      SIMDI,
    );
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain(String(TALEP_AZAMI_GUN));
  });

  it("tarih seçilmediyse reddeder", () => {
    expect(talebiCoz({ ...gecerli, sonGecerlilik: null }, SIMDI).olurMu).toBe(false);
  });
});

describe("baglantiIstegiGonderilebilirMi", () => {
  const temel = {
    isteyenId: 1,
    hedefId: 2,
    bekleyenIstekVarMi: false,
    onayliBaglantiVarMi: false,
  };

  it("olağan durumda gönderilebilir", () => {
    expect(baglantiIstegiGonderilebilirMi(temel).olurMu).toBe(true);
  });

  it("kendine istek gönderilemez", () => {
    expect(
      baglantiIstegiGonderilebilirMi({ ...temel, hedefId: 1 }).olurMu,
    ).toBe(false);
  });

  it("bekleyen istek varken ikincisi gönderilemez", () => {
    /*
     * Reddedilen bir isteği tekrar tekrar göndermek taciz aracına dönüşürdü;
     * bekleyen istek kilidi bunun ilk basamağı.
     */
    const sonuc = baglantiIstegiGonderilebilirMi({
      ...temel,
      bekleyenIstekVarMi: true,
    });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("onay bekliyor");
  });

  it("zaten yazışma varsa yeni istek gönderilemez", () => {
    expect(
      baglantiIstegiGonderilebilirMi({ ...temel, onayliBaglantiVarMi: true })
        .olurMu,
    ).toBe(false);
  });
});

describe("istekKarariniCoz", () => {
  it("onayda gerekçe zorunlu değildir", () => {
    expect(istekKarariniCoz({ onaylandiMi: true, gerekce: "" })).toEqual({
      olurMu: true,
      durum: "ONAYLANDI",
      gerekce: null,
    });
  });

  it("REDDE gerekçe zorunludur", () => {
    const sonuc = istekKarariniCoz({ onaylandiMi: false, gerekce: "  " });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("zorunludur");
  });

  it("gerekçeli ret kabul edilir", () => {
    expect(
      istekKarariniCoz({ onaylandiMi: false, gerekce: "Uygun görülmedi." }),
    ).toEqual({ olurMu: true, durum: "REDDEDILDI", gerekce: "Uygun görülmedi." });
  });
});

describe("mesajYazilabilirMi", () => {
  it("onaylı ve açık yazışmaya yazılabilir", () => {
    expect(
      mesajYazilabilirMi({ onayDurumu: "ONAYLANDI", yazismaKapatildiMi: false })
        .olurMu,
    ).toBe(true);
  });

  it("onay beklerken yazılamaz", () => {
    expect(
      mesajYazilabilirMi({ onayDurumu: "BEKLIYOR", yazismaKapatildiMi: false })
        .olurMu,
    ).toBe(false);
  });

  it("reddedilmiş bağlantıya yazılamaz", () => {
    expect(
      mesajYazilabilirMi({ onayDurumu: "REDDEDILDI", yazismaKapatildiMi: false })
        .olurMu,
    ).toBe(false);
  });

  it("kapatılmış yazışmaya yazılamaz", () => {
    const sonuc = mesajYazilabilirMi({
      onayDurumu: "ONAYLANDI",
      yazismaKapatildiMi: true,
    });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("kapatıldı");
  });
});

describe("mesajMetniniCoz", () => {
  it("boş mesajı reddeder", () => {
    expect(mesajMetniniCoz("   ").olurMu).toBe(false);
  });

  it("çok uzun mesajı reddeder", () => {
    expect(mesajMetniniCoz("a".repeat(2001)).olurMu).toBe(false);
  });

  it("geçerli mesajı kırpar", () => {
    const sonuc = mesajMetniniCoz("  merhaba  ");
    expect(sonuc.olurMu).toBe(true);
    if (sonuc.olurMu) expect(sonuc.icerik).toBe("merhaba");
  });
});

describe("gizlilik uyarısı", () => {
  it("mahremiyet vaadi vermez, okuyanları sayar", () => {
    // Ekranlarda tek bir sabit kullanılıyor; farklı yerlerde farklı ifadeler
    // zamanla yumuşar ve "aslında kimse okumuyor" izlenimi doğardı.
    expect(GIZLILIK_UYARISI).toContain("gizli değildir");
    expect(GIZLILIK_UYARISI).toContain("danışman");
    expect(GIZLILIK_UYARISI).toContain("koordinatör");
  });
});
