import { Award, ExternalLink, Printer, UserPlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TumunuSecKutusu } from "@/components/belge/TumunuSecKutusu";
import {
  BilgiKutusu, Kart, KartBasligi, SayfaBasligi, SINIF_GIRDI, SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { BELGE_TURU_ETIKETLERI, BELGE_TURLERI } from "@/lib/belge/kurallar";
import { prisma } from "@/lib/db";
import { faaliyetKapsamiCikar, gorunurFaaliyetGetir } from "@/lib/faaliyet/erisim";
import { uygulamaYolu } from "@/lib/ortam";
import { tarihYaz } from "@/lib/tarih";
import { faaliyetRaporuYazabilirMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

export default async function BelgelerSayfasi({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kullanici = await oturumKullanicisiZorunlu();

  const faaliyet = await gorunurFaaliyetGetir(kullanici, Number.parseInt(id, 10));
  if (!faaliyet) notFound();
  if (!faaliyetRaporuYazabilirMi(kullanici, faaliyetKapsamiCikar(faaliyet))) notFound();

  const katilimcilar = await prisma.basvuru.findMany({
    where: { faaliyetId: faaliyet.id, durum: "SECILDI" },
    orderBy: { basvuruTarihi: "asc" },
    select: {
      katilimciId: true,
      katilimci: {
        select: {
          ad: true, soyad: true, sinif: true, brans: true,
          kurum: { select: { ad: true } },
        },
      },
    },
  });

  const tekilBelgeYolu = (tur: string, ad: string) =>
    uygulamaYolu(
      `/panel/faaliyetler/${faaliyet.id}/belge?tur=${tur}&ad=${encodeURIComponent(ad)}`,
    );

  const topluBelgeYolu = (tur: string) =>
    uygulamaYolu(`/panel/faaliyetler/${faaliyet.id}/belge/toplu?tur=${tur}`);

  return (
    <div className="space-y-6">
      <Link
        href={`/panel/faaliyetler/${faaliyet.id}`}
        className="text-sm font-medium text-vurgu-metin underline underline-offset-2"
      >
        ← Faaliyete dön
      </Link>

      <SayfaBasligi
        baslik="Katılım ve teşekkür belgeleri"
        aciklama={`${faaliyet.ad} · ${tarihYaz(faaliyet.tarih)}`}
      />

      <BilgiKutusu cesit="uyari">
        Belgeler yeni sekmede açılır ve tarayıcının <strong>Yazdır</strong> ekranından
        &quot;PDF olarak kaydet&quot; seçeneğiyle indirilir. Toplu belgede tek yazdırma
        işlemiyle tüm kişilerin belgeleri tek bir PDF dosyasında toplanır. Düzgün çıktı
        alabilmek için tarayıcı yazdırma ekranında <strong>&quot;Arka plan grafikleri&quot;</strong> seçeneğinin
        açık olduğundan emin olun.
      </BilgiKutusu>

      <Kart>
        <KartBasligi
          baslik="Katılımcılar"
          aciklama="Faaliyete seçilmiş kişiler. Belge, resmî şablon üzerine basılır."
          Ikon={Award}
        />

        {katilimcilar.length === 0 ? (
          <p className="text-metin-yumusak">
            Bu faaliyete seçilmiş katılımcı yok. Aşağıdaki bölümden ad yazarak
            yine de belge üretebilirsiniz.
          </p>
        ) : (
          <form
            method="get"
            action={uygulamaYolu(`/panel/faaliyetler/${faaliyet.id}/belge/toplu`)}
            target="_blank"
            className="space-y-4"
          >
            {/* Toplu Üretim Kontrol Paneli */}
            <div className="rounded-lg border border-cizgi bg-arka-plan/50 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cizgi">
                <TumunuSecKutusu selector=".katilimci-secimi" />
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-metin-yumusak flex items-center">Hızlı toplu yol:</span>
                  {BELGE_TURLERI.map((tur) => (
                    <a
                      key={tur}
                      href={topluBelgeYolu(tur)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-vurgu-metin hover:underline font-medium"
                    >
                      Tümü için {BELGE_TURU_ETIKETLERI[tur].toLowerCase()}
                    </a>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-metin">Belge türü</span>
                  <select name="tur" defaultValue="KATILIM" className={SINIF_GIRDI}>
                    {BELGE_TURLERI.map((tur) => (
                      <option key={tur} value={tur}>
                        {BELGE_TURU_ETIKETLERI[tur]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-metin">
                    Ortak özel metin <span className="text-metin-yumusak">(isteğe bağlı)</span>
                  </span>
                  <input
                    type="text"
                    name="metin"
                    maxLength={300}
                    placeholder="Tüm seçili belgelere eklenecek özel metin."
                    className={SINIF_GIRDI}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-metin-yumusak">
                  İpucu: Hiçbir kutu işaretlenmezse listedeki tüm katılımcılar için toplu belge üretilir.
                </p>
                <button type="submit" className={SINIF_IKINCIL_BUTON}>
                  <Printer size={16} aria-hidden />
                  Seçilenler için toplu belge üret
                </button>
              </div>
            </div>

            {/* Katılımcı Listesi */}
            <ul className="divide-y divide-cizgi">
              {katilimcilar.map((basvuru) => {
                const adSoyad = `${basvuru.katilimci.ad} ${basvuru.katilimci.soyad}`;
                return (
                  <li
                    key={basvuru.katilimciId}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        name="katilimci"
                        value={basvuru.katilimciId}
                        className="katilimci-secimi h-4 w-4 rounded border-cizgi text-vurgu focus:ring-vurgu"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-metin">{adSoyad}</p>
                        <p className="text-sm text-metin-yumusak">
                          {basvuru.katilimci.sinif ?? basvuru.katilimci.brans ?? "—"}
                          {" · "}
                          {basvuru.katilimci.kurum?.ad ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {BELGE_TURLERI.map((tur) => (
                        <a
                          key={tur}
                          href={tekilBelgeYolu(tur, adSoyad)}
                          target="_blank"
                          rel="noreferrer"
                          className={SINIF_IKINCIL_BUTON}
                        >
                          <ExternalLink size={15} aria-hidden />
                          {BELGE_TURU_ETIKETLERI[tur]}
                        </a>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </form>
        )}
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Listede olmayan biri için"
          aciklama="Konuşmacı, destek veren kurum ya da sistemde kaydı olmayan katılımcı."
          Ikon={UserPlus}
        />
        <form
          method="get"
          action={uygulamaYolu(`/panel/faaliyetler/${faaliyet.id}/belge`)}
          target="_blank"
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-metin">Ad Soyad</span>
              <input
                type="text"
                name="ad"
                required
                maxLength={120}
                placeholder="Prof. Dr. Mehmet Kaya"
                className={SINIF_GIRDI}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-metin">Belge türü</span>
              <select name="tur" defaultValue="TESEKKUR" className={SINIF_GIRDI}>
                {BELGE_TURLERI.map((tur) => (
                  <option key={tur} value={tur}>
                    {BELGE_TURU_ETIKETLERI[tur]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-metin">
              Özel metin <span className="text-metin-yumusak">(isteğe bağlı)</span>
            </span>
            <input
              type="text"
              name="metin"
              maxLength={300}
              placeholder="Atölyenin yürütülmesindeki desteği için."
              className={SINIF_GIRDI}
            />
            <span className="mt-1 block text-sm text-metin-yumusak">
              Boş bırakılırsa belge türüne uygun kalıp cümle kullanılır.
            </span>
          </label>
          <button type="submit" className={SINIF_IKINCIL_BUTON}>
            <ExternalLink size={16} aria-hidden />
            Belgeyi aç
          </button>
        </form>
      </Kart>
    </div>
  );
}
