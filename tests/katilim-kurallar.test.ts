import {
  BELGE_TEMELLI_KATILIM_BASLANGICI,
  type KatilimAdayi,
  katilimlariSuz,
  katilimSayilirMi,
} from "@/lib/kazanim/katilim-kurallar";

/**
 * "Katıldığı GençTek etkinlikleri" listesine neyin gireceği (7 Ağustos 2026).
 *
 * İSTEK: "Düzenlenen GençTek Etkinliği sonunda ismine belge oluşturulan
 * öğrencilerin profiline katıldığı etkinlik düşecek."
 *
 * Kural burada sınanıyor çünkü sonucu görünürden fazlası: bu liste rozetleri
 * ve "Seferlerim" seviyelerini besliyor. Yanlış süzme, öğrencinin kazandığı
 * nişanı geri alır.
 */

const GECIS = BELGE_TEMELLI_KATILIM_BASLANGICI;
const ONCE = new Date(GECIS.getTime() - 24 * 60 * 60 * 1000);
const SONRA = new Date(GECIS.getTime() + 24 * 60 * 60 * 1000);

function aday(ozellikler: Partial<KatilimAdayi> = {}): KatilimAdayi {
  return {
    faaliyetId: 1,
    ad: "Robotik Atölyesi",
    tarih: SONRA,
    kapsam: "OKUL",
    etkinlikKategorisi: "TEMEL_ETKINLIK",
    belgeVarMi: false,
    secildiMi: false,
    ...ozellikler,
  };
}

describe("katılım sayılır mı", () => {
  it("belge üretilmişse sayar", () => {
    expect(katilimSayilirMi(aday({ belgeVarMi: true }))).toBe(true);
  });

  it("geçiş tarihinden SONRAKİ etkinlikte yalnız seçilmiş olmak yetmez", () => {
    /*
     * Kuralın özü bu: katılımcı listesine alınmak "geldi" demek değil.
     * Belge, etkinliği yürüten öğretmenin "bu kişi gerçekten katıldı"
     * beyanıdır.
     */
    expect(katilimSayilirMi(aday({ secildiMi: true, tarih: SONRA }))).toBe(
      false,
    );
  });

  it("geçiş tarihinden ÖNCEKİ etkinlikte seçilmiş olmak yeter", () => {
    /*
     * Geriye dönük belge kaydı YOK ve üretilemez. Kural geriye işletilseydi
     * bugün profilinde katılım görünen herkesin listesi boşalır, rozetleri
     * geri alınırdı.
     */
    expect(katilimSayilirMi(aday({ secildiMi: true, tarih: ONCE }))).toBe(true);
  });

  it("eski bir etkinlik için bugün üretilen belgeyi de sayar", () => {
    // Belge geçiş tarihine BAKMAZ; her zaman yeterlidir.
    expect(
      katilimSayilirMi(aday({ belgeVarMi: true, secildiMi: false, tarih: ONCE })),
    ).toBe(true);
  });

  it("ne belgesi ne seçimi olanı saymaz", () => {
    expect(katilimSayilirMi(aday({ tarih: ONCE }))).toBe(false);
  });
});

describe("katılımları süz ve sırala", () => {
  it("sayılmayanları listeden atar", () => {
    const sonuc = katilimlariSuz([
      aday({ faaliyetId: 1, belgeVarMi: true }),
      aday({ faaliyetId: 2, secildiMi: true, tarih: SONRA }),
    ]);
    expect(sonuc.map((k) => k.faaliyetId)).toEqual([1]);
  });

  it("en yeni etkinliği başa alır", () => {
    const eski = new Date("2026-01-10T00:00:00.000Z");
    const yeni = new Date("2026-06-10T00:00:00.000Z");
    const sonuc = katilimlariSuz([
      aday({ faaliyetId: 1, tarih: eski, belgeVarMi: true }),
      aday({ faaliyetId: 2, tarih: yeni, belgeVarMi: true }),
    ]);
    expect(sonuc.map((k) => k.faaliyetId)).toEqual([2, 1]);
  });

  it("aynı tarihli etkinliklerde sırayı kimlikle kırar", () => {
    /*
     * Belirli bir son kırıcı olmadan sıra sorgudan sorguya değişebilir ve
     * liste her sayfa yenilemesinde "oynuyor" görünürdü.
     */
    const tarih = new Date("2026-03-03T00:00:00.000Z");
    const sonuc = katilimlariSuz([
      aday({ faaliyetId: 5, tarih, belgeVarMi: true }),
      aday({ faaliyetId: 9, tarih, belgeVarMi: true }),
    ]);
    expect(sonuc.map((k) => k.faaliyetId)).toEqual([9, 5]);
  });

  it("hem belgesi hem seçimi olan etkinliği tek kez döndürür", () => {
    // Birleştirme çağıranda (getir.ts) yapılıyor; süzgeç de tekrar üretmemeli.
    const sonuc = katilimlariSuz([
      aday({ faaliyetId: 3, belgeVarMi: true, secildiMi: true }),
    ]);
    expect(sonuc).toHaveLength(1);
  });
});
