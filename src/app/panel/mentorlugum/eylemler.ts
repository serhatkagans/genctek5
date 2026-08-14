"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { BILDIRIM_KODLARI, bildirimGonder } from "@/lib/bildirim/gonder";
import { prisma } from "@/lib/db";
import { cevapMetniniCoz, talepAktifMi } from "@/lib/iletisim/kurallar";
import { cevabiGizleyebilirMi } from "@/lib/mentor/cevap-kurallari";
import { onayliMentorMu } from "@/lib/mentor/veri";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Mentör sayfasının eylemleri (13 Ağustos 2026).
 *
 * İSTEK: "mentörlerin kendi sayfası olsun, destek atacağı sayfayı görecek,
 * talepleri inceleyip cevap yazacak, mentör sayfası gibi".
 *
 * CEVAP YAZMA YETKİSİ ONAYLI MENTÖRDEDİR ve bu, panodaki ilan açma yetkisinden
 * ayrıdır: ilan açmak "yardım istiyorum" demektir, cevap yazmak "yardım
 * ediyorum". İkincisi merkezin onayından geçmiş bir sıfattır (bkz. model
 * Mentorluk) — onaysız herkese açılsaydı, panodaki her ilanın altı ekosistemin
 * tamamına açık bir yorum alanına dönerdi ve ilan sahiplerinin çoğu 18 yaş
 * altı.
 */

const SAYFA = "/panel/mentorlugum";
const PANO = "/panel/talepler";

function hataylaDon(yol: string, mesaj: string): never {
  redirect(`${yol}?hata=${encodeURIComponent(mesaj)}`);
}

/**
 * İlana cevap yazar.
 *
 * `donusYolu` iki ekranı da destekler: cevap hem mentör sayfasından hem —
 * ileride istenirse — panodan yazılabilir ve kişi yazdığı yerde kalmalı.
 * Yalnızca panel içi adresler kabul edilir (açık yönlendirme olmasın).
 */
export async function talebeCevapYazEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const istenenYol = String(veri.get("donusYolu") ?? SAYFA) || SAYFA;
  const yol =
    istenenYol === PANO || istenenYol === SAYFA ? istenenYol : SAYFA;

  if (!(await onayliMentorMu(kullanici.id))) {
    throw new YetkiHatasi("Panodaki ilanlara yalnızca onaylı mentörler cevap yazar.");
  }

  const talepId = Number.parseInt(String(veri.get("talepId") ?? ""), 10);
  if (!Number.isFinite(talepId)) throw new BulunamadiHatasi();

  const karar = cevapMetniniCoz(String(veri.get("icerik") ?? ""));
  if (!karar.olurMu) hataylaDon(yol, karar.neden);

  /*
   * İlan AKTİF olmalı. Kapanmış ya da süresi dolmuş ilana cevap yazmak,
   * kimsenin okumayacağı bir metin bırakmaktır; kural panodaki bağlantı
   * isteğiyle aynı (bkz. yazismalar/baglanti-eylemleri.ts) ve aynı yardımcıdan
   * geçiyor.
   */
  const talep = await prisma.talep.findUnique({
    where: { id: talepId },
    select: {
      id: true,
      baslik: true,
      acanKullaniciId: true,
      kapatildiMi: true,
      sonGecerlilik: true,
      onayDurumu: true,
    },
  });
  if (!talep) throw new BulunamadiHatasi();
  if (
    !talepAktifMi({
      kapatildiMi: talep.kapatildiMi,
      sonGecerlilik: talep.sonGecerlilik,
      // Onay bekleyen ilana cevap yazmak, cevabı panoda görünmeyen bir metnin
      // altına bırakmak olurdu (onay kapısı: 14 Ağustos 2026).
      onayDurumu: talep.onayDurumu,
      simdi: new Date(),
    })
  ) {
    hataylaDon(yol, "Bu ilan artık aktif değil.");
  }

  await prisma.talepCevabi.create({
    data: {
      talepId: talep.id,
      yazanKullaniciId: kullanici.id,
      icerik: karar.icerik,
    },
  });

  /*
   * İLANI AÇANA BİLDİRİM. Cevap panoda açıkta duruyor ama kişinin panoya
   * kendiliğinden geri dönmesini beklemek, cevabın çoğu zaman hiç okunmaması
   * demekti. Kendi ilanına cevap yazan kişiye (mentör kendi ilanını
   * cevaplarsa) bildirim gitmez.
   */
  if (talep.acanKullaniciId !== kullanici.id) {
    await bildirimGonder({
      kullaniciId: talep.acanKullaniciId,
      kod: BILDIRIM_KODLARI.TALEBE_CEVAP_GELDI,
      degiskenler: {
        talepBasligi: talep.baslik,
        cevaplayanAdSoyad: `${kullanici.ad} ${kullanici.soyad}`,
      },
    });
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: talep.acanKullaniciId,
    detay: `Panodaki ilana cevap yazıldı: ${talep.baslik}`,
  });

  revalidatePath(SAYFA);
  revalidatePath(PANO);
  redirect(`${yol}?durum=cevap-yazildi#talep-${talep.id}`);
}

/**
 * Cevabı gizler.
 *
 * SİLME DEĞİL GİZLEME (bkz. migration notu): metin veritabanında kalır, yalnız
 * ekranda görünmez. Yetki gözetim rollerinde ve yazarın kendisinde
 * (bkz. lib/mentor/cevap-kurallari.ts) — kural saf bir fonksiyonda duruyor ki
 * ekran ile eylem aynı cevabı versin.
 */
export async function talepCevabiGizleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const cevapId = Number.parseInt(String(veri.get("cevapId") ?? ""), 10);
  if (!Number.isFinite(cevapId)) throw new BulunamadiHatasi();

  const cevap = await prisma.talepCevabi.findUnique({
    where: { id: cevapId },
    select: { id: true, yazanKullaniciId: true, gizlendiMi: true, talepId: true },
  });
  if (!cevap) throw new BulunamadiHatasi();

  if (!cevabiGizleyebilirMi(kullanici, cevap.yazanKullaniciId)) {
    throw new YetkiHatasi("Bu cevabı gizleme yetkiniz yok.");
  }
  if (cevap.gizlendiMi) {
    // Zaten gizli: ikinci kez yazmak gizleyeni ve tarihi ezerdi.
    redirect(`${PANO}#talep-${cevap.talepId}`);
  }

  await prisma.talepCevabi.update({
    where: { id: cevap.id },
    data: {
      gizlendiMi: true,
      gizleyenKullaniciId: kullanici.id,
      gizlenmeTarihi: new Date(),
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: cevap.yazanKullaniciId,
    detay: `Panodaki ilan cevabı gizlendi (#${cevap.id})`,
  });

  revalidatePath(SAYFA);
  revalidatePath(PANO);
  redirect(`${PANO}?durum=cevap-gizlendi#talep-${cevap.talepId}`);
}
