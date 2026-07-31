import {
  Award,
  CalendarCheck,
  ExternalLink,
  Package,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type { KatilimBicimi, KazanimTipi } from "@/generated/prisma/enums";
import { KapsamRozeti, KategoriRozeti } from "@/components/FaaliyetRozetleri";
import { Kart, KartBasligi } from "@/components/ui";
import type { KazanimSonucu } from "@/lib/kazanim/getir";
import {
  KATILIM_BICIMI_ETIKETLERI,
  type KazanimSahibi,
  kazanimTipiTanimi,
  kazanimTipleri,
} from "@/lib/kazanim/kurallar";
import { tarihYaz } from "@/lib/tarih";

/**
 * Profil bölümlerinin her ekranda aynı görünen hâli.
 *
 * Kişinin kendi profili (`/panel/profil`), yetkilinin gördüğü detay
 * (`/panel/ogrenciler/[id]`, `/panel/ogretmenler/[id]`) ve katkı ekranı aynı
 * bileşenleri kullanır: ekranlar ayrı ayrı yazılsaydı birine eklenen bir alan
 * diğerinde sessizce eksik kalırdı. Fark yalnızca DÜZENLEME haklarındadır —
 * silme formu ilgili eylem verilmediğinde hiç basılmaz.
 *
 * Kazanım bölümleri öğretmende de kullanılır; metinler `sahip` ile ayrılır
 * (bkz. lib/kazanim/kurallar.ts).
 */

export function SaltOkunurAlan({
  etiket,
  deger,
}: {
  etiket: string;
  deger: string | null;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-metin-yumusak">{etiket}</dt>
      <dd className="mt-0.5 text-metin">{deger?.trim() ? deger : "—"}</dd>
    </div>
  );
}

export interface KazanimSatiri {
  id: number;
  tip: KazanimTipi;
  baslik: string;
  aciklama: string | null;
  tarih: Date | null;
  baglantiUrl: string | null;
  derece: string | null;
  duzenleyen: string | null;
  katilimBicimi: KatilimBicimi | null;
  hedefKitle: string | null;
}

function KazanimSatiriGosterimi({
  kazanim,
  silmeEylemi,
}: {
  kazanim: KazanimSatiri;
  silmeEylemi?: (veri: FormData) => Promise<void>;
}) {
  const altBilgiler = [
    kazanim.duzenleyen,
    kazanim.katilimBicimi
      ? KATILIM_BICIMI_ETIKETLERI[kazanim.katilimBicimi]
      : null,
    kazanim.hedefKitle ? `Hedef kitle: ${kazanim.hedefKitle}` : null,
    kazanim.tarih ? tarihYaz(kazanim.tarih) : null,
  ].filter((deger): deger is string => Boolean(deger));

  return (
    <li className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium text-metin">
          {kazanim.baslik}
          {kazanim.derece && (
            <span className="rounded-full bg-olumlu-zemin px-2 py-0.5 text-xs font-semibold text-olumlu-metin">
              {kazanim.derece}
            </span>
          )}
        </p>
        {altBilgiler.length > 0 && (
          <p className="mt-1 text-sm text-metin-yumusak">
            {altBilgiler.join(" · ")}
          </p>
        )}
        {kazanim.aciklama && (
          <p className="mt-1.5 text-sm whitespace-pre-line text-metin">
            {kazanim.aciklama}
          </p>
        )}
        {kazanim.baglantiUrl && (
          <a
            /*
             * Adres öğrenci beyanıdır ve dış siteye çıkar: `noopener noreferrer`
             * olmadan açılan sayfa `window.opener` üzerinden bu sekmeyi
             * yönlendirebilir. Protokol kontrolü kayıt sırasında yapılır
             * (bkz. lib/ogrenci/kazanim-kurallar.ts).
             */
            href={kazanim.baglantiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin underline underline-offset-2"
          >
            <ExternalLink size={14} aria-hidden />
            Bağlantıyı aç
          </a>
        )}
      </div>
      {silmeEylemi && (
        <form action={silmeEylemi}>
          <input type="hidden" name="kazanimId" value={kazanim.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin-yumusak transition hover:bg-zemin hover:text-hata-metin"
            aria-label={`${kazanim.baslik} kaydını sil`}
          >
            <Trash2 size={14} aria-hidden />
            Sil
          </button>
        </form>
      )}
    </li>
  );
}

/**
 * Kazanım kayıtları, türlerine göre dört bölümde.
 *
 * Boş türler de başlıklarıyla görünür: bakan kişi "bu kişi ürün girmemiş" ile
 * "ürün bölümü diye bir şey yok" arasındaki farkı görebilmeli.
 */
export function KazanimBolumleri({
  kazanimlar,
  silmeEylemi,
  bosMesaji,
  sahip = "OGRENCI",
}: {
  kazanimlar: KazanimSatiri[];
  silmeEylemi?: (veri: FormData) => Promise<void>;
  bosMesaji: string;
  sahip?: KazanimSahibi;
}) {
  return (
    <div className="space-y-6">
      {kazanimTipleri(sahip).map((tanim) => {
        const kayitlar = kazanimlar.filter((kazanim) => kazanim.tip === tanim.tip);
        return (
          <div key={tanim.tip}>
            <h3 className="text-sm font-semibold text-baslik">
              {tanim.baslik}
              <span className="ml-2 font-normal text-metin-yumusak">
                {kayitlar.length}
              </span>
            </h3>
            {kayitlar.length === 0 ? (
              <p className="mt-1.5 text-sm text-metin-yumusak">{bosMesaji}</p>
            ) : (
              <ul className="mt-2 divide-y divide-cizgi">
                {kayitlar.map((kazanim) => (
                  <KazanimSatiriGosterimi
                    key={kazanim.id}
                    kazanim={kazanim}
                    silmeEylemi={silmeEylemi}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * "Yaptığım ürünler" — kazanım kayıtlarının URUN tipi, kendi kartında.
 *
 * Aynı veri profildeki dört bölümlü listede de duruyor ama orada bir satır
 * olarak kalıyor. Ürün kişinin ortaya koyduğu SOMUT iştir ve dört başlıktan
 * biri değil, kendi başına bir vitrindir: bu yüzden ızgara düzeninde, bağlantısı
 * öne çıkarılmış olarak ayrıca gösteriliyor.
 */
export function UrunlerKarti({
  urunler,
  kendiMi,
  sahip = "OGRENCI",
}: {
  urunler: KazanimSatiri[];
  kendiMi: boolean;
  sahip?: KazanimSahibi;
}) {
  const tanim = kazanimTipiTanimi("URUN", sahip);

  return (
    <Kart>
      <KartBasligi
        baslik={kendiMi ? "Yaptığım ürünler" : "Yaptığı ürünler"}
        aciklama={tanim.aciklama}
        Ikon={Package}
      />

      {urunler.length === 0 ? (
        <p className="text-metin-yumusak">
          {kendiMi ? (
            /*
              Öğrenciye "sen", öğretmene "siz" diye sesleniliyor: panelin geri
              kalanı da böyle ve tek bir metni ikisine birden uydurmaya
              çalışmak, ikisine de yabancı bir dil üretirdi.
            */
            sahip === "OGRENCI" ? (
              <>
                Henüz ürün eklemedin. Geliştirdiğin bir site, uygulama, oyun ya
                da film varsa{" "}
                <Link
                  href="/panel/profil?tur=URUN"
                  className="font-medium text-vurgu-metin underline underline-offset-2"
                >
                  profilinden ekleyebilirsin
                </Link>
                .
              </>
            ) : (
              <>
                Henüz ürün eklemediniz. Geliştirdiğiniz bir site, uygulama, ders
                materyali ya da film varsa{" "}
                <Link
                  href="/panel/profil?tur=URUN"
                  className="font-medium text-vurgu-metin underline underline-offset-2"
                >
                  profilinizden ekleyebilirsiniz
                </Link>
                .
              </>
            )
          ) : (
            "Henüz ürün kaydı girilmemiş."
          )}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {urunler.map((urun) => (
            <li
              key={urun.id}
              className="rounded-kart border border-cizgi bg-zemin p-4"
            >
              <p className="font-semibold text-metin">{urun.baslik}</p>
              {urun.tarih && (
                <p className="mt-0.5 text-sm text-metin-yumusak">
                  {tarihYaz(urun.tarih)}
                </p>
              )}
              {urun.aciklama && (
                <p className="mt-2 text-sm whitespace-pre-line text-metin">
                  {urun.aciklama}
                </p>
              )}
              {/*
                Silme burada YOK: kart bir vitrindir, kayıtların düzenlendiği
                yer profildir. Buraya da silme koymak, işlem sonrası kullanıcıyı
                hiç istemediği bir ekrana (profil) atardı.
              */}
              {urun.baglantiUrl && (
                <a
                  href={urun.baglantiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin underline underline-offset-2"
                >
                  <ExternalLink size={14} aria-hidden />
                  Ürünü aç
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {kendiMi && urunler.length > 0 && (
        <Link
          href="/panel/profil?tur=URUN"
          className="mt-4 inline-block text-sm font-medium text-vurgu-metin underline underline-offset-2"
        >
          Yeni ürün ekle
        </Link>
      )}
    </Kart>
  );
}

/**
 * Katıldığı GençTek etkinlikleri.
 *
 * Bu liste kazanım kayıtlarından FARKLIDIR: beyan değil, başvuru geçmişinden
 * türetilir (seçildiği ve tarihi geçmiş, iptal edilmemiş faaliyetler). Bu yüzden
 * elle eklenip silinemez.
 */
export function KatildigiEtkinlikler({
  kazanim,
  baglantiVerilsinMi = true,
}: {
  kazanim: KazanimSonucu;
  /** Faaliyet detayına bağlantı; kapsam dışı kişiye link vermenin anlamı yok. */
  baglantiVerilsinMi?: boolean;
}) {
  if (kazanim.katilimlar.length === 0) {
    return (
      <p className="text-metin-yumusak">
        Tamamlanmış bir GençTek etkinliği katılımı yok.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-cizgi">
      {kazanim.katilimlar.map((katilim) => (
        <li key={katilim.faaliyetId} className="py-3 first:pt-0 last:pb-0">
          {baglantiVerilsinMi ? (
            <Link
              href={`/panel/faaliyetler/${katilim.faaliyetId}`}
              className="font-medium text-metin transition hover:text-vurgu-metin"
            >
              {katilim.ad}
            </Link>
          ) : (
            <span className="font-medium text-metin">{katilim.ad}</span>
          )}
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
  );
}

/** Rozet özeti — profilde tek satır; ayrıntı `/panel/kazanimlarim` ekranında. */
export function RozetOzeti({ kazanim }: { kazanim: KazanimSonucu }) {
  const kazanilan = kazanim.rozetler.filter((rozet) => rozet.kazanildiMi);
  if (kazanilan.length === 0) return null;

  return (
    <Kart>
      <KartBasligi
        baslik="Rozetler"
        aciklama="Katılım geçmişinden otomatik hesaplanır; elle verilmez."
        Ikon={Award}
      />
      <ul className="flex flex-wrap gap-2">
        {kazanilan.map((rozet) => (
          <li
            key={rozet.kod}
            className="inline-flex items-center gap-1.5 rounded-full bg-olumlu-zemin px-3 py-1 text-sm font-medium text-olumlu-metin"
            title={rozet.aciklama}
          >
            <Award size={14} aria-hidden />
            {rozet.ad}
          </li>
        ))}
      </ul>
    </Kart>
  );
}

/** Katılım geçmişi kartı — başlığı iki ekranda da aynı. */
export function KatilimKarti({
  kazanim,
  baglantiVerilsinMi = true,
}: {
  kazanim: KazanimSonucu;
  baglantiVerilsinMi?: boolean;
}) {
  return (
    <Kart>
      <KartBasligi
        baslik="Katıldığı GençTek etkinlikleri"
        aciklama={`${kazanim.ozet.toplamKatilim} etkinlik · başvuru geçmişinden türetilir, elle girilmez.`}
        Ikon={CalendarCheck}
      />
      <KatildigiEtkinlikler
        kazanim={kazanim}
        baglantiVerilsinMi={baglantiVerilsinMi}
      />
    </Kart>
  );
}
