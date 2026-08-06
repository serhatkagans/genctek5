import type { HedefDurumu } from "@/generated/prisma/enums";

/**
 * "Rotam" — öğrencinin hedefleri (D6).
 *
 * Saf kurallar: veritabanı, oturum ya da Next.js bilmez; girdi metinlerini
 * temizler ve kabul edilip edilmediğine karar verir. Sunucu eylemleri
 * (`app/panel/profil/hedef-eylemleri.ts`) yalnızca bu kararı uygular.
 *
 * KAZANIM KURALLARINDAN AYRI TUTULDU. İkisi de "kullanıcının kendi girdiği
 * metin" olsa da doğrulamaları örtüşmüyor: kazanımda tip zorunlu, tipe göre
 * alan açılıp kapanıyor ve tarih GEÇMİŞE bakıyor; hedefte tek biçim var ve
 * tarih GELECEĞE bakıyor. Ortak bir dosyada birleştirmek, her iki tarafın
 * kurallarını "hangi durumda hangisi geçerli" koşullarıyla iç içe geçirirdi.
 */

export const HEDEF_BASLIK_AZAMI = 250;
export const HEDEF_ACIKLAMA_AZAMI = 2000;

/**
 * Bir kişinin tutabileceği azami hedef sayısı.
 *
 * Sınır ÜRÜN gereği değil, taşma koruması: kayıt kişinin kendi profilinde
 * sınırsız satır açabilmesi demek ve profil sayfası hepsini tek seferde
 * basıyor. 30, "bu yıl ne yapmak istiyorum" ölçeğinde bir listeyi rahatça
 * alır; bir betiğin binlerce satır açmasını almaz.
 */
export const HEDEF_AZAMI_SAYI = 30;

export const HEDEF_DURUMLARI = [
  "PLANLANDI",
  "SURUYOR",
  "TAMAMLANDI",
] as const satisfies readonly HedefDurumu[];

export const HEDEF_DURUM_ETIKETLERI: Record<HedefDurumu, string> = {
  PLANLANDI: "Planladım",
  SURUYOR: "Üzerinde çalışıyorum",
  TAMAMLANDI: "Tamamladım",
};

/**
 * Durum rozetinin rengi. Tamamlanan hedef YEŞİL, süren MAVİ, planlanan NÖTR:
 * renk yalnızca ilerlemeyi gösterir, "planlandı" bir eksiklik değildir ve
 * uyarı rengiyle boyanmaz.
 */
export const HEDEF_DURUM_SINIFLARI: Record<HedefDurumu, string> = {
  PLANLANDI: "bg-yuzey-ikincil text-metin-yumusak",
  SURUYOR: "bg-vurgu-yumusak text-vurgu-metin",
  TAMAMLANDI: "bg-emerald-100 text-emerald-800",
};

export function hedefDurumuGecerliMi(deger: string): deger is HedefDurumu {
  return (HEDEF_DURUMLARI as readonly string[]).includes(deger);
}

export type HedefGirdisi = {
  baslik: string;
  aciklama: string;
  durum: string;
  /** Gün başına indirgenmiş tarih ya da null. */
  hedefTarihi: Date | null;
};

export type TemizHedef = {
  baslik: string;
  aciklama: string | null;
  durum: HedefDurumu;
  hedefTarihi: Date | null;
  tamamlanmaTarihi: Date | null;
};

export type HedefKarari =
  | { olurMu: false; neden: string }
  | { olurMu: true; kayit: TemizHedef };

/**
 * Hedef tarihi için üst sınır: bugünden 10 yıl sonrası.
 *
 * Alt sınır YOKTUR — geçmiş bir tarih kabul edilir. Öğrenci "Haziran'da
 * bitireyim" diye yazar, Haziran geçer ve hedef hâlâ sürüyor olabilir;
 * geçmiş tarihi reddetmek, kullanıcıyı kendi kaydını düzenleyemez hâle
 * getirirdi. Üst sınır ise parmak hatası içindir (2026 yerine 20260).
 */
const AZAMI_YIL_ILERI = 10;

export function hedefKabulEdilirMi(
  girdi: HedefGirdisi,
  simdi: Date = new Date(),
): HedefKarari {
  const baslik = girdi.baslik.trim();
  if (baslik.length === 0) return { olurMu: false, neden: "Hedef başlığı boş olamaz." };
  if (baslik.length > HEDEF_BASLIK_AZAMI) {
    return {
      olurMu: false,
      neden: `Hedef başlığı en fazla ${HEDEF_BASLIK_AZAMI} karakter olabilir.`,
    };
  }

  const aciklama = girdi.aciklama.trim();
  if (aciklama.length > HEDEF_ACIKLAMA_AZAMI) {
    return {
      olurMu: false,
      neden: `Açıklama en fazla ${HEDEF_ACIKLAMA_AZAMI} karakter olabilir.`,
    };
  }

  if (!hedefDurumuGecerliMi(girdi.durum)) {
    return { olurMu: false, neden: "Hedef durumu geçersiz." };
  }

  if (girdi.hedefTarihi !== null) {
    if (Number.isNaN(girdi.hedefTarihi.getTime())) {
      return { olurMu: false, neden: "Hedef tarihi geçersiz." };
    }
    const ustSinir = new Date(simdi);
    ustSinir.setFullYear(ustSinir.getFullYear() + AZAMI_YIL_ILERI);
    if (girdi.hedefTarihi > ustSinir) {
      return {
        olurMu: false,
        neden: `Hedef tarihi en fazla ${AZAMI_YIL_ILERI} yıl sonrası olabilir.`,
      };
    }
  }

  return {
    olurMu: true,
    kayit: {
      baslik,
      aciklama: aciklama || null,
      durum: girdi.durum,
      hedefTarihi: girdi.hedefTarihi,
      // Kayıt TAMAMLANDI olarak açılabilir (geçmişte yaptığı bir şeyi rotasına
      // sonradan yazan öğrenci). O durumda tamamlanma anı "şimdi"dir.
      tamamlanmaTarihi: girdi.durum === "TAMAMLANDI" ? simdi : null,
    },
  };
}

/**
 * Durum değişiminde `tamamlanmaTarihi`nin ne olacağı.
 *
 * Üç ayrı yerde (ekleme, düzenleme, tek tıkla durum değiştirme) aynı kararın
 * elle tekrarlanması, birinde unutulunca "tamamlandı ama tarihi yok" ya da
 * "tamamlanmadı ama tarihi var" kayıtları üretirdi.
 *
 * TAMAMLANDI → TAMAMLANDI geçişinde eski tarih KORUNUR: hedefin başlığını
 * düzenlemek, onu bugün tamamlanmış göstermemeli.
 */
export function tamamlanmaTarihiniCoz(
  yeniDurum: HedefDurumu,
  oncekiDurum: HedefDurumu | null,
  oncekiTarih: Date | null,
  simdi: Date = new Date(),
): Date | null {
  if (yeniDurum !== "TAMAMLANDI") return null;
  if (oncekiDurum === "TAMAMLANDI" && oncekiTarih !== null) return oncekiTarih;
  return simdi;
}

export type HedefOzeti = { toplam: number; tamamlanan: number; suren: number };

/** Kart başlığındaki "3 hedeften 1'i tamamlandı" özeti. */
export function hedefOzeti(
  hedefler: readonly { durum: HedefDurumu }[],
): HedefOzeti {
  return {
    toplam: hedefler.length,
    tamamlanan: hedefler.filter((h) => h.durum === "TAMAMLANDI").length,
    suren: hedefler.filter((h) => h.durum === "SURUYOR").length,
  };
}

/**
 * Listeleme sırası: önce SÜREN, sonra PLANLANAN, en sonda TAMAMLANAN.
 *
 * Tamamlananlar dibe iner çünkü rota İLERİYE bakar; biten işler listeyi
 * tıkamamalı. Aynı durum içinde tarihi olan öne gelir (yakın tarih önce),
 * tarihi olmayanlar en sona düşer — tarihsiz hedef "bir gün" demektir.
 */
const DURUM_SIRASI: Record<HedefDurumu, number> = {
  SURUYOR: 0,
  PLANLANDI: 1,
  TAMAMLANDI: 2,
};

export function hedefleriSirala<
  T extends { durum: HedefDurumu; hedefTarihi: Date | null; id: number },
>(hedefler: readonly T[]): T[] {
  return [...hedefler].sort((a, b) => {
    const durumFarki = DURUM_SIRASI[a.durum] - DURUM_SIRASI[b.durum];
    if (durumFarki !== 0) return durumFarki;

    if (a.hedefTarihi === null && b.hedefTarihi !== null) return 1;
    if (a.hedefTarihi !== null && b.hedefTarihi === null) return -1;
    if (a.hedefTarihi !== null && b.hedefTarihi !== null) {
      const tarihFarki = a.hedefTarihi.getTime() - b.hedefTarihi.getTime();
      if (tarihFarki !== 0) return tarihFarki;
    }

    // Son kırıcı: aynı durum ve aynı tarihte sıra RASTGELE olmamalı, yoksa
    // sayfa her yenilendiğinde satırlar yer değiştirir.
    return a.id - b.id;
  });
}
