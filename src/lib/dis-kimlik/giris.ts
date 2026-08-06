import { oturumAc } from "../auth/oturum";
import { prisma } from "../db";
import { erisimLogla } from "../yetki/log";
import {
  basarisizDenemeSonucu,
  epostaNormalle,
  kilitKalanDakika,
  kilitliMi,
} from "./kurallar";
import { sifreDogrula } from "./sifre";

/**
 * EBA dışı giriş (mezun, paydaş temsilcisi).
 *
 * AuthProvider'IN YERİNE GEÇMEZ, YANINA GELİR. EBA/mock kimlikli kullanıcılar
 * lib/kullanici/giris-akisi.ts'den geçmeye devam eder; burada kullanıcı
 * sağlama (provisioning) YOKTUR çünkü kullanıcı zaten onay anında açılmıştır.
 *
 * Oturum katmanı ikisini de ayırt etmez: çerez yalnızca authProviderId taşır
 * ve rol/kapsam her istekte veritabanından okunur (bkz. lib/auth/oturum.ts).
 * EBA entegrasyonu geldiğinde de değişmeyecek olan sınır budur.
 */

export type DisGirisSonucu =
  | { durum: "BASARILI"; kullaniciId: number }
  | { durum: "BASARISIZ"; mesaj: string };

/**
 * Kimlik doğrulanamadığında verilen TEK mesaj.
 *
 * "Böyle bir kullanıcı yok" ile "şifre yanlış" ayrımı yapılmaz: ayrım,
 * elindeki e-posta listesini sistemde kimin kayıtlı olduğunu öğrenmek için
 * deneyen birine doğrudan cevap verirdi.
 */
const GENEL_HATA = "E-posta adresi veya şifre hatalı.";

export async function disGirisYap(
  epostaGirdisi: string,
  sifre: string,
  simdi: Date = new Date(),
): Promise<DisGirisSonucu> {
  const eposta = epostaNormalle(epostaGirdisi);
  if (!eposta || !sifre) {
    return { durum: "BASARISIZ", mesaj: GENEL_HATA };
  }

  const kimlik = await prisma.disKimlik.findUnique({
    where: { eposta },
    select: {
      kullaniciId: true,
      sifreOzeti: true,
      basarisizDeneme: true,
      kilitBitisTarihi: true,
      kullanici: { select: { authProviderId: true, aktif: true } },
    },
  });

  if (!kimlik) {
    return bekleyenBasvuruCevabi(eposta, sifre);
  }

  if (kilitliMi(kimlik, simdi)) {
    const kalan = kilitKalanDakika(kimlik, simdi);
    return {
      durum: "BASARISIZ",
      mesaj: `Çok fazla hatalı deneme yapıldı. ${kalan} dakika sonra tekrar deneyin.`,
    };
  }

  const dogruMu = await sifreDogrula(sifre, kimlik.sifreOzeti);

  if (!dogruMu) {
    const yeniDurum = basarisizDenemeSonucu(kimlik, simdi);
    await prisma.disKimlik.update({
      where: { kullaniciId: kimlik.kullaniciId },
      data: {
        basarisizDeneme: yeniDurum.basarisizDeneme,
        kilitBitisTarihi: yeniDurum.kilitBitisTarihi,
      },
    });

    if (yeniDurum.kilitBitisTarihi !== null) {
      const kalan = kilitKalanDakika(yeniDurum, simdi);
      return {
        durum: "BASARISIZ",
        mesaj: `Çok fazla hatalı deneme yapıldı. ${kalan} dakika sonra tekrar deneyin.`,
      };
    }
    return { durum: "BASARISIZ", mesaj: GENEL_HATA };
  }

  /*
   * Şifre doğru ama hesap pasife alınmışsa yine GENEL mesaj verilir. Pasif
   * hesabın sahibi zaten kararı veren yöneticiden haberdardır; giriş ekranında
   * "hesabınız kapatıldı" yazmak, hesabın varlığını doğrulamaktan başka işe
   * yaramaz.
   */
  if (!kimlik.kullanici.aktif) {
    return { durum: "BASARISIZ", mesaj: GENEL_HATA };
  }

  await prisma.disKimlik.update({
    where: { kullaniciId: kimlik.kullaniciId },
    data: {
      basarisizDeneme: 0,
      kilitBitisTarihi: null,
      sonGirisTarihi: simdi,
      // Bekleyen bir sıfırlama jetonu varsa düşer: şifresini hatırladığını
      // kanıtlayan kişi için jetonun açık kalmasının anlamı yok.
      sifirlamaJetonuOzeti: null,
      sifirlamaSonGecerlilik: null,
    },
  });

  await oturumAc(kimlik.kullanici.authProviderId);

  await erisimLogla({
    kullaniciId: kimlik.kullaniciId,
    islem: "GORUNTULEME",
    hedefTip: "PROFIL",
    hedefId: kimlik.kullaniciId,
    detay: "Giriş yapıldı (dış kimlik)",
  });

  return { durum: "BASARILI", kullaniciId: kimlik.kullaniciId };
}

/**
 * Kimliği olmayan e-posta için cevap.
 *
 * Onay bekleyen başvurusu olan kişiye "başvurunuz bekliyor" denir ama YALNIZCA
 * şifresi doğruysa. Bilgi böylece yalnızca başvuruyu gerçekten yapmış olana
 * verilir; e-posta listesi deneyen birine hiçbir şey söylenmez.
 */
async function bekleyenBasvuruCevabi(
  eposta: string,
  sifre: string,
): Promise<DisGirisSonucu> {
  const bekleyen = await prisma.disKullaniciBasvurusu.findFirst({
    where: { eposta, durum: "BEKLIYOR" },
    select: { sifreOzeti: true },
  });

  if (bekleyen?.sifreOzeti && (await sifreDogrula(sifre, bekleyen.sifreOzeti))) {
    return {
      durum: "BASARISIZ",
      mesaj:
        "Başvurunuz proje yöneticisinin onayını bekliyor. Onaylandığında e-posta ile bilgilendirileceksiniz.",
    };
  }

  return { durum: "BASARISIZ", mesaj: GENEL_HATA };
}
