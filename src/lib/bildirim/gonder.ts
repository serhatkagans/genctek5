import type { GonderimKanali } from "@/generated/prisma/enums";
import { prisma } from "../db";

/**
 * Bildirimler — references/domain-rules.md Bölüm 9.
 *
 * Şablonlar koda gömülmez, bildirim_sablonu tablosunda tutulur ve Yönetim
 * ekranından düzenlenir. Bildirim her zaman panele yazılır; kişinin e-posta
 * adresi ya da telefonu varsa ve o kanal açıksa birer kopya da gönderilir
 * (bkz. eposta-kopyasi.ts, sms-kopyasi.ts). Panel her zaman kaynaktır;
 * kopyaların gitmemesi bildirimi geçersiz kılmaz.
 */

import { epostaKopyasiGonder } from "./eposta-kopyasi";
import { BILDIRIM_KODLARI, type BildirimKodu, sablonuDoldur } from "./sablon";
import { smsKopyasiGonder } from "./sms-kopyasi";

export { BILDIRIM_KODLARI, sablonuDoldur };
export type { BildirimKodu };

export interface BildirimIstegi {
  kullaniciId: number;
  kod: BildirimKodu;
  degiskenler?: Record<string, string>;
  kanal?: GonderimKanali;
}

export async function bildirimGonder(istek: BildirimIstegi): Promise<void> {
  const sablon = await prisma.bildirimSablonu.findUnique({
    where: { kod: istek.kod },
  });

  if (!sablon || !sablon.aktif) {
    // Şablonu olmayan bildirim sessizce yutulmaz; iş akışını da kesmemesi için
    // uyarı olarak kaydedilir.
    console.warn(`Bildirim şablonu bulunamadı veya pasif: ${istek.kod}`);
    return;
  }

  const degiskenler = istek.degiskenler ?? {};
  const baslik = sablonuDoldur(sablon.konu, degiskenler);
  const icerik = sablonuDoldur(sablon.govdeSablonu, degiskenler);

  /*
   * Aynı uyarı okunmadan tekrar düşmez.
   *
   * Bazı bildirimler duruma bakan akışlardan doğar: danışmanı atanamayan bir
   * öğrenci her giriş yaptığında ilk atama yeniden denenir ve proje
   * yöneticisine yine "atanamadı" uyarısı çıkar. Kayıt bazında engellemezsek
   * panel aynı satırın onlarca kopyasıyla dolar ve gerçekten yeni olan uyarı
   * görünmez olur. Karşılaştırma içerik üzerinden yapılır: uyarı başka bir
   * öğrenci için ise metni farklı olacağı için ayrı kayıt açılır.
   */
  const okunmamisAyni = await prisma.bildirim.findFirst({
    where: {
      kullaniciId: istek.kullaniciId,
      tip: istek.kod,
      okunduMu: false,
      baslik,
      icerik,
    },
    select: { id: true },
  });

  if (okunmamisAyni) return;

  const bildirim = await prisma.bildirim.create({
    data: {
      kullaniciId: istek.kullaniciId,
      tip: istek.kod,
      baslik,
      icerik,
      gonderimKanali: istek.kanal ?? "SISTEM",
    },
    select: { id: true },
  });

  /*
   * E-posta kopyası bildirimden SONRA ve onu bekletmeden gönderilir. Kopyanın
   * gitmemesi bildirimi geçersiz kılmaz; panel her zaman kaynaktır.
   */
  await epostaKopyasiGonder({
    bildirimId: bildirim.id,
    kullaniciId: istek.kullaniciId,
    baslik,
    icerik,
  });

  /*
   * SMS kopyası e-postadan BAĞIMSIZ gönderilir; ikisinden birinin düşmesi
   * öbürünü engellemez. İkisi de kapalıysa (varsayılan durum SMS için budur)
   * fonksiyonlar hiçbir şey yapmadan döner.
   */
  await smsKopyasiGonder({
    bildirimId: bildirim.id,
    kullaniciId: istek.kullaniciId,
    baslik,
    icerik,
  });
}

/** Proje yöneticilerinin tamamına bildirim düşürür (onay, uyarı akışları). */
export async function projeYoneticilerineBildir(
  kod: BildirimKodu,
  degiskenler: Record<string, string> = {},
): Promise<void> {
  const yoneticiler = await prisma.kullaniciRol.findMany({
    where: { rolKodu: "PROJE_YONETICISI", bitisTarihi: null },
    select: { kullaniciId: true },
  });

  for (const yonetici of yoneticiler) {
    await bildirimGonder({
      kullaniciId: yonetici.kullaniciId,
      kod,
      degiskenler,
    });
  }
}
