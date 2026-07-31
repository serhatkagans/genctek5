import {
  BILDIRIM_KODLARI,
  BILDIRIM_SABLON_TANIMLARI,
  sablonMetniGecerliMi,
  sablonTanimiGetir,
  sablonuDoldur,
  yerTutuculariCikar,
} from "@/lib/bildirim/sablon";

describe("bildirim şablonu", () => {
  it("yer tutucuları verilen değerlerle doldurur", () => {
    const sonuc = sablonuDoldur(
      "{{ogrenciAdSoyad}}, {{faaliyetAdi}} sonucu: {{sonuc}}",
      {
        ogrenciAdSoyad: "Elif Yılmaz",
        faaliyetAdi: "Siber Güvenlik Kampı",
        sonuc: "SECILDI",
      },
    );
    expect(sonuc).toBe("Elif Yılmaz, Siber Güvenlik Kampı sonucu: SECILDI");
  });

  it("değeri verilmeyen yer tutucuyu olduğu gibi bırakır", () => {
    expect(sablonuDoldur("Merhaba {{ad}}", {})).toBe("Merhaba {{ad}}");
  });

  it("domain-rules Bölüm 9'daki bildirim olaylarının tamamı tanımlıdır", () => {
    expect(Object.keys(BILDIRIM_KODLARI)).toEqual(
      expect.arrayContaining([
        "BASVURU_SONUCU",
        "DANISMAN_DEGISTI",
        "DANISMAN_YENIDEN_SECIM",
        "KOORDINATOR_DEVREDILEBILIR_OGRENCI",
        "ONAY_BEKLEYEN_ULUSAL_FAALIYET",
        "DANISMANA_KOPYA_ULUSAL_BASVURU",
      ]),
    );
  });
});

/**
 * Şablon yönetim ekranının dayandığı tanımlar ve doğrulama — analiz dokümanı
 * Bölüm 6.1 ("Bildirim şablonları yönetilebilir olmalı").
 */
describe("şablon tanımları", () => {
  it("her bildirim kodunun bir tanımı vardır", () => {
    for (const kod of Object.values(BILDIRIM_KODLARI)) {
      const tanim = sablonTanimiGetir(kod);
      expect(tanim).toBeDefined();
      expect(tanim?.baslik).toBeTruthy();
      expect(tanim?.aciklama).toBeTruthy();
    }
  });

  it("tanım listesinde koda karşılık gelmeyen satır yoktur", () => {
    const kodlar = Object.values(BILDIRIM_KODLARI) as string[];
    for (const tanim of BILDIRIM_SABLON_TANIMLARI) {
      expect(kodlar).toContain(tanim.kod);
    }
  });

  it("tanımsız kod aranırsa undefined döner", () => {
    expect(sablonTanimiGetir("YOK_BOYLE_BIR_KOD")).toBeUndefined();
  });
});

describe("şablon metni doğrulama", () => {
  it("boş metin kabul edilmez", () => {
    expect(sablonMetniGecerliMi("   ", ["ad"]).olurMu).toBe(false);
  });

  /*
   * Tanımsız yer tutucu hatadır: metne yazılan {{ogrenci}} hiçbir zaman
   * dolmayacağı için bildirim kullanıcıya ham süslü parantezle ulaşırdı.
   */
  it("tanımsız değişken reddedilir ve kullanılabilirler söylenir", () => {
    const karar = sablonMetniGecerliMi("Merhaba {{ogrenci}}", [
      "ogrenciAdSoyad",
    ]);
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toContain("{{ogrenci}}");
    expect(karar.neden).toContain("{{ogrenciAdSoyad}}");
  });

  it("tanımlı değişkenin kullanılmaması hata değildir", () => {
    // Metni kısaltmak metni yazanın hakkı.
    expect(sablonMetniGecerliMi("Sabit metin", ["ad", "soyad"]).olurMu).toBe(
      true,
    );
  });

  it("değişkeni olmayan şablonda yer tutucu yazılamaz", () => {
    expect(sablonMetniGecerliMi("Merhaba {{ad}}", []).olurMu).toBe(false);
  });

  it("aynı yer tutucu birden çok kez kullanılabilir", () => {
    expect(
      sablonMetniGecerliMi("{{ad}} için {{ad}} tekrar", ["ad"]).olurMu,
    ).toBe(true);
  });

  it("yer tutucular tekrarsız çıkarılır", () => {
    expect(yerTutuculariCikar("{{a}} {{b}} {{a}}")).toEqual(["a", "b"]);
  });
});
