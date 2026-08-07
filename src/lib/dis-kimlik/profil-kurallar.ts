/**
 * Mezun / paydaş temsilcisi / mentör profilinin KENDİ girdiği alanları
 * (7 Ağustos 2026).
 *
 * İstek: "1. sekme Profil · Foto · Bilgileri (il kurum görevi linkedin github
 * eposta açıklamalar/katkı sağlayabileceği şeyler)" ve "2. sekme Panel ·
 * Çalışma Grupları".
 *
 * Saf tutulur: veritabanına gitmez, "şimdi"yi üretmez — projedeki diğer kural
 * dosyalarıyla aynı desen (lib/dis-kimlik/kurallar.ts, lib/mentor/kurallar.ts).
 *
 * İL BURADA YOK: kişinin ili başvurudan gelir ve kimlik bilgisidir, kendisi
 * değiştiremez. Aynı sebeple ad, soyad ve e-posta da bu dosyanın dışındadır —
 * e-posta aynı zamanda giriş adıdır (bkz. dis_kimlik tablosu).
 */

/** Veritabanı sütunlarıyla birebir aynı (ogretmen_profil). */
export const KURUM_ADI_AZAMI = 150;
export const GOREV_UNVANI_AZAMI = 150;

/**
 * Katkı açıklamasının üst sınırı.
 *
 * Mentörlük konularından (500) uzun tutuldu: orası bir etiket listesidir
 * ("3B tasarım, Arduino"), burası kişinin ne yapabileceğini anlattığı serbest
 * metindir. Sınır yine de var — sınırsız metin, profil ekranını tek kişinin
 * özgeçmişine çevirirdi; asıl özgeçmiş zaten dosya olarak yükleniyor.
 */
export const KATKI_ACIKLAMASI_AZAMI = 2000;

export interface DisProfilGirdisi {
  kurumAdi: string;
  gorevUnvani: string;
  aciklama: string;
}

export interface DisProfilDegerleri {
  kurumAdi: string | null;
  gorevUnvani: string | null;
  aciklama: string | null;
}

export type DisProfilKarari =
  | { olurMu: true; degerler: DisProfilDegerleri }
  | { olurMu: false; neden: string };

/**
 * Alanların hiçbiri ZORUNLU DEĞİL.
 *
 * Onaylanmış bir kullanıcıdan yeni bilgi istemek, bilgiyi girene kadar profilini
 * kilitlemek demek olurdu; oysa kişinin sisteme girme hakkı başvurusu
 * onaylandığında doğdu. Boş bırakılan alan `null` yazılır, boş metin değil:
 * "hiç yazılmadı" ile "silindi" veritabanında aynı şeydir ve ekran ikisini de
 * "—" diye gösteriyor.
 */
export function disProfiliDogrula(girdi: DisProfilGirdisi): DisProfilKarari {
  const kurumAdi = girdi.kurumAdi.trim();
  if (kurumAdi.length > KURUM_ADI_AZAMI) {
    return {
      olurMu: false,
      neden: `Kurum adı en fazla ${KURUM_ADI_AZAMI} karakter olabilir.`,
    };
  }

  const gorevUnvani = girdi.gorevUnvani.trim();
  if (gorevUnvani.length > GOREV_UNVANI_AZAMI) {
    return {
      olurMu: false,
      neden: `Görev en fazla ${GOREV_UNVANI_AZAMI} karakter olabilir.`,
    };
  }

  const aciklama = girdi.aciklama.trim();
  if (aciklama.length > KATKI_ACIKLAMASI_AZAMI) {
    return {
      olurMu: false,
      neden: `Açıklama en fazla ${KATKI_ACIKLAMASI_AZAMI} karakter olabilir.`,
    };
  }

  return {
    olurMu: true,
    degerler: {
      kurumAdi: kurumAdi || null,
      gorevUnvani: gorevUnvani || null,
      aciklama: aciklama || null,
    },
  };
}

/**
 * Seçilen çalışma grubu kimliklerini ayıklar.
 *
 * LİSTEYE KARŞI DOĞRULANIR: form girdisine güvenilseydi kapatılmış ya da hiç
 * var olmayan bir gruba katkı beyan edilebilirdi. Tekrarlananlar da eleniyor —
 * aynı grup iki kez gönderildiğinde birincil anahtar çakışırdı
 * (mentorlukKabulEdilirMi ile aynı gerekçe).
 *
 * BOŞ SEÇİM GEÇERLİDİR ve hata değildir: kişi bütün gruplardan çıkmak
 * isteyebilir. Mentörlükten farkı bu — orada en az bir alan dolu olmalı, çünkü
 * konusuz bir mentörlük hiçbir ilanla eşleşmez.
 */
export function destekGruplariniAyikla(
  gelenIdler: readonly (string | number)[],
  gecerliGrupIdleri: readonly number[],
): number[] {
  const gecerliler = new Set(gecerliGrupIdleri);
  return [
    ...new Set(
      gelenIdler
        .map((ham) => Number.parseInt(String(ham), 10))
        .filter((id) => Number.isInteger(id) && gecerliler.has(id)),
    ),
  ];
}
