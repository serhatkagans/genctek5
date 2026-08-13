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
import { panodaEslesmeArayabilirMi } from "@/lib/yetki/izinler";
import { baglantiKarariFiltresi } from "@/lib/yetki/kapsam";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";

/**
 * Bağlantı isteği: gönderme ve karara bağlama.
 *
 * Onay, isteği YAPANIN danışmanı ya da ilinin koordinatörü tarafından verilir
 * (bkz. baglantiKarariFiltresi). Hedefin tarafı karar vermez: bu "kabul ediyor
 * musun" sorusu değil, "öğrencimin bu teması kurmasına izin veriyor muyum"
 * sorusudur.
 *
 * İKİ GİRİŞ VAR, TEK KAPI (12 Ağustos 2026):
 *   1. Panodaki ilandan  → `baglantiIstegiGonderEylemi`
 *   2. Akıştaki gönderiden → `kisiyeBaglantiIstegiEylemi`
 * İkisi de `istegiKur` içinden geçer; kurallar, bildirim ve loglama tek yerde.
 * Ayrı ayrı yazılsalardı biri güncellenip diğeri unutulurdu ve "hangi kapıdan
 * girdiğine göre farklı davranan bir yetki" en tehlikeli hata türüdür.
 */

const PANO = "/panel/talepler";
const AKIS = "/panel/akis";

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

/**
 * İki girişin ORTAK GÖVDESİ: kurallar, kayıt, bildirim ve loglama.
 *
 * Hedef ÇAĞIRANDAN GELİR ve burada bir daha sorgulanmaz — çünkü onu bulmak
 * iki kapıda farklı: panoda ilandan türetiliyor (ilan aktif mi?), akışta
 * doğrudan veriliyor (kişi var mı, aktif mi?). Ortaklaşan şey hedefin NASIL
 * bulunduğu değil, bulunduktan SONRA uygulanan kurallar.
 *
 * Yönlendirme yapmaz, karar döndürür: her kapı kendi ekranına dönmeli.
 */
async function istegiKur(girdi: {
  kullanici: OturumKullanicisi;
  hedefId: number;
  mesaj: string;
  talepId: number | null;
  talepBasligi: string | null;
}): Promise<{ olurMu: true; istekId: number } | { olurMu: false; neden: string }> {
  const { kullanici, hedefId } = girdi;

  const [bekleyen, onayli] = await Promise.all([
    prisma.baglantiIstegi.findFirst({
      where: {
        isteyenKullaniciId: kullanici.id,
        hedefKullaniciId: hedefId,
        onayDurumu: "BEKLIYOR",
      },
      select: { id: true },
    }),
    prisma.baglantiIstegi.findFirst({
      where: {
        onayDurumu: "ONAYLANDI",
        OR: [
          { isteyenKullaniciId: kullanici.id, hedefKullaniciId: hedefId },
          { isteyenKullaniciId: hedefId, hedefKullaniciId: kullanici.id },
        ],
      },
      select: { id: true },
    }),
  ]);

  const karar = baglantiIstegiGonderilebilirMi({
    isteyenId: kullanici.id,
    hedefId,
    bekleyenIstekVarMi: bekleyen !== null,
    onayliBaglantiVarMi: onayli !== null,
  });
  if (!karar.olurMu) {
    return { olurMu: false, neden: karar.neden ?? "İstek gönderilemedi." };
  }

  const istek = await prisma.baglantiIstegi.create({
    data: {
      talepId: girdi.talepId,
      isteyenKullaniciId: kullanici.id,
      hedefKullaniciId: hedefId,
      mesaj: girdi.mesaj,
    },
    select: { id: true },
  });

  /*
   * Uyarı ONAYLAYACAK KİŞİLERE gider, hedefe DEĞİL: hedef, onay verilene kadar
   * kendisiyle iletişim kurulmak istendiğini bilmez. Aksi halde reddedilen bir
   * istek bile hedefe "biri sana ulaşmaya çalıştı" bilgisi sızdırırdı.
   */
  const [danismanAtama, koordinatorler, hedefKisi] = await Promise.all([
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
    prisma.kullanici.findUniqueOrThrow({
      where: { id: hedefId },
      select: { ad: true, soyad: true },
    }),
  ]);

  const degiskenler = {
    isteyenAdSoyad: `${kullanici.ad} ${kullanici.soyad}`,
    hedefAdSoyad: `${hedefKisi.ad} ${hedefKisi.soyad}`,
    /*
     * İlansız istekte de bu alan DOLU gitmeli: bildirim şablonu
     * `{{talepBasligi}}` yer tutucusunu basıyor ve boş bırakılsaydı
     * onaylayana "… ilanı için" diye yarım bir cümle giderdi.
     */
    talepBasligi: girdi.talepBasligi ?? "Akıştaki paylaşımı üzerinden",
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
    hedefId,
    detay: `Bağlantı isteği gönderildi: ${degiskenler.hedefAdSoyad}`,
  });

  return { olurMu: true, istekId: istek.id };
}

export async function baglantiIstegiGonderEylemi(
  veri: FormData,
): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!panodaEslesmeArayabilirMi(kullanici)) {
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

  const sonuc = await istegiKur({
    kullanici,
    hedefId: talep.acanKullaniciId,
    mesaj: mesajKarari.mesaj,
    talepId: talep.id,
    talepBasligi: talep.baslik,
  });
  if (!sonuc.olurMu) hataylaDon(PANO, sonuc.neden);

  revalidatePath(PANO);
  revalidatePath(YOL);
  redirect(`${PANO}?durum=istek-gonderildi&id=${sonuc.istekId}`);
}

/**
 * AKIŞTAKİ GÖNDERİDEN BAĞLANTI (12 Ağustos 2026 · istek: "akış kısmında
 * iletişim alanı yok, diğer kişilerle … bağlantı kur tarzında" → "ekle bağlan").
 *
 * Bugüne kadar bağlantının TEK girişi panodaki ilandı; yani ilan açmamış bir
 * kişiye kimse ulaşamıyordu. Bu kapı onu genişletir ve genişlettiği yer
 * bilinçlidir: **paylaşım yapmak, ulaşılabilir olmak demektir.**
 *
 * ONAY KAPISI AYNEN DURUYOR — istek yine danışman/koordinatör kararına gider,
 * hedef kişi onaya kadar habersizdir. Genişleyen tek şey isteğin nereden
 * başlayabildiği; kimin karar verdiği ve neyin serbest olduğu değişmedi.
 *
 * `talepId` NULL kaydedilir. Sütun zaten `Int?` olduğu için migration
 * gerekmedi: veri modeli ilansız bağlantıya baştan izin veriyordu, kısıt
 * yalnızca ekrandaydı.
 */
export async function kisiyeBaglantiIstegiEylemi(
  veri: FormData,
): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  /*
   * Panodakiyle AYNI kapı: gönderen kitlesi aynı kitledir (merkez personeli
   * bağlantı isteği göndermez, onun kanalı ayrıdır). Ayrı bir izin adı
   * uydurmak, aynı kuralın iki yerde ayrışmasına açık kapı bırakırdı.
   */
  if (!panodaEslesmeArayabilirMi(kullanici)) {
    throw new YetkiHatasi("Bağlantı isteği gönderme yetkiniz yok.");
  }

  const hedefId = Number.parseInt(String(veri.get("hedefId") ?? ""), 10);
  if (!Number.isFinite(hedefId)) throw new BulunamadiHatasi();

  const mesajKarari = istekMesajiniCoz(String(veri.get("mesaj") ?? ""));
  if (!mesajKarari.olurMu) hataylaDon(AKIS, mesajKarari.neden);

  /*
   * Hedef GERÇEKTEN VAR VE AKTİF olmalı. Kimlik gizli form alanından geliyor
   * ve kurcalanabilir; ekranda görünmeyen (pasife alınmış) bir kişiye istek
   * gönderilebilmesi, ekrandan kaldırılmış olmasını anlamsız kılardı.
   */
  const hedef = await prisma.kullanici.findFirst({
    where: { id: hedefId, aktif: true },
    select: { id: true },
  });
  if (!hedef) hataylaDon(AKIS, "Bu kullanıcıya şu anda istek gönderilemiyor.");

  const sonuc = await istegiKur({
    kullanici,
    hedefId: hedef.id,
    mesaj: mesajKarari.mesaj,
    talepId: null,
    talepBasligi: null,
  });
  if (!sonuc.olurMu) hataylaDon(AKIS, sonuc.neden);

  revalidatePath(AKIS);
  revalidatePath(YOL);
  redirect(`${AKIS}?durum=istek-gonderildi`);
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
