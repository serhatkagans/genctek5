import {
  AZAMI_BELGE_SAYISI,
  katilimciIdleriniCoz,
  topluAlicilariSec,
  type TopluBelgeAdayi,
} from "@/lib/belge/toplu";

/**
 * Toplu belge alıcı seçimi.
 *
 * Buradaki en önemli sınama kesişim: adres çubuğuna elle yazılan bir katılımcı
 * kimliği, o kişi bu faaliyetin katılımcısı değilse belge üretmemeli.
 */

const ADAYLAR: TopluBelgeAdayi[] = [
  { katilimciId: 41, adSoyad: "Elif Yılmaz" },
  { katilimciId: 57, adSoyad: "Ahmet Demir" },
  { katilimciId: 63, adSoyad: "Zeynep Kaya" },
];

describe("katilimciIdleriniCoz", () => {
  it("parametre yokken null döner (tümü kastedilmiştir)", () => {
    expect(katilimciIdleriniCoz(undefined)).toBeNull();
  });

  it("tek seçimde gelen dizeyi de dizi olarak çözer", () => {
    // Next.js tekrarlı parametreyi tek seçimde string, çoklu seçimde string[]
    // veriyor; ikisi de karşılanmazsa tek kişilik seçim çöker.
    expect(katilimciIdleriniCoz("41")).toEqual([41]);
    expect(katilimciIdleriniCoz(["41", "57"])).toEqual([41, 57]);
  });

  it("sayıya çevrilemeyen değerleri atar", () => {
    expect(katilimciIdleriniCoz(["41", "", "abc", "57"])).toEqual([41, 57]);
  });

  it("boş seçim ile hiç seçim yapılmamasını ayırır", () => {
    // Boş dizi "hiçbiri eşleşmedi" demek; null "tümü" demek. İkisi karışırsa
    // kullanıcı seçim yapmadan bastığında yanlışlıkla herkes basılır.
    expect(katilimciIdleriniCoz([])).toEqual([]);
    expect(katilimciIdleriniCoz(undefined)).toBeNull();
  });
});

describe("topluAlicilariSec", () => {
  it("kimlik verilmediğinde tüm katılımcıları seçer", () => {
    const sonuc = topluAlicilariSec(ADAYLAR, null);
    expect(sonuc.durum).toBe("hazir");
    if (sonuc.durum !== "hazir") return;
    expect(sonuc.alicilar).toHaveLength(3);
  });

  it("yalnızca istenen kimlikleri seçer", () => {
    const sonuc = topluAlicilariSec(ADAYLAR, [41, 63]);
    if (sonuc.durum !== "hazir") throw new Error(`beklenmeyen: ${sonuc.durum}`);
    expect(sonuc.alicilar.map((a) => a.katilimciId).sort()).toEqual([41, 63]);
  });

  it("faaliyetin katılımcısı olmayan kimliği ELER", () => {
    /*
     * Güvenlik sınırı: 999 başka bir faaliyetin katılımcısı olabilir. Kesişim
     * yapılmasaydı adres çubuğuna kimlik yazan biri, hiç ilgisi olmayan birinin
     * adına resmî belge bastırabilirdi.
     */
    const sonuc = topluAlicilariSec(ADAYLAR, [41, 999]);
    if (sonuc.durum !== "hazir") throw new Error(`beklenmeyen: ${sonuc.durum}`);
    expect(sonuc.alicilar).toHaveLength(1);
    expect(sonuc.alicilar[0].katilimciId).toBe(41);
  });

  it("istenen kimliklerin hiçbiri listede yoksa belge üretmez", () => {
    expect(topluAlicilariSec(ADAYLAR, [999]).durum).toBe("eslesmeYok");
  });

  it("faaliyette seçilmiş katılımcı yoksa ayrı bir durum döner", () => {
    // "Katılımcı yok" ile "seçilenler eşleşmedi" ayrı ekranlar gösterir:
    // birincisinde yapılacak şey katılımcı seçmek, ikincisinde bağlantıyı
    // düzeltmek.
    expect(topluAlicilariSec([], null).durum).toBe("katilimciYok");
    expect(topluAlicilariSec([], [41]).durum).toBe("katilimciYok");
  });

  it("azami belge sayısı aşıldığında üretmez ve sayıyı bildirir", () => {
    const kalabalik = Array.from(
      { length: AZAMI_BELGE_SAYISI + 1 },
      (_, sira) => ({ katilimciId: sira + 1, adSoyad: `Kişi ${sira + 1}` }),
    );

    const sonuc = topluAlicilariSec(kalabalik, null);
    if (sonuc.durum !== "sinirAsildi") {
      throw new Error(`beklenmeyen: ${sonuc.durum}`);
    }
    expect(sonuc.istenen).toBe(AZAMI_BELGE_SAYISI + 1);
    expect(sonuc.azami).toBe(AZAMI_BELGE_SAYISI);
  });

  it("tam sınırda üretmeye devam eder", () => {
    const tamSinir = Array.from({ length: AZAMI_BELGE_SAYISI }, (_, sira) => ({
      katilimciId: sira + 1,
      adSoyad: `Kişi ${sira + 1}`,
    }));
    expect(topluAlicilariSec(tamSinir, null).durum).toBe("hazir");
  });

  it("Türkçe alfabeye göre sıralar", () => {
    /*
     * Varsayılan sıralama Türkçe harfleri alfabenin sonuna atar: "Çetin"
     * "Zeynep"ten sonra, "Işık" da "İnci"den sonra gelirdi. Basılan deste
     * yoklama listesiyle eşleşmezdi.
     */
    const karisik: TopluBelgeAdayi[] = [
      { katilimciId: 1, adSoyad: "Zeynep Kaya" },
      { katilimciId: 2, adSoyad: "Çetin Ak" },
      { katilimciId: 3, adSoyad: "İnci Bal" },
      { katilimciId: 4, adSoyad: "Işık Can" },
      { katilimciId: 5, adSoyad: "Ahmet Demir" },
    ];

    const sonuc = topluAlicilariSec(karisik, null);
    if (sonuc.durum !== "hazir") throw new Error(`beklenmeyen: ${sonuc.durum}`);

    expect(sonuc.alicilar.map((a) => a.adSoyad)).toEqual([
      "Ahmet Demir",
      "Çetin Ak",
      "Işık Can",
      "İnci Bal",
      "Zeynep Kaya",
    ]);
  });

  it("girdi dizisini yerinde değiştirmez", () => {
    const kopya = [...ADAYLAR];
    topluAlicilariSec(ADAYLAR, null);
    expect(ADAYLAR).toEqual(kopya);
  });
});
