import type { OnayDurumu, TalepTuru } from "@/generated/prisma/enums";

/**
 * İletişim modülü kuralları — analiz isteği Bölüm 6.
 *
 * TEK CÜMLELİK TASARIM İLKESİ: gizli kanal yoktur.
 *
 * Yazışmalar, tarafların danışman öğretmenlerine, illerinin koordinatörlerine
 * ve proje yöneticilerine tam içerikle görünür. Kullanıcıların çoğu 18 yaş
 * altı; mahremiyet vaadi verilmiyor çünkü verilseydi tutulamazdı. Bu kural
 * ekranda kalıcı olarak yazılı ve aydınlatma metninde beyan edilmiş durumda —
 * gizli görünen ama okunan bir kanal, hiç olmamasından kötüdür.
 *
 * Saf tutulur: veritabanına ve oturuma bakmaz, birim testle kapsanır.
 */

const TALEP_BASLIK_MAKS = 200;
const TALEP_ICERIK_MAKS = 2000;
const ISTEK_MESAJ_MAKS = 1000;
const MESAJ_MAKS = 2000;

/** İlanın panoda görünür olması için: kapatılmamış ve süresi dolmamış. */
export function talepAktifMi(talep: {
  kapatildiMi: boolean;
  sonGecerlilik: Date;
  simdi: Date;
}): boolean {
  if (talep.kapatildiMi) return false;
  return talep.sonGecerlilik >= talep.simdi;
}

/**
 * Talep türleri — istek listesindeki dört başlık.
 *
 * SABİT LİSTE, çalışma grupları gibi yönetim ekranından büyütülebilir değil:
 * dördü de panonun ne işe yaradığını tanımlıyor ve her biri ekranda ayrı bir
 * anlam taşıyor (sponsor ilanı ile ekip arkadaşı ilanı aynı kitleye bakmıyor).
 * Beşinci bir tür gerekirse enum'a eklenir — bu bir migration'dır ve öyle
 * olmalı: tür listesi büyüdüğünde kimin ne göreceği yeniden düşünülmeli.
 */
export const TALEP_TURLERI: TalepTuru[] = [
  "EKIP_ARKADASI",
  "TEKNIK_DESTEK",
  "SPONSOR",
  "DUYURU",
];

export const TALEP_TURU_ETIKETLERI: Record<TalepTuru, string> = {
  EKIP_ARKADASI: "Ekip arkadaşı",
  TEKNIK_DESTEK: "Teknik destek",
  SPONSOR: "Sponsor",
  DUYURU: "Duyuru (tanıtım/yaygınlaştırma)",
};

/** Türü olmayan eski ilanlar için filtre ve rozet etiketi. */
export const TALEP_TURU_BELIRTILMEMIS = "Tür belirtilmemiş";

export function talepTuruGecerliMi(deger: string): deger is TalepTuru {
  return (TALEP_TURLERI as string[]).includes(deger);
}

export interface TalepGirdisi {
  baslik: string;
  icerik: string;
  sonGecerlilik: Date | null;
  tur: string | null;
}

export type TalepKarari =
  | {
      olurMu: true;
      baslik: string;
      icerik: string;
      sonGecerlilik: Date;
      tur: TalepTuru;
    }
  | { olurMu: false; neden: string };

/** Panoya ilan açarken en fazla ileri gidilebilecek gün sayısı. */
export const TALEP_AZAMI_GUN = 180;

export function talebiCoz(girdi: TalepGirdisi, simdi: Date): TalepKarari {
  const baslik = girdi.baslik.trim();
  const icerik = girdi.icerik.trim();

  /*
   * TÜR YENİ İLANLARDA ZORUNLU (6 Ağustos 2026). Sütun NULL kabul etmeye devam
   * ediyor ve eski ilanlar geriye dönük DOLDURULMADI: türü bilinmeyen bir ilana
   * "duyuru" demek, filtrelenen listeyi sessizce yanlışlardı. Kural yalnızca bu
   * kapıdan geçen yeni ilana uygulanır.
   */
  const ham = (girdi.tur ?? "").trim();
  if (!ham) return { olurMu: false, neden: "Talep türü seçilmelidir." };
  if (!talepTuruGecerliMi(ham)) {
    return { olurMu: false, neden: "Talep türü anlaşılamadı." };
  }
  const tur: TalepTuru = ham;

  if (!baslik) return { olurMu: false, neden: "İlan başlığı boş bırakılamaz." };
  if (baslik.length > TALEP_BASLIK_MAKS) {
    return {
      olurMu: false,
      neden: `Başlık en fazla ${TALEP_BASLIK_MAKS} karakter olabilir.`,
    };
  }
  if (!icerik) return { olurMu: false, neden: "İlan metni boş bırakılamaz." };
  if (icerik.length > TALEP_ICERIK_MAKS) {
    return {
      olurMu: false,
      neden: `İlan metni en fazla ${TALEP_ICERIK_MAKS} karakter olabilir.`,
    };
  }

  if (girdi.sonGecerlilik === null) {
    return { olurMu: false, neden: "Son geçerlilik tarihi seçilmelidir." };
  }
  if (girdi.sonGecerlilik <= simdi) {
    return {
      olurMu: false,
      neden: "Son geçerlilik tarihi bugünden sonra olmalıdır.",
    };
  }

  /*
   * Üst sınır var çünkü sınırsız ilan pano çürümesi demek: iki yıl önce
   * açılmış, sahibi mezun olmuş bir ilan listede durmaya devam ederdi.
   */
  const azami = new Date(simdi.getTime() + TALEP_AZAMI_GUN * 86_400_000);
  if (girdi.sonGecerlilik > azami) {
    return {
      olurMu: false,
      neden: `Son geçerlilik en fazla ${TALEP_AZAMI_GUN} gün sonrası olabilir.`,
    };
  }

  return {
    olurMu: true,
    baslik,
    icerik,
    sonGecerlilik: girdi.sonGecerlilik,
    tur,
  };
}

/**
 * Bağlantı isteği gönderilebilir mi?
 *
 * Kendine istek gönderilemez ve aynı kişiye ikinci bir BEKLEYEN istek
 * açılamaz — reddedilen bir isteği tekrar tekrar göndermek taciz aracına
 * dönüşürdü. Karara bağlanmış istek geçmişte kalır, yenisi açılabilir.
 */
export function baglantiIstegiGonderilebilirMi(girdi: {
  isteyenId: number;
  hedefId: number;
  bekleyenIstekVarMi: boolean;
  onayliBaglantiVarMi: boolean;
}): { olurMu: boolean; neden?: string } {
  if (girdi.isteyenId === girdi.hedefId) {
    return { olurMu: false, neden: "Kendinize bağlantı isteği gönderemezsiniz." };
  }
  if (girdi.onayliBaglantiVarMi) {
    return {
      olurMu: false,
      neden: "Bu kişiyle zaten bir yazışmanız var.",
    };
  }
  if (girdi.bekleyenIstekVarMi) {
    return {
      olurMu: false,
      neden: "Bu kişiye gönderdiğiniz bir istek zaten onay bekliyor.",
    };
  }
  return { olurMu: true };
}

export interface IstekKarari {
  onaylandiMi: boolean;
  gerekce: string;
}

export type IstekSonucu =
  | { olurMu: true; durum: OnayDurumu; gerekce: string | null }
  | { olurMu: false; neden: string };

/**
 * Bağlantı isteğine verilen karar.
 *
 * Ret gerekçesi zorunlu: öğrenci neden bağlanamadığını öğrenmeli. Onayda
 * söylenecek bir şey yok.
 */
export function istekKarariniCoz(karar: IstekKarari): IstekSonucu {
  const gerekce = karar.gerekce.trim();
  if (karar.onaylandiMi) {
    return { olurMu: true, durum: "ONAYLANDI", gerekce: gerekce || null };
  }
  if (!gerekce) {
    return {
      olurMu: false,
      neden: "Ret gerekçesi zorunludur: öğrenci nedenini görmeli.",
    };
  }
  return { olurMu: true, durum: "REDDEDILDI", gerekce };
}

/** Yazışmaya mesaj yazılabilir mi? */
export function mesajYazilabilirMi(girdi: {
  onayDurumu: OnayDurumu;
  yazismaKapatildiMi: boolean;
}): { olurMu: boolean; neden?: string } {
  if (girdi.onayDurumu !== "ONAYLANDI") {
    return { olurMu: false, neden: "Bu bağlantı onaylanmadı." };
  }
  if (girdi.yazismaKapatildiMi) {
    return {
      olurMu: false,
      neden: "Bu yazışma kapatıldı; yeni mesaj yazılamaz.",
    };
  }
  return { olurMu: true };
}

export function mesajMetniniCoz(
  metin: string,
): { olurMu: true; icerik: string } | { olurMu: false; neden: string } {
  const icerik = metin.trim();
  if (!icerik) return { olurMu: false, neden: "Mesaj boş olamaz." };
  if (icerik.length > MESAJ_MAKS) {
    return {
      olurMu: false,
      neden: `Mesaj en fazla ${MESAJ_MAKS} karakter olabilir.`,
    };
  }
  return { olurMu: true, icerik };
}

export function istekMesajiniCoz(
  metin: string,
): { olurMu: true; mesaj: string } | { olurMu: false; neden: string } {
  const mesaj = metin.trim();
  if (!mesaj) {
    return {
      olurMu: false,
      neden: "Kendinizi tanıtan bir mesaj yazın; istek buna göre değerlendirilir.",
    };
  }
  if (mesaj.length > ISTEK_MESAJ_MAKS) {
    return {
      olurMu: false,
      neden: `Mesaj en fazla ${ISTEK_MESAJ_MAKS} karakter olabilir.`,
    };
  }
  return { olurMu: true, mesaj };
}

/**
 * Ekranda kalıcı olarak gösterilecek uyarı.
 *
 * Sabit olarak burada duruyor ki her ekranda aynı cümle çıksın; farklı
 * yerlerde farklı ifadelerle yazılsaydı bazıları zamanla yumuşar ve
 * "aslında kimse okumuyor" izlenimi doğardı.
 */
export const GIZLILIK_UYARISI =
  "Bu sistemdeki yazışmalar gizli değildir. Mesajlarınızı danışman öğretmeniniz, il koordinatörünüz ve proje yöneticileri okuyabilir.";
