import { GraduationCap } from "lucide-react";
import { notFound } from "next/navigation";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  MENTORLUK_DURUM_ETIKETLERI,
  MENTORLUK_DURUM_SINIFLARI,
  mentorKapsamiYaz,
} from "@/lib/mentor/kurallar";
import { mentorlukKapsamFiltresi } from "@/lib/mentor/veri";
import { tarihSaatYaz } from "@/lib/tarih";
import { kullaniciRolEtiketi } from "@/lib/yetki/etiketler";
import { mentorlukOnaylayabilirMi } from "@/lib/yetki/izinler";
import { mentorlukKararEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Mentörlük onay kuyruğu — il koordinatörü ve proje yöneticisi.
 *
 * KAPSAM MERKEZİ FİLTREDEN geçer: koordinatör yalnızca kendi ilindeki
 * başvuruları görür, proje yöneticisi hepsini (istek: "proje yöneticisi de
 * onaylayabilir mentörü"). Yetkisi olmayan 404 görür — ekranın varlığı
 * sızmasın.
 *
 * KARARA BAĞLANMIŞLAR DA LİSTELENİR (ayrı bölümde): "kimi onayladım"
 * sorusunun cevabı, kararın kendisi kadar gerekli. Bekleyenler üstte durur
 * çünkü ekranın işi onlardır.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  onaylandi: "Mentörlük onaylandı.",
  reddedildi: "Mentörlük reddedildi ve gerekçe kaydedildi.",
};

function tekil(deger: string | string[] | undefined): string | null {
  if (Array.isArray(deger)) return deger[0] ?? null;
  return deger ?? null;
}

export default async function MentorlukKuyruguSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!mentorlukOnaylayabilirMi(kullanici)) notFound();

  const parametreler = await searchParams;
  const hata = tekil(parametreler.hata);
  const durum = tekil(parametreler.durum);

  const kayitlar = await prisma.mentorluk.findMany({
    where: mentorlukKapsamFiltresi(kullanici),
    orderBy: [{ durum: "asc" }, { basvuruTarihi: "asc" }],
    select: {
      kullaniciId: true,
      durum: true,
      konular: true,
      basvuruTarihi: true,
      kararTarihi: true,
      retGerekcesi: true,
      gruplar: { select: { calismaGrubu: { select: { ad: true } } } },
      kullanici: {
        select: {
          ad: true,
          soyad: true,
          brans: true,
          kurum: { select: { ad: true } },
          il: { select: { ad: true } },
          roller: {
            where: { bitisTarihi: null },
            select: { rolKodu: true, ilKodu: true, kurumKodu: true },
          },
        },
      },
    },
  });

  const bekleyenler = kayitlar.filter((k) => k.durum === "BEKLIYOR");
  const kararlilar = kayitlar.filter((k) => k.durum !== "BEKLIYOR");

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Mentörlük başvuruları"
        aciklama={
          bekleyenler.length > 0
            ? `${bekleyenler.length} başvuru kararınızı bekliyor`
            : "Bekleyen başvuru yok"
        }
      />

      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}
      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}

      <BilgiKutusu>
        Onayladığınız kişi, panodaki <strong>&quot;Mentöre sor&quot;</strong>{" "}
        ilanlarında mentör olarak görünür ve öğrencilerle{" "}
        <strong>bağlantı onayından geçen</strong> yazışmalar kurabilir.
        Yazışmalar gizli değildir; danışman, koordinatör ve proje yöneticisi
        okuyabilir.
      </BilgiKutusu>

      <Kart>
        <KartBasligi
          baslik="Kararınızı bekleyenler"
          Ikon={GraduationCap}
        />
        {bekleyenler.length === 0 ? (
          <p className="text-metin-yumusak">Bekleyen başvuru yok.</p>
        ) : (
          <ul className="divide-y divide-cizgi">
            {bekleyenler.map((kayit) => (
              <li key={kayit.kullaniciId} className="py-4 first:pt-0 last:pb-0">
                <p className="font-medium text-metin">
                  {kayit.kullanici.ad} {kayit.kullanici.soyad}
                </p>
                <p className="mt-0.5 text-sm text-metin-yumusak">
                  {[
                    kullaniciRolEtiketi({
                      ...kullanici,
                      roller: kayit.kullanici.roller,
                    }),
                    kayit.kullanici.brans,
                    kayit.kullanici.kurum?.ad,
                    kayit.kullanici.il?.ad,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-2 text-sm text-metin">
                  <span className="font-medium">Kapsam: </span>
                  {mentorKapsamiYaz(
                    kayit.gruplar.map((g) => g.calismaGrubu.ad),
                    kayit.konular,
                  ) || "—"}
                </p>
                <p className="mt-0.5 text-sm text-metin-yumusak">
                  {tarihSaatYaz(kayit.basvuruTarihi)} tarihinde başvurdu
                </p>

                {/*
                  ONAY ve RET AYNI FORMDA, iki düğme. Ret gerekçesi zorunlu
                  olduğu için alan hep basılıyor — ayrı bir "reddet" ekranına
                  götürmek, karar verecek kişiyi listeden koparırdı.
                */}
                <form
                  action={mentorlukKararEylemi}
                  className="mt-3 flex flex-wrap items-end gap-3"
                >
                  <input
                    type="hidden"
                    name="kullaniciId"
                    value={kayit.kullaniciId}
                  />
                  <label className="block grow">
                    <span className="text-sm text-metin-yumusak">
                      Ret gerekçesi (yalnızca reddederken zorunlu)
                    </span>
                    <input
                      type="text"
                      name="retGerekcesi"
                      maxLength={500}
                      className={SINIF_GIRDI}
                    />
                  </label>
                  <button
                    type="submit"
                    name="karar"
                    value="ONAYLA"
                    className={SINIF_BIRINCIL_BUTON}
                  >
                    Onayla
                  </button>
                  <button
                    type="submit"
                    name="karar"
                    value="REDDET"
                    className={SINIF_IKINCIL_BUTON}
                  >
                    Reddet
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Kart>

      {kararlilar.length > 0 && (
        <Kart>
          <KartBasligi
            baslik="Karara bağlananlar"
            aciklama="Onaylananlar, reddedilenler ve mentörlüğü bırakanlar."
          />
          <ul className="divide-y divide-cizgi">
            {kararlilar.map((kayit) => (
              <li
                key={kayit.kullaniciId}
                className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-metin">
                    {kayit.kullanici.ad} {kayit.kullanici.soyad}
                  </p>
                  <p className="mt-0.5 text-sm text-metin-yumusak">
                    {mentorKapsamiYaz(
                      kayit.gruplar.map((g) => g.calismaGrubu.ad),
                      kayit.konular,
                    ) || "—"}
                  </p>
                  {kayit.retGerekcesi && (
                    <p className="mt-1 text-sm text-hata-metin">
                      Gerekçe: {kayit.retGerekcesi}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${MENTORLUK_DURUM_SINIFLARI[kayit.durum]}`}
                >
                  {MENTORLUK_DURUM_ETIKETLERI[kayit.durum]}
                  {kayit.kararTarihi
                    ? ` · ${tarihSaatYaz(kayit.kararTarihi)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </Kart>
      )}
    </div>
  );
}
