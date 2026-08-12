"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { BILDIRIM_KODLARI, bildirimGonder } from "@/lib/bildirim/gonder";
import { prisma } from "@/lib/db";
import {
  baglantiIstegiGonderilebilirMi,
  istekKarariniCoz,
  istekMesajiniCoz,
} from "@/lib/iletisim/kurallar";
import { talepPanosuGorebilirMi } from "@/lib/yetki/izinler";
import { baglantiKarariFiltresi } from "@/lib/yetki/kapsam";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Bağlantı isteği: gönderme ve karara bağlama.
 *
 * Onay, isteği YAPANIN danışmanı ya da ilinin koordinatörü tarafından verilir
 * (bkz. baglantiKarariFiltresi). Hedefin tarafı karar vermez: bu "kabul ediyor
 * musun" sorusu değil, "öğrencimin bu teması kurmasına izin veriyor muyum"
 * sorusudur.
 */

const PANO = "/panel/talepler";

/*
 * Karar sonrası dönülecek yer, 12 Ağustos 2026'da "Bağlantılarım"a taşındı:
 * onay ekranı o sayfanın içinde eridi (bkz. yazismalar/page.tsx). Çapa
 * bilerek var — istek listesi sayfanın başında ama karar verildikten sonra
 * sayfa yeniden basıldığında o kart küçülüp kaybolabiliyor; çapa, kullanıcıyı
 * kalan isteklerin bulunduğu yere indirir.
 */
const YOL = "/panel/yazismalar";
const ISTEK_CAPASI = "#istekler";

function hataylaDon(yol: string, mesaj: string): never {
  redirect(`${yol}?hata=${encodeURIComponent(mesaj)}`);
}

export async function baglantiIstegiGonderEylemi(
  veri: FormData,
): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!talepPanosuGorebilirMi(kullanici)) {
    throw new YetkiHatasi("Bağlantı isteği gönderme yetkiniz yok.");
  }

  const talepId = Number.parseInt(String(veri.get("talepId") ?? ""), 10);
  if (!Number.isFinite(talepId)) throw new BulunamadiHatasi();

  const mesajKarari = istekMesajiniCoz(String(veri.get("mesaj") ?? ""));
  if (!mesajKarari.olurMu) hataylaDon(PANO, mesajKarari.neden);

  // İlan aktif olmalı: kapanmış ya da süresi dolmuş ilana istek gönderilmez.
  const simdi = new Date();
  const talep = await prisma.talep.findFirst({
    where: { id: talepId, kapatildiMi: false, sonGecerlilik: { gte: simdi } },
    select: { id: true, baslik: true, acanKullaniciId: true },
  });
  if (!talep) {
    hataylaDon(PANO, "Bu ilan artık aktif değil.");
  }

  const [bekleyen, onayli] = await Promise.all([
    prisma.baglantiIstegi.findFirst({
      where: {
        isteyenKullaniciId: kullanici.id,
        hedefKullaniciId: talep.acanKullaniciId,
        onayDurumu: "BEKLIYOR",
      },
      select: { id: true },
    }),
    prisma.baglantiIstegi.findFirst({
      where: {
        onayDurumu: "ONAYLANDI",
        OR: [
          {
            isteyenKullaniciId: kullanici.id,
            hedefKullaniciId: talep.acanKullaniciId,
          },
          {
            isteyenKullaniciId: talep.acanKullaniciId,
            hedefKullaniciId: kullanici.id,
          },
        ],
      },
      select: { id: true },
    }),
  ]);

  const karar = baglantiIstegiGonderilebilirMi({
    isteyenId: kullanici.id,
    hedefId: talep.acanKullaniciId,
    bekleyenIstekVarMi: bekleyen !== null,
    onayliBaglantiVarMi: onayli !== null,
  });
  if (!karar.olurMu) hataylaDon(PANO, karar.neden ?? "İstek gönderilemedi.");

  const istek = await prisma.baglantiIstegi.create({
    data: {
      talepId: talep.id,
      isteyenKullaniciId: kullanici.id,
      hedefKullaniciId: talep.acanKullaniciId,
      mesaj: mesajKarari.mesaj,
    },
    select: { id: true },
  });

  /*
   * Uyarı ONAYLAYACAK KİŞİLERE gider, hedefe DEĞİL: hedef, onay verilene kadar
   * kendisiyle iletişim kurulmak istendiğini bilmez. Aksi halde reddedilen bir
   * istek bile hedefe "biri sana ulaşmaya çalıştı" bilgisi sızdırırdı.
   */
  const [danismanAtama, koordinatorler] = await Promise.all([
    prisma.danismanAtama.findFirst({
      where: { ogrenciId: kullanici.id, bitisTarihi: null },
      select: { danismanKullaniciId: true },
    }),
    kullanici.ilKodu
      ? prisma.kullaniciRol.findMany({
          where: {
            rolKodu: "IL_KOORDINATOR",
            ilKodu: kullanici.ilKodu,
            bitisTarihi: null,
          },
          select: { kullaniciId: true },
        })
      : [],
  ]);

  const hedefKisi = await prisma.kullanici.findUniqueOrThrow({
    where: { id: talep.acanKullaniciId },
    select: { ad: true, soyad: true },
  });

  const degiskenler = {
    isteyenAdSoyad: `${kullanici.ad} ${kullanici.soyad}`,
    hedefAdSoyad: `${hedefKisi.ad} ${hedefKisi.soyad}`,
    talepBasligi: talep.baslik,
  };

  const onaylayacaklar = new Set<number>(
    koordinatorler.map((k) => k.kullaniciId),
  );
  if (danismanAtama) onaylayacaklar.add(danismanAtama.danismanKullaniciId);

  for (const kullaniciId of onaylayacaklar) {
    await bildirimGonder({
      kullaniciId,
      kod: BILDIRIM_KODLARI.ONAY_BEKLEYEN_BAGLANTI,
      degiskenler,
    });
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: talep.acanKullaniciId,
    detay: `Bağlantı isteği gönderildi: ${degiskenler.hedefAdSoyad}`,
  });

  revalidatePath(PANO);
  revalidatePath(YOL);
  redirect(`${PANO}?durum=istek-gonderildi&id=${istek.id}`);
}

export async function baglantiKarariEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const istekId = Number.parseInt(String(veri.get("istekId") ?? ""), 10);
  if (!Number.isFinite(istekId)) throw new BulunamadiHatasi();

  // Yetki merkezi filtreden gelir: karar veremeyeceği bir isteğin kimliğini
  // forma yazan kullanıcı burada boş sonuç alır.
  const istek = await prisma.baglantiIstegi.findFirst({
    where: { AND: [{ id: istekId }, baglantiKarariFiltresi(kullanici)] },
    select: {
      id: true,
      onayDurumu: true,
      isteyenKullaniciId: true,
      hedefKullaniciId: true,
      isteyen: { select: { ad: true, soyad: true } },
      hedef: { select: { ad: true, soyad: true } },
    },
  });
  if (!istek) throw new BulunamadiHatasi();

  if (istek.onayDurumu !== "BEKLIYOR") {
    hataylaDon(YOL, "Bu isteğin kararı zaten verilmiş.");
  }

  const karar = istekKarariniCoz({
    onaylandiMi: veri.get("karar") === "onayla",
    gerekce: String(veri.get("gerekce") ?? ""),
  });
  if (!karar.olurMu) hataylaDon(YOL, karar.neden);

  await prisma.$transaction(async (islem) => {
    await islem.baglantiIstegi.update({
      where: { id: istek.id },
      data: {
        onayDurumu: karar.durum,
        kararVerenKullaniciId: kullanici.id,
        kararTarihi: new Date(),
        retGerekcesi: karar.durum === "REDDEDILDI" ? karar.gerekce : null,
      },
    });

    // Yazışma yalnızca ONAYLA birlikte açılır; bağlantı olmadan konuşma olmaz.
    if (karar.durum === "ONAYLANDI") {
      await islem.yazisma.create({ data: { baglantiIstegiId: istek.id } });
    }
  });

  await bildirimGonder({
    kullaniciId: istek.isteyenKullaniciId,
    kod: BILDIRIM_KODLARI.BAGLANTI_ISTEGI_KARARI,
    degiskenler: {
      hedefAdSoyad: `${istek.hedef.ad} ${istek.hedef.soyad}`,
      sonuc: karar.durum === "ONAYLANDI" ? "onaylandı" : "reddedildi",
      gerekce: karar.gerekce ?? "—",
    },
  });

  // Hedef ancak ONAY sonrası haberdar edilir.
  if (karar.durum === "ONAYLANDI") {
    await bildirimGonder({
      kullaniciId: istek.hedefKullaniciId,
      kod: BILDIRIM_KODLARI.YENI_YAZISMA,
      degiskenler: {
        isteyenAdSoyad: `${istek.isteyen.ad} ${istek.isteyen.soyad}`,
      },
    });
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: istek.isteyenKullaniciId,
    detay: `Bağlantı isteği ${
      karar.durum === "ONAYLANDI" ? "onaylandı" : "reddedildi"
    }: ${istek.isteyen.ad} ${istek.isteyen.soyad} → ${istek.hedef.ad} ${istek.hedef.soyad}`,
  });

  revalidatePath(YOL);
  redirect(
    `${YOL}?durum=${
      karar.durum === "ONAYLANDI" ? "onaylandi" : "reddedildi"
    }${ISTEK_CAPASI}`,
  );
}
