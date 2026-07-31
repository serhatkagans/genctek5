"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { talebiCoz } from "@/lib/iletisim/kurallar";
import { gunSonu } from "@/lib/tarih";
import { basvuruYapabilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Talep panosu eylemleri.
 *
 * İlan açma yetkisi `basvuruYapabilirMi` ile aynı: faaliyete başvurabilen
 * herkes (öğrenci ve öğretmen) ilan da açabilir. Merkez personeli dışarıda —
 * YEĞİTEK'in takım arkadaşı araması diye bir durum yok, duyuru kanalı ayrı.
 */

const YOL = "/panel/talepler";

function hataylaDon(mesaj: string): never {
  redirect(`${YOL}?hata=${encodeURIComponent(mesaj)}`);
}

export async function talepAcEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!basvuruYapabilirMi(kullanici)) {
    throw new YetkiHatasi("İlan açma yetkiniz yok.");
  }

  const karar = talebiCoz(
    {
      baslik: String(veri.get("baslik") ?? ""),
      icerik: String(veri.get("icerik") ?? ""),
      // Gün sonu alınır: seçilen günün tamamı geçerli sayılmalı.
      sonGecerlilik: gunSonu(String(veri.get("sonGecerlilik") ?? "") || null),
    },
    new Date(),
  );
  if (!karar.olurMu) hataylaDon(karar.neden);

  /*
   * Çalışma grubu isteğe bağlı ama SEÇİLDİYSE var olmalı. Formdan gelen
   * kimlik doğrulanmadan yazılsaydı olmayan bir gruba bağlı ilan oluşurdu.
   */
  const grupId = Number.parseInt(String(veri.get("calismaGrubuId") ?? ""), 10);
  const grup = Number.isFinite(grupId)
    ? await prisma.calismaGrubu.findFirst({
        where: { id: grupId, aktif: true },
        select: { id: true },
      })
    : null;

  const talep = await prisma.talep.create({
    data: {
      acanKullaniciId: kullanici.id,
      calismaGrubuId: grup?.id ?? null,
      baslik: karar.baslik,
      icerik: karar.icerik,
      sonGecerlilik: karar.sonGecerlilik,
    },
    select: { id: true },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Talep ilanı açıldı: ${karar.baslik}`,
  });

  revalidatePath(YOL);
  redirect(`${YOL}?durum=acildi&id=${talep.id}`);
}

/**
 * İlanı kapatır. SİLME YOKTUR: kimin ne aradığı geçmiş kaydıdır ve kapanan
 * ilan üzerinden kurulmuş bağlantılar anlamsızlaşmamalı.
 */
export async function talepKapatEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const talepId = Number.parseInt(String(veri.get("talepId") ?? ""), 10);
  if (!Number.isFinite(talepId)) throw new BulunamadiHatasi();

  // Sahiplik ve varlık tek sorguda: başkasının ilanının kimliğini forma yazan
  // kullanıcı burada boş sonuç alır.
  const talep = await prisma.talep.findFirst({
    where: { id: talepId, acanKullaniciId: kullanici.id },
    select: { id: true, baslik: true },
  });
  if (!talep) throw new BulunamadiHatasi();

  await prisma.talep.update({
    where: { id: talep.id },
    data: { kapatildiMi: true },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Talep ilanı kapatıldı: ${talep.baslik}`,
  });

  revalidatePath(YOL);
  redirect(`${YOL}?durum=kapatildi`);
}
