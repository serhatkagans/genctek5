"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GorevRolKodu } from "@/generated/prisma/enums";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { GOREV_ROL_ETIKETLERI } from "@/lib/yetki/etiketler";
import {
  ilceTemsilcisiAtayabilirMi,
  ilTemsilcisiAtayabilirMi,
  okulTemsilcisiAtayabilirMi,
} from "@/lib/yetki/izinler";
import { ogrenciKapsamFiltresi } from "@/lib/yetki/kapsam";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Öğrenci görev rolü atama ve kaldırma.
 *
 * Bu roller HİÇBİR ek veri görüntüleme yetkisi vermez (permissions.md Bölüm 5);
 * dönem bazlı bir görev etiketidir. Tekillik (il/ilçe/okul başına bir temsilci)
 * veritabanı kısmi unique index'leriyle korunur — buradaki kontrol yalnızca
 * kullanıcıya anlamlı mesaj vermek içindir.
 */

const YOL = "/panel/gorev-rolleri";

const GOREV_ROLLERI: GorevRolKodu[] = [
  "IL_TEMSILCISI",
  "ILCE_TEMSILCISI",
  "OKUL_TEMSILCISI",
];

function hataylaDon(mesaj: string): never {
  redirect(`${YOL}?hata=${encodeURIComponent(mesaj)}`);
}

export async function gorevRoluAtaEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const ogrenciId = Number.parseInt(String(veri.get("ogrenciId") ?? ""), 10);
  const rolKodu = String(veri.get("rolKodu") ?? "") as GorevRolKodu;
  if (!Number.isFinite(ogrenciId)) throw new BulunamadiHatasi();
  if (!GOREV_ROLLERI.includes(rolKodu)) {
    throw new BulunamadiHatasi("Geçersiz görev rolü.");
  }

  /*
   * Öğrenci merkezi kapsam filtresinden çekilir: kapsamı dışındaki bir
   * öğrencinin id'sini forma yazan kullanıcı burada boş sonuç alır. Rol
   * kontrolü tek başına yetmez, "bu öğrenci onun ilinde/okulunda mı" da
   * sorulmalıdır.
   */
  const ogrenci = await prisma.kullanici.findFirst({
    where: {
      AND: [{ id: ogrenciId }, ogrenciKapsamFiltresi(kullanici)],
    },
    select: {
      id: true,
      ad: true,
      soyad: true,
      ilKodu: true,
      ilceKodu: true,
      kurumKodu: true,
      egitimOgretimYili: true,
    },
  });
  if (!ogrenci) throw new BulunamadiHatasi();

  /*
   * Görevin kapsamı öğrencinin KAYITLI YERİNDEN alınıp kayda YAZILIR. İlçe
   * temsilciliğinin yetkisi ilçenin değil ilin koordinatöründedir: sistemde
   * ilçe düzeyinde görevli yoktur, ilçe ilin içindeki bir basamaktır.
   */
  const kapsam: {
    ilKodu: string | null;
    ilceKodu: string | null;
    kurumKodu: number | null;
  } = { ilKodu: null, ilceKodu: null, kurumKodu: null };

  if (rolKodu === "IL_TEMSILCISI") {
    if (!ogrenci.ilKodu || !ilTemsilcisiAtayabilirMi(kullanici, ogrenci.ilKodu)) {
      throw new YetkiHatasi("Bu ilde İl Temsilcisi atama yetkiniz yok.");
    }
    kapsam.ilKodu = ogrenci.ilKodu;
  } else if (rolKodu === "ILCE_TEMSILCISI") {
    if (
      !ogrenci.ilceKodu ||
      !ogrenci.ilKodu ||
      !ilceTemsilcisiAtayabilirMi(kullanici, ogrenci.ilKodu)
    ) {
      throw new YetkiHatasi("Bu ilçede İlçe Temsilcisi atama yetkiniz yok.");
    }
    kapsam.ilceKodu = ogrenci.ilceKodu;
  } else if (
    !ogrenci.kurumKodu ||
    !okulTemsilcisiAtayabilirMi(kullanici, ogrenci.kurumKodu)
  ) {
    throw new YetkiHatasi("Bu okulda Okul Temsilcisi atama yetkiniz yok.");
  } else {
    kapsam.kurumKodu = ogrenci.kurumKodu;
  }

  const mevcut = await prisma.ogrenciGorevRolu.findFirst({
    where: {
      rolKodu,
      egitimOgretimYili: ogrenci.egitimOgretimYili,
      ...(rolKodu === "IL_TEMSILCISI"
        ? { ilKodu: kapsam.ilKodu }
        : rolKodu === "ILCE_TEMSILCISI"
          ? { ilceKodu: kapsam.ilceKodu }
          : { kurumKodu: kapsam.kurumKodu }),
    },
    select: { id: true, ogrenci: { select: { ad: true, soyad: true } } },
  });

  if (mevcut) {
    hataylaDon(
      `Bu dönem için ${GOREV_ROL_ETIKETLERI[rolKodu]} görevi zaten ${mevcut.ogrenci.ad} ${mevcut.ogrenci.soyad} üzerinde. Önce mevcut görevi kaldırın.`,
    );
  }

  await prisma.ogrenciGorevRolu.create({
    data: {
      ogrenciId: ogrenci.id,
      rolKodu,
      egitimOgretimYili: ogrenci.egitimOgretimYili,
      ilKodu: kapsam.ilKodu,
      ilceKodu: kapsam.ilceKodu,
      kurumKodu: kapsam.kurumKodu,
      atayanKullaniciId: kullanici.id,
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "ROL",
    hedefId: ogrenci.id,
    detay: `${GOREV_ROL_ETIKETLERI[rolKodu]} görevi verildi: ${ogrenci.ad} ${ogrenci.soyad}`,
  });

  revalidatePath(YOL);
  revalidatePath("/panel/profil");
  redirect(`${YOL}?durum=atandi`);
}

export async function gorevRoluKaldirEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const gorevId = Number.parseInt(String(veri.get("gorevId") ?? ""), 10);
  if (!Number.isFinite(gorevId)) throw new BulunamadiHatasi();

  const gorev = await prisma.ogrenciGorevRolu.findUnique({
    where: { id: gorevId },
    select: {
      id: true,
      rolKodu: true,
      ilKodu: true,
      kurumKodu: true,
      ogrenci: { select: { id: true, ad: true, soyad: true } },
      // İlçe temsilciliğinin yetkisi ilçenin BAĞLI OLDUĞU İLDEN sorulur;
      // öğrencinin güncel ilinden değil, çünkü öğrenci dönem içinde taşınmış
      // olabilir ve görev verildiği yerde durur.
      ilce: { select: { ilKodu: true } },
    },
  });
  if (!gorev) throw new BulunamadiHatasi();

  const yetkili =
    gorev.rolKodu === "IL_TEMSILCISI"
      ? gorev.ilKodu !== null &&
        ilTemsilcisiAtayabilirMi(kullanici, gorev.ilKodu)
      : gorev.rolKodu === "ILCE_TEMSILCISI"
        ? gorev.ilce !== null &&
          ilceTemsilcisiAtayabilirMi(kullanici, gorev.ilce.ilKodu)
        : gorev.kurumKodu !== null &&
          okulTemsilcisiAtayabilirMi(kullanici, gorev.kurumKodu);

  if (!yetkili) {
    throw new YetkiHatasi("Bu görevi kaldırma yetkiniz yok.");
  }

  // Görev kaydı dönem bazlıdır ve geçmişi taşımaz; kaldırma gerçek silmedir.
  // İz erişim logunda kalır.
  await prisma.ogrenciGorevRolu.delete({ where: { id: gorev.id } });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "ROL",
    hedefId: gorev.ogrenci.id,
    detay: `${GOREV_ROL_ETIKETLERI[gorev.rolKodu]} görevi kaldırıldı: ${gorev.ogrenci.ad} ${gorev.ogrenci.soyad}`,
  });

  revalidatePath(YOL);
  revalidatePath("/panel/profil");
  redirect(`${YOL}?durum=kaldirildi`);
}
