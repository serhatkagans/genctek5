import { ScrollText, Search } from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import type { LogHedefTip, LogIslemi } from "@/generated/prisma/enums";
import {
  erisimLoguSayfasiGetir,
  SAYFA_BOYUTU,
} from "@/lib/rapor/erisim-logu";
import { gunBasi, gunSonu, girdiTarihi, tarihSaatYaz } from "@/lib/tarih";
import {
  LOG_HEDEF_ETIKETLERI,
  LOG_ISLEM_ETIKETLERI,
} from "@/lib/yetki/etiketler";
import { erisimLoglariniGorebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

function tekil(deger: string | string[] | undefined): string | null {
  if (Array.isArray(deger)) return deger[0] ?? null;
  return deger ?? null;
}

/**
 * Erişim kayıtları — "kim, hangi kaydı, ne zaman gördü veya değiştirdi".
 *
 * KVKK denetiminin dayanağı budur (domain-rules.md Bölüm 10). Ekranın kendisi
 * de loglanır: denetim defterine bakan kişi de deftere geçer.
 */
export default async function ErisimLoglariSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametreler = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  if (!erisimLoglariniGorebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Erişim kayıtları"
          aciklama="Bu ekran yalnızca proje yöneticisine açıktır."
        />
      </Kart>
    );
  }

  const ara = tekil(parametreler.ara);
  const islem = tekil(parametreler.islem) as LogIslemi | null;
  const hedefTip = tekil(parametreler.hedefTip) as LogHedefTip | null;
  const baslangicMetni = tekil(parametreler.baslangic);
  const bitisMetni = tekil(parametreler.bitis);
  const sayfa = Number.parseInt(tekil(parametreler.sayfa) ?? "1", 10);

  const sonuc = await erisimLoguSayfasiGetir({
    ara,
    islem: islem && islem in LOG_ISLEM_ETIKETLERI ? islem : null,
    hedefTip: hedefTip && hedefTip in LOG_HEDEF_ETIKETLERI ? hedefTip : null,
    baslangic: gunBasi(baslangicMetni),
    bitis: gunSonu(bitisMetni),
    sayfa: Number.isFinite(sayfa) ? sayfa : 1,
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "ERISIM_LOGU",
    hedefId: "liste",
    detay: `Erişim kayıtları görüntülendi (sayfa ${sonuc.sayfa}, ${sonuc.toplam} kayıt)`,
  });

  // Sayfa bağlantıları mevcut filtreleri korur.
  const sorgu = (yeniSayfa: number) => {
    const parcalar = new URLSearchParams();
    if (ara) parcalar.set("ara", ara);
    if (islem) parcalar.set("islem", islem);
    if (hedefTip) parcalar.set("hedefTip", hedefTip);
    if (baslangicMetni) parcalar.set("baslangic", baslangicMetni);
    if (bitisMetni) parcalar.set("bitis", bitisMetni);
    parcalar.set("sayfa", String(yeniSayfa));
    return `/panel/erisim-loglari?${parcalar.toString()}`;
  };

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Erişim kayıtları"
        aciklama={`${sonuc.toplam} kayıt · her veri görüntüleme ve değişiklik işlemi buraya yazılır`}
      />

      <BilgiKutusu cesit="bilgi">
        Kayıtlar elle silinemez veya düzenlenemez; saklama süresi dolduğunda
        (varsayılan 24 ay) bakım işi tarafından toplu olarak temizlenir.
      </BilgiKutusu>

      <Kart>
        <KartBasligi baslik="Filtreler" Ikon={Search} />
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="text-sm font-medium text-metin">
              İşlemi yapan
            </span>
            <input
              type="search"
              name="ara"
              defaultValue={ara ?? ""}
              placeholder="Ad veya soyad"
              className={SINIF_GIRDI}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin">İşlem</span>
            <select name="islem" defaultValue={islem ?? ""} className={SINIF_GIRDI}>
              <option value="">Tümü</option>
              {Object.entries(LOG_ISLEM_ETIKETLERI).map(([kod, etiket]) => (
                <option key={kod} value={kod}>
                  {etiket}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin">Kayıt türü</span>
            <select
              name="hedefTip"
              defaultValue={hedefTip ?? ""}
              className={SINIF_GIRDI}
            >
              <option value="">Tümü</option>
              {Object.entries(LOG_HEDEF_ETIKETLERI).map(([kod, etiket]) => (
                <option key={kod} value={kod}>
                  {etiket}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin">Başlangıç</span>
            <input
              type="date"
              name="baslangic"
              defaultValue={baslangicMetni ?? ""}
              max={girdiTarihi(new Date())}
              className={SINIF_GIRDI}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin">Bitiş</span>
            <input
              type="date"
              name="bitis"
              defaultValue={bitisMetni ?? ""}
              max={girdiTarihi(new Date())}
              className={SINIF_GIRDI}
            />
          </label>
          <div className="flex items-end gap-3 lg:col-span-5">
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              Filtrele
            </button>
            <Link
              href="/panel/erisim-loglari"
              className="text-sm text-metin-yumusak underline underline-offset-2"
            >
              Filtreleri temizle
            </Link>
          </div>
        </form>
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Kayıtlar"
          aciklama={`Sayfa ${sonuc.sayfa} / ${sonuc.sonSayfa} · sayfa başına ${SAYFA_BOYUTU} kayıt`}
          Ikon={ScrollText}
        />

        {sonuc.kayitlar.length === 0 ? (
          <p className="text-sm text-metin-yumusak">
            Bu filtrelerle kayıt bulunamadı.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-cizgi text-metin-yumusak">
                <tr>
                  <th className="py-2 pr-4 font-medium">Tarih</th>
                  <th className="py-2 pr-4 font-medium">İşlemi yapan</th>
                  <th className="py-2 pr-4 font-medium">İşlem</th>
                  <th className="py-2 pr-4 font-medium">Kayıt</th>
                  <th className="py-2 pr-4 font-medium">Ayrıntı</th>
                  <th className="py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {sonuc.kayitlar.map((kayit) => (
                  <tr key={kayit.id} className="border-b border-cizgi/60">
                    <td className="whitespace-nowrap py-2 pr-4 text-metin-yumusak">
                      {tarihSaatYaz(kayit.tarih)}
                    </td>
                    <td className="py-2 pr-4 text-metin">
                      {kayit.kullanici.ad} {kayit.kullanici.soyad}
                    </td>
                    <td className="py-2 pr-4 text-metin">
                      {LOG_ISLEM_ETIKETLERI[kayit.islem]}
                    </td>
                    <td className="py-2 pr-4 text-metin">
                      {LOG_HEDEF_ETIKETLERI[kayit.hedefTip]}
                      <span className="text-metin-yumusak"> #{kayit.hedefId}</span>
                    </td>
                    <td className="py-2 pr-4 text-metin-yumusak">
                      {kayit.detay ?? "—"}
                    </td>
                    <td className="whitespace-nowrap py-2 text-metin-yumusak">
                      {kayit.ipAdresi ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sonuc.sonSayfa > 1 && (
          <div className="mt-5 flex items-center gap-3 text-sm">
            {sonuc.sayfa > 1 && (
              <Link
                href={sorgu(sonuc.sayfa - 1)}
                className="rounded-md border border-cizgi px-3 py-1.5 text-metin transition hover:bg-zemin"
              >
                Önceki
              </Link>
            )}
            {sonuc.sayfa < sonuc.sonSayfa && (
              <Link
                href={sorgu(sonuc.sayfa + 1)}
                className="rounded-md border border-cizgi px-3 py-1.5 text-metin transition hover:bg-zemin"
              >
                Sonraki
              </Link>
            )}
          </div>
        )}
      </Kart>
    </div>
  );
}
