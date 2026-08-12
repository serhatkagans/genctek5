import {
  Check,
  EyeOff,
  Handshake,
  Hourglass,
  MessageCircle,
  PenLine,
  Send,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { MetinBaglantili } from "@/components/MetinBaglantili";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SayfaBasligi,
} from "@/components/ui";
import {
  AKIS_UYARISI,
  GONDERI_MAKS,
  HAKKINDA_MAKS,
  YORUM_MAKS,
  gizliIcerikGorunurMu,
} from "@/lib/akis/kurallar";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { basHarfler } from "@/lib/kullanici/profil-foto-kurallar";
import { tarihSaatYaz } from "@/lib/tarih";
import {
  danismanMi,
  ilKoordinatoruMu,
  projeYoneticisiMi,
  talepPanosuGorebilirMi,
} from "@/lib/yetki/izinler";
import { kisiyeBaglantiIstegiEylemi } from "../yazismalar/baglanti-eylemleri";
import {
  gonderiGizleEylemi,
  gonderiPaylasEylemi,
  hakkindaKaydetEylemi,
  yorumGizleEylemi,
  yorumYazEylemi,
} from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Akış — LinkedIn tarzı paylaşım alanı (12 Ağustos 2026 · istek: "kullanıcı
 * linkedin gibi mesaj yazabilsin, o alanda kendini tanıtabilsin diğer kişiler
 * altına mesaj yazabilsin, kariyeri hakkında paylaşım yapabilsin").
 *
 * ÜÇ PARÇA: Hakkımda (kendini tanıtma) · gönderi yazma · akış + yorumlar.
 *
 * YAZIŞMADAN AYRI BİR ŞEYDİR, karıştırılmamalı:
 *   - `/panel/yazismalar` iki kişi arasındadır, danışman onayı ister ve
 *     yalnızca taraflar + gözetim yetkisi olanlar okur.
 *   - Burası YAYINDIR: ekosistemdeki herkes okur, onay istemez.
 * Bağlantı kapısı bu yüzden buraya uygulanmadı; emsali panodaki ilandır
 * (bkz. lib/akis/kurallar.ts başlığı).
 *
 * KAPSAM FİLTRESİ YOK ve bu bilinçli: liste herkese aynıdır. Erişim
 * loglaması da yok — kamuya açık bir yayını okumak kişisel veriye erişim
 * değildir (yazışmada tam tersi geçerli, orada her gözetim okuması loglanıyor).
 *
 * GİZLENEN İÇERİK SİLİNMEZ: yetkiliye içeriğiyle görünmeye devam eder
 * (bkz. gizliIcerikGorunurMu). Aynı kural model Mesaj'da da var.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  paylasildi: "Gönderiniz yayımlandı.",
  gizlendi: "İçerik kaldırıldı. Silinmedi; yetkililer görmeye devam eder.",
  "hakkinda-kaydedildi": "Hakkımda metniniz kaydedildi.",
  "istek-gonderildi":
    "Bağlantı isteğiniz danışman öğretmeninizin onayına gönderildi. Onaylanana kadar karşı tarafa iletilmez.",
};

/**
 * Bir kişiyle aramdaki bağlantının durumu — düğmenin hangi hâli basılacağını
 * belirler. `null` = hiç istek yok.
 */
type BaglantiDurumu =
  | { hal: "bekliyor" }
  | { hal: "bagli"; yazismaVarMi: boolean; istekId: number };

function Cember({
  ad,
  soyad,
  buyuk = false,
}: {
  ad: string;
  soyad: string;
  buyuk?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-vurgu-zemin font-semibold text-vurgu-metin ${
        buyuk ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm"
      }`}
    >
      {basHarfler(ad, soyad)}
    </span>
  );
}

/** "11-A · Kadıköy Anadolu Lisesi" — boş alanlar atlanır, ayraç kalmaz. */
function unvanYaz(kisi: {
  sinif: string | null;
  brans: string | null;
  kurum: { ad: string } | null;
}): string {
  return [kisi.sinif ?? kisi.brans, kisi.kurum?.ad]
    .filter((parca) => parca && parca.trim())
    .join(" · ");
}

export default async function AkisSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; hata?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum, hata } = await searchParams;

  const gozetimYetkisi =
    danismanMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    projeYoneticisiMi(kullanici);

  const kisiSecimi = {
    ad: true,
    soyad: true,
    sinif: true,
    brans: true,
    kurum: { select: { ad: true } },
  } as const;

  // Merkez personeli bağlantı isteği göndermez (panodakiyle aynı kapı).
  const baglanabilir = talepPanosuGorebilirMi(kullanici);

  const [ben, gonderiler] = await Promise.all([
    prisma.kullanici.findUniqueOrThrow({
      where: { id: kullanici.id },
      select: { hakkinda: true, ...kisiSecimi },
    }),
    prisma.gonderi.findMany({
      orderBy: { olusturmaTarihi: "desc" },
      take: 50,
      select: {
        id: true,
        icerik: true,
        olusturmaTarihi: true,
        gizlendiMi: true,
        yazanKullaniciId: true,
        yazan: { select: kisiSecimi },
        gizleyen: { select: { ad: true, soyad: true } },
        yorumlar: {
          orderBy: { olusturmaTarihi: "asc" },
          select: {
            id: true,
            icerik: true,
            olusturmaTarihi: true,
            gizlendiMi: true,
            yazanKullaniciId: true,
            yazan: { select: kisiSecimi },
            gizleyen: { select: { ad: true, soyad: true } },
          },
        },
      },
    }),
  ]);

  /*
   * BAĞLANTI DURUMLARI TEK SORGUDA. Gönderi başına sorgu açmak, akış
   * uzadıkça N+1'e dönerdi; burada görünen yazarların tamamı için bir kez
   * sorulup haritaya yazılıyor.
   *
   * Yalnızca BEKLİYOR ve ONAYLANDI çekiliyor: reddedilmiş istek düğmeyi
   * kilitlemez, kişi yeniden isteyebilir (bkz. iletisim/kurallar.ts —
   * "karara bağlanmış istek geçmişte kalır, yenisi açılabilir").
   */
  const yazarKimlikleri = [
    ...new Set(gonderiler.map((g) => g.yazanKullaniciId)),
  ].filter((id) => id !== kullanici.id);

  const baglantiDurumlari = new Map<number, BaglantiDurumu>();
  if (baglanabilir && yazarKimlikleri.length > 0) {
    const istekler = await prisma.baglantiIstegi.findMany({
      where: {
        onayDurumu: { in: ["BEKLIYOR", "ONAYLANDI"] },
        OR: [
          {
            isteyenKullaniciId: kullanici.id,
            hedefKullaniciId: { in: yazarKimlikleri },
          },
          {
            isteyenKullaniciId: { in: yazarKimlikleri },
            hedefKullaniciId: kullanici.id,
          },
        ],
      },
      select: {
        id: true,
        onayDurumu: true,
        isteyenKullaniciId: true,
        hedefKullaniciId: true,
        yazisma: { select: { baglantiIstegiId: true } },
      },
    });

    for (const istek of istekler) {
      const karsiTaraf =
        istek.isteyenKullaniciId === kullanici.id
          ? istek.hedefKullaniciId
          : istek.isteyenKullaniciId;

      /*
       * ONAYLANDI, BEKLİYOR'u EZER: iki kişi arasında hem geçmiş bir onaylı
       * bağlantı hem yeni bir bekleyen istek bulunabilir (ret sonrası tekrar
       * denenmişse). Böyle bir durumda "bağlantınız var" doğru cevaptır.
       */
      const mevcut = baglantiDurumlari.get(karsiTaraf);
      if (mevcut?.hal === "bagli") continue;

      baglantiDurumlari.set(
        karsiTaraf,
        istek.onayDurumu === "ONAYLANDI"
          ? {
              hal: "bagli",
              yazismaVarMi: istek.yazisma !== null,
              istekId: istek.id,
            }
          : { hal: "bekliyor" },
      );
    }
  }

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Akış"
        aciklama={`Kendini tanıt, çalışmanı paylaş · ${gonderiler.length} gönderi`}
      />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <BilgiKutusu cesit="uyari">{AKIS_UYARISI}</BilgiKutusu>

      {/*
        HAKKIMDA — LinkedIn'in "Hakkında" bölümü. Kişinin KENDİ yazdığı metin;
        ad/sınıf/kurum gibi salt okunur kimlik alanlarından ayrıdır ve senkron
        bu alana dokunmaz (bkz. lib/kullanici/sagla.ts).

        `<details>` kullanılıyor, JavaScript yok: kayıtlı metin okunur hâlde
        duruyor, düzenleme formu istendiğinde açılıyor. Metin hiç yoksa form
        AÇIK geliyor — boş bir kart, "burada ne yapılacağını" söylemez.
      */}
      <Kart>
        <KartBasligi
          baslik="Hakkımda"
          aciklama="Kendinizi tanıtın: ilgi alanlarınız, projeleriniz, hedefleriniz."
          Ikon={UserRound}
        />

        <div className="flex items-start gap-4">
          <Cember ad={ben.ad} soyad={ben.soyad} buyuk />
          <div className="min-w-0 grow">
            <p className="text-base font-semibold text-baslik">
              {ben.ad} {ben.soyad}
            </p>
            <p className="text-sm text-metin-yumusak">{unvanYaz(ben)}</p>

            {ben.hakkinda && (
              <p className="mt-3 whitespace-pre-line text-metin">
                {ben.hakkinda}
              </p>
            )}

            <details className="mt-3" open={!ben.hakkinda}>
              <summary className="cursor-pointer list-none text-sm font-medium text-vurgu-metin underline underline-offset-2">
                <PenLine size={14} className="mr-1 inline" aria-hidden />
                {ben.hakkinda ? "Düzenle" : "Kendinizi tanıtın"}
              </summary>
              <form action={hakkindaKaydetEylemi} className="mt-3 space-y-3">
                <input type="hidden" name="donusYolu" value="/panel/akis" />
                <textarea
                  name="hakkinda"
                  rows={4}
                  maxLength={HAKKINDA_MAKS}
                  defaultValue={ben.hakkinda ?? ""}
                  placeholder="Örn. 10. sınıf öğrencisiyim, robotik ve gömülü sistemlerle ilgileniyorum. Okulumun TEKNOFEST takımındayım."
                  className={SINIF_GIRDI}
                />
                <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                  Kaydet
                </button>
              </form>
            </details>
          </div>
        </div>
      </Kart>

      {/* GÖNDERİ YAZMA — LinkedIn'in üstteki kutusu. */}
      <Kart>
        <form action={gonderiPaylasEylemi} className="flex items-start gap-4">
          <Cember ad={ben.ad} soyad={ben.soyad} />
          <div className="min-w-0 grow space-y-3">
            <label className="block">
              <span className="sr-only">Gönderiniz</span>
              <textarea
                name="icerik"
                required
                rows={3}
                maxLength={GONDERI_MAKS}
                placeholder="Ne üzerinde çalışıyorsun? Bir projeni, katıldığın etkinliği ya da öğrendiğin bir şeyi paylaş."
                className={SINIF_GIRDI}
              />
            </label>
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              <Send size={16} aria-hidden />
              Paylaş
            </button>
          </div>
        </form>
      </Kart>

      {gonderiler.length === 0 ? (
        <Kart>
          <p className="text-metin-yumusak">
            Henüz gönderi yok. İlk paylaşımı sen yap.
          </p>
        </Kart>
      ) : (
        gonderiler.map((gonderi) => {
          const icerikGorunur = gizliIcerikGorunurMu({
            gizlendiMi: gonderi.gizlendiMi,
            gozetimYetkisiVarMi: gozetimYetkisi,
          });
          const gizleyebilir =
            !gonderi.gizlendiMi &&
            (gozetimYetkisi || gonderi.yazanKullaniciId === kullanici.id);

          return (
            <Kart
              key={gonderi.id}
              id={`gonderi-${gonderi.id}`}
              className={`scroll-mt-6 ${
                gonderi.gizlendiMi ? "border-uyari-cizgi bg-uyari-zemin" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <Cember ad={gonderi.yazan.ad} soyad={gonderi.yazan.soyad} buyuk />
                <div className="min-w-0 grow">
                  <p className="text-base font-semibold text-baslik">
                    {gonderi.yazan.ad} {gonderi.yazan.soyad}
                  </p>
                  <p className="text-sm text-metin-yumusak">
                    {unvanYaz(gonderi.yazan)}
                  </p>
                  <p className="text-xs text-metin-yumusak">
                    {tarihSaatYaz(gonderi.olusturmaTarihi)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {gizleyebilir && (
                    <form action={gonderiGizleEylemi}>
                      <input
                        type="hidden"
                        name="gonderiId"
                        value={gonderi.id}
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-xs font-medium text-metin-yumusak transition hover:text-hata-metin"
                      >
                        <EyeOff size={13} aria-hidden />
                        {gonderi.yazanKullaniciId === kullanici.id
                          ? "Kaldır"
                          : "Gizle"}
                      </button>
                    </form>
                  )}

                  {/*
                    BAĞLAN — akıştan bağlantı isteği (12 Ağustos 2026).
                    Kendi gönderinde ve merkez personelinde hiç basılmaz.

                    Tanıtım mesajı ZORUNLU olduğu için düğme doğrudan istek
                    göndermiyor, `<details>` ile küçük bir form açıyor: isteği
                    danışman değerlendirecek ve değerlendireceği şey bu metin
                    (bkz. iletisim/kurallar.ts · istekMesajiniCoz).
                  */}
                  {baglanabilir &&
                    gonderi.yazanKullaniciId !== kullanici.id &&
                    (() => {
                      const durum = baglantiDurumlari.get(
                        gonderi.yazanKullaniciId,
                      );

                      if (durum?.hal === "bagli") {
                        return durum.yazismaVarMi ? (
                          <Link
                            href={`/panel/yazismalar/${durum.istekId}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-vurgu px-3 py-1 text-xs font-semibold text-vurgu-metin transition hover:bg-vurgu-zemin"
                          >
                            <MessageCircle size={13} aria-hidden />
                            Mesaj
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-cizgi px-3 py-1 text-xs text-metin-yumusak">
                            <Check size={13} aria-hidden />
                            Bağlantınız var
                          </span>
                        );
                      }

                      if (durum?.hal === "bekliyor") {
                        return (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-cizgi px-3 py-1 text-xs text-metin-yumusak">
                            <Hourglass size={13} aria-hidden />
                            İstek gönderildi
                          </span>
                        );
                      }

                      return (
                        <details className="text-right">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-vurgu px-3 py-1 text-xs font-semibold text-vurgu-metin transition hover:bg-vurgu-zemin">
                            <Handshake size={13} aria-hidden />
                            Bağlan
                          </summary>
                          <form
                            action={kisiyeBaglantiIstegiEylemi}
                            className="mt-2 w-64 space-y-2 text-left"
                          >
                            <input
                              type="hidden"
                              name="hedefId"
                              value={gonderi.yazanKullaniciId}
                            />
                            <label className="block">
                              <span className="text-xs font-medium text-metin">
                                Kendinizi tanıtın
                              </span>
                              <input
                                type="text"
                                name="mesaj"
                                required
                                maxLength={1000}
                                placeholder="Neden bağlanmak istediğinizi kısaca yazın."
                                className={SINIF_GIRDI}
                              />
                            </label>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-full bg-birincil px-3 py-1.5 text-xs font-semibold text-birincil-metin transition hover:bg-birincil-koyu"
                            >
                              İstek gönder
                            </button>
                            <p className="text-xs text-metin-yumusak">
                              İstek önce danışman öğretmeninizin onayına gider.
                            </p>
                          </form>
                        </details>
                      );
                    })()}
                </div>
              </div>

              {gonderi.gizlendiMi && (
                <p className="mt-3 text-xs font-medium text-uyari-metin">
                  Bu gönderi{" "}
                  {gonderi.gizleyen
                    ? `${gonderi.gizleyen.ad} ${gonderi.gizleyen.soyad}`
                    : "bir yetkili"}{" "}
                  tarafından kaldırıldı.
                </p>
              )}

              {icerikGorunur ? (
                <MetinBaglantili
                  metin={gonderi.icerik}
                  className="mt-4 whitespace-pre-line text-metin"
                />
              ) : (
                <p className="mt-4 text-metin-yumusak italic">
                  İçerik kaldırıldı.
                </p>
              )}

              {/* YORUMLAR */}
              <div className="mt-5 border-t border-cizgi pt-4">
                <p className="flex items-center gap-1.5 text-sm font-medium text-metin-yumusak">
                  <MessageCircle size={14} aria-hidden />
                  {gonderi.yorumlar.length} yorum
                </p>

                {gonderi.yorumlar.length > 0 && (
                  <ul className="mt-3 space-y-3">
                    {gonderi.yorumlar.map((yorum) => {
                      const yorumGorunur = gizliIcerikGorunurMu({
                        gizlendiMi: yorum.gizlendiMi,
                        gozetimYetkisiVarMi: gozetimYetkisi,
                      });
                      const yorumGizlenebilir =
                        !yorum.gizlendiMi &&
                        (gozetimYetkisi ||
                          yorum.yazanKullaniciId === kullanici.id);

                      return (
                        <li
                          key={yorum.id}
                          className={`flex items-start gap-3 rounded-kart px-3 py-2 ${
                            yorum.gizlendiMi ? "bg-uyari-zemin" : "bg-zemin"
                          }`}
                        >
                          <Cember
                            ad={yorum.yazan.ad}
                            soyad={yorum.yazan.soyad}
                          />
                          <div className="min-w-0 grow">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="text-sm font-semibold text-baslik">
                                {yorum.yazan.ad} {yorum.yazan.soyad}
                                <span className="ml-2 text-xs font-normal text-metin-yumusak">
                                  {unvanYaz(yorum.yazan)}
                                </span>
                              </span>
                              <span className="text-xs text-metin-yumusak">
                                {tarihSaatYaz(yorum.olusturmaTarihi)}
                              </span>
                            </div>

                            {yorum.gizlendiMi && (
                              <p className="mt-0.5 text-xs font-medium text-uyari-metin">
                                Bu yorum{" "}
                                {yorum.gizleyen
                                  ? `${yorum.gizleyen.ad} ${yorum.gizleyen.soyad}`
                                  : "bir yetkili"}{" "}
                                tarafından kaldırıldı.
                              </p>
                            )}

                            {yorumGorunur ? (
                              <MetinBaglantili
                                metin={yorum.icerik}
                                className="mt-1 whitespace-pre-line text-sm text-metin"
                              />
                            ) : (
                              <p className="mt-1 text-sm text-metin-yumusak italic">
                                İçerik kaldırıldı.
                              </p>
                            )}
                          </div>

                          {yorumGizlenebilir && (
                            <form action={yorumGizleEylemi}>
                              <input
                                type="hidden"
                                name="yorumId"
                                value={yorum.id}
                              />
                              <button
                                type="submit"
                                className="text-xs font-medium text-metin-yumusak transition hover:text-hata-metin"
                                aria-label="Yorumu kaldır"
                              >
                                <EyeOff size={13} aria-hidden />
                              </button>
                            </form>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/*
                  KALDIRILMIŞ GÖNDERİYE YORUM YAZILMAZ. Form basılmıyor ve kapı
                  sunucuda da duruyor (bkz. eylemler.ts · yorumYazEylemi).
                */}
                {!gonderi.gizlendiMi && (
                  <form
                    action={yorumYazEylemi}
                    className="mt-3 flex items-start gap-3"
                  >
                    <input
                      type="hidden"
                      name="gonderiId"
                      value={gonderi.id}
                    />
                    <Cember ad={ben.ad} soyad={ben.soyad} />
                    <div className="min-w-0 grow space-y-2">
                      <label className="block">
                        <span className="sr-only">Yorumunuz</span>
                        <input
                          type="text"
                          name="icerik"
                          required
                          maxLength={YORUM_MAKS}
                          placeholder="Yorum yaz…"
                          className={SINIF_GIRDI}
                        />
                      </label>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-full border border-vurgu px-4 py-1.5 text-sm font-semibold text-vurgu-metin transition hover:bg-vurgu-zemin"
                      >
                        Gönder
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </Kart>
          );
        })
      )}
    </div>
  );
}
