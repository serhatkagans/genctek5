import { authProvider } from "../auth";
import { danismanliktanAyrildi } from "../danisman/atama";
import { prisma } from "../db";
import { kullaniciSagla } from "./sagla";

/**
 * Gecelik senkron — references/domain-rules.md Bölüm 1.
 *
 * Öğretmen uzun süre giriş yapmazsa kurum kodu değişikliği fark edilmez. Bu iş
 * aktif danışmanların kimlik bilgisini AuthProvider'dan tazeler ve kurumu
 * değişenler için devir akışını çalıştırır.
 *
 * Oturum katmanına bağımlı DEĞİLDİR; komut satırından (cron) çalıştırılabilir.
 */
export async function gecelikSenkronCalistir(): Promise<{
  kontrolEdilen: number;
  kurumuDegisen: number;
}> {
  const saglayici = authProvider();

  const aktifDanismanlar = await prisma.kullaniciRol.findMany({
    where: { rolKodu: "DANISMAN", bitisTarihi: null },
    select: {
      kullanici: {
        select: { id: true, authProviderId: true, kurumKodu: true },
      },
    },
  });

  let kurumuDegisen = 0;

  for (const kayit of aktifDanismanlar) {
    const kimlik = await saglayici.kimlikGetir(kayit.kullanici.authProviderId);
    if (!kimlik) continue;
    if (kimlik.kurumKodu === kayit.kullanici.kurumKodu) continue;

    const eskiKurumKodu = kayit.kullanici.kurumKodu;
    await kullaniciSagla(kimlik);
    await danismanliktanAyrildi(
      kayit.kullanici.id,
      eskiKurumKodu,
      "OGRETMEN_AYRILDI",
    );
    kurumuDegisen += 1;
  }

  return { kontrolEdilen: aktifDanismanlar.length, kurumuDegisen };
}
