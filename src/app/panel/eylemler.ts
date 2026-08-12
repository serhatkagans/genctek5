"use server";

import { revalidatePath } from "next/cache";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { BulunamadiHatasi } from "@/lib/yetki/tipler";

/**
 * Bildirim okundu işaretleme.
 *
 * Bildirim tekrarını `bildirimGonder` okunmamış kayda bakarak engelliyor; okuma
 * imkânı olmazsa aynı uyarı bir daha hiç düşmez ve panel de kalıcı olarak dolu
 * kalır. Bu yüzden okuma, bildirim akışının isteğe bağlı değil zorunlu parçası.
 *
 * İKİ EKRAN TAZELENİR (12 Ağustos 2026): Panelim'in okunmamış bölümü ve
 * bildirim arşivi (`/panel/bildirimler`) aynı kaydı gösteriyor. Yalnızca biri
 * tazelenseydi, birinden okundu işaretlenen bildirim öbüründe okunmamış
 * görünmeye devam ederdi.
 */

export async function bildirimOkunduEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const bildirimId = Number.parseInt(String(veri.get("bildirimId") ?? ""), 10);
  if (!Number.isFinite(bildirimId)) throw new BulunamadiHatasi();

  // Sahiplik koşulu sorgunun içinde: başkasının bildirimi hiç eşleşmez.
  const sonuc = await prisma.bildirim.updateMany({
    where: { id: bildirimId, kullaniciId: kullanici.id, okunduMu: false },
    data: { okunduMu: true },
  });
  if (sonuc.count === 0) throw new BulunamadiHatasi();

  revalidatePath("/panel");
  revalidatePath("/panel/bildirimler");
}

export async function tumBildirimleriOkuEylemi(): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  await prisma.bildirim.updateMany({
    where: { kullaniciId: kullanici.id, okunduMu: false },
    data: { okunduMu: true },
  });

  revalidatePath("/panel");
  revalidatePath("/panel/bildirimler");
}
