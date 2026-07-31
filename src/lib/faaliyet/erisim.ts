import type { Kapsam, OnayDurumu, RolKodu } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";
import { faaliyetKapsamFiltresi } from "../yetki/kapsam";
import type { FaaliyetKapsami, OturumKullanicisi } from "../yetki/tipler";

/**
 * Faaliyet erişimi.
 *
 * Detay ekranı da liste gibi merkezi kapsam filtresinden geçer; filtre burada
 * elle yazılmaz. Kapsam dışı bir faaliyet "yetkiniz yok" değil "bulunamadı"
 * döner — kaydın varlığını bile sızdırmıyoruz
 * (references/permissions.md Bölüm 4).
 */

export const FAALIYET_DETAY_ICERIGI = {
  duzenleyen: {
    select: {
      id: true,
      ad: true,
      soyad: true,
      ilKodu: true,
      // Yetki devri kararı için: aktif rolü kalmayan düzenleyen görevden
      // ayrılmış sayılır (bkz. faaliyetKapsamiCikar).
      roller: { where: { bitisTarihi: null }, select: { rolKodu: true } },
    },
  },
  onaylayan: { select: { ad: true, soyad: true } },
  kurum: { select: { ad: true, ilKodu: true } },
  il: { select: { ad: true } },
  ilce: { select: { ad: true } },
  calismaGruplari: {
    select: { calismaGrubu: { select: { id: true, ad: true } } },
  },
  // Temel Etkinlik / Çalışma Grubu Etkinliği'nde faaliyetin adı buradan gelir;
  // İl Etkinliği'nde null olur.
  temelEtkinlikProgrami: { select: { id: true, ad: true, grup: true } },
  // Yalnızca durumlar: kontenjan sayımı için yeterli, kimlik sızdırmaz.
  // Başvuranların kim olduğu ayrı sorguyla ve yalnızca değerlendirene okunur.
  basvurular: { select: { durum: true } },
} satisfies Prisma.FaaliyetInclude;

export type FaaliyetDetayi = Prisma.FaaliyetGetPayload<{
  include: typeof FAALIYET_DETAY_ICERIGI;
}>;

export async function gorunurFaaliyetGetir(
  kullanici: OturumKullanicisi,
  faaliyetId: number,
): Promise<FaaliyetDetayi | null> {
  if (!Number.isInteger(faaliyetId)) return null;

  return prisma.faaliyet.findFirst({
    where: { AND: [{ id: faaliyetId }, faaliyetKapsamFiltresi(kullanici)] },
    include: FAALIYET_DETAY_ICERIGI,
  });
}

/**
 * Faaliyet satırını transaction boyunca kilitler.
 *
 * Kontenjan canlı sayıldığı için sayım ile kayıt arasında bir aralık kalır:
 * Postgres'in varsayılan READ COMMITTED seviyesinde iki başvuru aynı anda "son
 * yer boş" görüp ikisi de kaydedilebilir, kontenjan bir kişi aşılır. Aynı
 * faaliyete dokunan işlemler bu satırda sıraya girsin diye sayımdan ÖNCE
 * çağrılır; kilit transaction bitince kendiliğinden kalkar.
 */
export async function faaliyetSatiriniKilitle(
  islem: Prisma.TransactionClient,
  faaliyetId: number,
): Promise<void> {
  await islem.$queryRaw`SELECT id FROM faaliyet WHERE id = ${faaliyetId} FOR UPDATE`;
}

/** Görev sayılan roller — biri bile yoksa kullanıcı görevden ayrılmış demektir. */
const GOREV_ROLLERI: RolKodu[] = [
  "DANISMAN",
  "IL_KOORDINATOR",
  "PROJE_YONETICISI",
];

/**
 * Yetki fonksiyonlarının beklediği sade faaliyet kapsamı.
 *
 * `duzenleyen` verilirse yetki devri de hesaplanır: aktif görev rolü kalmayan
 * düzenleyenin faaliyeti, ilin koordinatörüne devrolur. Verilmezse düzenleyen
 * "görevde" kabul edilir — yani devir OLMAZ; eksik veriyle yetki genişletmek
 * yerine dar tarafta kalıyoruz.
 */
export function faaliyetKapsamiCikar(faaliyet: {
  id: number;
  kapsam: Kapsam;
  kurumKodu: number | null;
  ilKodu: string | null;
  duzenleyenKullaniciId: number;
  onayDurumu: OnayDurumu;
  kurum?: { ilKodu: string } | null;
  duzenleyen?: { ilKodu: string | null; roller: { rolKodu: RolKodu }[] };
}): FaaliyetKapsami {
  /*
   * Faaliyeti öğrenci mi açtı? Rol kaydından okunur, faaliyete kopyalanmaz —
   * kopyalanan bir alan öğrenci mezun olduğunda ya da rolü değiştiğinde eskirdi
   * (bkz. prisma/schema.prisma · Basvuru'daki aynı gerekçe).
   */
  const duzenleyenOgrenciMi = faaliyet.duzenleyen
    ? faaliyet.duzenleyen.roller.some((rol) => rol.rolKodu === "OGRENCI")
    : false;

  /*
   * Faaliyetin ili kapsam alanlarından okunamaz: okul içi faaliyette il kodu
   * boştur (okulunki geçerlidir), ulusal faaliyette ikisi de boştur ve
   * devralacak kişi düzenleyenin ilindeki koordinatördür.
   */
  const kapsamIlKodu =
    faaliyet.ilKodu ??
    faaliyet.kurum?.ilKodu ??
    faaliyet.duzenleyen?.ilKodu ??
    null;

  return {
    id: faaliyet.id,
    kapsam: faaliyet.kapsam,
    kurumKodu: faaliyet.kurumKodu,
    ilKodu: faaliyet.ilKodu,
    duzenleyenKullaniciId: faaliyet.duzenleyenKullaniciId,
    onayliMi: yayindaMi(faaliyet.onayDurumu),
    kapsamIlKodu,
    duzenleyenGorevdeMi: faaliyet.duzenleyen
      ? faaliyet.duzenleyen.roller.some((rol) =>
          GOREV_ROLLERI.includes(rol.rolKodu),
        )
      : true,
    duzenleyenOgrenciMi,
  };
}

export function yayindaMi(onayDurumu: OnayDurumu): boolean {
  return onayDurumu === "ONAY_GEREKMEZ" || onayDurumu === "ONAYLANDI";
}
