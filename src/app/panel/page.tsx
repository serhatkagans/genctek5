import {
  BellRing,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Layers,
  MapPin,
  Send,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
} from "@/components/ui";
import { DuyuruSeridi } from "@/components/DuyuruSeridi";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { aktifAtamaGetir } from "@/lib/danisman/atama";
import { prisma } from "@/lib/db";
import { KAPSAM_ETIKETLERI } from "@/lib/faaliyet/kurallar";
import { seritteGosterilecekler, takvimeAyir } from "@/lib/faaliyet/takvim";
import { tarihYaz } from "@/lib/tarih";
import {
  basvuruYapabilirMi,
  danismanMi,
  ilKoordinatoruMu,
  koordinatorIlKodu,
  ogrenciMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import {
  faaliyetKapsamFiltresi,
  ogrenciKapsamFiltresi,
} from "@/lib/yetki/kapsam";
import { bildirimOkunduEylemi, tumBildirimleriOkuEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

function OlcumKarti({
  baslik,
  deger,
  aciklama,
  Ikon,
  yol,
}: {
  baslik: string;
  deger: string;
  aciklama?: string;
  Ikon: React.ComponentType<{ size?: number; className?: string }>;
  /** Verilirse kart, ilgili ekrana giden bir bağlantı olur. */
  yol?: string;
}) {
  const icerik = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-metin-yumusak">{baslik}</p>
        <Ikon size={18} className="text-vurgu-metin" />
      </div>
      <p className="mt-1 text-2xl font-bold text-baslik">{deger}</p>
      {aciklama && (
        <p className="mt-1 text-sm text-metin-yumusak">{aciklama}</p>
      )}
    </>
  );

  const sinif = "rounded-kart border border-cizgi bg-kart p-5";

  return yol ? (
    <Link href={yol} className={`${sinif} block transition hover:border-vurgu`}>
      {icerik}
    </Link>
  ) : (
    <div className={sinif}>{icerik}</div>
  );
}

export default async function PanelSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  const bildirimler = await prisma.bildirim.findMany({
    where: { kullaniciId: kullanici.id, okunduMu: false },
    orderBy: { olusturmaTarihi: "desc" },
    take: 5,
  });

  const kapsamdakiOgrenciSayisi = await prisma.kullanici.count({
    where: ogrenciKapsamFiltresi(kullanici),
  });

  const atama = ogrenciMi(kullanici)
    ? await aktifAtamaGetir(kullanici.id)
    : null;

  const grupSayisi = ogrenciMi(kullanici)
    ? await prisma.ogrenciCalismaGrubu.count({
        where: { ogrenciId: kullanici.id },
      })
    : 0;

  /*
   * Kişinin kendi başvuruları. Katılımcı öğretmen de olabildiği için koşul
   * "öğrenci mi" değil "başvurabilir mi" sorusudur (analiz dokümanı 4.2).
   */
  const basvuruSayisi = basvuruYapabilirMi(kullanici)
    ? await prisma.basvuru.count({
        where: { katilimciId: kullanici.id, durum: { not: "GERI_CEKILDI" } },
      })
    : 0;

  const simdi = new Date();

  /*
   * Etkinlik takvimi (analiz dokümanı Bölüm 6): kapsamdaki faaliyetler
   * geçmiş / bugün / yaklaşan olarak ayrılır. Ayırma işi saf bir fonksiyonda
   * (lib/faaliyet/takvim.ts), burada yalnızca veri çekiliyor.
   *
   * Geçmiş liste sınırsız büyümesin diye pencere daraltılıyor: yaklaşanların
   * hepsi, geçmişin son 90 günü. Takvim bir arşiv değil, "şu sıralar ne var"
   * ekranıdır; arşive Faaliyetler ekranından bakılır.
   */
  const doksanGunOnce = new Date(simdi.getTime() - 90 * 24 * 60 * 60 * 1000);
  const takvimFaaliyetleri = await prisma.faaliyet.findMany({
    where: {
      AND: [faaliyetKapsamFiltresi(kullanici), { tarih: { gte: doksanGunOnce } }],
    },
    orderBy: { tarih: "asc" },
    select: {
      id: true,
      ad: true,
      tarih: true,
      kapsam: true,
      durum: true,
      onayDurumu: true,
      duzenleyenBirim: true,
      basvuruBaslangic: true,
      basvuruBitis: true,
    },
  });

  const takvim = takvimeAyir(takvimFaaliyetleri, simdi);

  /*
   * Şeride yalnızca YAYINDAKİ faaliyetler girer: onay bekleyen bir faaliyet
   * düzenleyenine görünüyor olabilir ama "başvuru açık" demek yanıltıcı olurdu.
   */
  const seritKayitlari = seritteGosterilecekler(
    takvimFaaliyetleri.filter(
      (faaliyet) =>
        faaliyet.onayDurumu === "ONAY_GEREKMEZ" ||
        faaliyet.onayDurumu === "ONAYLANDI",
    ),
    simdi,
  );
  const acikFaaliyetSayisi = seritKayitlari.length;

  const onayBekleyenSayisi = projeYoneticisiMi(kullanici)
    ? await prisma.faaliyet.count({ where: { onayDurumu: "BEKLIYOR" } })
    : 0;

  const rolsuzMu = kullanici.roller.length === 0;

  return (
    <div className="space-y-8">
      <SayfaBasligi
        baslik={`Hoş geldiniz, ${kullanici.ad}`}
        aciklama={`${kullanici.egitimOgretimYili} eğitim-öğretim yılı`}
      />

      {/* Başvurusu açık faaliyetler, takvimden ÖNCE ve akan şerit hâlinde:
          kaçırılırsa geri dönüşü olmayan tek bilgi budur. */}
      <DuyuruSeridi kayitlar={seritKayitlari} simdi={simdi} />

      {rolsuzMu && (
        <div className="rounded-kart border border-uyari-cizgi bg-uyari-zemin p-6">
          <h2 className="font-semibold text-uyari-metin">
            GençTek danışman öğretmenliği
          </h2>
          <p className="mt-2 text-uyari-metin">
            Sisteme giriş yaptınız ancak henüz danışman öğretmen görevi
            almadınız. Okulunuzdaki öğrencilerin danışman seçim listesinde
            görünmek için profilinizden bu görevi işaretlemeniz gerekiyor.
          </p>
          <Link href="/panel/profil" className={`${SINIF_BIRINCIL_BUTON} mt-4`}>
            Profilime git
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ogrenciMi(kullanici) && (
          <>
            <OlcumKarti
              baslik="Danışman öğretmenim"
              Ikon={UserCheck}
              deger={
                atama
                  ? `${atama.danisman.ad} ${atama.danisman.soyad}`
                  : "Atanmadı"
              }
            />
            <OlcumKarti
              baslik="Çalışma grubu seçimim"
              Ikon={Layers}
              deger={String(grupSayisi)}
              aciklama="Çalışma Gruplarım ekranından güncelleyebilirsiniz"
            />
            <OlcumKarti
              baslik="Faaliyet başvurularım"
              Ikon={Send}
              deger={String(basvuruSayisi)}
              aciklama="Geri çekilenler hariç"
              yol="/panel/faaliyetler"
            />
          </>
        )}

        {danismanMi(kullanici) && (
          <OlcumKarti
            baslik="Danışmanlığımdaki öğrenciler"
            Ikon={Users}
            deger={String(kapsamdakiOgrenciSayisi)}
            aciklama="Kendi okulunuzdaki öğrenciler"
          />
        )}

        {ilKoordinatoruMu(kullanici) && (
          <OlcumKarti
            baslik="İlimdeki öğrenciler"
            Ikon={MapPin}
            deger={String(kapsamdakiOgrenciSayisi)}
            aciklama={`İl kodu: ${koordinatorIlKodu(kullanici) ?? "—"}`}
          />
        )}

        {projeYoneticisiMi(kullanici) && (
          <>
            <OlcumKarti
              baslik="Kayıtlı öğrenciler"
              Ikon={Users}
              deger={String(kapsamdakiOgrenciSayisi)}
              aciklama="Tüm iller"
            />
            <OlcumKarti
              baslik="Onay bekleyen ulusal faaliyet"
              Ikon={ClipboardCheck}
              deger={String(onayBekleyenSayisi)}
              yol="/panel/faaliyetler?kapsam=ULUSAL"
            />
          </>
        )}

        <OlcumKarti
          baslik="Başvurusu açık faaliyet"
          Ikon={CalendarDays}
          deger={String(acikFaaliyetSayisi)}
          aciklama="Kapsamınızda şu an başvuru alanlar"
          yol="/panel/faaliyetler?acik=1"
        />
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-baslik">
          <CalendarDays size={18} className="text-vurgu-metin" aria-hidden />
          Etkinlik takvimi
        </h2>

        {takvimFaaliyetleri.length === 0 ? (
          <Kart className="text-metin-yumusak">
            Kapsamınızda son 90 günün ve önümüzdeki dönemin faaliyet kaydı yok.
          </Kart>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                baslik: "Bugün",
                liste: takvim.bugun,
                bos: "Bugün planlanmış faaliyet yok.",
                vurgulu: true,
              },
              {
                baslik: "Yaklaşan",
                liste: takvim.yaklasan,
                bos: "Yaklaşan faaliyet yok.",
                vurgulu: false,
              },
              {
                baslik: "Geçmiş (son 90 gün)",
                liste: takvim.gecmis,
                bos: "Son 90 günde faaliyet yok.",
                vurgulu: false,
              },
            ].map((bolum) => (
              <div
                key={bolum.baslik}
                className={`rounded-kart border bg-kart p-5 ${
                  bolum.vurgulu && bolum.liste.length > 0
                    ? "border-vurgu"
                    : "border-cizgi"
                }`}
              >
                <h3 className="text-sm font-semibold text-baslik">
                  {bolum.baslik}
                  <span className="ml-2 font-normal text-metin-yumusak">
                    {bolum.liste.length}
                  </span>
                </h3>

                {bolum.liste.length === 0 ? (
                  <p className="mt-3 text-sm text-metin-yumusak">{bolum.bos}</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {/* Her bölümde en fazla beş kayıt: takvim özet, arşiv
                        değil. Tamamı Faaliyetler ekranında. */}
                    {bolum.liste.slice(0, 5).map((faaliyet) => (
                      <li key={faaliyet.id}>
                        <Link
                          href={`/panel/faaliyetler/${faaliyet.id}`}
                          className="text-sm font-medium text-metin transition hover:text-vurgu-metin hover:underline"
                        >
                          {faaliyet.ad}
                        </Link>
                        <p className="text-xs text-metin-yumusak">
                          {tarihYaz(faaliyet.tarih)} ·{" "}
                          {KAPSAM_ETIKETLERI[faaliyet.kapsam]}
                          {faaliyet.durum === "IPTAL_EDILDI"
                            ? " · iptal edildi"
                            : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {bolum.liste.length > 5 && (
                  <p className="mt-3 text-xs text-metin-yumusak">
                    +{bolum.liste.length - 5} kayıt daha
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
            <BellRing size={18} className="text-vurgu-metin" aria-hidden />
            Bildirimler
          </h2>
          {bildirimler.length > 0 && (
            <form action={tumBildirimleriOkuEylemi}>
              <button
                type="submit"
                className="text-sm font-medium text-vurgu-metin"
              >
                Tümünü okundu işaretle
              </button>
            </form>
          )}
        </div>
        {bildirimler.length === 0 ? (
          <Kart className="text-metin-yumusak">
            <span className="inline-flex items-center gap-2">
              <CheckSquare size={16} aria-hidden />
              Okunmamış bildiriminiz yok.
            </span>
          </Kart>
        ) : (
          <ul className="space-y-2">
            {bildirimler.map((bildirim) => (
              <li
                key={bildirim.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-kart border border-cizgi bg-kart px-4 py-3"
              >
                <div>
                  <p className="font-medium text-metin">{bildirim.baslik}</p>
                  <p className="mt-1 text-sm whitespace-pre-line text-metin-yumusak">
                    {bildirim.icerik}
                  </p>
                </div>
                <form action={bildirimOkunduEylemi}>
                  <input type="hidden" name="bildirimId" value={bildirim.id} />
                  <button
                    type="submit"
                    aria-label="Okundu işaretle"
                    className="rounded-md border border-cizgi px-2.5 py-1 text-xs font-medium text-metin-yumusak transition hover:bg-zemin"
                  >
                    Okundu
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BilgiKutusu>
        Faaliyete dosya/görsel ekleme, yorumlar ve raporlama ekranları
        geliştirme sırasının sonraki adımlarında açılacak.
      </BilgiKutusu>
    </div>
  );
}
