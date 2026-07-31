"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { faaliyetKapsamiCikar, gorunurFaaliyetGetir } from "@/lib/faaliyet/erisim";
import {
  raporMetniniCoz,
  raporYazilabilirMi,
} from "@/lib/faaliyet/rapor-kurallar";
import { faaliyetRaporuYazabilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Faaliyet raporunun yazılması ve güncellenmesi.
 *
 * Rapor SİLİNMEZ: yazıldıktan sonra düzeltilebilir ama kaldırılamaz. Biten bir
 * etkinliğin değerlendirmesinin ortadan kaybolması, raporlamanın anlamını
 * yitirmesi olurdu.
 */

function hataylaDon(yol: string, mesaj: string): never {
  redirect(`${yol}?hata=${encodeURIComponent(mesaj)}`);
}

export async function raporKaydetEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const faaliyetId = Number.parseInt(String(veri.get("faaliyetId") ?? ""), 10);
  if (!Number.isFinite(faaliyetId)) throw new BulunamadiHatasi();

  const yol = `/panel/faaliyetler/${faaliyetId}/rapor`;

  // Kapsam dışındaki faaliyet burada da 404 verir; varlığı sızmaz.
  const faaliyet = await gorunurFaaliyetGetir(kullanici, faaliyetId);
  if (!faaliyet) throw new BulunamadiHatasi();

  if (
    !faaliyetRaporuYazabilirMi(kullanici, faaliyetKapsamiCikar(faaliyet))
  ) {
    throw new YetkiHatasi("Bu faaliyetin raporunu yazma yetkiniz yok.");
  }

  const hazir = raporYazilabilirMi({
    tarih: faaliyet.tarih,
    bitisTarihi: faaliyet.bitisTarihi,
    durum: faaliyet.durum,
    simdi: new Date(),
  });
  if (!hazir.olurMu) hataylaDon(yol, hazir.neden ?? "Rapor yazılamaz.");

  const karar = raporMetniniCoz({
    degerlendirme: String(veri.get("degerlendirme") ?? ""),
    kazanimlar: String(veri.get("kazanimlar") ?? ""),
  });
  if (!karar.olurMu) hataylaDon(yol, karar.neden);

  const vardiOnce = await prisma.faaliyetRaporu.findUnique({
    where: { faaliyetId },
    select: { faaliyetId: true },
  });

  await prisma.faaliyetRaporu.upsert({
    where: { faaliyetId },
    update: {
      degerlendirme: karar.degerlendirme,
      kazanimlar: karar.kazanimlar,
      // Yazan GÜNCELLENİR: raporu en son kim düzenlediyse odur.
      yazanKullaniciId: kullanici.id,
    },
    create: {
      faaliyetId,
      degerlendirme: karar.degerlendirme,
      kazanimlar: karar.kazanimlar,
      yazanKullaniciId: kullanici.id,
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "FAALIYET",
    hedefId: faaliyetId,
    detay: `Faaliyet raporu ${vardiOnce ? "güncellendi" : "yazıldı"}: ${faaliyet.ad}`,
  });

  revalidatePath(yol);
  revalidatePath(`/panel/faaliyetler/${faaliyetId}`);
  redirect(`${yol}?durum=${vardiOnce ? "guncellendi" : "yazildi"}`);
}
