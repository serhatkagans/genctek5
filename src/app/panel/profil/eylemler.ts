"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  profilFotoKaydet,
  profilFotoSil,
  profilFotoSinirlariniGetir,
} from "@/lib/kullanici/profil-foto";
import { saltOkunurAlanlariAyikla } from "@/lib/kullanici/salt-okunur";
import { baglantilariDogrula } from "@/lib/ogrenci/iletisim-kurallar";
import { danismanlikDurumunuDegistir } from "@/lib/ogretmen/danismanlik";
import { erisimLogla } from "@/lib/yetki/log";
import { ogrenciMi } from "@/lib/yetki/izinler";

/**
 * Kişinin kendi düzenleyebileceği alanlar. Diğer her şey salt okunurdur.
 *
 * Liste role göre değişmez: iletişim bilgisi kimlik bilgisi değildir, e-Okul'dan
 * gelmez ve kim olursa olsun sahibi tarafından girilir. Rol farkı yalnızca
 * bilginin hangi profil tablosuna yazıldığındadır — bağlantı adresleri yalnızca
 * öğrenci profilinde tutulduğu için öğretmende sessizce düşer.
 */
const IZINLI_ALANLAR = [
  "eposta",
  "telefon",
  "githubUrl",
  "kisiselSiteUrl",
  "linkedinUrl",
] as const;

const YOL = "/panel/profil";

export async function profilGuncelleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const gelenVeri = Object.fromEntries(veri.entries());
  delete gelenVeri.$ACTION_ID;

  const { temizVeri, yoksayilanAlanlar } = saltOkunurAlanlariAyikla<{
    eposta: string;
    telefon: string;
    githubUrl: string;
    kisiselSiteUrl: string;
    linkedinUrl: string;
  }>(gelenVeri, IZINLI_ALANLAR);

  // Salt okunur alanlar istekte gelirse sessizce yok sayılır, hata
  // döndürülmez — ama loglanır (references/permissions.md Bölüm 7).
  if (yoksayilanAlanlar.length > 0) {
    await erisimLogla({
      kullaniciId: kullanici.id,
      islem: "DEGISIKLIK",
      hedefTip: "PROFIL",
      hedefId: kullanici.id,
      detay: `Salt okunur alanlar yok sayıldı: ${yoksayilanAlanlar.join(", ")}`,
    });
  }

  const iletisim = {
    eposta: temizVeri.eposta?.trim() || null,
    telefon: temizVeri.telefon?.trim() || null,
  };

  /*
   * İki ayrı profil tablosu var çünkü öğrenci ve personel profilleri farklı
   * alanlar taşıyor (biri aydınlatma onayı, diğeri danışmanlık işareti).
   * Yazılan bilgi aynı olduğu için ayrım yalnızca burada yapılır.
   */
  if (ogrenciMi(kullanici)) {
    const karar = baglantilariDogrula({
      githubUrl: temizVeri.githubUrl,
      kisiselSiteUrl: temizVeri.kisiselSiteUrl,
      linkedinUrl: temizVeri.linkedinUrl,
    });
    if (!karar.olurMu) {
      redirect(`${YOL}?hata=${encodeURIComponent(karar.neden)}`);
    }

    const ogrenciVerisi = { ...iletisim, ...karar.baglantilar };
    await prisma.ogrenciProfil.upsert({
      where: { kullaniciId: kullanici.id },
      update: ogrenciVerisi,
      create: { kullaniciId: kullanici.id, ...ogrenciVerisi },
    });
  } else {
    await prisma.ogretmenProfil.upsert({
      where: { kullaniciId: kullanici.id },
      update: iletisim,
      create: { kullaniciId: kullanici.id, ...iletisim },
    });
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: ogrenciMi(kullanici) ? "PROFIL" : "OGRETMEN",
    hedefId: kullanici.id,
    detay: "İletişim bilgileri güncellendi",
  });

  revalidatePath(YOL);
  redirect(`${YOL}?durum=iletisim-kaydedildi`);
}

export async function danismanlikEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  const gorevAlmakIstiyor = veri.get("gorevAlmakIstiyor") === "evet";

  await danismanlikDurumunuDegistir(kullanici.id, gorevAlmakIstiyor);

  revalidatePath("/panel/profil");
  revalidatePath("/panel");
}

// ---------------------------------------------------------------------------
// Profil fotoğrafı
// ---------------------------------------------------------------------------

/*
 * Rol kontrolü YOKTUR ve olmamalıdır: fotoğraf herkesin — öğrenci, öğretmen,
 * il koordinatörü, YEĞİTEK personeli. Kazanım ve CV eylemlerindeki
 * `ogrenciZorunlu()` kapısının buradaki karşılığı, işlemin her zaman
 * `kullanici.id` üzerinde çalışmasıdır: hedef kimlik hiçbir yerde form
 * girdisinden okunmaz, dolayısıyla kimse başkasının fotoğrafını değiştiremez.
 */

export async function profilFotoYukleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const dosya = veri.get("foto");
  if (!(dosya instanceof File) || dosya.size === 0) {
    redirect(`${YOL}?hata=${encodeURIComponent("Fotoğraf seçilmedi.")}`);
  }

  const sonuc = await profilFotoKaydet({
    kullaniciId: kullanici.id,
    dosya,
    sinirlar: await profilFotoSinirlariniGetir(),
  });
  if (!sonuc.olurMu) {
    redirect(
      `${YOL}?hata=${encodeURIComponent(sonuc.neden ?? "Fotoğraf yüklenemedi.")}`,
    );
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "Profil fotoğrafı yüklendi",
  });

  revalidatePath(YOL);
  redirect(`${YOL}?durum=foto-yuklendi`);
}

export async function profilFotoSilEylemi(): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const silindi = await profilFotoSil(kullanici.id);
  if (!silindi) {
    redirect(
      `${YOL}?hata=${encodeURIComponent("Kaldırılacak bir fotoğraf bulunamadı.")}`,
    );
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "Profil fotoğrafı kaldırıldı",
  });

  revalidatePath(YOL);
  redirect(`${YOL}?durum=foto-silindi`);
}
