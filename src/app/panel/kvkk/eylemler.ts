"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Aydınlatma metni onayı.
 *
 * Onay geri alınamaz bir "okudum" beyanıdır; kayıt olarak yalnızca tarihi
 * tutulur. Metin sonradan güncellenirse onay kendiliğinden eskir
 * (bkz. src/lib/kvkk/kurallar.ts → aydinlatmaOnayiGerekiyorMu), ayrı bir
 * iptal işlemine gerek yoktur.
 */
export async function aydinlatmaOnaylaEylemi(): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ogrenciMi(kullanici)) {
    throw new YetkiHatasi("Aydınlatma metni onayı öğrenci hesabına özeldir.");
  }

  const simdi = new Date();
  await prisma.ogrenciProfil.upsert({
    where: { kullaniciId: kullanici.id },
    update: { aydinlatmaMetniOnayTarihi: simdi },
    create: { kullaniciId: kullanici.id, aydinlatmaMetniOnayTarihi: simdi },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "KVKK aydınlatma metni onaylandı",
  });

  revalidatePath("/panel");
  revalidatePath("/panel/kvkk");
  redirect("/panel/kvkk?durum=onaylandi");
}
