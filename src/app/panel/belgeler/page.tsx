import { Award, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { BilgiKutusu, Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { belgeKapisi } from "@/lib/belge/kapi";
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
 * RAPOR ARTIK ÖN KOŞUL (12 Ağustos 2026 · istek: "etkinlik raporu yazılmadan
 * belge oluştur seçeneği olmamalı"). Ekran raporsuz etkinliği GİZLEMİYOR, ayrı
 * bir başlıkta ve rapor bağlantısıyla gösteriyor: gizleseydi öğretmen aradığı
 * etkinliği listede bulamaz ve sebebini de öğrenemezdi.
 *
 * Eski not — "bitmiş olma koşulu yok, belge aynı gün de verilebilir" — artık
 * kendiliğinden sağlanıyor: rapor bitmeden yazılamadığı için belge de
 * bitmeden üretilemiyor.
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
      // Rapor kaydının VARLIĞI soruluyor, metni değil: kapının tek sorusu bu
      // (bkz. lib/belge/kapi.ts · belgeKapisi).
      rapor: { select: { faaliyetId: true } },
      _count: { select: { basvurular: true } },
    },
  });

  const bitmisMi = (f: (typeof faaliyetler)[number]) =>
    (f.bitisTarihi ?? f.tarih) <= simdi;
  const raporluMu = (f: (typeof faaliyetler)[number]) =>
    belgeKapisi({ raporVarMi: f.rapor !== null }).olurMu;

  const hazirlar = faaliyetler.filter(raporluMu);
  // Raporsuzlar arasında yalnızca BİTENLER gösteriliyor: bitmemiş etkinliğin
  // raporu zaten yazılamaz, listede durması "eksik iş" gibi okunurdu.
  const raporBekleyenler = faaliyetler.filter(
    (f) => !raporluMu(f) && bitmisMi(f),
  );

  const satir = (f: (typeof faaliyetler)[number]) => (
    <li
      key={f.id}
      className="flex flex-wrap items-center justify-between gap-3 py-3"
    >
      <div className="min-w-0">
        <Link
          href={
            raporluMu(f)
              ? `/panel/etkinlikler/${f.id}/belgeler`
              : `/panel/etkinlikler/${f.id}/rapor`
          }
          className="font-medium text-vurgu-metin underline underline-offset-2"
        >
          {f.ad}
        </Link>
        <p className="mt-0.5 text-sm text-metin-yumusak">
          {f.kurum?.ad ?? f.il?.ad ?? "Ülke geneli"}
          {" · "}
          {f._count.basvurular} başvuru
          {raporluMu(f) ? "" : " · raporu yazılmadı"}
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
        aciklama="Katılım ve teşekkür belgesi vermek istediğiniz etkinliği seçin."
      />

      <BilgiKutusu cesit="uyari">
        Belge, kişinin GençTek Yolculuğu&apos;na katılım düşürür. Bu yüzden iki
        ön koşulu var: etkinliğin <strong>raporu yazılmış</strong> olmalı ve
        kişi <strong>yoklamada &quot;geldi&quot;</strong> işaretlenmiş olmalı.
        Belgeler resmî şablon üzerine basılır ve tarayıcının{" "}
        <strong>Yazdır → PDF olarak kaydet</strong> akışıyla indirilir. Kimin
        kime belge ürettiği erişim kayıtlarına yazılır.
      </BilgiKutusu>

      {faaliyetler.length === 0 ? (
        <Kart className="text-metin-yumusak">
          Belge üretebileceğiniz etkinlik yok. Kendi açtığınız etkinlikler ve —
          koordinatörseniz — ilinizdeki etkinlikler burada listelenir.
        </Kart>
      ) : (
        <>
          <Kart>
            <KartBasligi
              baslik="Belge üretilebilir etkinlikler"
              aciklama="Raporu yazılmış etkinlikler."
              Ikon={Award}
            />
            {hazirlar.length === 0 ? (
              <p className="text-metin-yumusak">
                Raporu yazılmış etkinlik yok. Belge üretebilmek için önce
                etkinliğin raporunu yazın.
              </p>
            ) : (
              <ul className="divide-y divide-cizgi">{hazirlar.map(satir)}</ul>
            )}
          </Kart>

          {raporBekleyenler.length > 0 && (
            <Kart>
              <KartBasligi
                baslik="Raporu bekleyen etkinlikler"
                aciklama="Bitmiş ama raporu yazılmamış; belge üretilemez. Ad, doğrudan rapor ekranına gider."
                Ikon={CalendarCheck}
              />
              <ul className="divide-y divide-cizgi">
                {raporBekleyenler.map(satir)}
              </ul>
            </Kart>
          )}
        </>
      )}
    </div>
  );
}
