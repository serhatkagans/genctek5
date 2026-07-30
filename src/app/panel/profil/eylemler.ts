"use server";

import { revalidatePath } from "next/cache";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { saltOkunurAlanlariAyikla } from "@/lib/kullanici/salt-okunur";
import { danismanlikDurumunuDegistir } from "@/lib/ogretmen/danismanlik";
import { erisimLogla } from "@/lib/yetki/log";
import { ogrenciMi } from "@/lib/yetki/izinler";

/**
 * Kişinin kendi düzenleyebileceği alanlar. Diğer her şey salt okunurdur.
 *
 * Liste role göre değişmez: iletişim bilgisi kimlik bilgisi değildir, e-Okul'dan
 * gelmez ve kim olursa olsun sahibi tarafından girilir. Rol farkı yalnızca
 * bilginin hangi profil tablosuna yazıldığındadır.
 */
const IZINLI_ALANLAR = ["eposta", "telefon"] as const;

export async function profilGuncelleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const gelenVeri = Object.fromEntries(veri.entries());
  delete gelenVeri.$ACTION_ID;

  const { temizVeri, yoksayilanAlanlar } = saltOkunurAlanlariAyikla<{
    eposta: string;
    telefon: string;
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
    await prisma.ogrenciProfil.upsert({
      where: { kullaniciId: kullanici.id },
      update: iletisim,
      create: { kullaniciId: kullanici.id, ...iletisim },
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

  revalidatePath("/panel/profil");
}

export async function danismanlikEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  const gorevAlmakIstiyor = veri.get("gorevAlmakIstiyor") === "evet";

  await danismanlikDurumunuDegistir(kullanici.id, gorevAlmakIstiyor);

  revalidatePath("/panel/profil");
  revalidatePath("/panel");
}
