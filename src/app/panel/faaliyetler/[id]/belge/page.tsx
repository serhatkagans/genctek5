import { notFound } from "next/navigation";
import { BelgeKagidi } from "@/components/belge/BelgeKagidi";
import { BelgeStilleri } from "@/components/belge/BelgeStilleri";
import { YazdirButonu } from "@/components/YazdirButonu";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { aliciAdiniCoz, belgeMetniUret, belgeTuruMu } from "@/lib/belge/kurallar";
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
  searchParams: Promise<{ tur?: string; ad?: string; metin?: string }>;
}) {
  const [{ id }, { tur, ad, metin }] = await Promise.all([params, searchParams]);
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

  const imzaAdSoyad = `${faaliyet.duzenleyen.ad} ${faaliyet.duzenleyen.soyad}`;

  return (
    <div className="belge-sayfa-kapsayici">
      <BelgeStilleri />

      <div className="arac-cubugu">
        <a href={uygulamaYolu(`/panel/faaliyetler/${faaliyet.id}/belgeler`)} className="arac">
          ← Belgeler
        </a>
        <YazdirButonu className="arac arac-birincil" />
      </div>

      <div className="belge-listesi">
        <BelgeKagidi
          belge={belge}
          imzaAdSoyad={imzaAdSoyad}
          imzaBirim={faaliyet.duzenleyenBirim}
        />
      </div>
    </div>
  );
}
