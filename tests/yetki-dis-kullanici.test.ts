import { kullanicininBelgeleri } from "@/lib/kvkk/kurallar";
import {
  basvuruYapabilirMi,
  disBasvuruYonetebilirMi,
  disKullaniciMi,
  faaliyetGorunurMu,
  mezunMu,
  ogretmenEnvanteriGorebilirMi,
  panodaEslesmeArayabilirMi,
  paydasEkleyebilirMi,
  paydasGorebilirMi,
  paydasTemsilcisiMi,
  talepPanosuGorebilirMi,
  yorumYazabilirMi,
} from "@/lib/yetki/izinler";
import {
  faaliyetKapsamFiltresi,
  ogrenciKapsamFiltresi,
  ogretmenKapsamFiltresi,
  paydasKapsamFiltresi,
} from "@/lib/yetki/kapsam";
import {
  danismanYap,
  faaliyetYap,
  koordinatorYap,
  mezunYap,
  ogrenciYap,
  paydasTemsilcisiYap,
  projeYoneticisiYap,
} from "./yardimcilar";

/**
 * EBA dışı rollerin (MEZUN, PAYDAS_TEMSILCISI) yetki ve kapsamı.
 *
 * Bu dosyanın varlık sebebi tek cümlede: yanlış yazılmış bir kapsam filtresi
 * HATA VERMEZ, sadece görülmemesi gereken veriyi gösterir. İki yeni rol,
 * il/kurum ekseninde çalışan filtrelerin hiçbirinde varsayılan olarak "görür"
 * tarafına düşmemeli — özellikle "ili var ve öğrenci değil" biçimindeki
 * koşullarda.
 */

function metne(filtre: unknown): string {
  return JSON.stringify(filtre);
}

const HICBIRI = { id: { in: [] } };

describe("rol tanıma", () => {
  it("mezun ve paydaş temsilcisi dış kullanıcıdır", () => {
    expect(disKullaniciMi(mezunYap())).toBe(true);
    expect(disKullaniciMi(paydasTemsilcisiYap())).toBe(true);
    expect(mezunMu(mezunYap())).toBe(true);
    expect(paydasTemsilcisiMi(paydasTemsilcisiYap())).toBe(true);
  });

  it("EBA kimlikli roller dış kullanıcı değildir", () => {
    for (const kullanici of [
      ogrenciYap(),
      danismanYap(),
      koordinatorYap(),
      projeYoneticisiYap(),
    ]) {
      expect(disKullaniciMi(kullanici)).toBe(false);
    }
  });
});

describe("başvuru ve talep panosu", () => {
  it("dış kullanıcı faaliyete katılımcı olarak başvuramaz", () => {
    expect(basvuruYapabilirMi(mezunYap())).toBe(false);
    expect(basvuruYapabilirMi(paydasTemsilcisiYap())).toBe(false);
  });

  it("öğrenci ve öğretmenin başvuru yetkisi değişmedi", () => {
    expect(basvuruYapabilirMi(ogrenciYap())).toBe(true);
    expect(basvuruYapabilirMi(danismanYap())).toBe(true);
    expect(basvuruYapabilirMi(projeYoneticisiYap())).toBe(false);
  });

  it("talep panosu başvuru yetkisinden AYRIDIR: dış kullanıcı panoyu görür", () => {
    expect(talepPanosuGorebilirMi(mezunYap())).toBe(true);
    expect(talepPanosuGorebilirMi(paydasTemsilcisiYap())).toBe(true);
  });

  it("panoyu proje yöneticisi de GÖRÜR ama ilan açamaz", () => {
    // 13 Ağustos 2026: görme ile ilan açma ayrıldı. Merkez, sistemin en canlı
    // kullanıcı alanını okuyabilmeli; ilan asan taraf ise o değil.
    expect(talepPanosuGorebilirMi(projeYoneticisiYap())).toBe(true);
    expect(panodaEslesmeArayabilirMi(projeYoneticisiYap())).toBe(false);
  });

  it("ilan açma ve bağlantı isteği panoyu gören herkeste açık", () => {
    expect(panodaEslesmeArayabilirMi(ogrenciYap())).toBe(true);
    expect(panodaEslesmeArayabilirMi(danismanYap())).toBe(true);
    expect(panodaEslesmeArayabilirMi(mezunYap())).toBe(true);
    expect(panodaEslesmeArayabilirMi(paydasTemsilcisiYap())).toBe(true);
  });
});

describe("faaliyet yorumu", () => {
  it("dış kullanıcı GÖRDÜĞÜ ulusal faaliyete bile yorum yazamaz", () => {
    // "Görebiliyorsa yazabilir" kuralı, takvimi görebilen dış kullanıcıya
    // faaliyet altında söz hakkı verirdi; moderasyon faaliyeti açan kişide ve
    // alanın katılımcıları 18 yaş altı.
    const ulusal = faaliyetYap({
      kapsam: "ULUSAL",
      kurumKodu: null,
      onayliMi: true,
    });
    expect(faaliyetGorunurMu(mezunYap(), ulusal)).toBe(true);
    expect(yorumYazabilirMi(mezunYap(), ulusal)).toBe(false);
    expect(yorumYazabilirMi(paydasTemsilcisiYap(), ulusal)).toBe(false);
  });

  it("öğrencinin yorum yetkisi değişmedi", () => {
    const ulusal = faaliyetYap({
      kapsam: "ULUSAL",
      kurumKodu: null,
      onayliMi: true,
    });
    expect(yorumYazabilirMi(ogrenciYap(), ulusal)).toBe(true);
  });
});

describe("başvuru onay yetkisi", () => {
  it("yalnızca proje yöneticisi karar verir", () => {
    expect(disBasvuruYonetebilirMi(projeYoneticisiYap())).toBe(true);
    expect(disBasvuruYonetebilirMi(koordinatorYap())).toBe(false);
    expect(disBasvuruYonetebilirMi(danismanYap())).toBe(false);
    expect(disBasvuruYonetebilirMi(mezunYap())).toBe(false);
  });
});

describe("envanter kapıları", () => {
  it("dış kullanıcı öğretmen ve paydaş envanterini göremez", () => {
    for (const kullanici of [mezunYap(), paydasTemsilcisiYap()]) {
      expect(ogretmenEnvanteriGorebilirMi(kullanici)).toBe(false);
      expect(paydasGorebilirMi(kullanici)).toBe(false);
      expect(paydasEkleyebilirMi(kullanici)).toBe(false);
    }
  });
});

describe("kapsam filtreleri", () => {
  it("dış kullanıcı hiçbir öğrenci kaydı görmez", () => {
    expect(ogrenciKapsamFiltresi(mezunYap())).toEqual(HICBIRI);
    expect(ogrenciKapsamFiltresi(paydasTemsilcisiYap())).toEqual(HICBIRI);
  });

  it("dış kullanıcı hiçbir öğretmen kaydı görmez", () => {
    expect(ogretmenKapsamFiltresi(mezunYap())).toEqual(HICBIRI);
    expect(ogretmenKapsamFiltresi(paydasTemsilcisiYap())).toEqual(HICBIRI);
  });

  it("PAYDAŞ ENVANTERİ: ili olan dış kullanıcı ilin listesini GÖREMEZ", () => {
    /*
     * Bu, filtrenin en kolay kaçırılan yeriydi: koşul "ili var ve öğrenci
     * değil" dediği için paydaş temsilcisi, kendi ilindeki tüm paydaş
     * kayıtlarını yetkili kişi adı ve iletişim bilgisiyle görürdü.
     */
    expect(paydasKapsamFiltresi(mezunYap({ ilKodu: "34" }))).toEqual(HICBIRI);
    expect(paydasKapsamFiltresi(paydasTemsilcisiYap({ ilKodu: "34" }))).toEqual(
      HICBIRI,
    );
  });

  it("danışman öğretmenin paydaş erişimi bundan etkilenmedi", () => {
    expect(paydasKapsamFiltresi(danismanYap({ ilKodu: "34" }))).toEqual({
      ilKodu: "34",
    });
  });

  it("öğretmen envanteri kümesi dış rolleri DIŞLAR", () => {
    // Küme "öğrenci olmayan" diye tanımlı kalsaydı mezunlar il
    // koordinatörünün öğretmen listesinde görünürdü.
    const filtre = metne(ogretmenKapsamFiltresi(koordinatorYap()));
    expect(filtre).toContain("MEZUN");
    expect(filtre).toContain("PAYDAS_TEMSILCISI");
  });

  it("etkinlik takvimi görünür ama okul kapsamı kapalıdır", () => {
    // Dar başlangıçta bırakılan tek görünürlük: ulusal ve kendi ilindeki
    // etkinlikler. Kurum kodu olmadığı için okul içi faaliyetler kapalı.
    const filtre = metne(faaliyetKapsamFiltresi(mezunYap({ ilKodu: "34" })));
    expect(filtre).toContain("ULUSAL");
    expect(filtre).toContain('"kapsam":"IL"');
    expect(filtre).not.toContain('"kapsam":"OKUL"');
  });
});

describe("onay belgeleri", () => {
  it("dış kullanıcıdan aydınlatma ve açık rıza istenir", () => {
    const belgeler = kullanicininBelgeleri(mezunYap()).map(
      (tanim) => tanim.belge,
    );
    expect(belgeler).toEqual(["AYDINLATMA", "ACIK_RIZA"]);
  });

  it("koordinatöre özel belgeler dış kullanıcıdan istenmez", () => {
    const belgeler = kullanicininBelgeleri(paydasTemsilcisiYap()).map(
      (tanim) => tanim.belge,
    );
    expect(belgeler).not.toContain("TAAHHUTNAME");
    expect(belgeler).not.toContain("GIZLILIK_SOZLESMESI");
  });

  it("il koordinatörünün belgeleri değişmedi", () => {
    const belgeler = kullanicininBelgeleri(koordinatorYap()).map(
      (tanim) => tanim.belge,
    );
    expect(belgeler).toEqual([
      "ACIK_RIZA",
      "TAAHHUTNAME",
      "GIZLILIK_SOZLESMESI",
    ]);
  });
});
