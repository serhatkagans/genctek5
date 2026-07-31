"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { topluDuyuruGonder } from "@/lib/bildirim/gonder";
import { duyuruyuCoz } from "@/lib/bildirim/toplu";
import { prisma } from "@/lib/db";
import { sistemAyarlariniYonetebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Toplu duyuru gönderimi — yalnızca proje yöneticisi.
 *
 * Yetki kapısı `sistemAyarlariniYonetebilirMi`: duyuru da bildirim şablonu gibi
 * TÜM kullanıcılara giden bir metindir ve aynı sorumluluk düzeyindedir. Ayrı
 * bir izin fonksiyonu açmak, aynı kararı iki yerde tutmak olurdu.
 */

const YOL = "/panel/duyurular";

function hataylaDon(mesaj: string): never {
  redirect(`${YOL}?hata=${encodeURIComponent(mesaj)}`);
}

export async function duyuruGonderEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!sistemAyarlariniYonetebilirMi(kullanici)) {
    throw new YetkiHatasi("Toplu duyuruyu yalnızca proje yöneticisi gönderir.");
  }

  const karar = duyuruyuCoz({
    hedef: String(veri.get("hedef") ?? ""),
    baslik: String(veri.get("baslik") ?? ""),
    icerik: String(veri.get("icerik") ?? ""),
    onaylandiMi: veri.get("onay") === "evet",
  });
  if (!karar.olurMu) hataylaDon(karar.neden);

  /*
   * Alıcılar ROLDEN okunur, kullanıcı tipinden değil: "öğretmen" diye bir rol
   * yok, öğretmen olmak öğrenci OLMAMAKtır (danışman, koordinatör, personel).
   * Pasif kullanıcıya duyuru gitmez.
   */
  const ogrenciKosulu = {
    aktif: true,
    roller: { some: { rolKodu: "OGRENCI" as const, bitisTarihi: null } },
  };
  const ogretmenKosulu = {
    aktif: true,
    roller: { none: { rolKodu: "OGRENCI" as const, bitisTarihi: null } },
  };

  const nerede =
    karar.hedef === "OGRENCI"
      ? ogrenciKosulu
      : karar.hedef === "OGRETMEN"
        ? ogretmenKosulu
        : { aktif: true };

  const alicilar = await prisma.kullanici.findMany({
    where: nerede,
    select: { id: true },
  });

  if (alicilar.length === 0) {
    hataylaDon("Seçtiğiniz gruba uyan aktif kullanıcı yok; duyuru gönderilmedi.");
  }

  const sonuc = await topluDuyuruGonder({
    aliciIdleri: alicilar.map((alici) => alici.id),
    baslik: karar.baslik,
    icerik: karar.icerik,
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "BILDIRIM_SABLONU",
    hedefId: "TOPLU_DUYURU",
    detay: `Toplu duyuru gönderildi (${karar.hedef}, ${sonuc.bildirimSayisi} kişi): ${karar.baslik}`,
  });

  revalidatePath(YOL);
  redirect(`${YOL}?durum=gonderildi&sayi=${sonuc.bildirimSayisi}`);
}
