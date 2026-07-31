import { prisma } from "../db";
import {
  type KatilimKaydi,
  type KazanimGirdisi,
  katilimOzeti,
  type RozetDurumu,
  rozetDurumlari,
} from "./rozetler";

/**
 * Öğrencinin kazanım verisini toplar.
 *
 * Karar kuralları rozetler.ts içindedir; burada yalnızca veritabanı işi var.
 */

export interface KazanimSonucu {
  rozetler: RozetDurumu[];
  ozet: ReturnType<typeof katilimOzeti>;
  katilimlar: (KatilimKaydi & { faaliyetId: number; ad: string })[];
}

export async function kazanimlariGetir(
  ogrenciId: number,
  simdi: Date = new Date(),
): Promise<KazanimSonucu> {
  const [basvurular, calismaGrubuSayisi, gorevRolSayisi] = await Promise.all([
    prisma.basvuru.findMany({
      where: {
        // Başvuru artık katılımcı temelli; öğrencinin kazanımı kendi
        // katılımlarından doğar, adına başvuran kişiden değil.
        katilimciId: ogrenciId,
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
    }),
    prisma.ogrenciCalismaGrubu.count({ where: { ogrenciId } }),
    prisma.ogrenciGorevRolu.count({ where: { ogrenciId } }),
  ]);

  const katilimlar = basvurular.map((basvuru) => ({
    faaliyetId: basvuru.faaliyet.id,
    ad: basvuru.faaliyet.ad,
    tarih: basvuru.faaliyet.tarih,
    kapsam: basvuru.faaliyet.kapsam,
    etkinlikKategorisi: basvuru.faaliyet.etkinlikKategorisi,
  }));

  const girdi: KazanimGirdisi = {
    katilimlar,
    calismaGrubuSayisi,
    gorevRolSayisi,
  };

  return {
    rozetler: rozetDurumlari(girdi),
    ozet: katilimOzeti(katilimlar),
    katilimlar,
  };
}
