"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  kaynakIlKarariniCoz,
  kaynakIlKarariVerilebilirMi,
} from "@/lib/basvuru/il-disi";
import { BILDIRIM_KODLARI, bildirimGonder } from "@/lib/bildirim/gonder";
import { prisma } from "@/lib/db";
import { ilDisiBasvuruFiltresi } from "@/lib/yetki/kapsam";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi } from "@/lib/yetki/tipler";

/**
 * İl dışına giden başvurunun KAYNAK İL kararı.
 *
 * Yetki kontrolü ayrı bir `if` ile YAPILMAZ: başvuru merkezi kapsam
 * filtresinden çekilir, kapsamı dışındaki bir başvurunun kimliğini forma yazan
 * kullanıcı burada boş sonuç alır. Rol kontrolü tek başına yetmezdi — "bu
 * başvuru benim ilimden mi çıkıyor" sorusu da sorulmalı.
 */

const YOL = "/panel/il-disi-basvurular";

/**
 * Karardan sonra dönülecek adres.
 *
 * Form artık İKİ yerden gönderiliyor: bu modülün kendi ekranı ve etkinlik
 * detayındaki başvuru satırı (11 Ağustos 2026). Dönüş adresi sabit kalsaydı,
 * etkinlikte başvuruları değerlendiren proje yöneticisi her kararda başka bir
 * ekrana atılır ve kaldığı yere elle geri dönerdi — asıl işi olan "seç / yedeğe
 * al / reddet" turu her satırda kesilirdi.
 *
 * Değer FORMDAN geldiği için serbest bırakılamaz: açık yönlendirme (open
 * redirect) açığı doğar. Yalnızca bu uygulamanın etkinlik detay adresi kabul
 * edilir; tanınmayan her değer modülün kendi ekranına döner.
 */
const ETKINLIK_YOLU = /^\/panel\/etkinlikler\/[1-9][0-9]*$/;

function donusYolunuCoz(veri: FormData): string {
  const istenen = String(veri.get("donusYolu") ?? "");
  return ETKINLIK_YOLU.test(istenen) ? istenen : YOL;
}

function hataylaDon(yol: string, mesaj: string): never {
  redirect(`${yol}?hata=${encodeURIComponent(mesaj)}`);
}

export async function kaynakIlKarariEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  const donusYolu = donusYolunuCoz(veri);

  const basvuruId = Number.parseInt(String(veri.get("basvuruId") ?? ""), 10);
  if (!Number.isFinite(basvuruId)) throw new BulunamadiHatasi();

  const basvuru = await prisma.basvuru.findFirst({
    where: { AND: [{ id: basvuruId }, ilDisiBasvuruFiltresi(kullanici)] },
    select: {
      id: true,
      durum: true,
      kaynakIlOnayDurumu: true,
      katilimciId: true,
      katilimci: { select: { ad: true, soyad: true } },
      faaliyet: { select: { id: true, ad: true } },
    },
  });
  if (!basvuru) throw new BulunamadiHatasi();

  if (
    !kaynakIlKarariVerilebilirMi({
      kaynakIlOnayDurumu: basvuru.kaynakIlOnayDurumu,
      basvuruDurumu: basvuru.durum,
    })
  ) {
    hataylaDon(
      donusYolu,
      "Bu başvuruya karar verilemez: kararı zaten verilmiş ya da başvuru geri çekilmiş olabilir.",
    );
  }

  const karar = kaynakIlKarariniCoz({
    onaylandiMi: veri.get("karar") === "onayla",
    gerekce: String(veri.get("gerekce") ?? ""),
  });
  if (!karar.olurMu) hataylaDon(donusYolu, karar.neden);

  await prisma.basvuru.update({
    where: { id: basvuru.id },
    data: {
      kaynakIlOnayDurumu: karar.durum,
      kaynakIlOnaylayanKullaniciId: kullanici.id,
      kaynakIlOnayTarihi: new Date(),
      kaynakIlRetGerekcesi: karar.durum === "REDDEDILDI" ? karar.gerekce : null,
    },
  });

  /*
   * Öğrenci HER İKİ durumda da haberdar edilir. Onayda "başvurun ilinden
   * çıktı, şimdi etkinliğin ili değerlendirecek" bilgisi bekleme süresini
   * açıklıyor; rette gerekçe zaten zorunlu.
   */
  await bildirimGonder({
    kullaniciId: basvuru.katilimciId,
    kod: BILDIRIM_KODLARI.IL_DISI_BASVURU_KARARI,
    degiskenler: {
      ogrenciAdSoyad: `${basvuru.katilimci.ad} ${basvuru.katilimci.soyad}`,
      faaliyetAdi: basvuru.faaliyet.ad,
      sonuc: karar.durum === "ONAYLANDI" ? "onaylandı" : "reddedildi",
      gerekce: karar.gerekce ?? "—",
    },
    // Onayda öğrencinin sırada ne olduğunu görmesi için etkinliğin kendisine
    // gitmesi gerekiyor; bildirim metni başvurunun bitmediğini söylüyor.
    hedef: { tip: "FAALIYET", id: basvuru.faaliyet.id },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "BASVURU",
    hedefId: basvuru.id,
    detay: `İl dışı başvuru ${
      karar.durum === "ONAYLANDI" ? "onaylandı" : "reddedildi"
    }: ${basvuru.katilimci.ad} ${basvuru.katilimci.soyad} · ${basvuru.faaliyet.ad}`,
  });

  revalidatePath(YOL);
  revalidatePath(`/panel/etkinlikler/${basvuru.faaliyet.id}`);
  /*
   * DURUM ANAHTARI KAYNAK İLE ÖZEL. Eylem iki ekrana birden dönüyor ve etkinlik
   * detayında `onaylandi` zaten "Etkinlik onaylandı ve yayına girdi" demek —
   * kaynak il kararından sonra o mesajı basmak, değerlendirenin etkinliği
   * yayına aldığını sanmasına yol açardı. İki ekran da aynı sözlüğü kullanıyor.
   */
  redirect(
    `${donusYolu}?durum=${
      karar.durum === "ONAYLANDI" ? "kaynak-il-onaylandi" : "kaynak-il-reddedildi"
    }`,
  );
}
