import { notFound } from "next/navigation";
import { BelgeKagidi } from "@/components/belge/BelgeKagidi";
import { BelgeStilleri } from "@/components/belge/BelgeStilleri";
import { YazdirButonu } from "@/components/YazdirButonu";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  aliciAdiniCoz,
  belgeMetniUret,
  belgeTuruMu,
  imzaBilgisiniCoz,
  imzaUnvaniOner,
} from "@/lib/belge/kurallar";
import { faaliyetKapsamiCikar, gorunurFaaliyetGetir } from "@/lib/faaliyet/erisim";
import { uygulamaYolu } from "@/lib/ortam";
import { tarihYaz } from "@/lib/tarih";
import { faaliyetRaporuYazabilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

export default async function BelgeSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tur?: string;
    ad?: string;
    metin?: string;
    imzaAd?: string;
    imzaUnvan?: string;
  }>;
}) {
  const [{ id }, { tur, ad, metin, imzaAd, imzaUnvan }] = await Promise.all([
    params,
    searchParams,
  ]);
  const kullanici = await oturumKullanicisiZorunlu();

  const faaliyet = await gorunurFaaliyetGetir(kullanici, Number.parseInt(id, 10));
  if (!faaliyet) notFound();
  if (!faaliyetRaporuYazabilirMi(kullanici, faaliyetKapsamiCikar(faaliyet))) notFound();
  if (!tur || !belgeTuruMu(tur)) notFound();

  const alici = aliciAdiniCoz(ad ?? "");
  if (!alici.olurMu) notFound();

  const belge = belgeMetniUret({
    tur,
    adSoyad: alici.adSoyad,
    faaliyetAdi: faaliyet.ad,
    tarihMetni: tarihYaz(faaliyet.tarih),
    ozelMetin: metin ?? null,
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "FAALIYET",
    hedefId: faaliyet.id,
    detay: `${belge.baslik} üretildi: ${belge.adSoyad}`,
  });

  /*
   * İMZA ARTIK OTURUM KİŞİSİNDEN GELMİYOR (J5 · 6 Ağustos 2026). Belgeyi
   * hazırlayan öğretmen ile imzalayan makam aynı kişi değil: okul içi
   * etkinlikte okul müdürü, il etkinliğinde il millî eğitim müdürü imzalar.
   * Unvan kapsamdan türetiliyor, ad belge üretilirken elle giriliyor — okul
   * müdürünün adı sistemde tutulmuyor ve e-Okul'dan da gelmiyor.
   *
   * Ad boşsa belge ÜRETİLMEZ: imzasız bir katılım belgesi resmî olarak işe
   * yaramaz ve sessizce üretmek, farkına varılmadan imzasız belge dağıtılmasına
   * yol açardı.
   */
  const imza = imzaBilgisiniCoz({
    adSoyad: imzaAd ?? "",
    unvan: imzaUnvan ?? "",
    varsayilanUnvan:
      imzaUnvaniOner(faaliyet.kapsam) ?? faaliyet.duzenleyenBirim,
  });
  if (!imza.olurMu) notFound();

  return (
    <div className="belge-sayfa-kapsayici">
      <BelgeStilleri />

      <div className="arac-cubugu">
        <a href={uygulamaYolu(`/panel/etkinlikler/${faaliyet.id}/belgeler`)} className="arac">
          ← Belgeler
        </a>
        <YazdirButonu className="arac arac-birincil" />
      </div>

      <div className="belge-listesi">
        <BelgeKagidi
          belge={belge}
          imzaAdSoyad={imza.adSoyad}
          imzaBirim={imza.unvan}
        />
      </div>
    </div>
  );
}
