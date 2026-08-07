import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";
import { koordinatorIlKodu, projeYoneticisiMi } from "../yetki/izinler";
import type { OturumKullanicisi } from "../yetki/tipler";

/**
 * Mentörlük verisinin okunması ve yazılması.
 *
 * Kararlar `kurallar.ts` içinde ve saf; burada yalnızca veritabanı işi var.
 */

/**
 * Onay kuyruğunun kapsam filtresi.
 *
 * İl koordinatörü YALNIZCA KENDİ İLİNDEKİ başvuruları görür, proje yöneticisi
 * hepsini. Filtre merkezi kapsam filtreleriyle aynı ilkeyi izler: yetki
 * belirlenemezse hiçbir kaydı döndürmeyen hâle döner (fail closed) — burada
 * `id: -1` ile.
 *
 * İl, başvuranın KULLANICI kaydındaki ilidir. Mentörün ili yoksa (YEĞİTEK
 * personeli) yalnızca proje yöneticisi görür; koordinatörün ilinde olmayan bir
 * kişinin başvurusunu ona göstermek, karar veremeyeceği bir satır basmak
 * olurdu.
 */
export function mentorlukKapsamFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.MentorlukWhereInput {
  if (projeYoneticisiMi(kullanici)) return {};

  const ilKodu = koordinatorIlKodu(kullanici);
  if (ilKodu) return { kullanici: { ilKodu } };

  return { kullaniciId: -1 };
}

export interface MentorlukSatiri {
  kullaniciId: number;
  durum: "BEKLIYOR" | "ONAYLANDI" | "REDDEDILDI" | "BIRAKILDI";
  konular: string | null;
  basvuruTarihi: Date;
  kararTarihi: Date | null;
  retGerekcesi: string | null;
  grupAdlari: string[];
}

/** Kişinin kendi mentörlük kaydı; yoksa null. */
export async function mentorluguGetir(
  kullaniciId: number,
): Promise<MentorlukSatiri | null> {
  const kayit = await prisma.mentorluk.findUnique({
    where: { kullaniciId },
    select: {
      kullaniciId: true,
      durum: true,
      konular: true,
      basvuruTarihi: true,
      kararTarihi: true,
      retGerekcesi: true,
      gruplar: { select: { calismaGrubu: { select: { ad: true } } } },
    },
  });
  if (!kayit) return null;

  return {
    ...kayit,
    grupAdlari: kayit.gruplar.map((g) => g.calismaGrubu.ad),
  };
}

/**
 * Başvuruyu kaydeder (öğretmen ve diğer iç kullanıcılar için).
 *
 * UPSERT: kişi başına tek satır var ve yeniden başvuru aynı satırı BEKLIYOR'a
 * döndürür (bkz. şemadaki Mentorluk notu). Grup bağları önce SİLİNİP yeniden
 * yazılır — "hangileri eklendi, hangileri çıkarıldı" karşılaştırması yapmak,
 * en fazla birkaç satırlık bir liste için gereksiz karmaşıklık.
 *
 * Önceki kararın izleri (karar veren, tarih, ret gerekçesi) TEMİZLENİR: yeni
 * bir başvuru, eski reddin gerekçesini taşımamalı.
 */
export async function mentorlukBasvurusuKaydet(girdi: {
  kullaniciId: number;
  grupIdleri: number[];
  konular: string | null;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.mentorluk.upsert({
      where: { kullaniciId: girdi.kullaniciId },
      create: {
        kullaniciId: girdi.kullaniciId,
        konular: girdi.konular,
        durum: "BEKLIYOR",
      },
      update: {
        konular: girdi.konular,
        durum: "BEKLIYOR",
        basvuruTarihi: new Date(),
        kararVerenKullaniciId: null,
        kararTarihi: null,
        retGerekcesi: null,
      },
    });

    await tx.mentorlukCalismaGrubu.deleteMany({
      where: { mentorlukKullaniciId: girdi.kullaniciId },
    });
    if (girdi.grupIdleri.length > 0) {
      await tx.mentorlukCalismaGrubu.createMany({
        data: girdi.grupIdleri.map((calismaGrubuId) => ({
          mentorlukKullaniciId: girdi.kullaniciId,
          calismaGrubuId,
        })),
      });
    }
  });
}

/**
 * Dış başvuru onaylandığında mentörlük kaydını AÇIK olarak doğurur.
 *
 * Ayrı bir onay adımı YOK: proje yöneticisi başvurunun tamamını zaten
 * onayladı ve mentörlük isteği o başvurunun içindeydi. Aynı kararı ikinci kez
 * sormak, onaylayanı iki kuyrukta dolaştırırdı.
 *
 * Grup kimlikleri BURADA yeniden doğrulanır: başvuru ile karar arasında
 * geçen sürede bir grup pasife alınmış olabilir ve kapatılmış gruba mentörlük
 * yazmak, hiçbir ilana eşleşmeyen bir kayıt üretirdi.
 */
export async function disBasvurudanMentorlukAc(
  tx: Prisma.TransactionClient,
  girdi: {
    kullaniciId: number;
    kararVerenKullaniciId: number;
    konular: string | null;
    grupIdleri: number[];
  },
): Promise<void> {
  const gecerliGruplar = await tx.calismaGrubu.findMany({
    where: { id: { in: girdi.grupIdleri }, aktif: true },
    select: { id: true },
  });

  await tx.mentorluk.upsert({
    where: { kullaniciId: girdi.kullaniciId },
    create: {
      kullaniciId: girdi.kullaniciId,
      konular: girdi.konular,
      durum: "ONAYLANDI",
      kararVerenKullaniciId: girdi.kararVerenKullaniciId,
      kararTarihi: new Date(),
    },
    update: {
      konular: girdi.konular,
      durum: "ONAYLANDI",
      kararVerenKullaniciId: girdi.kararVerenKullaniciId,
      kararTarihi: new Date(),
      retGerekcesi: null,
    },
  });

  if (gecerliGruplar.length > 0) {
    await tx.mentorlukCalismaGrubu.createMany({
      data: gecerliGruplar.map((grup) => ({
        mentorlukKullaniciId: girdi.kullaniciId,
        calismaGrubuId: grup.id,
      })),
      skipDuplicates: true,
    });
  }
}
