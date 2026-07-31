"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FaaliyetDurumu } from "@/generated/prisma/enums";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { depolama } from "@/lib/depolama";
import { ekKaydet, ekSinirlariniGetir } from "@/lib/faaliyet/ek-kaydet";
import { yorumKabulEdilirMi } from "@/lib/faaliyet/ek-kurallar";
import { faaliyetIcerikAlabilirMi } from "@/lib/faaliyet/kurallar";
import { faaliyetKapsamiCikar, gorunurFaaliyetGetir } from "@/lib/faaliyet/erisim";
import { faaliyetPaydasKatkisiniCoz } from "@/lib/paydas/kurallar";
import {
  ekYukleyebilirMi,
  faaliyetPaydasiYonetebilirMi,
  yorumSilebilirMi,
  yorumYazabilirMi,
} from "@/lib/yetki/izinler";
import { paydasKapsamFiltresi } from "@/lib/yetki/kapsam";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Faaliyet eki ve yorum eylemleri — references/domain-rules.md Bölüm 7.
 *
 * Her eylem önce faaliyetin GÖRÜNÜR olduğunu doğrular: ek ve yorum ayrı bir
 * izin sistemi değil, faaliyet kapsamının uzantısıdır. Kapsam dışı faaliyet
 * 403 değil "bulunamadı" döner.
 */

function metin(veri: FormData, alan: string): string {
  return String(veri.get(alan) ?? "").trim();
}

function sayi(veri: FormData, alan: string): number | null {
  const deger = Number.parseInt(metin(veri, alan), 10);
  return Number.isFinite(deger) ? deger : null;
}

/** Faaliyeti kapsam kontrolünden geçirerek getirir. */
async function gorunurFaaliyet(veri: FormData) {
  const kullanici = await oturumKullanicisiZorunlu();
  const faaliyetId = sayi(veri, "faaliyetId");
  if (faaliyetId === null) throw new BulunamadiHatasi();

  const faaliyet = await gorunurFaaliyetGetir(kullanici, faaliyetId);
  if (!faaliyet) throw new BulunamadiHatasi();

  return {
    kullanici,
    faaliyet,
    kapsam: faaliyetKapsamiCikar(faaliyet),
    yol: `/panel/faaliyetler/${faaliyetId}`,
  };
}

function hataylaDon(yol: string, mesaj: string): never {
  redirect(`${yol}?hata=${encodeURIComponent(mesaj)}`);
}

/**
 * İptal edilen faaliyet YENİ içerik kabul etmez.
 *
 * Mevcut yorum ve dosyalar geçmiş kaydı olarak yerinde kalır (ve silinebilir);
 * kapanan şey yalnızca ekleme yönüdür.
 */
function iptalliyseDur(
  faaliyet: { durum: FaaliyetDurumu },
  yol: string,
): void {
  if (!faaliyetIcerikAlabilirMi(faaliyet.durum)) {
    hataylaDon(yol, "Bu faaliyet iptal edildi; yeni içerik eklenemez.");
  }
}

// ---------------------------------------------------------------------------
// Ekler
// ---------------------------------------------------------------------------

export async function ekYukleEylemi(veri: FormData): Promise<void> {
  const { kullanici, faaliyet, kapsam, yol } = await gorunurFaaliyet(veri);

  // Rol kontrolü tek başına yetmez: aynı rolden başka bir danışman,
  // başkasının faaliyetine dosya ekleyemez.
  if (!ekYukleyebilirMi(kullanici, kapsam)) {
    throw new YetkiHatasi("Bu faaliyete dosya ekleme yetkiniz yok.");
  }

  iptalliyseDur(faaliyet, yol);

  const dosya = veri.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) {
    hataylaDon(yol, "Dosya seçilmedi.");
  }

  const sonuc = await ekKaydet({
    faaliyetId: faaliyet.id,
    yukleyenKullaniciId: kullanici.id,
    dosya,
    sinirlar: await ekSinirlariniGetir(),
    // Faaliyetin henüz kapağı yoksa yüklenen ilk görsel kapak olur; kullanıcı
    // ayrıca işaretlemek zorunda kalmasın.
    kapakYap: faaliyet.kapakEkId === null,
  });
  if (!sonuc.olurMu) {
    hataylaDon(yol, sonuc.neden ?? "Dosya kabul edilmedi.");
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "FAALIYET_EK",
    hedefId: sonuc.ekId!,
    detay: `Faaliyete ek yüklendi: ${dosya.name} (${faaliyet.ad})`,
  });

  revalidatePath(yol);
  redirect(`${yol}?durum=ek-yuklendi`);
}

/** Yüklenmiş bir görseli faaliyetin tanıtıcı görseli yapar. */
export async function kapakSecEylemi(veri: FormData): Promise<void> {
  const { kullanici, kapsam, yol } = await gorunurFaaliyet(veri);

  if (!ekYukleyebilirMi(kullanici, kapsam)) {
    throw new YetkiHatasi("Bu faaliyetin kapağını değiştirme yetkiniz yok.");
  }

  const ekId = sayi(veri, "ekId");
  if (ekId === null) throw new BulunamadiHatasi();

  // Yalnızca bu faaliyetin, silinmemiş ve GÖRSEL olan eki kapak olabilir.
  const ek = await prisma.faaliyetEk.findFirst({
    where: {
      id: ekId,
      faaliyetId: kapsam.id,
      silindiMi: false,
      mimeTipi: { startsWith: "image/" },
    },
    select: { id: true, dosyaAdi: true },
  });
  if (!ek) throw new BulunamadiHatasi();

  await prisma.faaliyet.update({
    where: { id: kapsam.id },
    data: { kapakEk: { connect: { id: ek.id } } },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "FAALIYET",
    hedefId: kapsam.id,
    detay: `Tanıtıcı görsel değiştirildi: ${ek.dosyaAdi}`,
  });

  revalidatePath(yol);
  revalidatePath("/panel/faaliyetler");
  redirect(`${yol}?durum=kapak-secildi`);
}

export async function ekSilEylemi(veri: FormData): Promise<void> {
  const { kullanici, faaliyet, kapsam, yol } = await gorunurFaaliyet(veri);
  const kapakEkId = faaliyet.kapakEkId;

  const ekId = sayi(veri, "ekId");
  if (ekId === null) throw new BulunamadiHatasi();

  const ek = await prisma.faaliyetEk.findFirst({
    where: { id: ekId, faaliyetId: kapsam.id, silindiMi: false },
    select: { id: true, dosyaAdi: true, depolamaYolu: true },
  });
  if (!ek) throw new BulunamadiHatasi();

  if (!ekYukleyebilirMi(kullanici, kapsam)) {
    throw new YetkiHatasi("Bu eki silme yetkiniz yok.");
  }

  /*
   * Kayıt soft-delete edilir (kim ne zaman sildi log gereği kalmalı), ama
   * dosyanın kendisi diskten kaldırılır: KVKK açısından içeriği tutmanın
   * gerekçesi yok, silme İZİNİ tutmanın var.
   *
   * Silinen ek faaliyetin kapağıysa kapak da düşürülür — aksi halde liste
   * ekranı artık indirilemeyen bir görseli göstermeye çalışırdı. Veritabanı
   * kısıtı SET NULL yalnızca satır GERÇEKTEN silinseydi devreye girerdi.
   */
  await prisma.$transaction(async (islem) => {
    if (kapakEkId === ek.id) {
      await islem.faaliyet.update({
        where: { id: kapsam.id },
        data: { kapakEk: { disconnect: true } },
      });
    }
    await islem.faaliyetEk.update({
      where: { id: ek.id },
      data: {
        silindiMi: true,
        silenKullaniciId: kullanici.id,
        silinmeTarihi: new Date(),
      },
    });
  });
  await depolama().sil(ek.depolamaYolu);

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "FAALIYET_EK",
    hedefId: ek.id,
    detay: `Faaliyet eki silindi: ${ek.dosyaAdi}`,
  });

  revalidatePath(yol);
  redirect(`${yol}?durum=ek-silindi`);
}

// ---------------------------------------------------------------------------
// Yorumlar
// ---------------------------------------------------------------------------

export async function yorumYazEylemi(veri: FormData): Promise<void> {
  const { kullanici, faaliyet, kapsam, yol } = await gorunurFaaliyet(veri);

  // Faaliyeti görebilen herkes yorum yazabilir; ayrı bir izin sistemi yok.
  if (!yorumYazabilirMi(kullanici, kapsam)) {
    throw new YetkiHatasi("Bu faaliyete yorum yazma yetkiniz yok.");
  }

  iptalliyseDur(faaliyet, yol);

  const icerik = metin(veri, "icerik");
  const karar = yorumKabulEdilirMi(icerik);
  if (!karar.olurMu) {
    hataylaDon(yol, karar.neden ?? "Yorum kabul edilmedi.");
  }

  // Yanıtlanan yorum aynı faaliyete ait olmalı; başka faaliyetin yorumuna
  // zincir kurulamaz.
  const ustYorumId = sayi(veri, "ustYorumId");
  const ustYorum =
    ustYorumId !== null
      ? await prisma.yorum.findFirst({
          where: { id: ustYorumId, faaliyetId: faaliyet.id },
          select: { id: true },
        })
      : null;

  const yorum = await prisma.yorum.create({
    data: {
      faaliyetId: faaliyet.id,
      yazanKullaniciId: kullanici.id,
      ustYorumId: ustYorum?.id ?? null,
      icerik,
    },
    select: { id: true },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "YORUM",
    hedefId: yorum.id,
    detay: `Faaliyete yorum yazıldı: ${faaliyet.ad}`,
  });

  revalidatePath(yol);
  redirect(`${yol}?durum=yorum-yazildi#yorumlar`);
}

export async function yorumSilEylemi(veri: FormData): Promise<void> {
  const { kullanici, kapsam, yol } = await gorunurFaaliyet(veri);

  const yorumId = sayi(veri, "yorumId");
  if (yorumId === null) throw new BulunamadiHatasi();

  const yorum = await prisma.yorum.findFirst({
    where: { id: yorumId, faaliyetId: kapsam.id, silindiMi: false },
    select: { id: true, yazanKullaniciId: true },
  });
  if (!yorum) throw new BulunamadiHatasi();

  if (!yorumSilebilirMi(kullanici, yorum, kapsam)) {
    throw new YetkiHatasi("Bu yorumu silme yetkiniz yok.");
  }

  /*
   * Soft delete: içerik kullanıcıya gösterilmez ama kayıt kalır. Yanıt zinciri
   * kopmasın diye satır silinmez — silinen üst yorum "silindi" görünür, altına
   * yazılmış yanıtlar yerinde durur.
   */
  await prisma.yorum.update({
    where: { id: yorum.id },
    data: {
      silindiMi: true,
      silenKullaniciId: kullanici.id,
      silinmeTarihi: new Date(),
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "YORUM",
    hedefId: yorum.id,
    detay:
      yorum.yazanKullaniciId === kullanici.id
        ? "Kendi yorumunu sildi"
        : "Başkasının yorumunu sildi (moderasyon)",
  });

  revalidatePath(yol);
  redirect(`${yol}?durum=yorum-silindi#yorumlar`);
}

// ---------------------------------------------------------------------------
// Paydaş bağlantısı
// ---------------------------------------------------------------------------

/**
 * Faaliyete paydaş bağlar (analiz dokümanı 4.3, "Paydaş bilgisi (varsa)").
 *
 * Bağlantı kurmak, paydaş kaydını YÖNETMEKTEN farklıdır: faaliyeti açan
 * danışman öğretmen kendi etkinliğinin hangi kurumla yapıldığını yazabilmeli,
 * ama bu ona il envanterini düzenleme yetkisi vermez. Seçilebilecek paydaşlar
 * kişinin kapsam filtresinden geçer — başka ilin kaydı id ile bağlanamaz.
 */
export async function faaliyetPaydasEkleEylemi(veri: FormData): Promise<void> {
  const { kullanici, faaliyet, kapsam, yol } = await gorunurFaaliyet(veri);

  if (!faaliyetPaydasiYonetebilirMi(kullanici, kapsam)) {
    throw new YetkiHatasi("Bu faaliyetin paydaş bilgisini düzenleyemezsiniz.");
  }
  iptalliyseDur(faaliyet, yol);

  const paydasId = sayi(veri, "paydasId");
  if (paydasId === null) hataylaDon(yol, "Paydaş seçilmelidir.");

  const katkiKarari = faaliyetPaydasKatkisiniCoz(metin(veri, "katkisi"));
  if (!katkiKarari.olurMu) hataylaDon(yol, katkiKarari.neden);

  // Kapsam kontrolü: kullanıcının göremediği bir paydaş "bulunamaz".
  const paydas = await prisma.paydas.findFirst({
    where: { AND: [{ id: paydasId }, paydasKapsamFiltresi(kullanici)] },
    select: { id: true, ad: true, aktif: true },
  });
  if (!paydas) hataylaDon(yol, "Seçilen paydaş bulunamadı.");
  if (!paydas.aktif) {
    hataylaDon(yol, "Pasife alınmış paydaş yeni faaliyete bağlanamaz.");
  }

  const mevcut = await prisma.faaliyetPaydas.findUnique({
    where: { faaliyetId_paydasId: { faaliyetId: faaliyet.id, paydasId: paydas.id } },
    select: { faaliyetId: true },
  });
  if (mevcut) hataylaDon(yol, "Bu paydaş faaliyete zaten bağlı.");

  await prisma.faaliyetPaydas.create({
    data: {
      faaliyetId: faaliyet.id,
      paydasId: paydas.id,
      katkisi: katkiKarari.katkisi,
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "FAALIYET",
    hedefId: faaliyet.id,
    detay: `Faaliyete paydaş eklendi: ${paydas.ad}`,
  });

  revalidatePath(yol);
  revalidatePath(`/panel/paydaslar/${paydas.id}`);
  redirect(`${yol}?durum=paydas-eklendi`);
}

/**
 * Bağlantıyı kaldırır. Paydaş kaydına DOKUNULMAZ; kaldırılan yalnızca bu
 * faaliyetle kurulan ilişkidir (yanlış kuruma bağlanmış olabilir).
 */
export async function faaliyetPaydasCikarEylemi(veri: FormData): Promise<void> {
  const { kullanici, faaliyet, kapsam, yol } = await gorunurFaaliyet(veri);

  if (!faaliyetPaydasiYonetebilirMi(kullanici, kapsam)) {
    throw new YetkiHatasi("Bu faaliyetin paydaş bilgisini düzenleyemezsiniz.");
  }

  const paydasId = sayi(veri, "paydasId");
  if (paydasId === null) throw new BulunamadiHatasi();

  const bag = await prisma.faaliyetPaydas.findUnique({
    where: { faaliyetId_paydasId: { faaliyetId: faaliyet.id, paydasId } },
    select: { paydas: { select: { ad: true } } },
  });
  if (!bag) hataylaDon(yol, "Bu paydaş faaliyete bağlı değil.");

  await prisma.faaliyetPaydas.delete({
    where: { faaliyetId_paydasId: { faaliyetId: faaliyet.id, paydasId } },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "FAALIYET",
    hedefId: faaliyet.id,
    detay: `Faaliyetten paydaş bağlantısı kaldırıldı: ${bag.paydas.ad}`,
  });

  revalidatePath(yol);
  revalidatePath(`/panel/paydaslar/${paydasId}`);
  redirect(`${yol}?durum=paydas-cikarildi`);
}
