import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";
import { kazanimlariGetir, type KazanimSonucu } from "../kazanim/getir";
import { ogrenciKapsamFiltresi } from "../yetki/kapsam";
import type { OturumKullanicisi } from "../yetki/tipler";

/**
 * Tekil öğrenci profili erişimi — references/permissions.md Bölüm 7
 * (`GET /ogrenciler/:id` → kapsam filtresi + erişim logu).
 *
 * Liste ekranı gibi detay ekranı da MERKEZİ kapsam filtresinden geçer; filtre
 * burada elle yazılmaz. Kapsam dışı öğrenci "yetkiniz yok" değil "bulunamadı"
 * döner: adres çubuğuna id yazan kullanıcı, o id'de bir öğrenci olup olmadığını
 * bile öğrenmemeli (bkz. lib/faaliyet/erisim.ts, aynı gerekçe).
 */

export const OGRENCI_PROFIL_ICERIGI = {
  kurum: { select: { ad: true, okulTuru: true } },
  il: { select: { ad: true } },
  ilce: { select: { ad: true } },
  ogrenciProfil: true,
  /*
   * Görevin KAPSAMI da çekilir ("Çankaya İlçe Temsilcisi"), yalnızca rol kodu
   * değil: aynı öğrenci farklı dönemlerde farklı yerlerde temsilci olmuş
   * olabilir ve kapsam öğrencinin güncel kaydından okunamaz — okul değiştirmiş
   * olabilir.
   */
  gorevRolleri: {
    orderBy: { egitimOgretimYili: "desc" as const },
    select: {
      rolKodu: true,
      egitimOgretimYili: true,
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      kurum: { select: { ad: true } },
    },
  },
  calismaGruplari: {
    select: {
      calismaGrubuId: true,
      secimTarihi: true,
      ekleyenKullaniciId: true,
      calismaGrubu: { select: { id: true, ad: true, aktif: true } },
      ekleyen: { select: { ad: true, soyad: true } },
    },
  },
  kazanimlar: {
    // Kullanıcının girdiği tarih boş olabildiği için ikinci ölçüt gerekiyor.
    orderBy: [{ tarih: "desc" as const }, { olusturmaTarihi: "desc" as const }],
  },
  ogrenciAtamalari: {
    where: { bitisTarihi: null },
    select: {
      atamaTipi: true,
      baslangicTarihi: true,
      // Tekil danışmanlık bırakma (J1) "bu öğrencinin danışmanı BEN miyim"
      // sorusunu soruyor; ad yetmez, kimlik gerekiyor.
      danismanKullaniciId: true,
      danisman: {
        select: {
          ad: true,
          soyad: true,
          brans: true,
          ogretmenProfil: { select: { eposta: true, telefon: true } },
        },
      },
    },
  },
} satisfies Prisma.KullaniciInclude;

export type OgrenciProfilKaydi = Prisma.KullaniciGetPayload<{
  include: typeof OGRENCI_PROFIL_ICERIGI;
}>;

/**
 * Kapsam filtresinden geçen öğrenciyi getirir; kapsam dışıysa ya da id geçersiz
 * ise null döner.
 *
 * Öğrencinin kendisi de bu yoldan geçer: `ogrenciKapsamFiltresi` öğrenci için
 * "yalnızca kendisi" filtresi ürettiği için ayrı bir dal gerekmez.
 */
export async function gorunurOgrenciGetir(
  kullanici: OturumKullanicisi,
  ogrenciId: number,
): Promise<OgrenciProfilKaydi | null> {
  if (!Number.isInteger(ogrenciId)) return null;

  return prisma.kullanici.findFirst({
    where: { AND: [{ id: ogrenciId }, ogrenciKapsamFiltresi(kullanici)] },
    include: OGRENCI_PROFIL_ICERIGI,
  });
}

export interface OgrenciProfilVerisi {
  ogrenci: OgrenciProfilKaydi;
  /** Katılım geçmişi ve rozetler; kaynağı başvuru+faaliyet, beyan değil. */
  kazanim: KazanimSonucu;
  /** Öğrencinin henüz seçmediği aktif gruplar (ekleme kutusu için). */
  eklenebilirGruplar: { id: number; ad: string }[];
}

/**
 * Profil ekranının ihtiyaç duyduğu her şeyi tek yerde toplar.
 *
 * Hem öğrencinin kendi profili hem danışman/koordinatör/yöneticinin gördüğü
 * detay ekranı aynı veriyi kullanır; iki ekranın farklı sorgular yazması,
 * birinde gösterilen bir bölümün diğerinde sessizce eksik kalmasına yol açardı.
 */
export async function ogrenciProfilVerisiGetir(
  ogrenci: OgrenciProfilKaydi,
): Promise<OgrenciProfilVerisi> {
  const seciliIdler = ogrenci.calismaGruplari.map((secim) => secim.calismaGrubuId);

  const [kazanim, eklenebilirGruplar] = await Promise.all([
    kazanimlariGetir(ogrenci.id),
    prisma.calismaGrubu.findMany({
      // Pasif gruplar yeni seçimlerde listelenmez; geçmiş seçimler korunur.
      where: { aktif: true, id: { notIn: seciliIdler } },
      orderBy: { siraNo: "asc" },
      select: { id: true, ad: true },
    }),
  ]);

  return { ogrenci, kazanim, eklenebilirGruplar };
}
