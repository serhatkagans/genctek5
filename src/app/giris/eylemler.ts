"use server";

import { redirect } from "next/navigation";
import { oturumKapat } from "@/lib/auth/oturum";
import { girisYap } from "@/lib/kullanici/giris-akisi";

export async function girisEylemi(veri: FormData): Promise<void> {
  const kimlikBilgisi = String(veri.get("kimlikBilgisi") ?? "");
  if (!kimlikBilgisi) {
    redirect("/giris?hata=Kimlik+se%C3%A7ilmedi");
  }

  const sonuc = await girisYap(kimlikBilgisi);

  if (sonuc.durum === "BASARISIZ") {
    redirect(`/giris?hata=${encodeURIComponent(sonuc.mesaj)}`);
  }

  redirect(girisSonrasiYol(sonuc));
}

/**
 * Giriş sonrası açılacak ekran.
 *
 * HERKES PROFİLLE KARŞILANIR (7 Ağustos 2026 · istek: "tüm kullanıcı grupları
 * için ilk açılınca profil sekmesi ile başlasın, panel ile değil").
 *
 * Önceden yalnızca öğrenci profile düşüyordu (C3 · 5 Ağustos); öğretmen,
 * koordinatör ve merkez panele giriyordu. Kural artık rolden bağımsız —
 * profil, kişinin kendini gördüğü ve tanıttığı yer ve menüde de ilk sekme.
 * Rol ayrımı, aynı soruya iki cevap vermek olurdu.
 *
 * DANIŞMAN SEÇİMİ HÂLÂ ÖNCELİKLİDİR: danışmansız öğrenci "boşta" kalamaz
 * (SKILL.md · Değişmezler 2), o yüzden seçim ekranı bir kapıdır ve profilin
 * önüne geçer. Seçimini yapan öğrenci sonraki girişinde profile düşer.
 *
 * `ogrenciMi` artık kullanılmıyor ama imzada DURUYOR: çağıran `girisYap`
 * sonucunu olduğu gibi geçiriyor ve alanı ayıklamak, ileride rol bazlı bir
 * kapı gerektiğinde geri eklenecek bir bilgiyi bugünden atmak olurdu.
 */
function girisSonrasiYol(sonuc: { danismanSecimiGerekli: boolean }): string {
  if (sonuc.danismanSecimiGerekli) return "/panel/danisman-secim";
  return "/panel/profil";
}

export async function cikisEylemi(): Promise<void> {
  await oturumKapat();
  redirect("/giris");
}
