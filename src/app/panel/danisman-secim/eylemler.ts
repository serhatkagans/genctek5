"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { ogrenciDanismanSecti } from "@/lib/danisman/atama";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { YetkiHatasi } from "@/lib/yetki/tipler";

export async function danismanSecEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  // Danışman seçimini yalnızca öğrencinin kendisi yapar.
  if (!ogrenciMi(kullanici)) {
    throw new YetkiHatasi("Danışman seçimi yalnızca öğrenciler içindir.");
  }

  const secilenId = Number.parseInt(String(veri.get("danismanId") ?? ""), 10);
  if (!Number.isFinite(secilenId)) {
    redirect("/panel/danisman-secim?hata=Ge%C3%A7ersiz+se%C3%A7im");
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
  revalidatePath("/panel/profil");
  redirect("/panel/danisman-secim?durum=secildi");
}
