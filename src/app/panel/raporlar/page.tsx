import { CalendarCheck, CircleAlert, FileText } from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { faaliyetSuresiYaz } from "@/lib/faaliyet/kurallar";
import { tarihSaatYaz, tarihYaz } from "@/lib/tarih";
import { danismanMi, ilKoordinatoruMu, projeYoneticisiMi } from "@/lib/yetki/izinler";
import { raporlanabilirFaaliyetFiltresi } from "@/lib/yetki/kapsam";

export const dynamic = "force-dynamic";

/**
 * Faaliyet raporları modülü — analiz isteği Bölüm 4.
 *
 * İl koordinatörünün "ilimde hangi faaliyet bitti, hangisinin raporu eksik"
 * sorusunu tek ekranda cevaplar. Raporun kendisi faaliyetin rapor sayfasında
 * yazılır; burası bir GÖREV LİSTESİDİR, ikinci bir yazma yolu değil.
 *
 * Sıralama bilinçli: raporu eksik olanlar üstte. Yazılmış raporlar aşağıda
 * kalır çünkü onlar iş değil, kayıttır.
 */
export default async function RaporlarSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  if (
    !ilKoordinatoruMu(kullanici) &&
    !projeYoneticisiMi(kullanici) &&
    !danismanMi(kullanici)
  ) {
    return (
      <Kart>
        <KartBasligi
          baslik="Etkinlik raporları"
          aciklama="Bu ekran etkinlik düzenleyen rollere açıktır."
        />
      </Kart>
    );
  }

  const simdi = new Date();

  /*
   * BİTMİŞ faaliyetler: çok günlüde bitiş, tek günlükte tarih ölçüt alınır.
   * Prisma tek sorguda "bitisTarihi varsa ona, yoksa tarihe bak" diyemediği
   * için iki koşul OR'lanıyor.
   */
  const bitmisler = await prisma.faaliyet.findMany({
    where: {
      AND: [
        raporlanabilirFaaliyetFiltresi(kullanici),
        { durum: "AKTIF" },
        {
          OR: [
            { bitisTarihi: { not: null, lte: simdi } },
            { bitisTarihi: null, tarih: { lte: simdi } },
          ],
        },
      ],
    },
    orderBy: { tarih: "desc" },
    select: {
      id: true,
      ad: true,
      tarih: true,
      bitisTarihi: true,
      kurum: { select: { ad: true } },
      il: { select: { ad: true } },
      duzenleyen: { select: { ad: true, soyad: true } },
      rapor: {
        select: {
          guncellemeTarihi: true,
          yazan: { select: { ad: true, soyad: true } },
        },
      },
      _count: { select: { basvurular: true } },
    },
  });

  const eksikler = bitmisler.filter((faaliyet) => faaliyet.rapor === null);
  const yazilanlar = bitmisler.filter((faaliyet) => faaliyet.rapor !== null);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Etkinlik raporları"
        aciklama={`Biten etkinlikler ve rapor durumları · ${eksikler.length} rapor bekliyor`}
      />

      {bitmisler.length === 0 ? (
        <Kart className="text-metin-yumusak">
          Kapsamınızda henüz bitmiş bir etkinlik yok. Etkinlik bitiş tarihini
          geçtiğinde burada listelenir.
        </Kart>
      ) : (
        <>
          <Kart>
            <KartBasligi
              baslik="Raporu bekleyenler"
              aciklama="Biten ama raporu yazılmamış etkinlikler."
              Ikon={CircleAlert}
            />
            {eksikler.length === 0 ? (
              <BilgiKutusu cesit="olumlu">
                Biten tüm etkinliklerin raporu yazılmış.
              </BilgiKutusu>
            ) : (
              <ul className="divide-y divide-cizgi">
                {eksikler.map((faaliyet) => (
                  <li
                    key={faaliyet.id}
                    className="flex flex-wrap items-baseline justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/panel/etkinlikler/${faaliyet.id}/rapor`}
                        className="font-medium text-vurgu-metin underline underline-offset-2"
                      >
                        {faaliyet.ad}
                      </Link>
                      <p className="mt-0.5 text-sm text-metin-yumusak">
                        {faaliyet.kurum?.ad ?? faaliyet.il?.ad ?? "Ülke geneli"}
                        {" · "}
                        {faaliyet.duzenleyen.ad} {faaliyet.duzenleyen.soyad}
                        {" · "}
                        {faaliyet._count.basvurular} başvuru
                      </p>
                    </div>
                    <span className="text-sm text-metin-yumusak">
                      {tarihYaz(faaliyet.bitisTarihi ?? faaliyet.tarih)}
                      {" · "}
                      {faaliyetSuresiYaz(faaliyet.tarih, faaliyet.bitisTarihi)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Kart>

          {yazilanlar.length > 0 && (
            <Kart>
              <KartBasligi
                baslik="Raporu yazılanlar"
                aciklama="Rapor düzeltilebilir; silinmez."
                Ikon={CalendarCheck}
              />
              <ul className="divide-y divide-cizgi">
                {yazilanlar.map((faaliyet) => (
                  <li
                    key={faaliyet.id}
                    className="flex flex-wrap items-baseline justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/panel/etkinlikler/${faaliyet.id}/rapor`}
                        className="inline-flex items-center gap-1.5 font-medium text-metin underline underline-offset-2"
                      >
                        <FileText size={15} aria-hidden />
                        {faaliyet.ad}
                      </Link>
                      <p className="mt-0.5 text-sm text-metin-yumusak">
                        {faaliyet.rapor?.yazan.ad} {faaliyet.rapor?.yazan.soyad}
                        {" · "}
                        {faaliyet.rapor
                          ? tarihSaatYaz(faaliyet.rapor.guncellemeTarihi)
                          : "—"}
                      </p>
                    </div>
                    <span className="text-sm text-metin-yumusak">
                      {tarihYaz(faaliyet.bitisTarihi ?? faaliyet.tarih)}
                    </span>
                  </li>
                ))}
              </ul>
            </Kart>
          )}
        </>
      )}
    </div>
  );
}
