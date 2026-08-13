"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  mentorlukBasvurusuKaydet,
  mentorlukKapsamFiltresi,
} from "@/lib/mentor/veri";
import {
  mentorlukKabulEdilirMi,
  mentorlukKarariGecerliMi,
} from "@/lib/mentor/kurallar";
import {
  mentorlukBasvurabilirMi,
  mentorlukOnaylayabilirMi,
} from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Mentörlük başvurusu ve kararı (7 Ağustos 2026).
 *
 * Başvuru eylemleri kişinin KENDİ kaydı üzerinde çalışır: `kullaniciId`
 * hiçbir yerde form girdisinden okunmaz. Karar eylemleri ise başkasının
 * kaydına dokunuyor ve bu yüzden hem yetki hem KAPSAM kontrolünden geçiyor —
 * il koordinatörü yalnızca kendi ilindeki başvuruyu karara bağlayabilir.
 */

const PANEL = "/panel";
const KUYRUK = "/panel/mentorluk";
/*
 * BAŞVURU BÖLÜMÜ PANODA (13 Ağustos 2026 · istek: "paneldeki Mentör olarak
 * başvur kısmını panoya al"). Dönüş adresi de oraya bakıyor; panele
 * döndürülseydi kişi başvurusunu gönderdikten sonra formun bulunmadığı bir
 * ekranda "başvurunuz alındı" iletisini arardı.
 *
 * ÇAPA `mentorlugum` DEĞİŞMEDİ: e-postalardaki ve panel kartındaki bağlantılar
 * onu taşıyor.
 */
const PANO = "/panel/talepler";

function basvuruyaDon(sorgu: string): never {
  revalidatePath(PANO);
  // Panel'deki "Mentörlüklerim" kartı ile profildeki durum da tazelenmeli.
  revalidatePath(PANEL);
  revalidatePath("/panel/profil");
  redirect(`${PANO}?${sorgu}#mentorlugum`);
}

export async function mentorlukBasvurEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!mentorlukBasvurabilirMi(kullanici)) {
    throw new YetkiHatasi("Mentörlük başvurusu yapamazsınız.");
  }

  /*
   * Seçilebilir gruplar VERİTABANINDAN okunuyor ve karar ona karşı veriliyor:
   * form girdisine güvenilseydi kapatılmış ya da hiç var olmayan bir gruba
   * mentörlük beyan edilebilirdi.
   */
  const gruplar = await prisma.calismaGrubu.findMany({
    where: { aktif: true },
    select: { id: true },
  });

  const karar = mentorlukKabulEdilirMi({
    grupIdleri: veri.getAll("calismaGrubuId"),
    konular: String(veri.get("konular") ?? ""),
    gecerliGrupIdleri: gruplar.map((grup) => grup.id),
  });
  if (!karar.olurMu) {
    basvuruyaDon(`hata=${encodeURIComponent(karar.neden)}`);
  }

  await mentorlukBasvurusuKaydet({
    kullaniciId: kullanici.id,
    grupIdleri: karar.grupIdleri,
    konular: karar.konular,
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Mentörlük başvurusu yapıldı (${karar.grupIdleri.length} çalışma grubu)`,
  });

  basvuruyaDon("durum=mentorluk-basvuruldu");
}

/**
 * Mentörlüğü bırakma.
 *
 * Kayıt SİLİNMEZ, `BIRAKILDI` olur: silinseydi kişi yeniden başvurduğunda
 * geçmişi olmayan yeni bir kayıt açılır ve "bu kişi daha önce mentördü"
 * bilgisi kaybolurdu. Ret'ten ayrı bir durum çünkü ret bir karardır, bu bir
 * vazgeçmedir.
 */
export async function mentorluguBirakEylemi(): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const mevcut = await prisma.mentorluk.findUnique({
    where: { kullaniciId: kullanici.id },
    select: { durum: true },
  });
  if (!mevcut) throw new BulunamadiHatasi();

  await prisma.mentorluk.update({
    where: { kullaniciId: kullanici.id },
    data: { durum: "BIRAKILDI", retGerekcesi: null },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "Mentörlük bırakıldı",
  });

  basvuruyaDon("durum=mentorluk-birakildi");
}

/**
 * Onay/ret kararı — YALNIZCA proje yöneticisi (11 Ağustos 2026).
 *
 * İl koordinatörü çıkarıldı: kendi başvurusu her zaman kendi kuyruğuna
 * düşüyordu ve onaylayabiliyordu (bkz. mentorlukOnaylayabilirMi).
 *
 * Kayıt KAPSAM FİLTRESİYLE BİRLİKTE okunmaya devam ediyor. Merkez için filtre
 * boş dönüyor, yani bugün hiçbir satırı elemiyor; kaldırılmadı çünkü yetki
 * yeniden genişletilirse (örneğin il koordinatörüne "kendisi hariç" izni)
 * kapsamı tutan tek yer burasıdır. Bulunamayan kayıt 404 verir (403 değil):
 * 403, "böyle bir başvuru var" bilgisini sızdırırdı.
 *
 * KENDİ BAŞVURUSU AYRICA ELENİR (kendiBasvurusuMu): yetki listesi "kim
 * onaylayabilir" sorusunu cevaplar, o koşul "kendi işini onaylayamaz"
 * ilkesini.
 */
export async function mentorlukKararEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!mentorlukOnaylayabilirMi(kullanici)) {
    throw new YetkiHatasi("Mentörlük başvurusu karara bağlayamazsınız.");
  }

  const hedefId = Number.parseInt(String(veri.get("kullaniciId") ?? ""), 10);
  if (!Number.isInteger(hedefId)) throw new BulunamadiHatasi();

  const mevcut = await prisma.mentorluk.findFirst({
    where: {
      AND: [{ kullaniciId: hedefId }, mentorlukKapsamFiltresi(kullanici)],
    },
    select: {
      durum: true,
      kullanici: { select: { ad: true, soyad: true } },
    },
  });
  if (!mevcut) throw new BulunamadiHatasi();

  const yeniDurum = String(veri.get("karar") ?? "");
  const karar = mentorlukKarariGecerliMi({
    mevcutDurum: mevcut.durum,
    yeniDurum: yeniDurum === "ONAYLA" ? "ONAYLANDI" : "REDDEDILDI",
    retGerekcesi: String(veri.get("retGerekcesi") ?? ""),
    kendiBasvurusuMu: hedefId === kullanici.id,
  });
  if (!karar.olurMu) {
    revalidatePath(KUYRUK);
    redirect(`${KUYRUK}?hata=${encodeURIComponent(karar.neden)}`);
  }

  const durum = yeniDurum === "ONAYLA" ? "ONAYLANDI" : "REDDEDILDI";
  await prisma.mentorluk.update({
    where: { kullaniciId: hedefId },
    data: {
      durum,
      kararVerenKullaniciId: kullanici.id,
      kararTarihi: new Date(),
      retGerekcesi: karar.retGerekcesi,
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "ROL",
    hedefId,
    detay: `Mentörlük ${durum === "ONAYLANDI" ? "onaylandı" : "reddedildi"}: ${mevcut.kullanici.ad} ${mevcut.kullanici.soyad}`,
  });

  revalidatePath(KUYRUK);
  revalidatePath(PANEL);
  redirect(
    `${KUYRUK}?durum=${durum === "ONAYLANDI" ? "onaylandi" : "reddedildi"}`,
  );
}
