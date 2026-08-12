"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DuyuruFormDurumu } from "@/components/DuyuruFormu";
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

/**
 * HATA ARTIK YÖNLENDİRMİYOR, DURUM DÖNDÜRÜYOR (12 Ağustos 2026 · istek: "onay
 * kutusunu işaretlemeden gönder deyince mesaj gitmiyor — bu normal, ancak
 * yazdığı başlık ve metin siliniyor").
 *
 * Eskiden `?hata=...` adresine yönlendiriliyordu; sayfa yeniden çizilince form
 * boş geliyor ve 4000 karaktere kadar yazılabilen metin uçuyordu. Değerleri
 * adres çubuğunda geri taşımak da olmazdı — uzun metin URL sınırlarını zorlar.
 * Form artık `useActionState` ile çalışıyor ve yazılanlar tarayıcıda kalıyor
 * (bkz. components/DuyuruFormu.tsx).
 *
 * BAŞARIDA HÂLÂ YÖNLENDİRME VAR: gönderilen duyuru geri alınamaz, sayfanın
 * yenilenmesi gönderimi tekrarlamamalı (POST/Redirect/GET).
 */
function hatayla(
  mesaj: string,
  degerler: DuyuruFormDurumu["degerler"],
): DuyuruFormDurumu {
  return { hata: mesaj, degerler };
}

export async function duyuruGonderEylemi(
  _oncekiDurum: DuyuruFormDurumu,
  veri: FormData,
): Promise<DuyuruFormDurumu> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!sistemAyarlariniYonetebilirMi(kullanici)) {
    throw new YetkiHatasi("Toplu duyuruyu yalnızca proje yöneticisi gönderir.");
  }

  // Kullanıcının yazdıkları: her ret yolunda forma geri konuyor.
  const degerler = {
    hedef: String(veri.get("hedef") ?? ""),
    baslik: String(veri.get("baslik") ?? ""),
    icerik: String(veri.get("icerik") ?? ""),
  };

  const karar = duyuruyuCoz({
    ...degerler,
    onaylandiMi: veri.get("onay") === "evet",
  });
  if (!karar.olurMu) return hatayla(karar.neden, degerler);

  /*
   * Alıcılar ROLDEN okunur, kullanıcı tipinden değil: "öğretmen" diye bir rol
   * yok, öğretmen olmak öğrenci OLMAMAKtır (danışman, koordinatör, personel).
   * Pasif kullanıcıya duyuru gitmez.
   *
   * DIŞ KULLANICILAR (mezun, paydaş temsilcisi) "öğretmen" kümesinden AÇIKÇA
   * çıkarılır: koşul yalnızca "öğrenci değil" deseydi okul kadrosuna giden bir
   * duyuru mezunlara da giderdi. "Tümü" seçildiğinde ise alırlar — orada kasıt
   * zaten herkestir.
   */
  const ogrenciKosulu = {
    aktif: true,
    roller: { some: { rolKodu: "OGRENCI" as const, bitisTarihi: null } },
  };
  const ogretmenKosulu = {
    aktif: true,
    roller: {
      none: {
        rolKodu: {
          in: ["OGRENCI" as const, "MEZUN" as const, "PAYDAS_TEMSILCISI" as const],
        },
        bitisTarihi: null,
      },
    },
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
    return hatayla(
      "Seçtiğiniz gruba uyan aktif kullanıcı yok; duyuru gönderilmedi.",
      degerler,
    );
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
