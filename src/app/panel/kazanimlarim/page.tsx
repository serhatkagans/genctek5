import { Award, CalendarCheck, Lock } from "lucide-react";
import Link from "next/link";
import { KapsamRozeti, KategoriRozeti } from "@/components/FaaliyetRozetleri";
import { KatkiKarti } from "@/components/KatkiKarti";
import { OgretmenKatkiKarti } from "@/components/OgretmenKatkiKarti";
import { UrunlerKarti } from "@/components/OgrenciProfilBolumleri";
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
  const [{ rozetler, ozet, katilimlar }, katki, urunler] = await Promise.all([
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
        aciklama={`${ozet.toplamKatilim} faaliyete katıldın · ${kazanilan.length}/${rozetler.length} katkı nişanı · ${urunler.length} ürün`}
      />

      <KatkiKarti
        kendiMi
        gorevler={katki.gorevler}
        gruplar={katki.gruplar}
        faaliyetler={katki.faaliyetler}
        egitimOgretimYili={egitimOgretimYili}
      />

      <UrunlerKarti kendiMi urunler={urunler} />

      <NisanlarKarti
        rozetler={rozetler}
        bosMesaji="Henüz katkı nişanın yok. İlk faaliyetine katıldığında burası dolmaya başlayacak."
      />

      <KatilimGecmisiKarti
        katilimlar={katilimlar}
        aciklama="Seçildiğin ve tarihi geçmiş faaliyetler burada listelenir."
        bosIcerik={
          <>
            Henüz tamamlanmış bir faaliyetin yok.{" "}
            <Link
              href="/panel/faaliyetler"
              className="font-medium text-vurgu-metin underline underline-offset-2"
            >
              Açık faaliyetlere göz at
            </Link>
            .
          </>
        }
      />

      <BilgiKutusu>
        Bir faaliyete seçildiysen rozet, etkinliğin tarihi geçtikten sonra
        eklenir. İptal edilen faaliyetler sayılmaz.
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
        aciklama={`${katki.faaliyetler.length} faaliyet düzenlediniz · ${katki.aktifDanismanlik} aktif danışmanlık · ${kazanilan.length}/${rozetler.length} katkı nişanı`}
      />

      <OgretmenKatkiKarti
        kendiMi
        gorevler={katki.gorevler}
        aktifDanismanlik={katki.aktifDanismanlik}
        faaliyetler={katki.faaliyetler}
      />

      <UrunlerKarti kendiMi sahip="OGRETMEN" urunler={urunler} />

      <NisanlarKarti
        rozetler={rozetler}
        bosMesaji="Henüz katkı nişanınız yok. İlk faaliyetinizi düzenlediğinizde ya da bir öğrencinin danışmanlığını üstlendiğinizde burası dolmaya başlar."
      />

      {/*
        Öğretmen faaliyete KATILIMCI olarak da başvurabiliyor (eğitici
        etkinliklerin bir kısmı zaten öğretmene yönelik). Bu liste onun kendi
        katılım geçmişidir; düzenlediği faaliyetler yukarıdaki katkı kartında.
      */}
      <KatilimGecmisiKarti
        katilimlar={katilimlar}
        aciklama={`${ozet.toplamKatilim} etkinlik · başvurunuzun kabul edildiği ve tarihi geçmiş faaliyetler.`}
        bosIcerik={
          <>
            Katılımcı olarak yer aldığınız tamamlanmış bir faaliyet yok.{" "}
            <Link
              href="/panel/faaliyetler"
              className="font-medium text-vurgu-metin underline underline-offset-2"
            >
              Başvuruya açık faaliyetlere göz atın
            </Link>
            .
          </>
        }
      />

      <BilgiKutusu>
        Nişanlar katılım ve düzenleme geçmişinden hesaplanır; elle verilmez.
        İptal edilen faaliyetler ve onay bekleyen öneriler sayılmaz.
      </BilgiKutusu>
    </div>
  );
}

/** Kazanılan ve yolda olan nişanlar — iki rolde de aynı görünür. */
function NisanlarKarti({
  rozetler,
  bosMesaji,
}: {
  rozetler: RozetDurumu[];
  bosMesaji: string;
}) {
  const kazanilan = rozetler.filter((rozet) => rozet.kazanildiMi);
  const bekleyen = rozetler.filter((rozet) => !rozet.kazanildiMi);

  return (
    <Kart>
      <KartBasligi
        baslik="Katkı nişanlarım"
        aciklama="Geçmişten otomatik hesaplanır; başvuru gerektirmez."
        Ikon={Award}
      />

      {kazanilan.length === 0 ? (
        <p className="text-metin-yumusak">{bosMesaji}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kazanilan.map((rozet) => (
            <li
              key={rozet.kod}
              className="rounded-kart border border-olumlu-cizgi bg-olumlu-zemin p-4"
            >
              <p className="flex items-center gap-2 font-semibold text-olumlu-metin">
                <Award size={16} aria-hidden />
                {rozet.ad}
              </p>
              <p className="mt-1 text-sm text-olumlu-metin">{rozet.aciklama}</p>
            </li>
          ))}
        </ul>
      )}

      {bekleyen.length > 0 && (
        <>
          <h3 className="mt-6 mb-3 text-sm font-semibold text-baslik">
            Yolda olanlar
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bekleyen.map((rozet) => (
              <li
                key={rozet.kod}
                className="rounded-kart border border-cizgi bg-zemin p-4"
              >
                <p className="flex items-center gap-2 font-medium text-metin">
                  <Lock size={15} aria-hidden />
                  {rozet.ad}
                </p>
                <p className="mt-1 text-sm text-metin-yumusak">
                  {rozet.aciklama}
                </p>
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-cizgi"
                  role="progressbar"
                  aria-valuenow={rozet.ilerleme}
                  aria-valuemin={0}
                  aria-valuemax={rozet.hedef}
                  aria-label={`${rozet.ad} ilerlemesi`}
                >
                  <div
                    className="h-full rounded-full bg-[var(--renk-birincil)]"
                    style={{
                      width: `${(rozet.ilerleme / rozet.hedef) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-metin-yumusak">
                  {rozet.ilerleme} / {rozet.hedef}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Kart>
  );
}

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
        baslik="Katıldığım faaliyetler"
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
                href={`/panel/faaliyetler/${katilim.faaliyetId}`}
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
