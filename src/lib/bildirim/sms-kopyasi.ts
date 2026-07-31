import type { GonderimDurumu } from "@/generated/prisma/enums";
import { prisma } from "../db";
import { sms, smsEtkinMi } from "../sms";
import { smsGovdesiHazirla } from "../sms/govde";

export { smsGovdesiHazirla };

/**
 * Panel bildiriminin SMS kopyası — e-posta kopyasının ikizidir ve aynı iki
 * kurala uyar:
 *
 * 1. SMS ASLA iş akışını kesmez. Operatör erişilemezse başvuru değerlendirmesi
 *    yarıda kalmamalı; bildirim zaten panele yazıldı.
 * 2. Başarısızlık sessizce yutulmaz. Sonuç bildirim kaydına işlenir, "SMS
 *    gelmedi" şikâyetinde hiç denenmediği mi yoksa operatörden mi döndüğü
 *    ayırt edilebilir.
 *
 * E-postadan tek farkı: SMS uzunluk sınırlıdır ve ücretlidir, o yüzden gövde
 * kırpılır ve panele yönlendirilir.
 */

/** Kişinin bildirim numarasını iki profil tablosundan hangisindeyse getirir. */
export async function bildirimTelefonuGetir(
  kullaniciId: number,
): Promise<string | null> {
  const kayit = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: {
      ogrenciProfil: { select: { telefon: true } },
      ogretmenProfil: { select: { telefon: true } },
    },
  });

  const numara =
    kayit?.ogrenciProfil?.telefon ?? kayit?.ogretmenProfil?.telefon ?? null;

  return numara?.trim() ? numara.trim() : null;
}

interface KopyaIstegi {
  bildirimId: number;
  kullaniciId: number;
  baslik: string;
  icerik: string;
}

export async function smsKopyasiGonder(istek: KopyaIstegi): Promise<void> {
  if (!smsEtkinMi()) return;

  const numara = await bildirimTelefonuGetir(istek.kullaniciId);
  // Numara yok: hata değil. İletişim bilgisi zorunlu değildir ve olmaması
  // kişinin tercihidir.
  if (!numara) return;

  let durum: GonderimDurumu = "GONDERILDI";
  let hataMetni: string | null = null;

  try {
    await sms().gonder({
      alici: numara,
      govde: smsGovdesiHazirla(istek.baslik, istek.icerik),
    });
  } catch (hata) {
    durum = "BASARISIZ";
    hataMetni = hata instanceof Error ? hata.message : String(hata);
    console.error(`SMS gönderilemedi (bildirim ${istek.bildirimId}):`, hata);
  }

  await prisma.bildirim.update({
    where: { id: istek.bildirimId },
    data: { smsDurumu: durum, smsHatasi: hataMetni },
  });
}
