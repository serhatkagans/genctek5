"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { basvuruyuOnayla, basvuruyuReddet } from "@/lib/dis-kimlik/basvuru";
import { retGerekcesiniCoz } from "@/lib/dis-kimlik/kurallar";
import { disBasvuruYonetebilirMi } from "@/lib/yetki/izinler";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * EBA dışı giriş başvurularının karara bağlanması.
 *
 * Yetki her iki eylemde de AYRI AYRI sorulur; ekranın düğmeyi göstermemesi bir
 * yetki kontrolü değildir.
 */

const YOL = "/panel/dis-basvurular";

function hataylaDon(mesaj: string): never {
  redirect(`${YOL}?hata=${encodeURIComponent(mesaj)}`);
}

function basvuruIdCoz(veri: FormData): number {
  const id = Number.parseInt(String(veri.get("basvuruId") ?? ""), 10);
  if (!Number.isFinite(id)) throw new BulunamadiHatasi();
  return id;
}

export async function basvuruOnaylaEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!disBasvuruYonetebilirMi(kullanici)) {
    throw new YetkiHatasi("Dış giriş başvurularını onaylama yetkiniz yok.");
  }

  const sonuc = await basvuruyuOnayla(basvuruIdCoz(veri), kullanici.id);
  if (!sonuc.olduMu) hataylaDon(sonuc.neden);

  revalidatePath(YOL);
  redirect(`${YOL}?bilgi=${encodeURIComponent(sonuc.mesaj)}`);
}

export async function basvuruReddetEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!disBasvuruYonetebilirMi(kullanici)) {
    throw new YetkiHatasi("Dış giriş başvurularını reddetme yetkiniz yok.");
  }

  const gerekceKarari = retGerekcesiniCoz(String(veri.get("gerekce") ?? ""));
  if (!gerekceKarari.olurMu) hataylaDon(gerekceKarari.neden);

  const sonuc = await basvuruyuReddet(
    basvuruIdCoz(veri),
    kullanici.id,
    gerekceKarari.gerekce,
  );
  if (!sonuc.olduMu) hataylaDon(sonuc.neden);

  revalidatePath(YOL);
  redirect(`${YOL}?bilgi=${encodeURIComponent(sonuc.mesaj)}`);
}
