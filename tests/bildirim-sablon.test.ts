import { BILDIRIM_KODLARI, sablonuDoldur } from "@/lib/bildirim/sablon";

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
