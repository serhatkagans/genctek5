import { ArrowRightLeft, Check, X } from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_GIRDI,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { tarihSaatYaz, tarihYaz } from "@/lib/tarih";
import { ilKoordinatoruMu, projeYoneticisiMi } from "@/lib/yetki/izinler";
import { ilDisiBasvuruFiltresi } from "@/lib/yetki/kapsam";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import { kaynakIlKarariEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * İl dışına giden başvurular — analiz isteği Bölüm 4.
 *
 * Koordinatör KENDİ ilinden başka bir ilin etkinliğine yapılan başvuruları
 * görür ve öğrencisinin gitmesine onay verir. Etkinliğin ilindeki karar bu
 * ekranda DEĞİLDİR; onu faaliyeti düzenleyen kendi değerlendirme ekranında
 * verir (çift onayın ikinci adımı).
 */

const DURUM_MESAJLARI: Record<string, string> = {
  onaylandi: "Başvuru onaylandı. Sıra etkinliğin ilindeki değerlendirmeye geçti.",
  reddedildi: "Başvuru reddedildi ve öğrenciye gerekçesiyle bildirildi.",
};

const ONAY_ETIKETLERI: Record<string, string> = {
  BEKLIYOR: "Kararınızı bekliyor",
  ONAYLANDI: "Onayladınız",
  REDDEDILDI: "Reddettiniz",
};

export default async function IlDisiBasvurularSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; hata?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum, hata } = await searchParams;

  if (!ilKoordinatoruMu(kullanici) && !projeYoneticisiMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="İl dışı başvurular"
          aciklama="Bu ekran il koordinatörüne ve proje yöneticisine açıktır."
        />
      </Kart>
    );
  }

  const basvurular = await prisma.basvuru.findMany({
    where: ilDisiBasvuruFiltresi(kullanici),
    orderBy: [{ kaynakIlOnayDurumu: "asc" }, { basvuruTarihi: "desc" }],
    select: {
      id: true,
      gerekce: true,
      durum: true,
      basvuruTarihi: true,
      kaynakIlOnayDurumu: true,
      kaynakIlOnayTarihi: true,
      kaynakIlRetGerekcesi: true,
      katilimci: {
        select: {
          id: true,
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
          kapsam: true,
          il: { select: { ad: true } },
          kurum: { select: { ad: true, il: { select: { ad: true } } } },
        },
      },
    },
  });

  // Kişisel veri görüntüleniyor; erişim kaydı KVKK gereği tutulur.
  await erisimLoglaCoklu(
    basvurular.map((basvuru) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "BASVURU" as const,
      hedefId: basvuru.id,
      detay: "İl dışı başvuru listesi görüntülendi",
    })),
  );

  const bekleyenler = basvurular.filter(
    (basvuru) => basvuru.kaynakIlOnayDurumu === "BEKLIYOR",
  );
  const karara_baglananlar = basvurular.filter(
    (basvuru) => basvuru.kaynakIlOnayDurumu !== "BEKLIYOR",
  );

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="İl dışı başvurular"
        aciklama={`İlinizden başka bir ilin etkinliğine yapılan başvurular · ${bekleyenler.length} karar bekliyor`}
      />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <BilgiKutusu cesit="uyari">
        Onayınız başvuruyu sonuçlandırmaz. Onaydan sonra etkinliği düzenleyen il
        kendi değerlendirmesini yapar; öğrenci ancak orada seçilirse katılır.
      </BilgiKutusu>

      <Kart>
        <KartBasligi
          baslik="Kararınızı bekleyenler"
          aciklama="Öğrenci, siz karar verene kadar etkinliğin ilinde değerlendirilmez."
          Ikon={ArrowRightLeft}
        />

        {bekleyenler.length === 0 ? (
          <p className="text-metin-yumusak">
            Kararınızı bekleyen başvuru yok.
          </p>
        ) : (
          <ul className="space-y-4">
            {bekleyenler.map((basvuru) => (
              <li
                key={basvuru.id}
                className="rounded-kart border border-cizgi p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-baslik">
                    {basvuru.katilimci.ad} {basvuru.katilimci.soyad}
                    {basvuru.katilimci.sinif && (
                      <span className="ml-2 text-sm font-normal text-metin-yumusak">
                        {basvuru.katilimci.sinif}
                      </span>
                    )}
                  </p>
                  <span className="text-sm text-metin-yumusak">
                    {tarihSaatYaz(basvuru.basvuruTarihi)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-metin-yumusak">
                  {basvuru.katilimci.kurum?.ad ?? "—"}
                </p>

                <p className="mt-3 text-metin">
                  <Link
                    href={`/panel/faaliyetler/${basvuru.faaliyet.id}`}
                    className="font-medium text-vurgu-metin underline underline-offset-2"
                  >
                    {basvuru.faaliyet.ad}
                  </Link>
                  <span className="text-metin-yumusak">
                    {" · "}
                    {basvuru.faaliyet.il?.ad ??
                      basvuru.faaliyet.kurum?.il?.ad ??
                      "Ülke geneli"}
                    {" · "}
                    {tarihYaz(basvuru.faaliyet.tarih)}
                  </span>
                </p>

                <p className="mt-2 rounded-md bg-zemin px-3 py-2 text-sm text-metin">
                  <span className="font-medium">Öğrencinin gerekçesi: </span>
                  {basvuru.gerekce}
                </p>

                <form
                  action={kaynakIlKarariEylemi}
                  className="mt-3 flex flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="basvuruId" value={basvuru.id} />
                  <label className="block grow">
                    <span className="text-sm font-medium text-metin">
                      Gerekçe{" "}
                      <span className="text-metin-yumusak">
                        (redde zorunlu)
                      </span>
                    </span>
                    <input
                      type="text"
                      name="gerekce"
                      maxLength={500}
                      className={SINIF_GIRDI}
                    />
                  </label>
                  <button
                    type="submit"
                    name="karar"
                    value="onayla"
                    className="inline-flex items-center gap-1.5 rounded-md bg-olumlu-zemin px-3 py-2 text-sm font-medium text-olumlu-metin transition hover:opacity-90"
                  >
                    <Check size={15} aria-hidden />
                    Onayla
                  </button>
                  <button
                    type="submit"
                    name="karar"
                    value="reddet"
                    className="inline-flex items-center gap-1.5 rounded-md bg-hata-zemin px-3 py-2 text-sm font-medium text-hata-metin transition hover:opacity-90"
                  >
                    <X size={15} aria-hidden />
                    Reddet
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Kart>

      {karara_baglananlar.length > 0 && (
        <Kart>
          <KartBasligi
            baslik="Karara bağlananlar"
            aciklama="Geçmiş kararlar; bilgi amaçlıdır, değiştirilemez."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="border-b border-cizgi text-metin-yumusak">
                <tr>
                  <th className="px-3 py-2 font-medium">Öğrenci</th>
                  <th className="px-3 py-2 font-medium">Faaliyet</th>
                  <th className="px-3 py-2 font-medium">Kararınız</th>
                  <th className="px-3 py-2 font-medium">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi">
                {karara_baglananlar.map((basvuru) => (
                  <tr key={basvuru.id}>
                    <td className="px-3 py-2 text-metin">
                      {basvuru.katilimci.ad} {basvuru.katilimci.soyad}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/panel/faaliyetler/${basvuru.faaliyet.id}`}
                        className="text-vurgu-metin underline underline-offset-2"
                      >
                        {basvuru.faaliyet.ad}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-metin">
                      {ONAY_ETIKETLERI[basvuru.kaynakIlOnayDurumu] ??
                        basvuru.kaynakIlOnayDurumu}
                      {basvuru.kaynakIlRetGerekcesi && (
                        <span className="block text-xs text-metin-yumusak">
                          {basvuru.kaynakIlRetGerekcesi}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-metin-yumusak">
                      {basvuru.kaynakIlOnayTarihi
                        ? tarihSaatYaz(basvuru.kaynakIlOnayTarihi)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kart>
      )}
    </div>
  );
}
