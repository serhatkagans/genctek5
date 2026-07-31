import {
  csvAdParcasi,
  csvBelgesi,
  csvHucresi,
  csvSatiri,
} from "../src/lib/rapor/csv";

describe("csvHucresi", () => {
  it("boş değerleri boş hücreye çevirir", () => {
    expect(csvHucresi(null)).toBe("");
    expect(csvHucresi(undefined)).toBe("");
    expect(csvHucresi("")).toBe("");
  });

  it("sıradan metni olduğu gibi bırakır", () => {
    expect(csvHucresi("Kadıköy Anadolu Lisesi")).toBe(
      "Kadıköy Anadolu Lisesi",
    );
  });

  it("ayıraç içeren hücreyi tırnaklar", () => {
    expect(csvHucresi("Robotik; Yapay Zekâ")).toBe('"Robotik; Yapay Zekâ"');
  });

  it("hücredeki tırnağı ikiler", () => {
    expect(csvHucresi('12-A "sınıfı"')).toBe('"12-A ""sınıfı"""');
  });

  it("satır sonu içeren hücreyi tırnaklar", () => {
    expect(csvHucresi("birinci\nikinci")).toBe('"birinci\nikinci"');
  });

  /*
   * Formül enjeksiyonu: e-Okul'dan gelen bir ad teoride "=" ile başlayamaz ama
   * serbest metin alanları (faaliyet adı, çalışma grubu adı) yönetici
   * tarafından girilir ve dosyayı açan kişinin makinesinde çalışır.
   */
  it("formül olarak yorumlanabilecek hücreyi etkisizleştirir", () => {
    expect(csvHucresi("=1+1")).toBe("'=1+1");
    expect(csvHucresi("+A1")).toBe("'+A1");
    expect(csvHucresi("-2")).toBe("'-2");
    expect(csvHucresi("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("etkisizleştirdiği hücreyi ayrıca tırnaklamayı unutmaz", () => {
    expect(csvHucresi("=A1;B2")).toBe(`"'=A1;B2"`);
  });
});

describe("csvSatiri", () => {
  it("hücreleri noktalı virgülle birleştirir", () => {
    expect(csvSatiri(["Ayşe", "Yılmaz", 11])).toBe("Ayşe;Yılmaz;11");
  });
});

describe("csvBelgesi", () => {
  const belge = csvBelgesi(["Ad", "Sınıf"], [["Ayşe", "11-A"]]);

  it("Excel'in kodlamayı doğru seçmesi için BOM ile başlar", () => {
    expect(belge.startsWith("\uFEFF")).toBe(true);
  });

  it("başlık satırını ilk sıraya koyar", () => {
    expect(belge).toContain("Ad;Sınıf\r\n");
  });

  it("satırları CRLF ile ayırır ve sonda satır sonu bırakır", () => {
    expect(belge.endsWith("Ayşe;11-A\r\n")).toBe(true);
  });

  it("kaydı olmayan raporda yalnızca başlık üretir", () => {
    expect(csvBelgesi(["Ad"], [])).toBe("\uFEFFAd\r\n");
  });
});

describe("csvAdParcasi", () => {
  it("boşlukları tireye çevirir ve küçük harfe indirir", () => {
    expect(csvAdParcasi("Robotik Atölyesi", "1")).toBe("robotik-atolyesi");
  });

  /*
   * "I" harfinin küçüğü Türkçe'de "ı"dır; yerel ayar verilmeseydi "IHTIYAÇ"
   * gibi bir ad "ihtiyac" değil "i̇htiyac" olur ve dosya adına bozuk bir
   * karakter sızardı.
   */
  it("Türkçe harfleri sadeleştirir", () => {
    expect(csvAdParcasi("Işık Çağrısı: Güneş Ölçümü", "1")).toBe(
      "isik-cagrisi-gunes-olcumu",
    );
  });

  it("baştaki ve sondaki tireleri atar", () => {
    expect(csvAdParcasi("  Zirve 2026!  ", "1")).toBe("zirve-2026");
  });

  it("uzun adı kırpar ve kırpma tirede bitmez", () => {
    const parca = csvAdParcasi(
      "Ulusal Bilişim Teknolojileri ve Yapay Zekâ Zirvesi Kapanış Oturumu",
      "1",
    );
    expect(parca.length).toBeLessThanOrEqual(40);
    expect(parca.endsWith("-")).toBe(false);
  });

  it("harf kalmayan adda yedeğe düşer", () => {
    expect(csvAdParcasi("!!! ???", "42")).toBe("42");
  });
});
