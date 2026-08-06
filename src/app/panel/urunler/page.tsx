import { Eye, ExternalLink, Info, Package, Users } from "lucide-react";
import Link from "next/link";
import { BilgiKutusu, Kart, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  MARKET_SUZGECLERI,
  sahipKumesi,
  sayiYaz,
  suzgeciCoz,
  suzgecTanimi,
  urunleriSuz,
} from "@/lib/market/kurallar";
import { tarihYaz } from "@/lib/tarih";

export const dynamic = "force-dynamic";

/**
 * GençTek Market — "Ürünlerim" sekmesi (I).
 *
 * Vitrindeki her ürün `kullanici_kazanim` · tip=URUN kaydıdır; markete
 * `markette_paylasilsin` bayrağıyla çıkar. Ayrı bir market tablosu yok
 * (gerekçe: lib/market/kurallar.ts).
 *
 * ÜRÜN EKLEME EKRANI YOK — istekteki not bunu söylüyor: "Ürün Ekle:
 * 'Profilden ekleyebilirsiniz' notu girilecek". Ekleme profilde, market
 * yalnızca gösteriyor. İki yerden eklenebilseydi aynı formun iki kopyası
 * olurdu.
 */
export default async function MarketSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ suzgec?: string }>;
}) {
  const { suzgec: hamSuzgec } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();
  const suzgec = suzgeciCoz(hamSuzgec);

  /*
   * SORGU GENİŞ, SÜZME KODDA. Paylaşılanlar + kişinin kendi ürünleri tek
   * seferde çekiliyor; hangi kümeye girdiği rol listesine bakılarak kodda
   * kararlaştırılıyor (bkz. sahipKumesi). Rol koşulunu SQL'e gömmek, aynı
   * kararı iki yerde (sorgu + rozet yazısı) tutmak olurdu.
   */
  const kayitlar = await prisma.kullaniciKazanim.findMany({
    where: {
      tip: "URUN",
      OR: [{ markettePaylasilsin: true }, { kullaniciId: kullanici.id }],
    },
    select: {
      id: true,
      baslik: true,
      aciklama: true,
      gelistirenEkip: true,
      tarih: true,
      olusturmaTarihi: true,
      markettePaylasilsin: true,
      goruntulenmeSayisi: true,
      baglantiTiklamasi: true,
      kullaniciId: true,
      kullanici: {
        select: {
          ad: true,
          soyad: true,
          roller: { where: { bitisTarihi: null }, select: { rolKodu: true } },
        },
      },
      _count: { select: { ekler: true, baglantilar: true } },
    },
    orderBy: { olusturmaTarihi: "desc" },
  });

  const urunler = kayitlar.map((kayit) => ({
    ...kayit,
    sahipKullaniciId: kayit.kullaniciId,
    sahipKumesi: sahipKumesi(kayit.kullanici.roller.map((r) => r.rolKodu)),
  }));

  const gosterilecek = urunleriSuz(urunler, suzgec, kullanici.id);
  const aktifTanim = suzgecTanimi(suzgec);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Ürünlerim · GençTek Market"
        aciklama="GençTek ekosisteminde üretilen ürünler."
      />

      {/*
        "ÜRÜN EKLE" DÜĞMESİ DEĞİL, NOT. İstekte yazan bu: ekleme profilde
        yapılıyor. Düğme konsaydı market ayrı bir ekleme yolu gibi görünür,
        tıklayan yine profile giderdi.
      */}
      <BilgiKutusu>
        <span className="flex flex-wrap items-center gap-1.5">
          <Info size={15} aria-hidden />
          <strong>Ürün eklemek için:</strong> ürünlerinizi profilden
          ekleyebilirsiniz.
          {/*
            ADRESTEKİ İKİ PARÇA DA GEREKLİ:
              · `?tur=URUN` → "Yeni kayıt ekle" formunu Ürünlerim sekmesinde açar
                (form sekmeli ve varsayılan sekme ürün değil).
              · `#kayit-ekle` → profil uzun bir sayfa; çıpasız bağlantı kişiyi
                tepeye bırakıyor ve form ekranda görünmüyordu.
            Çıpanın adı profildeki karttan gelir (`id="kayit-ekle"`) — burada
            uydurulmuş bir ad kullanılırsa bağlantı sessizce tepeye düşer.
          */}
          <Link
            href="/panel/profil?tur=URUN#kayit-ekle"
            className="font-medium text-vurgu-metin underline underline-offset-2"
          >
            Ürün ekleme formuna git
          </Link>
          <span className="text-metin-yumusak">
            — eklerken &quot;Bu ürünü markette paylaş&quot; kutusunu işaretlerseniz
            burada görünür.
          </span>
        </span>
      </BilgiKutusu>

      <nav aria-label="Ürün süzgeçleri" className="flex flex-wrap gap-2">
        {MARKET_SUZGECLERI.map((tanim) =>
          tanim.tanimBekliyorMu ? (
            /*
              Tanımı beklenen süzgeç bağlantı DEĞİL: tıklanabilir olsaydı
              kullanıcı boş bir listeye düşer ve bunu bir hata sanardı.
            */
            <span
              key={tanim.kod}
              title={tanim.aciklama}
              className="cursor-not-allowed rounded-full border border-dashed border-cizgi px-4 py-1.5 text-sm text-metin-yumusak"
            >
              {tanim.etiket}
              <span className="ml-1.5 text-xs">(tanım bekleniyor)</span>
            </span>
          ) : (
            <Link
              key={tanim.kod}
              href={`/panel/urunler?suzgec=${tanim.kod}`}
              aria-current={tanim.kod === suzgec ? "page" : undefined}
              className={
                tanim.kod === suzgec
                  ? "rounded-full bg-birincil px-4 py-1.5 text-sm font-semibold text-birincil-metin"
                  : "rounded-full border border-cizgi px-4 py-1.5 text-sm text-metin transition hover:bg-zemin"
              }
            >
              {tanim.etiket}
            </Link>
          ),
        )}
      </nav>

      {aktifTanim && (
        <p className="text-sm text-metin-yumusak">{aktifTanim.aciklama}</p>
      )}

      {gosterilecek.length === 0 ? (
        <Kart>
          <p className="text-metin">
            {suzgec === "BENIM"
              ? "Henüz ürün eklemedin."
              : "Bu başlıkta henüz paylaşılan ürün yok."}
          </p>
          <p className="mt-2 text-sm text-metin-yumusak">
            Ürünler profilden eklenir; eklerken &quot;Bu ürünü markette
            paylaş&quot; kutusu işaretlenirse markette görünür.
          </p>
        </Kart>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {gosterilecek.map((urun) => (
            <li key={urun.id}>
              <Kart className="flex h-full flex-col gap-3">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-baslik">
                      <Link
                        href={`/panel/urunler/${urun.id}`}
                        className="hover:underline"
                      >
                        {urun.baslik}
                      </Link>
                    </h2>
                    {/*
                      Paylaşım rozeti YALNIZCA sahibine gösterilir ve yalnızca
                      paylaşılmamış üründe: başkasının gördüğü her ürün zaten
                      paylaşılmış olduğu için rozet bilgi taşımazdı.
                    */}
                    {!urun.markettePaylasilsin && (
                      <span className="shrink-0 rounded-full border border-cizgi px-2.5 py-0.5 text-xs text-metin-yumusak">
                        Markette paylaşılmadı
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-metin-yumusak">
                    <span className="inline-flex items-center gap-1">
                      <Users size={13} aria-hidden />
                      {urun.gelistirenEkip ??
                        `${urun.kullanici.ad} ${urun.kullanici.soyad}`}
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      {urun.sahipKumesi === "OGRENCI"
                        ? "Öğrenci ürünü"
                        : urun.sahipKumesi === "OGRETMEN"
                          ? "Öğretmen ürünü"
                          : "Ekosistem ürünü"}
                    </span>
                  </p>
                </div>

                {urun.aciklama && (
                  <p className="line-clamp-3 text-sm text-metin">
                    {urun.aciklama}
                  </p>
                )}

                <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-metin-yumusak">
                  <span className="inline-flex items-center gap-1.5">
                    <Eye size={14} aria-hidden />
                    {sayiYaz(urun.goruntulenmeSayisi)} görüntülenme
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ExternalLink size={14} aria-hidden />
                    {sayiYaz(urun.baglantiTiklamasi)} bağlantı ziyareti
                  </span>
                  {urun.tarih && <span>{tarihYaz(urun.tarih)}</span>}
                </p>
              </Kart>
            </li>
          ))}
        </ul>
      )}

      {/*
        SAYAÇLARIN NE SAYDIĞI YAZIYOR. İstek "indirilme sayıları" diyor ama
        ürünlerde dosya yükleme kapsam dışı ("şimdilik sadece tanıtım
        yapsınlar"); indirilecek bir dosya yok. Sayılan şey, ürünün bağlantısına
        gidilmesi. Bunu gizleyip "indirilme" demek, olmayan bir ölçümü varmış
        gibi göstermek olurdu (→ SORULAR.md · S22).
      */}
      <Kart>
        <h2 className="flex items-center gap-2 text-base font-semibold text-baslik">
          <Package size={16} className="text-metin-yumusak" />
          Sayaçlar ne sayıyor?
        </h2>
        <ul className="mt-2 space-y-1.5 text-sm text-metin-yumusak">
          <li>
            <strong className="text-metin">Görüntülenme:</strong> ürün sayfasının
            kaç kez açıldığı. Sahibinin kendi bakışları sayılmaz.
          </li>
          <li>
            <strong className="text-metin">Bağlantı ziyareti:</strong>{" "}
            ürünün
            deposuna, canlı sürümüne ya da tanıtımına kaç kez gidildiği.
            Ürünlerde dosya yükleme şimdilik kapalı olduğu için &quot;indirilme&quot;
            diye sayılabilecek bir olay yok; edinme niyetini gösteren en yakın
            ölçüm bu.
          </li>
        </ul>
      </Kart>
    </div>
  );
}
