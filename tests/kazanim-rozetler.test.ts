import {
  type KatilimKaydi,
  type KazanimGirdisi,
  katilimOzeti,
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
