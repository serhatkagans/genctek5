import {
  DEGERLENDIRME_OGRENCI_ALANLARI,
  danismanAdayiFiltresi,
  faaliyetKapsamFiltresi,
  ogrenciKapsamFiltresi,
  ogrenciListeFiltresi,
  ulusalBasvuranFiltresi,
} from "@/lib/yetki/kapsam";
import {
  danismanYap,
  koordinatorYap,
  ogrenciYap,
  projeYoneticisiYap,
  rolsuzOgretmenYap,
} from "./yardimcilar";

/**
 * Kapsam filtresi testleri — references/permissions.md Bölüm 2 ve 3.
 *
 * Filtrenin ürettiği koşulları doğruluyoruz; yanlış üretilen bir filtre
 * doğrudan veri sızması demektir.
 */

function metne(filtre: unknown): string {
  return JSON.stringify(filtre);
}

describe("öğrenci kapsam filtresi", () => {
  it("proje yöneticisine il/kurum kısıtı uygulanmaz", () => {
    const filtre = ogrenciKapsamFiltresi(projeYoneticisiYap());
    expect(metne(filtre)).not.toContain("ilKodu");
    expect(metne(filtre)).not.toContain("kurumKodu");
    expect(metne(filtre)).toContain("OGRENCI");
  });

  it("il koordinatörü yalnızca kendi ilini görür", () => {
    const filtre = ogrenciKapsamFiltresi(koordinatorYap({ ilKodu: "34" }));
    expect(filtre).toEqual({
      AND: [
        { roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } } },
        { ilKodu: "34" },
      ],
    });
  });

  it("danışman için kurum kodu tek başına yetmez, aktif ataması da aranır", () => {
    const filtre = ogrenciKapsamFiltresi(
      danismanYap({ id: 200, kurumKodu: 750001 }),
    );
    const metin = metne(filtre);
    expect(metin).toContain("750001");
    expect(metin).toContain("danismanKullaniciId");
    expect(metin).toContain('"bitisTarihi":null');
  });

  it("öğrenci yalnızca kendisini görür", () => {
    const filtre = ogrenciKapsamFiltresi(ogrenciYap({ id: 100 }));
    expect(filtre).toEqual({
      AND: [
        { roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } } },
        { id: 100 },
      ],
    });
  });

  it("rolsüz öğretmen hiçbir öğrenci görmez (fail closed)", () => {
    const filtre = ogrenciKapsamFiltresi(rolsuzOgretmenYap());
    expect(filtre).toEqual({ id: { in: [] } });
  });
});

describe("öğrenci listesi filtreleri", () => {
  it("filtre yokken kapsam koşulu aynen korunur", () => {
    const kullanici = koordinatorYap({ ilKodu: "34" });
    expect(ogrenciListeFiltresi(kullanici)).toEqual({
      AND: [ogrenciKapsamFiltresi(kullanici)],
    });
  });

  it("seçilen filtreler kapsamın üstüne eklenir", () => {
    const filtre = ogrenciListeFiltresi(projeYoneticisiYap(), {
      ilKodu: "06",
      kurumKodu: 750003,
      sinif: "9",
      calismaGrubuId: 4,
    });
    expect(filtre.AND).toContainEqual({ ilKodu: "06" });
    expect(filtre.AND).toContainEqual({ kurumKodu: 750003 });
    expect(filtre.AND).toContainEqual({
      sinif: { contains: "9", mode: "insensitive" },
    });
    expect(filtre.AND).toContainEqual({
      calismaGruplari: { some: { calismaGrubuId: 4 } },
    });
  });

  it("başka ilin kodu girilse bile koordinatörün il kısıtı düşmez", () => {
    // Adres çubuğuna ?il=06 yazan İstanbul koordinatörü senaryosu: iki koşul
    // birlikte arandığı için sonuç boş küme olur, başka ilin verisi gelmez.
    const filtre = ogrenciListeFiltresi(koordinatorYap({ ilKodu: "34" }), {
      ilKodu: "06",
    });
    expect(filtre.AND).toContainEqual({
      AND: [
        { roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } } },
        { ilKodu: "34" },
      ],
    });
    expect(filtre.AND).toContainEqual({ ilKodu: "06" });
  });

  it("rolsüz öğretmen filtre verse de hiçbir kayıt göremez", () => {
    const filtre = ogrenciListeFiltresi(rolsuzOgretmenYap(), {
      ilKodu: "34",
      ara: "Elif",
    });
    expect(filtre.AND).toContainEqual({ id: { in: [] } });
  });

  it("danışmansız filtresi aktif atama yokluğunu arar", () => {
    const filtre = ogrenciListeFiltresi(projeYoneticisiYap(), {
      danismansizMi: true,
    });
    expect(filtre.AND).toContainEqual({
      ogrenciAtamalari: { none: { bitisTarihi: null } },
    });
  });

  it("ad araması hem adda hem soyadda eşleşir", () => {
    const filtre = ogrenciListeFiltresi(projeYoneticisiYap(), { ara: "yıl" });
    expect(filtre.AND).toContainEqual({
      OR: [
        { ad: { contains: "yıl", mode: "insensitive" } },
        { soyad: { contains: "yıl", mode: "insensitive" } },
      ],
    });
  });
});

describe("ulusal faaliyet istisnası", () => {
  it("il koordinatörü yalnızca kendi açtığı faaliyetin başvuranlarını görür", () => {
    const filtre = ulusalBasvuranFiltresi(koordinatorYap({ id: 300 }), 900);
    expect(filtre).toEqual({
      faaliyetId: 900,
      faaliyet: { duzenleyenKullaniciId: 300 },
    });
  });

  it("değerlendirme ekranında telefon ve e-posta gösterilmez", () => {
    const alanlar = Object.keys(DEGERLENDIRME_OGRENCI_ALANLARI);
    expect(alanlar).not.toContain("telefon");
    expect(alanlar).not.toContain("eposta");
    expect(alanlar).not.toContain("ogrenciProfil");
    expect(alanlar).toContain("ad");
    expect(alanlar).toContain("soyad");
  });
});

describe("faaliyet kapsam filtresi", () => {
  it("proje yöneticisine filtre uygulanmaz", () => {
    expect(faaliyetKapsamFiltresi(projeYoneticisiYap())).toEqual({});
  });

  it("öğrenciye yalnızca yayında olan faaliyetler ve kendi kapsamı listelenir", () => {
    const filtre = faaliyetKapsamFiltresi(
      ogrenciYap({ kurumKodu: 750001, ilKodu: "34" }),
    );
    const metin = metne(filtre);
    expect(metin).toContain("ONAYLANDI");
    expect(metin).toContain("ONAY_GEREKMEZ");
    expect(metin).toContain("750001");
    expect(metin).toContain('"ilKodu":"34"');
    expect(metin).not.toContain("BEKLIYOR");
  });

  it("kişinin kendi açtığı faaliyetler onay durumundan bağımsız görünür", () => {
    const filtre = faaliyetKapsamFiltresi(koordinatorYap({ id: 300 }));
    expect(metne(filtre)).toContain('"duzenleyenKullaniciId":300');
  });
});

describe("danışman adayı filtresi", () => {
  it("aynı kurumdaki, işaretlemiş ve il koordinatörü olmayan öğretmenleri seçer", () => {
    const filtre = danismanAdayiFiltresi(750001);
    expect(filtre.kurumKodu).toBe(750001);
    expect(metne(filtre)).toContain("danismanOlmakIstiyor");
    expect(metne(filtre)).toContain("IL_KOORDINATOR");
    expect(metne(filtre)).toContain("NOT");
  });
});
