import { danismanliktanAyrildi, yeniDanismanBildirimiYap } from "../danisman/atama";
import { prisma } from "../db";
import { erisimLogla } from "../yetki/log";

/**
 * "GençTek danışman öğretmeni olarak görev almak istiyorum" işaretinin
 * yönetimi — references/domain-rules.md Bölüm 2.
 *
 * Onay süreci YOKTUR: işaretlemek yeterlidir. Ancak bir öğretmen aynı anda hem
 * danışman hem il koordinatörü olamaz; bu durumda işaretleme reddedilir.
 */

export class DanismanlikCakismasiHatasi extends Error {
  constructor() {
    super(
      "İl koordinatörü olan bir öğretmen aynı anda danışman öğretmen olamaz.",
    );
    this.name = "DanismanlikCakismasiHatasi";
  }
}

export async function danismanlikDurumunuDegistir(
  kullaniciId: number,
  gorevAlmakIstiyor: boolean,
): Promise<void> {
  const kullanici = await prisma.kullanici.findUniqueOrThrow({
    where: { id: kullaniciId },
    select: {
      kurumKodu: true,
      roller: { where: { bitisTarihi: null }, select: { rolKodu: true, id: true } },
    },
  });

  const ilKoordinatoruMu = kullanici.roller.some(
    (rol) => rol.rolKodu === "IL_KOORDINATOR",
  );
  if (gorevAlmakIstiyor && ilKoordinatoruMu) {
    throw new DanismanlikCakismasiHatasi();
  }

  if (gorevAlmakIstiyor && kullanici.kurumKodu === null) {
    throw new Error(
      "Kurum kodu olmayan bir kullanıcı danışman öğretmen olamaz.",
    );
  }

  const danismanRolu = kullanici.roller.find(
    (rol) => rol.rolKodu === "DANISMAN",
  );

  await prisma.ogretmenProfil.upsert({
    where: { kullaniciId },
    update: {
      danismanOlmakIstiyor: gorevAlmakIstiyor,
      isaretlemeTarihi: gorevAlmakIstiyor ? new Date() : null,
    },
    create: {
      kullaniciId,
      danismanOlmakIstiyor: gorevAlmakIstiyor,
      isaretlemeTarihi: gorevAlmakIstiyor ? new Date() : null,
    },
  });

  if (gorevAlmakIstiyor && !danismanRolu) {
    await prisma.kullaniciRol.create({
      data: {
        kullaniciId,
        rolKodu: "DANISMAN",
        kurumKodu: kullanici.kurumKodu,
      },
    });
    // Okulda daha önce danışman yoktu ve öğrenciler il koordinatörüne
    // bağlanmış olabilir. Otomatik devir YAPILMAZ; koordinatöre haber gider.
    if (kullanici.kurumKodu !== null) {
      await yeniDanismanBildirimiYap(kullanici.kurumKodu);
    }
  }

  if (!gorevAlmakIstiyor && danismanRolu) {
    await prisma.kullaniciRol.update({
      where: { id: danismanRolu.id },
      data: { bitisTarihi: new Date() },
    });
    // Üzerindeki öğrenciler devir akışına girer; boşta öğrenci kalamaz.
    await danismanliktanAyrildi(
      kullaniciId,
      kullanici.kurumKodu,
      "DANISMANLIK_BIRAKILDI",
    );
  }

  await erisimLogla({
    kullaniciId,
    islem: "DEGISIKLIK",
    hedefTip: "OGRETMEN",
    hedefId: kullaniciId,
    detay: gorevAlmakIstiyor
      ? "Danışman öğretmen görevi alındı"
      : "Danışman öğretmen görevi bırakıldı",
  });
}
