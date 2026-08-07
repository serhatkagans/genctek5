import { Compass, Flag, Play, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import type { HedefDurumu } from "@/generated/prisma/enums";

import { Kart, KartBasligi, SINIF_GIRDI, SINIF_BIRINCIL_BUTON } from "@/components/ui";
import {
  HEDEF_ACIKLAMA_AZAMI,
  HEDEF_BASLIK_AZAMI,
  HEDEF_DURUM_ETIKETLERI,
  HEDEF_DURUM_SINIFLARI,
  hedefleriSirala,
  hedefOzeti,
} from "@/lib/hedef/kurallar";
import { tarihYaz } from "@/lib/tarih";

/**
 * "Rotam" — öğrencinin hedefleri (D6).
 *
 * Kazanım bölümlerinden AYRI bir bileşen: oradaki liste "yaptım" kayıtlarını
 * gösteriyor ve satır başına tür/kapsam/ek/bağlantı taşıyor; buradaki satırın
 * taşıdığı tek şey durum. Ortak bileşene zorlamak, her satırda kullanılmayan
 * yarım düzine alanın koşullarını sürüklemek olurdu.
 *
 * KART YALNIZCA KENDİ PROFİLİNDE BASILIR. Yetkilinin gördüğü öğrenci detay
 * sayfasına eklenmedi: hedef "yapmak istiyorum" beyanıdır ve istekte kimsenin
 * göreceği yazmıyor (bkz. şemadaki KullaniciHedefi notu).
 */

export interface HedefSatiri {
  id: number;
  baslik: string;
  aciklama: string | null;
  durum: HedefDurumu;
  hedefTarihi: Date | null;
}

type Eylem = (veri: FormData) => Promise<void>;

/** Satırdaki durum düğmesi — tek tıkla bir sonraki adıma taşır. */
function DurumDugmesi({
  hedefId,
  durum,
  etiket,
  Ikon,
  eylem,
}: {
  hedefId: number;
  durum: HedefDurumu;
  etiket: string;
  Ikon: typeof Play;
  eylem: Eylem;
}) {
  return (
    <form action={eylem}>
      <input type="hidden" name="hedefId" value={hedefId} />
      <input type="hidden" name="durum" value={durum} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin"
      >
        <Ikon size={14} aria-hidden />
        {etiket}
      </button>
    </form>
  );
}

function HedefSatiriGovdesi({
  hedef,
  durumEylemi,
  silmeEylemi,
}: {
  hedef: HedefSatiri;
  durumEylemi?: Eylem;
  silmeEylemi?: Eylem;
}) {
  const tamamlandi = hedef.durum === "TAMAMLANDI";

  return (
    <li className="rounded-lg border border-cizgi p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`font-medium ${
              tamamlandi ? "text-metin-yumusak line-through" : "text-baslik"
            }`}
          >
            {hedef.baslik}
          </p>
          {hedef.aciklama && (
            <p className="mt-1 whitespace-pre-line text-sm text-metin-yumusak">
              {hedef.aciklama}
            </p>
          )}
          {hedef.hedefTarihi && (
            <p className="mt-1 text-sm text-metin-yumusak">
              Hedef tarihi: {tarihYaz(hedef.hedefTarihi)}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${HEDEF_DURUM_SINIFLARI[hedef.durum]}`}
        >
          {HEDEF_DURUM_ETIKETLERI[hedef.durum]}
        </span>
      </div>

      {/*
        Düğme sırası YALNIZCA düzenleme yüzeyinde basılır. Eylem verilmediğinde
        (profildeki salt okunur gösterim) satır bilgiden ibarettir; boş bir
        düğme çubuğu basmak, tıklanamayan düğmeler göstermek olurdu.
      */}
      {(durumEylemi || silmeEylemi) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {/*
            Yalnızca İLERİ yöndeki adım gösteriliyor; "geri al" düğmesi yok.
            Yanlış basılan tamamlama, hedef silinip yeniden yazılarak düzeltilir —
            her satıra üç durumun üç düğmesini basmak, listeyi düğme tarlasına
            çevirirdi.
          */}
          {durumEylemi && hedef.durum === "PLANLANDI" && (
            <DurumDugmesi
              hedefId={hedef.id}
              durum="SURUYOR"
              etiket="Başladım"
              Ikon={Play}
              eylem={durumEylemi}
            />
          )}
          {durumEylemi && hedef.durum !== "TAMAMLANDI" && (
            <DurumDugmesi
              hedefId={hedef.id}
              durum="TAMAMLANDI"
              etiket="Tamamladım"
              Ikon={Flag}
              eylem={durumEylemi}
            />
          )}
          {silmeEylemi && (
            <form action={silmeEylemi}>
              <input type="hidden" name="hedefId" value={hedef.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin-yumusak transition hover:bg-zemin hover:text-hata-metin"
                aria-label={`${hedef.baslik} hedefini sil`}
              >
                <Trash2 size={14} aria-hidden />
                Sil
              </button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * `kartlaSar=false` verildiğinde dış çerçeve basılmaz: Panelim'de bölüm zaten
 * katlanabilir kartın içinde duruyor ve kart içinde kart iç içe çerçeve
 * üretirdi (DanismanSecimi ile aynı desen).
 *
 * EYLEMLER İSTEĞE BAĞLI (7 Ağustos 2026). Verilmediğinde kart salt okunur
 * olur — profil ekranının kullandığı hâl. İki ayrı bileşen yazılmadı: aynı
 * listenin iki kopyası zamanla ayrışır ve birine eklenen alan öbüründe eksik
 * kalırdı.
 */
export function RotamKarti({
  hedefler,
  ekleEylemi,
  durumEylemi,
  silmeEylemi,
  kartlaSar = true,
  duzenlemeYolu,
}: {
  hedefler: readonly HedefSatiri[];
  ekleEylemi?: Eylem;
  durumEylemi?: Eylem;
  silmeEylemi?: Eylem;
  kartlaSar?: boolean;
  /** Salt okunur hâlde gösterilecek "düzenleme buradan" bağlantısı. */
  duzenlemeYolu?: string;
}) {
  const ozet = hedefOzeti(hedefler);
  const sirali = hedefleriSirala(hedefler);

  const govde = (
    <>
      {/*
        Başlık YALNIZCA kendi kartını basarken görünür. Panelim'de bölümün
        başlığını `KatlanabilirKart` veriyor; ikisi birden basılsaydı "Rotam"
        alt alta iki kez yazardı.
      */}
      {kartlaSar && (
        <KartBasligi
          baslik="Rotam"
          aciklama={
            ozet.toplam === 0
              ? "Yapmak istediklerini buraya yaz: öğrenmek istediğin bir konu, katılmak istediğin bir yarışma, geliştirmek istediğin bir proje. Yalnızca sen görürsün."
              : `${ozet.toplam} hedef · ${ozet.tamamlanan} tamamlandı · ${ozet.suren} sürüyor. Yalnızca sen görürsün.`
          }
          Ikon={Compass}
        />
      )}

      {sirali.length === 0 ? (
        <p className="text-metin-yumusak">
          {ekleEylemi
            ? "Henüz hedef eklemedin."
            : "Henüz hedef eklemedin. Panelim ekranındaki Rotam bölümünden ekleyebilirsin."}
        </p>
      ) : (
        <ul className="space-y-3">
          {sirali.map((hedef) => (
            <HedefSatiriGovdesi
              key={hedef.id}
              hedef={hedef}
              durumEylemi={durumEylemi}
              silmeEylemi={silmeEylemi}
            />
          ))}
        </ul>
      )}

      {duzenlemeYolu && (
        <Link
          href={duzenlemeYolu}
          className="mt-4 inline-block text-sm font-medium text-vurgu-metin underline underline-offset-2"
        >
          Rotamı düzenle →
        </Link>
      )}

      {ekleEylemi && (
      <form action={ekleEylemi} className="mt-5 space-y-3 border-t border-cizgi pt-5">
        <p className="text-sm font-medium text-baslik">Yeni hedef</p>

        <div>
          <label htmlFor="hedef-baslik" className="text-sm text-metin-yumusak">
            Ne yapmak istiyorsun?
          </label>
          <input
            id="hedef-baslik"
            name="baslik"
            required
            maxLength={HEDEF_BASLIK_AZAMI}
            placeholder="Örn. Python ile ilk oyunumu yazmak"
            className={SINIF_GIRDI}
          />
        </div>

        <div>
          <label htmlFor="hedef-aciklama" className="text-sm text-metin-yumusak">
            Açıklama (isteğe bağlı)
          </label>
          <textarea
            id="hedef-aciklama"
            name="aciklama"
            rows={2}
            maxLength={HEDEF_ACIKLAMA_AZAMI}
            className={SINIF_GIRDI}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="hedef-tarihi" className="text-sm text-metin-yumusak">
              Hedef tarihi (isteğe bağlı)
            </label>
            <input
              id="hedef-tarihi"
              name="hedefTarihi"
              type="date"
              className={SINIF_GIRDI}
            />
          </div>
          <div>
            <label htmlFor="hedef-durum" className="text-sm text-metin-yumusak">
              Durum
            </label>
            <select
              id="hedef-durum"
              name="durum"
              defaultValue="PLANLANDI"
              className={SINIF_GIRDI}
            >
              {(
                Object.entries(HEDEF_DURUM_ETIKETLERI) as [HedefDurumu, string][]
              ).map(([deger, etiket]) => (
                <option key={deger} value={deger}>
                  {etiket}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className={SINIF_BIRINCIL_BUTON}>
          <Plus size={16} aria-hidden />
          Hedef ekle
        </button>
      </form>
      )}
    </>
  );

  if (!kartlaSar) return govde;

  /* `id`: hedef eylemleri kaydettikten sonra buraya geri iner. */
  return (
    <Kart className="scroll-mt-6" id="rotam">
      {govde}
    </Kart>
  );
}
