import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { AYAR_ANAHTARLARI, ayarSayi } from "@/lib/ayar";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  ETKINLIK_KATEGORILERI,
  ETKINLIK_KATEGORISI_ACIKLAMALARI,
  ETKINLIK_KATEGORISI_ETIKETLERI,
  KAPSAM_ETIKETLERI,
  kapsamSecenekleri,
  onayDurumuBelirle,
} from "@/lib/faaliyet/kurallar";
import { girdiTarihi } from "@/lib/tarih";
import {
  danismanKurumKodu,
  koordinatorIlKodu,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { faaliyetOlusturEylemi } from "../eylemler";

export const dynamic = "force-dynamic";

/**
 * Faaliyet açma formu.
 *
 * Form yalnızca rolün açabildiği kapsamları TEKLİF eder; asıl kontrol sunucu
 * eyleminde tekrarlanır. Yer bilgisi (okul / il) forma sorulmaz, roldan
 * türetilir — tek istisna YEĞİTEK'in il faaliyetinde ili seçmesidir.
 */

const SINIF_ETIKET = "text-sm font-medium text-metin";

export default async function YeniFaaliyetSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();
  const kapsamlar = kapsamSecenekleri(kullanici);

  if (kapsamlar.length === 0) {
    return (
      <Kart>
        <KartBasligi
          baslik="Yeni faaliyet"
          aciklama="Faaliyet açma yetkiniz yok. Danışman öğretmen okul içi, il koordinatörü il ve ulusal faaliyet açabilir."
        />
        <Link href="/panel/faaliyetler" className={SINIF_IKINCIL_BUTON}>
          Faaliyetlere dön
        </Link>
      </Kart>
    );
  }

  const merkezMi = projeYoneticisiMi(kullanici);
  const kurumKodu = danismanKurumKodu(kullanici) ?? kullanici.kurumKodu;

  const [okul, il, iller, ilceler, gruplar] = await Promise.all([
    kapsamlar.includes("OKUL") && kurumKodu !== null
      ? prisma.kurum.findUnique({
          where: { kurumKodu },
          select: { ad: true },
        })
      : null,
    koordinatorIlKodu(kullanici)
      ? prisma.il.findUnique({
          where: { ilKodu: koordinatorIlKodu(kullanici)! },
          select: { ad: true },
        })
      : null,
    // İl seçimi yalnızca YEĞİTEK'e sorulur; koordinatörün ili roldan gelir.
    merkezMi ? prisma.il.findMany({ orderBy: { ad: "asc" } }) : [],
    /*
     * İlçe daraltması yalnızca ili önceden BİLİNEN kullanıcıya sorulur. YEĞİTEK
     * ili aynı formda seçtiği için ilçe listesi JavaScript'siz doğru
     * doldurulamaz; yanlış ilin ilçesini teklif etmektense hiç sormuyoruz.
     * Sunucu eylemi yine de ilçenin faaliyetin iline ait olduğunu doğrular.
     */
    koordinatorIlKodu(kullanici)
      ? prisma.ilce.findMany({
          where: { ilKodu: koordinatorIlKodu(kullanici)! },
          orderBy: { ad: "asc" },
          select: { ilceKodu: true, ad: true },
        })
      : [],
    prisma.calismaGrubu.findMany({
      where: { aktif: true },
      orderBy: { siraNo: "asc" },
      select: { id: true, ad: true },
    }),
  ]);

  // Adı sabit programlar. Pasife alınmışlar yeni faaliyette teklif edilmez;
  // geçmiş faaliyetlerin bağlantısı korunur.
  const programlar = await prisma.temelEtkinlikProgrami.findMany({
    where: { aktif: true },
    orderBy: [{ grup: "asc" }, { siraNo: "asc" }],
    select: { id: true, ad: true, grup: true },
  });

  // Sınır koda gömülü değil, sistem ayarından gelir; kullanıcıya da o yazılır.
  const gorselMaksBayt = await ayarSayi(
    AYAR_ANAHTARLARI.GORSEL_MAKS_BAYT,
    5 * 1024 * 1024,
  );

  const bugun = girdiTarihi(new Date());
  const onayaTabiKapsamlar = kapsamlar.filter(
    (kapsam) => onayDurumuBelirle(kullanici, kapsam) === "BEKLIYOR",
  );

  const yerAciklamasi = (kapsam: (typeof kapsamlar)[number]) => {
    if (kapsam === "OKUL") return okul?.ad ?? "okulunuz";
    if (kapsam === "IL") return merkezMi ? "seçtiğiniz il" : (il?.ad ?? "iliniz");
    return "ülke geneli";
  };

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Yeni faaliyet"
        aciklama="Faaliyetin yeri açtığınız göreve göre belirlenir; ayrıca seçmenize gerek yoktur."
      />

      {hata && (
        <div className="rounded-kart border border-hata-cizgi bg-hata-zemin px-4 py-3 text-sm text-hata-metin">
          {hata}
        </div>
      )}

      {onayaTabiKapsamlar.length > 0 && (
        <BilgiKutusu cesit="uyari">
          Açtığınız ulusal faaliyet, proje yöneticisi onayından sonra yayına
          girer. Onaya kadar öğrencilere görünmez.
        </BilgiKutusu>
      )}

      {/* encType verilmez: sunucu eylemi kullanan formda React'in kendisi
          multipart'a geçer, elle vermek uyarı üretir. */}
      <form action={faaliyetOlusturEylemi} className="space-y-6">
        <Kart>
          <KartBasligi baslik="Faaliyet bilgileri" Ikon={CalendarPlus} />

          <div className="space-y-4">
            {/*
              Etkinlik kategorisi KAPSAMDAN ayrı bir alandır: kapsam kimin
              başvurabileceğini, kategori etkinliğin ne olduğunu belirler. Her
              kapsam her kategoriyle birleşebilir.
            */}
            <label className="block">
              <span className={SINIF_ETIKET}>Etkinlik kategorisi</span>
              <select
                name="etkinlikKategorisi"
                required
                defaultValue="IL_ETKINLIGI"
                className={SINIF_GIRDI}
              >
                {ETKINLIK_KATEGORILERI.map((kategori) => (
                  <option key={kategori} value={kategori}>
                    {ETKINLIK_KATEGORISI_ETIKETLERI[kategori]}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-sm text-metin-yumusak">
                {ETKINLIK_KATEGORILERI.map((kategori) => (
                  <span key={kategori} className="block">
                    <strong>{ETKINLIK_KATEGORISI_ETIKETLERI[kategori]}:</strong>{" "}
                    {ETKINLIK_KATEGORISI_ACIKLAMALARI[kategori]}
                  </span>
                ))}
              </span>
            </label>

            <label className="block">
              <span className={SINIF_ETIKET}>
                Program{" "}
                <span className="text-metin-yumusak">
                  (Temel Etkinlik ve Çalışma Grubu Etkinliği için zorunlu)
                </span>
              </span>
              <select
                name="temelEtkinlikProgramiId"
                defaultValue=""
                className={SINIF_GIRDI}
              >
                <option value="">Seçiniz</option>
                <optgroup label="Temel Etkinlik">
                  {programlar
                    .filter((program) => program.grup === "TEMEL_ETKINLIK")
                    .map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.ad}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Çalışma Grubu Etkinliği">
                  {programlar
                    .filter(
                      (program) => program.grup === "CALISMA_GRUBU_ETKINLIGI",
                    )
                    .map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.ad}
                      </option>
                    ))}
                </optgroup>
              </select>
              <span className="mt-1 block text-sm text-metin-yumusak">
                Bu iki kategoride faaliyetin adı seçtiğiniz programdan gelir.
              </span>
            </label>

            <label className="block">
              <span className={SINIF_ETIKET}>
                Faaliyet adı{" "}
                <span className="text-metin-yumusak">
                  (yalnızca İl Etkinliği&apos;nde doldurulur)
                </span>
              </span>
              <input
                type="text"
                name="ad"
                maxLength={250}
                className={SINIF_GIRDI}
                placeholder="Örn. Robot Futbol Ligi"
              />
            </label>

            <label className="block">
              <span className={SINIF_ETIKET}>Açıklama</span>
              <textarea
                name="aciklama"
                required
                rows={5}
                className={SINIF_GIRDI}
                placeholder="Faaliyetin içeriği, katılım koşulları, yeri."
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={SINIF_ETIKET}>Kapsam</span>
                <select
                  name="kapsam"
                  required
                  defaultValue={kapsamlar[0]}
                  className={SINIF_GIRDI}
                >
                  {kapsamlar.map((kapsam) => (
                    <option key={kapsam} value={kapsam}>
                      {KAPSAM_ETIKETLERI[kapsam]} — {yerAciklamasi(kapsam)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={SINIF_ETIKET}>Kontenjan</span>
                <input
                  type="number"
                  name="kontenjan"
                  required
                  min={1}
                  defaultValue={20}
                  className={SINIF_GIRDI}
                />
              </label>
            </div>

            {merkezMi && (
              <label className="block">
                <span className={SINIF_ETIKET}>
                  İl <span className="text-metin-yumusak">(il geneli faaliyette zorunlu)</span>
                </span>
                <select name="ilKodu" defaultValue="" className={SINIF_GIRDI}>
                  <option value="">Seçiniz</option>
                  {iller.map((secenek) => (
                    <option key={secenek.ilKodu} value={secenek.ilKodu}>
                      {secenek.ad}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {ilceler.length > 0 && (
              <label className="block">
                <span className={SINIF_ETIKET}>
                  İlçe{" "}
                  <span className="text-metin-yumusak">
                    (isteğe bağlı, yalnızca il geneli faaliyette kullanılır)
                  </span>
                </span>
                <select name="ilceKodu" defaultValue="" className={SINIF_GIRDI}>
                  <option value="">İl geneli</option>
                  {ilceler.map((ilce) => (
                    <option key={ilce.ilceKodu} value={ilce.ilceKodu}>
                      {ilce.ad}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={SINIF_ETIKET}>Faaliyet tarihi</span>
                <input
                  type="datetime-local"
                  name="tarih"
                  required
                  className={SINIF_GIRDI}
                />
              </label>
              <label className="block">
                <span className={SINIF_ETIKET}>Başvuru başlangıcı</span>
                <input
                  type="date"
                  name="basvuruBaslangic"
                  required
                  defaultValue={bugun}
                  className={SINIF_GIRDI}
                />
              </label>
              <label className="block">
                <span className={SINIF_ETIKET}>Başvuru bitişi</span>
                <input
                  type="date"
                  name="basvuruBitis"
                  required
                  className={SINIF_GIRDI}
                />
              </label>
            </div>
            <p className="text-sm text-metin-yumusak">
              Başvurular bitiş tarihinin sonuna kadar açık kalır.
            </p>

            <label className="block">
              <span className={SINIF_ETIKET}>
                Tanıtıcı görsel{" "}
                <span className="text-metin-yumusak">(isteğe bağlı)</span>
              </span>
              <input
                type="file"
                name="kapakGorseli"
                accept="image/jpeg,image/png,image/webp"
                className={`${SINIF_GIRDI} file:mr-3 file:rounded-md file:border-0 file:bg-zemin file:px-3 file:py-1 file:text-sm file:text-metin`}
              />
              <span className="mt-1 block text-sm text-metin-yumusak">
                Faaliyet listesinde ve detay sayfasında görünür. jpg, png veya
                webp; en fazla {(gorselMaksBayt / (1024 * 1024)).toFixed(0)} MB.
                Sonradan detay sayfasından değiştirebilirsiniz.
              </span>
            </label>
          </div>
        </Kart>

        <Kart>
          <KartBasligi
            baslik="İlgili çalışma grupları"
            aciklama="Etiket niteliğindedir: başvuruyu kısıtlamaz, yalnızca faaliyetin hangi alanla ilgili olduğunu gösterir."
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {gruplar.map((grup) => (
              <label
                key={grup.id}
                className="flex items-center gap-2 rounded-md border border-cizgi px-3 py-2 text-sm text-metin"
              >
                <input
                  type="checkbox"
                  name="grupId"
                  value={grup.id}
                  className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
                />
                {grup.ad}
              </label>
            ))}
          </div>
        </Kart>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Faaliyeti oluştur
          </button>
          <Link href="/panel/faaliyetler" className={SINIF_IKINCIL_BUTON}>
            Vazgeç
          </Link>
        </div>
      </form>
    </div>
  );
}
