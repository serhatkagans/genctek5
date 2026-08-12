import {
  GONDERI_MAKS,
  HAKKINDA_MAKS,
  YORUM_MAKS,
  gizleyebilirMi,
  gizliIcerikGorunurMu,
  gonderiMetniniCoz,
  hakkindaMetniniCoz,
  yorumMetniniCoz,
} from "@/lib/akis/kurallar";

describe("gönderi metni", () => {
  it("boş gönderiyi reddeder", () => {
    expect(gonderiMetniniCoz("   ")).toEqual({
      olurMu: false,
      neden: "Gönderi boş olamaz.",
    });
  });

  it("baştaki ve sondaki boşluğu kırpar", () => {
    expect(gonderiMetniniCoz("  merhaba  ")).toEqual({
      olurMu: true,
      icerik: "merhaba",
    });
  });

  it("sınırdaki metni kabul eder", () => {
    const karar = gonderiMetniniCoz("a".repeat(GONDERI_MAKS));
    expect(karar.olurMu).toBe(true);
  });

  it("sınırı aşan metni reddeder", () => {
    const karar = gonderiMetniniCoz("a".repeat(GONDERI_MAKS + 1));
    expect(karar).toEqual({
      olurMu: false,
      neden: `Gönderi en fazla ${GONDERI_MAKS} karakter olabilir.`,
    });
  });

  it("kırpma sınırdan ÖNCE uygulanır: boşlukla dolan metin sınırı aşmaz", () => {
    const karar = gonderiMetniniCoz(`  ${"a".repeat(GONDERI_MAKS)}  `);
    expect(karar.olurMu).toBe(true);
  });
});

describe("yorum metni", () => {
  it("boş yorumu reddeder", () => {
    expect(yorumMetniniCoz("")).toEqual({
      olurMu: false,
      neden: "Yorum boş olamaz.",
    });
  });

  it("gönderiden DAHA KISA bir sınırı vardır", () => {
    expect(YORUM_MAKS).toBeLessThan(GONDERI_MAKS);
    const karar = yorumMetniniCoz("a".repeat(YORUM_MAKS + 1));
    expect(karar).toEqual({
      olurMu: false,
      neden: `Yorum en fazla ${YORUM_MAKS} karakter olabilir.`,
    });
  });
});

describe("hakkımda metni", () => {
  it("BOŞ BIRAKILABİLİR ve null döner: kişi kendini tanıtmak zorunda değil", () => {
    expect(hakkindaMetniniCoz("   ")).toEqual({ olurMu: true, icerik: null });
  });

  it("dolu metni kırpıp döndürür", () => {
    expect(hakkindaMetniniCoz("  Robotikle ilgileniyorum. ")).toEqual({
      olurMu: true,
      icerik: "Robotikle ilgileniyorum.",
    });
  });

  it("sınırı aşan metni reddeder", () => {
    const karar = hakkindaMetniniCoz("a".repeat(HAKKINDA_MAKS + 1));
    expect(karar).toEqual({
      olurMu: false,
      neden: `Hakkımda metni en fazla ${HAKKINDA_MAKS} karakter olabilir.`,
    });
  });
});

describe("gizlenmiş içeriğin görünürlüğü", () => {
  it("gizlenmemiş içerik herkese görünür", () => {
    expect(
      gizliIcerikGorunurMu({ gizlendiMi: false, gozetimYetkisiVarMi: false }),
    ).toBe(true);
  });

  it("gizlenmiş içerik sıradan kullanıcıya KAPALI", () => {
    expect(
      gizliIcerikGorunurMu({ gizlendiMi: true, gozetimYetkisiVarMi: false }),
    ).toBe(false);
  });

  it("gizlenmiş içerik gözetim yetkisi olana AÇIK: şikâyet incelemesinde en çok gereken kayıt budur", () => {
    expect(
      gizliIcerikGorunurMu({ gizlendiMi: true, gozetimYetkisiVarMi: true }),
    ).toBe(true);
  });
});

describe("kim gizleyebilir", () => {
  const temel = {
    kullaniciId: 1,
    yazanKullaniciId: 2,
    gozetimYetkisiVarMi: false,
    zatenGizliMi: false,
  };

  it("yabancı gizleyemez", () => {
    expect(gizleyebilirMi(temel)).toEqual({
      olurMu: false,
      neden:
        "Yalnızca içeriğin yazarı ya da gözetim yetkisi olanlar gizleyebilir.",
    });
  });

  it("yazarın kendisi gizleyebilir", () => {
    expect(gizleyebilirMi({ ...temel, kullaniciId: 2 })).toEqual({
      olurMu: true,
    });
  });

  it("gözetim yetkisi olan başkasının içeriğini gizleyebilir", () => {
    expect(gizleyebilirMi({ ...temel, gozetimYetkisiVarMi: true })).toEqual({
      olurMu: true,
    });
  });

  it("zaten gizli içerik ikinci kez gizlenemez: gizleyen kaydı ezilmemeli", () => {
    expect(
      gizleyebilirMi({
        ...temel,
        kullaniciId: 2,
        gozetimYetkisiVarMi: true,
        zatenGizliMi: true,
      }),
    ).toEqual({ olurMu: false, neden: "Bu içerik zaten gizlenmiş." });
  });
});
