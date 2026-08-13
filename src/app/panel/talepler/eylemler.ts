"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { TALEP_TURU_ETIKETLERI, talebiCoz } from "@/lib/iletisim/kurallar";
import { gunSonu } from "@/lib/tarih";
import { panodaEslesmeArayabilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Pano (eski adıyla Talep Panosu) eylemleri.
 *
 * İlan açma yetkisi `panodaEslesmeArayabilirMi`: öğrenci, öğretmen ve dış
 * kullanıcılar (mezun, paydaş temsilcisi) ilan açabilir. Merkez personeli
 * dışarıda — YEĞİTEK'in takım arkadaşı araması diye bir durum yok, duyuru
 * kanalı ayrı. Panoyu OKUMASI ise serbest (13 Ağustos 2026 · bkz.
 * talepPanosuGorebilirMi): görme ile açma o gün ayrıldı.
 *
 * Kapı faaliyete BAŞVURU yetkisinden ayrıdır: pano bir ilan tahtasıdır,
 * başvuruyla ilgisi yok (bkz. lib/yetki/izinler.ts).
 */

const YOL = "/panel/talepler";

function hataylaDon(mesaj: string): never {
  redirect(`${YOL}?hata=${encodeURIComponent(mesaj)}`);
}

export async function talepAcEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!panodaEslesmeArayabilirMi(kullanici)) {
    throw new YetkiHatasi("İlan açma yetkiniz yok.");
  }

  const karar = talebiCoz(
    {
      baslik: String(veri.get("baslik") ?? ""),
      icerik: String(veri.get("icerik") ?? ""),
      // Gün sonu alınır: seçilen günün tamamı geçerli sayılmalı.
      sonGecerlilik: gunSonu(String(veri.get("sonGecerlilik") ?? "") || null),
      tur: String(veri.get("tur") ?? ""),
    },
    new Date(),
  );
  if (!karar.olurMu) hataylaDon(karar.neden);

  /*
   * ÇALIŞMA ALANI ARTIK SORULMUYOR (10 Ağustos 2026 · istek: "Çalışma alanı
   * (isteğe bağlı) kalkacak"). Sütun ve pano rozeti duruyor — daha önce alanı
   * seçilmiş talepler etiketli görünmeye devam ediyor — yeni kayıtta boş
   * kalıyor. Form alanı kalktığı için doğrulama da kalktı; okunmayan bir alanı
   * doğrulamak, kalkmadığı izlenimi verirdi.
   */
  const talep = await prisma.talep.create({
    data: {
      acanKullaniciId: kullanici.id,
      calismaGrubuId: null,
      tur: karar.tur,
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
    detay: `Pano ilanı açıldı (${TALEP_TURU_ETIKETLERI[karar.tur]}): ${karar.baslik}`,
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
    detay: `Pano ilanı kapatıldı: ${talep.baslik}`,
  });

  revalidatePath(YOL);
  redirect(`${YOL}?durum=kapatildi`);
}
