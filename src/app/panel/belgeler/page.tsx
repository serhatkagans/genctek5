import { Award, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { BilgiKutusu, Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { tarihYaz } from "@/lib/tarih";
import {
  danismanMi,
  ilKoordinatoruMu,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { raporlanabilirFaaliyetFiltresi } from "@/lib/yetki/kapsam";

export const dynamic = "force-dynamic";

/**
 * Belge oluşturma girişi — faaliyet seçme ekranı.
 *
 * Belgeler faaliyet detayından da üretilebiliyor; bu ekran menüden doğrudan
 * gelen yolu açıyor. İkisi aynı sayfaya çıkıyor, ayrı bir üretim yolu
 * AÇILMIYOR — iki ayrı akış olsaydı yetki ve metin kuralları iki yerde
 * tutulurdu.
 *
 * Kapsam raporlamayla aynı (raporlanabilirFaaliyetFiltresi): kendi açtığın
 * faaliyetler, koordinatörsen ilindekiler, merkezsen hepsi. Ayrı bir filtre
 * yazmak, aynı sorunun iki cevabını doğururdu.
 *
 * BİTMİŞ olma koşulu YOK: rapor bitişten sonra yazılır ama belge etkinliğin
 * hemen ardından, hatta aynı gün verilebilir. Yine de bitmişler üstte
 * listeleniyor çünkü belge ihtiyacı orada doğuyor.
 */
export default async function BelgelerGirisSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  if (
    !danismanMi(kullanici) &&
    !ilKoordinatoruMu(kullanici) &&
    !projeYoneticisiMi(kullanici)
  ) {
    return (
      <Kart>
        <KartBasligi
          baslik="Belge oluştur"
          aciklama="Bu ekran danışman öğretmen, il koordinatörü ve proje yöneticisine açıktır."
        />
      </Kart>
    );
  }

  const simdi = new Date();

  const faaliyetler = await prisma.faaliyet.findMany({
    where: {
      AND: [raporlanabilirFaaliyetFiltresi(kullanici), { durum: "AKTIF" }],
    },
    orderBy: { tarih: "desc" },
    take: 100,
    select: {
      id: true,
      ad: true,
      tarih: true,
      bitisTarihi: true,
      kurum: { select: { ad: true } },
      il: { select: { ad: true } },
      _count: { select: { basvurular: true } },
    },
  });

  const bitmisMi = (f: (typeof faaliyetler)[number]) =>
    (f.bitisTarihi ?? f.tarih) <= simdi;
  const bitenler = faaliyetler.filter(bitmisMi);
  const yaklasanlar = faaliyetler.filter((f) => !bitmisMi(f));

  const satir = (f: (typeof faaliyetler)[number]) => (
    <li
      key={f.id}
      className="flex flex-wrap items-center justify-between gap-3 py-3"
    >
      <div className="min-w-0">
        <Link
          href={`/panel/faaliyetler/${f.id}/belgeler`}
          className="font-medium text-vurgu-metin underline underline-offset-2"
        >
          {f.ad}
        </Link>
        <p className="mt-0.5 text-sm text-metin-yumusak">
          {f.kurum?.ad ?? f.il?.ad ?? "Ülke geneli"}
          {" · "}
          {f._count.basvurular} başvuru
        </p>
      </div>
      <span className="text-sm text-metin-yumusak">
        {tarihYaz(f.bitisTarihi ?? f.tarih)}
      </span>
    </li>
  );

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Belge oluştur"
        aciklama="Katılım ve teşekkür belgesi vermek istediğiniz faaliyeti seçin."
      />

      <BilgiKutusu cesit="uyari">
        Belgeler resmî şablon üzerine basılır ve tarayıcının{" "}
        <strong>Yazdır → PDF olarak kaydet</strong> akışıyla indirilir. Kimin
        kime belge ürettiği erişim kayıtlarına yazılır.
      </BilgiKutusu>

      {faaliyetler.length === 0 ? (
        <Kart className="text-metin-yumusak">
          Belge üretebileceğiniz faaliyet yok. Kendi açtığınız faaliyetler ve —
          koordinatörseniz — ilinizdeki faaliyetler burada listelenir.
        </Kart>
      ) : (
        <>
          <Kart>
            <KartBasligi
              baslik="Biten faaliyetler"
              aciklama="Belge ihtiyacı çoğunlukla burada doğar."
              Ikon={Award}
            />
            {bitenler.length === 0 ? (
              <p className="text-metin-yumusak">Bitmiş faaliyet yok.</p>
            ) : (
              <ul className="divide-y divide-cizgi">{bitenler.map(satir)}</ul>
            )}
          </Kart>

          {yaklasanlar.length > 0 && (
            <Kart>
              <KartBasligi
                baslik="Süren ve yaklaşan faaliyetler"
                aciklama="Belge etkinliğin hemen ardından da verilebilir."
                Ikon={CalendarCheck}
              />
              <ul className="divide-y divide-cizgi">
                {yaklasanlar.map(satir)}
              </ul>
            </Kart>
          )}
        </>
      )}
    </div>
  );
}
