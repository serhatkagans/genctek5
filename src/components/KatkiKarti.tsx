import { BadgeCheck, CalendarPlus, Layers, Sparkles } from "lucide-react";
import Link from "next/link";
import { Kart, KartBasligi } from "@/components/ui";
import type {
  FaaliyetDurumu,
  GorevRolKodu,
  OnayDurumu,
} from "@/generated/prisma/enums";
import { ONAY_DURUMU_ETIKETLERI } from "@/lib/faaliyet/kurallar";
import { tarihYaz } from "@/lib/tarih";
import { gorevRolAdi } from "@/lib/yetki/etiketler";

/**
 * Öğrencinin ekosisteme koyduğu emeğin TEK kartta toplanmış hâli:
 * temsilcilikleri, çalışma grupları ve düzenlediği faaliyetler.
 *
 * Üçü ayrı kartlarda dururken hiçbiri tek başına "bu öğrenci ne yapıyor"
 * sorusunu cevaplamıyordu; temsilcilik danışman kartının dibinde, gruplar
 * bambaşka bir kartta, düzenlediği faaliyetler ise hiç görünmüyordu. Kart aynı
 * bileşenden hem öğrencinin kendi ekranına hem danışman/koordinatörün gördüğü
 * profile basılır — iki ekran ayrı yazılsaydı birine eklenen bölüm ötekinde
 * eksik kalırdı.
 */

export interface KatkiGorevi {
  rolKodu: GorevRolKodu;
  egitimOgretimYili: string;
  il?: { ad: string } | null;
  ilce?: { ad: string } | null;
  kurum?: { ad: string } | null;
}

export interface KatkiGrubu {
  calismaGrubuId: number;
  secimTarihi: Date;
  calismaGrubu: { ad: string; aktif: boolean };
  ekleyen?: { ad: string; soyad: string } | null;
}

export interface KatkiFaaliyeti {
  id: number;
  ad: string;
  tarih: Date;
  durum: FaaliyetDurumu;
  onayDurumu: OnayDurumu;
}

const SINIF_ROZET =
  "inline-flex items-center gap-1.5 rounded-full bg-rol-ogrenci-zemin px-3 py-1 text-sm text-rol-ogrenci-metin";

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

export function KatkiKarti({
  kendiMi,
  gorevler,
  gruplar,
  faaliyetler,
  egitimOgretimYili,
}: {
  /** Metinler "sen" ve "o" arasında bu bayrakla ayrılır. */
  kendiMi: boolean;
  gorevler: KatkiGorevi[];
  gruplar: KatkiGrubu[];
  faaliyetler: KatkiFaaliyeti[];
  /** İçinde bulunulan dönem; geçmiş dönem görevleri ayrıca işaretlenir. */
  egitimOgretimYili: string;
}) {
  return (
    <Kart>
      <KartBasligi
        baslik={kendiMi ? "Katkı kartım" : "Katkı kartı"}
        aciklama={
          kendiMi
            ? "Temsilciliklerin, çalışma grupların ve düzenlediğin faaliyetler. Temsilcilikleri koordinatörün ya da danışmanın verir; grup seçimini sen yaparsın."
            : "Öğrencinin temsilcilikleri, çalışma grupları ve düzenlediği faaliyetler."
        }
        Ikon={Sparkles}
      />

      <div className="space-y-6">
        <div>
          <BolumBasligi
            Ikon={BadgeCheck}
            baslik="Temsilcilikler"
            adet={gorevler.length}
          />
          {gorevler.length === 0 ? (
            <p className="mt-1.5 text-sm text-metin-yumusak">
              {kendiMi
                ? "Henüz bir temsilciliğin yok."
                : "Temsilcilik görevi verilmemiş."}
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {gorevler.map((gorev) => (
                <li
                  key={`${gorev.rolKodu}-${gorev.egitimOgretimYili}`}
                  className={SINIF_ROZET}
                >
                  <BadgeCheck size={14} aria-hidden />
                  {gorevRolAdi(gorev)}
                  {/*
                   * Geçmiş dönem görevi silinmez, dönemiyle birlikte durur:
                   * "geçen yıl il temsilcisiydi" bir katkıdır ve kartın işi
                   * tam olarak bunu göstermektir.
                   */}
                  {gorev.egitimOgretimYili !== egitimOgretimYili && (
                    <span className="text-xs opacity-80">
                      {gorev.egitimOgretimYili}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <BolumBasligi
            Ikon={Layers}
            baslik="Çalışma grupları"
            adet={gruplar.length}
          />
          {gruplar.length === 0 ? (
            <p className="mt-1.5 text-sm text-metin-yumusak">
              {kendiMi
                ? "Henüz çalışma grubu seçmedin."
                : "Çalışma grubu seçilmemiş."}
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {gruplar.map((secim) => (
                <li
                  key={secim.calismaGrubuId}
                  className="inline-flex items-center gap-1.5 rounded-full bg-vurgu-zemin px-3 py-1 text-sm text-vurgu-metin"
                  title={
                    secim.ekleyen
                      ? `${secim.ekleyen.ad} ${secim.ekleyen.soyad} ekledi`
                      : "kendi seçimi"
                  }
                >
                  {secim.calismaGrubu.ad}
                  {!secim.calismaGrubu.aktif && (
                    <span className="rounded-full bg-uyari-zemin px-2 text-xs text-uyari-metin">
                      kapatıldı
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {kendiMi && (
            <Link
              href="/panel/calisma-gruplari"
              className="mt-2 inline-block text-sm font-medium text-vurgu-metin underline underline-offset-2"
            >
              Grup seçimimi düzenle
            </Link>
          )}
        </div>

        <div>
          <BolumBasligi
            Ikon={CalendarPlus}
            baslik="Düzenlediği faaliyetler"
            adet={faaliyetler.length}
          />
          {faaliyetler.length === 0 ? (
            <p className="mt-1.5 text-sm text-metin-yumusak">
              {kendiMi
                ? "Henüz faaliyet önermedin. Bir etkinlik kurmak istersen önerin il koordinatörüne ve YEĞİTEK'e onaya gider."
                : "Öğrenci henüz faaliyet önermedi."}
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-cizgi">
              {faaliyetler.map((faaliyet) => (
                <li key={faaliyet.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link
                    href={`/panel/faaliyetler/${faaliyet.id}`}
                    className="font-medium text-metin transition hover:text-vurgu-metin"
                  >
                    {faaliyet.ad}
                  </Link>
                  <p className="mt-0.5 text-sm text-metin-yumusak">
                    {tarihYaz(faaliyet.tarih)} ·{" "}
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
              href="/panel/faaliyetler/yeni"
              className="mt-2 inline-block text-sm font-medium text-vurgu-metin underline underline-offset-2"
            >
              Yeni faaliyet öner
            </Link>
          )}
        </div>
      </div>
    </Kart>
  );
}
