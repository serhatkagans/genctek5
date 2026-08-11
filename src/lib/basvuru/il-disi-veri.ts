import { prisma } from "../db";
import { ilDisiBasvuruFiltresi } from "../yetki/kapsam";
import type { OturumKullanicisi } from "../yetki/tipler";

/**
 * İl dışı başvuruların OKUNMASI.
 *
 * `il-disi.ts`ten ayrı bir dosya çünkü orası saf tutuluyor — veritabanına ve
 * oturuma bakmıyor, birim testle kapsanıyor. Sorgu oraya konsaydı o dosyanın
 * testleri veritabanı gerektirir hâle gelirdi.
 *
 * MODÜLÜN KENDİ EKRANI KALKTI (11 Ağustos 2026 · istek: "koordinatörün
 * etkinlikler sayfası ile il dışı başvuru sayfalarını birleştirelim, il dışı
 * başvurular kalksın, hepsi etkinliklerde olsun"). Liste artık Etkinlikler
 * ekranının bir bölümü; veri okuması buraya alındı ki iki ekran (etkinlik
 * listesi ve etkinlik detayı) aynı sorguyu iki kez yazmasın.
 */

export interface IlDisiBasvuruSatiri {
  id: number;
  gerekce: string;
  basvuruTarihi: Date;
  kaynakIlOnayDurumu: "BEKLIYOR" | "ONAYLANDI" | "REDDEDILDI" | "ONAY_GEREKMEZ";
  kaynakIlOnayTarihi: Date | null;
  kaynakIlRetGerekcesi: string | null;
  ogrenciAdSoyad: string;
  ogrenciSinifi: string | null;
  okulAdi: string | null;
  faaliyetId: number;
  faaliyetAdi: string;
  faaliyetTarihi: Date;
  faaliyetYeri: string;
}

/**
 * Kullanıcının karar verebileceği / verdiği il dışı başvurular.
 *
 * KAPSAM MERKEZİ FİLTREDEN: koordinatör yalnızca KENDİ ilinden çıkan
 * başvuruyu, proje yöneticisi hepsini görür; başka hiçbir rol bu listeyi
 * görmez (bkz. ilDisiBasvuruFiltresi). Filtre burada elle yazılmıyor — aynı
 * kuralın ikinci bir kopyası er geç ayrışırdı.
 *
 * Sıralama: karar bekleyenler önce (`kaynakIlOnayDurumu: asc` → BEKLIYOR
 * enum'da ilk), sonra en yeni başvuru. Ekranın işi bekleyenlerdir.
 */
export async function ilDisiBasvurulariGetir(
  kullanici: OturumKullanicisi,
): Promise<IlDisiBasvuruSatiri[]> {
  const kayitlar = await prisma.basvuru.findMany({
    where: ilDisiBasvuruFiltresi(kullanici),
    orderBy: [{ kaynakIlOnayDurumu: "asc" }, { basvuruTarihi: "desc" }],
    select: {
      id: true,
      gerekce: true,
      basvuruTarihi: true,
      kaynakIlOnayDurumu: true,
      kaynakIlOnayTarihi: true,
      kaynakIlRetGerekcesi: true,
      katilimci: {
        select: {
          ad: true,
          soyad: true,
          sinif: true,
          kurum: { select: { ad: true } },
        },
      },
      faaliyet: {
        select: {
          id: true,
          ad: true,
          tarih: true,
          il: { select: { ad: true } },
          kurum: { select: { il: { select: { ad: true } } } },
        },
      },
    },
  });

  return kayitlar.map((kayit) => ({
    id: kayit.id,
    gerekce: kayit.gerekce,
    basvuruTarihi: kayit.basvuruTarihi,
    kaynakIlOnayDurumu: kayit.kaynakIlOnayDurumu,
    kaynakIlOnayTarihi: kayit.kaynakIlOnayTarihi,
    kaynakIlRetGerekcesi: kayit.kaynakIlRetGerekcesi,
    ogrenciAdSoyad: `${kayit.katilimci.ad} ${kayit.katilimci.soyad}`,
    ogrenciSinifi: kayit.katilimci.sinif,
    okulAdi: kayit.katilimci.kurum?.ad ?? null,
    faaliyetId: kayit.faaliyet.id,
    faaliyetAdi: kayit.faaliyet.ad,
    faaliyetTarihi: kayit.faaliyet.tarih,
    /*
     * Etkinliğin yeri, `faaliyetKapsamiCikar`daki sırayla çözülür: kapsam
     * alanı → okulun ili. İkisi de boşsa etkinlik ulusaldır ve "Ülke geneli"
     * yazılır — boş bırakmak, koordinatöre öğrencisinin nereye gittiğini
     * söylemezdi.
     */
    faaliyetYeri:
      kayit.faaliyet.il?.ad ?? kayit.faaliyet.kurum?.il?.ad ?? "Ülke geneli",
  }));
}
