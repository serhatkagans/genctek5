import { prisma } from "../db";
import { ilKoordinatoruMu } from "../yetki/izinler";
import type { OturumKullanicisi } from "../yetki/tipler";
import {
  AYAR_TAAHHUT_METNI,
  taahhutOnayiGerekiyorMu,
  VARSAYILAN_TAAHHUT_METNI,
} from "./kurallar";

/**
 * Koordinatör gizlilik taahhüdünün veritabanı tarafı.
 *
 * Öğrenci aydınlatma metniyle aynı desen (bkz. kvkk/durum.ts): metin
 * `sistem_ayari`nda, onay tarihi kişinin profilinde. Metnin güncelleme tarihi
 * aynı zamanda onayın tazeliğini belirler.
 */

export interface TaahhutMetniDurumu {
  metin: string;
  guncellemeTarihi: Date | null;
}

export async function taahhutMetniGetir(): Promise<TaahhutMetniDurumu> {
  const kayit = await prisma.sistemAyari.findUnique({
    where: { anahtar: AYAR_TAAHHUT_METNI },
    select: { deger: true, guncellemeTarihi: true },
  });

  return {
    metin: kayit?.deger?.trim() || VARSAYILAN_TAAHHUT_METNI,
    guncellemeTarihi: kayit?.guncellemeTarihi ?? null,
  };
}

export interface TaahhutDurumu {
  gerekiyorMu: boolean;
  onayTarihi: Date | null;
  metinGuncellemeTarihi: Date | null;
}

/**
 * Taahhüt YALNIZCA il koordinatöründen istenir.
 *
 * Danışman öğretmen kendi okulundaki öğrencileri görür ve onlarla zaten yüz
 * yüze çalışır; koordinatör ise tanımadığı ONLARCA ÖĞRETMENİN iletişim
 * bilgisine erişebiliyor. Yükümlülüğü doğuran fark budur.
 *
 * Proje yöneticisi kapsam dışı: merkez personeli kurumsal görev tanımıyla
 * bağlıdır, sistem içi bir taahhüt metni onun yükümlülüğünü doğurmaz.
 */
export async function taahhutDurumu(
  kullanici: OturumKullanicisi,
): Promise<TaahhutDurumu> {
  if (!ilKoordinatoruMu(kullanici)) {
    return { gerekiyorMu: false, onayTarihi: null, metinGuncellemeTarihi: null };
  }

  const [profil, metin] = await Promise.all([
    prisma.ogretmenProfil.findUnique({
      where: { kullaniciId: kullanici.id },
      select: { taahhutOnayTarihi: true },
    }),
    taahhutMetniGetir(),
  ]);

  const onayTarihi = profil?.taahhutOnayTarihi ?? null;

  return {
    gerekiyorMu: taahhutOnayiGerekiyorMu({
      onayTarihi,
      metinGuncellemeTarihi: metin.guncellemeTarihi,
    }),
    onayTarihi,
    metinGuncellemeTarihi: metin.guncellemeTarihi,
  };
}

/** Taahhüdü onaylar. Profil satırı yoksa açılır (personelde olmayabilir). */
export async function taahhuduOnayla(kullaniciId: number): Promise<void> {
  await prisma.ogretmenProfil.upsert({
    where: { kullaniciId },
    update: { taahhutOnayTarihi: new Date() },
    create: { kullaniciId, taahhutOnayTarihi: new Date() },
  });
}
