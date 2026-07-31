import { prisma } from "../db";
import {
  type KatilimKaydi,
  katilimOzeti,
  type KazanimGirdisi,
  type OgretmenKatkiGirdisi,
  ogretmenRozetDurumlari,
  type RozetDurumu,
  rozetDurumlari,
} from "./rozetler";

/**
 * Kazanım verisini toplar.
 *
 * Karar kuralları rozetler.ts içindedir; burada yalnızca veritabanı işi var.
 */

/** Kişinin tamamlanmış GençTek katılımları — öğrencide de öğretmende de aynı. */
export interface KatilimGecmisi {
  ozet: ReturnType<typeof katilimOzeti>;
  katilimlar: (KatilimKaydi & { faaliyetId: number; ad: string })[];
}

export interface KazanimSonucu extends KatilimGecmisi {
  rozetler: RozetDurumu[];
}

/**
 * Tamamlanmış katılımlar: kişi SEÇİLDİ, tarih geçti, faaliyet iptal edilmedi.
 *
 * Sorgu `katilimciId` üzerinden kurulur — katılımcı öğretmen de olabilir ve
 * kazanım kişinin KENDİ katılımından doğar, adına başvuran kişiden değil.
 */
export async function katilimGecmisiGetir(
  kullaniciId: number,
  simdi: Date = new Date(),
): Promise<KatilimGecmisi> {
  const basvurular = await prisma.basvuru.findMany({
    where: {
      katilimciId: kullaniciId,
      durum: "SECILDI",
      faaliyet: {
        // Gerçekleşmemiş ya da iptal edilmiş etkinlik katılım sayılmaz.
        tarih: { lt: simdi },
        durum: "AKTIF",
      },
    },
    select: {
      faaliyet: {
        select: {
          id: true,
          ad: true,
          tarih: true,
          kapsam: true,
          etkinlikKategorisi: true,
        },
      },
    },
    orderBy: { faaliyet: { tarih: "desc" } },
  });

  const katilimlar = basvurular.map((basvuru) => ({
    faaliyetId: basvuru.faaliyet.id,
    ad: basvuru.faaliyet.ad,
    tarih: basvuru.faaliyet.tarih,
    kapsam: basvuru.faaliyet.kapsam,
    etkinlikKategorisi: basvuru.faaliyet.etkinlikKategorisi,
  }));

  return { ozet: katilimOzeti(katilimlar), katilimlar };
}

export async function kazanimlariGetir(
  ogrenciId: number,
  simdi: Date = new Date(),
): Promise<KazanimSonucu> {
  const [gecmis, calismaGrubuSayisi, gorevRolSayisi] = await Promise.all([
    katilimGecmisiGetir(ogrenciId, simdi),
    prisma.ogrenciCalismaGrubu.count({ where: { ogrenciId } }),
    prisma.ogrenciGorevRolu.count({ where: { ogrenciId } }),
  ]);

  const girdi: KazanimGirdisi = {
    katilimlar: gecmis.katilimlar,
    calismaGrubuSayisi,
    gorevRolSayisi,
  };

  return { ...gecmis, rozetler: rozetDurumlari(girdi) };
}

/**
 * Öğretmenin katkı verisi.
 *
 * Öğrencininkiyle aynı fonksiyon KULLANILMAZ: öğretmenin çalışma grubu seçimi
 * ve öğrenci görev rolü yoktur, onun yerine düzenlediği faaliyetler ve
 * danışmanlığı sayılır. Aynı sorguyu ikisine birden uydurmak, iki tarafta da
 * sürekli sıfır dönen sütunlar demek olurdu.
 */
export async function ogretmenKazanimlariGetir(
  ogretmenId: number,
  simdi: Date = new Date(),
): Promise<KazanimSonucu> {
  const [gecmis, duzenledigiFaaliyet, danismanlik, paydasliFaaliyet] =
    await Promise.all([
      katilimGecmisiGetir(ogretmenId, simdi),
      // İptal edilen faaliyet katkı sayılmaz; onay bekleyen de henüz sayılmaz.
      prisma.faaliyet.count({
        where: {
          duzenleyenKullaniciId: ogretmenId,
          durum: "AKTIF",
          onayDurumu: "ONAYLANDI",
        },
      }),
      prisma.danismanAtama.count({
        where: { danismanKullaniciId: ogretmenId, bitisTarihi: null },
      }),
      prisma.faaliyetPaydas.count({
        where: { faaliyet: { duzenleyenKullaniciId: ogretmenId } },
      }),
    ]);

  const girdi: OgretmenKatkiGirdisi = {
    katilimlar: gecmis.katilimlar,
    duzenledigiFaaliyetSayisi: duzenledigiFaaliyet,
    aktifDanismanlikSayisi: danismanlik,
    paydasliFaaliyetSayisi: paydasliFaaliyet,
  };

  return { ...gecmis, rozetler: ogretmenRozetDurumlari(girdi) };
}
