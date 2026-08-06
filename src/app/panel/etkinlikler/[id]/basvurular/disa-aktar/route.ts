import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { faaliyetKapsamiCikar, gorunurFaaliyetGetir } from "@/lib/faaliyet/erisim";
import {
  BASVURU_DURUMU_ETIKETLERI,
  KATILIMCI_TIPI_ETIKETLERI,
  katilimciTipi,
} from "@/lib/faaliyet/kurallar";
import { csvAdParcasi, csvBelgesi, csvYaniti } from "@/lib/rapor/csv";
import { tarihYaz } from "@/lib/tarih";
import { basvuruDegerlendirebilirMi, yetkiDevrolduMu } from "@/lib/yetki/izinler";
import {
  DEGERLENDIRME_KATILIMCI_ALANLARI,
  ulusalBasvuranFiltresi,
} from "@/lib/yetki/kapsam";
import { erisimLoglaCoklu } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * Bir faaliyetin başvuru listesinin CSV çıktısı.
 *
 * Dosya, faaliyet detayındaki "Başvurular" kartının AYNISIDIR: aynı yetki
 * kapısından (`basvuruDegerlendirebilirMi`) ve aynı kapsam filtresinden geçer,
 * aynı alanları taşır. TELEFON VE E-POSTA YOKTUR — değerlendirme ekranında da
 * yoklar (references/permissions.md Bölüm 3) ve indirme yolunu kapsam
 * genişletmenin arka kapısı hâline getirmiyoruz.
 *
 * Diğer dışa aktarmalardaki satır SINIRI burada uygulanmaz: o sınır "filtreyi
 * daralt" diyebildiği için bir korkuluk, burada ise liste zaten tek faaliyetle
 * sınırlı ve daraltılacak bir filtre yok — sınır koymak, kullanıcıya çıkışı
 * olmayan bir duvar örmek olurdu.
 */

const BASLIKLAR = [
  "Ad",
  "Soyad",
  "Katılımcı tipi",
  "Sınıf / branş",
  "Okul",
  "İl",
  "Çalışma grupları",
  "Başvuru tarihi",
  "Durum",
  "Adına başvuran",
  "Gerekçe",
] as const;

export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const { id } = await params;
  const faaliyet = await gorunurFaaliyetGetir(
    kullanici,
    Number.parseInt(id, 10),
  );
  if (!faaliyet) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const kapsamBilgisi = faaliyetKapsamiCikar(faaliyet);
  if (!basvuruDegerlendirebilirMi(kullanici, kapsamBilgisi)) {
    // Faaliyeti görebiliyor ama başvuranları göremiyor: 403 yerine 404, çünkü
    // "yetkin yok" yanıtı listenin varlığını doğrulardı.
    return new Response("Bulunamadı", { status: 404 });
  }

  const basvuranlar = await prisma.basvuru.findMany({
    where: {
      AND: [
        ulusalBasvuranFiltresi(
          kullanici,
          faaliyet.id,
          yetkiDevrolduMu(kullanici, kapsamBilgisi),
        ),
        // Geri çekilen başvuru ekranda da yok: değerlendirilecek bir şey değil.
        { durum: { not: "GERI_CEKILDI" } },
      ],
    },
    orderBy: { basvuruTarihi: "asc" },
    select: {
      durum: true,
      gerekce: true,
      basvuruTarihi: true,
      katilimci: { select: DEGERLENDIRME_KATILIMCI_ALANLARI },
      adinaBasvuran: { select: { ad: true, soyad: true } },
    },
  });

  /*
   * Her katılımcı ayrı ayrı loglanır ve detayında "CSV" geçer: veri bu yolla
   * kurum dışına çıkabildiği için denetimde ekranda bakılan kayıtla indirilen
   * kaydı ayırt edebilmek gerekir.
   */
  await erisimLoglaCoklu(
    basvuranlar.map((basvuru) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip:
        katilimciTipi(basvuru.katilimci.roller) === "OGRENCI"
          ? ("OGRENCI" as const)
          : ("OGRETMEN" as const),
      hedefId: basvuru.katilimci.id,
      detay: `Başvuru listesi CSV olarak dışa aktarıldı: ${faaliyet.ad}`,
    })),
  );

  const satirlar = basvuranlar.map((basvuru) => [
    basvuru.katilimci.ad,
    basvuru.katilimci.soyad,
    KATILIMCI_TIPI_ETIKETLERI[katilimciTipi(basvuru.katilimci.roller)],
    // Sınıf ve branş aynı anda dolu olmaz; katılımcı tipi hangisi olduğunu
    // zaten söylüyor, bu yüzden tek sütun yetiyor.
    basvuru.katilimci.sinif ?? basvuru.katilimci.brans ?? "",
    basvuru.katilimci.kurum?.ad ?? "",
    basvuru.katilimci.il?.ad ?? "",
    basvuru.katilimci.calismaGruplari
      .map((secim) => secim.calismaGrubu.ad)
      .join(", "),
    tarihYaz(basvuru.basvuruTarihi),
    BASVURU_DURUMU_ETIKETLERI[basvuru.durum],
    basvuru.adinaBasvuran
      ? `${basvuru.adinaBasvuran.ad} ${basvuru.adinaBasvuran.soyad}`
      : "",
    basvuru.gerekce,
  ]);

  return csvYaniti(
    `genctek-basvurular-${csvAdParcasi(faaliyet.ad, String(faaliyet.id))}`,
    csvBelgesi(BASLIKLAR, satirlar),
  );
}
