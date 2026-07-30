import type { LogHedefTip, LogIslemi } from "@/generated/prisma/enums";
import { prisma } from "../db";

/**
 * Erişim logu — SKILL.md "Değişmezler" 7: her veri görüntüleme ve değiştirme
 * işlemi loglanır. Yorum silme ve dosya kaldırma da buraya yazılır; ayrı bir
 * içerik log tablosu yoktur.
 */

export interface LogKaydi {
  kullaniciId: number;
  islem: LogIslemi;
  hedefTip: LogHedefTip;
  hedefId: string | number;
  ipAdresi?: string | null;
  detay?: string | null;
}

/**
 * İsteği yapan IP adresi. Yalnızca HTTP isteği bağlamında vardır.
 *
 * `next/headers` DİNAMİK yükleniyor: gecelik senkron gibi istek bağlamı
 * olmayan işler de aynı log fonksiyonunu kullanıyor ve orada modülün kendisi
 * ya da headers() çağrısı hata verir. IP yüzünden log kaydı düşmemeli, o
 * yüzden hata yutuluyor ve alan null kalıyor.
 *
 * Uygulama ters vekil (nginx) arkasında çalıştığından gerçek IP
 * `x-forwarded-for` başlığındadır; zincirin ilki istemcidir.
 */
async function istekIpAdresi(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    const basliklar = await headers();
    const iletilen = basliklar.get("x-forwarded-for");
    if (iletilen) return iletilen.split(",")[0]?.trim() || null;
    return basliklar.get("x-real-ip");
  } catch {
    return null;
  }
}

export async function erisimLogla(kayit: LogKaydi): Promise<void> {
  await prisma.erisimlogu.create({
    data: {
      kullaniciId: kayit.kullaniciId,
      islem: kayit.islem,
      hedefTip: kayit.hedefTip,
      hedefId: String(kayit.hedefId),
      ipAdresi: kayit.ipAdresi ?? (await istekIpAdresi()),
      detay: kayit.detay ?? null,
    },
  });
}

/** Birden çok kaydın tek seferde görüntülenmesi (liste ekranları) için. */
export async function erisimLoglaCoklu(kayitlar: LogKaydi[]): Promise<void> {
  if (kayitlar.length === 0) return;
  const ip = await istekIpAdresi();
  await prisma.erisimlogu.createMany({
    data: kayitlar.map((kayit) => ({
      kullaniciId: kayit.kullaniciId,
      islem: kayit.islem,
      hedefTip: kayit.hedefTip,
      hedefId: String(kayit.hedefId),
      ipAdresi: kayit.ipAdresi ?? ip,
      detay: kayit.detay ?? null,
    })),
  });
}
