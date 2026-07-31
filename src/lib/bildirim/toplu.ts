/**
 * Toplu duyuru kuralları — analiz isteği Bölüm 5.
 *
 * GERİ ALINAMAZ BİR İŞLEMDİR. Gönderilen bildirim binlerce panele düşer, e-posta
 * kopyası da gitmişse geri çağrılamaz. Bu yüzden kurallar "gönderilmesin"
 * tarafına eğimlidir: eksik bir duyuruyu tekrar göndermek, yanlış bir duyuruyu
 * geri almaktan kolaydır.
 *
 * Saf tutulur: veritabanına ve oturuma bakmaz, birim testle kapsanır.
 */

export const DUYURU_HEDEFLERI = ["OGRENCI", "OGRETMEN", "HERKES"] as const;
export type DuyuruHedefi = (typeof DUYURU_HEDEFLERI)[number];

export const DUYURU_HEDEF_ETIKETLERI: Record<DuyuruHedefi, string> = {
  OGRENCI: "Tüm öğrenciler",
  OGRETMEN: "Tüm öğretmenler",
  HERKES: "Öğrenciler ve öğretmenler",
};

export function duyuruHedefiMi(deger: string): deger is DuyuruHedefi {
  return (DUYURU_HEDEFLERI as readonly string[]).includes(deger);
}

/** Başlık ve metin için üst sınırlar; şablon alanlarıyla aynı büyüklükte. */
const BASLIK_MAKS = 200;
const ICERIK_MAKS = 4000;

export interface DuyuruGirdisi {
  hedef: string;
  baslik: string;
  icerik: string;
  /** Kullanıcının "gönderiyorum" onayı — kutu işaretlenmeden gönderilmez. */
  onaylandiMi: boolean;
}

export type DuyuruKarari =
  | { olurMu: true; hedef: DuyuruHedefi; baslik: string; icerik: string }
  | { olurMu: false; neden: string };

export function duyuruyuCoz(girdi: DuyuruGirdisi): DuyuruKarari {
  if (!duyuruHedefiMi(girdi.hedef)) {
    return { olurMu: false, neden: "Alıcı grubu seçilmelidir." };
  }

  const baslik = girdi.baslik.trim();
  const icerik = girdi.icerik.trim();

  if (!baslik) {
    return { olurMu: false, neden: "Duyuru başlığı boş bırakılamaz." };
  }
  if (baslik.length > BASLIK_MAKS) {
    return {
      olurMu: false,
      neden: `Başlık en fazla ${BASLIK_MAKS} karakter olabilir.`,
    };
  }
  if (!icerik) {
    return { olurMu: false, neden: "Duyuru metni boş bırakılamaz." };
  }
  if (icerik.length > ICERIK_MAKS) {
    return {
      olurMu: false,
      neden: `Duyuru metni en fazla ${ICERIK_MAKS} karakter olabilir.`,
    };
  }

  /*
   * Onay kutusu EN SONDA kontrol edilir: kullanıcı metnini yazıp kutuyu
   * unuttuysa önce metinle ilgili hataları görmeli, yoksa formu iki kez
   * doldurmak zorunda kalır.
   */
  if (!girdi.onaylandiMi) {
    return {
      olurMu: false,
      neden:
        "Göndermeden önce onay kutusunu işaretleyin. Duyuru geri alınamaz.",
    };
  }

  return { olurMu: true, hedef: girdi.hedef, baslik, icerik };
}

/**
 * Duyurunun kaç kişiye gideceğinin ekranda yazılması için.
 *
 * "Emin misiniz?" diye sormak yerine SAYIYI göstermek daha dürüst: kullanıcı
 * 12 kişiye mi 4000 kişiye mi gönderdiğini bilerek karar verir.
 */
export function aliciOzeti(hedef: DuyuruHedefi, sayilar: {
  ogrenci: number;
  ogretmen: number;
}): string {
  const toplam =
    hedef === "OGRENCI"
      ? sayilar.ogrenci
      : hedef === "OGRETMEN"
        ? sayilar.ogretmen
        : sayilar.ogrenci + sayilar.ogretmen;
  return `${toplam} kişi`;
}
