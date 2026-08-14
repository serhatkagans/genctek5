"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  BILDIRIM_KODLARI,
  projeYoneticilerineBildir,
} from "@/lib/bildirim/gonder";
import { prisma } from "@/lib/db";
import {
  ilanKarariniCoz,
  PANODAN_ACILABILIR_TURLER,
  TALEP_TURU_ETIKETLERI,
  talebiCoz,
} from "@/lib/iletisim/kurallar";
import { bildirimGonder } from "@/lib/bildirim/gonder";
import { gunSonu } from "@/lib/tarih";
import type { TalepTuru } from "@/generated/prisma/enums";
import {
  panodaIlanAcabilirMi,
  panoIlaniDuzenleyebilirMi,
  panoIlaniOnayGerekiyorMu,
  panoIlaniOnaylayabilirMi,
  panoIlaniSilebilirMi,
} from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Pano (eski adıyla Talep Panosu) eylemleri.
 *
 * İLAN AÇMA YETKİSİ `panodaIlanAcabilirMi`: rolü olan herkes. Proje yöneticisi
 * 14 Ağustos 2026'da girdi (istekler: "proje yöneticisi panodan destek talebi
 * açabilsin", "mentör talebi açabilsin proje yöneticisi"); o güne kadar açma ve
 * bağlantı isteği tek kapıdan (`panodaEslesmeArayabilirMi`) geçiyordu ve merkez
 * ikisinden de dışarıdaydı. BAĞLANTI İSTEĞİ TARAFI DEĞİŞMEDİ.
 *
 * ÖĞRENCİ İLANI ONAYA DÜŞER (aynı gün · istek: "panodaki öğrenci ilanları
 * şimdilik proje yöneticilerine düşsün oradan onay versin"); bkz.
 * panoIlaniOnayGerekiyorMu.
 *
 * Kapı faaliyete BAŞVURU yetkisinden ayrıdır: pano bir ilan tahtasıdır,
 * başvuruyla ilgisi yok (bkz. lib/yetki/izinler.ts).
 */

const YOL = "/panel/talepler";
/** Proje yöneticisinin onay/düzenleme/silme ekranı. */
const ONAY_YOLU = "/panel/talepler/onaylar";

function hataylaDon(mesaj: string, yol: string = YOL): never {
  redirect(`${yol}?hata=${encodeURIComponent(mesaj)}`);
}

export async function talepAcEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!panodaIlanAcabilirMi(kullanici)) {
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
  /*
   * ÖĞRENCİ İLANI ONAYA DÜŞER (14 Ağustos 2026 · istek: "panodaki öğrenci
   * ilanları şimdilik proje yöneticilerine düşsün oradan onay versin").
   *
   * Kapı `panoIlaniOnayGerekiyorMu`: öğrenci `BEKLIYOR`, diğerleri
   * `ONAY_GEREKMEZ` ile yazılır ve eskisi gibi anında yayımlanır. Karar
   * ROLDEN çıkıyor, form girdisinden değil — aksi hâlde onay kapısı gizli bir
   * alanla atlanabilirdi.
   */
  const onayGerekiyor = panoIlaniOnayGerekiyorMu(kullanici);

  const talep = await prisma.talep.create({
    data: {
      acanKullaniciId: kullanici.id,
      calismaGrubuId: null,
      tur: karar.tur,
      baslik: karar.baslik,
      icerik: karar.icerik,
      sonGecerlilik: karar.sonGecerlilik,
      onayDurumu: onayGerekiyor ? "BEKLIYOR" : "ONAY_GEREKMEZ",
    },
    select: { id: true },
  });

  /*
   * KUYRUK SESSİZ DEĞİL: kararı verecek merkez uyarılıyor. Bildirim KAYITTAN
   * SONRA gönderiliyor — gönderimde çıkacak bir sorun ilanın kendisini
   * düşürmemeli (aynı sıra mentörlük başvurusunda da var).
   */
  if (onayGerekiyor) {
    await projeYoneticilerineBildir(BILDIRIM_KODLARI.ONAY_BEKLEYEN_PANO_ILANI, {
      acanAdSoyad: `${kullanici.ad} ${kullanici.soyad}`,
      talepBasligi: karar.baslik,
      tur: TALEP_TURU_ETIKETLERI[karar.tur],
    });
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Pano ilanı açıldı (${TALEP_TURU_ETIKETLERI[karar.tur]}${
      onayGerekiyor ? " · onay bekliyor" : ""
    }): ${karar.baslik}`,
  });

  revalidatePath(YOL);
  redirect(
    `${YOL}?durum=${onayGerekiyor ? "onaya-gonderildi" : "acildi"}&id=${talep.id}`,
  );
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

/**
 * İLAN DÜZENLEME (14 Ağustos 2026 · istek: "açılan ilanlar düzenlenebilsin,
 * açan kişi ve proje yöneticisi düzenleyebilsin").
 *
 * İki kapı, tek eylem (bkz. panoIlaniDuzenleyebilirMi). Ayrı eylemler
 * yazılsaydı doğrulama iki yerde durur ve biri güncellenip diğeri unutulurdu.
 *
 * SAHİBİNİN DÜZENLEMESİ İLANI YENİDEN ONAYA DÜŞÜRÜR. Aksi hâlde onay kapısı
 * kâğıt üstünde kalırdı: onaya uygun bir metin yazıp onaylandıktan sonra
 * içeriği baştan değiştirmek serbest olurdu. Proje yöneticisinin düzenlemesi
 * durumu değiştirmez — kararı zaten o veriyor.
 */
export async function talepDuzenleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const talepId = Number.parseInt(String(veri.get("talepId") ?? ""), 10);
  if (!Number.isFinite(talepId)) throw new BulunamadiHatasi();

  /* Dönüş adresi formun açıldığı ekran: merkez onay ekranından, sahibi panodan
     düzenliyor ve ikisi de kendi listesine dönmeli. */
  const donusYolu = String(veri.get("donus") ?? "") === "onaylar" ? ONAY_YOLU : YOL;

  const mevcut = await prisma.talep.findUnique({
    where: { id: talepId },
    select: {
      id: true,
      tur: true,
      baslik: true,
      acanKullaniciId: true,
      onayDurumu: true,
      acan: { select: { ad: true, soyad: true } },
    },
  });
  if (!mevcut) throw new BulunamadiHatasi();
  if (!panoIlaniDuzenleyebilirMi(kullanici, mevcut.acanKullaniciId)) {
    throw new YetkiHatasi("Bu ilanı düzenleyemezsiniz.");
  }

  /*
   * ESKİ TÜR HER ZAMAN İZİNLİ: artık açılamayan bir türdeki ilan (sponsor,
   * mentöre sor) düzenlenebilmeli. Aksi hâlde tek bir yazım hatasını düzeltmek,
   * ilanın türünü değiştirmeye zorlardı.
   */
  const izinliTurler: TalepTuru[] = mevcut.tur
    ? [...new Set([...PANODAN_ACILABILIR_TURLER, mevcut.tur])]
    : PANODAN_ACILABILIR_TURLER;

  const karar = talebiCoz(
    {
      baslik: String(veri.get("baslik") ?? ""),
      icerik: String(veri.get("icerik") ?? ""),
      sonGecerlilik: gunSonu(String(veri.get("sonGecerlilik") ?? "") || null),
      tur: String(veri.get("tur") ?? ""),
    },
    new Date(),
    izinliTurler,
  );
  if (!karar.olurMu) hataylaDon(karar.neden, donusYolu);

  /*
   * SAHİBİ DÜZENLİYORSA VE ONAYA TABİYSE ilan yeniden kuyruğa girer. Bu dalda
   * düzenleyen kişi ilanın sahibidir, yani onay kuralı doğrudan oturumdaki
   * kullanıcıya sorulabiliyor.
   *
   * MERKEZİN DÜZENLEMESİ İLANI KUYRUĞA GERİ ATMAZ: kararı zaten o veriyor ve
   * kendi düzeltmesini yeniden onaylaması boş bir tur olurdu.
   */
  const sahibiDuzenliyor = kullanici.id === mevcut.acanKullaniciId;
  const yenidenOnaya = sahibiDuzenliyor && panoIlaniOnayGerekiyorMu(kullanici);

  await prisma.talep.update({
    where: { id: mevcut.id },
    data: {
      tur: karar.tur,
      baslik: karar.baslik,
      icerik: karar.icerik,
      sonGecerlilik: karar.sonGecerlilik,
      ...(yenidenOnaya
        ? {
            onayDurumu: "BEKLIYOR" as const,
            onaylayanKullaniciId: null,
            onayTarihi: null,
            retGerekcesi: null,
          }
        : {}),
    },
  });

  if (yenidenOnaya) {
    await projeYoneticilerineBildir(BILDIRIM_KODLARI.ONAY_BEKLEYEN_PANO_ILANI, {
      acanAdSoyad: `${mevcut.acan.ad} ${mevcut.acan.soyad}`,
      talepBasligi: karar.baslik,
      tur: TALEP_TURU_ETIKETLERI[karar.tur],
    });
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: mevcut.acanKullaniciId,
    detay: `Pano ilanı düzenlendi${yenidenOnaya ? " · yeniden onaya düştü" : ""}: ${karar.baslik}`,
  });

  revalidatePath(YOL);
  revalidatePath(ONAY_YOLU);
  redirect(
    `${donusYolu}?durum=${yenidenOnaya ? "duzenlendi-onaya" : "duzenlendi"}`,
  );
}

/**
 * ONAY / RET KARARI — yalnızca proje yöneticisi (14 Ağustos 2026).
 *
 * Emsali `mentorlukKararEylemi`: onay ve ret aynı formda, ret gerekçesi zorunlu
 * (bkz. ilanKarariniCoz). Karar KAYDA GEÇER — kimin ne zaman onayladığı,
 * ilanın kendi satırında durur.
 */
export async function talepKararEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!panoIlaniOnaylayabilirMi(kullanici)) {
    throw new YetkiHatasi("Pano ilanlarını karara bağlayamazsınız.");
  }

  const talepId = Number.parseInt(String(veri.get("talepId") ?? ""), 10);
  if (!Number.isFinite(talepId)) throw new BulunamadiHatasi();

  const talep = await prisma.talep.findUnique({
    where: { id: talepId },
    select: {
      id: true,
      baslik: true,
      acanKullaniciId: true,
      onayDurumu: true,
    },
  });
  if (!talep) throw new BulunamadiHatasi();
  if (talep.onayDurumu !== "BEKLIYOR") {
    hataylaDon("Bu ilan zaten karara bağlanmış.", ONAY_YOLU);
  }

  const karar = ilanKarariniCoz({
    onaylandiMi: String(veri.get("karar") ?? "") === "ONAYLA",
    gerekce: String(veri.get("retGerekcesi") ?? ""),
  });
  if (!karar.olurMu) hataylaDon(karar.neden, ONAY_YOLU);

  await prisma.talep.update({
    where: { id: talep.id },
    data: {
      onayDurumu: karar.durum,
      onaylayanKullaniciId: kullanici.id,
      onayTarihi: new Date(),
      retGerekcesi: karar.gerekce,
    },
  });

  /*
   * KARAR İLAN SAHİBİNE DUYURULUR. Onayda "ilanın yayımlandı", rette gerekçe:
   * gerekçesiz ret, öğrenciye ilanını nasıl düzelteceğine dair hiçbir bilgi
   * bırakmaz. Yer tutucu "—" ile dolar (onayda gerekçe boş olabilir).
   */
  await bildirimGonder({
    kullaniciId: talep.acanKullaniciId,
    kod: BILDIRIM_KODLARI.PANO_ILANI_KARARI,
    degiskenler: {
      talepBasligi: talep.baslik,
      sonuc: karar.durum === "ONAYLANDI" ? "onaylandı" : "reddedildi",
      gerekce: karar.gerekce ?? "—",
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: talep.acanKullaniciId,
    detay: `Pano ilanı ${
      karar.durum === "ONAYLANDI" ? "onaylandı" : "reddedildi"
    }: ${talep.baslik}`,
  });

  revalidatePath(YOL);
  revalidatePath(ONAY_YOLU);
  redirect(
    `${ONAY_YOLU}?durum=${karar.durum === "ONAYLANDI" ? "onaylandi" : "reddedildi"}`,
  );
}

/**
 * İLAN SİLME — yalnızca proje yöneticisi (14 Ağustos 2026 · istek: "proje
 * yöneticisi ilanları silebilsin").
 *
 * PANONUN "SİLME YOKTUR" KURALINA BİLİNÇLİ İSTİSNA. Sahibi hâlâ silemez,
 * KAPATIR: kimin ne aradığı geçmiş kaydıdır. Merkezin silmesi ise panoya
 * yazılmış ve durması gerekmeyen bir metni (kişisel veri, hakaret, yanlışlıkla
 * açılmış ilan) kaldırmak içindir; böyle bir kapı olmasaydı tek çare
 * veritabanına elle girmek olurdu.
 *
 * BAĞLANTI İSTEKLERİ SİLİNMEZ: `baglanti_istegi.talep_id` yabancı anahtarı
 * ON DELETE SET NULL — istek ve üzerinden açılmış yazışma kayıt olarak kalır,
 * yalnızca ilanla bağı kopar. Cevaplar ise ilanla birlikte gider (CASCADE):
 * ilanı olmadan okunamaz metinlerdir.
 *
 * SİLME ERİŞİM LOGUNA YAZILIR ve başlık log satırına GEÇER — silinen içeriğin
 * ne olduğu, silindikten sonra yalnızca orada kalır.
 */
export async function talepSilEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!panoIlaniSilebilirMi(kullanici)) {
    throw new YetkiHatasi("Pano ilanı silemezsiniz.");
  }

  const talepId = Number.parseInt(String(veri.get("talepId") ?? ""), 10);
  if (!Number.isFinite(talepId)) throw new BulunamadiHatasi();

  const talep = await prisma.talep.findUnique({
    where: { id: talepId },
    select: { id: true, baslik: true, acanKullaniciId: true },
  });
  if (!talep) throw new BulunamadiHatasi();

  await prisma.talep.delete({ where: { id: talep.id } });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: talep.acanKullaniciId,
    detay: `Pano ilanı SİLİNDİ: ${talep.baslik}`,
  });

  revalidatePath(YOL);
  revalidatePath(ONAY_YOLU);
  redirect(`${ONAY_YOLU}?durum=silindi`);
}
