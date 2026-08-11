import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { csvAdParcasi, csvBelgesi, csvYaniti } from "@/lib/rapor/csv";
import {
  illeriSuz,
  ilSiralamasiCoz,
  ozetToplami,
} from "@/lib/rapor/yonetim-kurallari";
import {
  ilceOzetleriniGetir,
  ilOzetleriniGetir,
} from "@/lib/rapor/yonetim-ozeti";
import {
  koordinatorIlKodu,
  projeYoneticisiMi,
  yonetimPanosuGorebilirMi,
} from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * Yönetim panosu kırılımının CSV çıktısı — ekranda görünen kartların tablosu.
 *
 * Envanter çıktılarından (öğrenci, öğretmen, paydaş) BİR FARKI VAR: burada
 * kişisel veri yok, birim başına sayı var. Bu yüzden erişim logu yazılmıyor ve
 * üst sınır sorulmuyor — çıktı en fazla 81 satır, kimsenin kaydı dışarı çıkmıyor.
 *
 * KAPSAM EKRANIN AYNISI: merkez illeri, koordinatör kendi ilinin ilçelerini
 * indirir. İki ayrı başlık satırı çıkması bilinçli; aynı dosya biçimini iki
 * farklı kırılıma zorlamak, koordinatörün dosyasına hep boş bir "İl koordinatörü"
 * sütunu koyardı.
 */

const IL_BASLIKLARI = [
  "İl kodu",
  "İl",
  "İl koordinatörü",
  "İlçe",
  "Okul",
  "Koordinatörsüz okul",
  "Öğretmen",
  "Okul koordinatörü",
  "Öğrenci",
  "Danışmansız öğrenci",
  "Bu yılın etkinlikleri",
  "Raporu eksik etkinlik",
] as const;

const ILCE_BASLIKLARI = [
  "İlçe kodu",
  "İlçe",
  "Okul",
  "Koordinatörsüz okul",
  "Öğretmen",
  "Okul koordinatörü",
  "Öğrenci",
  "Danışmansız öğrenci",
] as const;

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !yonetimPanosuGorebilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);

  if (projeYoneticisiMi(kullanici)) {
    /*
     * Süzgeç ekrandan taşınıyor: indirilen dosya, indirildiği anda ekranda
     * duran listenin aynısı olmalı. Değerler adres çubuğundan geldiği için
     * sıralama `ilSiralamasiCoz` ile doğrulanıyor — tanınmayan değer "ad"a
     * düşer, sessizce yanlış bir sıraya değil.
     */
    const iller = illeriSuz(await ilOzetleriniGetir(), {
      ara: adres.searchParams.get("ara") ?? "",
      sirala: ilSiralamasiCoz(adres.searchParams.get("sirala") ?? undefined),
    });

    const satirlar = iller.map((il) => [
      il.ilKodu,
      il.ad,
      il.koordinatorAdi ?? "Atanmadı",
      il.ilceSayisi,
      il.okulSayisi,
      il.koordinatorsuzOkulSayisi,
      il.ogretmenSayisi,
      il.okulKoordinatoruSayisi,
      il.ogrenciSayisi,
      il.danismansizOgrenciSayisi,
      il.faaliyetSayisi,
      il.raporsuzFaaliyetSayisi,
    ]);

    /*
     * TOPLAM SATIRI dosyanın sonunda: tabloyu açan kişi ülke toplamını ayrıca
     * hesaplamak zorunda kalmasın. Ekrandaki şeritle aynı hesap kullanılıyor,
     * yoksa dosyanın toplamı ekranın toplamını tutmayabilirdi.
     */
    const toplam = ozetToplami(iller);
    satirlar.push([
      "",
      "TOPLAM",
      `${iller.length - toplam.koordinatorsuzIl} ilde var`,
      toplam.ilce,
      toplam.okul,
      toplam.koordinatorsuzOkul,
      toplam.ogretmen,
      toplam.okulKoordinatoru,
      toplam.ogrenci,
      toplam.danismansizOgrenci,
      toplam.faaliyet,
      toplam.raporsuzFaaliyet,
    ]);

    return csvYaniti(
      "genctek-il-kirilimi",
      csvBelgesi(IL_BASLIKLARI, satirlar),
    );
  }

  const ilKodu = koordinatorIlKodu(kullanici);
  if (ilKodu === null) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const [il, ilceler] = await Promise.all([
    prisma.il.findUnique({ where: { ilKodu }, select: { ad: true } }),
    ilceOzetleriniGetir(ilKodu),
  ]);

  const satirlar: unknown[][] = ilceler.map((ilce) => [
    ilce.ilceKodu,
    ilce.ad,
    ilce.okulSayisi,
    ilce.koordinatorsuzOkulSayisi,
    ilce.ogretmenSayisi,
    ilce.okulKoordinatoruSayisi,
    ilce.ogrenciSayisi,
    ilce.danismansizOgrenciSayisi,
  ]);

  const toplam = ozetToplami(ilceler);
  satirlar.push([
    "",
    "TOPLAM",
    toplam.okul,
    toplam.koordinatorsuzOkul,
    toplam.ogretmen,
    toplam.okulKoordinatoru,
    toplam.ogrenci,
    toplam.danismansizOgrenci,
  ]);

  /*
   * Dosya adına ilin ADI yazılıyor, kodu değil: dosya e-posta ekinde dolaşıyor
   * ve "34" ile "06" arasındaki farkı indirmeyi açan herkes bilmiyor.
   */
  return csvYaniti(
    `genctek-${csvAdParcasi(il?.ad ?? "", ilKodu)}-ilce-kirilimi`,
    csvBelgesi(ILCE_BASLIKLARI, satirlar),
  );
}
