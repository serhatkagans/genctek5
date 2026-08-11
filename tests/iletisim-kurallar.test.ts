import {
  baglantiIstegiGonderilebilirMi,
  GIZLILIK_UYARISI,
  istekKarariniCoz,
  mesajMetniniCoz,
  mesajYazilabilirMi,
  PANODAN_ACILABILIR_TURLER,
  SUZGEC_TURLERI,
  TALEP_AZAMI_GUN,
  TALEP_TURLERI,
  TALEP_TURU_ETIKETLERI,
  talebiCoz,
  talepAktifMi,
  talepTuruGecerliMi,
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
  const gecerli = {
    baslik: "Devre şeması",
    icerik: "Robotik için",
    sonGecerlilik: gun(30),
    // 10 Ağustos 2026'dan sonra panodan yalnızca destek ve mentör talebi
    // açılabiliyor; geçerli örnek de o türlerden biri olmalı.
    tur: "TEKNIK_DESTEK",
  };

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

  /*
   * Tür 6 Ağustos 2026'da eklendi ve YENİ ilanlarda zorunlu. Sütun NULL kabul
   * etmeye devam ediyor: eski ilanların türü bilinmiyor ve geriye dönük
   * doldurulmadı — türü bilinmeyen bir ilana "duyuru" demek, panoda o türle
   * filtreleyen kişiye yanlış liste gösterirdi.
   */
  it("tür seçilmediyse reddeder", () => {
    const sonuc = talebiCoz({ ...gecerli, tur: "" }, SIMDI);
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toBe("Talep türü seçilmelidir.");
  });

  it("tanımsız türü reddeder", () => {
    // İstek elle kurcalanmadıkça gelmez; sessizce yutulursa ilan türsüz yazılır.
    const sonuc = talebiCoz({ ...gecerli, tur: "BAGIS" }, SIMDI);
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toBe("Talep türü anlaşılamadı.");
  });

  it("geçerli türü olduğu gibi taşır", () => {
    const sonuc = talebiCoz({ ...gecerli, tur: "MENTORE_SOR" }, SIMDI);
    expect(sonuc.olurMu).toBe(true);
    if (sonuc.olurMu) expect(sonuc.tur).toBe("MENTORE_SOR");
  });

  /*
   * 10 AĞUSTOS 2026 · istek: panoda "alt alta iki alan olacak … biri destek
   * talebi aç diğeri mentör talebi aç". Tür seçimi ekrandan kalktı; gizli form
   * alanı kurcalanarak eski türlerin geri gelmemesi bu kapıya bağlı.
   */
  it("panodan açılamayan türü reddeder", () => {
    for (const tur of ["SPONSOR", "EKIP_ARKADASI", "DUYURU"]) {
      const sonuc = talebiCoz({ ...gecerli, tur }, SIMDI);
      expect(sonuc.olurMu).toBe(false);
      if (!sonuc.olurMu) expect(sonuc.neden).toContain("yalnızca destek");
    }
  });

  it("panodan açılabilen türler destek ve mentör talebidir", () => {
    expect([...PANODAN_ACILABILIR_TURLER].sort()).toEqual([
      "MENTORE_SOR",
      "TEKNIK_DESTEK",
    ]);
  });

  it("beş türü kapsar", () => {
    /*
     * MENTORE_SOR 7 Ağustos 2026'da eklendi. TEKNIK_DESTEK'ten ayrı: o bir
     * SORUNU çözdürmek için açılır, bu bir YOL sorar.
     *
     * SPONSOR istekteki dörtlüde yok ama KAPATILMADI: açılmış ilanları
     * türsüz bırakmamak için listede duruyor.
     */
    expect([...TALEP_TURLERI].sort()).toEqual([
      "DUYURU",
      "EKIP_ARKADASI",
      "MENTORE_SOR",
      "SPONSOR",
      "TEKNIK_DESTEK",
    ]);
  });

  /*
   * ETİKETLER 11 AĞUSTOS 2026'DA GÜNCELLENDİ (istek: "destek talebi - teknik
   * destek talebi olsun … duyuru tanıtım desteği açılsın"). Enum değişmedi,
   * yalnızca ekranda yazan adlar değişti — testin sınadığı da bu.
   */
  it("istekteki dört başlığın hepsinin bir türü vardır", () => {
    expect(TALEP_TURU_ETIKETLERI.TEKNIK_DESTEK).toBe("Teknik destek talebi");
    expect(TALEP_TURU_ETIKETLERI.MENTORE_SOR).toBe("Mentöre sor");
    expect(TALEP_TURU_ETIKETLERI.DUYURU).toBe("Duyuru / tanıtım desteği");
    expect(TALEP_TURU_ETIKETLERI.EKIP_ARKADASI).toBe("Ekip arkadaşı arama");
  });

  /*
   * Süzgeç listesi enum'un TAMAMI DEĞİLDİR: sponsor ve mentöre sor süzgeçten
   * çıkarıldı ama ilanları panoda listelenmeye ve rozetleri basılmaya devam
   * ediyor. İkisini karıştırmak, açılmış ilanları görünmez yapardı.
   */
  it("süzgeçte sponsor ve mentöre sor yoktur, ilanları durmaya devam eder", () => {
    expect(SUZGEC_TURLERI).not.toContain("SPONSOR");
    expect(SUZGEC_TURLERI).not.toContain("MENTORE_SOR");
    expect(SUZGEC_TURLERI).toEqual(["TEKNIK_DESTEK", "DUYURU", "EKIP_ARKADASI"]);
    expect(TALEP_TURLERI).toContain("MENTORE_SOR");
    expect(talepTuruGecerliMi("MENTORE_SOR")).toBe(true);
  });

  it("her türün ekran etiketi vardır", () => {
    for (const tur of TALEP_TURLERI) {
      expect(TALEP_TURU_ETIKETLERI[tur]?.trim()).toBeTruthy();
    }
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
