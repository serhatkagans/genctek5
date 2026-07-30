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

  redirect(sonuc.danismanSecimiGerekli ? "/panel/danisman-secim" : "/panel");
}

export async function cikisEylemi(): Promise<void> {
  await oturumKapat();
  redirect("/giris");
}
