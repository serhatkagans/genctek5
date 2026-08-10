import type { RolKodu } from "@/generated/prisma/enums";

/**
 * GençTek Market — süzgeçler ve görünürlük kuralları (I).
 *
 * Saf: veritabanı, oturum ya da Next.js bilmez. Ekranlar ve sunucu eylemleri
 * yalnızca buradaki kararı uygular.
 *
 * ---------------------------------------------------------------------------
 * MARKET AYRI BİR TABLO DEĞİL
 * ---------------------------------------------------------------------------
 * Vitrindeki her ürün `kullanici_kazanim` · tip=URUN kaydıdır ve markete
 * `markette_paylasilsin` bayrağıyla çıkar (D5 · 6 Ağustos). Ayrı bir "market
 * ürünü" tablosu açılsaydı aynı ürün iki yerde yaşar, profilden silinen ürün
 * vitrinde kalabilirdi.
 *
 * "Ürün Ekle" ekranı da bu yüzden YOK: ekleme profilde yapılır, market yalnızca
 * gösterir. İstekteki not ("Profilden ekleyebilirsiniz") tam olarak bunu
 * söylüyor.
 */

/**
 * Süzgeç kimlikleri.
 *
 * İKİ SÜZGEÇ KALDI (10 Ağustos 2026 · istek: "dilim kalkacak, kendi ürünlerim
 * ürünlerim olacak, öğrenci ve öğretmen ürünleri ayrı olmayacak").
 *
 * NE KALKTI VE NİYE:
 *   · DİLİM — ne olduğu hiç tanımlanmadı (→ SORULAR.md · S22) ve "tanım
 *     bekleniyor" etiketiyle aylarca ekranda durdu. Boş bir başlığı beklemeye
 *     almak yerine kaldırıldı; tanım gelirse yeniden açılır, o gün ürüne bir
 *     kategori alanı da gerekecek.
 *   · ÖĞRENCİ ÜRÜNLERİ / ÖĞRETMEN ÜRÜNLERİ — vitrini sahibin rolüne göre ikiye
 *     bölüyordu. Market bir ÜRÜN vitrinidir; bir uygulamanın işe yarayıp
 *     yaramadığı, onu yazanın öğrenci mi öğretmen mi olduğuna bakmaz. Ayrım
 *     ayrıca dış kullanıcıların (mezun, paydaş) ürününü iki sekmenin de
 *     dışında bırakıyordu.
 *
 * Kaydın SAHİBİ hâlâ görünüyor (kart üstünde ad ve "Öğrenci/Öğretmen ürünü"
 * ibaresi): bilgi duruyor, vitrini bölen süzgeç kalkıyor.
 */
export type MarketSuzgeci = "TUMU" | "BENIM";

export interface SuzgecTanimi {
  kod: MarketSuzgeci;
  etiket: string;
  /** Sekmenin altındaki açıklama; boş süzgeçte "neden boş" da buradan gelir. */
  aciklama: string;
}

export const MARKET_SUZGECLERI: readonly SuzgecTanimi[] = [
  {
    kod: "TUMU",
    etiket: "Tüm ürünler",
    aciklama: "Markette paylaşılan bütün ürünler.",
  },
  {
    /*
     * "Ürünlerim" DİĞERİNDEN FARKLI ÇALIŞIR: kişinin markette PAYLAŞMADIĞI
     * ürünlerini de gösterir. Kişi buraya kendi ürünlerini görmeye geliyor ve
     * paylaşmadıklarının kaybolması, onları sildiğini düşündürürdü. Paylaşım
     * durumu satırda rozetle yazıyor.
     */
    kod: "BENIM",
    etiket: "Ürünlerim",
    aciklama:
      "Senin eklediğin ürünler. Markette paylaşmadıkların da burada görünür; onları senden başkası göremez.",
  },
];

export function suzgecTanimi(kod: string): SuzgecTanimi | null {
  return MARKET_SUZGECLERI.find((suzgec) => suzgec.kod === kod) ?? null;
}

/**
 * Adres çubuğundan gelen süzgeci çözer.
 *
 * Tanınmayan süzgeç sessizce TUMU'ye düşer — hata sayfası göstermek, yer imine
 * kaydedilmiş eski bir adres için sert bir karşılık olurdu. 10 Ağustos
 * 2026'da kaldırılan `?suzgec=OGRENCI/OGRETMEN/DILIM` adresleri de buradan
 * geçip vitrine düşüyor.
 */
export function suzgeciCoz(ham: string | undefined): MarketSuzgeci {
  const tanim = ham ? suzgecTanimi(ham) : null;
  return tanim?.kod ?? "TUMU";
}

/**
 * Ürün sahibinin market bakımından hangi kümeye girdiği.
 *
 * Rol listesi üzerinden karar veriliyor, tek bir "tip" alanı üzerinden değil:
 * bir kişi aynı anda birden çok rol taşıyabiliyor (danışman + il koordinatörü
 * gibi). Öğrenci rolü varsa öğrencidir; yoksa ve öğretmen/koordinatör rolü
 * varsa öğretmendir.
 *
 * DIŞ KULLANICILAR (mezun, paydaş temsilcisi) ikisine de girmez, "Ekosistem
 * ürünü" sayılır: mezunu öğrenci saymak yanlış olurdu (artık öğrenci değil),
 * öğretmen saymak da öyle.
 *
 * SÜZGEÇ DEĞİL, ETİKET (10 Ağustos 2026): bu küme vitrini bölmüyor, yalnızca
 * kartın üstündeki "kim yaptı" ibaresini yazıyor. Rol bazlı sekmeler kalktı
 * (bkz. MARKET_SUZGECLERI).
 */
export type UrunSahipKumesi = "OGRENCI" | "OGRETMEN" | "DIGER";

const OGRETMEN_ROLLERI: readonly RolKodu[] = [
  "DANISMAN",
  "IL_KOORDINATOR",
  "PROJE_YONETICISI",
];

export function sahipKumesi(roller: readonly RolKodu[]): UrunSahipKumesi {
  if (roller.includes("OGRENCI")) return "OGRENCI";
  if (roller.some((rol) => OGRETMEN_ROLLERI.includes(rol))) return "OGRETMEN";
  return "DIGER";
}

export interface MarketUrunu {
  id: number;
  sahipKullaniciId: number;
  sahipKumesi: UrunSahipKumesi;
  markettePaylasilsin: boolean;
}

/**
 * Süzgeci uygular.
 *
 * SQL'de değil burada, çünkü karar rol listesine bakıyor ve aynı kararın
 * ekranda da (rozet yazısı) kullanılması gerekiyor. Ürün sayısı vitrin
 * ölçeğinde; sayfalama gerektiğinde bu fonksiyon SQL'e taşınmalı ve testi
 * o zaman koruma görevi görür.
 */
export function urunleriSuz<T extends MarketUrunu>(
  urunler: readonly T[],
  suzgec: MarketSuzgeci,
  oturumKullaniciId: number,
): T[] {
  switch (suzgec) {
    case "BENIM":
      // Paylaşılmamışlar DA burada — sekmenin adı "Ürünlerim".
      return urunler.filter((u) => u.sahipKullaniciId === oturumKullaniciId);
    case "TUMU":
    default:
      // Vitrin: paylaşılanlar + kişinin kendi paylaşmadıkları. Kişinin kendi
      // ürünü "Tüm ürünler"de de görünmeli, yoksa paylaşımı kapattığında ürün
      // markette tamamen kaybolur ve silindiğini sanır.
      return urunler.filter(
        (u) => u.markettePaylasilsin || u.sahipKullaniciId === oturumKullaniciId,
      );
  }
}

/**
 * Bir ürünün detayını görebilir mi?
 *
 * Paylaşılmamış ürünü YALNIZCA SAHİBİ görür. Adresi tahmin ederek başkasının
 * paylaşmadığı ürününe bakmanın yolu yok: kural burada, ekran da bunu
 * uyguluyor.
 */
export function urunGorunurMu(
  urun: Pick<MarketUrunu, "sahipKullaniciId" | "markettePaylasilsin">,
  oturumKullaniciId: number,
): boolean {
  return urun.markettePaylasilsin || urun.sahipKullaniciId === oturumKullaniciId;
}

/**
 * Görüntülenme sayacı artmalı mı?
 *
 * Sahibinin kendi ürününe bakması SAYILMAZ — sayaç bir vitrin sayısıdır ve
 * kişinin kendi sayfasını yenileyerek şişirebilmesi, ürünler arası
 * karşılaştırmayı anlamsız kılardı.
 */
export function sayacArtmaliMi(
  sahipKullaniciId: number,
  bakanKullaniciId: number,
): boolean {
  return sahipKullaniciId !== bakanKullaniciId;
}

/** Sayı biçimi: "1.240 görüntülenme" gibi metinlerde binlik ayracı. */
export function sayiYaz(sayi: number): string {
  return sayi.toLocaleString("tr-TR");
}
