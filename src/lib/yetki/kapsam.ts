import type { Prisma } from "@/generated/prisma/client";
import type { PaydasTuru } from "@/generated/prisma/enums";
import {
  danismanKurumKodu,
  koordinatorIlKodu,
  ogrenciMi,
  projeYoneticisiMi,
} from "./izinler";
import type { OturumKullanicisi } from "./tipler";

/**
 * Kapsam filtresi — references/permissions.md Bölüm 2.
 *
 * Öğrenci sorgulayan HER yol bu filtreden geçmek zorundadır; istisnası yoktur.
 * Elle yazılan filtreler er geç bir endpoint'te unutulur ve veri sızar, o
 * yüzden filtreyi tek bir yerde üretiyoruz.
 *
 * Yetki belirlenemezse filtre "hiçbir kaydı döndürmeyen" hâle döner (fail
 * closed). Yanlış tarafa düşmek, veri sızdırmaktan iyidir.
 */

/** Hiçbir kaydı döndürmeyen filtre. */
const HICBIRI: Prisma.KullaniciWhereInput = { id: { in: [] } };

const AKTIF_OGRENCI: Prisma.KullaniciWhereInput = {
  roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
};

export function ogrenciKapsamFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.KullaniciWhereInput {
  // Proje yöneticisi: filtre yok (tüm iller).
  if (projeYoneticisiMi(kullanici)) {
    return AKTIF_OGRENCI;
  }

  // İl koordinatörü: yalnızca kendi ilindeki öğrenciler. Kendi açtığı ulusal
  // faaliyete başvuran diğer il öğrencileri BURAYA dahil değildir; o erişim
  // yalnızca değerlendirme ekranındadır (bkz. ulusalBasvuranFiltresi).
  const ilKodu = koordinatorIlKodu(kullanici);
  if (ilKodu !== null) {
    return { AND: [AKTIF_OGRENCI, { ilKodu }] };
  }

  // Danışman öğretmen: kendi okulundaki VE danışmanlığını üstlendiği öğrenciler.
  // Yalnızca kurum kodu eşitliği yetmez; aynı okuldaki diğer danışmanın
  // öğrencilerini göremez.
  const kurumKodu = danismanKurumKodu(kullanici);
  if (kurumKodu !== null) {
    return {
      AND: [
        AKTIF_OGRENCI,
        { kurumKodu },
        {
          ogrenciAtamalari: {
            some: { danismanKullaniciId: kullanici.id, bitisTarihi: null },
          },
        },
      ],
    };
  }

  // Öğrenci: yalnızca kendisi. İl Temsilcisi / Okul Temsilcisi görev rolleri
  // burada istisna değildir — hiçbir ek görüntüleme yetkisi vermezler.
  if (ogrenciMi(kullanici)) {
    return { AND: [AKTIF_OGRENCI, { id: kullanici.id }] };
  }

  // Rolsüz öğretmen (danışmanlık işaretlemeyen) hiçbir öğrenci görmez.
  return HICBIRI;
}

/** Öğrenci listesi ekranında kullanıcının seçebildiği filtreler. */
export interface OgrenciListeFiltreleri {
  ilKodu?: string | null;
  ilceKodu?: string | null;
  kurumKodu?: number | null;
  /**
   * Okul türü ("Anadolu Lisesi", "Mesleki ve Teknik Anadolu Lisesi" gibi).
   * Kurum tablosundan gelir; öğrencide böyle bir alan yoktur.
   */
  okulTuru?: string | null;
  /** Kısmi eşleşir: "11" girildiğinde 11-A ve 11-B de gelir. */
  sinif?: string | null;
  /**
   * Eğitim-öğretim yılı ("2025-2026"). Yıllar arası karşılaştırmanın
   * dayanağıdır: geçen yılın envanteri bu filtreyle görüntülenir.
   */
  egitimOgretimYili?: string | null;
  calismaGrubuId?: number | null;
  /** Ad veya soyadda geçen metin. */
  ara?: string | null;
  /** Danışmanı olmayan öğrenciler (il koordinatörünün takip etmesi gereken durum). */
  danismansizMi?: boolean;
}

/**
 * Kapsam filtresi + kullanıcının seçtiği filtreler.
 *
 * Seçilen filtreler kapsamın YERİNE geçmez, ÜSTÜNE eklenir: ikisi AND ile
 * bağlanır. Aksi halde adres çubuğuna `?il=06` yazan bir il koordinatörü başka
 * ilin öğrencilerini listeleyebilirdi. Bu yüzden filtreleri doğrulamak yerine
 * daraltıcı olmaya zorluyoruz — geçersiz bir değer en kötü durumda boş liste
 * verir, veri sızdırmaz.
 */
export function ogrenciListeFiltresi(
  kullanici: OturumKullanicisi,
  filtreler: OgrenciListeFiltreleri = {},
): Prisma.KullaniciWhereInput {
  const kosullar: Prisma.KullaniciWhereInput[] = [
    ogrenciKapsamFiltresi(kullanici),
  ];

  if (filtreler.ilKodu) kosullar.push({ ilKodu: filtreler.ilKodu });
  if (filtreler.ilceKodu) kosullar.push({ ilceKodu: filtreler.ilceKodu });
  if (filtreler.kurumKodu) kosullar.push({ kurumKodu: filtreler.kurumKodu });
  // Okul türü öğrencide değil bağlı olduğu kurumda durur.
  if (filtreler.okulTuru) {
    kosullar.push({ kurum: { okulTuru: filtreler.okulTuru } });
  }
  if (filtreler.egitimOgretimYili) {
    kosullar.push({ egitimOgretimYili: filtreler.egitimOgretimYili });
  }
  if (filtreler.sinif) {
    kosullar.push({
      sinif: { contains: filtreler.sinif, mode: "insensitive" },
    });
  }
  if (filtreler.ara) {
    kosullar.push({
      OR: [
        { ad: { contains: filtreler.ara, mode: "insensitive" } },
        { soyad: { contains: filtreler.ara, mode: "insensitive" } },
      ],
    });
  }
  if (filtreler.calismaGrubuId) {
    kosullar.push({
      calismaGruplari: { some: { calismaGrubuId: filtreler.calismaGrubuId } },
    });
  }
  if (filtreler.danismansizMi) {
    kosullar.push({ ogrenciAtamalari: { none: { bitisTarihi: null } } });
  }

  return { AND: kosullar };
}

// ---------------------------------------------------------------------------
// Öğretmen envanteri
// ---------------------------------------------------------------------------

/**
 * "Öğretmen" = aktif ÖĞRENCİ rolü olmayan kullanıcı.
 *
 * Ayrı bir kullanıcı tipi sütunu yok ve olmamalı: kimlik sağlayıcıdan gelen
 * kişi rolüyle tanımlanır. Görev almamış öğretmen de bu kümededir — envanterin
 * en çok işe yarayan satırı, henüz danışmanlık işaretlememiş öğretmendir.
 *
 * Proje yöneticisi (YEĞİTEK personeli) DIŞARIDA bırakılır: okulda görevli bir
 * öğretmen değildir, listede okulsuz satır olarak görünmesi envanteri kirletir.
 */
const OGRETMEN: Prisma.KullaniciWhereInput = {
  roller: {
    none: {
      rolKodu: { in: ["OGRENCI", "PROJE_YONETICISI"] },
      bitisTarihi: null,
    },
  },
};

/**
 * Öğretmen envanterinin kapsam filtresi — öğrencininkiyle aynı mantık.
 *
 * Danışman öğretmende bir fark var: öğrencide "kendi danışmanlığındakiler"
 * koşulu da aranıyordu, burada aranmıyor. Meslektaş listesi kişisel veri
 * bakımından daha dardır (öğretmenin sınıfı, çalışma grubu, kazanımı yok) ve
 * okuldaki diğer danışmanı görmek işbirliğinin ön koşulu.
 */
export function ogretmenKapsamFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.KullaniciWhereInput {
  if (projeYoneticisiMi(kullanici)) {
    return OGRETMEN;
  }

  const ilKodu = koordinatorIlKodu(kullanici);
  if (ilKodu !== null) {
    return { AND: [OGRETMEN, { ilKodu }] };
  }

  const kurumKodu = danismanKurumKodu(kullanici);
  if (kurumKodu !== null) {
    return { AND: [OGRETMEN, { kurumKodu }] };
  }

  // Öğrenci ve görev almamış öğretmen hiçbir öğretmen kaydı görmez.
  return HICBIRI;
}

export interface OgretmenListeFiltreleri {
  ilKodu?: string | null;
  ilceKodu?: string | null;
  kurumKodu?: number | null;
  okulTuru?: string | null;
  /** Kısmi eşleşir: "Bilişim" girildiğinde "Bilişim Teknolojileri" de gelir. */
  brans?: string | null;
  /** Ad veya soyadda geçen metin. */
  ara?: string | null;
  /** Danışman olarak görev almış öğretmenler. */
  yalnizcaDanismanlar?: boolean;
  /** Danışmanlık için işaretlememiş, yani öğrenci listesinde çıkmayanlar. */
  yalnizcaGorevsizler?: boolean;
  /**
   * Görev ALDIĞI eğitim-öğretim yılı. Kullanıcının güncel yılı değil, rol
   * kaydının kapsadığı dönem sorulur: geçen yıl danışmanlık yapıp bu yıl
   * bırakan öğretmen, 2024-2025 seçildiğinde listede olmalıdır.
   */
  gorevAraligi?: { baslangic: Date; bitis: Date } | null;
}

export function ogretmenListeFiltresi(
  kullanici: OturumKullanicisi,
  filtreler: OgretmenListeFiltreleri = {},
): Prisma.KullaniciWhereInput {
  const kosullar: Prisma.KullaniciWhereInput[] = [
    ogretmenKapsamFiltresi(kullanici),
  ];

  if (filtreler.ilKodu) kosullar.push({ ilKodu: filtreler.ilKodu });
  if (filtreler.ilceKodu) kosullar.push({ ilceKodu: filtreler.ilceKodu });
  if (filtreler.kurumKodu) kosullar.push({ kurumKodu: filtreler.kurumKodu });
  if (filtreler.okulTuru) {
    kosullar.push({ kurum: { okulTuru: filtreler.okulTuru } });
  }
  if (filtreler.brans) {
    kosullar.push({ brans: { contains: filtreler.brans, mode: "insensitive" } });
  }
  if (filtreler.ara) {
    kosullar.push({
      OR: [
        { ad: { contains: filtreler.ara, mode: "insensitive" } },
        { soyad: { contains: filtreler.ara, mode: "insensitive" } },
      ],
    });
  }
  if (filtreler.yalnizcaDanismanlar) {
    kosullar.push({
      roller: { some: { rolKodu: "DANISMAN", bitisTarihi: null } },
    });
  }
  if (filtreler.yalnizcaGorevsizler) {
    kosullar.push({ roller: { none: { bitisTarihi: null } } });
  }
  if (filtreler.gorevAraligi) {
    /*
     * Aralık ÇAKIŞMASI aranır, kapsanması değil: 1 Eylül'de başlayıp yıl
     * ortasında biten bir görev de o yıla aittir. Süren görevin bitişi NULL
     * olduğundan ayrıca ele alınır.
     */
    const { baslangic, bitis } = filtreler.gorevAraligi;
    kosullar.push({
      roller: {
        some: {
          baslangicTarihi: { lte: bitis },
          OR: [{ bitisTarihi: null }, { bitisTarihi: { gte: baslangic } }],
        },
      },
    });
  }

  return { AND: kosullar };
}

// ---------------------------------------------------------------------------
// Paydaş envanteri
// ---------------------------------------------------------------------------

/** Hiçbir paydaş döndürmeyen filtre. */
const PAYDAS_HICBIRI: Prisma.PaydasWhereInput = { id: { in: [] } };

/**
 * Paydaş envanteri il bazlıdır: koordinatör kendi ilini, danışman öğretmen
 * kendi ilini (okulunu değil — iş birliği il düzeyinde kurulur), YEĞİTEK
 * tüm illeri görür.
 *
 * Öğrenci ve ili belli olmayan kullanıcı hiçbir kayıt görmez.
 */
export function paydasKapsamFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.PaydasWhereInput {
  if (projeYoneticisiMi(kullanici)) return {};

  const ilKodu = koordinatorIlKodu(kullanici) ?? kullanici.ilKodu;
  if (ilKodu !== null && !ogrenciMi(kullanici)) {
    return { ilKodu };
  }

  return PAYDAS_HICBIRI;
}

export interface PaydasListeFiltreleri {
  ilKodu?: string | null;
  tur?: PaydasTuru | null;
  /** Kurum adı, yetkili kişi ya da iş birliği alanında geçen metin. */
  ara?: string | null;
  /** Pasife alınmış kayıtlar da listelensin mi? */
  pasifleriDeGoster?: boolean;
}

export function paydasListeFiltresi(
  kullanici: OturumKullanicisi,
  filtreler: PaydasListeFiltreleri = {},
): Prisma.PaydasWhereInput {
  const kosullar: Prisma.PaydasWhereInput[] = [paydasKapsamFiltresi(kullanici)];

  if (filtreler.ilKodu) kosullar.push({ ilKodu: filtreler.ilKodu });
  if (filtreler.tur) kosullar.push({ tur: filtreler.tur });
  if (!filtreler.pasifleriDeGoster) kosullar.push({ aktif: true });
  if (filtreler.ara) {
    kosullar.push({
      OR: [
        { ad: { contains: filtreler.ara, mode: "insensitive" } },
        { yetkiliKisi: { contains: filtreler.ara, mode: "insensitive" } },
        { isBirligiAlani: { contains: filtreler.ara, mode: "insensitive" } },
      ],
    });
  }

  return { AND: kosullar };
}

/**
 * Ulusal faaliyet istisnası — references/permissions.md Bölüm 3.
 *
 * İl koordinatörü, KENDİ AÇTIĞI ulusal faaliyete başvurmuş öğrencileri başka
 * ilden olsalar da görebilir. Bu erişim yalnızca başvuru değerlendirme
 * ekranındadır; envanter, arama ve raporlamada geçerli değildir.
 */
export function ulusalBasvuranFiltresi(
  kullanici: OturumKullanicisi,
  faaliyetId: number,
  /**
   * Düzenleyen görevden ayrıldığı için yetkinin devrolduğu durum. Kararı bu
   * fonksiyon veremez (düzenleyenin rol durumunu bilmez), çağıran
   * `yetkiDevrolduMu` ile hesaplayıp geçer.
   */
  yetkiDevroldu = false,
): Prisma.BasvuruWhereInput {
  if (projeYoneticisiMi(kullanici) || yetkiDevroldu) {
    return { faaliyetId };
  }
  return {
    faaliyetId,
    faaliyet: { duzenleyenKullaniciId: kullanici.id },
  };
}

/**
 * Değerlendirme ekranında gösterilebilecek asgari KATILIMCI alanları.
 * Telefon ve e-posta BİLİNÇLİ olarak yoktur.
 *
 * Katılımcı öğretmen de olabildiği için branş ve aktif rol de seçilir:
 * değerlendiren kişi karşısındakinin öğrenci mi öğretmen mi olduğunu
 * görmeden karar veremez.
 */
export const DEGERLENDIRME_KATILIMCI_ALANLARI = {
  id: true,
  ad: true,
  soyad: true,
  sinif: true,
  brans: true,
  ilKodu: true,
  il: { select: { ad: true } },
  kurum: { select: { ad: true } },
  roller: {
    where: { bitisTarihi: null },
    select: { rolKodu: true },
  },
  calismaGruplari: { select: { calismaGrubu: { select: { ad: true } } } },
} as const;

/**
 * Faaliyet görünürlük filtresi. Onay bekleyen faaliyet yalnızca düzenleyene ve
 * proje yöneticisine görünür; öğrenciye yalnızca kendi kapsamındaki onaylı
 * faaliyetler listelenir.
 */
export function faaliyetKapsamFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.FaaliyetWhereInput {
  if (projeYoneticisiMi(kullanici)) {
    return {};
  }

  const yayindaOlanlar: Prisma.FaaliyetWhereInput = {
    onayDurumu: { in: ["ONAY_GEREKMEZ", "ONAYLANDI"] },
    OR: [
      { kapsam: "ULUSAL" },
      ...(kullanici.kurumKodu !== null
        ? [{ kapsam: "OKUL" as const, kurumKodu: kullanici.kurumKodu }]
        : []),
      ...(kullanici.ilKodu !== null
        ? [{ kapsam: "IL" as const, ilKodu: kullanici.ilKodu }]
        : []),
      // İl koordinatörü kendi ilinin okul içi faaliyetlerini de görür.
      ...(koordinatorIlKodu(kullanici) !== null
        ? [
            {
              kapsam: "OKUL" as const,
              kurum: { ilKodu: koordinatorIlKodu(kullanici)! },
            },
          ]
        : []),
    ],
  };

  // Kişinin kendi açtığı faaliyetler onay durumundan bağımsız görünür.
  return {
    OR: [{ duzenleyenKullaniciId: kullanici.id }, yayindaOlanlar],
  };
}

/**
 * Danışman seçim listesi filtresi: aynı kurum kodundaki, danışmanlık için
 * işaretlenmiş öğretmenler.
 */
export function danismanAdayiFiltresi(
  kurumKodu: number,
): Prisma.KullaniciWhereInput {
  return {
    kurumKodu,
    aktif: true,
    ogretmenProfil: { danismanOlmakIstiyor: true },
    // İl koordinatörü olan öğretmen danışman listesinde çıkmaz.
    NOT: {
      roller: { some: { rolKodu: "IL_KOORDINATOR", bitisTarihi: null } },
    },
  };
}
