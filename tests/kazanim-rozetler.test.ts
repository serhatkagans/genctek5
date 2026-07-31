import {
  type KatilimKaydi,
  type KazanimGirdisi,
  katilimOzeti,
  OGRETMEN_ROZETLERI,
  type OgretmenKatkiGirdisi,
  ogretmenRozetDurumlari,
  ROZETLER,
  rozetDurumlari,
} from "../src/lib/kazanim/rozetler";

const katilim = (
  kapsam: KatilimKaydi["kapsam"],
  kategori: KatilimKaydi["etkinlikKategorisi"],
): KatilimKaydi => ({
  kapsam,
  etkinlikKategorisi: kategori,
  tarih: new Date("2026-05-01T10:00:00Z"),
});

const bosGirdi: KazanimGirdisi = {
  katilimlar: [],
  calismaGrubuSayisi: 0,
  gorevRolSayisi: 0,
};

const durum = (girdi: KazanimGirdisi, kod: string) =>
  rozetDurumlari(girdi).find((rozet) => rozet.kod === kod)!;

describe("rozetDurumlari", () => {
  it("hiç katılımı olmayan öğrenci hiçbir rozeti kazanmaz", () => {
    expect(rozetDurumlari(bosGirdi).every((rozet) => !rozet.kazanildiMi)).toBe(
      true,
    );
  });

  it("her rozet için bir durum döndürür", () => {
    expect(rozetDurumlari(bosGirdi)).toHaveLength(ROZETLER.length);
  });

  it("ilk katılım İlk Adım rozetini verir", () => {
    const girdi = {
      ...bosGirdi,
      katilimlar: [katilim("OKUL", "TEMEL_ETKINLIK")],
    };
    expect(durum(girdi, "ILK_ADIM").kazanildiMi).toBe(true);
    expect(durum(girdi, "DUZENLI_KATILIM").kazanildiMi).toBe(false);
  });

  it("üç katılımda Düzenli Katılım açılır", () => {
    const girdi = {
      ...bosGirdi,
      katilimlar: [
        katilim("OKUL", "TEMEL_ETKINLIK"),
        katilim("OKUL", "TEMEL_ETKINLIK"),
        katilim("OKUL", "TEMEL_ETKINLIK"),
      ],
    };
    expect(durum(girdi, "DUZENLI_KATILIM").kazanildiMi).toBe(true);
  });

  /*
   * Çok Yönlü, katılım SAYISINI değil ÇEŞİDİNİ ölçer: aynı kategoriden üç
   * faaliyet bu rozeti açmamalı.
   */
  it("aynı kategoriden üç katılım Çok Yönlü rozetini açmaz", () => {
    const girdi = {
      ...bosGirdi,
      katilimlar: [
        katilim("OKUL", "TEMEL_ETKINLIK"),
        katilim("IL", "TEMEL_ETKINLIK"),
        katilim("ULUSAL", "TEMEL_ETKINLIK"),
      ],
    };
    expect(durum(girdi, "COK_YONLU").kazanildiMi).toBe(false);
    expect(durum(girdi, "COK_YONLU").ilerleme).toBe(1);
  });

  it("üç farklı kategoride katılım Çok Yönlü rozetini açar", () => {
    const girdi = {
      ...bosGirdi,
      katilimlar: [
        katilim("OKUL", "TEMEL_ETKINLIK"),
        katilim("OKUL", "CALISMA_GRUBU_ETKINLIGI"),
        katilim("OKUL", "IL_ETKINLIGI"),
      ],
    };
    expect(durum(girdi, "COK_YONLU").kazanildiMi).toBe(true);
  });

  it("kapsam rozetleri yalnızca kendi kapsamlarını sayar", () => {
    const girdi = {
      ...bosGirdi,
      katilimlar: [katilim("IL", "IL_ETKINLIGI")],
    };
    expect(durum(girdi, "IL_SAHNESI").kazanildiMi).toBe(true);
    expect(durum(girdi, "TURKIYE_SAHNESI").kazanildiMi).toBe(false);
  });

  it("çalışma grubu ve görev rozetleri katılımdan bağımsız kazanılır", () => {
    const girdi = { katilimlar: [], calismaGrubuSayisi: 3, gorevRolSayisi: 1 };
    expect(durum(girdi, "ILGI_ALANI").kazanildiMi).toBe(true);
    expect(durum(girdi, "MERAKLI").kazanildiMi).toBe(true);
    expect(durum(girdi, "SORUMLULUK").kazanildiMi).toBe(true);
    expect(durum(girdi, "ILK_ADIM").kazanildiMi).toBe(false);
  });

  // "12/10" gibi bir gösterim öğrenciye hedefi aştığını değil, hedefi yanlış
  // hesapladığımızı düşündürür.
  it("hedefi aşan ilerleme hedefe kırpılır", () => {
    const girdi = { ...bosGirdi, calismaGrubuSayisi: 9 };
    expect(durum(girdi, "MERAKLI").ilerleme).toBe(3);
    expect(durum(girdi, "MERAKLI").kazanildiMi).toBe(true);
  });
});

/*
 * Öğretmen nişanları ayrı bir listedir: öğretmenin çalışma grubu seçimi ve
 * temsilcilik görevi yoktur, katkısı düzenlediği faaliyette ve danışmanlığında
 * görünür. Öğrenci listesi olduğu gibi kullanılsaydı bir kısmı hiçbir zaman
 * dolmayacak, asıl emeği ise hiç sayılmayacaktı.
 */
describe("ogretmenRozetDurumlari", () => {
  const bosOgretmen: OgretmenKatkiGirdisi = {
    katilimlar: [],
    duzenledigiFaaliyetSayisi: 0,
    aktifDanismanlikSayisi: 0,
    paydasliFaaliyetSayisi: 0,
  };

  const ogretmenDurumu = (girdi: OgretmenKatkiGirdisi, kod: string) =>
    ogretmenRozetDurumlari(girdi).find((rozet) => rozet.kod === kod)!;

  it("hiç katkısı olmayan öğretmen hiçbir nişan kazanmaz", () => {
    expect(
      ogretmenRozetDurumlari(bosOgretmen).every((rozet) => !rozet.kazanildiMi),
    ).toBe(true);
  });

  it("her nişan için bir durum döndürür", () => {
    expect(ogretmenRozetDurumlari(bosOgretmen)).toHaveLength(
      OGRETMEN_ROZETLERI.length,
    );
  });

  it("öğrenci nişanlarıyla kod paylaşmaz", () => {
    const ogrenciKodlari = new Set(ROZETLER.map((rozet) => rozet.kod));
    expect(
      OGRETMEN_ROZETLERI.some((rozet) => ogrenciKodlari.has(rozet.kod)),
    ).toBe(false);
  });

  it("ilk faaliyette İlk Faaliyet nişanı açılır, beşincide Sürekli Düzenleyici", () => {
    const tek = { ...bosOgretmen, duzenledigiFaaliyetSayisi: 1 };
    expect(ogretmenDurumu(tek, "ILK_FAALIYET").kazanildiMi).toBe(true);
    expect(ogretmenDurumu(tek, "SUREKLI_DUZENLEYICI").kazanildiMi).toBe(false);

    const bes = { ...bosOgretmen, duzenledigiFaaliyetSayisi: 5 };
    expect(ogretmenDurumu(bes, "SUREKLI_DUZENLEYICI").kazanildiMi).toBe(true);
  });

  it("danışmanlık nişanları eşiklerine göre açılır", () => {
    const bir = { ...bosOgretmen, aktifDanismanlikSayisi: 1 };
    expect(ogretmenDurumu(bir, "REHBER").kazanildiMi).toBe(true);
    expect(ogretmenDurumu(bir, "YOL_ACAN").kazanildiMi).toBe(false);
    expect(ogretmenDurumu(bir, "YOL_ACAN").ilerleme).toBe(1);

    const on = { ...bosOgretmen, aktifDanismanlikSayisi: 10 };
    expect(ogretmenDurumu(on, "YOL_ACAN").kazanildiMi).toBe(true);
  });

  // Öğretmen katılımcı olarak da başvurabiliyor; bu nişan onun kendi katılımını
  // sayar, düzenlediği faaliyetleri değil.
  it("Sahada nişanı düzenlemeden değil katılımdan doğar", () => {
    const duzenleyen = { ...bosOgretmen, duzenledigiFaaliyetSayisi: 3 };
    expect(ogretmenDurumu(duzenleyen, "SAHADA").kazanildiMi).toBe(false);

    const katilan = {
      ...bosOgretmen,
      katilimlar: [katilim("ULUSAL", "TEMEL_ETKINLIK")],
    };
    expect(ogretmenDurumu(katilan, "SAHADA").kazanildiMi).toBe(true);
  });

  it("paydaş bağlantısı İş Birliği nişanını açar", () => {
    const girdi = { ...bosOgretmen, paydasliFaaliyetSayisi: 1 };
    expect(ogretmenDurumu(girdi, "IS_BIRLIGI").kazanildiMi).toBe(true);
  });

  it("hedefi aşan ilerleme hedefe kırpılır", () => {
    const girdi = { ...bosOgretmen, aktifDanismanlikSayisi: 24 };
    expect(ogretmenDurumu(girdi, "YOL_ACAN").ilerleme).toBe(10);
    expect(ogretmenDurumu(girdi, "YOL_ACAN").kazanildiMi).toBe(true);
  });
});

describe("katilimOzeti", () => {
  it("katılımları kapsam ve kategoriye göre sayar", () => {
    const ozet = katilimOzeti([
      katilim("OKUL", "TEMEL_ETKINLIK"),
      katilim("OKUL", "IL_ETKINLIGI"),
      katilim("ULUSAL", "TEMEL_ETKINLIK"),
    ]);

    expect(ozet.toplamKatilim).toBe(3);
    expect(ozet.kapsamaGore.OKUL).toBe(2);
    expect(ozet.kapsamaGore.ULUSAL).toBe(1);
    expect(ozet.kapsamaGore.IL).toBe(0);
    expect(ozet.kategoriyeGore.TEMEL_ETKINLIK).toBe(2);
  });

  it("katılım yoksa tüm sayaçlar sıfırdır", () => {
    const ozet = katilimOzeti([]);
    expect(ozet.toplamKatilim).toBe(0);
    expect(Object.values(ozet.kapsamaGore).every((sayi) => sayi === 0)).toBe(
      true,
    );
  });
});
