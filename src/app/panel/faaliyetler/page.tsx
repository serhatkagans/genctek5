import {
  CalendarDays,
  Download,
  Filter,
  MapPin,
  Plus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  BasvuruRozeti,
  FaaliyetDurumuRozeti,
  KapsamRozeti,
  KategoriRozeti,
  OnayRozeti,
  PencereRozeti,
} from "@/components/FaaliyetRozetleri";
import {
  BilgiKutusu,
  Kart,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { uygulamaYolu } from "@/lib/ortam";
import {
  basvuruPenceresi,
  ETKINLIK_KATEGORILERI,
  ETKINLIK_KATEGORISI_ETIKETLERI,
  faaliyetAcmaYetkisiVarMi,
  KAPSAM_ETIKETLERI,
  KAPSAMLAR,
  kontenjanDurumu,
} from "@/lib/faaliyet/kurallar";
import { tarihYaz } from "@/lib/tarih";
import { basvuruYapabilirMi, ogrenciMi } from "@/lib/yetki/izinler";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import {
  type SorguParametreleri,
  sorguMetni,
} from "../ogrenciler/filtreler";
import {
  faaliyetFiltreleriniCoz,
  faaliyetFiltresiVarMi,
  faaliyetListeFiltresi,
} from "./filtreler";

export const dynamic = "force-dynamic";

/**
 * Faaliyet listesi.
 *
 * Kim hangi faaliyeti görür sorusunun cevabı merkezi kapsam filtresindedir
 * (faaliyetKapsamFiltresi); burada filtre elle yazılmaz. Ekrandaki filtreler
 * yalnızca DARALTIR — adres çubuğuna yazılan bir kapsam değeri onay bekleyen
 * ya da kapsam dışı bir faaliyeti görünür yapmaz.
 */

const SINIF_ETIKET = "text-sm font-medium text-metin-yumusak";
const SINIF_SECIM =
  "mt-1 w-full rounded-md border border-cizgi bg-kart px-3 py-2 text-sm text-metin outline-none focus:border-vurgu";

export default async function FaaliyetlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const parametreler = await searchParams;

  const filtreler = faaliyetFiltreleriniCoz(parametreler);
  const filtreVar = faaliyetFiltresiVarMi(filtreler);

  const simdi = new Date();
  const nerede = faaliyetListeFiltresi(kullanici, filtreler, simdi);

  const [faaliyetler, gruplar] = await Promise.all([
    prisma.faaliyet.findMany({
      where: nerede,
      orderBy: [{ tarih: "asc" }],
      select: {
        id: true,
        ad: true,
        aciklama: true,
        tarih: true,
        kapsam: true,
        etkinlikKategorisi: true,
        temelEtkinlikProgrami: { select: { ad: true } },
        kontenjan: true,
        onayDurumu: true,
        durum: true,
        duzenleyenBirim: true,
        duzenleyenKullaniciId: true,
        basvuruBaslangic: true,
        basvuruBitis: true,
        // Silinen ek kapak olarak bırakılmaz; yine de savunmacı davranıp
        // silinmişse gösterme.
        kapakEk: { select: { id: true, dosyaAdi: true, silindiMi: true } },
        kurum: { select: { ad: true } },
        il: { select: { ad: true } },
        calismaGruplari: {
          select: { calismaGrubu: { select: { id: true, ad: true } } },
        },
        basvurular: { select: { durum: true } },
      },
    }),
    prisma.calismaGrubu.findMany({
      where: { aktif: true },
      orderBy: { siraNo: "asc" },
      select: { id: true, ad: true },
    }),
  ]);

  // Kişi kendi başvuru durumunu listede görür; başkasının başvurusu okunmaz.
  // Katılımcı öğretmen de olabildiği için koşul "öğrenci mi" değil
  // "başvurabilir mi" sorusudur.
  const kendiBasvurulari = basvuruYapabilirMi(kullanici)
    ? await prisma.basvuru.findMany({
        where: {
          katilimciId: kullanici.id,
          faaliyetId: { in: faaliyetler.map((faaliyet) => faaliyet.id) },
        },
        orderBy: { basvuruTarihi: "asc" },
        select: { faaliyetId: true, durum: true },
      })
    : [];
  const basvuruDurumum = new Map(
    kendiBasvurulari.map((basvuru) => [basvuru.faaliyetId, basvuru.durum]),
  );

  await erisimLoglaCoklu(
    faaliyetler.map((faaliyet) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "FAALIYET" as const,
      hedefId: faaliyet.id,
      detay: "Faaliyet listesi görüntülendi",
    })),
  );

  const acabilir = faaliyetAcmaYetkisiVarMi(kullanici);

  const disaAktarmaSorgusu = sorguMetni(parametreler);
  const disaAktarmaBaglantisi = disaAktarmaSorgusu
    ? `/panel/faaliyetler/disa-aktar?${disaAktarmaSorgusu}`
    : "/panel/faaliyetler/disa-aktar";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SayfaBasligi
          baslik="Faaliyetler"
          aciklama={`Kapsamınızdaki faaliyetler · ${faaliyetler.length} kayıt`}
        />
        {acabilir && (
          <Link href="/panel/faaliyetler/yeni" className={SINIF_BIRINCIL_BUTON}>
            <Plus size={16} aria-hidden />
            Yeni faaliyet
          </Link>
        )}
      </div>

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
              href="/panel/faaliyetler"
              className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
            >
              <X size={14} aria-hidden />
              Filtreleri temizle
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={SINIF_ETIKET}>Kapsam</span>
            <select
              name="kapsam"
              defaultValue={filtreler.kapsam ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm kapsamlar</option>
              {KAPSAMLAR.map((kapsam) => (
                <option key={kapsam} value={kapsam}>
                  {KAPSAM_ETIKETLERI[kapsam]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Etkinlik kategorisi</span>
            <select
              name="kategori"
              defaultValue={filtreler.kategori ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm kategoriler</option>
              {ETKINLIK_KATEGORILERI.map((kategori) => (
                <option key={kategori} value={kategori}>
                  {ETKINLIK_KATEGORISI_ETIKETLERI[kategori]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Çalışma grubu</span>
            <select
              name="grup"
              defaultValue={filtreler.calismaGrubuId ?? ""}
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
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-metin">
            <input
              type="checkbox"
              name="acik"
              value="1"
              defaultChecked={filtreler.yalnizcaAcik}
              className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
            />
            Yalnızca başvurusu açık olanlar
          </label>
          {acabilir && (
            <label className="flex items-center gap-2 text-sm text-metin">
              <input
                type="checkbox"
                name="benim"
                value="1"
                defaultChecked={filtreler.yalnizcaBenim}
                className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
              />
              Yalnızca benim açtıklarım
            </label>
          )}
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Filtrele
          </button>
          {faaliyetler.length > 0 && (
            <Link
              href={disaAktarmaBaglantisi}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin"
            >
              <Download size={15} aria-hidden />
              CSV indir ({faaliyetler.length} kayıt)
            </Link>
          )}
        </div>
      </form>

      {faaliyetler.length === 0 ? (
        <Kart className="text-metin-yumusak">
          {filtreVar
            ? "Bu filtrelerle eşleşen faaliyet yok."
            : acabilir
              ? "Kapsamınızda henüz faaliyet yok. İlkini siz açabilirsiniz."
              : "Kapsamınızda henüz duyurulmuş bir faaliyet yok."}
        </Kart>
      ) : (
        <ul className="space-y-3">
          {faaliyetler.map((faaliyet) => {
            const kontenjan = kontenjanDurumu(
              faaliyet.basvurular,
              faaliyet.kontenjan,
            );
            const pencere = basvuruPenceresi(faaliyet, simdi);
            const benimDurumum = basvuruDurumum.get(faaliyet.id);
            const kapak =
              faaliyet.kapakEk && !faaliyet.kapakEk.silindiMi
                ? faaliyet.kapakEk
                : null;

            return (
              <li key={faaliyet.id}>
                <Link
                  href={`/panel/faaliyetler/${faaliyet.id}`}
                  className="block overflow-hidden rounded-kart border border-cizgi bg-kart transition hover:border-vurgu"
                >
                  {kapak && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={uygulamaYolu(
                        `/panel/faaliyetler/${faaliyet.id}/ekler/${kapak.id}`,
                      )}
                      alt={kapak.dosyaAdi}
                      className="block h-40 w-full bg-zemin object-cover"
                    />
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <KategoriRozeti kategori={faaliyet.etkinlikKategorisi} />
                      <KapsamRozeti kapsam={faaliyet.kapsam} />
                      <FaaliyetDurumuRozeti durum={faaliyet.durum} />
                      <OnayRozeti onayDurumu={faaliyet.onayDurumu} />
                      <PencereRozeti pencere={pencere} />
                      {benimDurumum && <BasvuruRozeti durum={benimDurumum} />}
                      {faaliyet.duzenleyenKullaniciId === kullanici.id && (
                        <span className="text-xs text-metin-yumusak">
                          · sizin açtığınız
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-lg font-semibold text-baslik">
                      {faaliyet.ad}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-metin-yumusak">
                      {faaliyet.aciklama}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-metin-yumusak">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={15} aria-hidden />
                        {tarihYaz(faaliyet.tarih)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={15} aria-hidden />
                        {faaliyet.duzenleyenBirim}
                      </span>
                      {/* Kontenjan aktif başvuruyu sınırlar, yalnızca
                          seçilenleri değil; sayaç da ona göre gösterilir. */}
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={15} aria-hidden />
                        {kontenjan.aktifBasvuru}/{kontenjan.kontenjan} kontenjan
                      </span>
                    </div>

                    {faaliyet.calismaGruplari.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {faaliyet.calismaGruplari.map((etiket) => (
                          <span
                            key={etiket.calismaGrubu.id}
                            className="rounded-full bg-vurgu-zemin px-2.5 py-0.5 text-xs text-vurgu-metin"
                          >
                            {etiket.calismaGrubu.ad}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {ogrenciMi(kullanici) && (
        <BilgiKutusu>
          Çalışma grubu etiketleri yalnızca bilgi amaçlıdır; başvurunuzu
          kısıtlamaz. Kapsamınıza giren her faaliyete başvurabilirsiniz.
        </BilgiKutusu>
      )}
    </div>
  );
}
