import { katkiKartiMetni } from "@/lib/ogretmen/katki-ozeti";

/**
 * Panelim'deki "Katkı kartım" ölçüm kartının metni (12 Ağustos 2026).
 *
 * İSTEK: "katkı kartım kartında tıklayın diyor ama katkıların özeti yok kartta."
 *
 * Kartın en can alıcı kuralı sıfırların yazılmaması: il koordinatörü danışman
 * OLAMAZ (bkz. domain-rules · Bölüm 3) ve ona "0 aktif danışmanlık" demek,
 * yapamayacağı bir işin eksikliğini bildirmek olurdu.
 */

describe("katkı kartı metni", () => {
  it("büyük satırda düzenlenen etkinlik sayısı durur", () => {
    const metin = katkiKartiMetni({
      faaliyet: 7,
      aktifDanismanlik: 3,
      gorev: 2,
    });
    expect(metin.deger).toBe("7 etkinlik");
    expect(metin.aciklama).toBe("3 aktif danışmanlık · 2 görev · ayrıntı için tıklayın");
  });

  it("danışmanlığı olmayanda o satır hiç yazılmaz", () => {
    // İl koordinatörünün tipik hâli: görevi var, danışmanlığı olamaz.
    const metin = katkiKartiMetni({
      faaliyet: 4,
      aktifDanismanlik: 0,
      gorev: 1,
    });
    expect(metin.aciklama).toBe("1 görev · ayrıntı için tıklayın");
  });

  it("yalnızca etkinliği olanda açıklama kısaya döner", () => {
    const metin = katkiKartiMetni({
      faaliyet: 2,
      aktifDanismanlik: 0,
      gorev: 0,
    });
    expect(metin.deger).toBe("2 etkinlik");
    expect(metin.aciklama).toBe("Ayrıntı için tıklayın");
  });

  /*
   * Hiç katkısı olmayan kullanıcı: sayı yerine kartın NE OLDUĞU anlatılır.
   * "0 etkinlik · 0 danışmanlık" yeni bir kullanıcıya hiçbir şey söylemez.
   */
  it("hiç katkı yoksa kartın ne olduğu yazılır", () => {
    const metin = katkiKartiMetni({
      faaliyet: 0,
      aktifDanismanlik: 0,
      gorev: 0,
    });
    expect(metin.deger).toBe("0 etkinlik");
    expect(metin.aciklama).toBe(
      "Görevleriniz, danışmanlığınız ve düzenlediğiniz etkinlikler",
    );
  });
});
