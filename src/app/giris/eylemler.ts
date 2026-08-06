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
 * ÖĞRENCİ HER GİRİŞTE PROFİLİNİ GÖRÜR (5 Ağustos talebi · C3). "İlk girişte"
 * denmiş olsa da karar her giriş yönünde verildi: profil, öğrencinin kendini
 * tanıttığı ve güncellediği yer ve envanterin değeri oranın doluluğuna bağlı.
 * Öğretmen, koordinatör ve merkez personeli panele girmeye devam eder —
 * onların günlük işi listelerde, profilde değil.
 *
 * DANIŞMAN SEÇİMİ ÖNCELİKLİDİR: danışmansız öğrenci "boşta" kalamaz
 * (SKILL.md · Değişmezler 2), o yüzden seçim ekranı bir kapıdır ve profilin
 * önüne geçer. Seçimini yapan öğrenci sonraki girişinde profile düşer.
 */
function girisSonrasiYol(sonuc: {
  danismanSecimiGerekli: boolean;
  ogrenciMi: boolean;
}): string {
  if (sonuc.danismanSecimiGerekli) return "/panel/danisman-secim";
  return sonuc.ogrenciMi ? "/panel/profil" : "/panel";
}

export async function cikisEylemi(): Promise<void> {
  await oturumKapat();
  redirect("/giris");
}
