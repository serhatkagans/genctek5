import { prisma } from "../db";
import { ogrenciMi } from "../yetki/izinler";
import type { OturumKullanicisi } from "../yetki/tipler";
import {
  AYAR_KVKK_METNI,
  aydinlatmaOnayiGerekiyorMu,
  VARSAYILAN_AYDINLATMA_METNI,
} from "./kurallar";

/**
 * Aydınlatma metninin veritabanı tarafı.
 *
 * Metin `sistem_ayari` içinde tutulur (koda gömülmez, proje yöneticisi
 * güncelleyebilir); kayıt yoksa koddaki varsayılan kullanılır. Metnin
 * güncelleme tarihi aynı zamanda onayın tazeliğini belirler.
 */

export interface AydinlatmaMetniDurumu {
  metin: string;
  guncellemeTarihi: Date | null;
}

export async function aydinlatmaMetniGetir(): Promise<AydinlatmaMetniDurumu> {
  const kayit = await prisma.sistemAyari.findUnique({
    where: { anahtar: AYAR_KVKK_METNI },
    select: { deger: true, guncellemeTarihi: true },
  });

  return {
    metin: kayit?.deger?.trim() || VARSAYILAN_AYDINLATMA_METNI,
    guncellemeTarihi: kayit?.guncellemeTarihi ?? null,
  };
}

export interface OnayDurumu {
  gerekiyorMu: boolean;
  onayTarihi: Date | null;
  metinGuncellemeTarihi: Date | null;
}

/**
 * Onay yalnızca ÖĞRENCİDEN istenir: aydınlatma yükümlülüğü verisi işlenen
 * kişiye karşıdır ve bu sistemde kişisel verisi işlenen asıl grup öğrencilerdir.
 * Öğretmen kullanıcılar için ayrı bir onay akışı tanımlanmadı.
 */
export async function aydinlatmaOnayDurumu(
  kullanici: OturumKullanicisi,
): Promise<OnayDurumu> {
  if (!ogrenciMi(kullanici)) {
    return { gerekiyorMu: false, onayTarihi: null, metinGuncellemeTarihi: null };
  }

  const [profil, metin] = await Promise.all([
    prisma.ogrenciProfil.findUnique({
      where: { kullaniciId: kullanici.id },
      select: { aydinlatmaMetniOnayTarihi: true },
    }),
    aydinlatmaMetniGetir(),
  ]);

  const onayTarihi = profil?.aydinlatmaMetniOnayTarihi ?? null;

  return {
    gerekiyorMu: aydinlatmaOnayiGerekiyorMu({
      onayTarihi,
      metinGuncellemeTarihi: metin.guncellemeTarihi,
    }),
    onayTarihi,
    metinGuncellemeTarihi: metin.guncellemeTarihi,
  };
}
