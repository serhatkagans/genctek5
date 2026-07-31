"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { taahhuduOnayla } from "@/lib/kvkk/taahhut";
import { ilKoordinatoruMu } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Gizlilik taahhüdü onayı.
 *
 * Aydınlatma onayıyla aynı desen: geri alınamaz bir beyandır, kayıt olarak
 * yalnızca tarihi tutulur. Metin güncellenirse onay kendiliğinden eskir
 * (bkz. kvkk/kurallar.ts → taahhutOnayiGerekiyorMu); ayrı bir iptal yoktur.
 */
export async function taahhutOnaylaEylemi(): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ilKoordinatoruMu(kullanici)) {
    throw new YetkiHatasi(
      "Gizlilik taahhütnamesi il koordinatörü görevine özeldir.",
    );
  }

  await taahhuduOnayla(kullanici.id);

  /*
   * Onay ERİŞİM KAYDINA yazılır. Taahhüdün amacı "kim, neye, ne zaman erişme
   * yetkisi aldı" sorusunu cevaplayabilmek; onayın kendisi de o zincirin
   * parçasıdır.
   */
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "İl koordinatörü gizlilik taahhütnamesi onaylandı",
  });

  revalidatePath("/panel/taahhut");
  revalidatePath("/panel");
  redirect("/panel/taahhut?durum=onaylandi");
}
