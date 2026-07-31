/**
 * Bildirim şablonu doldurma ve şablon TANIMLARI.
 *
 * Şablon metinleri veritabanında tutulur (bildirim_sablonu) ve Yönetim
 * ekranından düzenlenir; kodda yalnızca hangi kodun hangi olayda gittiği ve
 * hangi değişkenleri taşıdığı yazılıdır. Kod listesi burada durmak zorunda:
 * şablonu tetikleyen olay kodda yaşıyor, veritabanına elle yeni bir satır
 * eklemek kendiliğinden yeni bir bildirim üretmez.
 *
 * Bu dosya veritabanına BAKMAZ; kurallar birim testlerle doğrulanır.
 */

export const BILDIRIM_KODLARI = {
  BASVURU_SONUCU: "BASVURU_SONUCU",
  DANISMAN_DEGISTI: "DANISMAN_DEGISTI",
  DANISMAN_YENIDEN_SECIM: "DANISMAN_YENIDEN_SECIM",
  KOORDINATOR_DEVREDILEBILIR_OGRENCI: "KOORDINATOR_DEVREDILEBILIR_OGRENCI",
  ONAY_BEKLEYEN_ULUSAL_FAALIYET: "ONAY_BEKLEYEN_ULUSAL_FAALIYET",
  /** Öğrenci faaliyet açtı; il koordinatörüne ve YEĞİTEK'e birlikte gider. */
  ONAY_BEKLEYEN_OGRENCI_FAALIYETI: "ONAY_BEKLEYEN_OGRENCI_FAALIYETI",
  /** Danışman öğretmen faaliyet açtı; ilin koordinatörü onaylayacak. */
  ONAY_BEKLEYEN_OGRETMEN_FAALIYETI: "ONAY_BEKLEYEN_OGRETMEN_FAALIYETI",
  /** Öğrencinin kendi ili, il dışı başvurusuna karar verdi. */
  IL_DISI_BASVURU_KARARI: "IL_DISI_BASVURU_KARARI",
  /** Faaliyet onaylandı ya da reddedildi; faaliyeti açana gider. */
  FAALIYET_ONAY_SONUCU: "FAALIYET_ONAY_SONUCU",
  DANISMANA_KOPYA_ULUSAL_BASVURU: "DANISMANA_KOPYA_ULUSAL_BASVURU",
  OGRENCI_ATANAMADI: "OGRENCI_ATANAMADI",
  FAALIYET_IPTAL_EDILDI: "FAALIYET_IPTAL_EDILDI",
  /** Danışman öğretmen ya da il koordinatörü öğrenci adına başvuru yaptı. */
  ADINA_BASVURU_YAPILDI: "ADINA_BASVURU_YAPILDI",
  /** Adına yapılan başvuru, başvuran öğretmen tarafından geri çekildi. */
  ADINA_BASVURU_GERI_CEKILDI: "ADINA_BASVURU_GERI_CEKILDI",
  /** Öğrenci adına başvuran öğretmene giden sonuç kopyası. */
  ADINA_BASVURU_SONUCU: "ADINA_BASVURU_SONUCU",
} as const;

export type BildirimKodu =
  (typeof BILDIRIM_KODLARI)[keyof typeof BILDIRIM_KODLARI];

export interface BildirimSablonTanimi {
  kod: BildirimKodu;
  baslik: string;
  /** Şablonun hangi olayda ve kime gittiği. */
  aciklama: string;
  /** Konuda ve gövdede kullanılabilecek yer tutucular. */
  degiskenler: readonly string[];
}

/**
 * Yönetim ekranının gösterdiği şablon listesi.
 *
 * Değişken adları burada yazılı olduğu için ekran, metne elle yazılmış hatalı
 * bir yer tutucuyu ({{ogrenci}} gibi) KAYDETMEDEN ÖNCE yakalayabiliyor. Aksi
 * halde hata ancak bildirim gittiğinde, kullanıcının gözüne ham süslü parantez
 * olarak görünürdü.
 */
export const BILDIRIM_SABLON_TANIMLARI: readonly BildirimSablonTanimi[] = [
  {
    kod: BILDIRIM_KODLARI.BASVURU_SONUCU,
    baslik: "Başvuru sonucu",
    aciklama:
      "Başvurusu değerlendirilen katılımcıya gider (seçildi / yedek / reddedildi).",
    degiskenler: ["ogrenciAdSoyad", "faaliyetAdi", "sonuc"],
  },
  {
    kod: BILDIRIM_KODLARI.DANISMAN_DEGISTI,
    baslik: "Danışman değişikliği",
    aciklama:
      "Danışmanı değişen öğrenciye gider. Yeni danışmanın adı metne YAZILMAZ; öğrenci panelinden görür.",
    degiskenler: [],
  },
  {
    kod: BILDIRIM_KODLARI.DANISMAN_YENIDEN_SECIM,
    baslik: "Yeniden danışman seçimi",
    aciklama:
      "Danışmanı görevden ayrıldığı için yeniden seçim yapması gereken öğrenciye gider.",
    degiskenler: [],
  },
  {
    kod: BILDIRIM_KODLARI.KOORDINATOR_DEVREDILEBILIR_OGRENCI,
    baslik: "Devredilebilir öğrenci uyarısı",
    aciklama:
      "Bir okulda danışman öğretmen göreve başladığında, o okulun öğrencilerini taşıyan il koordinatörüne gider.",
    degiskenler: ["okulAdi", "ogrenciSayisi"],
  },
  {
    kod: BILDIRIM_KODLARI.ONAY_BEKLEYEN_ULUSAL_FAALIYET,
    baslik: "Onay bekleyen ulusal faaliyet",
    aciklama:
      "İl koordinatörü ulusal faaliyet açtığında proje yöneticilerine gider.",
    degiskenler: ["faaliyetAdi", "duzenleyenAdSoyad"],
  },
  {
    kod: BILDIRIM_KODLARI.ONAY_BEKLEYEN_OGRENCI_FAALIYETI,
    baslik: "Onay bekleyen öğrenci faaliyeti",
    aciklama:
      "Öğrenci faaliyet açtığında hem öğrencinin ilinin koordinatörüne hem proje yöneticilerine gider. İkisi de onaylayabilir.",
    degiskenler: ["faaliyetAdi", "duzenleyenAdSoyad", "kapsam", "okulAdi"],
  },
  {
    kod: BILDIRIM_KODLARI.ONAY_BEKLEYEN_OGRETMEN_FAALIYETI,
    baslik: "Onay bekleyen öğretmen faaliyeti",
    aciklama:
      "Danışman öğretmen faaliyet açtığında okulun ilindeki koordinatöre gider. İlde koordinatör yoksa proje yöneticilerine düşer, faaliyet askıda kalmaz.",
    degiskenler: ["faaliyetAdi", "duzenleyenAdSoyad", "kapsam", "okulAdi"],
  },
  {
    kod: BILDIRIM_KODLARI.IL_DISI_BASVURU_KARARI,
    baslik: "İl dışı başvuru kararı",
    aciklama:
      "Öğrenci başka bir ilin etkinliğine başvurduğunda, kendi ilinin koordinatörü karar verince öğrenciye gider. Onay başvurunun bittiği anlamına GELMEZ; sıra etkinliğin ilindeki değerlendirmeye geçer.",
    degiskenler: ["ogrenciAdSoyad", "faaliyetAdi", "sonuc", "gerekce"],
  },
  {
    kod: BILDIRIM_KODLARI.FAALIYET_ONAY_SONUCU,
    baslik: "Faaliyet onay sonucu",
    aciklama:
      "Onaya sunulan faaliyet sonuçlandığında faaliyeti açan kullanıcıya gider.",
    degiskenler: ["faaliyetAdi", "sonuc", "kararVerenAdSoyad"],
  },
  {
    kod: BILDIRIM_KODLARI.DANISMANA_KOPYA_ULUSAL_BASVURU,
    baslik: "Danışmana ulusal başvuru kopyası",
    aciklama:
      "Öğrenci kendi ili dışındaki ulusal faaliyete başvurduğunda danışmanına gider. Onay değildir, salt haberdir.",
    degiskenler: ["ogrenciAdSoyad", "faaliyetAdi"],
  },
  {
    kod: BILDIRIM_KODLARI.OGRENCI_ATANAMADI,
    baslik: "Öğrenciye danışman atanamadı",
    aciklama:
      "Okulunda danışman öğretmen ve ilinde koordinatör bulunmadığında proje yöneticilerine gider.",
    degiskenler: ["ogrenciAdSoyad", "ilKodu"],
  },
  {
    kod: BILDIRIM_KODLARI.FAALIYET_IPTAL_EDILDI,
    baslik: "Faaliyet iptal edildi",
    aciklama: "Faaliyet iptal edildiğinde aktif başvuru sahiplerine gider.",
    degiskenler: ["faaliyetAdi", "gerekce"],
  },
  {
    kod: BILDIRIM_KODLARI.ADINA_BASVURU_YAPILDI,
    baslik: "Adınıza başvuru yapıldı",
    aciklama:
      "Danışman öğretmen ya da il koordinatörü öğrenci adına başvurduğunda öğrenciye gider.",
    degiskenler: ["ogrenciAdSoyad", "faaliyetAdi", "basvuranAdSoyad"],
  },
  {
    kod: BILDIRIM_KODLARI.ADINA_BASVURU_GERI_CEKILDI,
    baslik: "Adınıza yapılan başvuru geri çekildi",
    aciklama:
      "Öğrenci adına yapılan başvuru, başvuran öğretmen tarafından geri çekildiğinde öğrenciye gider.",
    degiskenler: ["ogrenciAdSoyad", "basvuranAdSoyad"],
  },
  {
    kod: BILDIRIM_KODLARI.ADINA_BASVURU_SONUCU,
    baslik: "Adına başvurulan öğrencinin sonucu",
    aciklama:
      "Öğrenci adına başvuran öğretmene, başvuru değerlendirildiğinde gider.",
    degiskenler: ["ogrenciAdSoyad", "faaliyetAdi", "sonuc"],
  },
];

export function sablonTanimiGetir(
  kod: string,
): BildirimSablonTanimi | undefined {
  return BILDIRIM_SABLON_TANIMLARI.find((tanim) => tanim.kod === kod);
}

const YER_TUTUCU = /\{\{(\w+)\}\}/g;

/** Metindeki tüm {{yerTutucu}} adlarını tekrarsız verir. */
export function yerTutuculariCikar(metin: string): string[] {
  const bulunanlar = new Set<string>();
  for (const eslesme of metin.matchAll(YER_TUTUCU)) {
    bulunanlar.add(eslesme[1]);
  }
  return [...bulunanlar];
}

/**
 * Şablon metnini doğrular.
 *
 * TANIMSIZ yer tutucu hatadır: metne yazılan {{ogrenci}} hiçbir zaman
 * dolmayacağı için bildirim kullanıcıya ham süslü parantezle ulaşır. Tanımlı
 * bir değişkenin KULLANILMAMASI ise hata değildir — metni kısaltmak metni
 * yazanın hakkı.
 */
export function sablonMetniGecerliMi(
  metin: string,
  izinliDegiskenler: readonly string[],
): { olurMu: boolean; neden?: string } {
  const kirpilmis = metin.trim();
  if (!kirpilmis) {
    return { olurMu: false, neden: "Metin boş bırakılamaz." };
  }

  const tanimsizlar = yerTutuculariCikar(kirpilmis).filter(
    (ad) => !izinliDegiskenler.includes(ad),
  );
  if (tanimsizlar.length > 0) {
    return {
      olurMu: false,
      neden: `Tanımsız değişken: ${tanimsizlar
        .map((ad) => `{{${ad}}}`)
        .join(", ")}. Kullanılabilir: ${izinliDegiskenler
        .map((ad) => `{{${ad}}}`)
        .join(", ")}`,
    };
  }

  return { olurMu: true };
}

/** Şablondaki {{degisken}} yer tutucularını doldurur. */
export function sablonuDoldur(
  sablon: string,
  degiskenler: Record<string, string>,
): string {
  return sablon.replace(YER_TUTUCU, (tamEslesme, anahtar: string) => {
    return degiskenler[anahtar] ?? tamEslesme;
  });
}
