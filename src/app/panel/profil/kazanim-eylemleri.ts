"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { cvKaydet, cvSil, cvSinirlariniGetir } from "@/lib/ogrenci/cv";
import {
  kazanimKabulEdilirMi,
  kazanimTipiTanimi,
} from "@/lib/ogrenci/kazanim-kurallar";
import { gunBasi } from "@/lib/tarih";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Öğrencinin kendi kazanım kayıtları ve CV'si —
 * references/domain-rules.md Bölüm 14.
 *
 * Hepsi oturumdaki kişinin KENDİ verisi üzerinde çalışır: `ogrenciId` hiçbir
 * yerde form girdisinden okunmaz, her zaman `kullanici.id`'dir. Danışman ya da
 * koordinatör bir öğrencinin kazanımını giremez/silemez — bunlar öğrenci
 * beyanıdır ve sahibi dışında kimse dokunmaz (çalışma grubu eklemeden farkı
 * budur).
 */

const YOL = "/panel/profil";

function hataylaDon(mesaj: string): never {
  redirect(`${YOL}?hata=${encodeURIComponent(mesaj)}`);
}

async function ogrenciZorunlu() {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!ogrenciMi(kullanici)) {
    throw new YetkiHatasi(
      "Kazanım ve CV kayıtları yalnızca öğrenci profilinde tutulur.",
    );
  }
  return kullanici;
}

export async function kazanimEkleEylemi(veri: FormData): Promise<void> {
  const kullanici = await ogrenciZorunlu();

  const karar = kazanimKabulEdilirMi({
    tip: String(veri.get("tip") ?? ""),
    baslik: String(veri.get("baslik") ?? ""),
    aciklama: String(veri.get("aciklama") ?? ""),
    // Gün başına alınır: kazanımlarda saat bilgisi sorulmuyor.
    tarih: gunBasi(String(veri.get("tarih") ?? "") || null),
    baglantiUrl: String(veri.get("baglantiUrl") ?? ""),
    derece: String(veri.get("derece") ?? ""),
    duzenleyen: String(veri.get("duzenleyen") ?? ""),
  });
  if (!karar.olurMu) hataylaDon(karar.neden);

  await prisma.ogrenciKazanim.create({
    data: { ogrenciId: kullanici.id, ...karar.kayit },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Kazanım eklendi (${kazanimTipiTanimi(karar.kayit.tip).baslik}): ${karar.kayit.baslik}`,
  });

  revalidatePath(YOL);
  revalidatePath(`/panel/ogrenciler/${kullanici.id}`);
  redirect(`${YOL}?durum=kazanim-eklendi`);
}

export async function kazanimSilEylemi(veri: FormData): Promise<void> {
  const kullanici = await ogrenciZorunlu();

  const kazanimId = Number.parseInt(String(veri.get("kazanimId") ?? ""), 10);
  if (!Number.isFinite(kazanimId)) throw new BulunamadiHatasi();

  /*
   * Silme `deleteMany` ile ve ogrenciId koşuluyla yapılır: `delete` ile id'ye
   * göre silinseydi forma başka bir öğrencinin kazanım id'sini yazan kullanıcı
   * o kaydı silebilirdi. Sahiplik kontrolü ve silme tek sorguda birleşiyor.
   */
  const kazanim = await prisma.ogrenciKazanim.findFirst({
    where: { id: kazanimId, ogrenciId: kullanici.id },
    select: { baslik: true },
  });
  if (!kazanim) throw new BulunamadiHatasi();

  await prisma.ogrenciKazanim.deleteMany({
    where: { id: kazanimId, ogrenciId: kullanici.id },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Kazanım silindi: ${kazanim.baslik}`,
  });

  revalidatePath(YOL);
  revalidatePath(`/panel/ogrenciler/${kullanici.id}`);
  redirect(`${YOL}?durum=kazanim-silindi`);
}

export async function cvYukleEylemi(veri: FormData): Promise<void> {
  const kullanici = await ogrenciZorunlu();

  const dosya = veri.get("cv");
  if (!(dosya instanceof File) || dosya.size === 0) {
    hataylaDon("CV dosyası seçilmedi.");
  }

  const sonuc = await cvKaydet({
    ogrenciId: kullanici.id,
    dosya,
    sinirlar: await cvSinirlariniGetir(),
  });
  if (!sonuc.olurMu) hataylaDon(sonuc.neden ?? "CV yüklenemedi.");

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `CV yüklendi: ${dosya.name}`,
  });

  revalidatePath(YOL);
  revalidatePath(`/panel/ogrenciler/${kullanici.id}`);
  redirect(`${YOL}?durum=cv-yuklendi`);
}

export async function cvSilEylemi(): Promise<void> {
  const kullanici = await ogrenciZorunlu();

  const silindi = await cvSil(kullanici.id);
  if (!silindi) hataylaDon("Kaldırılacak bir CV bulunamadı.");

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "CV kaldırıldı",
  });

  revalidatePath(YOL);
  revalidatePath(`/panel/ogrenciler/${kullanici.id}`);
  redirect(`${YOL}?durum=cv-silindi`);
}
