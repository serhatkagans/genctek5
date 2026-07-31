/**
 * Düz metin içindeki bağlantıları bulup parçalara ayırır.
 *
 * NEDEN BÖYLE: metni HTML'e çevirip `dangerouslySetInnerHTML` ile basmak en
 * kısa yol olurdu ve en tehlikelisi. Açıklama alanını kullanıcı yazıyor;
 * içindeki `<script>` ya da `<img onerror=...>` doğrudan çalışırdı. Bu yüzden
 * metin HTML'e HİÇ çevrilmiyor: parçalara ayrılıyor, React her parçayı kendi
 * kaçışıyla basıyor. Bağlantı olmayan her şey metin olarak kalıyor.
 *
 * Saf tutulur: React'e, DOM'a ve veritabanına bakmaz, birim testle kapsanır.
 */

export type MetinParcasi =
  | { tip: "metin"; deger: string }
  | { tip: "baglanti"; deger: string; adres: string };

/*
 * Yalnızca http/https ve "www." ile başlayanlar yakalanır.
 *
 * `javascript:` ve `data:` KASITLI OLARAK dışarıda: bunlar tıklanınca kod
 * çalıştırabilen şemalardır ve bir faaliyet açıklamasında meşru bir karşılığı
 * yoktur. Desen onları hiç eşleştirmediği için ayrıca engellemeye gerek kalmaz.
 */
const BAGLANTI_DESENI = /\b(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

/*
 * Adresin sonuna yapışan noktalama işaretleri bağlantıya dahil edilmez:
 * "detaylar https://ornek.gov.tr/sayfa." cümlesinde nokta adrese ait değildir
 * ve dahil edilirse bağlantı kırılır.
 */
const SON_NOKTALAMA = /[.,;:!?'"]+$/;

/** Adres bir parantez içinde geçiyorsa kapanış parantezini dışarıda bırakır. */
function kapanisParantezleriniKirp(adres: string): string {
  let sonuc = adres;
  while (sonuc.endsWith(")")) {
    const acilan = (sonuc.match(/\(/g) ?? []).length;
    const kapanan = (sonuc.match(/\)/g) ?? []).length;
    if (kapanan <= acilan) break;
    sonuc = sonuc.slice(0, -1);
  }
  return sonuc;
}

function adresiTemizle(ham: string): string {
  return kapanisParantezleriniKirp(ham).replace(SON_NOKTALAMA, "");
}

/**
 * Tıklanabilir adresi üretir. "www." ile başlayanların başına https eklenir;
 * şemasız bir href tarayıcıda göreli yol sayılır ve site içinde 404'e gider.
 */
export function baglantiAdresi(gorunen: string): string {
  return /^https?:\/\//i.test(gorunen) ? gorunen : `https://${gorunen}`;
}

export function metniParcala(metin: string): MetinParcasi[] {
  const parcalar: MetinParcasi[] = [];
  let son = 0;

  // Desen `g` bayrağı taşıdığı için her çağrıda sıfırlanmalı; aksi halde
  // ardışık çağrılarda lastIndex kalıntısı yüzünden eşleşmeler atlanır.
  BAGLANTI_DESENI.lastIndex = 0;

  let eslesme: RegExpExecArray | null = BAGLANTI_DESENI.exec(metin);
  while (eslesme !== null) {
    const ham = eslesme[0];
    const gorunen = adresiTemizle(ham);

    // Kırpma sonrası geriye adres kalmadıysa (tek başına "www." gibi) metin say.
    if (gorunen.length === 0 || gorunen === "www.") {
      eslesme = BAGLANTI_DESENI.exec(metin);
      continue;
    }

    if (eslesme.index > son) {
      parcalar.push({ tip: "metin", deger: metin.slice(son, eslesme.index) });
    }

    parcalar.push({
      tip: "baglanti",
      deger: gorunen,
      adres: baglantiAdresi(gorunen),
    });

    // Kırpılan noktalama metne geri verilir, yutulmaz.
    son = eslesme.index + gorunen.length;
    eslesme = BAGLANTI_DESENI.exec(metin);
  }

  if (son < metin.length) {
    parcalar.push({ tip: "metin", deger: metin.slice(son) });
  }

  return parcalar;
}
