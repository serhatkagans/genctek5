import type { AuthKimlik } from "../auth/tipler";
import { prisma } from "../db";

/**
 * Kullanıcı sağlama (provisioning) — references/domain-rules.md Bölüm 1.
 *
 * İlk girişte kullanıcı oluşturulur. Rol tayini:
 *   - Öğrenci  → OGRENCI rolü
 *   - Öğretmen → ROLSÜZ; danışman listesine girmek için kendisi işaretlemeli
 *   - Personel → ROLSÜZ; IL_KOORDINATOR ve PROJE_YONETICISI asla otomatik
 *                verilmez, elle atanır
 *
 * Sonraki girişlerde AuthProvider'dan gelen alanlar güncellenir. Bu alanlar
 * salt okunurdur: yalnızca burada, kimlik kaynağından güncellenir.
 */

export interface SaglamaSonucu {
  kullaniciId: number;
  yeniKullaniciMi: boolean;
  /** Kurum kodu değiştiyse devir akışı tetiklenmelidir (Bölüm 3). */
  eskiKurumKodu: number | null;
  kurumKoduDegistiMi: boolean;
}

export async function kullaniciSagla(
  kimlik: AuthKimlik,
): Promise<SaglamaSonucu> {
  if (kimlik.kurumKodu !== null) {
    const kurum = await prisma.kurum.findUnique({
      where: { kurumKodu: kimlik.kurumKodu },
      select: { kurumKodu: true },
    });
    if (!kurum) {
      throw new Error(
        `Kimlikte gelen kurum kodu (${kimlik.kurumKodu}) referans tablosunda yok. ` +
          "İl/ilçe/kurum verisi yüklenmeden kullanıcı oluşturulamaz.",
      );
    }
  }

  const mevcut = await prisma.kullanici.findUnique({
    where: { authProviderId: kimlik.authProviderId },
    select: { id: true, kurumKodu: true },
  });

  if (!mevcut) {
    const olusan = await prisma.$transaction(async (islem) => {
      const kullanici = await islem.kullanici.create({
        data: {
          authProviderId: kimlik.authProviderId,
          ad: kimlik.ad,
          soyad: kimlik.soyad,
          cinsiyet: kimlik.cinsiyet,
          kurumKodu: kimlik.kurumKodu,
          ilKodu: kimlik.ilKodu,
          ilceKodu: kimlik.ilceKodu,
          sinif: kimlik.sinif,
          brans: kimlik.brans,
          egitimOgretimYili: kimlik.egitimOgretimYili,
        },
        select: { id: true },
      });

      if (kimlik.tip === "OGRENCI") {
        await islem.kullaniciRol.create({
          data: { kullaniciId: kullanici.id, rolKodu: "OGRENCI" },
        });
        await islem.ogrenciProfil.create({
          data: { kullaniciId: kullanici.id },
        });
      } else if (kimlik.tip === "OGRETMEN") {
        // Rol verilmez. Öğretmen "danışman olarak görev almak istiyorum"
        // kutusunu işaretlemeden danışman listesinde görünmez.
        await islem.ogretmenProfil.create({
          data: { kullaniciId: kullanici.id },
        });
      }

      return kullanici;
    });

    return {
      kullaniciId: olusan.id,
      yeniKullaniciMi: true,
      eskiKurumKodu: null,
      kurumKoduDegistiMi: false,
    };
  }

  const kurumKoduDegistiMi = mevcut.kurumKodu !== kimlik.kurumKodu;

  await prisma.kullanici.update({
    where: { id: mevcut.id },
    data: {
      ad: kimlik.ad,
      soyad: kimlik.soyad,
      cinsiyet: kimlik.cinsiyet,
      kurumKodu: kimlik.kurumKodu,
      ilKodu: kimlik.ilKodu,
      ilceKodu: kimlik.ilceKodu,
      sinif: kimlik.sinif,
      brans: kimlik.brans,
      egitimOgretimYili: kimlik.egitimOgretimYili,
      sonSenkronTarihi: new Date(),
    },
  });

  return {
    kullaniciId: mevcut.id,
    yeniKullaniciMi: false,
    eskiKurumKodu: mevcut.kurumKodu,
    kurumKoduDegistiMi,
  };
}

// Salt okunur alan koruması ve ilgili sabitler için: ./salt-okunur.ts
