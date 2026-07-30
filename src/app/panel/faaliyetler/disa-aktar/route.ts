import { oturumKullanicisi } from "@/lib/auth/oturum";
import {
  AYAR_ANAHTARLARI,
  ayarSayi,
  VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
} from "@/lib/ayar";
import { prisma } from "@/lib/db";
import {
  ETKINLIK_KATEGORISI_ETIKETLERI,
  FAALIYET_DURUMU_ETIKETLERI,
  KAPSAM_ETIKETLERI,
  kontenjanDurumu,
  ONAY_DURUMU_ETIKETLERI,
} from "@/lib/faaliyet/kurallar";
import { csvBelgesi, csvYaniti } from "@/lib/rapor/csv";
import { tarihYaz } from "@/lib/tarih";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import type { SorguParametreleri } from "../../ogrenciler/filtreler";
import { faaliyetFiltreleriniCoz, faaliyetListeFiltresi } from "../filtreler";

export const dynamic = "force-dynamic";

/**
 * Faaliyet listesinin CSV çıktısı.
 *
 * Ekranla aynı kapsam ve aynı filtrelerden geçer. Başvuru sayıları özet olarak
 * yazılır; başvuran ÖĞRENCİ adları burada yoktur — onlar faaliyetin
 * değerlendirme ekranına aittir ve o ekranın yetkisi ayrıdır
 * (references/permissions.md Bölüm 3).
 */

const BASLIKLAR = [
  "Faaliyet",
  "Tarih",
  "Kapsam",
  "Etkinlik kategorisi",
  "Program",
  "Düzenleyen birim",
  "Yer (okul/il)",
  "Başvuru başlangıç",
  "Başvuru bitiş",
  "Kontenjan",
  "Aktif başvuru",
  "Seçilen",
  "Yedek",
  "Onay durumu",
  "Faaliyet durumu",
  "Çalışma grupları",
] as const;

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);
  const parametreler: SorguParametreleri = Object.fromEntries(
    adres.searchParams.entries(),
  );
  const simdi = new Date();
  const nerede = faaliyetListeFiltresi(
    kullanici,
    faaliyetFiltreleriniCoz(parametreler),
    simdi,
  );

  const [toplam, ustSinir] = await Promise.all([
    prisma.faaliyet.count({ where: nerede }),
    ayarSayi(
      AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
      VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
    ),
  ]);

  if (toplam > ustSinir) {
    return new Response(
      `Bu filtrelerle ${toplam} kayıt var; tek dosyada en fazla ${ustSinir} kayıt indirilebilir. ` +
        "Lütfen kapsam veya kategori filtresiyle daraltın.",
      { status: 413, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const faaliyetler = await prisma.faaliyet.findMany({
    where: nerede,
    orderBy: [{ tarih: "asc" }],
    select: {
      id: true,
      ad: true,
      tarih: true,
      kapsam: true,
      etkinlikKategorisi: true,
      temelEtkinlikProgrami: { select: { ad: true } },
      kontenjan: true,
      onayDurumu: true,
      durum: true,
      duzenleyenBirim: true,
      basvuruBaslangic: true,
      basvuruBitis: true,
      kurum: { select: { ad: true } },
      il: { select: { ad: true } },
      calismaGruplari: {
        select: { calismaGrubu: { select: { ad: true } } },
      },
      basvurular: { select: { durum: true } },
    },
  });

  await erisimLoglaCoklu(
    faaliyetler.map((faaliyet) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "FAALIYET" as const,
      hedefId: faaliyet.id,
      detay: "Faaliyet listesi CSV olarak dışa aktarıldı",
    })),
  );

  const satirlar = faaliyetler.map((faaliyet) => {
    const kontenjan = kontenjanDurumu(faaliyet.basvurular, faaliyet.kontenjan);
    const secilen = faaliyet.basvurular.filter(
      (basvuru) => basvuru.durum === "SECILDI",
    ).length;
    const yedek = faaliyet.basvurular.filter(
      (basvuru) => basvuru.durum === "YEDEK",
    ).length;

    return [
      faaliyet.ad,
      tarihYaz(faaliyet.tarih),
      KAPSAM_ETIKETLERI[faaliyet.kapsam],
      ETKINLIK_KATEGORISI_ETIKETLERI[faaliyet.etkinlikKategorisi],
      faaliyet.temelEtkinlikProgrami?.ad ?? "",
      faaliyet.duzenleyenBirim,
      faaliyet.kurum?.ad ?? faaliyet.il?.ad ?? "",
      tarihYaz(faaliyet.basvuruBaslangic),
      tarihYaz(faaliyet.basvuruBitis),
      faaliyet.kontenjan,
      kontenjan.aktifBasvuru,
      secilen,
      yedek,
      ONAY_DURUMU_ETIKETLERI[faaliyet.onayDurumu],
      FAALIYET_DURUMU_ETIKETLERI[faaliyet.durum],
      faaliyet.calismaGruplari
        .map((etiket) => etiket.calismaGrubu.ad)
        .join(", "),
    ];
  });

  return csvYaniti("genctek-faaliyetler", csvBelgesi(BASLIKLAR, satirlar));
}
