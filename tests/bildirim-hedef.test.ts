import { bildirimBaglantisi } from "@/lib/bildirim/hedef";

/**
 * Bildirimin "kayda git" bağlantısı.
 *
 * NEDEN SINANIYOR: bu eşleme, bir kullanıcıyı BAŞKA BİR KAYDA götürebilecek
 * tek yer. Yanlış id ya da yanlış yol, onay bekleyen bir etkinliği ilgisiz
 * birinin ekranına açmak demek — hedef sayfa 404 verse bile bağlantının kendisi
 * yanlış bilgiyi taşımış olur.
 */
describe("bildirim bağlantısı", () => {
  it("etkinlik hedefini detay adresine çevirir", () => {
    expect(bildirimBaglantisi({ hedefTip: "FAALIYET", hedefId: 42 })).toEqual({
      yol: "/panel/etkinlikler/42",
      etiket: "Etkinliğe git",
    });
  });

  it("hedefi olmayan bildirimde bağlantı üretmez", () => {
    expect(bildirimBaglantisi({ hedefTip: null, hedefId: null })).toBeNull();
  });

  /*
   * Yarım kayıt veri bozulmasıdır ve bağlantıya çevrilmez: kimliksiz bir tür
   * "/panel/etkinlikler/null" gibi bir adres üretirdi.
   */
  it("türü olup kimliği olmayan kayıt bağlantı vermez", () => {
    expect(bildirimBaglantisi({ hedefTip: "FAALIYET", hedefId: null })).toBeNull();
  });

  it("kimliği olup türü olmayan kayıt bağlantı vermez", () => {
    expect(bildirimBaglantisi({ hedefTip: null, hedefId: 42 })).toBeNull();
  });

  /*
   * Alanların HİÇ GELMEDİĞİ durum: sunucu, sütunlar eklenmeden önce üretilmiş
   * bir Prisma istemcisiyle ayaktaysa sorgu bu sütunları seçmez ve alanlar
   * undefined olur. Tipler bunu göstermiyor, çalışma zamanı gösteriyor.
   */
  it("alanlar hiç gelmemişse bağlantı vermez", () => {
    expect(
      bildirimBaglantisi({} as Parameters<typeof bildirimBaglantisi>[0]),
    ).toBeNull();
  });
});
