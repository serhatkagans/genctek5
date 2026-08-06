import {
  HEDEF_ACIKLAMA_AZAMI,
  HEDEF_BASLIK_AZAMI,
  hedefDurumuGecerliMi,
  hedefKabulEdilirMi,
  hedefleriSirala,
  hedefOzeti,
  tamamlanmaTarihiniCoz,
} from "@/lib/hedef/kurallar";

/** "Rotam" hedeflerinin kuralları — D6. */

const SIMDI = new Date("2026-08-06T09:00:00Z");

function girdi(ustune: Partial<Parameters<typeof hedefKabulEdilirMi>[0]> = {}) {
  return {
    baslik: "Python ile ilk oyunumu yazmak",
    aciklama: "",
    durum: "PLANLANDI",
    hedefTarihi: null,
    ...ustune,
  };
}

describe("hedefKabulEdilirMi", () => {
  it("geçerli hedefi kabul eder ve metinleri kırpar", () => {
    const karar = hedefKabulEdilirMi(
      girdi({ baslik: "  Robotik kulübüne katılmak  ", aciklama: "  Eylülde  " }),
      SIMDI,
    );
    expect(karar.olurMu).toBe(true);
    if (!karar.olurMu) return;
    expect(karar.kayit.baslik).toBe("Robotik kulübüne katılmak");
    expect(karar.kayit.aciklama).toBe("Eylülde");
    expect(karar.kayit.durum).toBe("PLANLANDI");
  });

  it("boş başlığı reddeder", () => {
    const karar = hedefKabulEdilirMi(girdi({ baslik: "   " }), SIMDI);
    expect(karar.olurMu).toBe(false);
  });

  it("boş açıklamayı null'a çevirir — boş metin saklanmaz", () => {
    const karar = hedefKabulEdilirMi(girdi({ aciklama: "   " }), SIMDI);
    expect(karar.olurMu).toBe(true);
    if (!karar.olurMu) return;
    expect(karar.kayit.aciklama).toBeNull();
  });

  it("uzun başlığı ve açıklamayı reddeder", () => {
    expect(
      hedefKabulEdilirMi(girdi({ baslik: "a".repeat(HEDEF_BASLIK_AZAMI + 1) }), SIMDI)
        .olurMu,
    ).toBe(false);
    expect(
      hedefKabulEdilirMi(
        girdi({ aciklama: "a".repeat(HEDEF_ACIKLAMA_AZAMI + 1) }),
        SIMDI,
      ).olurMu,
    ).toBe(false);
  });

  it("tanımsız durumu reddeder", () => {
    expect(hedefKabulEdilirMi(girdi({ durum: "VAZGECTIM" }), SIMDI).olurMu).toBe(
      false,
    );
  });

  /*
   * Geçmiş tarih KABUL EDİLİR. "Haziran'da bitireyim" diye yazan öğrencinin
   * hedefi Haziran geçtikten sonra hâlâ sürüyor olabilir; reddetseydik kişi
   * kendi kaydını düzenleyemez hâle gelirdi.
   */
  it("geçmiş hedef tarihini kabul eder", () => {
    const karar = hedefKabulEdilirMi(
      girdi({ hedefTarihi: new Date("2025-01-01T00:00:00Z") }),
      SIMDI,
    );
    expect(karar.olurMu).toBe(true);
  });

  it("çok uzak geleceği reddeder — parmak hatası koruması", () => {
    const karar = hedefKabulEdilirMi(
      girdi({ hedefTarihi: new Date("2126-01-01T00:00:00Z") }),
      SIMDI,
    );
    expect(karar.olurMu).toBe(false);
  });

  it("geçersiz tarihi reddeder", () => {
    const karar = hedefKabulEdilirMi(
      girdi({ hedefTarihi: new Date("olmayan-tarih") }),
      SIMDI,
    );
    expect(karar.olurMu).toBe(false);
  });

  it("TAMAMLANDI ile açılan hedefe tamamlanma anını yazar", () => {
    const karar = hedefKabulEdilirMi(girdi({ durum: "TAMAMLANDI" }), SIMDI);
    expect(karar.olurMu).toBe(true);
    if (!karar.olurMu) return;
    expect(karar.kayit.tamamlanmaTarihi).toEqual(SIMDI);
  });

  it("tamamlanmamış hedefte tamamlanma anı boş kalır", () => {
    const karar = hedefKabulEdilirMi(girdi({ durum: "SURUYOR" }), SIMDI);
    expect(karar.olurMu).toBe(true);
    if (!karar.olurMu) return;
    expect(karar.kayit.tamamlanmaTarihi).toBeNull();
  });
});

describe("tamamlanmaTarihiniCoz", () => {
  const eski = new Date("2026-03-01T10:00:00Z");

  it("tamamlanmaya geçişte şimdiyi yazar", () => {
    expect(tamamlanmaTarihiniCoz("TAMAMLANDI", "SURUYOR", null, SIMDI)).toEqual(
      SIMDI,
    );
  });

  /* Başlığı düzeltmek, hedefi bugün tamamlanmış göstermemeli. */
  it("zaten tamamlanmış hedefte eski tarihi korur", () => {
    expect(
      tamamlanmaTarihiniCoz("TAMAMLANDI", "TAMAMLANDI", eski, SIMDI),
    ).toEqual(eski);
  });

  it("tamamlanmadan çıkışta tarihi siler", () => {
    expect(tamamlanmaTarihiniCoz("SURUYOR", "TAMAMLANDI", eski, SIMDI)).toBeNull();
  });
});

describe("hedefOzeti", () => {
  it("toplam, tamamlanan ve süren sayısını verir", () => {
    expect(
      hedefOzeti([
        { durum: "PLANLANDI" },
        { durum: "SURUYOR" },
        { durum: "TAMAMLANDI" },
        { durum: "TAMAMLANDI" },
      ]),
    ).toEqual({ toplam: 4, tamamlanan: 2, suren: 1 });
  });

  it("boş listede sıfırlanır", () => {
    expect(hedefOzeti([])).toEqual({ toplam: 0, tamamlanan: 0, suren: 0 });
  });
});

describe("hedefleriSirala", () => {
  const t = (g: string) => new Date(`2026-${g}T00:00:00Z`);

  it("önce süren, sonra planlanan, en sonda tamamlanan gelir", () => {
    const sirali = hedefleriSirala([
      { id: 1, durum: "TAMAMLANDI", hedefTarihi: null },
      { id: 2, durum: "PLANLANDI", hedefTarihi: null },
      { id: 3, durum: "SURUYOR", hedefTarihi: null },
    ]);
    expect(sirali.map((h) => h.id)).toEqual([3, 2, 1]);
  });

  it("aynı durumda yakın tarih önce gelir", () => {
    const sirali = hedefleriSirala([
      { id: 1, durum: "PLANLANDI", hedefTarihi: t("12-01") },
      { id: 2, durum: "PLANLANDI", hedefTarihi: t("09-01") },
    ]);
    expect(sirali.map((h) => h.id)).toEqual([2, 1]);
  });

  /* Tarihsiz hedef "bir gün" demektir; tarihlilerin arkasına düşer. */
  it("tarihsiz hedef, tarihli hedeflerin arkasına düşer", () => {
    const sirali = hedefleriSirala([
      { id: 1, durum: "PLANLANDI", hedefTarihi: null },
      { id: 2, durum: "PLANLANDI", hedefTarihi: t("09-01") },
    ]);
    expect(sirali.map((h) => h.id)).toEqual([2, 1]);
  });

  /* Sayfa her yenilendiğinde satırlar yer değiştirmemeli. */
  it("durumu ve tarihi aynı olanlarda sıra kararlıdır", () => {
    const girdiler = [
      { id: 7, durum: "SURUYOR" as const, hedefTarihi: t("05-01") },
      { id: 3, durum: "SURUYOR" as const, hedefTarihi: t("05-01") },
    ];
    expect(hedefleriSirala(girdiler).map((h) => h.id)).toEqual([3, 7]);
    expect(hedefleriSirala([...girdiler].reverse()).map((h) => h.id)).toEqual([
      3, 7,
    ]);
  });

  it("girdi dizisini değiştirmez", () => {
    const girdiler = [
      { id: 1, durum: "TAMAMLANDI" as const, hedefTarihi: null },
      { id: 2, durum: "SURUYOR" as const, hedefTarihi: null },
    ];
    hedefleriSirala(girdiler);
    expect(girdiler.map((h) => h.id)).toEqual([1, 2]);
  });
});

describe("hedefDurumuGecerliMi", () => {
  it("tanımlı durumları kabul, diğerlerini reddeder", () => {
    expect(hedefDurumuGecerliMi("SURUYOR")).toBe(true);
    expect(hedefDurumuGecerliMi("")).toBe(false);
    expect(hedefDurumuGecerliMi("VAZGECTIM")).toBe(false);
  });
});
