import {
  birimUyarilari,
  illeriSuz,
  ilSiralamasiCoz,
  ozetToplami,
  yonetimYolIzi,
} from "@/lib/rapor/yonetim-kurallari";
import {
  mentorlukBasvurabilirMi,
  mentorlukOnaylayabilirMi,
  yonetimPanosuGorebilirMi,
  yonetimPanosuIlErisimi,
} from "@/lib/yetki/izinler";
import {
  danismanYap,
  koordinatorYap,
  mezunYap,
  ogrenciYap,
  paydasTemsilcisiYap,
  projeYoneticisiYap,
  rolsuzOgretmenYap,
} from "./yardimcilar";

/**
 * Yönetim panosu — kapı ve kırılım kapsamı.
 *
 * Panonun kendisi sayım gösteriyor, yani veri gösteriyor: kimin açabildiği ve
 * hangi ili açabildiği yetki sorusudur ve burada sabitleniyor.
 */

describe("yönetim panosu kapısı", () => {
  it("il koordinatörü ve proje yöneticisi panoyu açar", () => {
    expect(yonetimPanosuGorebilirMi(koordinatorYap())).toBe(true);
    expect(yonetimPanosuGorebilirMi(projeYoneticisiYap())).toBe(true);
  });

  /*
   * Danışman öğretmen DIŞARIDA: pano il kırılımıdır, öğretmenin işi kendi
   * öğrencileridir. Menüsündeki "Öğrencilerim" sekmesi bu yüzden kaldı.
   */
  it("danışman öğretmen, öğrenci ve dış kullanıcılar panoyu açamaz", () => {
    expect(yonetimPanosuGorebilirMi(danismanYap())).toBe(false);
    expect(yonetimPanosuGorebilirMi(rolsuzOgretmenYap())).toBe(false);
    expect(yonetimPanosuGorebilirMi(ogrenciYap())).toBe(false);
    expect(yonetimPanosuGorebilirMi(mezunYap())).toBe(false);
    expect(yonetimPanosuGorebilirMi(paydasTemsilcisiYap())).toBe(false);
  });
});

describe("panoda il kırılımı erişimi", () => {
  it("koordinatör yalnızca kendi ilini açar", () => {
    const koordinator = koordinatorYap({ ilKodu: "34" });
    expect(yonetimPanosuIlErisimi(koordinator, "34")).toBe(true);
    expect(yonetimPanosuIlErisimi(koordinator, "06")).toBe(false);
  });

  it("proje yöneticisi her ili açar", () => {
    const merkez = projeYoneticisiYap();
    expect(yonetimPanosuIlErisimi(merkez, "34")).toBe(true);
    expect(yonetimPanosuIlErisimi(merkez, "06")).toBe(true);
  });

  /*
   * Görev ili KİMLİK İLİNDEN gelmez: koordinatörlük rolü başka bir ile
   * yazılmışsa kırılımda o il açılır. Kullanıcının kendi ilKodu'suna
   * bakılsaydı koordinatör sorumlu olduğu ili göremezdi.
   */
  it("kimlik ili değil görev ili sorulur", () => {
    const koordinator = koordinatorYap({
      ilKodu: "34",
      roller: [{ rolKodu: "IL_KOORDINATOR", ilKodu: "06", kurumKodu: null }],
    });
    expect(yonetimPanosuIlErisimi(koordinator, "06")).toBe(true);
    expect(yonetimPanosuIlErisimi(koordinator, "34")).toBe(false);
  });

  it("rolsüz öğretmen hiçbir ili açamaz", () => {
    expect(yonetimPanosuIlErisimi(rolsuzOgretmenYap(), "34")).toBe(false);
  });
});

describe("kart toplamları", () => {
  it("il kartlarında ilçe, okul, öğretmen, kişi ve etkinlik sayıları toplanır", () => {
    expect(
      ozetToplami([
        {
          ilceSayisi: 39,
          okulSayisi: 12,
          koordinatorsuzOkulSayisi: 4,
          ogretmenSayisi: 90,
          okulKoordinatoruSayisi: 5,
          ogrenciSayisi: 130,
          danismansizOgrenciSayisi: 12,
          faaliyetSayisi: 7,
          raporsuzFaaliyetSayisi: 2,
          koordinatorAdi: "Ayşe Yılmaz",
        },
        {
          ilceSayisi: 8,
          okulSayisi: 3,
          koordinatorsuzOkulSayisi: 3,
          ogretmenSayisi: 12,
          okulKoordinatoruSayisi: 0,
          ogrenciSayisi: 0,
          danismansizOgrenciSayisi: 0,
          faaliyetSayisi: 0,
          raporsuzFaaliyetSayisi: 0,
          koordinatorAdi: null,
        },
      ]),
    ).toEqual({
      ilce: 47,
      okul: 15,
      ogretmen: 102,
      okulKoordinatoru: 5,
      ogrenci: 130,
      koordinatorsuzOkul: 7,
      koordinatorsuzIl: 1,
      danismansizOgrenci: 12,
      faaliyet: 7,
      raporsuzFaaliyet: 2,
    });
  });

  /*
   * Etkinlik yalnızca il kartında sorulur; faaliyet kaydının ilçesi boş
   * olabildiği için alt basamakta sorulsaydı ilçelerin toplamı ilin sayısından
   * küçük çıkardı (bkz. yonetim-ozeti.ts · ilOzetleriniGetir).
   */
  it("etkinlik alanı olmayan satırlar etkinlik toplamına girmez", () => {
    const toplam = ozetToplami([
      {
        okulSayisi: 6,
        koordinatorsuzOkulSayisi: 2,
        ogretmenSayisi: 40,
        okulKoordinatoruSayisi: 4,
        ogrenciSayisi: 55,
        danismansizOgrenciSayisi: 3,
      },
    ]);

    expect(toplam.faaliyet).toBe(0);
    expect(toplam.raporsuzFaaliyet).toBe(0);
  });

  /*
   * İlçe kartında `ilceSayisi` yoktur; ilçe toplamı satır sayısının kendisidir.
   * Koordinatörsüz İL ise burada sayılmaz: alan hiç gelmiyorsa soru sorulmamış
   * demektir, "koordinatörü yok" demek değil.
   */
  it("ilçe kartlarında her satır bir ilçe sayılır, koordinatörsüz il sayılmaz", () => {
    const toplam = ozetToplami([
      {
        okulSayisi: 6,
        koordinatorsuzOkulSayisi: 2,
        ogretmenSayisi: 40,
        okulKoordinatoruSayisi: 4,
        ogrenciSayisi: 55,
        danismansizOgrenciSayisi: 5,
      },
      {
        okulSayisi: 1,
        koordinatorsuzOkulSayisi: 0,
        ogretmenSayisi: 9,
        okulKoordinatoruSayisi: 1,
        ogrenciSayisi: 12,
        danismansizOgrenciSayisi: 1,
      },
    ]);

    expect(toplam.ilce).toBe(2);
    expect(toplam.okul).toBe(7);
    expect(toplam.ogretmen).toBe(49);
    expect(toplam.koordinatorsuzOkul).toBe(2);
    expect(toplam.koordinatorsuzIl).toBe(0);
    expect(toplam.danismansizOgrenci).toBe(6);
  });

  /*
   * Okul kartında `okulSayisi` yoktur; toplam okul, satır sayısının kendisidir.
   * Alan eksik diye sıfır sayılsaydı ilçenin okul toplamı 0 görünürdü. Aynı
   * kartta ilçe diye bir şey yok — okul satırı ilçe toplamına GİRMEZ, yoksa
   * ilçenin okul listesinde "toplam ilçe", okul sayısı kadar çıkardı.
   */
  it("okul kartlarında her satır bir okul sayılır, ilçe sayılmaz", () => {
    const toplam = ozetToplami([
      {
        ogretmenSayisi: 22,
        okulKoordinatoruSayisi: 2,
        ogrenciSayisi: 40,
        danismansizOgrenciSayisi: 0,
      },
      {
        ogretmenSayisi: 14,
        okulKoordinatoruSayisi: 1,
        ogrenciSayisi: 25,
        danismansizOgrenciSayisi: 4,
      },
    ]);

    expect(toplam.okul).toBe(2);
    expect(toplam.ilce).toBe(0);
    expect(toplam.ogretmen).toBe(36);
    expect(toplam.okulKoordinatoru).toBe(3);
    expect(toplam.ogrenci).toBe(65);
  });

  /*
   * Okul basamağında koordinatörsüz okul ayrıca sorulmaz: koordinatör sayısı
   * sıfır olan kartın kendisi boş bir okuldur.
   */
  it("koordinatörsüz okul, okul kartında sıfır koordinatörden türetilir", () => {
    const okulSatiri = (koordinator: number) => ({
      ogretmenSayisi: 10,
      okulKoordinatoruSayisi: koordinator,
      ogrenciSayisi: 30,
      danismansizOgrenciSayisi: 0,
    });

    expect(
      ozetToplami([okulSatiri(0), okulSatiri(2), okulSatiri(0)])
        .koordinatorsuzOkul,
    ).toBe(2);
  });

  it("boş listede toplam sıfırdır", () => {
    expect(ozetToplami([])).toEqual({
      ilce: 0,
      okul: 0,
      ogretmen: 0,
      okulKoordinatoru: 0,
      ogrenci: 0,
      koordinatorsuzOkul: 0,
      koordinatorsuzIl: 0,
      danismansizOgrenci: 0,
      faaliyet: 0,
      raporsuzFaaliyet: 0,
    });
  });
});

describe("il listesinin süzgeci ve sıralaması", () => {
  const il = (
    ad: string,
    sayilar: Partial<{
      ogrenciSayisi: number;
      koordinatorsuzOkulSayisi: number;
      danismansizOgrenciSayisi: number;
      koordinatorAdi: string | null;
    }> = {},
  ) => ({
    ad,
    ogrenciSayisi: 0,
    koordinatorsuzOkulSayisi: 0,
    danismansizOgrenciSayisi: 0,
    koordinatorAdi: "Görevli Kişi" as string | null,
    ...sayilar,
  });

  it("varsayılan sıra Türkçe alfabedir", () => {
    const sonuc = illeriSuz([il("İstanbul"), il("Iğdır"), il("Adana")]);
    expect(sonuc.map((satir) => satir.ad)).toEqual([
      "Adana",
      "Iğdır",
      "İstanbul",
    ]);
  });

  /*
   * Küçültme Türkçe yapılmazsa "Isparta" araması "ısparta"ya döner ve ile hiç
   * ulaşılamaz; bu, İngilizce küçültmenin Türkçede yaptığı klasik hatadır.
   */
  it("arama Türkçe küçültmeyle çalışır ve ada bakar", () => {
    const iller = [il("Isparta"), il("İstanbul"), il("Ankara")];
    expect(illeriSuz(iller, { ara: "ISPARTA" }).map((s) => s.ad)).toEqual([
      "Isparta",
    ]);
    expect(illeriSuz(iller, { ara: "ist" }).map((s) => s.ad)).toEqual([
      "İstanbul",
    ]);
  });

  it("öğrenci sıralaması çoktan aza gider, eşitlikte ada düşer", () => {
    const sonuc = illeriSuz(
      [
        il("Ankara", { ogrenciSayisi: 10 }),
        il("Bursa", { ogrenciSayisi: 40 }),
        il("Adana", { ogrenciSayisi: 40 }),
      ],
      { sirala: "ogrenci" },
    );
    expect(sonuc.map((satir) => satir.ad)).toEqual([
      "Adana",
      "Bursa",
      "Ankara",
    ]);
  });

  /*
   * Boşluk sıralaması TOPLAM PUAN DEĞİL, sıralı karşılaştırmadır: koordinatörü
   * olmayan il, danışmansız öğrencisi çok olan ilin üstündedir. Puan toplansaydı
   * kalabalık bir il, koordinatörsüz bir ili kolayca geçerdi.
   */
  it("boşluk sıralamasında koordinatörsüz il her zaman üstte", () => {
    const sonuc = illeriSuz(
      [
        il("Bursa", { danismansizOgrenciSayisi: 500 }),
        il("Rize", { koordinatorAdi: null }),
        il("Ankara", { koordinatorsuzOkulSayisi: 9 }),
      ],
      { sirala: "bosluk" },
    );
    expect(sonuc.map((satir) => satir.ad)).toEqual(["Rize", "Ankara", "Bursa"]);
  });

  it("süzgeç özgün listeyi değiştirmez", () => {
    const iller = [il("Bursa"), il("Adana")];
    illeriSuz(iller, { sirala: "ogrenci" });
    expect(iller.map((satir) => satir.ad)).toEqual(["Bursa", "Adana"]);
  });

  it("tanınmayan sıralama değeri ada düşer", () => {
    expect(ilSiralamasiCoz("okul")).toBe("ad");
    expect(ilSiralamasiCoz(undefined)).toBe("ad");
    expect(ilSiralamasiCoz("bosluk")).toBe("bosluk");
  });
});

describe("kart uyarıları", () => {
  /*
   * Sıfır olan uyarı yazılmaz: "0 danışmansız öğrenci" bir haber değil gürültü,
   * ve kırmızı bir satır ancak nadir olduğunda anlam taşır.
   */
  it("yalnızca sıfırdan büyük eksikler yazılır", () => {
    expect(
      birimUyarilari({
        koordinatorsuzOkulSayisi: 0,
        danismansizOgrenciSayisi: 4,
        raporsuzFaaliyetSayisi: 0,
      }),
    ).toEqual(["4 öğrencinin danışmanı yok"]);
  });

  it("eksik yoksa uyarı da yok", () => {
    expect(
      birimUyarilari({
        koordinatorsuzOkulSayisi: 0,
        danismansizOgrenciSayisi: 0,
      }),
    ).toEqual([]);
  });

  it("üç eksik birlikte sıralanır", () => {
    expect(
      birimUyarilari({
        koordinatorsuzOkulSayisi: 2,
        danismansizOgrenciSayisi: 7,
        raporsuzFaaliyetSayisi: 1,
      }),
    ).toEqual([
      "2 okulda koordinatör yok",
      "7 öğrencinin danışmanı yok",
      "1 etkinliğin raporu eksik",
    ]);
  });
});

describe("envanter ekranlarının yol izi", () => {
  /*
   * 12 AĞUSTOS 2026 · istek: "ilçe seçince üstte yol izi çıkıyor ama oradan
   * öğrencilere/öğretmenlere gidince kayboluyor, geri dönmek için tarayıcının
   * geri düğmesi gerekiyor". Şeridin ilk basamağı bu yüzden her hâlükârda
   * panodur: bu ekranların menüde sekmesi yok.
   */
  it("süzgeç boşken bile panoya dönüş basamağı vardır", () => {
    expect(yonetimYolIzi("Öğrenciler")).toEqual([
      { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
      { etiket: "Öğrenciler" },
    ]);
  });

  it("okul süzgecinde il ve ilçe basamakları kırılımın ekranlarına bağlanır", () => {
    expect(
      yonetimYolIzi("Öğretmenler", {
        il: { ilKodu: "01", ad: "Adana" },
        ilce: { ilceKodu: "0101", ad: "Yıldırım" },
        okul: { ad: "Şehit Er Lisesi" },
      }),
    ).toEqual([
      { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
      { etiket: "Adana", yol: "/panel/yonetim/il/01" },
      { etiket: "Yıldırım", yol: "/panel/yonetim/ilce/0101" },
      // Okulun panoda kendi ekranı yok; adı yazılır ama bir yere gitmez.
      { etiket: "Şehit Er Lisesi" },
      { etiket: "Öğretmenler" },
    ]);
  });

  it("yalnızca il süzülmüşse ilçe basamağı yazılmaz", () => {
    expect(
      yonetimYolIzi("Öğrenciler", { il: { ilKodu: "06", ad: "Ankara" } }),
    ).toEqual([
      { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
      { etiket: "Ankara", yol: "/panel/yonetim/il/06" },
      { etiket: "Öğrenciler" },
    ]);
  });
});

describe("mentörlük onay yetkisi", () => {
  /*
   * 11 AĞUSTOS 2026 · istek: "il koordinatörü mentörlüğe başvurunca kendi
   * kendini onaylıyor, mentörlük onaylarını sadece proje yöneticisi onay
   * verebilsin".
   *
   * Kuyruk koordinatörün kendi iliyle sınırlıydı, yani kendi başvurusu her
   * zaman kendi ekranına düşüyordu ve ilde ikinci bir koordinatör olmadığı
   * için bakacak başka kimse yoktu.
   */
  it("yalnızca proje yöneticisi mentörlük onaylar", () => {
    expect(mentorlukOnaylayabilirMi(projeYoneticisiYap())).toBe(true);
    expect(mentorlukOnaylayabilirMi(koordinatorYap())).toBe(false);
    expect(mentorlukOnaylayabilirMi(danismanYap())).toBe(false);
    expect(mentorlukOnaylayabilirMi(ogrenciYap())).toBe(false);
  });

  /*
   * Koordinatör mentör OLMAYA devam ediyor; kaybettiği tek şey karar yetkisi.
   * İkisi karıştırılsaydı ilin koordinatörü mentör havuzundan da düşerdi.
   */
  it("koordinatör mentörlüğe başvurabilir", () => {
    expect(mentorlukBasvurabilirMi(koordinatorYap())).toBe(true);
  });
});
