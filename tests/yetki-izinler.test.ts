import {
  baskasiAdinaBasvurabilirMi,
  basvuruDegerlendirebilirMi,
  basvuruYapabilirMi,
  calismaGrubuTanimlayabilirMi,
  ekYukleyebilirMi,
  faaliyetPaydasiYonetebilirMi,
  ogretmenEnvanteriGorebilirMi,
  paydasEkleyebilirMi,
  paydasGorebilirMi,
  paydasYonetebilirMi,
  faaliyetAcabilirMi,
  faaliyetGorunurMu,
  faaliyetIptalEdebilirMi,
  faaliyetOnayGerekiyorMu,
  faaliyetOnaylayabilirMi,
  ilceTemsilcisiAtayabilirMi,
  ilKoordinatorAtayabilirMi,
  ilTemsilcisiAtayabilirMi,
  ogrenciCalismaGrubuYonetebilirMi,
  ogrenciFaaliyetiniOnaylayabilirMi,
  okulTemsilcisiAtayabilirMi,
  rolEnvanteriGorebilirMi,
  yetkiDevrolduMu,
  yorumSilebilirMi,
  yorumYazabilirMi,
} from "@/lib/yetki/izinler";
import {
  danismanYap,
  faaliyetYap,
  koordinatorYap,
  ogrenciYap,
  projeYoneticisiYap,
  rolsuzOgretmenYap,
} from "./yardimcilar";

/**
 * references/permissions.md Bölüm 1'deki yetki matrisinin testleri.
 * Matris değişirse bu testler de değişmelidir.
 */

describe("faaliyet açma kapsamı", () => {
  it("danışman öğretmen yalnızca okul içi faaliyet açar", () => {
    const danisman = danismanYap();
    expect(faaliyetAcabilirMi(danisman, "OKUL")).toBe(true);
    expect(faaliyetAcabilirMi(danisman, "IL")).toBe(false);
    expect(faaliyetAcabilirMi(danisman, "ULUSAL")).toBe(false);
  });

  it("il koordinatörü okul, il ve ulusal faaliyet açar", () => {
    const koordinator = koordinatorYap();
    expect(faaliyetAcabilirMi(koordinator, "OKUL")).toBe(true);
    expect(faaliyetAcabilirMi(koordinator, "IL")).toBe(true);
    expect(faaliyetAcabilirMi(koordinator, "ULUSAL")).toBe(true);
  });

  /*
   * Öğrenciye üç kapsam da açıktır ve bu bir gevşeme DEĞİLDİR: sınır kapsamda
   * değil onayda kuruldu — öğrencinin açtığı hiçbir faaliyet kendiliğinden
   * yayına girmez (bkz. "öğrencinin açtığı her faaliyet onay bekler").
   */
  it("öğrenci her kapsamda faaliyet önerebilir", () => {
    const ogrenci = ogrenciYap();
    expect(faaliyetAcabilirMi(ogrenci, "OKUL")).toBe(true);
    expect(faaliyetAcabilirMi(ogrenci, "IL")).toBe(true);
    expect(faaliyetAcabilirMi(ogrenci, "ULUSAL")).toBe(true);
  });

  it("rolsüz öğretmen faaliyet açamaz", () => {
    expect(faaliyetAcabilirMi(rolsuzOgretmenYap(), "OKUL")).toBe(false);
  });
});

describe("ulusal faaliyet onay akışı", () => {
  it("il koordinatörünün açtığı ulusal faaliyet onay bekler", () => {
    expect(faaliyetOnayGerekiyorMu(koordinatorYap(), "ULUSAL")).toBe(true);
  });

  it("il koordinatörünün okul ve il faaliyetleri onaysız yayına girer", () => {
    const koordinator = koordinatorYap();
    expect(faaliyetOnayGerekiyorMu(koordinator, "IL")).toBe(false);
    expect(faaliyetOnayGerekiyorMu(koordinator, "OKUL")).toBe(false);
  });

  it("proje yöneticisinin faaliyeti onay gerektirmez", () => {
    expect(faaliyetOnayGerekiyorMu(projeYoneticisiYap(), "ULUSAL")).toBe(false);
  });

  it("faaliyet verilmeden sorulduğunda yalnızca proje yöneticisi geçer", () => {
    // İl koordinatörünün onay yetkisi HANGİ faaliyet olduğuna bağlıdır;
    // faaliyetsiz sorulduğunda cevap "hayır"dır.
    expect(faaliyetOnaylayabilirMi(projeYoneticisiYap())).toBe(true);
    expect(faaliyetOnaylayabilirMi(koordinatorYap())).toBe(false);
    expect(faaliyetOnaylayabilirMi(danismanYap())).toBe(false);
  });
});

describe("öğrenci faaliyeti onay akışı", () => {
  const ogrenciFaaliyeti = (ozellikler = {}) =>
    faaliyetYap({
      duzenleyenKullaniciId: 100,
      duzenleyenOgrenciMi: true,
      onayliMi: false,
      kapsamIlKodu: "34",
      ...ozellikler,
    });

  it("öğrencinin açtığı her faaliyet onay bekler", () => {
    // Kapsam sınırı yok, onay sınırı var: 18 yaş altı bir kullanıcının açtığı
    // çağrı okul içine bile sorumlusuz çıkmamalı.
    const ogrenci = ogrenciYap();
    expect(faaliyetOnayGerekiyorMu(ogrenci, "OKUL")).toBe(true);
    expect(faaliyetOnayGerekiyorMu(ogrenci, "IL")).toBe(true);
    expect(faaliyetOnayGerekiyorMu(ogrenci, "ULUSAL")).toBe(true);
  });

  it("öğrencinin ilinin koordinatörü onaylayabilir", () => {
    // Onay yalnızca merkeze bırakılsaydı bir okulun kendi içindeki öğrenci
    // etkinliği YEĞİTEK sırası gelene kadar bekler, öneri pratikte ölürdü.
    expect(
      ogrenciFaaliyetiniOnaylayabilirMi(
        koordinatorYap({ ilKodu: "34" }),
        ogrenciFaaliyeti(),
      ),
    ).toBe(true);
    expect(faaliyetOnaylayabilirMi(koordinatorYap(), ogrenciFaaliyeti())).toBe(
      true,
    );
  });

  it("başka ilin koordinatörü onaylayamaz", () => {
    expect(
      ogrenciFaaliyetiniOnaylayabilirMi(
        koordinatorYap({ ilKodu: "06" }),
        ogrenciFaaliyeti(),
      ),
    ).toBe(false);
  });

  it("öğretmenin açtığı faaliyette koordinatöre ek yetki doğmaz", () => {
    const ogretmenFaaliyeti = faaliyetYap({
      onayliMi: false,
      kapsamIlKodu: "34",
    });
    expect(
      ogrenciFaaliyetiniOnaylayabilirMi(koordinatorYap(), ogretmenFaaliyeti),
    ).toBe(false);
  });

  it("danışman öğretmen öğrenci faaliyetini onaylayamaz", () => {
    expect(faaliyetOnaylayabilirMi(danismanYap(), ogrenciFaaliyeti())).toBe(
      false,
    );
  });

  it("onay bekleyen öğrenci faaliyeti onaylayacak koordinatöre görünür", () => {
    // Onaylayacak kişi onaylayacağı şeyi görmek zorunda.
    const faaliyet = ogrenciFaaliyeti();
    expect(faaliyetGorunurMu(koordinatorYap({ ilKodu: "34" }), faaliyet)).toBe(
      true,
    );
    expect(faaliyetGorunurMu(koordinatorYap({ ilKodu: "06" }), faaliyet)).toBe(
      false,
    );
  });

  it("onay bekleyen öğrenci faaliyeti diğer öğrencilere görünmez", () => {
    expect(
      faaliyetGorunurMu(ogrenciYap({ id: 101 }), ogrenciFaaliyeti()),
    ).toBe(false);
  });
});

describe("faaliyet görünürlüğü", () => {
  it("onay bekleyen faaliyet öğrenciye görünmez", () => {
    const faaliyet = faaliyetYap({
      kapsam: "ULUSAL",
      kurumKodu: null,
      onayliMi: false,
    });
    expect(faaliyetGorunurMu(ogrenciYap(), faaliyet)).toBe(false);
  });

  it("onay bekleyen faaliyet düzenleyene ve proje yöneticisine görünür", () => {
    const faaliyet = faaliyetYap({
      kapsam: "ULUSAL",
      kurumKodu: null,
      duzenleyenKullaniciId: 300,
      onayliMi: false,
    });
    expect(faaliyetGorunurMu(koordinatorYap({ id: 300 }), faaliyet)).toBe(true);
    expect(faaliyetGorunurMu(projeYoneticisiYap(), faaliyet)).toBe(true);
  });

  it("okul içi faaliyet başka okulun öğrencisine görünmez", () => {
    const faaliyet = faaliyetYap({ kapsam: "OKUL", kurumKodu: 750001 });
    expect(faaliyetGorunurMu(ogrenciYap({ kurumKodu: 750001 }), faaliyet)).toBe(
      true,
    );
    expect(faaliyetGorunurMu(ogrenciYap({ kurumKodu: 750002 }), faaliyet)).toBe(
      false,
    );
  });

  it("il içi faaliyet başka ilin öğrencisine görünmez", () => {
    const faaliyet = faaliyetYap({
      kapsam: "IL",
      kurumKodu: null,
      ilKodu: "34",
    });
    expect(faaliyetGorunurMu(ogrenciYap({ ilKodu: "34" }), faaliyet)).toBe(true);
    expect(faaliyetGorunurMu(ogrenciYap({ ilKodu: "06" }), faaliyet)).toBe(
      false,
    );
  });

  it("ulusal faaliyet ülke genelindeki tüm öğrencilere görünür", () => {
    const faaliyet = faaliyetYap({ kapsam: "ULUSAL", kurumKodu: null });
    expect(
      faaliyetGorunurMu(ogrenciYap({ ilKodu: "65", kurumKodu: 750004 }), faaliyet),
    ).toBe(true);
  });
});

describe("dosya/görsel ekleme", () => {
  it("yalnızca faaliyeti açan kullanıcı ek yükler", () => {
    const faaliyet = faaliyetYap({ duzenleyenKullaniciId: 200 });
    expect(ekYukleyebilirMi(danismanYap({ id: 200 }), faaliyet)).toBe(true);
  });

  it("aynı rolden başka bir danışman başkasının faaliyetine ek yükleyemez", () => {
    const faaliyet = faaliyetYap({ duzenleyenKullaniciId: 200 });
    expect(ekYukleyebilirMi(danismanYap({ id: 201 }), faaliyet)).toBe(false);
  });

  it("öğrenci ek yükleyemez", () => {
    const faaliyet = faaliyetYap({ duzenleyenKullaniciId: 200 });
    expect(ekYukleyebilirMi(ogrenciYap(), faaliyet)).toBe(false);
  });
});

describe("yorumlar", () => {
  it("faaliyeti gören öğrenci yorum yazabilir, görmeyen yazamaz", () => {
    const faaliyet = faaliyetYap({ kapsam: "OKUL", kurumKodu: 750001 });
    expect(yorumYazabilirMi(ogrenciYap({ kurumKodu: 750001 }), faaliyet)).toBe(
      true,
    );
    expect(yorumYazabilirMi(ogrenciYap({ kurumKodu: 750002 }), faaliyet)).toBe(
      false,
    );
  });

  it("öğrenci yalnızca kendi yorumunu silebilir", () => {
    const ogrenci = ogrenciYap({ id: 100 });
    const faaliyet = faaliyetYap({ duzenleyenKullaniciId: 200 });
    expect(
      yorumSilebilirMi(ogrenci, { yazanKullaniciId: 100 }, faaliyet),
    ).toBe(true);
    expect(
      yorumSilebilirMi(ogrenci, { yazanKullaniciId: 101 }, faaliyet),
    ).toBe(false);
  });

  it("faaliyeti açan kullanıcı kendi faaliyetindeki her yorumu silebilir", () => {
    const danisman = danismanYap({ id: 200 });
    const kendiFaaliyeti = faaliyetYap({ duzenleyenKullaniciId: 200 });
    const baskasininFaaliyeti = faaliyetYap({ duzenleyenKullaniciId: 201 });

    expect(
      yorumSilebilirMi(danisman, { yazanKullaniciId: 100 }, kendiFaaliyeti),
    ).toBe(true);
    expect(
      yorumSilebilirMi(danisman, { yazanKullaniciId: 100 }, baskasininFaaliyeti),
    ).toBe(false);
  });

  it("proje yöneticisi her yorumu her yerde silebilir", () => {
    expect(
      yorumSilebilirMi(
        projeYoneticisiYap(),
        { yazanKullaniciId: 100 },
        faaliyetYap({ duzenleyenKullaniciId: 999 }),
      ),
    ).toBe(true);
  });
});

describe("başvuru", () => {
  /*
   * Analiz dokümanı 4.2: katılımcı "öğretmen/öğrenci" olabilir. Öğretmenin
   * katılımcı olması istisna değil, kuralın kendisidir; dışarıda kalan tek rol
   * faaliyetleri düzenleyip onaylayan merkezdir.
   */
  it("öğrenci ve öğretmenler katılımcı olarak başvurabilir", () => {
    expect(basvuruYapabilirMi(ogrenciYap())).toBe(true);
    expect(basvuruYapabilirMi(danismanYap())).toBe(true);
    expect(basvuruYapabilirMi(koordinatorYap())).toBe(true);
    expect(basvuruYapabilirMi(rolsuzOgretmenYap())).toBe(true);
  });

  it("proje yöneticisi kendi düzenlediği etkinliğe katılımcı olamaz", () => {
    expect(basvuruYapabilirMi(projeYoneticisiYap())).toBe(false);
  });

  it("öğrenci adına başvuruyu yalnızca görevli öğretmenler yapabilir", () => {
    expect(baskasiAdinaBasvurabilirMi(danismanYap())).toBe(true);
    expect(baskasiAdinaBasvurabilirMi(koordinatorYap())).toBe(true);
    expect(baskasiAdinaBasvurabilirMi(projeYoneticisiYap())).toBe(true);
    // Öğrenci ve görev almamış öğretmen başkası adına başvuramaz.
    expect(baskasiAdinaBasvurabilirMi(ogrenciYap())).toBe(false);
    expect(baskasiAdinaBasvurabilirMi(rolsuzOgretmenYap())).toBe(false);
  });

  it("başvuruyu yalnızca faaliyeti açan kullanıcı değerlendirir", () => {
    const faaliyet = faaliyetYap({ duzenleyenKullaniciId: 300 });
    expect(
      basvuruDegerlendirebilirMi(koordinatorYap({ id: 300 }), faaliyet),
    ).toBe(true);
    expect(
      basvuruDegerlendirebilirMi(koordinatorYap({ id: 301 }), faaliyet),
    ).toBe(false);
    expect(basvuruDegerlendirebilirMi(projeYoneticisiYap(), faaliyet)).toBe(
      true,
    );
  });
});

/**
 * references/domain-rules.md Bölüm 11: "Faaliyeti açan kullanıcı görevden
 * ayrıldı → değerlendirme yetkisi il koordinatörüne / proje yöneticisine
 * düşer; yorum silme yetkisi de aynı şekilde devrolur."
 */
describe("düzenleyen görevden ayrıldığında yetki devri", () => {
  const ayrilaninFaaliyeti = faaliyetYap({
    kapsam: "OKUL",
    kurumKodu: 750001,
    ilKodu: null,
    kapsamIlKodu: "34",
    duzenleyenKullaniciId: 200,
    duzenleyenGorevdeMi: false,
  });

  it("faaliyetin ilindeki koordinatör değerlendirmeyi devralır", () => {
    expect(yetkiDevrolduMu(koordinatorYap({ ilKodu: "34" }), ayrilaninFaaliyeti)).toBe(true);
    expect(
      basvuruDegerlendirebilirMi(
        koordinatorYap({ ilKodu: "34" }),
        ayrilaninFaaliyeti,
      ),
    ).toBe(true);
  });

  it("başka ilin koordinatörü devralmaz", () => {
    expect(
      basvuruDegerlendirebilirMi(
        koordinatorYap({ ilKodu: "06" }),
        ayrilaninFaaliyeti,
      ),
    ).toBe(false);
  });

  it("düzenleyen görevdeyse koordinatör karışamaz", () => {
    // Devir yalnızca ayrılma durumunda olur; görevdeki öğretmenin faaliyetine
    // kendi ilinin koordinatörü müdahale edemez.
    const gorevdeki = faaliyetYap({
      kapsamIlKodu: "34",
      duzenleyenKullaniciId: 200,
      duzenleyenGorevdeMi: true,
    });
    expect(basvuruDegerlendirebilirMi(koordinatorYap({ ilKodu: "34" }), gorevdeki)).toBe(
      false,
    );
    expect(yetkiDevrolduMu(koordinatorYap({ ilKodu: "34" }), gorevdeki)).toBe(
      false,
    );
  });

  it("bilgi verilmediyse devir olmaz (dar tarafta kalınır)", () => {
    const belirsiz = faaliyetYap({ duzenleyenKullaniciId: 200 });
    expect(yetkiDevrolduMu(koordinatorYap({ ilKodu: "34" }), belirsiz)).toBe(
      false,
    );
  });

  it("moderasyon yetkisi de devrolur", () => {
    expect(
      yorumSilebilirMi(
        koordinatorYap({ ilKodu: "34" }),
        { yazanKullaniciId: 999 },
        ayrilaninFaaliyeti,
      ),
    ).toBe(true);
    expect(
      yorumSilebilirMi(
        koordinatorYap({ ilKodu: "06" }),
        { yazanKullaniciId: 999 },
        ayrilaninFaaliyeti,
      ),
    ).toBe(false);
  });

  it("öğrenci devirden yararlanamaz", () => {
    expect(yetkiDevrolduMu(ogrenciYap(), ayrilaninFaaliyeti)).toBe(false);
    expect(
      basvuruDegerlendirebilirMi(ogrenciYap(), ayrilaninFaaliyeti),
    ).toBe(false);
  });

  /*
   * İptal devrolmayan tek yetkidir: devralan koordinatör faaliyeti yürütür ama
   * kapatamaz — başvurmuş tüm öğrencileri etkileyen geri alınamaz bir karar.
   */
  it("devralan koordinatör faaliyeti iptal edemez", () => {
    const devralan = koordinatorYap({ ilKodu: "34" });
    expect(ekYukleyebilirMi(devralan, ayrilaninFaaliyeti)).toBe(true);
    expect(faaliyetIptalEdebilirMi(devralan, ayrilaninFaaliyeti)).toBe(false);
  });
});

describe("faaliyet iptali", () => {
  const faaliyet = faaliyetYap({ duzenleyenKullaniciId: 200 });

  it("faaliyeti açan kullanıcı iptal edebilir", () => {
    expect(faaliyetIptalEdebilirMi(danismanYap({ id: 200 }), faaliyet)).toBe(
      true,
    );
  });

  it("proje yöneticisi her faaliyeti iptal edebilir", () => {
    expect(faaliyetIptalEdebilirMi(projeYoneticisiYap(), faaliyet)).toBe(true);
  });

  it("aynı rolden başkası ve öğrenci iptal edemez", () => {
    expect(faaliyetIptalEdebilirMi(danismanYap({ id: 201 }), faaliyet)).toBe(
      false,
    );
    expect(faaliyetIptalEdebilirMi(ogrenciYap(), faaliyet)).toBe(false);
  });
});

describe("rol ve görev atama", () => {
  it("il koordinatörünü yalnızca proje yöneticisi atar", () => {
    expect(ilKoordinatorAtayabilirMi(projeYoneticisiYap())).toBe(true);
    expect(ilKoordinatorAtayabilirMi(koordinatorYap())).toBe(false);
    expect(ilKoordinatorAtayabilirMi(danismanYap())).toBe(false);
  });

  it("okul temsilcisini danışman yalnızca kendi okulunda atar", () => {
    const danisman = danismanYap({ kurumKodu: 750001 });
    expect(okulTemsilcisiAtayabilirMi(danisman, 750001)).toBe(true);
    expect(okulTemsilcisiAtayabilirMi(danisman, 750002)).toBe(false);
    expect(okulTemsilcisiAtayabilirMi(koordinatorYap(), 750001)).toBe(false);
  });

  it("il temsilcisini koordinatör yalnızca kendi ilinde atar", () => {
    const koordinator = koordinatorYap({ ilKodu: "34" });
    expect(ilTemsilcisiAtayabilirMi(koordinator, "34")).toBe(true);
    expect(ilTemsilcisiAtayabilirMi(koordinator, "06")).toBe(false);
    expect(ilTemsilcisiAtayabilirMi(danismanYap(), "34")).toBe(false);
  });

  it("ilçe temsilcisini ilçenin bağlı olduğu ilin koordinatörü atar", () => {
    /*
     * Fonksiyon ilçe kodunu değil İL kodunu alır: sistemde ilçe düzeyinde
     * görevli yoktur (RolKodu'nda ILCE_KOORDINATOR diye bir değer yok), ilçe
     * ilin içindeki bir basamaktır. Danışman öğretmen kendi okulunun ilçesinde
     * bile atama yapamaz — temsilcilik okul sınırını aşıyor.
     */
    const koordinator = koordinatorYap({ ilKodu: "34" });
    expect(ilceTemsilcisiAtayabilirMi(koordinator, "34")).toBe(true);
    expect(ilceTemsilcisiAtayabilirMi(koordinator, "06")).toBe(false);
    expect(ilceTemsilcisiAtayabilirMi(danismanYap(), "34")).toBe(false);
    expect(ilceTemsilcisiAtayabilirMi(projeYoneticisiYap(), "34")).toBe(true);
  });

  it("çalışma grubunu yalnızca proje yöneticisi tanımlar", () => {
    expect(calismaGrubuTanimlayabilirMi(projeYoneticisiYap())).toBe(true);
    expect(calismaGrubuTanimlayabilirMi(koordinatorYap())).toBe(false);
  });

  it("öğrenciyi gruba yazmayı grup tanımlamaktan ayırır", () => {
    /*
     * İki ayrı yetki: grubu TANIMLAMAK listeyi yönetmektir (yalnızca proje
     * yöneticisi), öğrenciyi gruba EKLEMEK mevcut bir gruba kayıt açmaktır
     * (danışman ve koordinatör de yapar). Aynı fonksiyonla korunmaları,
     * danışmana grup listesini açmak ya da öğrenci eklemeyi merkeze kilitlemek
     * demek olurdu.
     */
    expect(ogrenciCalismaGrubuYonetebilirMi(projeYoneticisiYap())).toBe(true);
    expect(ogrenciCalismaGrubuYonetebilirMi(koordinatorYap())).toBe(true);
    expect(ogrenciCalismaGrubuYonetebilirMi(danismanYap())).toBe(true);
    // Öğrenci kendi seçimini /panel/calisma-gruplari ekranından yapar; bu yetki
    // başka bir öğrenciyi gruba yazmayı kapsadığı için ona verilmez.
    expect(ogrenciCalismaGrubuYonetebilirMi(ogrenciYap())).toBe(false);
    // Danışmanlık işaretlemeyen öğretmen hiçbir öğrenciye dokunamaz.
    expect(ogrenciCalismaGrubuYonetebilirMi(rolsuzOgretmenYap())).toBe(false);
  });

  it("rol/atama envanterini yalnızca proje yöneticisi görür", () => {
    // Bu, "öğrenci/öğretmen verisi görüntüleme" satırından AYRI bir yetkidir:
    // il koordinatörü kendi ilindeki öğrencileri görür ama tüm illerin
    // koordinatör/danışman boşluklarını göremez.
    expect(rolEnvanteriGorebilirMi(projeYoneticisiYap())).toBe(true);
    expect(rolEnvanteriGorebilirMi(koordinatorYap())).toBe(false);
    expect(rolEnvanteriGorebilirMi(danismanYap())).toBe(false);
    expect(rolEnvanteriGorebilirMi(ogrenciYap())).toBe(false);
  });
});

describe("öğrenci görev rolleri ek yetki vermez", () => {
  it("İl Temsilcisi olan öğrenci diğer öğrencilerle aynı yetkiye sahiptir", () => {
    // Görev rolü OturumKullanicisi.roller'a hiç girmez; yetki kararı yalnızca
    // OGRENCI rolüne bakar.
    const ilTemsilcisiOgrenci = ogrenciYap({ id: 101 });
    const sıradanOgrenci = ogrenciYap({ id: 102 });

    expect(basvuruYapabilirMi(ilTemsilcisiOgrenci)).toBe(
      basvuruYapabilirMi(sıradanOgrenci),
    );
    // Temsilci de sıradan öğrenci de faaliyet önerebilir ve ikisinin önerisi de
    // aynı biçimde onay bekler; temsilcilik onay atlatmaz.
    expect(faaliyetAcabilirMi(ilTemsilcisiOgrenci, "OKUL")).toBe(
      faaliyetAcabilirMi(sıradanOgrenci, "OKUL"),
    );
    expect(faaliyetOnayGerekiyorMu(ilTemsilcisiOgrenci, "OKUL")).toBe(true);
  });
});

/**
 * Öğretmen ve paydaş envanterleri — analiz dokümanı Bölüm 2 ve 3.
 *
 * İkisinde de GÖRME ile YÖNETME ayrı kapılardır; testler bu ayrımın
 * kapanmadığını doğrular.
 */
describe("öğretmen envanteri", () => {
  it("öğrenci ve görev almamış öğretmen envanteri göremez", () => {
    expect(ogretmenEnvanteriGorebilirMi(ogrenciYap())).toBe(false);
    expect(ogretmenEnvanteriGorebilirMi(rolsuzOgretmenYap())).toBe(false);
  });

  it("danışman, koordinatör ve merkez envanteri görür", () => {
    expect(ogretmenEnvanteriGorebilirMi(danismanYap())).toBe(true);
    expect(ogretmenEnvanteriGorebilirMi(koordinatorYap())).toBe(true);
    expect(ogretmenEnvanteriGorebilirMi(projeYoneticisiYap())).toBe(true);
  });
});

describe("paydaş envanteri", () => {
  it("öğrenci paydaş listesini göremez", () => {
    expect(paydasGorebilirMi(ogrenciYap())).toBe(false);
  });

  it("faaliyet düzenleyen roller listeyi görür", () => {
    expect(paydasGorebilirMi(danismanYap())).toBe(true);
    expect(paydasGorebilirMi(koordinatorYap())).toBe(true);
    expect(paydasGorebilirMi(projeYoneticisiYap())).toBe(true);
  });

  it("kayıt açma yetkisi görmekten dardır: danışman öğretmen yönetemez", () => {
    expect(paydasYonetebilirMi(danismanYap(), "34")).toBe(false);
    expect(paydasYonetebilirMi(ogrenciYap(), "34")).toBe(false);
  });

  it("kayıt EKLEMEDE il sorulmaz: koordinatör başka ile de ekleyebilir", () => {
    // İzmir koordinatörünün Ankara'daki bir üniversiteyle iş birliği kurması
    // olağandır; kaydı kendi iline yazmaya zorlamak envanteri yanlışlardı.
    expect(paydasEkleyebilirMi(koordinatorYap({ ilKodu: "35" }))).toBe(true);
    expect(paydasEkleyebilirMi(projeYoneticisiYap())).toBe(true);
  });

  it("danışman öğretmen ve öğrenci kayıt ekleyemez", () => {
    expect(paydasEkleyebilirMi(danismanYap())).toBe(false);
    expect(paydasEkleyebilirMi(ogrenciYap())).toBe(false);
  });

  it("düzenleme eklemeden dardır: koordinatör kendi ilini düzenler", () => {
    const koordinator = koordinatorYap({ ilKodu: "34" });
    expect(paydasYonetebilirMi(koordinator, "34")).toBe(true);
    expect(paydasYonetebilirMi(koordinator, "06")).toBe(false);
  });

  it("başka ile yazdığı KENDİ kaydını düzenleyebilir", () => {
    // Yoksa yanlış girdiği bir kurumu düzeltemez hâle gelirdi.
    const koordinator = koordinatorYap({ id: 77, ilKodu: "34" });
    expect(paydasYonetebilirMi(koordinator, "06", 77)).toBe(true);
  });

  it("başka ilin koordinatörünün eklediği kayda dokunamaz", () => {
    const koordinator = koordinatorYap({ id: 77, ilKodu: "34" });
    expect(paydasYonetebilirMi(koordinator, "06", 88)).toBe(false);
  });

  it("proje yöneticisi her ilin paydaşını yönetir", () => {
    expect(paydasYonetebilirMi(projeYoneticisiYap(), "06")).toBe(true);
  });

  /*
   * Faaliyete paydaş BAĞLAMAK, paydaş kaydını yönetmekten farklıdır: kendi
   * faaliyetini açan danışman öğretmen bağlantıyı kurabilmeli.
   */
  it("faaliyete paydaş bağlamak faaliyetin sahipliğine bakar", () => {
    const faaliyet = faaliyetYap({ duzenleyenKullaniciId: 200 });
    expect(faaliyetPaydasiYonetebilirMi(danismanYap({ id: 200 }), faaliyet)).toBe(
      true,
    );
    expect(faaliyetPaydasiYonetebilirMi(danismanYap({ id: 201 }), faaliyet)).toBe(
      false,
    );
    expect(faaliyetPaydasiYonetebilirMi(projeYoneticisiYap(), faaliyet)).toBe(
      true,
    );
  });
});
