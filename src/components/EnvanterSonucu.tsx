import { BilgiKutusu, Kart } from "@/components/ui";
import {
  type BoyutPuani,
  type SonucDurumu,
  olcekUstSiniri,
  ozetCumlesi,
  puanlariSirala,
} from "@/lib/envanter/kurallar";
import { SONUC_CERCEVESI, type EnvanterTanimi } from "@/lib/envanter/tanimlar";
import { tarihYaz } from "@/lib/tarih";

/**
 * Envanter sonuç ekranı (E).
 *
 * SAYI DEĞİL, SIRA VE YORUM. Boyut puanı yüzde olarak da yazılıyor ama ekranın
 * taşıdığı asıl bilgi sıralama ve yorum: "%68" tek başına bir anlam taşımıyor
 * (norm çalışması yok, karşılaştırılacak bir grup ortalaması yok). Yüzde
 * yalnızca çubuğun uzunluğunu ve boyutlar arası göreli farkı gösteriyor.
 *
 * SIRALAMA YOK SAYILMIYOR ama "en iyi/en kötü" dili de kullanılmıyor: düşük
 * bantta bile metin "yapamazsın" demiyor (bkz. tanimlar.ts · dusukYorum).
 */

const BANT_SINIFI: Record<BoyutPuani["bant"], string> = {
  YUKSEK: "bg-olumlu-zemin text-olumlu-metin border-olumlu-cizgi",
  ORTA: "bg-yuzey-ikincil text-metin-yumusak border-cizgi",
  DUSUK: "bg-kart text-metin-yumusak border-cizgi",
};

const BANT_ETIKETI: Record<BoyutPuani["bant"], string> = {
  YUKSEK: "Öne çıkıyor",
  ORTA: "Ortada",
  DUSUK: "Şimdilik geride",
};

export function EnvanterSonucu({
  tanim,
  sonuc,
  tamamlanmaTarihi,
}: {
  tanim: EnvanterTanimi;
  sonuc: SonucDurumu;
  tamamlanmaTarihi: Date | null;
}) {
  /*
   * ESKİ SÜRÜM: puanlanmıyor ve bunun NEDENİ yazılıyor. Sessizce boş bir ekran
   * göstermek ya da yeni anahtarla puanlayıp bir sonuç uydurmak, ikisi de
   * kullanıcıyı yanıltırdı.
   */
  if (sonuc.durum === "ESKI_SURUM") {
    return (
      <Kart>
        <h2 className="text-lg font-semibold text-baslik">Sonuç gösterilemiyor</h2>
        <p className="mt-2 text-metin">
          Bu çözümü yaptıktan sonra envanterin maddeleri güncellendi. Eski
          cevaplarını yeni puanlamayla değerlendirmek yanlış bir sonuç
          üretirdi, bu yüzden gösterilmiyor.
        </p>
        <p className="mt-2 text-sm text-metin-yumusak">
          Güncel sonucunu görmek için envanteri yeniden çözebilirsin.
        </p>
      </Kart>
    );
  }

  if (sonuc.durum === "EKSIK") {
    return (
      <Kart>
        <h2 className="text-lg font-semibold text-baslik">Sonuç gösterilemiyor</h2>
        <p className="mt-2 text-metin">
          {sonuc.eksikMadde} madde cevapsız görünüyor. Boyutlar farklı sayıda
          maddeden hesaplanırsa birbiriyle karşılaştırılamaz — oysa bu ekranın
          yaptığı tam olarak bu karşılaştırma.
        </p>
      </Kart>
    );
  }

  const sirali = puanlariSirala(sonuc.puanlar);

  return (
    <div className="space-y-4">
      <Kart>
        <h2 className="text-lg font-semibold text-baslik">
          {ozetCumlesi(sonuc.puanlar)}
        </h2>
        {tamamlanmaTarihi && (
          <p className="mt-1 text-sm text-metin-yumusak">
            {tarihYaz(tamamlanmaTarihi)} tarihinde çözdün.
          </p>
        )}
        <p className="mt-3 text-sm text-metin-yumusak">{SONUC_CERCEVESI}</p>
      </Kart>

      <ol className="space-y-3">
        {sirali.map((puan) => (
          <li key={puan.boyut.kod}>
            <Kart>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-baslik">
                  {puan.boyut.ad}
                </h3>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${BANT_SINIFI[puan.bant]}`}
                >
                  {BANT_ETIKETI[puan.bant]}
                </span>
              </div>

              <p className="mt-1 text-sm text-metin-yumusak">
                {puan.boyut.aciklama}
              </p>

              <div className="mt-3 flex items-center gap-3">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-yuzey-ikincil"
                  role="progressbar"
                  aria-valuenow={puan.yuzde}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${puan.boyut.ad} puanı`}
                >
                  {/*
                    ÇUBUK RENGİ: yüksek bantta yeşil, diğerlerinde NÖTR gri.
                    Vurgu rengi (tema D'de kırmızı) kullanılmıyor — kırmızı bir
                    çubuk "kötü/uyarı" diye okunur ve ekranın söylediği şeyle
                    ("düşük çıkması bir eksiklik değil") çelişirdi. Aynı karar
                    Rotam'daki durum rozetlerinde de verilmişti: planlanan hedef
                    uyarı rengiyle boyanmıyor.
                  */}
                  <div
                    className={`h-full ${puan.bant === "YUKSEK" ? "bg-olumlu-cizgi" : "bg-cizgi"}`}
                    style={{ width: `${puan.yuzde}%` }}
                  />
                </div>
                {/*
                  Ham ortalama da yazılıyor ("3,4 / 5"): yüzde tek başına
                  "%60 başarılı" gibi okunabiliyor, oysa ölçeğin ortası olan
                  cevap %50 üretir. İkisi yan yana durunca sayının ne olduğu
                  belli oluyor.
                */}
                <span className="shrink-0 text-sm tabular-nums text-metin-yumusak">
                  {puan.ortalama.toLocaleString("tr-TR")} /{" "}
                  {olcekUstSiniri(tanim)}
                </span>
              </div>

              <p className="mt-3 text-sm text-metin">{puan.yorum}</p>
            </Kart>
          </li>
        ))}
      </ol>

      <BilgiKutusu>
        Bu sonucu kimse görmüyor: danışman öğretmenin, il koordinatörün ve
        merkez dâhil hiçbir yetkilinin ekranında yer almıyor. Paylaşmak
        istersen bunu kendin anlatırsın.
      </BilgiKutusu>
    </div>
  );
}
