import {
  destekGruplariniAyikla,
  disProfiliDogrula,
  GOREV_UNVANI_AZAMI,
  KATKI_ACIKLAMASI_AZAMI,
  KURUM_ADI_AZAMI,
} from "@/lib/dis-kimlik/profil-kurallar";

/**
 * Mezun / paydaş / mentör profilinin kendi girdiği alanlar (7 Ağustos 2026).
 *
 * İstek: profilde "il kurum görevi linkedin github eposta açıklamalar/katkı
 * sağlayabileceği şeyler", panelde "Çalışma Grupları".
 */

describe("dış kullanıcı profil alanları", () => {
  it("boş bırakılan alan null yazılır, boş metin değil", () => {
    /*
     * Alanların hiçbiri zorunlu değil: onaylanmış bir kullanıcıdan yeni bilgi
     * istemek, o bilgiyi girene kadar profilini kilitlemek olurdu. "" ile null
     * ayrımı önemli — ekran ikisini de "—" gösteriyor ama veritabanında boş
     * metin, doldurulmuş bir alan gibi görünür.
     */
    const karar = disProfiliDogrula({
      kurumAdi: "   ",
      gorevUnvani: "",
      aciklama: "\n\t ",
    });
    expect(karar).toEqual({
      olurMu: true,
      degerler: { kurumAdi: null, gorevUnvani: null, aciklama: null },
    });
  });

  it("baştaki ve sondaki boşlukları kırpar", () => {
    const karar = disProfiliDogrula({
      kurumAdi: "  Örnek Teknoloji A.Ş.  ",
      gorevUnvani: " Ar-Ge sorumlusu ",
      aciklama: " Staj ve mekân desteği verebilirim. ",
    });
    expect(karar).toEqual({
      olurMu: true,
      degerler: {
        kurumAdi: "Örnek Teknoloji A.Ş.",
        gorevUnvani: "Ar-Ge sorumlusu",
        aciklama: "Staj ve mekân desteği verebilirim.",
      },
    });
  });

  it("sütun sınırını aşan kurum adı reddedilir", () => {
    // Sınır veritabanı sütunuyla aynı; uygulama katmanında yakalanmasaydı
    // Postgres hatası kullanıcıya ham hâlde düşerdi.
    const karar = disProfiliDogrula({
      kurumAdi: "a".repeat(KURUM_ADI_AZAMI + 1),
      gorevUnvani: "",
      aciklama: "",
    });
    expect(karar.olurMu).toBe(false);
  });

  it("sınırın tam üstündeki değer kabul edilir", () => {
    const karar = disProfiliDogrula({
      kurumAdi: "a".repeat(KURUM_ADI_AZAMI),
      gorevUnvani: "b".repeat(GOREV_UNVANI_AZAMI),
      aciklama: "c".repeat(KATKI_ACIKLAMASI_AZAMI),
    });
    expect(karar.olurMu).toBe(true);
  });

  it("uzun görev ve açıklama ayrı ayrı reddedilir", () => {
    expect(
      disProfiliDogrula({
        kurumAdi: "",
        gorevUnvani: "b".repeat(GOREV_UNVANI_AZAMI + 1),
        aciklama: "",
      }).olurMu,
    ).toBe(false);
    expect(
      disProfiliDogrula({
        kurumAdi: "",
        gorevUnvani: "",
        aciklama: "c".repeat(KATKI_ACIKLAMASI_AZAMI + 1),
      }).olurMu,
    ).toBe(false);
  });
});

describe("katkı verilebilecek çalışma grupları", () => {
  const gecerliler = [1, 2, 3];

  it("yalnızca geçerli grup kimliklerini alır", () => {
    // Form girdisine güvenilseydi kapatılmış ya da hiç var olmayan bir gruba
    // katkı beyan edilebilirdi.
    expect(destekGruplariniAyikla(["1", "99", "3"], gecerliler)).toEqual([1, 3]);
  });

  it("tekrarlananları eler", () => {
    // Aynı grup iki kez gönderildiğinde birincil anahtar çakışırdı.
    expect(destekGruplariniAyikla(["2", "2", 2], gecerliler)).toEqual([2]);
  });

  it("sayı olmayan değerleri yok sayar", () => {
    expect(destekGruplariniAyikla(["abc", "", "2"], gecerliler)).toEqual([2]);
  });

  it("boş seçim geçerlidir", () => {
    /*
     * Mentörlükten farkı bu: orada en az bir alan dolu olmalı çünkü konusuz bir
     * mentörlük hiçbir ilanla eşleşmez. Burada kişi bütün gruplardan çıkmak
     * isteyebilir ve bu bir hata değildir.
     */
    expect(destekGruplariniAyikla([], gecerliler)).toEqual([]);
  });
});
