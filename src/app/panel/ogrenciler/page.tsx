import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  gorevRoluAtaEylemi,
  gorevRoluKaldirEylemi,
} from "@/app/panel/gorev-rolleri/eylemler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";
import { prisma } from "@/lib/db";
import {
  egitimOgretimYillariGetir,
  okulTurleriGetir,
} from "@/lib/rapor/secenekler";
import { gorevRolAdi } from "@/lib/yetki/etiketler";
import { ogrenciListeFiltresi as ogrenciListesiFiltresi } from "@/lib/yetki/kapsam";
import {
  danismanMi,
  ilKoordinatoruMu,
  koordinatorIlKodu,
  ogrenciMi,
  okulTemsilcisiAtayabilirMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import {
  filtreVarMi,
  ogrenciFiltreleriniCoz,
  type SorguParametreleri,
  sayiVeyaNull,
  sorguMetni,
  tekil,
} from "./filtreler";

export const dynamic = "force-dynamic";

/**
 * Öğrenci envanteri.
 *
 * Liste, merkezi kapsam filtresinden geçer — filtre burada elle yazılmaz.
 * Öğrenci rolü bu ekrandan hiçbir şey görmez: bir öğrenci hiçbir koşulda başka
 * bir öğrencinin listesini veya kişisel verisini göremez.
 *
 * Ekrandaki filtreler yalnızca DARALTIR. Adres çubuğuna elle yazılan bir il
 * kodu kapsamı genişletmez, çünkü filtreler kapsam koşuluyla AND'lenir
 * (bkz. ogrenciListeFiltresi).
 */

const SINIF_ETIKET = "text-sm font-medium text-metin-yumusak";
const SINIF_SECIM =
  "mt-1 w-full rounded-md border border-cizgi bg-kart px-3 py-2 text-sm text-metin outline-none focus:border-vurgu";

const SAYFA_BOYUTU = 50;

const SINIF_SAYFA_BUTON =
  "inline-flex items-center gap-1 rounded-md border border-cizgi px-3 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin";

/**
 * Satır başına Okul Temsilcisi düğmesi.
 *
 * Yalnızca ÖĞRENCİNİN KENDİ OKULUNDA yetkisi olan kişiye basılır: koordinatör
 * ilin tamamını görüyor ama her okulun temsilcisini o atamıyor. Yetki kontrolü
 * eylemin içinde bir kez daha yapılıyor — buradaki kontrol yalnızca
 * gösterilmeyecek bir düğmeyi göstermemek için.
 */
function OkulTemsilcisiHucresi({
  ogrenci,
  kullanici,
  donusYolu,
}: {
  ogrenci: {
    id: number;
    kurumKodu: number | null;
    gorevRolleri: { id: number; rolKodu: string }[];
  };
  kullanici: OturumKullanicisi;
  donusYolu: string;
}) {
  const yetkili =
    ogrenci.kurumKodu !== null &&
    okulTemsilcisiAtayabilirMi(kullanici, ogrenci.kurumKodu);
  if (!yetkili) {
    return <span className="text-metin-yumusak">—</span>;
  }

  const mevcut = ogrenci.gorevRolleri.find(
    (gorev) => gorev.rolKodu === "OKUL_TEMSILCISI",
  );

  if (mevcut) {
    return (
      <form action={gorevRoluKaldirEylemi}>
        <input type="hidden" name="gorevId" value={mevcut.id} />
        <input type="hidden" name="donusYolu" value={donusYolu} />
        <button
          type="submit"
          className="rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin-yumusak transition hover:bg-zemin hover:text-hata-metin"
        >
          Görevi kaldır
        </button>
      </form>
    );
  }

  return (
    <form action={gorevRoluAtaEylemi}>
      <input type="hidden" name="ogrenciId" value={ogrenci.id} />
      <input type="hidden" name="rolKodu" value="OKUL_TEMSILCISI" />
      <input type="hidden" name="donusYolu" value={donusYolu} />
      <button
        type="submit"
        className="rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin"
      >
        Okul Temsilcisi yap
      </button>
    </form>
  );
}

/** Sayfa bağlantısı üretirken mevcut filtreler korunur. */
function sayfaBaglantisi(
  parametreler: SorguParametreleri,
  sayfa: number,
): string {
  const sorgu = new URLSearchParams(sorguMetni(parametreler, ["sayfa"]));
  if (sayfa > 1) sorgu.set("sayfa", String(sayfa));
  const metin = sorgu.toString();
  return metin ? `/panel/ogrenciler?${metin}` : "/panel/ogrenciler";
}

export default async function OgrencilerSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();

  if (ogrenciMi(kullanici) && !projeYoneticisiMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Öğrenciler"
          aciklama="Bu ekrana erişim yetkiniz yok."
        />
      </Kart>
    );
  }

  const parametreler = await searchParams;
  const filtreler = ogrenciFiltreleriniCoz(parametreler);
  const filtreVar = filtreVarMi(filtreler);

  /*
   * Okul Temsilcisi sütunu, atama yetkisi OLABİLECEK kişilere basılır: danışman
   * öğretmen (kendi okulu) ve proje yöneticisi. İl koordinatörü bu sütunu
   * görmez — o, il ve ilçe temsilcisini Görev Rolleri ekranından atıyor ve
   * ilindeki her okulun temsilcisini belirlemek onun işi değil.
   *
   * Satır bazında yetki ayrıca sorulur (bkz. OkulTemsilcisiHucresi).
   */
  const okulTemsilcisiYonetebilir =
    danismanMi(kullanici) || projeYoneticisiMi(kullanici);

  /*
   * Atama sonrası bu ekrana, FİLTRELER KORUNARAK dönülür: 400 kişilik bir
   * listede filtreleyip atama yapan öğretmen, işlem sonrası baştan filtrelemek
   * zorunda kalmamalı. Durum/hata parametreleri eylemde ekleniyor.
   */
  const mevcutSorgu = sorguMetni(parametreler, ["durum", "hata"]);
  const donusYolu = mevcutSorgu
    ? `/panel/ogrenciler?${mevcutSorgu}`
    : "/panel/ogrenciler";

  const gorevDurumu = tekil(parametreler.durum);
  const gorevHatasi = tekil(parametreler.hata);

  // Filtre seçenekleri de kapsamla sınırlıdır: proje yöneticisi tüm illeri,
  // il koordinatörü yalnızca kendi ilinin okullarını, danışman öğretmen ise
  // hiç yer seçeneği görmez (tek okulu vardır).
  const koordinatorIli = koordinatorIlKodu(kullanici);
  const seciliIl = filtreler.ilKodu ?? koordinatorIli;

  const [iller, ilceler, okullar, gruplar, okulTurleri, yilSecenekleri] =
    await Promise.all([
      projeYoneticisiMi(kullanici)
        ? prisma.il.findMany({ orderBy: { ad: "asc" } })
        : koordinatorIli
          ? prisma.il.findMany({ where: { ilKodu: koordinatorIli } })
          : [],
      seciliIl
        ? prisma.ilce.findMany({
            where: { ilKodu: seciliIl },
            orderBy: { ad: "asc" },
          })
        : [],
      seciliIl
        ? prisma.kurum.findMany({
            where: { ilKodu: seciliIl, aktif: true },
            orderBy: { ad: "asc" },
            select: { kurumKodu: true, ad: true },
          })
        : [],
      prisma.calismaGrubu.findMany({
        where: { aktif: true },
        orderBy: { siraNo: "asc" },
        select: { id: true, ad: true },
      }),
      okulTurleriGetir(seciliIl ?? null),
      egitimOgretimYillariGetir(),
    ]);

  /*
   * Yıllara göre karşılaştırma (analiz dokümanı 1.2).
   *
   * Sayım, seçili yıl filtresi DIŞINDAKİ filtrelerle yapılır: "İstanbul'daki
   * oyun tasarımı öğrencileri yıllara göre nasıl değişti" sorusu ancak yıl
   * kısıtı kaldırıldığında cevaplanır. Aksi halde tablo tek satıra düşer ve
   * karşılaştırma diye bir şey kalmazdı.
   */
  const karsilastirmaFiltresi = ogrenciListesiFiltresi(kullanici, {
    ...filtreler,
    egitimOgretimYili: null,
  });
  const yilDagilimi = await prisma.kullanici.groupBy({
    by: ["egitimOgretimYili"],
    where: karsilastirmaFiltresi,
    _count: { _all: true },
    orderBy: { egitimOgretimYili: "desc" },
  });

  /*
   * Sayfalama. Liste tek sayfada dökülmez: envanter büyüdüğünde hem ekran
   * kullanılamaz hale gelir hem de HER görüntülenen öğrenci için erişim logu
   * yazıldığından log tablosu gereksiz şişer. Loglanan, gerçekten gösterilen
   * sayfadır.
   */
  const nerede = ogrenciListesiFiltresi(kullanici, filtreler);
  const toplam = await prisma.kullanici.count({ where: nerede });
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYUTU));
  const istenenSayfa = sayiVeyaNull(tekil(parametreler.sayfa)) ?? 1;
  const sayfa = Math.min(Math.max(1, istenenSayfa), sonSayfa);

  const ogrenciler = await prisma.kullanici.findMany({
    where: nerede,
    skip: (sayfa - 1) * SAYFA_BOYUTU,
    take: SAYFA_BOYUTU,
    select: {
      id: true,
      ad: true,
      soyad: true,
      sinif: true,
      kurum: { select: { ad: true } },
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      calismaGruplari: {
        select: { calismaGrubu: { select: { ad: true } } },
      },
      /*
       * Temsilcilikler listede de görünür: koordinatör "ilimde kim temsilci"
       * sorusunun cevabını tek tek profillere girmeden alabilmeli. Yalnızca
       * içinde bulunulan dönem — geçmiş görevler profilin katkı kartında.
       */
      // Okul Temsilcisi ataması bu ekrana taşındı (J2); kaldırma formu görev
      // kaydının kimliğini istiyor, bu yüzden `id` de seçiliyor.
      kurumKodu: true,
      gorevRolleri: {
        where: { egitimOgretimYili: kullanici.egitimOgretimYili },
        select: {
          id: true,
          rolKodu: true,
          il: { select: { ad: true } },
          ilce: { select: { ad: true } },
          kurum: { select: { ad: true } },
        },
      },
      ogrenciAtamalari: {
        where: { bitisTarihi: null },
        select: {
          danisman: { select: { ad: true, soyad: true } },
        },
      },
    },
    orderBy: [{ ad: "asc" }, { soyad: "asc" }],
  });

  // Her veri görüntüleme işlemi loglanır.
  await erisimLoglaCoklu(
    ogrenciler.map((ogrenci) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "OGRENCI" as const,
      hedefId: ogrenci.id,
      detay: "Öğrenci listesi görüntülendi",
    })),
  );

  const kapsamAciklamasi = projeYoneticisiMi(kullanici)
    ? "Tüm iller"
    : ilKoordinatoruMu(kullanici)
      ? "Kendi iliniz"
      : danismanMi(kullanici)
        ? "Danışmanlığınızdaki öğrenciler"
        : "Kapsamınız dışında";

  const yerFiltresiVar = iller.length > 0 || okullar.length > 0;

  const disaAktarmaSorgusu = sorguMetni(parametreler, ["sayfa"]);
  const disaAktarmaBaglantisi = disaAktarmaSorgusu
    ? `/panel/ogrenciler/disa-aktar?${disaAktarmaSorgusu}`
    : "/panel/ogrenciler/disa-aktar";

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Öğrenciler"
        aciklama={
          toplam > SAYFA_BOYUTU
            ? `Görüntüleme kapsamı: ${kapsamAciklamasi} · ${toplam} kayıt · sayfa ${sayfa}/${sonSayfa}`
            : `Görüntüleme kapsamı: ${kapsamAciklamasi} · ${toplam} kayıt`
        }
      />

      {gorevDurumu === "atandi" && (
        <BilgiKutusu cesit="olumlu">Okul Temsilcisi görevi atandı.</BilgiKutusu>
      )}
      {gorevDurumu === "kaldirildi" && (
        <BilgiKutusu cesit="olumlu">
          Okul Temsilcisi görevi kaldırıldı.
        </BilgiKutusu>
      )}
      {gorevDurumu === "danismanlik-birakildi" && (
        <BilgiKutusu cesit="olumlu">
          Danışmanlık bırakıldı. Gerekçe il koordinatörünüze iletildi ve erişim
          kaydına yazıldı; öğrenci yeni danışmanına bağlandı.
        </BilgiKutusu>
      )}
      {gorevHatasi && <BilgiKutusu cesit="hata">{gorevHatasi}</BilgiKutusu>}

      <form
        method="get"
        className="rounded-kart border border-cizgi bg-kart p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-baslik">
            <Filter size={16} className="text-vurgu-metin" aria-hidden />
            Filtreler
          </h2>
          {filtreVar && (
            <Link
              href="/panel/ogrenciler"
              className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
            >
              <X size={14} aria-hidden />
              Filtreleri temizle
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {yerFiltresiVar && (
            <>
              <label className="block">
                <span className={SINIF_ETIKET}>İl</span>
                <select
                  name="il"
                  defaultValue={filtreler.ilKodu ?? ""}
                  className={SINIF_SECIM}
                  disabled={iller.length <= 1}
                >
                  <option value="">
                    {iller.length <= 1 ? (iller[0]?.ad ?? "—") : "Tüm iller"}
                  </option>
                  {iller.map((il) => (
                    <option key={il.ilKodu} value={il.ilKodu}>
                      {il.ad}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={SINIF_ETIKET}>İlçe</span>
                <select
                  name="ilce"
                  defaultValue={filtreler.ilceKodu ?? ""}
                  className={SINIF_SECIM}
                  disabled={ilceler.length === 0}
                >
                  <option value="">
                    {ilceler.length === 0 ? "Önce il seçin" : "Tüm ilçeler"}
                  </option>
                  {ilceler.map((ilce) => (
                    <option key={ilce.ilceKodu} value={ilce.ilceKodu}>
                      {ilce.ad}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={SINIF_ETIKET}>Okul</span>
                <select
                  name="okul"
                  defaultValue={
                    filtreler.kurumKodu ? String(filtreler.kurumKodu) : ""
                  }
                  className={SINIF_SECIM}
                  disabled={okullar.length === 0}
                >
                  <option value="">
                    {okullar.length === 0 ? "Önce il seçin" : "Tüm okullar"}
                  </option>
                  {okullar.map((okul) => (
                    <option key={okul.kurumKodu} value={okul.kurumKodu}>
                      {okul.ad}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className="block">
            <span className={SINIF_ETIKET}>Okul türü</span>
            <select
              name="okulTuru"
              defaultValue={filtreler.okulTuru ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm okul türleri</option>
              {okulTurleri.map((tur) => (
                <option key={tur} value={tur}>
                  {tur}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Sınıf</span>
            <input
              type="text"
              name="sinif"
              placeholder="11 veya 11-A"
              defaultValue={filtreler.sinif ?? ""}
              className={SINIF_SECIM}
            />
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Eğitim-öğretim yılı</span>
            <select
              name="yil"
              defaultValue={filtreler.egitimOgretimYili ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm yıllar</option>
              {yilSecenekleri.map((yil) => (
                <option key={yil} value={yil}>
                  {yil}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Çalışma grubu</span>
            <select
              name="grup"
              defaultValue={
                filtreler.calismaGrubuId ? String(filtreler.calismaGrubuId) : ""
              }
              className={SINIF_SECIM}
            >
              <option value="">Tüm gruplar</option>
              {gruplar.map((grup) => (
                <option key={grup.id} value={grup.id}>
                  {grup.ad}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Ad veya soyad</span>
            <input
              type="text"
              name="ara"
              placeholder="Ara"
              defaultValue={filtreler.ara ?? ""}
              className={SINIF_SECIM}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-metin">
            <input
              type="checkbox"
              name="danismansiz"
              value="1"
              defaultChecked={filtreler.danismansizMi}
              className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
            />
            Yalnızca danışmanı olmayanlar
          </label>
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Filtrele
          </button>
          {toplam > 0 && (
            // Bağlantı, formun o anki hâlini değil ADRESTEKİ filtreleri taşır:
            // indirilen dosya ekranda görünen listeyle birebir aynı olmalı.
            <Link
              href={disaAktarmaBaglantisi}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin"
            >
              <Download size={15} aria-hidden />
              CSV indir ({toplam} kayıt)
            </Link>
          )}
        </div>
      </form>

      {/*
        Yıllara göre karşılaştırma. Yıl filtresi dışındaki filtreler uygulanmış
        hâliyle sayılır; tek yıl varsa tablo gösterilmez, karşılaştıracak bir
        şey yoktur.
      */}
      {yilDagilimi.length > 1 && (
        <Kart>
          <KartBasligi
            baslik="Eğitim-öğretim yıllarına göre karşılaştırma"
            aciklama="Seçili yıl filtresi dışındaki filtrelerle sayılmıştır."
            Ikon={CalendarRange}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-cizgi text-metin-yumusak">
                <tr>
                  <th className="py-2 pr-4 font-medium">Eğitim-öğretim yılı</th>
                  <th className="py-2 pr-4 font-medium">Öğrenci sayısı</th>
                  <th className="py-2 font-medium">Bir önceki yıla göre</th>
                </tr>
              </thead>
              <tbody>
                {yilDagilimi.map((satir, sira) => {
                  // Liste yeniden eskiye sıralı; "önceki yıl" bir sonraki satır.
                  const oncekiYil = yilDagilimi[sira + 1];
                  const fark = oncekiYil
                    ? satir._count._all - oncekiYil._count._all
                    : null;

                  return (
                    <tr
                      key={satir.egitimOgretimYili}
                      className="border-b border-cizgi last:border-0"
                    >
                      <td className="py-2 pr-4 font-medium text-metin">
                        <Link
                          href={`/panel/ogrenciler?${(() => {
                            const sorgu = new URLSearchParams(
                              sorguMetni(parametreler, ["sayfa", "yil"]),
                            );
                            sorgu.set("yil", satir.egitimOgretimYili);
                            return sorgu.toString();
                          })()}`}
                          className="transition hover:text-vurgu-metin hover:underline"
                        >
                          {satir.egitimOgretimYili}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-metin-yumusak">
                        {satir._count._all}
                      </td>
                      <td className="py-2 text-metin-yumusak">
                        {fark === null
                          ? "—"
                          : fark === 0
                            ? "değişmedi"
                            : fark > 0
                              ? `+${fark}`
                              : String(fark)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Kart>
      )}

      {ogrenciler.length === 0 ? (
        <Kart className="text-metin-yumusak">
          {filtreVar
            ? "Bu filtrelerle eşleşen öğrenci yok."
            : "Kapsamınızda görüntülenecek öğrenci yok."}
        </Kart>
      ) : (
        <div className="overflow-x-auto rounded-kart border border-cizgi bg-kart">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cizgi bg-zemin text-metin-yumusak">
              <tr>
                <th className="px-4 py-3 font-medium">Ad Soyad</th>
                <th className="px-4 py-3 font-medium">Sınıf</th>
                <th className="px-4 py-3 font-medium">Okul</th>
                <th className="px-4 py-3 font-medium">İl / İlçe</th>
                <th className="px-4 py-3 font-medium">Danışman</th>
                <th className="px-4 py-3 font-medium">Temsilcilik</th>
                <th className="px-4 py-3 font-medium">Çalışma grupları</th>
                {okulTemsilcisiYonetebilir && (
                  <th className="px-4 py-3 font-medium">Okul Temsilcisi</th>
                )}
              </tr>
            </thead>
            <tbody>
              {ogrenciler.map((ogrenci) => {
                const danisman = ogrenci.ogrenciAtamalari[0]?.danisman;
                return (
                  <tr
                    key={ogrenci.id}
                    className="border-b border-cizgi last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-metin">
                      {/*
                       * Profil bağlantısı kapsam kontrolü YERİNE geçmez:
                       * hedef sayfa aynı merkezi filtreden yeniden geçer ve
                       * kapsam dışı id'de 404 döner. Buradaki bağlantı
                       * yalnızca gezinme kolaylığı.
                       */}
                      <Link
                        href={`/panel/ogrenciler/${ogrenci.id}`}
                        className="transition hover:text-vurgu-metin hover:underline"
                      >
                        {ogrenci.ad} {ogrenci.soyad}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogrenci.sinif ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogrenci.kurum?.ad ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogrenci.il?.ad ?? "—"}
                      {ogrenci.ilce?.ad ? ` / ${ogrenci.ilce.ad}` : ""}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {danisman ? (
                        `${danisman.ad} ${danisman.soyad}`
                      ) : (
                        <span className="rounded-full bg-uyari-zemin px-2 py-0.5 text-xs text-uyari-metin">
                          Atanmadı
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogrenci.gorevRolleri.length === 0 ? (
                        "—"
                      ) : (
                        <span className="flex flex-wrap gap-1.5">
                          {ogrenci.gorevRolleri.map((gorev) => (
                            <span
                              key={gorev.rolKodu}
                              className="rounded-full bg-rol-ogrenci-zemin px-2 py-0.5 text-xs text-rol-ogrenci-metin"
                            >
                              {gorevRolAdi(gorev)}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogrenci.calismaGruplari.length === 0
                        ? "—"
                        : ogrenci.calismaGruplari
                            .map((secim) => secim.calismaGrubu.ad)
                            .join(", ")}
                    </td>
                    {/*
                      OKUL TEMSİLCİSİ ATAMASI (J2 · 5 Ağustos 2026). Görev
                      Rolleri sekmesi danışman öğretmenin menüsünden kalktı;
                      atama artık burada. İl ve ilçe temsilciliği BURADA YOK —
                      onları il koordinatörü kendi ekranından atıyor, çünkü
                      koordinatörün listesi ilin tamamı ve ilçe bazlı atamayı
                      burada yapmak filtre kurmayı zorunlu kılardı.

                      Yetki iki kez sorulur: burada (düğmeyi hiç basmamak için)
                      ve eylemin içinde (form kurcalanabilir).
                    */}
                    {okulTemsilcisiYonetebilir && (
                      <td className="px-4 py-3">
                        <OkulTemsilcisiHucresi
                          ogrenci={ogrenci}
                          kullanici={kullanici}
                          donusYolu={donusYolu}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sonSayfa > 1 && (
        <nav
          aria-label="Sayfalama"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-metin-yumusak">
            {(sayfa - 1) * SAYFA_BOYUTU + 1}–
            {Math.min(sayfa * SAYFA_BOYUTU, toplam)} / {toplam} kayıt
          </p>
          <div className="flex items-center gap-2">
            {sayfa > 1 ? (
              <Link
                href={sayfaBaglantisi(parametreler, sayfa - 1)}
                className={SINIF_SAYFA_BUTON}
              >
                <ChevronLeft size={15} aria-hidden />
                Önceki
              </Link>
            ) : (
              <span className={`${SINIF_SAYFA_BUTON} opacity-40`}>
                <ChevronLeft size={15} aria-hidden />
                Önceki
              </span>
            )}
            <span className="text-sm text-metin-yumusak">
              Sayfa {sayfa} / {sonSayfa}
            </span>
            {sayfa < sonSayfa ? (
              <Link
                href={sayfaBaglantisi(parametreler, sayfa + 1)}
                className={SINIF_SAYFA_BUTON}
              >
                Sonraki
                <ChevronRight size={15} aria-hidden />
              </Link>
            ) : (
              <span className={`${SINIF_SAYFA_BUTON} opacity-40`}>
                Sonraki
                <ChevronRight size={15} aria-hidden />
              </span>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
