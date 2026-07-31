import { prisma } from "../db";
import { egitimOgretimYili } from "../ogretmen/gorev-yillari";

/**
 * Filtre açılır listelerinin seçenekleri.
 *
 * Seçenekler SABİT KODLANMAZ, veriden okunur: okul türü listesi MEB
 * kaynaklarından gelen kurum kayıtlarında yaşıyor ve elle tutulan bir kopya
 * er geç gerçek listeden ayrışır (yeni bir okul türü açıldığında filtre onu
 * göstermez, kullanıcı da eksiği fark etmez).
 *
 * Seçenek listesi bir YETKİ SINIRI DEĞİLDİR: daraltma her zaman kapsam
 * filtresiyle yapılır (bkz. ogrenciListeFiltresi). Buradaki il parametresi
 * yalnızca listeyi kullanışlı tutmak içindir.
 */

export async function okulTurleriGetir(
  ilKodu: string | null,
): Promise<string[]> {
  const kayitlar = await prisma.kurum.findMany({
    where: { aktif: true, ...(ilKodu ? { ilKodu } : {}) },
    distinct: ["okulTuru"],
    select: { okulTuru: true },
    orderBy: { okulTuru: "asc" },
  });

  return kayitlar.map((kayit) => kayit.okulTuru);
}

/**
 * Envanterde kayıtlı eğitim-öğretim yılları, yeniden eskiye.
 *
 * Yıllar arası karşılaştırmanın dayanağı budur: liste veriden geldiği için
 * sisteme ikinci yıl girildiğinde filtre kendiliğinden iki yılı gösterir.
 */
export async function egitimOgretimYillariGetir(): Promise<string[]> {
  const kayitlar = await prisma.kullanici.findMany({
    distinct: ["egitimOgretimYili"],
    select: { egitimOgretimYili: true },
    orderBy: { egitimOgretimYili: "desc" },
  });

  return kayitlar.map((kayit) => kayit.egitimOgretimYili);
}

/**
 * Görev yılı filtresinin seçenekleri: en eski rol kaydının yılından bugüne.
 *
 * Kullanıcının `egitimOgretimYili` alanından ayrıdır — o kişinin GÜNCEL yılını
 * söyler, bu ise sistemde görev alınmış TÜM yılları. Geçen yıl danışmanlık
 * yapıp bu yıl bırakan öğretmenin yılı ancak burada görünür.
 */
export async function gorevYillariSecenekleri(
  simdi: Date = new Date(),
): Promise<string[]> {
  const enEski = await prisma.kullaniciRol.aggregate({
    _min: { baslangicTarihi: true },
  });

  const ilkYil = Number(
    egitimOgretimYili(enEski._min.baslangicTarihi ?? simdi).slice(0, 4),
  );
  const sonYil = Number(egitimOgretimYili(simdi).slice(0, 4));

  const yillar: string[] = [];
  for (let yil = sonYil; yil >= ilkYil; yil -= 1) {
    yillar.push(`${yil}-${yil + 1}`);
  }
  return yillar;
}
