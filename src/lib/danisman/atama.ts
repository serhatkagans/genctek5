import type { AtamaTipi, KapanmaNedeni } from "@/generated/prisma/enums";
import { BILDIRIM_KODLARI, bildirimGonder, projeYoneticilerineBildir } from "../bildirim/gonder";
import { prisma } from "../db";
import { danismanAdayiFiltresi } from "../yetki/kapsam";
import {
  type DanismanAdayi,
  devirKarariVer,
  ilkAtamaKarariVer,
  type IlkAtamaKarari,
} from "./karar";

/**
 * Danışman atama işlemleri. Kararlar karar.ts'te üretilir; burada yalnızca
 * veritabanına uygulanır.
 *
 * ÖNEMLİ: danisman_atama bir GEÇMİŞ tablosudur. Devirde güncelleme yapılmaz;
 * eski kaydın bitişi yazılır, yeni kayıt açılır. Öğrencinin geçmiş danışmanı
 * raporlamada gerekecek.
 */

export async function danismanAdaylariGetir(
  kurumKodu: number,
  haricTutulanKullaniciId?: number,
): Promise<DanismanAdayi[]> {
  const adaylar = await prisma.kullanici.findMany({
    where: {
      AND: [
        danismanAdayiFiltresi(kurumKodu),
        haricTutulanKullaniciId !== undefined
          ? { id: { not: haricTutulanKullaniciId } }
          : {},
      ],
    },
    select: { id: true, ad: true, soyad: true, brans: true },
    orderBy: [{ ad: "asc" }, { soyad: "asc" }],
  });

  return adaylar.map((aday) => ({
    kullaniciId: aday.id,
    ad: aday.ad,
    soyad: aday.soyad,
    brans: aday.brans,
  }));
}

export async function ilKoordinatoruGetir(
  ilKodu: string | null,
): Promise<number | null> {
  if (!ilKodu) return null;

  const rol = await prisma.kullaniciRol.findFirst({
    where: { rolKodu: "IL_KOORDINATOR", ilKodu, bitisTarihi: null },
    select: { kullaniciId: true },
  });

  return rol?.kullaniciId ?? null;
}

export async function aktifAtamaGetir(ogrenciId: number) {
  return prisma.danismanAtama.findFirst({
    where: { ogrenciId, bitisTarihi: null },
    include: {
      danisman: {
        select: {
          id: true,
          ad: true,
          soyad: true,
          brans: true,
          kurumKodu: true,
          // Danışmanın kendi girdiği iletişim bilgisi; öğrenci danışmanına
          // ulaşabilmeli, kurum dışı kimse bu alanı görmüyor.
          ogretmenProfil: { select: { eposta: true, telefon: true } },
        },
      },
    },
  });
}

interface AtamaGirdisi {
  ogrenciId: number;
  danismanKullaniciId: number;
  atamaTipi: AtamaTipi;
  /** Kapatılacak eski atamanın nedeni. */
  kapanmaNedeni?: KapanmaNedeni;
}

export interface AtamaSonucu {
  atamaId: number;
  /**
   * Danışman GERÇEKTEN değişti mi? Aynı kişi yeniden atandığında false döner
   * (ör. danışman öğretmen il koordinatörü olunca kendi öğrencilerini
   * koordinatör sıfatıyla devralır). Çağıran buna bakarak gereksiz "danışmanınız
   * değişti" bildirimi göndermez.
   */
  degistiMi: boolean;
}

/**
 * Aktif atamayı kapatıp yenisini açar. Tek transaction içinde yürür; aksi
 * halde "bir öğrencinin tek aktif danışmanı olur" kısıtı eşzamanlı isteklerde
 * ihlal edilir (veritabanındaki kısmi unique index bunu zaten reddeder).
 */
export async function atamaDegistir(girdi: AtamaGirdisi): Promise<AtamaSonucu> {
  return prisma.$transaction(async (islem) => {
    const mevcut = await islem.danismanAtama.findFirst({
      where: { ogrenciId: girdi.ogrenciId, bitisTarihi: null },
      select: { id: true, danismanKullaniciId: true },
    });

    if (mevcut?.danismanKullaniciId === girdi.danismanKullaniciId) {
      return { atamaId: mevcut.id, degistiMi: false };
    }

    if (mevcut) {
      await islem.danismanAtama.update({
        where: { id: mevcut.id },
        data: {
          bitisTarihi: new Date(),
          kapanmaNedeni: girdi.kapanmaNedeni ?? "DEVIR",
        },
      });
    }

    const yeni = await islem.danismanAtama.create({
      data: {
        ogrenciId: girdi.ogrenciId,
        danismanKullaniciId: girdi.danismanKullaniciId,
        atamaTipi: girdi.atamaTipi,
      },
      select: { id: true },
    });

    return { atamaId: yeni.id, degistiMi: true };
  });
}

/**
 * Öğrencinin ilk danışman atamasını yürütür. Karar "seçim gerekli" ise
 * veritabanına yazılmaz; öğrenciye seçim ekranı gösterilir.
 */
export async function ilkAtamayiYurut(
  ogrenciId: number,
): Promise<IlkAtamaKarari> {
  const ogrenci = await prisma.kullanici.findUniqueOrThrow({
    where: { id: ogrenciId },
    select: { id: true, ad: true, soyad: true, kurumKodu: true, ilKodu: true },
  });

  const mevcutAtama = await aktifAtamaGetir(ogrenciId);
  if (mevcutAtama) {
    return {
      tur: "OTOMATIK",
      danismanKullaniciId: mevcutAtama.danismanKullaniciId,
    };
  }

  const adaylar =
    ogrenci.kurumKodu !== null
      ? await danismanAdaylariGetir(ogrenci.kurumKodu)
      : [];
  const koordinatorId = await ilKoordinatoruGetir(ogrenci.ilKodu);
  const karar = ilkAtamaKarariVer(adaylar, koordinatorId);

  switch (karar.tur) {
    case "OTOMATIK":
      await atamaDegistir({
        ogrenciId,
        danismanKullaniciId: karar.danismanKullaniciId,
        atamaTipi: "OTOMATIK",
      });
      break;

    case "IL_KOORDINATORUNE":
      await atamaDegistir({
        ogrenciId,
        danismanKullaniciId: karar.danismanKullaniciId,
        atamaTipi: "IL_KOORDINATOR_FALLBACK",
      });
      break;

    case "ATANAMADI":
      // Kenar durum: ilin koordinatörü yok ve okulda danışman yok.
      await projeYoneticilerineBildir(BILDIRIM_KODLARI.OGRENCI_ATANAMADI, {
        ogrenciAdSoyad: `${ogrenci.ad} ${ogrenci.soyad}`,
        ilKodu: ogrenci.ilKodu ?? "-",
      });
      break;

    case "SECIM_GEREKLI":
      // Öğrenci seçim yapana kadar atama oluşturulmaz.
      break;
  }

  return karar;
}

/**
 * Öğrencinin kendi danışmanını seçmesi — ilk seçim ve sonraki değişiklikler.
 *
 * Öğrenci danışmanını İSTEDİĞİ ZAMAN değiştirebilir; danışmanın ayrılmasını
 * beklemesi gerekmez ve onay aranmaz. Sıklık sınırı da yoktur. Tek kısıt,
 * seçilen öğretmenin AYNI KURUM KODUNDA ve danışmanlık için işaretlenmiş
 * olmasıdır — istemciden gelen kimliğe güvenilmez.
 *
 * Değişiklik geçmiş tablosuna işlenir: eski kayıt OGRENCI_ISTEGI nedeniyle
 * kapanır, yeni kayıt OGRENCI_SECTI tipiyle açılır.
 */
export async function ogrenciDanismanSecti(
  ogrenciId: number,
  secilenDanismanId: number,
): Promise<void> {
  const ogrenci = await prisma.kullanici.findUniqueOrThrow({
    where: { id: ogrenciId },
    select: { kurumKodu: true },
  });

  if (ogrenci.kurumKodu === null) {
    throw new Error("Öğrencinin kurum kodu yok; danışman seçilemez.");
  }

  const uygunMu = await prisma.kullanici.findFirst({
    where: {
      AND: [danismanAdayiFiltresi(ogrenci.kurumKodu), { id: secilenDanismanId }],
    },
    select: { id: true },
  });

  if (!uygunMu) {
    throw new Error(
      "Seçilen öğretmen bu okulun danışman adayları arasında değil.",
    );
  }

  await atamaDegistir({
    ogrenciId,
    danismanKullaniciId: secilenDanismanId,
    atamaTipi: "OGRENCI_SECTI",
    kapanmaNedeni: "OGRENCI_ISTEGI",
  });
}

/**
 * Danışman öğretmen okuldan ayrıldığında (kurum kodu değişimi) veya
 * danışmanlığı bıraktığında öğrencilerinin devri.
 *
 * references/domain-rules.md Bölüm 3'teki tabloyu uygular.
 */
export async function danismanliktanAyrildi(
  danismanKullaniciId: number,
  eskiKurumKodu: number | null,
  kapanmaNedeni: KapanmaNedeni,
): Promise<{ devredilenOgrenciSayisi: number; yenidenSecimBekleyen: number }> {
  const atamalar = await prisma.danismanAtama.findMany({
    where: { danismanKullaniciId, bitisTarihi: null },
    select: {
      ogrenciId: true,
      ogrenci: { select: { ad: true, soyad: true, ilKodu: true, kurumKodu: true } },
    },
  });

  if (atamalar.length === 0) {
    return { devredilenOgrenciSayisi: 0, yenidenSecimBekleyen: 0 };
  }

  let devredilen = 0;
  let yenidenSecimBekleyen = 0;

  for (const atama of atamalar) {
    const kurumKodu = atama.ogrenci.kurumKodu ?? eskiKurumKodu;
    const kalanAdaylar =
      kurumKodu !== null
        ? await danismanAdaylariGetir(kurumKodu, danismanKullaniciId)
        : [];
    const koordinatorId = await ilKoordinatoruGetir(atama.ogrenci.ilKodu);
    const karar = devirKarariVer(kalanAdaylar, koordinatorId);

    switch (karar.tur) {
      case "OTOMATIK_DEVIR": {
        const sonuc = await atamaDegistir({
          ogrenciId: atama.ogrenciId,
          danismanKullaniciId: karar.yeniDanismanKullaniciId,
          atamaTipi: "DEVIR",
          kapanmaNedeni,
        });
        if (sonuc.degistiMi) {
          await bildirimGonder({
            kullaniciId: atama.ogrenciId,
            kod: BILDIRIM_KODLARI.DANISMAN_DEGISTI,
          });
          devredilen += 1;
        }
        break;
      }

      case "YENIDEN_SECIM":
        // Seçim yapılana kadar geçici olarak il koordinatörüne bağlanır;
        // boşta öğrenci kalamaz.
        if (karar.geciciDanismanKullaniciId !== null) {
          await atamaDegistir({
            ogrenciId: atama.ogrenciId,
            danismanKullaniciId: karar.geciciDanismanKullaniciId,
            atamaTipi: "IL_KOORDINATOR_FALLBACK",
            kapanmaNedeni,
          });
        }
        await bildirimGonder({
          kullaniciId: atama.ogrenciId,
          kod: BILDIRIM_KODLARI.DANISMAN_YENIDEN_SECIM,
        });
        yenidenSecimBekleyen += 1;
        break;

      case "IL_KOORDINATORUNE": {
        const sonuc = await atamaDegistir({
          ogrenciId: atama.ogrenciId,
          danismanKullaniciId: karar.yeniDanismanKullaniciId,
          atamaTipi: "IL_KOORDINATOR_FALLBACK",
          kapanmaNedeni,
        });
        if (sonuc.degistiMi) {
          await bildirimGonder({
            kullaniciId: atama.ogrenciId,
            kod: BILDIRIM_KODLARI.DANISMAN_DEGISTI,
          });
          devredilen += 1;
        }
        break;
      }

      case "ATANAMADI":
        await projeYoneticilerineBildir(BILDIRIM_KODLARI.OGRENCI_ATANAMADI, {
          ogrenciAdSoyad: `${atama.ogrenci.ad} ${atama.ogrenci.soyad}`,
          ilKodu: atama.ogrenci.ilKodu ?? "-",
        });
        break;
    }
  }

  return { devredilenOgrenciSayisi: devredilen, yenidenSecimBekleyen };
}

/**
 * İl koordinatörü boşaldığında ona bağlı öğrencilerin atamalarını kapatır.
 *
 * Öğrenciler yeni bir danışmana devredilmez, bilinçli olarak "atanmamış"
 * kalırlar: okulları zaten danışmansız olduğu için (koordinatöre o yüzden
 * bağlanmışlardı) bağlanacak kimse yoktur. Bu durum proje yöneticisine
 * Rol/Atama Envanteri ekranında kırmızı uyarı olarak düşer ve yeni koordinatör
 * atandığı anda `sahipsizOgrencileriKoordinatoreBagla` ile kendiliğinden
 * çözülür.
 */
export async function koordinatorunOgrencileriniBosaAl(
  koordinatorKullaniciId: number,
): Promise<number> {
  const sonuc = await prisma.danismanAtama.updateMany({
    where: { danismanKullaniciId: koordinatorKullaniciId, bitisTarihi: null },
    data: { bitisTarihi: new Date(), kapanmaNedeni: "OGRETMEN_AYRILDI" },
  });
  return sonuc.count;
}

/**
 * İl koordinatörü atandığında o ildeki atanmamış öğrencileri ona bağlar.
 *
 * Ayrı bir onay adımı YOKTUR: koordinatör boşluğu yüzünden atamasız kalmış
 * öğrenciler, koordinatör gelir gelmez otomatik bağlanır. (Okula sonradan
 * danışman gelmesi durumu bundan farklıdır ve onay ister — bkz.
 * `yeniDanismanBildirimiYap`.)
 */
export async function sahipsizOgrencileriKoordinatoreBagla(
  ilKodu: string,
  koordinatorKullaniciId: number,
): Promise<number> {
  const sahipsizler = await prisma.kullanici.findMany({
    where: {
      ilKodu,
      aktif: true,
      roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
      ogrenciAtamalari: { none: { bitisTarihi: null } },
      // Koordinatörün kendisi öğrenci olamaz ama kısıt (ck_danisman_atama_
      // farkli_kisi) ihlal edilmesin diye yine de dışarıda bırakılır.
      id: { not: koordinatorKullaniciId },
    },
    select: { id: true },
  });

  for (const ogrenci of sahipsizler) {
    await atamaDegistir({
      ogrenciId: ogrenci.id,
      danismanKullaniciId: koordinatorKullaniciId,
      atamaTipi: "IL_KOORDINATOR_FALLBACK",
    });
    await bildirimGonder({
      kullaniciId: ogrenci.id,
      kod: BILDIRIM_KODLARI.DANISMAN_DEGISTI,
    });
  }

  return sahipsizler.length;
}

/**
 * Okula yeni danışman geldiğinde il koordinatörüne haber verilir. Öğrenciler
 * OTOMATİK DEVREDİLMEZ; devri koordinatör onaylar.
 */
export async function yeniDanismanBildirimiYap(
  kurumKodu: number,
): Promise<void> {
  const kurum = await prisma.kurum.findUnique({
    where: { kurumKodu },
    select: { ad: true, ilKodu: true },
  });
  if (!kurum) return;

  const koordinatorId = await ilKoordinatoruGetir(kurum.ilKodu);
  if (koordinatorId === null) return;

  // Koordinatöre bağlı, o okuldaki öğrenciler devredilebilir.
  const devredilebilirSayisi = await prisma.danismanAtama.count({
    where: {
      danismanKullaniciId: koordinatorId,
      bitisTarihi: null,
      ogrenci: { kurumKodu },
    },
  });

  if (devredilebilirSayisi === 0) return;

  await bildirimGonder({
    kullaniciId: koordinatorId,
    kod: BILDIRIM_KODLARI.KOORDINATOR_DEVREDILEBILIR_OGRENCI,
    degiskenler: {
      okulAdi: kurum.ad,
      ogrenciSayisi: String(devredilebilirSayisi),
    },
  });
}
