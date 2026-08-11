import {
  type CvSinirlari,
  cvKabulEdilirMi,
  cvTipAdlari,
} from "@/lib/ogrenci/cv-kurallar";

/**
 * Öğrenci CV'si kabul kuralları — references/domain-rules.md Bölüm 14.
 *
 * Sınırlar sistem_ayari'ndan gelir (IZINLI_CV_TIPLERI, CV_MAKS_BAYT), koda
 * gömülmez; testler bu yüzden sınırı parametre olarak veriyor.
 */

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * ÜRÜNÜN BUGÜNKÜ AYARI (11 Ağustos 2026 · istek: "özgeçmişimde kabul edilen
 * tek format pdf olsun"). Kurulu veritabanlarındaki IZINLI_CV_TIPLERI satırı
 * da bu değere çekildi (migration 20260811150000_cv_yalnizca_pdf).
 */
const PDF_SINIRLARI: CvSinirlari = {
  izinliTipler: ["application/pdf"],
  maksBayt: 5 * 1024 * 1024,
};

/**
 * Doc/docx'e açık bir yapılandırma.
 *
 * ÜRÜN ARTIK BÖYLE YAPILANDIRILMIYOR ama testler duruyor: liste bir sistem
 * ayarıdır ve proje yöneticisi Yönetim ekranından yeniden açabilir. Buradaki
 * beklentiler "doc kabul edilir" demiyor, "fonksiyon kendisine verilen listeye
 * uyar" diyor — asıl ürün kuralını aşağıdaki "PDF-only" bölümü sınıyor.
 */
const SINIRLAR: CvSinirlari = {
  izinliTipler: ["application/pdf", "application/msword", DOCX],
  maksBayt: 5 * 1024 * 1024,
};

const dosya = (ozellikler: Partial<Parameters<typeof cvKabulEdilirMi>[0]>) => ({
  dosyaAdi: "ozgecmis.pdf",
  mimeTipi: "application/pdf",
  boyutBayt: 200 * 1024,
  ...ozellikler,
});

describe("CV kabulü", () => {
  it("pdf kabul eder", () => {
    expect(cvKabulEdilirMi(dosya({}), SINIRLAR).olurMu).toBe(true);
  });

  it("doc kabul eder", () => {
    const karar = cvKabulEdilirMi(
      dosya({ dosyaAdi: "cv.doc", mimeTipi: "application/msword" }),
      SINIRLAR,
    );
    expect(karar.olurMu).toBe(true);
  });

  it("docx kabul eder", () => {
    const karar = cvKabulEdilirMi(
      dosya({ dosyaAdi: "cv.docx", mimeTipi: DOCX }),
      SINIRLAR,
    );
    expect(karar.olurMu).toBe(true);
  });

  it("görseli reddeder", () => {
    // Faaliyet ekinde geçerli olan görsel tipleri CV için geçerli değil:
    // iki sınır listesi bilinçli olarak ayrı.
    const karar = cvKabulEdilirMi(
      dosya({ dosyaAdi: "foto.png", mimeTipi: "image/png" }),
      SINIRLAR,
    );
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toContain("pdf, doc, docx");
  });

  it("boyut sınırını aşan dosyayı gerekçesiyle reddeder", () => {
    const karar = cvKabulEdilirMi(
      dosya({ boyutBayt: 6 * 1024 * 1024 }),
      SINIRLAR,
    );
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toContain("5 MB");
  });

  it("boş dosyayı reddeder", () => {
    expect(cvKabulEdilirMi(dosya({ boyutBayt: 0 }), SINIRLAR).olurMu).toBe(
      false,
    );
  });

  it("adı olmayan dosyayı reddeder", () => {
    expect(cvKabulEdilirMi(dosya({ dosyaAdi: "  " }), SINIRLAR).olurMu).toBe(
      false,
    );
  });
});

describe("PDF-only yapılandırması", () => {
  it("pdf kabul eder", () => {
    expect(cvKabulEdilirMi(dosya({}), PDF_SINIRLARI).olurMu).toBe(true);
  });

  it("doc'u gerekçesiyle reddeder", () => {
    const karar = cvKabulEdilirMi(
      dosya({ dosyaAdi: "cv.doc", mimeTipi: "application/msword" }),
      PDF_SINIRLARI,
    );
    expect(karar.olurMu).toBe(false);
    // Gerekçe neyin kabul edildiğini SÖYLER: "biçim geçersiz" diyen bir mesaj,
    // kullanıcıyı dosyasını tahminle dönüştürmeye bırakırdı.
    expect(karar.neden).toContain("yalnızca pdf");
  });

  it("docx'i reddeder", () => {
    expect(
      cvKabulEdilirMi(dosya({ dosyaAdi: "cv.docx", mimeTipi: DOCX }), PDF_SINIRLARI)
        .olurMu,
    ).toBe(false);
  });

  it("uzantısı pdf olan ama tipi Word olan dosyayı reddeder", () => {
    // Karar MIME tipine bakar, ada değil: adı değiştirmek dosyayı PDF yapmaz.
    const karar = cvKabulEdilirMi(
      dosya({ dosyaAdi: "ozgecmis.pdf", mimeTipi: DOCX }),
      PDF_SINIRLARI,
    );
    expect(karar.olurMu).toBe(false);
  });
});

describe("tip adları", () => {
  it("MIME tiplerini okunur biçime çevirir", () => {
    expect(cvTipAdlari(SINIRLAR.izinliTipler)).toBe("pdf, doc, docx");
    expect(cvTipAdlari(PDF_SINIRLARI.izinliTipler)).toBe("pdf");
  });

  it("tanımadığı tipi olduğu gibi yazar", () => {
    expect(cvTipAdlari(["application/zip"])).toBe("application/zip");
  });
});
