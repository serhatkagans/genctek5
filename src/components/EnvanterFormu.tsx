import { Save, Trash2 } from "lucide-react";
import {
  BilgiKutusu,
  Kart,
  SINIF_BIRINCIL_BUTON,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { ilerleme } from "@/lib/envanter/kurallar";
import type { EnvanterTanimi } from "@/lib/envanter/tanimlar";

/**
 * Envanter çözme formu (E).
 *
 * SUNUCU BİLEŞENİ, JavaScript YOK. Sayfanın geri kalanı gibi sunucuda basılıyor
 * ve gönderim düz bir form eylemi. İlerleme çubuğu canlı güncellenmiyor — her
 * kaydetmede yenileniyor; canlı sayaç için tek başına bir istemci bileşeni
 * eklemek, bu ekranın tek JavaScript bağımlılığı olurdu.
 *
 * MADDELER TEK SAYFADA. Sayfalama yapılmadı: 20–25 madde tek ekranda kaydırma
 * ile rahat okunur ve sayfalama, her geçişte kaydetme–yükleme turu demekti.
 * Yarım bırakan zaten "Kaydet"e basıp çıkabiliyor.
 *
 * BOYUTA GÖRE GRUPLANMIYOR. Maddeler tanımdaki sırayla basılıyor ve hangi
 * maddenin hangi başlığı beslediği EKRANDA YAZMIYOR: "bu bölüm liderliği
 * ölçüyor" diye başlık koymak, öğrenciyi istediği sonuca göre cevap vermeye
 * çağırırdı.
 */

type Eylem = (veri: FormData) => Promise<void>;

export function EnvanterFormu({
  tanim,
  mevcutCevaplar,
  eylem,
  silmeEylemi,
  uygulamaId,
  surumKaydiMi,
}: {
  tanim: EnvanterTanimi;
  mevcutCevaplar: readonly { maddeKodu: string; deger: number }[];
  eylem: Eylem;
  silmeEylemi: Eylem;
  uygulamaId: number;
  /** Yarım çözüm, tanımın güncel sürümünden eskiyse. */
  surumKaydiMi: boolean;
}) {
  const secilenler = new Map(mevcutCevaplar.map((c) => [c.maddeKodu, c.deger]));
  const durum = ilerleme(
    tanim,
    mevcutCevaplar.map((c) => c.maddeKodu),
  );

  return (
    <div className="space-y-4">
      {surumKaydiMi && (
        <BilgiKutusu cesit="uyari">
          Bu envanterin maddeleri sen çözmeye başladıktan sonra güncellendi.
          Yarım kalan çözümün kaydedilemez; aşağıdan silip yeniden başlaman
          gerekiyor. Eski cevaplarla yeni maddeleri karıştırmak, sana yanlış bir
          sonuç gösterirdi.
        </BilgiKutusu>
      )}

      <Kart>
        <p className="text-metin">{tanim.yonerge}</p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-metin-yumusak">
            <span>
              {durum.toplam} maddenin {durum.cevaplanan}&apos;i işaretlendi
            </span>
            <span>%{durum.yuzde}</span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-yuzey-ikincil"
            role="progressbar"
            aria-valuenow={durum.yuzde}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tamamlanma oranı"
          >
            <div
              className="h-full bg-vurgu transition-all"
              style={{ width: `${durum.yuzde}%` }}
            />
          </div>
        </div>
      </Kart>

      <form action={eylem} className="space-y-4">
        <input type="hidden" name="envanterKodu" value={tanim.kod} />

        <ol className="space-y-3">
          {tanim.maddeler.map((madde, sira) => {
            const secili = secilenler.get(madde.kod);
            return (
              <li key={madde.kod}>
                <fieldset
                  disabled={surumKaydiMi}
                  className="rounded-kart border border-cizgi bg-kart p-4 disabled:opacity-60"
                >
                  <legend className="sr-only">{madde.metin}</legend>
                  <p className="text-metin">
                    <span className="mr-2 text-metin-yumusak">{sira + 1}.</span>
                    {madde.metin}
                  </p>
                  {/*
                    Radyo grubu; her madde kendi adını taşıyor. Ad `madde:` ile
                    başlıyor — sunucu eylemi form alanlarını bu ön ekle ayırıyor
                    ve ayıklamak için ikinci bir liste tutmak gerekmiyor.
                  */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tanim.olcek.map((secenek) => (
                      <label
                        key={secenek.deger}
                        className="flex cursor-pointer items-center gap-1.5 rounded-md border border-cizgi px-3 py-1.5 text-sm text-metin transition hover:bg-zemin has-[:checked]:border-vurgu has-[:checked]:bg-vurgu-yumusak has-[:checked]:font-medium has-[:checked]:text-vurgu-metin"
                      >
                        <input
                          type="radio"
                          name={`madde:${madde.kod}`}
                          value={secenek.deger}
                          defaultChecked={secili === secenek.deger}
                          className="sr-only"
                        />
                        {secenek.etiket}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>

        {!surumKaydiMi && (
          <Kart className="flex flex-wrap items-center gap-3">
            {/*
              İKİ DÜĞME, TEK EYLEM. Ayrımı `niyet` taşıyor; ikisi de aynı
              kaydetme yolundan geçiyor, yalnızca sonu farklı. "Tamamla" eksik
              madde varsa reddedilir ama CEVAPLAR YİNE DE KAYDEDİLİR — yoksa
              erken basan öğrenci işaretlediklerini kaybederdi.
            */}
            <button
              type="submit"
              name="niyet"
              value="tamamla"
              className={SINIF_BIRINCIL_BUTON}
            >
              Tamamla ve sonucumu gör
            </button>
            <button
              type="submit"
              name="niyet"
              value="kaydet"
              className={SINIF_IKINCIL_BUTON}
            >
              <Save size={15} aria-hidden />
              Kaydet, sonra devam edeyim
            </button>
          </Kart>
        )}
      </form>

      <form action={silmeEylemi}>
        <input type="hidden" name="envanterKodu" value={tanim.kod} />
        <input type="hidden" name="uygulamaId" value={uygulamaId} />
        <button type="submit" className="text-sm text-hata-metin hover:underline">
          <Trash2 size={13} className="mr-1 inline" aria-hidden />
          Yarım kalan çözümü sil, baştan başla
        </button>
      </form>
    </div>
  );
}
