import { Check, Handshake, X } from "lucide-react";
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
import { GIZLILIK_UYARISI } from "@/lib/iletisim/kurallar";
import { tarihSaatYaz } from "@/lib/tarih";
import { danismanMi, ilKoordinatoruMu, projeYoneticisiMi } from "@/lib/yetki/izinler";
import { baglantiKarariFiltresi } from "@/lib/yetki/kapsam";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import { baglantiKarariEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Bağlantı isteği onay ekranı — analiz isteği Bölüm 6, Aşama 2.
 *
 * Onaylayan, isteği YAPANIN danışmanı ya da ilinin koordinatörüdür. Hedefin
 * tarafı karar vermez: bu "kabul ediyor musun" sorusu değil, "öğrencimin bu
 * teması kurmasına izin veriyor muyum" sorusudur.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  onaylandi: "Bağlantı onaylandı ve yazışma açıldı. İki tarafa da bildirildi.",
  reddedildi: "Bağlantı reddedildi; isteği yapana gerekçesiyle bildirildi.",
};

const ONAY_ETIKETLERI: Record<string, string> = {
  BEKLIYOR: "Bekliyor",
  ONAYLANDI: "Onaylandı",
  REDDEDILDI: "Reddedildi",
};

export default async function BaglantilarSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; hata?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum, hata } = await searchParams;

  if (
    !danismanMi(kullanici) &&
    !ilKoordinatoruMu(kullanici) &&
    !projeYoneticisiMi(kullanici)
  ) {
    return (
      <Kart>
        <KartBasligi
          baslik="İletişim onayları"
          aciklama="Bu ekran danışman öğretmen, il koordinatörü ve proje yöneticisine açıktır."
        />
      </Kart>
    );
  }

  const istekler = await prisma.baglantiIstegi.findMany({
    where: baglantiKarariFiltresi(kullanici),
    orderBy: [{ onayDurumu: "asc" }, { olusturmaTarihi: "desc" }],
    take: 100,
    select: {
      id: true,
      mesaj: true,
      onayDurumu: true,
      retGerekcesi: true,
      kararTarihi: true,
      olusturmaTarihi: true,
      talep: { select: { baslik: true } },
      isteyen: {
        select: {
          ad: true,
          soyad: true,
          sinif: true,
          kurum: { select: { ad: true } },
        },
      },
      hedef: {
        select: {
          ad: true,
          soyad: true,
          sinif: true,
          kurum: { select: { ad: true } },
          il: { select: { ad: true } },
        },
      },
      kararVeren: { select: { ad: true, soyad: true } },
    },
  });

  await erisimLoglaCoklu(
    istekler.map((istek) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "PROFIL" as const,
      hedefId: istek.id,
      detay: "Bağlantı isteği listesi görüntülendi",
    })),
  );

  const bekleyenler = istekler.filter((i) => i.onayDurumu === "BEKLIYOR");
  const gecmis = istekler.filter((i) => i.onayDurumu !== "BEKLIYOR");

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="İletişim onayları"
        aciklama={`Öğrencilerinizin iletişim talepleri · ${bekleyenler.length} karar bekliyor`}
      />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <BilgiKutusu cesit="uyari">
        Onayladığınız bağlantıda taraflar sistem üzerinden yazışır. {GIZLILIK_UYARISI}
      </BilgiKutusu>

      <Kart>
        <KartBasligi
          baslik="Kararınızı bekleyenler"
          aciklama="Onaylanana kadar taraflar birbirine ulaşamaz; hedef kişi istekten haberdar değildir."
          Ikon={Handshake}
        />

        {bekleyenler.length === 0 ? (
          <p className="text-metin-yumusak">Bekleyen istek yok.</p>
        ) : (
          <ul className="space-y-4">
            {bekleyenler.map((istek) => (
              <li key={istek.id} className="rounded-kart border border-cizgi p-4">
                <p className="font-semibold text-baslik">
                  {istek.isteyen.ad} {istek.isteyen.soyad}
                  <span className="mx-2 font-normal text-metin-yumusak">→</span>
                  {istek.hedef.ad} {istek.hedef.soyad}
                </p>
                <p className="mt-0.5 text-sm text-metin-yumusak">
                  {istek.isteyen.kurum?.ad ?? "—"}
                  {" → "}
                  {istek.hedef.kurum?.ad ?? istek.hedef.il?.ad ?? "—"}
                  {istek.talep && ` · ${istek.talep.baslik}`}
                  {" · "}
                  {tarihSaatYaz(istek.olusturmaTarihi)}
                </p>

                <p className="mt-3 rounded-md bg-zemin px-3 py-2 text-sm text-metin">
                  <span className="font-medium">Öğrencinin mesajı: </span>
                  {istek.mesaj}
                </p>

                <form
                  action={baglantiKarariEylemi}
                  className="mt-3 flex flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="istekId" value={istek.id} />
                  <label className="block grow">
                    <span className="text-sm font-medium text-metin">
                      Gerekçe{" "}
                      <span className="text-metin-yumusak">(redde zorunlu)</span>
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

      {gecmis.length > 0 && (
        <Kart>
          <KartBasligi
            baslik="Karara bağlananlar"
            aciklama="Onaylanan bağlantıların yazışmalarını Bağlantılarım ekranından okuyabilirsiniz."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-cizgi text-metin-yumusak">
                <tr>
                  <th className="px-3 py-2 font-medium">Taraflar</th>
                  <th className="px-3 py-2 font-medium">Karar</th>
                  <th className="px-3 py-2 font-medium">Veren</th>
                  <th className="px-3 py-2 font-medium">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi">
                {gecmis.map((istek) => (
                  <tr key={istek.id}>
                    <td className="px-3 py-2 text-metin">
                      {istek.isteyen.ad} {istek.isteyen.soyad} →{" "}
                      {istek.hedef.ad} {istek.hedef.soyad}
                    </td>
                    <td className="px-3 py-2 text-metin">
                      {ONAY_ETIKETLERI[istek.onayDurumu] ?? istek.onayDurumu}
                      {istek.retGerekcesi && (
                        <span className="block text-xs text-metin-yumusak">
                          {istek.retGerekcesi}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-metin-yumusak">
                      {istek.kararVeren
                        ? `${istek.kararVeren.ad} ${istek.kararVeren.soyad}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-metin-yumusak">
                      {istek.kararTarihi ? tarihSaatYaz(istek.kararTarihi) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link
            href="/panel/yazismalar"
            className="mt-4 inline-block text-sm font-medium text-vurgu-metin underline underline-offset-2"
          >
            Bağlantılarım&apos;da aç →
          </Link>
        </Kart>
      )}
    </div>
  );
}
