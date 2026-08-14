import { Check, Handshake, MessagesSquare, Send, Users, X } from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  KatlanabilirKart,
  SayfaBasligi,
  SINIF_GIRDI,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { GIZLILIK_UYARISI } from "@/lib/iletisim/kurallar";
import { basHarfler } from "@/lib/kullanici/profil-foto-kurallar";
import { tarihSaatYaz } from "@/lib/tarih";
import {
  danismanMi,
  ilKoordinatoruMu,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import {
  baglantiKarariFiltresi,
  yazismaKapsamFiltresi,
} from "@/lib/yetki/kapsam";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import { AkisBolumu } from "../akis/AkisBolumu";
import { baglantiKarariEylemi } from "./baglanti-eylemleri";

export const dynamic = "force-dynamic";

/**
 * Bağlantılarım — tek ekran (12 Ağustos 2026 · istek: "yazışmalar ve
 * bağlantılar isminde iki bölüm var, onları birleştirip linkedin tarzı bir
 * bölüm yapmak istiyorum", "menüdeki bağlantılarım alanında olsun").
 *
 * ESKİDEN İKİ EKRANDI ve ikisi de "bağlantı" diyordu:
 *   - `/panel/yazismalar` → onaylanmış bağlantıların mesaj listesi,
 *   - `/panel/baglantilar` → bekleyen bağlantı isteklerinin onay ekranı.
 * Menüde tek giriş ("Bağlantılarım") vardı, ikincisine oradan bir kart
 * üzerinden geçiliyordu. Artık ikisi de burada: LinkedIn'in "Ağım" ekranı gibi
 * ÖNCE davetler, SONRA bağlantılar. `/panel/baglantilar` silinmedi, buraya
 * yönlendiriyor (yer imleri ve bildirim e-postalarındaki adresler için).
 *
 * ROL AYRIMI KORUNDU, YETKİ GENİŞLEMEDİ: onay bölümü yalnızca karar verebilene
 * basılır (danışman / il koordinatörü / proje yöneticisi) ve her iki liste de
 * kendi merkezi kapsam filtresinden geçer. Öğrenci bu sayfada yalnızca kendi
 * bağlantılarını görür — birleştirme, onun ekranına yeni hiçbir şey eklemez.
 *
 * "Taraf mıyım" ayrımı burada YAPILIR ama gözetimi gizlemez: taraf olduğu
 * satırda karşı taraf tek isimle, gözetim satırında çift isimle yazılır
 * (bkz. `tarafMi`). Danışman "kimin konuşması" bilgisini kaybetmemeli.
 *
 * GÖRÜNÜM (12 Ağustos · "pek linkedin gibi de olmamış çok basit"): liste artık
 * KART İÇİNDE KUTU değil, tek kartın içinde ayırıcı çizgiyle bölünmüş satırlar
 * — LinkedIn'in bağlantı listesi böyle. Avatar büyütüldü, eylemler hap biçimli
 * düğme oldu, davet satırında düğmeler sağa alındı (form artık satırın önünü
 * kapatmıyor) ve listeye süzgeç şeridi eklendi.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  onaylandi: "Bağlantı onaylandı ve yazışma açıldı. İki tarafa da bildirildi.",
  reddedildi: "Bağlantı reddedildi; isteği yapana gerekçesiyle bildirildi.",
  /*
   * AKIŞ İLETİLERİ BURAYA TAŞINDI (14 Ağustos 2026 · istek: "akış
   * bağlantılarım içine gelecek"): akış eylemleri artık bu sayfaya dönüyor
   * (bkz. akis/eylemler.ts). Kendi haritalarında bırakılsalardı paylaşımını
   * yapan kişi hiçbir onay iletisi görmezdi.
   */
  paylasildi: "Gönderiniz yayımlandı.",
  gizlendi: "İçerik kaldırıldı. Silinmedi; yetkililer görmeye devam eder.",
  "hakkinda-kaydedildi": "Hakkımda metniniz kaydedildi.",
  "istek-gonderildi":
    "Bağlantı isteğiniz danışman öğretmeninizin onayına gönderildi. Onaylanana kadar karşı tarafa iletilmez.",
};

const ONAY_ETIKETLERI: Record<string, string> = {
  BEKLIYOR: "Bekliyor",
  ONAYLANDI: "Onaylandı",
  REDDEDILDI: "Reddedildi",
};

/** Hap biçimli eylem düğmeleri — LinkedIn'in satır sonu düğmeleri gibi. */
const SINIF_HAP_VURGU =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-vurgu px-4 py-1.5 text-sm font-semibold text-vurgu-metin transition group-hover:bg-vurgu-zemin";

const SINIF_HAP_OLUMLU =
  "inline-flex items-center gap-1.5 rounded-full bg-olumlu-zemin px-4 py-2 text-sm font-semibold text-olumlu-metin transition hover:opacity-90";

const SINIF_HAP_HATA =
  "inline-flex items-center gap-1.5 rounded-full border border-cizgi px-4 py-2 text-sm font-medium text-metin transition hover:border-hata-cizgi hover:bg-hata-zemin hover:text-hata-metin";

/**
 * Baş harf çemberi — stil `mentorluk/page.tsx`'teki mentör kimliğiyle aynı,
 * yeni bir tasarım dili çıkmasın diye. Profil fotoğrafı BİLEREK kapsam dışı:
 * fotoğrafı servis eden route yalnızca onaylı mentör ve kişinin kendisi için
 * var; bağlantı listesine fotoğraf koymak "kim kimin fotoğrafını görebilir"
 * kararını gerektirir ve o ayrı bir iştir.
 */
function BasHarfCemberi({ ad, soyad }: { ad: string; soyad: string }) {
  return (
    <span
      aria-hidden
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-vurgu-zemin text-lg font-semibold text-vurgu-metin"
    >
      {basHarfler(ad, soyad)}
    </span>
  );
}

/**
 * Gözetim satırının çemberi. Baş harf BASILMAZ: satır iki kişiyi birden
 * gösteriyor, tek kişinin baş harfini basmak "bu senin bağlantın" izlenimi
 * verirdi. Nötr çember + `Users` ikonu, satırın gözetim olduğunu avatardan
 * itibaren söyler.
 */
function GozetimCemberi() {
  return (
    <span
      aria-hidden
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-cizgi bg-zemin text-metin-yumusak"
    >
      <Users size={22} />
    </span>
  );
}

/** "11-A · Atatürk Anadolu Lisesi" — boş alanlar atlanır, ayraç kalmaz. */
function altBasligiYaz(parcalar: (string | null | undefined)[]): string {
  return parcalar.filter((parca) => parca && parca.trim()).join(" · ");
}

const SUZGECLER = ["tumu", "benim", "gozetim"] as const;
type Suzgec = (typeof SUZGECLER)[number];

export default async function BaglantilarimSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; hata?: string; suzgec?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum, hata, suzgec } = await searchParams;

  const secili: Suzgec = SUZGECLER.includes(suzgec as Suzgec)
    ? (suzgec as Suzgec)
    : "tumu";

  const onayVerebilir =
    danismanMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    projeYoneticisiMi(kullanici);

  /*
   * İki liste TEK TURDA çekilir. İstek listesi yalnızca karar verebilen için
   * sorgulanır: onay yetkisi olmayanda `baglantiKarariFiltresi` zaten boş küme
   * döndürüyor, o sorguyu hiç açmamak bir gidiş dönüş kazandırır.
   */
  const [yazismalar, istekler, gonderdiklerim] = await Promise.all([
    prisma.yazisma.findMany({
      where: yazismaKapsamFiltresi(kullanici),
      orderBy: { olusturmaTarihi: "desc" },
      take: 100,
      select: {
        baglantiIstegiId: true,
        kapatildiMi: true,
        olusturmaTarihi: true,
        baglantiIstegi: {
          select: {
            isteyenKullaniciId: true,
            hedefKullaniciId: true,
            isteyen: {
              select: {
                ad: true,
                soyad: true,
                sinif: true,
                brans: true,
                kurum: { select: { ad: true } },
              },
            },
            hedef: {
              select: {
                ad: true,
                soyad: true,
                sinif: true,
                brans: true,
                kurum: { select: { ad: true } },
              },
            },
            talep: { select: { baslik: true } },
          },
        },
        _count: { select: { mesajlar: true } },
      },
    }),
    onayVerebilir
      ? prisma.baglantiIstegi.findMany({
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
        })
      : Promise.resolve([]),

    /*
     * GÖNDERDİĞİM İSTEKLER (12 Ağustos 2026 · kullanıcı fark etti: "arda
     * erdoğandan elif yılmaza bağlantı isteği gönderdim, ancak elifin
     * bağlantılarım sayfasında çıkmadı" → istek hedefe değil onaylayana gider,
     * ama GÖNDEREN de isteğini hiçbir yerde göremiyordu).
     *
     * Yalnızca BEKLİYOR ve REDDEDİLDİ çekilir. ONAYLANDI BİLEREK DIŞARIDA:
     * onaylanan istek zaten yukarıdaki bağlantı listesinde yazışmasıyla
     * duruyor, buraya da konsaydı aynı bağlantı ekranda iki kez görünürdü.
     *
     * Kapsam filtresi YOK ve gerekmiyor: koşul `isteyenKullaniciId = ben`,
     * yani kişinin kendi gönderdiği istekler. Kendi verisine bakmak için
     * yetki sorusu sorulmaz.
     */
    prisma.baglantiIstegi.findMany({
      where: {
        isteyenKullaniciId: kullanici.id,
        onayDurumu: { in: ["BEKLIYOR", "REDDEDILDI"] },
      },
      orderBy: [{ onayDurumu: "asc" }, { olusturmaTarihi: "desc" }],
      take: 50,
      select: {
        id: true,
        onayDurumu: true,
        retGerekcesi: true,
        kararTarihi: true,
        olusturmaTarihi: true,
        talep: { select: { baslik: true } },
        hedef: {
          select: {
            ad: true,
            soyad: true,
            sinif: true,
            brans: true,
            kurum: { select: { ad: true } },
          },
        },
      },
    }),
  ]);

  // Erişim loglaması eski onay ekranından aynen taşındı: bekleyen isteklerin
  // listesini görmek de bir profil görüntülemesidir ve iz bırakır.
  if (istekler.length > 0) {
    await erisimLoglaCoklu(
      istekler.map((istek) => ({
        kullaniciId: kullanici.id,
        islem: "GORUNTULEME" as const,
        hedefTip: "PROFIL" as const,
        hedefId: istek.id,
        detay: "Bağlantı isteği listesi görüntülendi",
      })),
    );
  }

  const bekleyenler = istekler.filter((i) => i.onayDurumu === "BEKLIYOR");
  const gecmis = istekler.filter((i) => i.onayDurumu !== "BEKLIYOR");

  const yanitBekleyenlerim = gonderdiklerim.filter(
    (i) => i.onayDurumu === "BEKLIYOR",
  );

  /*
   * Satırlar önce ZENGİNLEŞTİRİLİR, sonra süzülür. Süzgeç şeridi "0 sonuç"
   * gösterebilmeli ve sayıları başlıkta yazabilmeli; bunun için her iki kümenin
   * de sayısı lazım, dolayısıyla süzme sorguda değil burada yapılır (liste
   * zaten `take: 100`).
   */
  const satirlar = yazismalar.map((yazisma) => {
    const { isteyen, hedef, talep } = yazisma.baglantiIstegi;
    const bendenMi = yazisma.baglantiIstegi.isteyenKullaniciId === kullanici.id;
    const tarafMi =
      bendenMi || yazisma.baglantiIstegi.hedefKullaniciId === kullanici.id;

    /*
     * TARAF OLUNAN SATIR KARŞI TARAFI GÖSTERİR, ÇİFTİ DEĞİL: LinkedIn kartı
     * "sen ↔ o" demez. Kendi adını her satırda okumak bilgi taşımıyor.
     *
     * GÖZETİM SATIRI ÇİFT İSİM KALIR: bakan kişi bağlantının tarafı değil,
     * tek isme indirmek konuşmanın kime ait olduğunu gizlerdi.
     */
    const karsiTaraf = bendenMi ? hedef : isteyen;

    /*
     * Gözetim satırında iki kurum yazılır ama AYNI KURUMSA TEK KEZ: "Kadıköy
     * Anadolu Lisesi → Kadıköy Anadolu Lisesi" okuyana hiçbir şey söylemiyor.
     * Okul arkadaşlarının bağlantısı en sık görülen durum.
     */
    const kurumlar = [
      ...new Set([isteyen.kurum?.ad, hedef.kurum?.ad].filter(Boolean)),
    ].join(" → ");

    return {
      id: yazisma.baglantiIstegiId,
      tarafMi,
      karsiTaraf,
      baslik: tarafMi
        ? `${karsiTaraf.ad} ${karsiTaraf.soyad}`
        : `${isteyen.ad} ${isteyen.soyad} ↔ ${hedef.ad} ${hedef.soyad}`,
      altBaslik: tarafMi
        ? altBasligiYaz([
            karsiTaraf.sinif ?? karsiTaraf.brans,
            karsiTaraf.kurum?.ad,
          ])
        : kurumlar,
      meta: [
        `${yazisma._count.mesajlar} mesaj`,
        tarihSaatYaz(yazisma.olusturmaTarihi),
        talep?.baslik,
        yazisma.kapatildiMi ? "kapatıldı" : null,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  });

  const benimSayisi = satirlar.filter((s) => s.tarafMi).length;
  const gozetimSayisi = satirlar.length - benimSayisi;

  const gorunen = satirlar.filter((satir) =>
    secili === "benim"
      ? satir.tarafMi
      : secili === "gozetim"
        ? !satir.tarafMi
        : true,
  );

  /*
   * Süzgeç şeridi yalnızca İKİ TÜR DE VARSA basılır: sadece kendi bağlantıları
   * olan öğrenciye "Tümü / Bağlantılarım / Gözetim" göstermek, üçü de aynı
   * listeyi veren üç düğme demek olurdu.
   */
  const suzgecGoster = benimSayisi > 0 && gozetimSayisi > 0;

  const ozet = [
    `${satirlar.length} bağlantı`,
    bekleyenler.length > 0 ? `${bekleyenler.length} istek karar bekliyor` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <SayfaBasligi baslik="Bağlantılarım" aciklama={ozet} />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <BilgiKutusu cesit="uyari">{GIZLILIK_UYARISI}</BilgiKutusu>

      {/*
        DAVETLER ÜSTTE, BAĞLANTILAR ALTTA — LinkedIn "Ağım" sırası. Bekleyen
        istek yoksa kart HİÇ BASILMAZ: karar bekleyen bir iş yokken sayfanın
        tepesini "Bekleyen istek yok" cümlesine ayırmak, asıl içeriği (bağlantı
        listesini) aşağı itmekten başka bir işe yaramıyor. Karara bağlananlar
        aşağıdaki katlanabilir kartta duruyor, geçmiş kaybolmuyor.
      */}
      {bekleyenler.length > 0 && (
        <Kart id="istekler">
          <div className="mb-1 flex items-center gap-2">
            <Handshake size={18} className="text-vurgu-metin" />
            <h2 className="text-lg font-semibold text-baslik">Davetler</h2>
            <span className="rounded-full bg-vurgu-zemin px-2 py-0.5 text-sm font-semibold text-vurgu-metin">
              {bekleyenler.length}
            </span>
          </div>
          <p className="mb-2 text-sm text-metin-yumusak">
            Onaylanana kadar taraflar birbirine ulaşamaz; hedef kişi istekten
            haberdar değildir.
          </p>

          <ul className="-mx-6 divide-y divide-cizgi border-t border-cizgi">
            {bekleyenler.map((istek) => (
              <li key={istek.id} className="px-6 py-5">
                <form
                  action={baglantiKarariEylemi}
                  className="flex flex-wrap items-start gap-4"
                >
                  <input type="hidden" name="istekId" value={istek.id} />

                  <BasHarfCemberi
                    ad={istek.isteyen.ad}
                    soyad={istek.isteyen.soyad}
                  />

                  <div className="min-w-0 grow basis-64">
                    <p className="text-base font-semibold text-baslik">
                      {istek.isteyen.ad} {istek.isteyen.soyad}
                      <span className="mx-2 font-normal text-metin-yumusak">
                        →
                      </span>
                      {istek.hedef.ad} {istek.hedef.soyad}
                    </p>
                    <p className="mt-0.5 text-sm text-metin">
                      {altBasligiYaz([
                        istek.isteyen.sinif,
                        istek.isteyen.kurum?.ad ?? "—",
                      ])}
                      {" → "}
                      {istek.hedef.kurum?.ad ?? istek.hedef.il?.ad ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-metin-yumusak">
                      {istek.talep && `${istek.talep.baslik} · `}
                      {tarihSaatYaz(istek.olusturmaTarihi)}
                    </p>

                    <p className="mt-3 border-l-2 border-cizgi pl-3 text-sm text-metin italic">
                      {istek.mesaj}
                    </p>

                    {/*
                      Gerekçe artık satırın ÖNÜNÜ KAPATMIYOR. Eskiden formun
                      ilk öğesiydi ve daveti bir evrak gibi gösteriyordu; oysa
                      yalnızca redde zorunlu. Düğmeler sağda, alan altta.
                    */}
                    <label className="mt-3 block max-w-md">
                      <span className="text-xs font-medium text-metin-yumusak">
                        Gerekçe (redde zorunlu)
                      </span>
                      <input
                        type="text"
                        name="gerekce"
                        maxLength={500}
                        className={SINIF_GIRDI}
                      />
                    </label>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="submit"
                      name="karar"
                      value="reddet"
                      className={SINIF_HAP_HATA}
                    >
                      <X size={15} aria-hidden />
                      Reddet
                    </button>
                    <button
                      type="submit"
                      name="karar"
                      value="onayla"
                      className={SINIF_HAP_OLUMLU}
                    >
                      <Check size={15} aria-hidden />
                      Onayla
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        </Kart>
      )}

      <Kart>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
            <MessagesSquare size={18} className="text-vurgu-metin" />
            Bağlantılarım
          </h2>

          {suzgecGoster && (
            /*
              Süzgeç JAVASCRIPT'SİZ: her sekme bir bağlantı, sayfa sunucuda
              yeniden basılıyor. Ekranın geri kalanı da böyle çalışıyor.
            */
            <nav className="flex gap-1 rounded-full border border-cizgi p-1">
              {(
                [
                  ["tumu", "Tümü", satirlar.length],
                  ["benim", "Bağlantılarım", benimSayisi],
                  ["gozetim", "Gözetim", gozetimSayisi],
                ] as const
              ).map(([kod, etiket, sayi]) => (
                <Link
                  key={kod}
                  href={
                    kod === "tumu"
                      ? "/panel/yazismalar"
                      : `/panel/yazismalar?suzgec=${kod}`
                  }
                  aria-current={secili === kod ? "page" : undefined}
                  className={`rounded-full px-3 py-1 text-sm transition ${
                    secili === kod
                      ? "bg-secili-zemin font-semibold text-secili-metin"
                      : "text-metin-yumusak hover:text-metin"
                  }`}
                >
                  {etiket} <span className="tabular-nums">{sayi}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>

        {gorunen.length === 0 ? (
          <p className="text-metin-yumusak">
            {satirlar.length === 0
              ? "Görüntüleyebileceğiniz bağlantı yok. Panodaki bir ilandan ya da Akış'taki bir paylaşımdan bağlantı isteği gönderebilirsiniz."
              : "Bu süzgeçte bağlantı yok."}
          </p>
        ) : (
          /*
            TEK KART, AYIRICI ÇİZGİLİ SATIRLAR — kart içinde ayrı ayrı çerçeveli
            kutular değil (12 Ağustos · "çok basit"). Negatif kenar boşluğu,
            çizgilerin kartın tam genişliğinde durması için: LinkedIn listesi
            böyle, satır kenarda kesilmiyor.
          */
          <ul className="-mx-6 -mb-6 divide-y divide-cizgi border-t border-cizgi">
            {gorunen.map((satir) => (
              <li key={satir.id} className="group">
                {/*
                  SATIRIN TAMAMI TIKLANIR. Sağdaki eylem bir <span>: iki hedef
                  de aynı adres ve <a> içine <a> geçersiz HTML.
                */}
                <Link
                  href={`/panel/yazismalar/${satir.id}`}
                  className="flex items-center gap-4 px-6 py-4 transition hover:bg-zemin"
                >
                  {satir.tarafMi ? (
                    <BasHarfCemberi
                      ad={satir.karsiTaraf.ad}
                      soyad={satir.karsiTaraf.soyad}
                    />
                  ) : (
                    <GozetimCemberi />
                  )}

                  <span className="min-w-0 grow">
                    <span className="block truncate text-base font-semibold text-baslik underline-offset-2 group-hover:text-vurgu-metin group-hover:underline">
                      {satir.baslik}
                    </span>
                    {satir.altBaslik && (
                      <span className="block truncate text-sm text-metin">
                        {satir.altBaslik}
                      </span>
                    )}
                    <span className="mt-1 block text-xs text-metin-yumusak">
                      {satir.meta}
                    </span>
                  </span>

                  {!satir.tarafMi && (
                    <span className="hidden shrink-0 rounded-full border border-cizgi px-2.5 py-0.5 text-xs text-metin-yumusak sm:inline">
                      gözetim
                    </span>
                  )}
                  <span className={`hidden sm:inline-flex ${SINIF_HAP_VURGU}`}>
                    {satir.tarafMi ? "Mesaj" : "Aç"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Kart>

      {/*
        GÖNDERDİĞİM İSTEKLER — isteği yapanın kendi takip ekranı.

        Bekleyeni varsa AÇIK kart, yoksa (yalnızca ret geçmişi kaldıysa) katlı:
        "isteğim ne oldu" sorusunun cevabı bekleyen varken günlük iş, ret
        geçmişi ise arşivdir. Aynı ayrım Davetler kartında da var.
      */}
      {gonderdiklerim.length > 0 &&
        (() => {
          /*
           * Yalnızca YATAY negatif boşluk: bu gövde hem `Kart` (p-6) hem
           * `KatlanabilirKart` (px-6 py-5) içinde basılıyor, alt boşlukları
           * farklı. Tek bir `-mb-*` ikisinde birden doğru duramazdı.
           */
          const govde = (
            <ul className="-mx-6 divide-y divide-cizgi border-t border-cizgi">
              {gonderdiklerim.map((istek) => {
                const reddedildi = istek.onayDurumu === "REDDEDILDI";
                return (
                  <li
                    key={istek.id}
                    className="flex items-start gap-4 px-6 py-4"
                  >
                    <BasHarfCemberi
                      ad={istek.hedef.ad}
                      soyad={istek.hedef.soyad}
                    />
                    <div className="min-w-0 grow">
                      <p className="text-base font-semibold text-baslik">
                        {istek.hedef.ad} {istek.hedef.soyad}
                      </p>
                      <p className="truncate text-sm text-metin">
                        {altBasligiYaz([
                          istek.hedef.sinif ?? istek.hedef.brans,
                          istek.hedef.kurum?.ad,
                        ])}
                      </p>
                      <p className="mt-0.5 text-xs text-metin-yumusak">
                        {istek.talep
                          ? `${istek.talep.baslik} · `
                          : "Akıştaki paylaşımı üzerinden · "}
                        {tarihSaatYaz(istek.olusturmaTarihi)}
                      </p>

                      {/*
                        RET GEREKÇESİ GÖSTERİLİR: kural gereği zorunlu tutuluyor
                        (bkz. iletisim/kurallar.ts) ve zorunlu tutulmasının tek
                        anlamı, öğrencinin onu OKUYABİLMESİ. Bugüne kadar
                        yazılıyor ama hiçbir ekranda gösterilmiyordu.
                      */}
                      {reddedildi && istek.retGerekcesi && (
                        <p className="mt-2 border-l-2 border-hata-cizgi pl-3 text-sm text-metin">
                          <span className="font-medium">Gerekçe: </span>
                          {istek.retGerekcesi}
                        </p>
                      )}
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                        reddedildi
                          ? "border-hata-cizgi bg-hata-zemin text-hata-metin"
                          : "border-uyari-cizgi bg-uyari-zemin text-uyari-metin"
                      }`}
                    >
                      {reddedildi ? "Reddedildi" : "Onay bekliyor"}
                    </span>
                  </li>
                );
              })}
            </ul>
          );

          const aciklama =
            yanitBekleyenlerim.length > 0
              ? `${yanitBekleyenlerim.length} isteğiniz danışman onayını bekliyor. Onaylanana kadar karşı tarafa iletilmez.`
              : "Sonuçlanan istekleriniz ve ret gerekçeleri.";

          return yanitBekleyenlerim.length > 0 ? (
            <Kart id="gonderdiklerim">
              <KartBasligi
                baslik="Gönderdiğim istekler"
                aciklama={aciklama}
                Ikon={Send}
              />
              {govde}
            </Kart>
          ) : (
            <KatlanabilirKart
              baslik="Gönderdiğim istekler"
              aciklama={aciklama}
              Ikon={Send}
              capa="gonderdiklerim"
            >
              {govde}
            </KatlanabilirKart>
          );
        })()}

      {/*
        AKIŞ (14 Ağustos 2026 · istek: "akış bağlantılarım içine gelecek").

        YERİ BURASI: davetler ve bağlantı listesinden SONRA, arşivden ÖNCE.
        Sayfanın üst yarısı "kiminle bağlıyım" sorusunu bitiriyor; akış ondan
        sonra başlıyor ve kendi başlığı, kendi uyarısıyla ayrı bir alan olduğunu
        söylüyor (yazışma özeldir, akış yayındır — bu ayrım sekme kalksa da
        korunmak zorunda).

        Bölüm KENDİ SORGULARINI yapıyor (bkz. AkisBolumu): sayfanın bağlantı
        sorguları ile akışınkiler farklı tablolara bakıyor ve tek bir
        Promise.all'a toplansalardı iki ekranın verisi birbirine düğümlenirdi.
      */}
      <AkisBolumu kullanici={kullanici} />

      {/*
        Karara bağlananlar KATLI GELİR: bu bir arşiv, günlük iş değil. Eski
        onay ekranında açık duruyordu çünkü sayfada başka içerik yoktu; artık
        bağlantı listesinin altında ve açık kalsaydı sayfayı tabloyla bitirirdi.
      */}
      {gecmis.length > 0 && (
        <KatlanabilirKart
          baslik="Karara bağlanan istekler"
          aciklama={`${gecmis.length} istek sonuçlandı. Onaylananların yazışması yukarıdaki listede.`}
        >
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
        </KatlanabilirKart>
      )}
    </div>
  );
}
