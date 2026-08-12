import {
  belgeKapisi,
  katilimciBelgeKapisi,
  yoklamaAlinabilirMi,
  yoklamaDegeriCoz,
  yoklamaOzeti,
} from "@/lib/belge/kapi";

/**
 * Belge üretiminin ön koşulları (12 Ağustos 2026).
 *
 * İSTEKLER:
 *   · "etkinlik raporu yazılmadan belge oluştur seçeneği olmamalı"
 *   · "öğrenci etkinliğe gelmedi ama GençTek Yolculuğum'da katıldı görünüyor,
 *      bunun kontrolünü nasıl sağlarız"
 *
 * Kapı burada sınanıyor çünkü aynı kural üç yerde birden soruluyor: etkinlik
 * ekranındaki düğme, belgeler ekranı ve belge üreten iki yol. Kural tek yerde
 * durmazsa ekranda kapalı görünen bir yol sunucuda açık kalır.
 */

describe("rapor kapısı", () => {
  it("raporu olmayan etkinlikte belge üretilemez", () => {
    const karar = belgeKapisi({ raporVarMi: false });
    expect(karar.olurMu).toBe(false);
    // Gerekçe kullanıcıya gösteriliyor; boş bırakılırsa ekran sebebini
    // söyleyemez.
    expect(karar.neden).toContain("rapor");
  });

  it("raporu yazılmış etkinlikte kapı açılır", () => {
    expect(belgeKapisi({ raporVarMi: true })).toEqual({
      olurMu: true,
      neden: null,
    });
  });
});

describe("katılımcı kapısı", () => {
  it("yalnızca geldi işaretlenene belge üretilir", () => {
    expect(katilimciBelgeKapisi({ katildiMi: true }).olurMu).toBe(true);
  });

  it("gelmedi işaretlenene üretilmez", () => {
    const karar = katilimciBelgeKapisi({ katildiMi: false });
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toContain("gelmedi");
  });

  /*
   * "Tamamen engellensin" kararı (12 Ağustos 2026): yoklaması alınmamış kişi de
   * dışarıda. Aksi hâlde yoklama almayan bir etkinlikte toplu belge eski
   * davranışı üretir ve gelmeyenin profiline yine katılım düşerdi.
   */
  it("yoklaması alınmamış kişiye de üretilmez", () => {
    const karar = katilimciBelgeKapisi({ katildiMi: null });
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toContain("Yoklama");
  });
});

describe("yoklama kapısı", () => {
  it("bitmemiş etkinlikte yoklama alınmaz", () => {
    expect(yoklamaAlinabilirMi({ bittiMi: false, iptalMi: false }).olurMu).toBe(
      false,
    );
  });

  it("iptal edilmiş etkinlikte yoklama alınmaz", () => {
    expect(yoklamaAlinabilirMi({ bittiMi: true, iptalMi: true }).olurMu).toBe(
      false,
    );
  });

  it("bitmiş ve aktif etkinlikte alınır", () => {
    expect(yoklamaAlinabilirMi({ bittiMi: true, iptalMi: false }).olurMu).toBe(
      true,
    );
  });
});

describe("yoklama değerinin çözümü", () => {
  it("evet ve hayır dışındaki her şey işaretlenmedi sayılır", () => {
    expect(yoklamaDegeriCoz("evet")).toBe(true);
    expect(yoklamaDegeriCoz("hayir")).toBe(false);
    expect(yoklamaDegeriCoz("")).toBeNull();
    expect(yoklamaDegeriCoz(null)).toBeNull();
    expect(yoklamaDegeriCoz("belki")).toBeNull();
  });
});

describe("yoklama özeti", () => {
  it("üç hâli ayrı sayar", () => {
    expect(
      yoklamaOzeti([
        { katildiMi: true },
        { katildiMi: true },
        { katildiMi: false },
        { katildiMi: null },
      ]),
    ).toEqual({
      toplam: 4,
      gelen: 2,
      gelmeyen: 1,
      isaretlenmeyen: 1,
      tamamlandiMi: false,
    });
  });

  /*
   * Katılımcısı olmayan etkinlikte yoklama "tamamlandı" sayılır: konuşmacıya
   * teşekkür belgesi tam da böyle bir etkinlikte üretiliyor ve kapı orada
   * kapalı kalsaydı o belge hiç basılamazdı.
   */
  it("boş listede tamamlanmış sayılır", () => {
    expect(yoklamaOzeti([]).tamamlandiMi).toBe(true);
  });
});
