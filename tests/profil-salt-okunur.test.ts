import {
  SALT_OKUNUR_ALANLAR,
  saltOkunurAlanlariAyikla,
} from "@/lib/kullanici/salt-okunur";

/**
 * SKILL.md "Değişmezler" 6: EBA'dan gelen alanlar hiçbir ekranda düzenlenebilir
 * olmaz. Mock kimlik doğrulama aşamasında da bu kural geçerlidir.
 */

const OGRENCI_IZINLI_ALANLARI = ["eposta", "telefon"] as const;

describe("salt okunur alan koruması", () => {
  it("izinli alanlar geçer, salt okunur alanlar yok sayılır", () => {
    const sonuc = saltOkunurAlanlariAyikla<{
      eposta: string;
      telefon: string;
    }>(
      {
        eposta: "ogrenci@ornek.gov.tr",
        telefon: "5551112233",
        ad: "Değiştirilmiş",
        kurumKodu: "999999",
        sinif: "12-Z",
      },
      OGRENCI_IZINLI_ALANLARI,
    );

    expect(sonuc.temizVeri).toEqual({
      eposta: "ogrenci@ornek.gov.tr",
      telefon: "5551112233",
    });
    expect(sonuc.yoksayilanAlanlar).toEqual(["ad", "kurumKodu", "sinif"]);
  });

  it("yalnızca salt okunur alan gönderilirse hiçbir değişiklik üretilmez", () => {
    const sonuc = saltOkunurAlanlariAyikla<{ eposta: string }>(
      { ad: "X", soyad: "Y", il: "34" },
      ["eposta"],
    );
    expect(sonuc.temizVeri).toEqual({});
    expect(sonuc.yoksayilanAlanlar).toHaveLength(3);
  });

  it("kimlik ve okul alanlarının tamamı salt okunur listede yer alır", () => {
    for (const alan of [
      "ad",
      "soyad",
      "cinsiyet",
      "kurumKodu",
      "okulTuru",
      "ilKodu",
      "ilceKodu",
      "sinif",
      "brans",
      "egitimOgretimYili",
    ]) {
      expect(SALT_OKUNUR_ALANLAR).toContain(alan);
    }
  });
});
