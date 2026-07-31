import type {
  BasvuruDurumu,
  EtkinlikKategorisi,
  FaaliyetDurumu,
  Kapsam,
  OnayDurumu,
  RolKodu,
  TemelEtkinlikGrubu,
} from "@/generated/prisma/enums";
import {
  danismanKurumKodu,
  danismanMi,
  faaliyetOnayGerekiyorMu,
  ilKoordinatoruMu,
  koordinatorIlKodu,
  projeYoneticisiMi,
} from "../yetki/izinler";
import type { OturumKullanicisi } from "../yetki/tipler";

/**
 * Faaliyet iş kuralları — references/domain-rules.md Bölüm 5 ve 6.
 *
 * Saf tutulur: veritabanına gitmez, tarih üretmez (şimdiki zaman parametre
 * olarak alınır). Böylece "başvuru penceresi açık mı", "kontenjan doldu mu"
 * gibi kararlar birim testle sınanabilir.
 */

/** Dar kapsamdan geniş kapsama; ekranlardaki sıralama da budur. */
export const KAPSAMLAR: Kapsam[] = ["OKUL", "IL", "ULUSAL"];

export const KAPSAM_ETIKETLERI: Record<Kapsam, string> = {
  OKUL: "Okul içi",
  IL: "İl geneli",
  ULUSAL: "Ulusal",
};

export const ONAY_DURUMU_ETIKETLERI: Record<OnayDurumu, string> = {
  ONAY_GEREKMEZ: "Yayında",
  BEKLIYOR: "Onay bekliyor",
  ONAYLANDI: "Onaylandı",
  REDDEDILDI: "Reddedildi",
};

export const BASVURU_DURUMU_ETIKETLERI: Record<BasvuruDurumu, string> = {
  BEKLIYOR: "Değerlendirmede",
  SECILDI: "Seçildi",
  YEDEK: "Yedek",
  REDDEDILDI: "Reddedildi",
  GERI_CEKILDI: "Geri çekildi",
  IPTAL_EDILDI: "Faaliyet iptal edildi",
};

export const FAALIYET_DURUMU_ETIKETLERI: Record<FaaliyetDurumu, string> = {
  AKTIF: "Aktif",
  IPTAL_EDILDI: "İptal edildi",
};

// ---------------------------------------------------------------------------
// Etkinlik kategorisi
// ---------------------------------------------------------------------------

/**
 * Etkinlik kategorisi KAPSAMDAN BAĞIMSIZDIR. Kapsam kimin başvurabileceğini
 * (okul / il / ulusal), kategori etkinliğin ne olduğunu söyler. Her kapsam her
 * kategoriyle birleşebilir; ikisini birbirine bağlamayın.
 */
export const ETKINLIK_KATEGORILERI: EtkinlikKategorisi[] = [
  "TEMEL_ETKINLIK",
  "CALISMA_GRUBU_ETKINLIGI",
  "IL_ETKINLIGI",
];

export const ETKINLIK_KATEGORISI_ETIKETLERI: Record<
  EtkinlikKategorisi,
  string
> = {
  TEMEL_ETKINLIK: "Temel Etkinlik",
  CALISMA_GRUBU_ETKINLIGI: "Çalışma Grubu Etkinliği",
  IL_ETKINLIGI: "İl Etkinliği",
};

export const ETKINLIK_KATEGORISI_ACIKLAMALARI: Record<
  EtkinlikKategorisi,
  string
> = {
  TEMEL_ETKINLIK:
    "GençTek'in ulusal düzeyde her yıl tekrarlanan programları. Adı sabit listeden seçilir.",
  CALISMA_GRUBU_ETKINLIGI:
    "Çalışma grubu öğrencilerinin yıl boyunca planlayıp yürüttüğü programlar. Adı sabit listeden seçilir.",
  IL_ETKINLIGI:
    "İl koordinatörlüğünün kendi iline özel tasarladığı temalı etkinlik. Adını siz belirlersiniz.",
};

/**
 * Kategorinin sabit program listesinden ad seçmesi gerekiyor mu?
 *
 * İl Etkinliği'nin referans listesi YOKTUR — faaliyetin ad alanı zaten temayı
 * taşır. Diğer iki kategoride ad serbest metin DEĞİLDİR, programdan gelir.
 */
export function programSecimiGerekiyorMu(
  kategori: EtkinlikKategorisi,
): boolean {
  return kategori !== "IL_ETKINLIGI";
}

/** Kategorinin karşılık geldiği referans tablosu grubu. */
export function kategoriProgramGrubu(
  kategori: EtkinlikKategorisi,
): TemelEtkinlikGrubu | null {
  return kategori === "IL_ETKINLIGI" ? null : kategori;
}

export interface EtkinlikKategorisiGirdisi {
  kategori: EtkinlikKategorisi;
  /** Seçilen programın grubu; program seçilmediyse null. */
  programGrubu: TemelEtkinlikGrubu | null;
  /** İl etkinliğinde zorunlu olan serbest faaliyet adı. */
  serbestAd: string | null;
}

/**
 * Kategori ile program eşleşmesini doğrular.
 *
 * Veritabanı kısıtı "program dolu mu / boş mu" sorusunu tutar ama programın
 * DOĞRU GRUPTAN olduğunu tutamaz (kısıt iki tabloya birden bakamaz), o kontrol
 * burada yapılır.
 */
export function etkinlikKategorisiDogrula(
  girdi: EtkinlikKategorisiGirdisi,
): { olurMu: boolean; neden?: string } {
  if (!programSecimiGerekiyorMu(girdi.kategori)) {
    if (!girdi.serbestAd) {
      return { olurMu: false, neden: "İl etkinliğinde faaliyet adı zorunludur." };
    }
    return { olurMu: true };
  }

  if (girdi.programGrubu === null) {
    return {
      olurMu: false,
      neden: `${ETKINLIK_KATEGORISI_ETIKETLERI[girdi.kategori]} için listeden bir program seçilmelidir.`,
    };
  }

  if (girdi.programGrubu !== kategoriProgramGrubu(girdi.kategori)) {
    return {
      olurMu: false,
      neden: "Seçilen program bu etkinlik kategorisine ait değil.",
    };
  }

  return { olurMu: true };
}

/**
 * Kullanıcının açabileceği kapsamlar.
 *
 * Danışman öğretmen yalnızca kendi okulunda faaliyet açar. YEĞİTEK'e okul
 * kapsamı SUNULMAZ: tek bir okulun faaliyetini o okulun sorumlusu açar, merkez
 * il ve ulusal düzeyde çalışır. Yetki matrisi (faaliyetAcabilirMi) merkeze okul
 * kapsamını da açık bırakır; burada yalnızca ekranda teklif edilenleri
 * belirliyoruz.
 */
export function kapsamSecenekleri(kullanici: OturumKullanicisi): Kapsam[] {
  if (projeYoneticisiMi(kullanici)) return ["IL", "ULUSAL"];
  if (ilKoordinatoruMu(kullanici)) return ["IL", "ULUSAL"];
  if (danismanMi(kullanici)) return ["OKUL"];
  return [];
}

export function faaliyetAcmaYetkisiVarMi(
  kullanici: OturumKullanicisi,
): boolean {
  return kapsamSecenekleri(kullanici).length > 0;
}

/** İl koordinatörünün açtığı ulusal faaliyet YEĞİTEK onayı bekler. */
export function onayDurumuBelirle(
  kullanici: OturumKullanicisi,
  kapsam: Kapsam,
): OnayDurumu {
  return faaliyetOnayGerekiyorMu(kullanici, kapsam)
    ? "BEKLIYOR"
    : "ONAY_GEREKMEZ";
}

export class FaaliyetKuralHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "FaaliyetKuralHatasi";
  }
}

export interface FaaliyetYeri {
  kurumKodu: number | null;
  ilKodu: string | null;
}

/**
 * Faaliyetin yer alanlarını kullanıcının kapsamından üretir.
 *
 * Yer bilgisi FORMDAN GELMEZ, roldan gelir: aksi halde bir danışman öğretmen
 * başka okulun adına, bir koordinatör başka ilin adına faaliyet açabilirdi.
 * Tek istisna, YEĞİTEK'in il faaliyeti açarken ili seçmesidir.
 */
export function faaliyetYeriBelirle(
  kullanici: OturumKullanicisi,
  kapsam: Kapsam,
  secilenIlKodu?: string | null,
): FaaliyetYeri {
  switch (kapsam) {
    case "OKUL": {
      const kurumKodu = danismanKurumKodu(kullanici) ?? kullanici.kurumKodu;
      if (kurumKodu === null) {
        throw new FaaliyetKuralHatasi(
          "Okul içi faaliyet için okul bilgisi olan bir görev gerekir.",
        );
      }
      return { kurumKodu, ilKodu: null };
    }
    case "IL": {
      const ilKodu = projeYoneticisiMi(kullanici)
        ? (secilenIlKodu ?? null)
        : koordinatorIlKodu(kullanici);
      if (!ilKodu) {
        throw new FaaliyetKuralHatasi("İl geneli faaliyet için il seçilmeli.");
      }
      return { kurumKodu: null, ilKodu };
    }
    case "ULUSAL":
      return { kurumKodu: null, ilKodu: null };
  }
}

/**
 * Faaliyet kartında görünen "düzenleyen birim" metni.
 *
 * Birim KAPSAMDAN değil AÇANDAN türer. İl koordinatörünün açtığı ulusal
 * faaliyet de onun koordinatörlüğünün adıyla anılır: merkez onayladı diye
 * faaliyet merkeze mal edilmez, çünkü katılımcı "bunu kim düzenliyor" sorusunun
 * cevabını burada arar.
 */
export function duzenleyenBirimBelirle(
  kullanici: OturumKullanicisi,
  kapsam: Kapsam,
  adlar: { okulAdi?: string | null; ilAdi?: string | null },
): string {
  if (kapsam === "OKUL") return adlar.okulAdi ?? "Okul";
  if (ilKoordinatoruMu(kullanici) || (kapsam === "IL" && !projeYoneticisiMi(kullanici))) {
    return adlar.ilAdi ? `${adlar.ilAdi} İl Koordinatörlüğü` : "İl Koordinatörlüğü";
  }
  // YEĞİTEK'in açtığı il faaliyeti de merkez adına düzenlenir.
  if (kapsam === "IL") {
    return adlar.ilAdi ? `MEB YEĞİTEK · ${adlar.ilAdi}` : "MEB YEĞİTEK";
  }
  return "MEB YEĞİTEK";
}

export type PencereDurumu = "ACILMADI" | "ACIK" | "KAPANDI";

export function basvuruPenceresi(
  faaliyet: { basvuruBaslangic: Date; basvuruBitis: Date },
  simdi: Date,
): PencereDurumu {
  if (simdi < faaliyet.basvuruBaslangic) return "ACILMADI";
  if (simdi > faaliyet.basvuruBitis) return "KAPANDI";
  return "ACIK";
}

/**
 * Kontenjanı dolduran başvuru durumları.
 *
 * Kontenjan yalnızca SEÇİLENLERİ değil TÜM AKTİF BAŞVURULARI sınırlar: red ve
 * geri çekme dışındaki her başvuru bir yer tutar. Reddedilen ya da geri çekilen
 * başvurunun yeri anında boşalır.
 */
export const AKTIF_BASVURU_DURUMLARI: BasvuruDurumu[] = [
  "BEKLIYOR",
  "SECILDI",
  "YEDEK",
];

export interface KontenjanDurumu {
  kontenjan: number;
  secilen: number;
  bekleyen: number;
  yedek: number;
  /** Yer tutan başvuru sayısı: BEKLIYOR + SECILDI + YEDEK. */
  aktifBasvuru: number;
  kalanYer: number;
  doluMu: boolean;
}

/**
 * Kontenjan durumu — CANLI hesaplanır, sayaç tutulmaz.
 *
 * Statik bir sayaç tutulsaydı red/geri çekme sonrası açılan yerler sistemde
 * "dolu" görünmeye devam ederdi. Her başvuru denemesinde aktif başvurular
 * yeniden sayılır.
 */
export function kontenjanDurumu(
  basvurular: { durum: BasvuruDurumu }[],
  kontenjan: number,
): KontenjanDurumu {
  const say = (durum: BasvuruDurumu) =>
    basvurular.filter((basvuru) => basvuru.durum === durum).length;

  const secilen = say("SECILDI");
  const bekleyen = say("BEKLIYOR");
  const yedek = say("YEDEK");
  const aktifBasvuru = secilen + bekleyen + yedek;

  return {
    kontenjan,
    secilen,
    bekleyen,
    yedek,
    aktifBasvuru,
    kalanYer: Math.max(kontenjan - aktifBasvuru, 0),
    doluMu: aktifBasvuru >= kontenjan,
  };
}

/**
 * Kontenjan bu değerin altına DÜŞÜRÜLEMEZ.
 *
 * Zaten seçilmiş öğrencilerin seçimini geri almak anlamına gelirdi; düzenleme
 * ekranı bunu engeller (ör. 40 kişi seçilmişse kontenjan 30 yapılamaz).
 */
export function kontenjanAltSiniri(durum: KontenjanDurumu): number {
  return Math.max(durum.secilen, 1);
}

export function kontenjanDegisikligiGecerliMi(
  yeniKontenjan: number,
  durum: KontenjanDurumu,
): { olurMu: boolean; neden?: string } {
  if (!Number.isInteger(yeniKontenjan) || yeniKontenjan < 1) {
    return { olurMu: false, neden: "Kontenjan en az 1 olmalıdır." };
  }
  if (yeniKontenjan < durum.secilen) {
    return {
      olurMu: false,
      neden: `Kontenjan seçilen öğrenci sayısının (${durum.secilen}) altına düşürülemez.`,
    };
  }
  return { olurMu: true };
}

/**
 * Öğrencinin başvurabilmesi için: faaliyet iptal edilmemiş ve yayında olmalı,
 * pencere açık olmalı, aktif bir başvurusu bulunmamalı ve kontenjan dolmamış
 * olmalı.
 *
 * KONTENJAN ARTIK İLK BAŞVURUYU DA ENGELLER. Kontenjan aktif başvuru sayısını
 * sınırlar (yedek dahil); dolduğunda sistem yeni başvuru kabul etmez. Bir
 * başvuru reddedilir veya geri çekilirse yer anında açılır — bu yüzden dolu
 * olup olmadığı her denemede yeniden sayılır, sayaç tutulmaz.
 */
export function basvuruYapilabilirMi(girdi: {
  pencere: PencereDurumu;
  onayDurumu: OnayDurumu;
  faaliyetDurumu?: FaaliyetDurumu;
  mevcutBasvuruDurumu?: BasvuruDurumu | null;
  kontenjanDoluMu?: boolean;
}): { olurMu: boolean; neden?: string } {
  if (girdi.faaliyetDurumu === "IPTAL_EDILDI") {
    return { olurMu: false, neden: "Bu faaliyet iptal edildi." };
  }
  if (girdi.onayDurumu === "BEKLIYOR") {
    return { olurMu: false, neden: "Faaliyet henüz onaylanmadı." };
  }
  if (girdi.onayDurumu === "REDDEDILDI") {
    return { olurMu: false, neden: "Faaliyet reddedildi." };
  }
  if (girdi.pencere === "ACILMADI") {
    return { olurMu: false, neden: "Başvurular henüz açılmadı." };
  }
  if (girdi.pencere === "KAPANDI") {
    return { olurMu: false, neden: "Başvuru süresi doldu." };
  }
  if (
    girdi.mevcutBasvuruDurumu &&
    girdi.mevcutBasvuruDurumu !== "GERI_CEKILDI" &&
    girdi.mevcutBasvuruDurumu !== "IPTAL_EDILDI"
  ) {
    return { olurMu: false, neden: "Bu faaliyete zaten başvurdunuz." };
  }
  if (girdi.kontenjanDoluMu) {
    return {
      olurMu: false,
      neden: "Kontenjan doldu; bu faaliyete yeni başvuru alınamıyor.",
    };
  }
  return { olurMu: true };
}

// ---------------------------------------------------------------------------
// Katılımcı tipi ve vekaleten başvuru
// ---------------------------------------------------------------------------

/**
 * Katılımcının öğrenci mi öğretmen mi olduğu VERİDE TUTULMAZ, aktif rolünden
 * okunur (bkz. prisma/schema.prisma · Basvuru). Kopyalanan bir tip alanı,
 * öğrenci mezun olduğunda ya da öğretmen görev değiştirdiğinde eskirdi.
 */
export type KatilimciTipi = "OGRENCI" | "OGRETMEN";

export const KATILIMCI_TIPI_ETIKETLERI: Record<KatilimciTipi, string> = {
  OGRENCI: "Öğrenci",
  OGRETMEN: "Öğretmen",
};

export function katilimciTipi(
  roller: readonly { rolKodu: RolKodu }[],
): KatilimciTipi {
  return roller.some((rol) => rol.rolKodu === "OGRENCI")
    ? "OGRENCI"
    : "OGRETMEN";
}

/**
 * Danışman öğretmen / il koordinatörü başkasının adına başvurabilir mi?
 *
 * Üç sınır var:
 *   1. Vekaleten başvuru YALNIZCA ÖĞRENCİ için yapılır. Analiz dokümanı 4.2
 *      bunu öğrenci adına başvuru olarak tanımlıyor; bir öğretmenin başka bir
 *      öğretmen adına başvurması, katılımın kişisel kararı olmasına aykırı.
 *   2. Kişi kendi adına "vekaleten" başvuramaz — o zaten normal başvurudur ve
 *      veritabanında da kısıtla (ck_basvuru_vekalet_baskasi) engellenir.
 *   3. Öğrencinin o faaliyete aktif başvurusu varsa ikincisi açılmaz; bu
 *      kontrol basvuruYapilabilirMi'de, mevcut başvuru durumu üzerinden yapılır.
 *
 * Kapsam kontrolü (öğrenci bu kişinin kapsamında mı) BURADA YOKTUR ve
 * çağıranın sorumluluğundadır: bu dosya veritabanına bakmaz.
 */
export function vekaletenBasvuruGecerliMi(girdi: {
  hedefTipi: KatilimciTipi;
  vekilKullaniciId: number;
  hedefKullaniciId: number;
}): { olurMu: boolean; neden?: string } {
  if (girdi.hedefTipi !== "OGRENCI") {
    return {
      olurMu: false,
      neden: "Adına başvuru yalnızca öğrenciler için yapılabilir.",
    };
  }
  if (girdi.vekilKullaniciId === girdi.hedefKullaniciId) {
    return {
      olurMu: false,
      neden: "Kendi adınıza başvuruyu doğrudan yapabilirsiniz.",
    };
  }
  return { olurMu: true };
}

/**
 * Ulusal faaliyete başvuran öğrencinin danışmanına kopya bildirim gider mi?
 *
 * Kural yalnızca BAŞKA İLDEN yapılan başvuruyu kapsar
 * (references/domain-rules.md Bölüm 8): danışmanın haberdar olması gereken şey,
 * öğrencisinin kendi ilinin dışındaki bir organizasyona katılacak olmasıdır.
 * Onay aranmaz, bildirim salt haber niteliğindedir.
 *
 * YEĞİTEK'in açtığı ulusal faaliyetin bir ili yoktur; öğrenci "dışarıya"
 * başvurmuş sayılmaz ve kopya gitmez. Aksi halde her merkezî etkinlikte
 * ülkedeki bütün danışmanlar bildirim yağmuruna tutulurdu.
 */
export function danismanaKopyaGerekiyorMu(girdi: {
  kapsam: Kapsam;
  ogrenciIlKodu: string | null;
  /** Faaliyeti düzenleyen birimin ili; merkez düzenlediyse null. */
  duzenleyenIlKodu: string | null;
}): boolean {
  if (girdi.kapsam !== "ULUSAL") return false;
  if (girdi.duzenleyenIlKodu === null) return false;
  return girdi.ogrenciIlKodu !== girdi.duzenleyenIlKodu;
}

/**
 * Başvuru "seçildi" yapılabilir mi?
 *
 * Kontenjan aktif başvuruyu zaten sınırladığı için seçilen sayısı normal akışta
 * kontenjanı aşamaz; bu kontrol kontenjanın sonradan düşürüldüğü ya da veri
 * elle değiştirildiği durumlar için savunma hattıdır. Yedek ve red sınırsızdır:
 * ikisi de yer TUTMAZ değil, tutulan yeri serbest bırakır ya da korur.
 */
export function degerlendirmeYapilabilirMi(
  yeniDurum: BasvuruDurumu,
  durum: KontenjanDurumu,
): { olurMu: boolean; neden?: string } {
  if (yeniDurum === "SECILDI" && durum.secilen >= durum.kontenjan) {
    return {
      olurMu: false,
      neden: `Kontenjan dolu (${durum.secilen}/${durum.kontenjan}). Öğrenciyi yedek listesine alabilirsiniz.`,
    };
  }
  if (yeniDurum === "GERI_CEKILDI") {
    return {
      olurMu: false,
      neden: "Başvuruyu yalnızca öğrencinin kendisi geri çekebilir.",
    };
  }
  if (yeniDurum === "IPTAL_EDILDI") {
    return {
      olurMu: false,
      neden:
        "Bu durum yalnızca faaliyet iptal edildiğinde sistem tarafından yazılır.",
    };
  }
  return { olurMu: true };
}

// ---------------------------------------------------------------------------
// Faaliyet düzenleme ve iptal
// ---------------------------------------------------------------------------

/**
 * Onaylanmış ulusal faaliyette KRİTİK alanların değişmesi onayı düşürür.
 *
 * Proje yöneticisi belli bir tarihe ve kapsama onay verdi; bunlar değişirse
 * onay artık başka bir faaliyete ait olur. Yalnızca kontenjan ARTIŞI istisnadır:
 * daha çok öğrenciye kapı açmak onayın konusunu değiştirmez.
 */
export function yenidenOnayGerekiyorMu(girdi: {
  onayDurumu: OnayDurumu;
  tarihDegistiMi: boolean;
  kontenjanAzaldiMi: boolean;
}): boolean {
  if (girdi.onayDurumu !== "ONAYLANDI") return false;
  return girdi.tarihDegistiMi || girdi.kontenjanAzaldiMi;
}

/** İptal edilmiş faaliyet yeni içerik (yorum, dosya) kabul etmez. */
export function faaliyetIcerikAlabilirMi(durum: FaaliyetDurumu): boolean {
  return durum === "AKTIF";
}
