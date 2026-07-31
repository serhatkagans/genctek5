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
  it("üç temsilciliği de adlandırır", () => {
    expect(Object.keys(GOREV_ROL_ETIKETLERI).sort()).toEqual([
      "ILCE_TEMSILCISI",
      "IL_TEMSILCISI",
      "OKUL_TEMSILCISI",
    ]);
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
