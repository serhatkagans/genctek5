import type { Prisma } from "@/generated/prisma/client";
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
  /** Kısmi eşleşir: "11" girildiğinde 11-A ve 11-B de gelir. */
  sinif?: string | null;
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
 * Değerlendirme ekranında gösterilebilecek asgari öğrenci alanları.
 * Telefon ve e-posta BİLİNÇLİ olarak yoktur.
 */
export const DEGERLENDIRME_OGRENCI_ALANLARI = {
  id: true,
  ad: true,
  soyad: true,
  sinif: true,
  ilKodu: true,
  il: { select: { ad: true } },
  kurum: { select: { ad: true } },
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
