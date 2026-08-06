import { Award, CalendarCheck, Lock } from "lucide-react";
import Link from "next/link";
import { KapsamRozeti, KategoriRozeti } from "@/components/FaaliyetRozetleri";
import { KatkiKarti } from "@/components/KatkiKarti";
import { OgretmenKatkiKarti } from "@/components/OgretmenKatkiKarti";
import { SeferlerimKarti, UrunlerKarti } from "@/components/OgrenciProfilBolumleri";
import { BilgiKutusu, Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  type KatilimGecmisi,
  kazanimlariGetir,
  ogretmenKazanimlariGetir,
} from "@/lib/kazanim/getir";
import type { RozetDurumu } from "@/lib/kazanim/rozetler";
import { katkiVerisiGetir } from "@/lib/ogrenci/katki";
import { ogretmenKatkiVerisiGetir } from "@/lib/ogretmen/katki";
import { tarihYaz } from "@/lib/tarih";
import { ogrenciMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * Katkılarım — kişinin katkı kartı, nişanları, ürünleri ve katılım geçmişi.
 *
 * Ekran yalnızca KENDİ verisini gösterir; başkasının katkısına buradan bakmanın
 * bir yolu yoktur, bu yüzden ayrıca kapsam filtresi kurulmaz — sorgular
 * oturumdaki kişiye sabitlenmiştir.
 *
 * Öğretmen ve öğrenci AYNI adresi kullanır ama farklı kartlar görür: ikisinin
 * katkısı farklı tablolardan doğuyor (öğrencide temsilcilik ve çalışma grubu,
 * öğretmende görev geçmişi ve danışmanlık). Ayrı iki adres açmak, menüde aynı
 * işi yapan iki başlık ve iki kopya "katılım geçmişi" bölümü demekti.
 */
export default async function KazanimlarimSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  return ogrenciMi(kullanici) ? (
    <OgrenciKatkilari kullaniciId={kullanici.id} egitimOgretimYili={kullanici.egitimOgretimYili} />
  ) : (
    <OgretmenKatkilari kullaniciId={kullanici.id} />
  );
}

async function OgrenciKatkilari({
  kullaniciId,
  egitimOgretimYili,
}: {
  kullaniciId: number;
  egitimOgretimYili: string;
}) {
  const [{ rozetler, seferler, ozet, katilimlar }, katki, urunler] =
    await Promise.all([
      kazanimlariGetir(kullaniciId),
      katkiVerisiGetir(kullaniciId),
      prisma.kullaniciKazanim.findMany({
        where: { kullaniciId, tip: "URUN" },
        orderBy: [{ tarih: "desc" }, { olusturmaTarihi: "desc" }],
      }),
    ]);
  const kazanilan = rozetler.filter((rozet) => rozet.kazanildiMi);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Katkılarım"
        aciklama={`${ozet.toplamKatilim} etkinliğe katıldın · ${kazanilan.length}/${rozetler.length} katkı nişanı · ${urunler.length} ürün`}
      />

      <KatkiKarti
        kendiMi
        gorevler={katki.gorevler}
        gruplar={katki.gruplar}
        faaliyetler={katki.faaliyetler}
        egitimOgretimYili={egitimOgretimYili}
      />

      <UrunlerKarti kendiMi urunler={urunler} />

      <SeferlerimKarti
        rozetler={rozetler}
        seferler={seferler}
        bosMesaji="Henüz seferin yok. İlk etkinliğine katıldığında burası dolmaya başlayacak."
      />

      <KatilimGecmisiKarti
        katilimlar={katilimlar}
        aciklama="Seçildiğin ve tarihi geçmiş etkinlikler burada listelenir."
        bosIcerik={
          <>
            Henüz tamamlanmış bir faaliyetin yok.{" "}
            <Link
              href="/panel/etkinlikler"
              className="font-medium text-vurgu-metin underline underline-offset-2"
            >
              Açık etkinliklere göz at
            </Link>
            .
          </>
        }
      />

      <BilgiKutusu>
        Bir etkinliğe seçildiysen rozet, etkinliğin tarihi geçtikten sonra
        eklenir. İptal edilen etkinlikler sayılmaz.
      </BilgiKutusu>
    </div>
  );
}

async function OgretmenKatkilari({ kullaniciId }: { kullaniciId: number }) {
  const [{ rozetler, ozet, katilimlar }, katki, urunler] = await Promise.all([
    ogretmenKazanimlariGetir(kullaniciId),
    ogretmenKatkiVerisiGetir(kullaniciId),
    prisma.kullaniciKazanim.findMany({
      where: { kullaniciId, tip: "URUN" },
      orderBy: [{ tarih: "desc" }, { olusturmaTarihi: "desc" }],
    }),
  ]);
  const kazanilan = rozetler.filter((rozet) => rozet.kazanildiMi);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Katkılarım"
        aciklama={`${katki.faaliyetler.length} etkinlik düzenlediniz · ${katki.aktifDanismanlik} aktif danışmanlık · ${kazanilan.length}/${rozetler.length} katkı nişanı`}
      />

      <OgretmenKatkiKarti
        kendiMi
        gorevler={katki.gorevler}
        aktifDanismanlik={katki.aktifDanismanlik}
        faaliyetler={katki.faaliyetler}
      />

      <UrunlerKarti kendiMi sahip="OGRETMEN" urunler={urunler} />

      <SeferlerimKarti
        rozetler={rozetler}
        bosMesaji="Henüz katkı nişanınız yok. İlk etkinliğinizi düzenlediğinizde ya da bir öğrencinin danışmanlığını üstlendiğinizde burası dolmaya başlar."
      />

      {/*
        Öğretmen faaliyete KATILIMCI olarak da başvurabiliyor (eğitici
        etkinliklerin bir kısmı zaten öğretmene yönelik). Bu liste onun kendi
        katılım geçmişidir; düzenlediği faaliyetler yukarıdaki katkı kartında.
      */}
      <KatilimGecmisiKarti
        katilimlar={katilimlar}
        aciklama={`${ozet.toplamKatilim} etkinlik · başvurunuzun kabul edildiği ve tarihi geçmiş etkinlikler.`}
        bosIcerik={
          <>
            Katılımcı olarak yer aldığınız tamamlanmış bir faaliyet yok.{" "}
            <Link
              href="/panel/etkinlikler"
              className="font-medium text-vurgu-metin underline underline-offset-2"
            >
              Başvuruya açık etkinliklere göz atın
            </Link>
            .
          </>
        }
      />

      <BilgiKutusu>
        Nişanlar katılım ve düzenleme geçmişinden hesaplanır; elle verilmez.
        İptal edilen etkinlikler ve onay bekleyen öneriler sayılmaz.
      </BilgiKutusu>
    </div>
  );
}

/** Kazanılan ve yolda olan nişanlar — iki rolde de aynı görünür. */
type KatilimSatiri = KatilimGecmisi["katilimlar"][number];

/** Katıldığı faaliyetler — başvuru geçmişinden türetilir, elle girilmez. */
function KatilimGecmisiKarti({
  katilimlar,
  aciklama,
  bosIcerik,
}: {
  katilimlar: KatilimSatiri[];
  aciklama: string;
  bosIcerik: React.ReactNode;
}) {
  return (
    <Kart>
      <KartBasligi
        baslik="Katıldığım etkinlikler"
        aciklama={aciklama}
        Ikon={CalendarCheck}
      />
      {katilimlar.length === 0 ? (
        <p className="text-metin-yumusak">{bosIcerik}</p>
      ) : (
        <ul className="divide-y divide-cizgi">
          {katilimlar.map((katilim) => (
            <li key={katilim.faaliyetId} className="py-3 first:pt-0">
              <Link
                href={`/panel/etkinlikler/${katilim.faaliyetId}`}
                className="font-medium text-metin transition hover:text-vurgu-metin"
              >
                {katilim.ad}
              </Link>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-sm text-metin-yumusak">
                  {tarihYaz(katilim.tarih)}
                </span>
                <KategoriRozeti kategori={katilim.etkinlikKategorisi} />
                <KapsamRozeti kapsam={katilim.kapsam} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Kart>
  );
}
