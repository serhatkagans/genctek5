import {
  AlertTriangle,
  Building2,
  MapPin,
  UserPlus,
  UserX,
} from "lucide-react";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { uygulamaYolu } from "@/lib/ortam";
import {
  ilKoordinatorDurumlari,
  koordinatorAdaylari,
  kurumDanismanDurumlari,
} from "@/lib/rapor/rol-envanteri";
import { tarihYaz } from "@/lib/tarih";
import { rolEnvanteriGorebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import {
  ilKoordinatoruAtaEylemi,
  ilKoordinatoruKaldirEylemi,
} from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Rol/Atama Envanteri — yalnızca proje yöneticisi.
 *
 * Proje yöneticisi öğrencileri ve öğretmenleri tek tek zaten görebiliyordu;
 * eksik olan TOPLU görünümdü: hangi il koordinatörsüz, hangi okul danışmansız.
 * Bu ekran o boşluğu kapatır ve atamayı da buradan yaptırır — boşluğu görüp
 * doldurmak tek akış olmalı.
 *
 * Yetki, "Öğrenci/öğretmen verisi görüntüleme" satırından AYRIDIR
 * (references/permissions.md Bölüm 1).
 */

const SINIF_HUCRE = "px-3 py-2 text-sm";
const SINIF_ETIKET = "text-sm font-medium text-metin-yumusak";

function tekil(deger: string | string[] | undefined): string | null {
  const ilk = Array.isArray(deger) ? deger[0] : deger;
  const kirpilmis = ilk?.trim();
  return kirpilmis ? kirpilmis : null;
}

export default async function RolEnvanteriSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();

  if (!rolEnvanteriGorebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Rol/atama envanteri"
          aciklama="Bu ekran yalnızca proje yöneticisine açıktır."
        />
      </Kart>
    );
  }

  const parametreler = await searchParams;
  const secilenIl = tekil(parametreler.il);
  const hata = tekil(parametreler.hata);
  const durum = tekil(parametreler.durum);

  const [iller, kurumlar, adaylar] = await Promise.all([
    ilKoordinatorDurumlari(),
    kurumDanismanDurumlari(),
    secilenIl ? koordinatorAdaylari(secilenIl) : Promise.resolve([]),
  ]);

  /*
   * Ekran öğretmen adlarını ve okul bazlı öğrenci sayılarını gösterdiği için
   * görüntülenmesi de loglanır (Değişmez 7). Kendi profilini görmek gibi kişinin
   * kendi verisine erişimi loglanmaz; burada başkalarının verisi var.
   */
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "ROL",
    hedefId: secilenIl ?? "envanter",
    detay: `Rol/atama envanteri görüntülendi${secilenIl ? ` (il ${secilenIl})` : ""}`,
  });

  const bosIller = iller.filter((il) => il.koordinator === null);
  const atanmamisToplam = iller.reduce(
    (toplam, il) => toplam + il.atanmamisOgrenciSayisi,
    0,
  );
  const danismansizOkullar = kurumlar.filter(
    (kurum) => kurum.danismanSayisi === 0,
  );

  const secilenIlBilgisi = secilenIl
    ? (iller.find((il) => il.ilKodu === secilenIl) ?? null)
    : null;

  const dagitilan = Number.parseInt(tekil(parametreler.dagitilan) ?? "", 10);
  const yenidenSecim = Number.parseInt(
    tekil(parametreler.yenidenSecim) ?? "",
    10,
  );
  const atanmamisOlan = Number.parseInt(
    tekil(parametreler.atanmamis) ?? "",
    10,
  );
  const baglanan = Number.parseInt(tekil(parametreler.baglanan) ?? "", 10);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Rol/atama envanteri"
        aciklama={`${iller.length} il · ${bosIller.length} ilde koordinatör yok · ${danismansizOkullar.length} okul danışmansız`}
      />

      {durum === "atandi" && (
        <BilgiKutusu cesit="olumlu">
          İl koordinatörü atandı.
          {tekil(parametreler.danismandi) === "1" &&
            " Atanan öğretmenin danışmanlık görevi kapatıldı."}
          {Number.isFinite(dagitilan) &&
            dagitilan > 0 &&
            ` Danışmanlığı kapandığı için ${dagitilan} öğrenci yeniden dağıtıldı.`}
          {Number.isFinite(yenidenSecim) &&
            yenidenSecim > 0 &&
            ` Bunlardan ${yenidenSecim} öğrenciye "danışmanını yeniden seç" bildirimi gitti; seçim yapılana kadar il koordinatörüne bağlı görünürler.`}
          {Number.isFinite(baglanan) &&
            baglanan > 0 &&
            ` Ayrıca ilde koordinatör olmadığı için atanmamış durumda bekleyen ${baglanan} öğrenci yeni koordinatöre bağlandı.`}
        </BilgiKutusu>
      )}

      {durum === "kaldirildi" && (
        <BilgiKutusu cesit="uyari">
          İl koordinatörlüğü kaldırıldı.
          {Number.isFinite(atanmamisOlan) && atanmamisOlan > 0
            ? ` ${atanmamisOlan} öğrenci "atanmamış" duruma düştü; ile yeni koordinatör atandığında otomatik olarak ona bağlanacaklar.`
            : ""}
        </BilgiKutusu>
      )}

      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      {atanmamisToplam > 0 && (
        <div className="rounded-kart border border-hata-cizgi bg-hata-zemin px-4 py-3 text-sm text-hata-metin">
          <span className="inline-flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              <strong>{atanmamisToplam} öğrencinin danışmanı yok.</strong>{" "}
              Okulları danışmansız ve illerinde koordinatör bulunmuyor. İlgili
              illere koordinatör atandığında bu öğrenciler ayrı bir onay
              gerekmeden koordinatöre bağlanır.
            </span>
          </span>
        </div>
      )}

      {/* --- İl koordinatörü durumu --- */}
      <Kart>
        <KartBasligi
          baslik="İl koordinatörü durumu"
          aciklama="Boş iller listenin başında ve vurgulu gösterilir."
          Ikon={MapPin}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse">
            <thead>
              <tr className="border-b border-cizgi text-left">
                <th className={`${SINIF_HUCRE} ${SINIF_ETIKET}`}>İl</th>
                <th className={`${SINIF_HUCRE} ${SINIF_ETIKET}`}>Koordinatör</th>
                {/*
                  ATANMA TARİHİ YERİNE ÖĞRETMEN SAYISI (11 Ağustos 2026 ·
                  istek). Tarih, ekranın cevapladığı soruların hiçbirine
                  girmiyordu: "hangi il boş", "nerede öğrenci danışmansız
                  kalmış". İlin öğretmen sayısı ise atama kararının kendisine
                  giriyor — koordinatör adayı o havuzdan çıkıyor.

                  Tarih kaybolmadı: rol kayıtları geçmişli tutuluyor ve
                  öğretmenin profilinde görev dönemleri yazıyor.
                */}
                <th className={`${SINIF_HUCRE} ${SINIF_ETIKET}`}>Öğretmen</th>
                <th className={`${SINIF_HUCRE} ${SINIF_ETIKET}`}>Öğrenci</th>
                <th className={`${SINIF_HUCRE} ${SINIF_ETIKET}`}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {[...iller]
                .sort((a, b) => {
                  const aBos = a.koordinator === null ? 0 : 1;
                  const bBos = b.koordinator === null ? 0 : 1;
                  if (aBos !== bBos) return aBos - bBos;
                  return a.ilAdi.localeCompare(b.ilAdi, "tr");
                })
                .map((il) => {
                  const bosMu = il.koordinator === null;
                  return (
                    <tr
                      key={il.ilKodu}
                      className={`border-b border-cizgi last:border-0 ${
                        bosMu ? "bg-uyari-zemin" : ""
                      }`}
                    >
                      <td className={`${SINIF_HUCRE} font-medium text-metin`}>
                        {il.ilAdi}
                        <span className="ml-1 text-metin-yumusak">
                          ({il.ilKodu})
                        </span>
                      </td>
                      <td className={SINIF_HUCRE}>
                        {il.koordinator ? (
                          <span className="text-metin">
                            {il.koordinator.ad} {il.koordinator.soyad}
                            {il.koordinator.brans && (
                              <span className="text-metin-yumusak">
                                {" "}
                                · {il.koordinator.brans}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-medium text-uyari-metin">
                            <UserX size={14} aria-hidden />
                            Atanmadı
                          </span>
                        )}
                      </td>
                      <td className={`${SINIF_HUCRE} text-metin-yumusak`}>
                        {il.ogretmenSayisi}
                      </td>
                      <td className={`${SINIF_HUCRE} text-metin-yumusak`}>
                        {il.ogrenciSayisi}
                        {il.atanmamisOgrenciSayisi > 0 && (
                          <span className="ml-1 font-medium text-hata-metin">
                            ({il.atanmamisOgrenciSayisi} atanmamış)
                          </span>
                        )}
                      </td>
                      <td className={SINIF_HUCRE}>
                        {il.koordinator ? (
                          <form action={ilKoordinatoruKaldirEylemi}>
                            <input
                              type="hidden"
                              name="kullaniciId"
                              value={il.koordinator.kullaniciId}
                            />
                            <button
                              type="submit"
                              className="rounded-md border border-cizgi px-2.5 py-1 text-xs font-medium text-metin-yumusak transition hover:bg-zemin"
                            >
                              Görevi kaldır
                            </button>
                          </form>
                        ) : (
                          <a
                            href={uygulamaYolu(
                              `/panel/rol-envanteri?il=${il.ilKodu}#atama`,
                            )}
                            className="text-xs font-medium text-vurgu-metin"
                          >
                            Koordinatör ata
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Kart>

      {/* --- Koordinatör atama --- */}
      <Kart>
        <div id="atama" />
        <KartBasligi
          baslik="İl koordinatörü ata"
          aciklama="Danışman öğretmenler de atanabilir; atama engellenmez. Bu durumda öğretmenin danışmanlığı kapatılır ve öğrencileri devir kurallarına göre yeniden dağıtılır."
          Ikon={UserPlus}
        />

        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className={SINIF_ETIKET}>İl</span>
            <select
              name="il"
              defaultValue={secilenIl ?? ""}
              className="mt-1 rounded-md border border-cizgi bg-kart px-3 py-2 text-sm text-metin outline-none focus:border-vurgu"
            >
              <option value="">Seçiniz</option>
              {iller.map((il) => (
                <option key={il.ilKodu} value={il.ilKodu}>
                  {il.ilAdi}
                  {il.koordinator ? "" : " — boş"}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={SINIF_IKINCIL_BUTON}>
            Adayları listele
          </button>
        </form>

        {secilenIlBilgisi && (
          <div className="mt-5">
            {secilenIlBilgisi.koordinator && (
              <div className="mb-4">
                <BilgiKutusu cesit="uyari">
                  {secilenIlBilgisi.ilAdi} ilinin koordinatörü{" "}
                  {secilenIlBilgisi.koordinator.ad}{" "}
                  {secilenIlBilgisi.koordinator.soyad}. Yeni atama yapabilmek
                  için önce mevcut görevi kaldırın.
                </BilgiKutusu>
              </div>
            )}

            {adaylar.length === 0 ? (
              <p className="text-metin-yumusak">
                {secilenIlBilgisi.ilAdi} ilinde sisteme kayıtlı, koordinatör
                olarak atanabilecek öğretmen bulunmuyor. Öğretmenin en az bir kez
                giriş yapmış olması gerekir.
              </p>
            ) : (
              <ul className="space-y-2">
                {adaylar.map((aday) => (
                  <li
                    key={aday.kullaniciId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-kart border border-cizgi px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-metin">
                        {aday.ad} {aday.soyad}
                      </p>
                      <p className="text-sm text-metin-yumusak">
                        {[aday.brans, aday.kurumAdi].filter(Boolean).join(" · ") ||
                          "—"}
                      </p>
                      {aday.danismanMi && (
                        <p className="mt-1 text-sm font-medium text-uyari-metin">
                          Danışman öğretmen ·{" "}
                          {aday.danismanliktakiOgrenciSayisi} öğrenci yeniden
                          dağıtılacak
                        </p>
                      )}
                    </div>
                    <form action={ilKoordinatoruAtaEylemi}>
                      <input
                        type="hidden"
                        name="kullaniciId"
                        value={aday.kullaniciId}
                      />
                      <input
                        type="hidden"
                        name="ilKodu"
                        value={secilenIlBilgisi.ilKodu}
                      />
                      <button
                        type="submit"
                        disabled={secilenIlBilgisi.koordinator !== null}
                        className={`${SINIF_BIRINCIL_BUTON} disabled:opacity-40`}
                      >
                        Koordinatör yap
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Kart>

      {/* --- Danışman öğretmen durumu --- */}
      <Kart>
        <KartBasligi
          baslik="Danışman öğretmen durumu"
          aciklama="Kurum bazında. Danışmansız okullar listenin başındadır; öğrencileri il koordinatörüne düşer."
          Ikon={Building2}
        />

        {kurumlar.length === 0 ? (
          <p className="text-metin-yumusak">
            Sisteme kayıtlı öğrencisi veya danışmanı olan okul yok.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse">
              <thead>
                <tr className="border-b border-cizgi text-left">
                  <th className={`${SINIF_HUCRE} ${SINIF_ETIKET}`}>Okul</th>
                  <th className={`${SINIF_HUCRE} ${SINIF_ETIKET}`}>İl / ilçe</th>
                  <th className={`${SINIF_HUCRE} ${SINIF_ETIKET}`}>Danışman</th>
                  <th className={`${SINIF_HUCRE} ${SINIF_ETIKET}`}>Öğrenci</th>
                  <th className={`${SINIF_HUCRE} ${SINIF_ETIKET}`}>
                    Danışmansızsa öğrenciler kime bağlı
                  </th>
                </tr>
              </thead>
              <tbody>
                {kurumlar.map((kurum) => {
                  const danismansizMi = kurum.danismanSayisi === 0;
                  const sahipsizMi = danismansizMi && !kurum.ilKoordinatoru;
                  return (
                    <tr
                      key={kurum.kurumKodu}
                      className={`border-b border-cizgi last:border-0 ${
                        sahipsizMi
                          ? "bg-hata-zemin"
                          : danismansizMi
                            ? "bg-uyari-zemin"
                            : ""
                      }`}
                    >
                      <td className={`${SINIF_HUCRE} font-medium text-metin`}>
                        {kurum.kurumAdi}
                      </td>
                      <td className={`${SINIF_HUCRE} text-metin-yumusak`}>
                        {kurum.ilAdi} / {kurum.ilceAdi}
                      </td>
                      <td className={SINIF_HUCRE}>
                        {danismansizMi ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-uyari-metin">
                            <UserX size={14} aria-hidden />
                            Yok
                          </span>
                        ) : (
                          <span className="text-metin">
                            {kurum.danismanSayisi}
                          </span>
                        )}
                      </td>
                      <td className={`${SINIF_HUCRE} text-metin-yumusak`}>
                        {kurum.ogrenciSayisi}
                      </td>
                      <td className={SINIF_HUCRE}>
                        {!danismansizMi ? (
                          <span className="text-metin-yumusak">—</span>
                        ) : kurum.ilKoordinatoru ? (
                          <span className="text-metin">
                            {kurum.ilKoordinatoru.ad}{" "}
                            {kurum.ilKoordinatoru.soyad}
                            <span className="text-metin-yumusak">
                              {" "}
                              · {kurum.ilAdi} il koordinatörü
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-medium text-hata-metin">
                            <AlertTriangle size={14} aria-hidden />
                            Kimseye — ilin koordinatörü de yok
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Kart>
    </div>
  );
}
