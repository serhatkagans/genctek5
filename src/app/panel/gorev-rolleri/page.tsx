import { BadgeCheck, ShieldQuestion, UserCog } from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import type { GorevRolKodu } from "@/generated/prisma/enums";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { GOREV_ROL_ETIKETLERI } from "@/lib/yetki/etiketler";
import {
  danismanKurumKodu,
  ilceTemsilcisiAtayabilirMi,
  ilTemsilcisiAtayabilirMi,
  koordinatorIlKodu,
  okulTemsilcisiAtayabilirMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { ogrenciKapsamFiltresi } from "@/lib/yetki/kapsam";
import { gorevRoluAtaEylemi, gorevRoluKaldirEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Öğrenci görev rolleri ekranı.
 *
 * Kimlik alanları (ad, okul, sınıf) buradan DA düzenlenemez — onlar e-Okul
 * kaynaklıdır. Yetkilinin değiştirebildiği tek şey dönem bazlı görev rolüdür:
 * il koordinatörü kendi ilinde İl Temsilcisi, danışman öğretmen kendi okulunda
 * Okul Temsilcisi belirler.
 *
 * Aday listesi merkezi kapsam filtresinden gelir; bir koordinatör başka ilin,
 * bir danışman başka okulun öğrencisini bu ekranda hiç göremez.
 */

const SINIF_ATA_BUTON =
  "rounded-md border border-cizgi px-3 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin";

export default async function GorevRolleriSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; durum?: string }>;
}) {
  const { hata, durum } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  const ilKodu = koordinatorIlKodu(kullanici);
  const kurumKodu = danismanKurumKodu(kullanici);
  const merkezMi = projeYoneticisiMi(kullanici);

  const ilTemsilcisiAtayabilir =
    merkezMi || (ilKodu !== null && ilTemsilcisiAtayabilirMi(kullanici, ilKodu));
  const okulTemsilcisiAtayabilir =
    merkezMi ||
    (kurumKodu !== null && okulTemsilcisiAtayabilirMi(kullanici, kurumKodu));

  if (!ilTemsilcisiAtayabilir && !okulTemsilcisiAtayabilir) {
    return (
      <Kart>
        <KartBasligi
          baslik="Görev rolleri"
          aciklama="Görev rolü atama yetkiniz yok."
        />
      </Kart>
    );
  }

  const ogrenciler = await prisma.kullanici.findMany({
    where: ogrenciKapsamFiltresi(kullanici),
    orderBy: [{ ad: "asc" }, { soyad: "asc" }],
    select: {
      id: true,
      ad: true,
      soyad: true,
      sinif: true,
      ilKodu: true,
      ilceKodu: true,
      kurumKodu: true,
      kurum: { select: { ad: true } },
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      gorevRolleri: {
        where: { egitimOgretimYili: kullanici.egitimOgretimYili },
        select: { id: true, rolKodu: true },
      },
    },
  });

  const atanabilirRoller = (ogrenci: (typeof ogrenciler)[number]) => {
    const roller: GorevRolKodu[] = [];
    if (
      ogrenci.ilKodu &&
      ilTemsilcisiAtayabilirMi(kullanici, ogrenci.ilKodu) &&
      !ogrenci.gorevRolleri.some((rol) => rol.rolKodu === "IL_TEMSILCISI")
    ) {
      roller.push("IL_TEMSILCISI");
    }
    /*
     * İlçe temsilciliği ancak öğrencinin ilçesi BİLİNİYORSA teklif edilir.
     * e-Okul kaydında ilçesi boş olan öğrenciye bu görev verilemez; kapsam
     * sütunu boş kalacağı için veritabanı kısıtı da reddederdi.
     */
    if (
      ogrenci.ilKodu &&
      ogrenci.ilceKodu &&
      ilceTemsilcisiAtayabilirMi(kullanici, ogrenci.ilKodu) &&
      !ogrenci.gorevRolleri.some((rol) => rol.rolKodu === "ILCE_TEMSILCISI")
    ) {
      roller.push("ILCE_TEMSILCISI");
    }
    if (
      ogrenci.kurumKodu &&
      okulTemsilcisiAtayabilirMi(kullanici, ogrenci.kurumKodu) &&
      !ogrenci.gorevRolleri.some((rol) => rol.rolKodu === "OKUL_TEMSILCISI")
    ) {
      roller.push("OKUL_TEMSILCISI");
    }
    return roller;
  };

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Görev rolleri"
        aciklama={`${kullanici.egitimOgretimYili} dönemi · ${ogrenciler.length} öğrenci`}
      />

      {durum === "atandi" && (
        <BilgiKutusu cesit="olumlu">Görev rolü atandı.</BilgiKutusu>
      )}
      {durum === "kaldirildi" && (
        <BilgiKutusu cesit="olumlu">Görev rolü kaldırıldı.</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <BilgiKutusu>
        <span className="inline-flex items-start gap-2">
          <ShieldQuestion size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Görev rolleri <strong>hiçbir ek görüntüleme yetkisi vermez</strong>;
            dönem bazlı bir görev etiketidir. Kimlik ve okul bilgileri e-Okul
            kaynaklıdır ve bu ekrandan da değiştirilemez. Her dönem bir ilde tek
            İl Temsilcisi, bir ilçede tek İlçe Temsilcisi, bir okulda tek Okul
            Temsilcisi bulunur. İlçe temsilcisini de ilin koordinatörü belirler;
            ilçe düzeyinde ayrı bir görevli yoktur.
          </span>
        </span>
      </BilgiKutusu>

      {ogrenciler.length === 0 ? (
        <Kart className="text-metin-yumusak">
          Kapsamınızda görev rolü atanabilecek öğrenci yok.
        </Kart>
      ) : (
        <Kart>
          <KartBasligi baslik="Öğrenciler" Ikon={UserCog} />
          <ul className="space-y-3">
            {ogrenciler.map((ogrenci) => (
              <li
                key={ogrenci.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-kart border border-cizgi p-4"
              >
                <div>
                  <p className="font-medium text-metin">
                    <Link
                      href={`/panel/ogrenciler/${ogrenci.id}`}
                      className="transition hover:text-vurgu-metin hover:underline"
                    >
                      {ogrenci.ad} {ogrenci.soyad}
                    </Link>
                  </p>
                  <p className="text-sm text-metin-yumusak">
                    {[
                      ogrenci.sinif,
                      ogrenci.kurum?.ad,
                      ogrenci.ilce?.ad,
                      ogrenci.il?.ad,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {ogrenci.gorevRolleri.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ogrenci.gorevRolleri.map((gorev) => (
                        <span
                          key={gorev.id}
                          className="inline-flex items-center gap-1 rounded-full bg-rol-ogrenci-zemin px-2.5 py-0.5 text-xs font-medium text-rol-ogrenci-metin"
                        >
                          <BadgeCheck size={13} aria-hidden />
                          {GOREV_ROL_ETIKETLERI[gorev.rolKodu]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {atanabilirRoller(ogrenci).map((rolKodu) => (
                    <form key={rolKodu} action={gorevRoluAtaEylemi}>
                      <input
                        type="hidden"
                        name="ogrenciId"
                        value={ogrenci.id}
                      />
                      <input type="hidden" name="rolKodu" value={rolKodu} />
                      <button type="submit" className={SINIF_ATA_BUTON}>
                        {GOREV_ROL_ETIKETLERI[rolKodu]} yap
                      </button>
                    </form>
                  ))}
                  {ogrenci.gorevRolleri.map((gorev) => (
                    <form key={gorev.id} action={gorevRoluKaldirEylemi}>
                      <input type="hidden" name="gorevId" value={gorev.id} />
                      <button type="submit" className={SINIF_IKINCIL_BUTON}>
                        {GOREV_ROL_ETIKETLERI[gorev.rolKodu]} görevini kaldır
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Kart>
      )}
    </div>
  );
}
