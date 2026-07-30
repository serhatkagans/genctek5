import { Award, CalendarCheck, Lock } from "lucide-react";
import Link from "next/link";
import { KapsamRozeti, KategoriRozeti } from "@/components/FaaliyetRozetleri";
import { BilgiKutusu, Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { kazanimlariGetir } from "@/lib/kazanim/getir";
import { tarihYaz } from "@/lib/tarih";
import { ogrenciMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * Kazanımlarım — öğrencinin katılım geçmişi ve rozetleri.
 *
 * Ekran yalnızca öğrenciye açıktır ve yalnızca KENDİ verisini gösterir; başka
 * bir öğrencinin kazanımına bakmanın bir yolu yoktur, bu yüzden ayrıca kapsam
 * filtresi kurulmaz — sorgu oturumdaki kişiye sabitlenmiştir.
 */
export default async function KazanimlarimSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ogrenciMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Kazanımlarım"
          aciklama="Bu ekran öğrencilerin katılım geçmişini gösterir."
        />
      </Kart>
    );
  }

  const { rozetler, ozet, katilimlar } = await kazanimlariGetir(kullanici.id);
  const kazanilan = rozetler.filter((rozet) => rozet.kazanildiMi);
  const bekleyen = rozetler.filter((rozet) => !rozet.kazanildiMi);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Kazanımlarım"
        aciklama={`${ozet.toplamKatilim} faaliyete katıldın · ${kazanilan.length}/${rozetler.length} rozet`}
      />

      <Kart>
        <KartBasligi
          baslik="Rozetlerim"
          aciklama="Rozetler katılım geçmişinden otomatik hesaplanır; başvuru gerektirmez."
          Ikon={Award}
        />

        {kazanilan.length === 0 ? (
          <p className="text-metin-yumusak">
            Henüz rozetin yok. İlk faaliyetine katıldığında burası dolmaya
            başlayacak.
          </p>
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
                <p className="mt-1 text-sm text-olumlu-metin">
                  {rozet.aciklama}
                </p>
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

      <Kart>
        <KartBasligi
          baslik="Katıldığım faaliyetler"
          aciklama="Seçildiğin ve tarihi geçmiş faaliyetler burada listelenir."
          Ikon={CalendarCheck}
        />
        {katilimlar.length === 0 ? (
          <p className="text-metin-yumusak">
            Henüz tamamlanmış bir faaliyetin yok.{" "}
            <Link
              href="/panel/faaliyetler"
              className="font-medium text-vurgu-metin underline underline-offset-2"
            >
              Açık faaliyetlere göz at
            </Link>
            .
          </p>
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

      <BilgiKutusu>
        Bir faaliyete seçildiysen rozet, etkinliğin tarihi geçtikten sonra
        eklenir. İptal edilen faaliyetler sayılmaz.
      </BilgiKutusu>
    </div>
  );
}
