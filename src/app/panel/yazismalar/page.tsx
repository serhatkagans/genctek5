import { Check, Handshake, MessagesSquare, Users, X } from "lucide-react";
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
 */

const DURUM_MESAJLARI: Record<string, string> = {
  onaylandi: "Bağlantı onaylandı ve yazışma açıldı. İki tarafa da bildirildi.",
  reddedildi: "Bağlantı reddedildi; isteği yapana gerekçesiyle bildirildi.",
};

const ONAY_ETIKETLERI: Record<string, string> = {
  BEKLIYOR: "Bekliyor",
  ONAYLANDI: "Onaylandı",
  REDDEDILDI: "Reddedildi",
};

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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-vurgu-zemin text-sm font-semibold text-vurgu-metin"
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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cizgi bg-zemin text-metin-yumusak"
    >
      <Users size={18} />
    </span>
  );
}

/** "11-A · Atatürk Anadolu Lisesi" — boş alanlar atlanır, ayraç kalmaz. */
function altBasligiYaz(parcalar: (string | null | undefined)[]): string {
  return parcalar.filter((parca) => parca && parca.trim()).join(" · ");
}

export default async function BaglantilarimSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; hata?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum, hata } = await searchParams;

  const onayVerebilir =
    danismanMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    projeYoneticisiMi(kullanici);

  /*
   * İki liste TEK TURDA çekilir. İstek listesi yalnızca karar verebilen için
   * sorgulanır: onay yetkisi olmayanda `baglantiKarariFiltresi` zaten boş küme
   * döndürüyor, o sorguyu hiç açmamak bir gidiş dönüş kazandırır.
   */
  const [yazismalar, istekler] = await Promise.all([
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

  const ozet = [
    `${yazismalar.length} bağlantı`,
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
          <KartBasligi
            baslik="Kararınızı bekleyen istekler"
            aciklama="Onaylanana kadar taraflar birbirine ulaşamaz; hedef kişi istekten haberdar değildir."
            Ikon={Handshake}
          />
          <ul className="space-y-4">
            {bekleyenler.map((istek) => (
              <li
                key={istek.id}
                className="rounded-kart border border-cizgi p-4"
              >
                <div className="flex items-start gap-3">
                  <BasHarfCemberi
                    ad={istek.isteyen.ad}
                    soyad={istek.isteyen.soyad}
                  />
                  <div className="min-w-0 grow">
                    <p className="font-semibold text-baslik">
                      {istek.isteyen.ad} {istek.isteyen.soyad}
                      <span className="mx-2 font-normal text-metin-yumusak">
                        →
                      </span>
                      {istek.hedef.ad} {istek.hedef.soyad}
                    </p>
                    <p className="mt-0.5 text-sm text-metin-yumusak">
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
                  </div>
                </div>

                <p className="mt-3 rounded-md bg-zemin px-3 py-2 text-sm text-metin">
                  <span className="font-medium">Öğrencinin mesajı: </span>
                  {istek.mesaj}
                </p>

                <form
                  action={baglantiKarariEylemi}
                  className="mt-3 flex flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="istekId" value={istek.id} />
                  <label className="block grow">
                    <span className="text-sm font-medium text-metin">
                      Gerekçe{" "}
                      <span className="text-metin-yumusak">(redde zorunlu)</span>
                    </span>
                    <input
                      type="text"
                      name="gerekce"
                      maxLength={500}
                      className={SINIF_GIRDI}
                    />
                  </label>
                  <button
                    type="submit"
                    name="karar"
                    value="onayla"
                    className="inline-flex items-center gap-1.5 rounded-md bg-olumlu-zemin px-3 py-2 text-sm font-medium text-olumlu-metin transition hover:opacity-90"
                  >
                    <Check size={15} aria-hidden />
                    Onayla
                  </button>
                  <button
                    type="submit"
                    name="karar"
                    value="reddet"
                    className="inline-flex items-center gap-1.5 rounded-md bg-hata-zemin px-3 py-2 text-sm font-medium text-hata-metin transition hover:opacity-90"
                  >
                    <X size={15} aria-hidden />
                    Reddet
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Kart>
      )}

      <Kart>
        <KartBasligi
          baslik="Bağlantılarım"
          aciklama="Onaylanmış bağlantılar; satıra tıklayarak yazışmayı açarsınız."
          Ikon={MessagesSquare}
        />
        {yazismalar.length === 0 ? (
          <p className="text-metin-yumusak">
            Görüntüleyebileceğiniz bağlantı yok. Panodan bağlantı isteği
            gönderebilirsiniz.
          </p>
        ) : (
          <ul className="space-y-3">
            {yazismalar.map((yazisma) => {
              const { isteyen, hedef, talep } = yazisma.baglantiIstegi;
              const tarafMi =
                yazisma.baglantiIstegi.isteyenKullaniciId === kullanici.id ||
                yazisma.baglantiIstegi.hedefKullaniciId === kullanici.id;

              /*
               * TARAF OLUNAN SATIR KARŞI TARAFI GÖSTERİR, ÇİFTİ DEĞİL: LinkedIn
               * kartı "sen ↔ o" demez. Kendi adını her satırda okumak bilgi
               * taşımıyor, satırı da iki katına çıkarıyordu.
               *
               * GÖZETİM SATIRI ÇİFT İSİM KALIR: bakan kişi bağlantının tarafı
               * değil, tek isme indirmek konuşmanın kime ait olduğunu gizlerdi.
               */
              const karsiTaraf =
                yazisma.baglantiIstegi.isteyenKullaniciId === kullanici.id
                  ? hedef
                  : isteyen;

              const baslik = tarafMi
                ? `${karsiTaraf.ad} ${karsiTaraf.soyad}`
                : `${isteyen.ad} ${isteyen.soyad} ↔ ${hedef.ad} ${hedef.soyad}`;

              const altBaslik = tarafMi
                ? altBasligiYaz([
                    karsiTaraf.sinif ?? karsiTaraf.brans,
                    karsiTaraf.kurum?.ad,
                  ])
                : altBasligiYaz([
                    [isteyen.kurum?.ad, hedef.kurum?.ad]
                      .filter(Boolean)
                      .join(" → "),
                  ]);

              return (
                <li key={yazisma.baglantiIstegiId}>
                  {/*
                    SATIRIN TAMAMI TIKLANIR. Sağdaki eylem bir <span>: iki
                    hedef de aynı adres ve <a> içine <a> geçersiz HTML.
                  */}
                  <Link
                    href={`/panel/yazismalar/${yazisma.baglantiIstegiId}`}
                    className="flex items-center gap-3 rounded-kart border border-cizgi p-4 transition hover:border-vurgu"
                  >
                    {tarafMi ? (
                      <BasHarfCemberi
                        ad={karsiTaraf.ad}
                        soyad={karsiTaraf.soyad}
                      />
                    ) : (
                      <GozetimCemberi />
                    )}

                    <span className="min-w-0 grow">
                      <span className="block truncate font-medium text-metin">
                        {baslik}
                      </span>
                      {altBaslik && (
                        <span className="block truncate text-sm text-metin-yumusak">
                          {altBaslik}
                        </span>
                      )}
                      <span className="mt-0.5 block text-xs text-metin-yumusak">
                        {yazisma._count.mesajlar} mesaj
                        {" · "}
                        {tarihSaatYaz(yazisma.olusturmaTarihi)}
                        {talep && ` · ${talep.baslik}`}
                        {yazisma.kapatildiMi && " · kapatıldı"}
                      </span>
                    </span>

                    {!tarafMi && (
                      <span className="hidden shrink-0 rounded-md border border-cizgi px-2 py-1 text-xs text-metin-yumusak sm:inline">
                        gözetim
                      </span>
                    )}
                    <span className="hidden shrink-0 rounded-md border border-cizgi px-4 py-2 text-sm font-medium text-metin sm:inline">
                      {tarafMi ? "Mesaj" : "Aç"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Kart>

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
