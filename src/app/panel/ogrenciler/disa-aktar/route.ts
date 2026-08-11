import { oturumKullanicisi } from "@/lib/auth/oturum";
import {
  AYAR_ANAHTARLARI,
  ayarSayi,
  VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
} from "@/lib/ayar";
import { prisma } from "@/lib/db";
import { csvBelgesi, csvYaniti } from "@/lib/rapor/csv";
import { ogrenciEnvanteriGorebilirMi } from "@/lib/yetki/izinler";
import { ogrenciListeFiltresi } from "@/lib/yetki/kapsam";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import { ogrenciFiltreleriniCoz, type SorguParametreleri } from "../filtreler";

export const dynamic = "force-dynamic";

/**
 * Öğrenci envanterinin CSV çıktısı.
 *
 * Dosya, ekranda görünen listenin AYNISIDIR: aynı kapsam filtresinden ve aynı
 * ekran filtrelerinden geçer, aynı sütunları taşır. Dışa aktarmaya ekranda
 * olmayan bir alan (e-posta, telefon) eklemek, indirme yolunu kapsam
 * genişletmenin arka kapısı hâline getirirdi.
 *
 * Tek fark sayfalamanın olmaması; onun yerine bir satır sınırı var.
 */

const BASLIKLAR = [
  "Ad",
  "Soyad",
  "Sınıf",
  "Eğitim-öğretim yılı",
  "Okul",
  "Okul türü",
  "Kurum kodu",
  "İl",
  "İlçe",
  "Danışman",
  "Çalışma grupları",
] as const;

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    return new Response("Bulunamadı", { status: 404 });
  }

  // Ekranın kapısı burada da aynen uygulanır: indirme yolu, ekranda kapalı
  // olan bir listeye arka kapı olamaz (11 Ağustos 2026 · ekran öğrenciden
  // fazlasını eliyor, bkz. ogrenciEnvanteriGorebilirMi).
  if (!ogrenciEnvanteriGorebilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);
  const parametreler: SorguParametreleri = Object.fromEntries(
    adres.searchParams.entries(),
  );
  const nerede = ogrenciListeFiltresi(
    kullanici,
    ogrenciFiltreleriniCoz(parametreler),
  );

  const [toplam, ustSinir] = await Promise.all([
    prisma.kullanici.count({ where: nerede }),
    ayarSayi(
      AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
      VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
    ),
  ]);

  /*
   * Sınır aşıldığında liste kırpılmaz, indirme reddedilir. Sessizce kırpmak,
   * eksik olduğu belli olmayan bir rapor üretirdi — sayıları toplayan kişi
   * eksiği fark edemez.
   */
  if (toplam > ustSinir) {
    return new Response(
      `Bu filtrelerle ${toplam} kayıt var; tek dosyada en fazla ${ustSinir} kayıt indirilebilir. ` +
        "Lütfen il, okul veya sınıf filtresiyle daraltın.",
      { status: 413, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const ogrenciler = await prisma.kullanici.findMany({
    where: nerede,
    select: {
      id: true,
      ad: true,
      soyad: true,
      sinif: true,
      egitimOgretimYili: true,
      kurumKodu: true,
      kurum: { select: { ad: true, okulTuru: true } },
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      calismaGruplari: {
        select: { calismaGrubu: { select: { ad: true } } },
      },
      ogrenciAtamalari: {
        where: { bitisTarihi: null },
        select: { danisman: { select: { ad: true, soyad: true } } },
      },
    },
    orderBy: [{ ad: "asc" }, { soyad: "asc" }],
  });

  /*
   * Dışa aktarma da kayıt bazında loglanır ve detayında "CSV" geçer: veri bu
   * yolla kurum dışına çıkabildiği için, denetimde ekranda bakılan kayıtla
   * indirilen kaydı ayırt edebilmek gerekir.
   */
  await erisimLoglaCoklu(
    ogrenciler.map((ogrenci) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "OGRENCI" as const,
      hedefId: ogrenci.id,
      detay: "Öğrenci listesi CSV olarak dışa aktarıldı",
    })),
  );

  const satirlar = ogrenciler.map((ogrenci) => {
    const danisman = ogrenci.ogrenciAtamalari[0]?.danisman;
    return [
      ogrenci.ad,
      ogrenci.soyad,
      ogrenci.sinif ?? "",
      ogrenci.egitimOgretimYili,
      ogrenci.kurum?.ad ?? "",
      ogrenci.kurum?.okulTuru ?? "",
      ogrenci.kurumKodu ?? "",
      ogrenci.il?.ad ?? "",
      ogrenci.ilce?.ad ?? "",
      danisman ? `${danisman.ad} ${danisman.soyad}` : "Atanmadı",
      ogrenci.calismaGruplari
        .map((secim) => secim.calismaGrubu.ad)
        .join(", "),
    ];
  });

  return csvYaniti("genctek-ogrenciler", csvBelgesi(BASLIKLAR, satirlar));
}
