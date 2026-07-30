import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { CEREZ_YOLU, ortam } from "../ortam";
import type { OturumKullanicisi } from "../yetki/tipler";

/**
 * Oturum, imzalı bir çerezde yalnızca AuthProvider kimliğini taşır. Rol ve
 * kapsam bilgisi her istekte veritabanından okunur; çereze yazılmaz, aksi
 * halde rolü geri alınan bir kullanıcı oturumu bitene kadar yetkili kalır.
 */

const CEREZ_ADI = "genctek_oturum";
const CEREZ_OMRU_SANIYE = 60 * 60 * 8;

function imzala(veri: string): string {
  return createHmac("sha256", ortam.OTURUM_GIZLI_ANAHTARI)
    .update(veri)
    .digest("base64url");
}

function imzaDogrula(veri: string, imza: string): boolean {
  const beklenen = Buffer.from(imzala(veri));
  const gelen = Buffer.from(imza);
  if (beklenen.length !== gelen.length) return false;
  return timingSafeEqual(beklenen, gelen);
}

export async function oturumAc(authProviderId: string): Promise<void> {
  const govde = Buffer.from(authProviderId, "utf8").toString("base64url");
  const cerezDeposu = await cookies();
  cerezDeposu.set(CEREZ_ADI, `${govde}.${imzala(govde)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Alt dizine kurulduğunda çerez oraya daraltılır; aynı alan adındaki
    // başka uygulamalara oturum jetonu gitmez (bkz. ortam.ts · CEREZ_YOLU).
    path: CEREZ_YOLU,
    maxAge: CEREZ_OMRU_SANIYE,
  });
}

export async function oturumKapat(): Promise<void> {
  const cerezDeposu = await cookies();
  // Silme de aynı yolla yapılmalı: yol eşleşmezse tarayıcı çerezi silmez ve
  // "çıkış yaptım ama hâlâ girişteyim" durumu doğar.
  cerezDeposu.set(CEREZ_ADI, "", { path: CEREZ_YOLU, maxAge: 0 });
}

async function cerezdenKimlikOku(): Promise<string | null> {
  const cerezDeposu = await cookies();
  const deger = cerezDeposu.get(CEREZ_ADI)?.value;
  if (!deger) return null;

  const [govde, imza] = deger.split(".");
  if (!govde || !imza || !imzaDogrula(govde, imza)) return null;

  return Buffer.from(govde, "base64url").toString("utf8");
}

/**
 * Oturumdaki kullanıcıyı aktif rolleriyle birlikte getirir.
 * Rolü olmayan kullanıcı da döner (danışmanlık işaretlemeyen öğretmen gibi);
 * yetki kararlarını izinler.ts verir.
 */
export async function oturumKullanicisi(): Promise<OturumKullanicisi | null> {
  const authProviderId = await cerezdenKimlikOku();
  if (!authProviderId) return null;

  const kullanici = await prisma.kullanici.findUnique({
    where: { authProviderId },
    include: {
      roller: {
        where: { bitisTarihi: null },
        select: { rolKodu: true, ilKodu: true, kurumKodu: true },
      },
    },
  });

  if (!kullanici || !kullanici.aktif) return null;

  return {
    id: kullanici.id,
    authProviderId: kullanici.authProviderId,
    ad: kullanici.ad,
    soyad: kullanici.soyad,
    kurumKodu: kullanici.kurumKodu,
    ilKodu: kullanici.ilKodu,
    ilceKodu: kullanici.ilceKodu,
    sinif: kullanici.sinif,
    brans: kullanici.brans,
    egitimOgretimYili: kullanici.egitimOgretimYili,
    roller: kullanici.roller,
  };
}

/**
 * Oturum yoksa giriş ekranına gönderir.
 *
 * Hata fırlatmak yerine yönlendirme yapılıyor: oturumun süresi dolduğunda ya da
 * kullanıcı pasife alındığında kişi "beklenmeyen hata" ekranı değil giriş
 * ekranı görmeli — bu bir arıza değil, olağan bir durum.
 */
export async function oturumKullanicisiZorunlu(): Promise<OturumKullanicisi> {
  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    redirect("/giris");
  }
  return kullanici;
}
