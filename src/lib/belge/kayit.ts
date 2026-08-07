import { prisma } from "../db";
import type { FaaliyetBelgeTuru } from "@/generated/prisma/enums";

/**
 * Belge üretiminin kalıcı kaydı (7 Ağustos 2026).
 *
 * NE YAPMAZ: belgenin metnini saklamaz. Metin eskisi gibi her istekte
 * üretiliyor (bkz. kurallar.ts) — burada tutulan tek şey "şu kişiye şu
 * etkinlikten şu türde belge üretildi" olgusudur.
 *
 * NEDEN GEREKLİ: "ismine belge oluşturulan öğrencinin profiline katıldığı
 * etkinlik düşecek" kuralı belge üretimini kişi hakkında kalıcı bir olguya
 * çevirdi. Bu bilgi daha önce yalnızca erişim kaydının serbest metnindeydi ve
 * erişim kayıtları KVKK saklama süresiyle siliniyor.
 */

/**
 * Faaliyetin SEÇİLMİŞ katılımcılarını kimlikleriyle getirir.
 *
 * Belge sayfaları bunu iki iş için kullanır: ekranda basılacak adı ÇÖZMEK ve
 * istenen kimliğin gerçekten bu faaliyetin katılımcısı olduğunu DOĞRULAMAK.
 * İkisi tek sorgudan beslenir; ayrı sorgulasalardı doğrulamayı atlayan bir
 * çağıran ortaya çıkabilirdi.
 */
export async function secilmisKatilimcilariGetir(faaliyetId: number): Promise<
  { katilimciId: number; adSoyad: string }[]
> {
  const basvurular = await prisma.basvuru.findMany({
    where: { faaliyetId, durum: "SECILDI" },
    orderBy: { basvuruTarihi: "asc" },
    select: {
      katilimciId: true,
      katilimci: { select: { ad: true, soyad: true } },
    },
  });

  return basvurular.map((basvuru) => ({
    katilimciId: basvuru.katilimciId,
    adSoyad: `${basvuru.katilimci.ad} ${basvuru.katilimci.soyad}`,
  }));
}

/**
 * Üretilen belgeleri kaydeder.
 *
 * `createMany` + `skipDuplicates` KULLANILIYOR, "önce bak sonra yaz" değil:
 * belge sayfası bir GET isteğiyle açılıyor ve kullanıcı sayfayı
 * yenilediğinde ya da iki sekmeden aynı anda açtığında aynı istek tekrar
 * geliyor. Tekilliği veritabanındaki benzersizlik kısıtı garanti ediyor
 * (bkz. migration 20260807100000); uygulama katmanındaki kontrol yarış
 * durumunda ikinci satırı engelleyemezdi ve öğrencinin profiline aynı
 * etkinlik iki kez düşerdi.
 *
 * SESSİZ ÇALIŞIR: kayıt başarısız olsa bile belge basılmaya devam etmeli.
 * Öğretmen elindeki işi bitirebilmeli; profile düşen katılım, belgenin
 * kendisinden daha az acil bir sonuçtur.
 */
export async function belgeUretiminiKaydet(girdi: {
  faaliyetId: number;
  katilimciIdleri: readonly number[];
  tur: FaaliyetBelgeTuru;
  uretenKullaniciId: number;
}): Promise<void> {
  if (girdi.katilimciIdleri.length === 0) return;

  try {
    await prisma.faaliyetBelgesi.createMany({
      data: girdi.katilimciIdleri.map((katilimciId) => ({
        faaliyetId: girdi.faaliyetId,
        katilimciId,
        tur: girdi.tur,
        uretenKullaniciId: girdi.uretenKullaniciId,
      })),
      skipDuplicates: true,
    });
  } catch (hata) {
    // Yutulan hata görünmez kalmasın: belge basıldı ama profile düşmediyse
    // sebebi sunucu günlüğünde olmalı.
    console.error("Belge üretimi kaydedilemedi", {
      faaliyetId: girdi.faaliyetId,
      tur: girdi.tur,
      hata,
    });
  }
}
