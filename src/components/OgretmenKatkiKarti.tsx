import { BadgeCheck, CalendarPlus, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { Kart, KartBasligi } from "@/components/ui";
import type {
  FaaliyetDurumu,
  Kapsam,
  OnayDurumu,
  RolKodu,
} from "@/generated/prisma/enums";
import {
  KAPSAM_ETIKETLERI,
  ONAY_DURUMU_ETIKETLERI,
} from "@/lib/faaliyet/kurallar";
import { gorevYillari, gorevYillariYaz } from "@/lib/ogretmen/gorev-yillari";
import { tarihYaz } from "@/lib/tarih";
import { ROL_ETIKETLERI } from "@/lib/yetki/etiketler";

/**
 * Öğretmenin ekosisteme koyduğu emeğin tek kartta toplanmış hâli: üstlendiği
 * görevler, danışmanlığı ve düzenlediği faaliyetler.
 *
 * Öğrencinin katkı kartıyla (bkz. KatkiKarti.tsx) aynı düzeni kullanır ama aynı
 * bileşen DEĞİLDİR: içerik bambaşkadır. Öğrencide temsilcilik ve çalışma grubu
 * seçimi vardır, öğretmende görev geçmişi ve danışmanlık. Tek bileşene
 * sıkıştırılsaydı her iki ekranda da sürekli boş kalan bölümler olurdu.
 */

export interface OgretmenKatkiGorevi {
  id: number;
  rolKodu: RolKodu;
  ilKodu: string | null;
  baslangicTarihi: Date;
  /** null ise görev sürüyor. */
  bitisTarihi: Date | null;
}

export interface OgretmenKatkiFaaliyeti {
  id: number;
  ad: string;
  tarih: Date;
  kapsam: Kapsam;
  durum: FaaliyetDurumu;
  onayDurumu: OnayDurumu;
}

function BolumBasligi({
  Ikon,
  baslik,
  adet,
}: {
  Ikon: React.ComponentType<{ size?: number; className?: string }>;
  baslik: string;
  adet: number;
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-baslik">
      <Ikon size={15} className="text-vurgu-metin" />
      {baslik}
      <span className="font-normal text-metin-yumusak">{adet}</span>
    </h3>
  );
}

export function OgretmenKatkiKarti({
  kendiMi,
  gorevler,
  aktifDanismanlik,
  faaliyetler,
}: {
  /** Metinler "siz" ve "o" arasında bu bayrakla ayrılır. */
  kendiMi: boolean;
  gorevler: OgretmenKatkiGorevi[];
  aktifDanismanlik: number;
  faaliyetler: OgretmenKatkiFaaliyeti[];
}) {
  const surenGorevler = gorevler.filter((gorev) => gorev.bitisTarihi === null);

  return (
    <Kart>
      <KartBasligi
        baslik={kendiMi ? "Katkı kartım" : "Katkı kartı"}
        aciklama={
          kendiMi
            ? "Üstlendiğiniz görevler, danışmanlığınız ve düzenlediğiniz etkinlikler. Biten görevler de kalır; geçmiş emek silinmez."
            : "Öğretmenin görevleri, danışmanlığı ve düzenlediği etkinlikler."
        }
        Ikon={Sparkles}
      />

      <div className="space-y-6">
        <div>
          <BolumBasligi
            Ikon={BadgeCheck}
            baslik="Görevler"
            adet={gorevler.length}
          />
          {gorevler.length === 0 ? (
            <p className="mt-1.5 text-sm text-metin-yumusak">
              {kendiMi
                ? "Henüz bir görev üstlenmediniz. Danışman öğretmenliği için profilinizdeki kutuyu işaretlemeniz yeterli."
                : "Görev üstlenilmemiş."}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {gorevler.map((gorev) => (
                <li key={gorev.id} className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-vurgu-zemin px-3 py-1 text-sm text-vurgu-metin">
                    <BadgeCheck size={14} aria-hidden />
                    {ROL_ETIKETLERI[gorev.rolKodu]}
                    {gorev.ilKodu && (
                      <span className="text-xs opacity-80">{gorev.ilKodu}</span>
                    )}
                  </span>
                  <span className="text-sm text-metin-yumusak">
                    {/*
                      Görev, tarih aralığı yerine eğitim-öğretim yılıyla
                      yazılıyor: okul takviminde "12 Ekim 2024 — sürüyor"dan çok
                      "2024-2025" konuşuluyor.
                    */}
                    {gorevYillariYaz(gorevYillari([gorev]))}
                    {gorev.bitisTarihi
                      ? ` · ${tarihYaz(gorev.bitisTarihi)} tarihinde bitti`
                      : " · sürüyor"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <BolumBasligi
            Ikon={Users}
            baslik="Danışmanlık"
            adet={aktifDanismanlik}
          />
          <p className="mt-1.5 text-sm text-metin-yumusak">
            {aktifDanismanlik === 0
              ? kendiMi
                ? "Şu anda danışmanlığınızda öğrenci yok."
                : "Aktif danışmanlığı yok."
              : `${aktifDanismanlik} öğrencinin danışmanlığı sürüyor.`}
          </p>
          {kendiMi && aktifDanismanlik > 0 && (
            <Link
              href="/panel/ogrenciler"
              className="mt-2 inline-block text-sm font-medium text-vurgu-metin underline underline-offset-2"
            >
              Öğrencilerimi gör
            </Link>
          )}
        </div>

        <div>
          <BolumBasligi
            Ikon={CalendarPlus}
            baslik="Düzenlediği etkinlikler"
            adet={faaliyetler.length}
          />
          {faaliyetler.length === 0 ? (
            <p className="mt-1.5 text-sm text-metin-yumusak">
              {kendiMi
                ? "Henüz etkinlik açmadınız."
                : "Henüz etkinlik açılmamış."}
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-cizgi">
              {faaliyetler.map((faaliyet) => (
                <li key={faaliyet.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link
                    href={`/panel/etkinlikler/${faaliyet.id}`}
                    className="font-medium text-metin transition hover:text-vurgu-metin"
                  >
                    {faaliyet.ad}
                  </Link>
                  <p className="mt-0.5 text-sm text-metin-yumusak">
                    {tarihYaz(faaliyet.tarih)} ·{" "}
                    {KAPSAM_ETIKETLERI[faaliyet.kapsam]} ·{" "}
                    {faaliyet.durum === "IPTAL_EDILDI"
                      ? "İptal edildi"
                      : ONAY_DURUMU_ETIKETLERI[faaliyet.onayDurumu]}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {kendiMi && (
            <Link
              href="/panel/etkinlikler/yeni"
              className="mt-2 inline-block text-sm font-medium text-vurgu-metin underline underline-offset-2"
            >
              Yeni etkinlik aç
            </Link>
          )}
        </div>
      </div>

      {kendiMi && surenGorevler.length === 0 && gorevler.length > 0 && (
        <p className="mt-5 border-t border-cizgi pt-4 text-sm text-metin-yumusak">
          Şu anda süren bir göreviniz görünmüyor. Geçmiş görevleriniz kartta
          kalmaya devam eder.
        </p>
      )}
    </Kart>
  );
}
