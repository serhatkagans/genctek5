import {
  GOREV_ROL_ETIKETLERI,
  gorevRolAdi,
} from "@/lib/yetki/etiketler";

/**
 * Görev rollerinin ekrandaki adı.
 *
 * Roller HİÇBİR yetki vermez (permissions.md Bölüm 5); burada sınanan yalnızca
 * etiketin doğru yeri gösterip göstermediğidir.
 */

describe("görev rolü etiketleri", () => {
  it("dört görevi de adlandırır", () => {
    /*
     * CALISMA_GRUBU_YONETICISI 7 Ağustos 2026'da eklendi (istek: "Görevlerim
     * (İl Temsilcisi/Okul Temsilcisi/Çalışma Grubu Yöneticisi ...)").
     * Diğer üçünden farkı kapsamının bir YER değil bir GRUP olmasıdır.
     */
    expect(Object.keys(GOREV_ROL_ETIKETLERI).sort()).toEqual([
      "CALISMA_GRUBU_YONETICISI",
      "ILCE_TEMSILCISI",
      "IL_TEMSILCISI",
      "OKUL_TEMSILCISI",
    ]);
  });

  it("çalışma grubu yöneticiliğini GRUP adıyla yazar", () => {
    /*
     * Kurum adına düşseydi etiket "Atatürk Lisesi Çalışma Grubu Yöneticisi"
     * derdi ve hangi grubun yöneticisi olduğu kaybolurdu.
     */
    expect(
      gorevRolAdi({
        rolKodu: "CALISMA_GRUBU_YONETICISI",
        calismaGrubu: { ad: "Robotik" },
        kurum: { ad: "Atatürk Lisesi" },
      }),
    ).toBe("Robotik Çalışma Grubu Yöneticisi");
  });

  it("grubu bilinmeyen yöneticilikte yalnızca unvanı yazar", () => {
    expect(gorevRolAdi({ rolKodu: "CALISMA_GRUBU_YONETICISI" })).toBe(
      "Çalışma Grubu Yöneticisi",
    );
  });
});

describe("görevin yer adıyla yazılması", () => {
  it("her rolü KENDİ kapsam sütunundan okur", () => {
    /*
     * Yer, görev kaydının kendi kapsamından gelir; öğrencinin güncel
     * il/ilçe/okul kaydından değil. Öğrenci dönem içinde taşındığında görev
     * verildiği yerde kalır ve etiket de orayı göstermelidir.
     */
    expect(
      gorevRolAdi({ rolKodu: "IL_TEMSILCISI", il: { ad: "İstanbul" } }),
    ).toBe("İstanbul İl Temsilcisi");
    expect(
      gorevRolAdi({ rolKodu: "ILCE_TEMSILCISI", ilce: { ad: "Çankaya" } }),
    ).toBe("Çankaya İlçe Temsilcisi");
    expect(
      gorevRolAdi({ rolKodu: "OKUL_TEMSILCISI", kurum: { ad: "Atatürk Lisesi" } }),
    ).toBe("Atatürk Lisesi Okul Temsilcisi");
  });

  it("başka rolün kapsamını etikete karıştırmaz", () => {
    // İlçe temsilciliği kaydında il de doludur (öğrencinin ili); etikete
    // girmesi "İstanbul İlçe Temsilcisi" gibi anlamsız bir ad üretirdi.
    expect(
      gorevRolAdi({
        rolKodu: "ILCE_TEMSILCISI",
        il: { ad: "İstanbul" },
        ilce: { ad: "Kadıköy" },
      }),
    ).toBe("Kadıköy İlçe Temsilcisi");
  });

  it("kapsam adı çekilmediyse sade rol adına düşer", () => {
    // Eksik veriyle "undefined Temsilcisi" yazmaktansa etiketi kısaltmak yeğdir.
    expect(gorevRolAdi({ rolKodu: "IL_TEMSILCISI" })).toBe("İl Temsilcisi");
    expect(gorevRolAdi({ rolKodu: "ILCE_TEMSILCISI", ilce: null })).toBe(
      "İlçe Temsilcisi",
    );
  });
});
