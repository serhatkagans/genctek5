import type { MentorlukDurumu } from "@/generated/prisma/enums";

/**
 * Mentörlük kuralları (7 Ağustos 2026).
 *
 * Saf tutulur: veritabanına ve React'e bakmaz, birim testle kapsanır.
 *
 * ---------------------------------------------------------------------------
 * MENTÖRLÜK NEDİR
 * ---------------------------------------------------------------------------
 * Bir kişinin belirli ÇALIŞMA GRUPLARINDA ve serbestçe yazdığı KONULARDA
 * öğrencilere yol gösterebileceği beyanı — ve bu beyanın onaylanmış hâli.
 *
 * Kim olursa olsun aynı şeydir: GençTek öğretmeni de, dışarıdan başvuran
 * mezun/paydaş/mentör de aynı kaydı doldurur. Değişen tek şey ONAYI KİMİN
 * VERDİĞİDİR (bkz. lib/yetki/izinler.ts · mentorlukOnaylayabilirMi).
 *
 * ÖĞRENCİ MENTÖR OLAMAZ. Kural burada değil yetki katmanında duruyor ama
 * gerekçesi burada anlamlı: mentörlük 18 yaş altı bir kullanıcıyla birebir
 * yazışma hakkı doğurur ve o hakkın karşı tarafı yetişkin olmalıdır. Akran
 * desteği için "akran eğitimi" ve panodaki ekip arkadaşı ilanı var.
 */

export const MENTOR_KONULARI_AZAMI = 500;

/** Bir kişinin AKTİF mentör sayılması için gereken durum. */
export function mentorluguAktifMi(durum: MentorlukDurumu | null): boolean {
  return durum === "ONAYLANDI";
}

export const MENTORLUK_DURUM_ETIKETLERI: Record<MentorlukDurumu, string> = {
  BEKLIYOR: "Onay bekliyor",
  ONAYLANDI: "Onaylandı",
  REDDEDILDI: "Reddedildi",
  BIRAKILDI: "Bırakıldı",
};

export const MENTORLUK_DURUM_SINIFLARI: Record<MentorlukDurumu, string> = {
  BEKLIYOR: "bg-uyari-zemin text-uyari-metin",
  ONAYLANDI: "bg-olumlu-zemin text-olumlu-metin",
  REDDEDILDI: "bg-hata-zemin text-hata-metin",
  BIRAKILDI: "bg-zemin text-metin-yumusak",
};

export interface MentorlukGirdisi {
  /** Seçilen çalışma grubu kimlikleri; ham form değerleri olabilir. */
  grupIdleri: readonly unknown[];
  /** Serbest konu metni. */
  konular: string;
  /** Seçilebilir grupların kimlikleri — doğrulama bunlara karşı yapılır. */
  gecerliGrupIdleri: readonly number[];
}

export type MentorlukKarari =
  | { olurMu: true; grupIdleri: number[]; konular: string | null }
  | { olurMu: false; neden: string };

/**
 * Başvurunun kabul edilip edilmeyeceği.
 *
 * EN AZ BİR ALAN DOLU OLMALI: ya bir çalışma grubu seçilmeli ya da serbest
 * konu yazılmalı. İkisi de boş bir mentörlük, öğrencinin hangi konuda
 * başvuracağını bilemeyeceği bir kayıttır — panoda görünür ama hiçbir ilana
 * eşleşmez.
 *
 * GRUP KİMLİKLERİ LİSTEYE KARŞI DOĞRULANIR: form girdisine güvenilseydi
 * kapatılmış ya da hiç var olmayan bir gruba mentörlük beyan edilebilirdi.
 * Tekrarlananlar da eleniyor — aynı grup iki kez gönderildiğinde junction
 * tabloya ikinci satır yazılmaya çalışılır ve birincil anahtar çakışırdı.
 */
export function mentorlukKabulEdilirMi(
  girdi: MentorlukGirdisi,
): MentorlukKarari {
  const gecerliler = new Set(girdi.gecerliGrupIdleri);

  const secilenler = [
    ...new Set(
      girdi.grupIdleri
        .map((ham) => Number.parseInt(String(ham), 10))
        .filter((id) => Number.isInteger(id) && gecerliler.has(id)),
    ),
  ];

  const konular = girdi.konular.trim();
  if (konular.length > MENTOR_KONULARI_AZAMI) {
    return {
      olurMu: false,
      neden: `Konular en fazla ${MENTOR_KONULARI_AZAMI} karakter olabilir.`,
    };
  }

  if (secilenler.length === 0 && !konular) {
    return {
      olurMu: false,
      neden:
        "En az bir çalışma grubu seçin ya da mentörlük yapabileceğiniz konuları yazın. İkisi de boş bırakılırsa öğrenciler size hangi konuda başvuracağını bilemez.",
    };
  }

  return { olurMu: true, grupIdleri: secilenler, konular: konular || null };
}

export type KararGirdisi = {
  mevcutDurum: MentorlukDurumu;
  yeniDurum: MentorlukDurumu;
  retGerekcesi: string;
};

export type KararSonucu =
  | { olurMu: true; retGerekcesi: string | null }
  | { olurMu: false; neden: string };

/**
 * Onay/ret kararının geçerliliği.
 *
 * Yalnızca BEKLEYEN bir kayıt karara bağlanabilir: onaylanmış bir mentörlüğü
 * ikinci kez onaylamak sessizce karar tarihini kaydırır ve "ne zaman onaylandı"
 * sorusunun cevabını bozar. Zaten karara bağlanmış bir kayıt için doğru işlem
 * mentörlüğü kaldırmaktır.
 *
 * RET GEREKÇESİ ZORUNLU: gerekçesiz ret, kişiye tekrar başvururken neyi
 * düzelteceğini söylemez. Aynı kısıt veritabanında da var — karar iki ayrı
 * ekrandan verilebiliyor ve uygulama katmanındaki kontrol birinde unutulabilir.
 */
export function mentorlukKarariGecerliMi(girdi: KararGirdisi): KararSonucu {
  if (girdi.mevcutDurum !== "BEKLIYOR") {
    return {
      olurMu: false,
      neden: `Bu başvuru zaten karara bağlanmış (${MENTORLUK_DURUM_ETIKETLERI[girdi.mevcutDurum].toLowerCase()}).`,
    };
  }

  if (girdi.yeniDurum !== "ONAYLANDI" && girdi.yeniDurum !== "REDDEDILDI") {
    return { olurMu: false, neden: "Geçersiz karar." };
  }

  const gerekce = girdi.retGerekcesi.trim();
  if (girdi.yeniDurum === "REDDEDILDI" && !gerekce) {
    return { olurMu: false, neden: "Ret gerekçesi zorunludur." };
  }

  return {
    olurMu: true,
    retGerekcesi: girdi.yeniDurum === "REDDEDILDI" ? gerekce : null,
  };
}

/**
 * Mentörün kapsadığı konuların ekranda yazılışı.
 *
 * Grup adları ve serbest konular TEK LİSTEDE birleştirilir: öğrenci için ikisi
 * de "bu kişi neyi biliyor" sorusunun cevabıdır, hangisinin sabit listeden
 * hangisinin serbest metinden geldiği onu ilgilendirmiyor.
 */
export function mentorKapsamiYaz(
  grupAdlari: readonly string[],
  konular: string | null,
): string {
  const parcalar = [...grupAdlari];
  const serbest = konular?.trim();
  if (serbest) parcalar.push(serbest);
  return parcalar.join(" · ");
}
