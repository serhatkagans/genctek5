/**
 * Toplu belge üretiminin alıcı seçimi.
 *
 * Bu kararlar sayfa bileşeninin İÇİNDE yaşayamaz: aralarında bir güvenlik
 * sınırı var. Adres çubuğuna elle katılımcı kimliği yazan biri, o kimlik bu
 * faaliyetin seçilmiş katılımcısına ait değilse belge bastıramamalı. Sayfanın
 * içinde kaldığı sürece bu kural ancak tarayıcıyla elle sınanabilirdi; saf
 * fonksiyon olarak birim testle kapsanıyor.
 *
 * Saf tutulur: veritabanına ve React'e bakmaz.
 */

/**
 * Tek yazdırma işleminde üretilebilecek azami belge sayısı.
 *
 * Sınırın nedeni tarayıcı: her belge tam sayfa bir arka plan görseli demek ve
 * yazdırma önizlemesi birkaç yüz sayfada donuyor. Sunucu tarafında bir maliyeti
 * yok, bu yüzden sınır veritabanı sorgusunda değil burada duruyor.
 */
export const AZAMI_BELGE_SAYISI = 200;

export interface TopluBelgeAdayi {
  katilimciId: number;
  adSoyad: string;
}

export type TopluSecimSonucu =
  | { durum: "hazir"; alicilar: TopluBelgeAdayi[] }
  | { durum: "katilimciYok" }
  | { durum: "eslesmeYok" }
  | { durum: "sinirAsildi"; istenen: number; azami: number };

/**
 * Adres parametresindeki katılımcı kimliklerini çözer.
 *
 * Next.js tekrarlı parametreyi tek seçimde `string`, çok seçimde `string[]`
 * olarak veriyor; ikisi de karşılanmak zorunda. Sayıya çevrilemeyen değerler
 * sessizce atılır — bozuk bir bağlantı yüzünden kullanıcıya hata göstermek
 * yerine o kimliği yok saymak doğru davranış, çünkü kesişim zaten aşağıda
 * yapılıyor ve geriye hiçbir şey kalmazsa bu ayrıca raporlanıyor.
 *
 * Parametre hiç verilmediğinde `null` döner: "hiçbiri seçilmedi" ile "tümü
 * kastedildi" ayrımı çağıranda kalır.
 */
export function katilimciIdleriniCoz(
  ham: string | string[] | undefined,
): number[] | null {
  if (ham === undefined) return null;

  const parcalar = Array.isArray(ham) ? ham : [ham];
  return parcalar
    .map((parca) => Number.parseInt(parca, 10))
    .filter((sayi) => Number.isInteger(sayi));
}

/**
 * Belge basılacak kişileri belirler.
 *
 * `adaylar` faaliyetin seçilmiş katılımcılarıdır; istenen kimlikler DAİMA
 * bu listeyle kesiştirilir. Hiç kimlik istenmediğinde listenin tamamı basılır —
 * ayrı bir "tümü" bayrağı yok, tek kural yeter.
 */
export function topluAlicilariSec(
  adaylar: TopluBelgeAdayi[],
  istenenIdler: number[] | null,
): TopluSecimSonucu {
  if (adaylar.length === 0) return { durum: "katilimciYok" };

  const secilenler =
    istenenIdler === null
      ? adaylar
      : adaylar.filter((aday) => istenenIdler.includes(aday.katilimciId));

  if (secilenler.length === 0) return { durum: "eslesmeYok" };

  if (secilenler.length > AZAMI_BELGE_SAYISI) {
    return {
      durum: "sinirAsildi",
      istenen: secilenler.length,
      azami: AZAMI_BELGE_SAYISI,
    };
  }

  return { durum: "hazir", alicilar: adSoyadaGoreSirala(secilenler) };
}

/**
 * Türkçe alfabeye göre sıralar.
 *
 * Sıra öngörülebilir olmak zorunda: basılan deste elle dağıtılırken yoklama
 * listesiyle eşleşmeli. Varsayılan sıralama "Işık"ı "İnci"den sonraya atardı;
 * Türkçede ı harfi i'den öncedir.
 */
function adSoyadaGoreSirala(alicilar: TopluBelgeAdayi[]): TopluBelgeAdayi[] {
  return [...alicilar].sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, "tr"));
}
