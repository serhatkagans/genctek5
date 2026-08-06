"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { ogrenciDanismanSecti } from "@/lib/danisman/atama";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Seçimden sonra dönülecek adres.
 *
 * Form iki yerden gönderiliyor (Panelim'deki bölüm ve `/panel/danisman-secim`
 * kapısı); dönüş adresi sabitlenirse Panelim'den seçim yapan öğrenci başka bir
 * ekrana atılır. Değer FORMDAN geliyor, o yüzden serbest bırakılamaz: açık
 * yönlendirme (open redirect) açığı doğar. Yalnızca bilinen iki yol kabul
 * edilir, tanınmayan değer kapıya döner.
 */
const IZINLI_DONUS_YOLLARI = ["/panel", "/panel/danisman-secim"] as const;

function donusYolunuCoz(veri: FormData): string {
  const istenen = String(veri.get("donusYolu") ?? "");
  return (IZINLI_DONUS_YOLLARI as readonly string[]).includes(istenen)
    ? istenen
    : "/panel/danisman-secim";
}

export async function danismanSecEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  // Danışman seçimini yalnızca öğrencinin kendisi yapar.
  if (!ogrenciMi(kullanici)) {
    throw new YetkiHatasi("Danışman seçimi yalnızca öğrenciler içindir.");
  }

  const donusYolu = donusYolunuCoz(veri);
  const capa = donusYolu === "/panel" ? "#danismanim" : "";

  const secilenId = Number.parseInt(String(veri.get("danismanId") ?? ""), 10);
  if (!Number.isFinite(secilenId)) {
    redirect(`${donusYolu}?hata=Ge%C3%A7ersiz+se%C3%A7im${capa}`);
  }

  await ogrenciDanismanSecti(kullanici.id, secilenId);

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "DANISMAN_ATAMA",
    hedefId: kullanici.id,
    detay: `Danışman seçildi: ${secilenId}`,
  });

  revalidatePath("/panel/danisman-secim");
  revalidatePath("/panel");
  revalidatePath("/panel/profil");
  redirect(`${donusYolu}?durum=secildi${capa}`);
}
