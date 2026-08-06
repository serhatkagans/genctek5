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
 * `DILIM` listede duruyor ama ÇALIŞMIYOR — tanımı yok (aşağıya bakın).
 */
export type MarketSuzgeci = "TUMU" | "BENIM" | "OGRENCI" | "OGRETMEN" | "DILIM";

export interface SuzgecTanimi {
  kod: MarketSuzgeci;
  etiket: string;
  /** Sekmenin altındaki açıklama; boş süzgeçte "neden boş" da buradan gelir. */
  aciklama: string;
  /**
   * Tanımı beklendiği için seçilemeyen süzgeç. Gizlenmiyor, açıklamasıyla
   * gösteriliyor: istekte sayılmış bir başlığı sessizce düşürmek, unutulduğu
   * izlenimi verirdi.
   */
  tanimBekliyorMu?: boolean;
}

export const MARKET_SUZGECLERI: readonly SuzgecTanimi[] = [
  {
    kod: "TUMU",
    etiket: "Tüm ürünler",
    aciklama: "Markette paylaşılan bütün ürünler.",
  },
  {
    /*
     * "Kendi Ürünlerim" DİĞERLERİNDEN FARKLI ÇALIŞIR: kişinin markette
     * PAYLAŞMADIĞI ürünlerini de gösterir. Sebebi, sekmenin adının istekte
     * "Ürünlerim" olması — kişi buraya kendi ürünlerini görmeye geliyor ve
     * paylaşmadıklarının kaybolması, onları sildiğini düşündürürdü. Paylaşım
     * durumu satırda rozetle yazıyor.
     */
    kod: "BENIM",
    etiket: "Kendi ürünlerim",
    aciklama:
      "Senin eklediğin ürünler. Markette paylaşmadıkların da burada görünür; onları senden başkası göremez.",
  },
  {
    kod: "OGRENCI",
    etiket: "Öğrenci ürünleri",
    aciklama: "Öğrencilerin markette paylaştığı ürünler.",
  },
  {
    kod: "OGRETMEN",
    etiket: "Öğretmen ürünleri",
    aciklama: "Öğretmenlerin markette paylaştığı ürünler.",
  },
  {
    /*
     * DİLİM NEDİR, BİLİNMİYOR. İstek listesinde süzgeçler arasında sayılıyor
     * ("Kendi Ürünlerim, Öğrenci ürünleri, Öğretmen Ürünleri, DİLİM vb") ama
     * ne olduğu hiçbir yerde yazmıyor ve sistemde böyle bir kavram yok
     * (→ SORULAR.md · S22).
     *
     * Diğer üçü kaydın SAHİBİNE bakarak süzüyor; DİLİM bir rol değil, bir
     * program/kategori adı gibi duruyor. Öyleyse ürüne bir kategori alanı
     * gerekir — ama hangi kategoriler olduğu, kimin atadığı ve zorunlu olup
     * olmadığı bilinmeden o alan açılamaz. Uydurulmuş bir kategoriyle
     * doldurmak, sonradan elle temizlenecek veri üretirdi.
     *
     * Tanım geldiğinde: `tanimBekliyorMu` kalkar, `urunleriSuz` içine bir dal
     * eklenir ve gerekiyorsa ürüne kategori alanı açılır.
     */
    kod: "DILIM",
    etiket: "DİLİM",
    aciklama:
      "Bu başlığın ne anlama geldiği henüz tanımlanmadı, bu yüzden süzgeç çalışmıyor. Tanım geldiğinde burası açılacak.",
    tanimBekliyorMu: true,
  },
];

export function suzgecTanimi(kod: string): SuzgecTanimi | null {
  return MARKET_SUZGECLERI.find((suzgec) => suzgec.kod === kod) ?? null;
}

/**
 * Adres çubuğundan gelen süzgeci çözer.
 *
 * Tanınmayan ya da henüz çalışmayan süzgeç sessizce TUMU'ye düşer — hata
 * sayfası göstermek, yer imine kaydedilmiş eski bir adres için sert bir
 * karşılık olurdu.
 */
export function suzgeciCoz(ham: string | undefined): MarketSuzgeci {
  const tanim = ham ? suzgecTanimi(ham) : null;
  if (!tanim || tanim.tanimBekliyorMu) return "TUMU";
  return tanim.kod;
}

/**
 * Ürün sahibinin market bakımından hangi kümeye girdiği.
 *
 * Rol listesi üzerinden karar veriliyor, tek bir "tip" alanı üzerinden değil:
 * bir kişi aynı anda birden çok rol taşıyabiliyor (danışman + il koordinatörü
 * gibi). Öğrenci rolü varsa öğrencidir; yoksa ve öğretmen/koordinatör rolü
 * varsa öğretmendir.
 *
 * DIŞ KULLANICILAR (mezun, paydaş temsilcisi) ikisine de girmez ve
 * "Öğrenci"/"Öğretmen" sekmelerinde görünmezler — ama "Tüm ürünler"de
 * görünürler. Mezunu öğrenci saymak yanlış olurdu (artık öğrenci değil),
 * öğretmen saymak da öyle.
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
      // Paylaşılmamışlar DA burada — sekmenin adı "Kendi ürünlerim".
      return urunler.filter((u) => u.sahipKullaniciId === oturumKullaniciId);
    case "OGRENCI":
      return urunler.filter(
        (u) => u.markettePaylasilsin && u.sahipKumesi === "OGRENCI",
      );
    case "OGRETMEN":
      return urunler.filter(
        (u) => u.markettePaylasilsin && u.sahipKumesi === "OGRETMEN",
      );
    /*
     * DILIM buraya DÜŞMEZ: `suzgeciCoz` onu TUMU'ye çeviriyor. Yine de dalı
     * eklemek, tanım geldiğinde derleyicinin burayı hatırlatmasını sağlıyor.
     */
    case "DILIM":
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
