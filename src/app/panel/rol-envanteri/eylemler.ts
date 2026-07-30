"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  ilKoordinatorluguKaldir,
  ilKoordinatoruAta,
  KoordinatorAtamaHatasi,
  yenidenDagitilanOgrenciSayisi,
} from "@/lib/rol/koordinator";
import { rolEnvanteriGorebilirMi } from "@/lib/yetki/izinler";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * İl koordinatörü atama/kaldırma — yalnızca proje yöneticisi.
 *
 * Atama danışman öğretmene de yapılabilir; engellenmez. İşlem sonunda kullanıcı
 * kaç öğrencinin yeniden dağıtıldığını görür (domain-rules.md Bölüm 3).
 */

const YOL = "/panel/rol-envanteri";

function metin(veri: FormData, alan: string): string {
  return String(veri.get(alan) ?? "").trim();
}

function sayi(veri: FormData, alan: string): number | null {
  const deger = Number.parseInt(metin(veri, alan), 10);
  return Number.isFinite(deger) ? deger : null;
}

export async function ilKoordinatoruAtaEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!rolEnvanteriGorebilirMi(kullanici)) {
    throw new YetkiHatasi("İl koordinatörü atamasını yalnızca proje yöneticisi yapar.");
  }

  const hedefId = sayi(veri, "kullaniciId");
  const ilKodu = metin(veri, "ilKodu");
  if (hedefId === null || !ilKodu) throw new BulunamadiHatasi();

  let sonuc;
  try {
    sonuc = await ilKoordinatoruAta(hedefId, ilKodu, kullanici.id);
  } catch (hata) {
    if (hata instanceof KoordinatorAtamaHatasi) {
      redirect(`${YOL}?il=${ilKodu}&hata=${encodeURIComponent(hata.message)}`);
    }
    throw hata;
  }

  revalidatePath(YOL);
  revalidatePath("/panel/ogrenciler");

  /*
   * Uyarı metni sayfada değil BURADA belirleniyor: "kaç öğrenci etkilendi"
   * bilgisi işlemin kendisine ait, sonradan sorguyla üretilemez (dağıtım
   * tamamlandığı için tekrar sayılamaz).
   *
   * İki sayı AYRI taşınıyor: danışmanlığı kapandığı için yeri değişenler ile
   * koordinatörsüzken sahipsiz kalıp şimdi bağlananlar farklı olaylardır.
   */
  const dagitilan = yenidenDagitilanOgrenciSayisi(sonuc);
  const parcalar = [`durum=atandi`, `il=${ilKodu}`, `dagitilan=${dagitilan}`];
  if (sonuc.danismanliktanAlindiMi) parcalar.push("danismandi=1");
  if (sonuc.yenidenSecimBekleyen > 0) {
    parcalar.push(`yenidenSecim=${sonuc.yenidenSecimBekleyen}`);
  }
  if (sonuc.sahipsizkenBaglananOgrenciSayisi > 0) {
    parcalar.push(`baglanan=${sonuc.sahipsizkenBaglananOgrenciSayisi}`);
  }

  redirect(`${YOL}?${parcalar.join("&")}`);
}

export async function ilKoordinatoruKaldirEylemi(
  veri: FormData,
): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!rolEnvanteriGorebilirMi(kullanici)) {
    throw new YetkiHatasi("İl koordinatörü görevini yalnızca proje yöneticisi kaldırır.");
  }

  const hedefId = sayi(veri, "kullaniciId");
  if (hedefId === null) throw new BulunamadiHatasi();

  let sonuc;
  try {
    sonuc = await ilKoordinatorluguKaldir(hedefId, kullanici.id);
  } catch (hata) {
    if (hata instanceof KoordinatorAtamaHatasi) {
      redirect(`${YOL}?hata=${encodeURIComponent(hata.message)}`);
    }
    throw hata;
  }

  revalidatePath(YOL);
  revalidatePath("/panel/ogrenciler");
  redirect(
    `${YOL}?durum=kaldirildi&il=${sonuc.ilKodu}&atanmamis=${sonuc.atanmamisKalanOgrenciSayisi}`,
  );
}
