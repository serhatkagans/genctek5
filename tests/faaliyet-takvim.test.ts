import {
  kalanGun,
  kalanGunYaz,
  seritteGosterilecekler,
  takvimBolumu,
  takvimeAyir,
} from "@/lib/faaliyet/takvim";

/**
 * Etkinlik takvimi ve duyuru şeridi — analiz dokümanı Bölüm 6.
 */

const SIMDI = new Date(2026, 3, 15, 14, 0, 0); // 15 Nisan 2026, 14:00

function faaliyet(
  tarih: Date,
  ekler: Partial<{
    basvuruBaslangic: Date;
    basvuruBitis: Date;
    durum: "AKTIF" | "IPTAL_EDILDI";
  }> = {},
) {
  return {
    id: tarih.getTime(),
    tarih,
    durum: ekler.durum ?? ("AKTIF" as const),
    basvuruBaslangic: ekler.basvuruBaslangic ?? new Date(2026, 3, 1),
    basvuruBitis: ekler.basvuruBitis ?? new Date(2026, 3, 30, 23, 59, 59),
  };
}

describe("takvim bölümü", () => {
  /*
   * Karşılaştırma GÜN bazındadır: sabah 10'da yapılan etkinlik öğleden sonra
   * bakıldığında "geçmiş" görünseydi, o günün programını takip eden kullanıcı
   * etkinliği listede kaybederdi.
   */
  it("aynı gün içindeki etkinlik saat geçse de bugün sayılır", () => {
    expect(takvimBolumu({ tarih: new Date(2026, 3, 15, 10, 0) }, SIMDI)).toBe(
      "BUGUN",
    );
    expect(takvimBolumu({ tarih: new Date(2026, 3, 15, 23, 30) }, SIMDI)).toBe(
      "BUGUN",
    );
  });

  it("dünkü geçmiş, yarınki yaklaşandır", () => {
    expect(takvimBolumu({ tarih: new Date(2026, 3, 14, 23, 59) }, SIMDI)).toBe(
      "GECMIS",
    );
    expect(takvimBolumu({ tarih: new Date(2026, 3, 16, 0, 1) }, SIMDI)).toBe(
      "YAKLASAN",
    );
  });
});

describe("takvime ayırma", () => {
  it("üç bölüme ayırır ve her bölümü şimdiye yakından uzağa sıralar", () => {
    const takvim = takvimeAyir(
      [
        faaliyet(new Date(2026, 3, 20)),
        faaliyet(new Date(2026, 3, 1)),
        faaliyet(new Date(2026, 3, 15, 9)),
        faaliyet(new Date(2026, 3, 17)),
        faaliyet(new Date(2026, 3, 10)),
      ],
      SIMDI,
    );

    expect(takvim.bugun).toHaveLength(1);
    // Yaklaşanlar en yakın tarihten uzağa.
    expect(takvim.yaklasan.map((f) => f.tarih.getDate())).toEqual([17, 20]);
    // Geçmişler en yeniden eskiye.
    expect(takvim.gecmis.map((f) => f.tarih.getDate())).toEqual([10, 1]);
  });

  it("boş listede üç bölüm de boş döner", () => {
    const takvim = takvimeAyir([], SIMDI);
    expect(takvim.bugun).toEqual([]);
    expect(takvim.yaklasan).toEqual([]);
    expect(takvim.gecmis).toEqual([]);
  });
});

describe("duyuru şeridi", () => {
  it("yalnızca başvuru penceresi açık faaliyetler girer", () => {
    const acik = faaliyet(new Date(2026, 4, 1));
    const acilmamis = faaliyet(new Date(2026, 5, 1), {
      basvuruBaslangic: new Date(2026, 4, 20),
      basvuruBitis: new Date(2026, 4, 30),
    });
    const kapanmis = faaliyet(new Date(2026, 3, 20), {
      basvuruBaslangic: new Date(2026, 2, 1),
      basvuruBitis: new Date(2026, 2, 20),
    });

    const seritte = seritteGosterilecekler([acik, acilmamis, kapanmis], SIMDI);
    expect(seritte).toEqual([acik]);
  });

  /*
   * Şerit "şimdi başvurabilirsin" demektir; iptal edilmiş faaliyetin penceresi
   * teknik olarak açık kalmış olabilir ama başvuru alınmıyor.
   */
  it("iptal edilmiş faaliyet şeride girmez", () => {
    const iptalli = faaliyet(new Date(2026, 4, 1), { durum: "IPTAL_EDILDI" });
    expect(seritteGosterilecekler([iptalli], SIMDI)).toEqual([]);
  });

  it("başvurusu önce kapanacak olan başa alınır", () => {
    const gecKapanan = faaliyet(new Date(2026, 4, 10), {
      basvuruBitis: new Date(2026, 3, 28),
    });
    const oncekapanan = faaliyet(new Date(2026, 4, 5), {
      basvuruBitis: new Date(2026, 3, 18),
    });

    const seritte = seritteGosterilecekler([gecKapanan, oncekapanan], SIMDI);
    expect(seritte[0]).toBe(oncekapanan);
  });
});

describe("kalan gün", () => {
  it("bugün kapanıyorsa sıfır döner", () => {
    expect(kalanGun(new Date(2026, 3, 15, 23, 59), SIMDI)).toBe(0);
    expect(kalanGunYaz(new Date(2026, 3, 15, 23, 59), SIMDI)).toBe("son gün");
  });

  it("gün farkı saatten etkilenmez", () => {
    // Sabah 00:01'de biten ile 23:59'da biten aynı gün: ikisi de "1 gün".
    expect(kalanGun(new Date(2026, 3, 16, 0, 1), SIMDI)).toBe(1);
    expect(kalanGun(new Date(2026, 3, 16, 23, 59), SIMDI)).toBe(1);
    expect(kalanGunYaz(new Date(2026, 3, 16, 12, 0), SIMDI)).toBe("son 1 gün");
  });

  it("birden fazla gün kaldıysa sayı yazılır", () => {
    expect(kalanGunYaz(new Date(2026, 3, 20), SIMDI)).toBe("5 gün kaldı");
  });
});
