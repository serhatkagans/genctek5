import { prisma } from "@/lib/db";
import { koordinatorIlKodu, projeYoneticisiMi } from "@/lib/yetki/izinler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";

/**
 * Ekip verisinin okunması (13 Ağustos 2026).
 *
 * Kararlar `kurallar.ts` içinde ve saf; burada yalnızca veritabanı işi var.
 */

export interface EkipOzeti {
  id: number;
  ad: string;
  aciklama: string | null;
  ilKodu: string;
  ilAdi: string;
  aktif: boolean;
  uyeSayisi: number;
  mesajSayisi: number;
  /** Oturumdaki kişi bu ekibin üyesi mi (kuran koordinatör olabilir, üye olmayabilir). */
  uyesiyimMi: boolean;
}

export interface EkipAyrintisi {
  id: number;
  ad: string;
  aciklama: string | null;
  ilKodu: string;
  aktif: boolean;
  uyeKullaniciIdleri: number[];
}

/**
 * Tek ekip — yetki kararları için gereken en az alan.
 *
 * Üye kimlikleri de çekiliyor: sohbeti kimin okuyup yazabileceği üyelikten
 * geçiyor (bkz. kurallar.ts · ekipSohbetiOkuyabilirMi) ve eylemlerin her biri
 * bu kararı yeniden sormak zorunda.
 */
export async function ekibiGetir(ekipId: number): Promise<EkipAyrintisi | null> {
  const ekip = await prisma.ekip.findUnique({
    where: { id: ekipId },
    select: {
      id: true,
      ad: true,
      aciklama: true,
      ilKodu: true,
      aktif: true,
      uyeler: { select: { kullaniciId: true } },
    },
  });
  if (!ekip) return null;

  return {
    id: ekip.id,
    ad: ekip.ad,
    aciklama: ekip.aciklama,
    ilKodu: ekip.ilKodu,
    aktif: ekip.aktif,
    uyeKullaniciIdleri: ekip.uyeler.map((uye) => uye.kullaniciId),
  };
}

/**
 * Kişinin gördüğü ekipler.
 *
 * ÜÇ KİTLE TEK LİSTEDE:
 *   · üye — üyesi olduğu ekipler (öğrenci, öğretmen…),
 *   · il koordinatörü — kendi ilinin BÜTÜN ekipleri (kurduğu ya da devraldığı),
 *   · proje yöneticisi — hepsi.
 *
 * Tek sorgu ve `OR`: koordinatör hem yönettiği hem üyesi olduğu ekipleri
 * görüyor ve iki ayrı liste basmak, aynı ekibi iki kez göstermek olurdu.
 *
 * KAPALI EKİPLER DE DÖNER ve ekranda ayrı bölümde basılır: arşiv görünmezse
 * "ekibim kayboldu" olur.
 */
export async function ekipleriGetir(
  kullanici: OturumKullanicisi,
): Promise<EkipOzeti[]> {
  const ilKodu = koordinatorIlKodu(kullanici);
  const kosullar = [];

  kosullar.push({ uyeler: { some: { kullaniciId: kullanici.id } } });
  if (projeYoneticisiMi(kullanici)) {
    kosullar.push({});
  } else if (ilKodu) {
    kosullar.push({ ilKodu });
  }

  const ekipler = await prisma.ekip.findMany({
    where: { OR: kosullar },
    orderBy: [{ aktif: "desc" }, { ad: "asc" }],
    select: {
      id: true,
      ad: true,
      aciklama: true,
      ilKodu: true,
      aktif: true,
      il: { select: { ad: true } },
      uyeler: { select: { kullaniciId: true } },
      _count: { select: { mesajlar: true } },
    },
  });

  return ekipler.map((ekip) => ({
    id: ekip.id,
    ad: ekip.ad,
    aciklama: ekip.aciklama,
    ilKodu: ekip.ilKodu,
    ilAdi: ekip.il.ad,
    aktif: ekip.aktif,
    uyeSayisi: ekip.uyeler.length,
    mesajSayisi: ekip._count.mesajlar,
    uyesiyimMi: ekip.uyeler.some((uye) => uye.kullaniciId === kullanici.id),
  }));
}

/** Kişinin üyesi olduğu AKTİF ekip sayısı — panel kartı için. */
export async function ekipSayimiGetir(kullaniciId: number): Promise<number> {
  return prisma.ekip.count({
    where: { aktif: true, uyeler: { some: { kullaniciId } } },
  });
}
