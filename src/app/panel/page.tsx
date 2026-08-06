import {
  BarChart3,
  BellRing,
  CircleAlert,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Layers,
  MapPin,
  Send,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KatlanabilirKart,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { CalismaGrubuSecimi } from "@/components/CalismaGrubuSecimi";
import { DanismanSecimi } from "@/components/DanismanSecimi";
import { MesajSeridi } from "@/components/MesajSeridi";
import { KapsamRozeti, KategoriRozeti } from "@/components/FaaliyetRozetleri";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { danismanSecimVerisiGetir } from "@/lib/danisman/atama";
import { calismaGruplariniGetir } from "@/lib/ogrenci/calisma-grubu";
import { calismaGrubuKaydetEylemi } from "./calisma-gruplari/eylemler";
import { danismanSecEylemi } from "./danisman-secim/eylemler";
import { belgeGuncellemeTarihleri } from "@/lib/kvkk/onay";
import {
  faaliyetKatilimSayisi,
  merkezBosluklariniGetir,
  merkezIstatistikleriniGetir,
} from "@/lib/rapor/istatistik";
import { ilKoordinatoruOzeti } from "@/lib/rol/koordinator";
import { prisma } from "@/lib/db";
import {
  basvuruYapilabilirMi,
  KAPSAM_ETIKETLERI,
  kontenjanDurumu,
} from "@/lib/faaliyet/kurallar";
import {
  kalanGunYaz,
  seritteGosterilecekler,
  takvimeAyir,
} from "@/lib/faaliyet/takvim";
import { katilimGecmisiGetir } from "@/lib/kazanim/getir";
import { tarihYaz } from "@/lib/tarih";
import {
  basvuruYapabilirMi,
  disKullaniciMi,
  mezunMu,
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

/**
 * Panelim'den yapılan seçimlerin geri bildirimi.
 *
 * Seçim eylemleri iki yerden çağrılıyor (buradaki bölümler ve eski sekme
 * sayfaları); dönüş adresine göre mesaj burada da basılmalı, yoksa öğrenci
 * kaydettikten sonra hiçbir onay görmez ve işlemin geçtiğinden emin olamaz.
 */
const DURUM_MESAJLARI: Record<string, string> = {
  secildi: "Danışman öğretmeniniz kaydedildi.",
  kaydedildi: "Çalışma grubu seçiminiz kaydedildi.",
};

export default async function PanelSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; durum?: string }>;
}) {
  const { hata: seciimHatasi, durum: secimDurumu } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  const bildirimler = await prisma.bildirim.findMany({
    where: { kullaniciId: kullanici.id, okunduMu: false },
    orderBy: { olusturmaTarihi: "desc" },
    take: 5,
  });

  /*
   * Okunmamışın TAMAMI. Liste `take: 5` olduğu için tek başına sayı vermiyor;
   * sarı şerit "10 okunmamış" diyebilsin diye ayrıca sayılıyor. Sorgu
   * `bildirim(kullanici_id, okundu_mu)` dizinine oturuyor.
   */
  const okunmamisMesajSayisi =
    bildirimler.length < 5
      ? bildirimler.length
      : await prisma.bildirim.count({
          where: { kullaniciId: kullanici.id, okunduMu: false },
        });

  const kapsamdakiOgrenciSayisi = await prisma.kullanici.count({
    where: ogrenciKapsamFiltresi(kullanici),
  });

  /*
   * ÖĞRENCİNİN SEÇİM BÖLÜMLERİ (C1 · 5 Ağustos 2026).
   *
   * "Çalışma Gruplarım" ve "Danışmanım" sekmeleri menüden kalktı; ikisi de
   * artık bu sayfanın içinde bölüm. Sorgular ve formlar sekmelerdekiyle AYNI
   * kaynaktan geliyor (lib/danisman/atama.ts, lib/ogrenci/calisma-grubu.ts) —
   * ayrı yazılsalardı iki yüzey zamanla ayrışırdı.
   */
  const danismanVerisi = ogrenciMi(kullanici)
    ? await danismanSecimVerisiGetir(kullanici)
    : null;
  const atama = danismanVerisi?.atama ?? null;

  const calismaGruplari = ogrenciMi(kullanici)
    ? await calismaGruplariniGetir(kullanici.id)
    : null;
  const grupSayisi = calismaGruplari?.seciliIdler.size ?? 0;

  /*
   * Öğretmenin bağlı olduğu il koordinatörü.
   *
   * Koordinatörün KENDİSİNE gösterilmez (kendi adını kart olarak görmesi
   * anlamsız), proje yöneticisine de gösterilmez (tek bir ile bağlı değil).
   * Öğrenciye de gösterilmez: onun muhatabı danışman öğretmenidir.
   */
  /*
   * Merkez istatistikleri ülke geneli sayımdır ve yalnızca proje yöneticisine
   * gösterilir; başka rollerde sorgu hiç çalıştırılmaz.
   */
  const merkezIstatistik = projeYoneticisiMi(kullanici)
    ? await merkezIstatistikleriniGetir(kullanici.egitimOgretimYili)
    : null;
  const katilim = projeYoneticisiMi(kullanici)
    ? await faaliyetKatilimSayisi()
    : null;
  /*
   * Boşluklar sayımdan AYRI çekiliyor ve ekranda ayrı gösteriliyor: "kaç
   * öğrenci var" ile "kaç öğrenci danışmansız" farklı sorular. Tek listede
   * olsalardı acil olanlar sayım kalabalığında kaybolurdu.
   */
  const bosluklar = projeYoneticisiMi(kullanici)
    ? await merkezBosluklariniGetir(await belgeGuncellemeTarihleri())
    : null;

  /*
   * "İl koordinatörüm" kartı, ilinde kime bağlı olduğunu bilmesi gereken okul
   * personeline gösterilir. Dış kullanıcılar (mezun, paydaş temsilcisi)
   * DIŞARIDA: koşul yalnızca "ili var ve öğrenci/koordinatör değil" deseydi,
   * kart onlara da koordinatörün adını ve e-postasını basardı — dar başlangıç
   * kararına aykırı.
   */
  const koordinatorGosterilir =
    !ogrenciMi(kullanici) &&
    !ilKoordinatoruMu(kullanici) &&
    !projeYoneticisiMi(kullanici) &&
    !disKullaniciMi(kullanici) &&
    kullanici.ilKodu !== null;

  const ilKoordinatorum = koordinatorGosterilir
    ? await ilKoordinatoruOzeti(kullanici.ilKodu as string)
    : null;

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
  const seritKayitlari = basvuruYapabilirMi(kullanici)
    ? seritteGosterilecekler(
        takvimFaaliyetleri.filter(
          (faaliyet) =>
            faaliyet.onayDurumu === "ONAY_GEREKMEZ" ||
            faaliyet.onayDurumu === "ONAYLANDI",
        ),
        simdi,
      )
    : /*
       * Şerit "başvuru açık" der; başvuramayana göstermek yanıltıcı olurdu.
       * Merkez personeli ve dış kullanıcılar etkinlikleri takvimde görmeye
       * devam eder, sadece bu çağrı şeridini görmez.
       */
      [];
  const acikFaaliyetSayisi = seritKayitlari.length;

  const onayBekleyenSayisi = projeYoneticisiMi(kullanici)
    ? await prisma.faaliyet.count({ where: { onayDurumu: "BEKLIYOR" } })
    : 0;

  /*
   * Başvuruya açık faaliyetler — panelin "kaçırma" listesi.
   *
   * Sıra başvurusu EN SON AÇILAN'dan başlar: takvim ve şerit zaten "en yakın
   * tarihli" ve "en önce kapanacak" sıralamalarını gösteriyor, üçüncü bir
   * yerde aynı sırayı tekrarlamak yeni bilgi vermezdi. Kullanıcının burada
   * aradığı "son girdiğimden beri ne açıldı" sorusunun cevabıdır.
   *
   * Başvurular da çekilir çünkü kart yalnızca listelemekle kalmaz, kişinin O
   * FAALİYETE başvurup başvuramayacağını da söyler; kontenjan canlı sayılır
   * (bkz. lib/faaliyet/kurallar.ts · kontenjanDurumu).
   */
  const acikFaaliyetler = basvuruYapabilirMi(kullanici)
    ? await prisma.faaliyet.findMany({
        where: {
          AND: [
            faaliyetKapsamFiltresi(kullanici),
            { durum: "AKTIF" },
            { onayDurumu: { in: ["ONAY_GEREKMEZ", "ONAYLANDI"] } },
            { basvuruBaslangic: { lte: simdi } },
            { basvuruBitis: { gte: simdi } },
          ],
        },
        orderBy: [{ basvuruBaslangic: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          ad: true,
          tarih: true,
          kapsam: true,
          durum: true,
          onayDurumu: true,
          kontenjan: true,
          basvuruBitis: true,
          duzenleyenBirim: true,
          basvurular: { select: { durum: true, katilimciId: true } },
        },
      })
    : [];

  const acikFaaliyetKartlari = acikFaaliyetler.map((faaliyet) => {
    const benimBasvurum = faaliyet.basvurular.find(
      (basvuru) => basvuru.katilimciId === kullanici.id,
    );
    const durum = kontenjanDurumu(faaliyet.basvurular, faaliyet.kontenjan);
    return {
      faaliyet,
      kalanYer: durum.kalanYer,
      karar: basvuruYapilabilirMi({
        pencere: "ACIK" as const,
        onayDurumu: faaliyet.onayDurumu,
        faaliyetDurumu: faaliyet.durum,
        mevcutBasvuruDurumu: benimBasvurum?.durum ?? null,
        kontenjanDoluMu: durum.doluMu,
      }),
    };
  });

  /*
   * Öğretmenin (ve katılımcı olabilen koordinatörün) tamamlanmış katılımları.
   * Öğrencide aynı liste Katkılarım ekranında; öğretmene Panelim'de de
   * gösteriliyor çünkü "daha önce katıldığım etkinlikler" ana sayfada
   * aranır — menüdeki Katkılarım'a kadar gitmek gereksiz adım olurdu.
   */
  const katilimGecmisi =
    !ogrenciMi(kullanici) && basvuruYapabilirMi(kullanici)
      ? await katilimGecmisiGetir(kullanici.id, simdi)
      : null;

  const rolsuzMu = kullanici.roller.length === 0;

  return (
    <div className="space-y-8">
      <SayfaBasligi
        baslik={`Hoş geldiniz, ${kullanici.ad}`}
        aciklama={`${kullanici.egitimOgretimYili} eğitim-öğretim yılı`}
      />

      {/* Başvurusu açık faaliyetler, takvimden ÖNCE ve akan şerit hâlinde:
          kaçırılırsa geri dönüşü olmayan tek bilgi budur. */}
      {secimDurumu && DURUM_MESAJLARI[secimDurumu] && (
        <BilgiKutusu cesit="olumlu">
          {DURUM_MESAJLARI[secimDurumu]}
        </BilgiKutusu>
      )}
      {seciimHatasi && <BilgiKutusu cesit="hata">{seciimHatasi}</BilgiKutusu>}

      {/*
        Sarı şerit artık BAŞVURU değil MESAJ duyuruyor (6 Ağustos 2026).
        Başvuru bilgisi aşağıdaki "Başvurusu açık etkinlik" sayacında ve
        kartında duruyor; `seritKayitlari` o sayacı beslemeye devam ediyor.
      */}
      <MesajSeridi mesajlar={bildirimler} toplam={okunmamisMesajSayisi} />

      {/*
        Dış kullanıcının panelinde ölçüm kartlarının çoğu boş kalır (başvurusu,
        danışmanı, çalışma grubu yok). Boş bir ekran bırakmak yerine ne
        yapabileceği açıkça yazılıyor — ve ne YAPAMAYACAĞI da: yetki kapsamı
        dar başladı, kullanıcı bunu ekranda görmeli, denemelerinden çıkarmaya
        çalışmamalı.
      */}
      {disKullaniciMi(kullanici) && (
        <div className="rounded-kart border border-cizgi bg-kart p-6">
          <h2 className="font-semibold text-baslik">
            {mezunMu(kullanici) ? "Mezun hesabınız" : "Paydaş temsilcisi hesabınız"}
          </h2>
          <p className="mt-2 text-metin-yumusak">
            Etkinlik takvimini ve panoyu görebilir, panoda ilan açabilir
            ve onaylanan bağlantılar üzerinden yazışabilirsiniz. Öğrenci ve
            öğretmen kayıtlarına erişiminiz yoktur; etkinliklere katılımcı
            olarak başvuru şu an açık değildir.
          </p>
          <Link href="/panel/talepler" className={`${SINIF_BIRINCIL_BUTON} mt-4`}>
            Panoya git
          </Link>
        </div>
      )}

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
              aciklama="Aşağıdaki bölümden güncelleyebilirsiniz"
            />
            <OlcumKarti
              baslik="Etkinlik başvurularım"
              Ikon={Send}
              deger={String(basvuruSayisi)}
              aciklama="Geri çekilenler hariç"
              yol="/panel/etkinlikler"
            />
          </>
        )}

        {danismanMi(kullanici) && (
          <>
            <OlcumKarti
              baslik="Danışmanlığımdaki öğrenciler"
              Ikon={Users}
              deger={String(kapsamdakiOgrenciSayisi)}
              aciklama="Kendi okulunuzdaki öğrenciler"
            />
            <OlcumKarti
              baslik="Katkı kartım"
              Ikon={Sparkles}
              deger="Görüntüle"
              aciklama="Görevleriniz, danışmanlığınız ve düzenlediğiniz etkinlikler"
              yol="/panel/kazanimlarim"
            />
          </>
        )}

        {!ogrenciMi(kullanici) &&
          !projeYoneticisiMi(kullanici) &&
          katilimGecmisi && (
            <OlcumKarti
              baslik="Katıldığım etkinlikler"
              Ikon={CalendarCheck}
              deger={String(katilimGecmisi.ozet.toplamKatilim)}
              aciklama="Tamamlanmış etkinlikler"
              yol="/panel/kazanimlarim"
            />
          )}

        {koordinatorGosterilir && (
          <OlcumKarti
            baslik="İl koordinatörüm"
            Ikon={MapPin}
            deger={
              ilKoordinatorum
                ? `${ilKoordinatorum.ad} ${ilKoordinatorum.soyad}`
                : "Atanmadı"
            }
            /*
             * E-posta kişinin kendi girdiği alandır, boş olabilir. Boşken
             * "—" yazmak yerine ne yapılacağı söyleniyor: öğretmen
             * koordinatöre ulaşmak istediğinde çıkmaz sokakta kalmasın.
             */
            aciklama={
              ilKoordinatorum
                ? (ilKoordinatorum.eposta ??
                  "E-posta girilmemiş — okulunuz üzerinden ulaşın")
                : "İlinize henüz koordinatör atanmadı"
            }
          />
        )}

        {ilKoordinatoruMu(kullanici) && (
          <>
            <OlcumKarti
              baslik="İlimdeki öğrenciler"
              Ikon={MapPin}
              deger={String(kapsamdakiOgrenciSayisi)}
              aciklama={`İl kodu: ${koordinatorIlKodu(kullanici) ?? "—"}`}
            />
            <OlcumKarti
              baslik="Katkı kartım"
              Ikon={Sparkles}
              deger="Görüntüle"
              aciklama="Görevleriniz ve düzenlediğiniz etkinlikler"
              yol="/panel/kazanimlarim"
            />
          </>
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
              baslik="Onay bekleyen ulusal etkinlik"
              Ikon={ClipboardCheck}
              deger={String(onayBekleyenSayisi)}
              yol="/panel/etkinlikler?kapsam=ULUSAL"
            />
            {katilim && (
              <OlcumKarti
                baslik="Etkinlik katılımı"
                Ikon={Send}
                deger={String(katilim.toplamKatilim)}
                /*
                 * Toplam ve tekil AYRI sorulardır: ilki programın yükünü,
                 * ikincisi kaç farklı kişiye ulaşıldığını söyler. Tek sayı
                 * gösterilseydi "400 katılım" ile "120 öğrenciye ulaştık"
                 * birbirine karışırdı.
                 */
                aciklama={`${katilim.tekilKatilimci} farklı kişi · seçilmiş başvurular`}
              />
            )}
          </>
        )}

        <OlcumKarti
          baslik="Başvurusu açık etkinlik"
          Ikon={CalendarDays}
          deger={String(acikFaaliyetSayisi)}
          aciklama="Kapsamınızda şu an başvuru alanlar"
          yol="/panel/etkinlikler?acik=1"
        />
      </div>

      {/*
        ÖĞRENCİNİN SEÇİMLERİ — eskiden iki ayrı sekmeydi, artık burada
        (C1 · 5 Ağustos 2026).

        Bölümler KATLI geliyor: Panelim öğrencinin ilk gördüğü ekran ve asıl
        işi (başvurusu açık etkinlikler, takvim) iki formun altında kalmamalı.
        İstisna, kullanıcının GERÇEKTEN bir şey yapması gereken hâl: danışmanı
        yoksa ya da hiç grup seçmemişse ilgili bölüm açık açılır.
      */}
      {danismanVerisi && (
        <KatlanabilirKart
          baslik="Danışman öğretmenim"
          aciklama={
            atama
              ? `${atama.danisman.ad} ${atama.danisman.soyad}`
              : "Henüz danışman atanmadı."
          }
          Ikon={UserCheck}
          capa="danismanim"
          baslangictaAcik={atama === null}
        >
          <DanismanSecimi
            veri={danismanVerisi}
            secEylemi={danismanSecEylemi}
            donusYolu="/panel"
            kartlaSar={false}
          />
        </KatlanabilirKart>
      )}

      {/*
        Katkı GİRİŞİ buradan başlar, gösterimi profilde. İstekteki "Katkılarım
        (Panel sekmesinden giriş olacak, profilde gözükecek)" ifadesi böyle
        okundu: Panelim giriş noktası, kayıtların kendisi profilde yaşıyor.
        Formu buraya İKİNCİ KEZ basmak, aynı kaydın iki ayrı yerden girildiği
        ve birinde görünüp öbüründe görünmediği bir düzen üretirdi.
      */}
      {ogrenciMi(kullanici) && (
        <Kart>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
            <Sparkles size={18} className="text-vurgu-metin" aria-hidden />
            Katkı girişi
          </h2>
          <p className="mt-1 text-sm text-metin-yumusak">
            Katıldığın etkinlikleri, yaptığın ürünleri, verdiğin akran
            eğitimlerini ve derecelerini profilinden ekleyebilirsin. Kayıtlar
            GençTek Yolculuğum ve Bilişim Yolculuğum bölümlerinde görünür.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/panel/profil#kayit-ekle"
              className={SINIF_BIRINCIL_BUTON}
            >
              Yeni kayıt ekle
            </Link>
            {/*
              "Sertifika ve Topluluk ekle başlıkları da oluşturulacak (bu bölüm
              panelde olacak)" — istenen giriş noktası burası. Bağlantılar formu
              İKİNCİ KEZ basmıyor, profildeki tek forma doğru sekme seçili
              inerler: aynı kaydın iki ayrı formdan girilmesi, birinde eklenen
              alanın öbüründe eksik kalması demek olurdu.
            */}
            <Link
              href="/panel/profil?tur=SERTIFIKA#kayit-ekle"
              className={SINIF_IKINCIL_BUTON}
            >
              Sertifika ekle
            </Link>
            <Link
              href="/panel/profil?tur=TOPLULUK#kayit-ekle"
              className={SINIF_IKINCIL_BUTON}
            >
              Topluluk ekle
            </Link>
            <Link href="/panel/kazanimlarim" className={SINIF_IKINCIL_BUTON}>
              Katkılarım
            </Link>
          </div>
        </Kart>
      )}

      {calismaGruplari && (
        <KatlanabilirKart
          baslik="Çalışma gruplarım"
          aciklama={
            grupSayisi > 0
              ? `${grupSayisi} grup seçtiniz. İstediğiniz kadar grup seçebilirsiniz; sayı sınırı yoktur.`
              : "Henüz grup seçmediniz. İlgi alanınıza göre istediğiniz kadar seçebilirsiniz."
          }
          Ikon={Layers}
          capa="calisma-gruplarim"
          baslangictaAcik={grupSayisi === 0}
        >
          <CalismaGrubuSecimi
            gruplar={calismaGruplari.gruplar}
            seciliIdler={calismaGruplari.seciliIdler}
            kaydetEylemi={calismaGrubuKaydetEylemi}
            donusYolu="/panel"
          />
        </KatlanabilirKart>
      )}

      {merkezIstatistik && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-baslik">
            <BarChart3 size={18} className="text-vurgu-metin" aria-hidden />
            Ekosistem sayıları
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                etiket: "Toplam öğrenci",
                deger: merkezIstatistik.toplamOgrenci,
                alt: "Aktif öğrenci rolü olan kayıtlar",
              },
              {
                etiket: "Çalışma grubuna kayıtlı",
                deger: merkezIstatistik.calismaGrubunaKayitliOgrenci,
                // Seçim değil ÖĞRENCİ sayılır: bir öğrenci birden çok grup
                // seçebiliyor, satır sayılsaydı sayı şişerdi.
                alt: "En az bir grup seçmiş öğrenci",
              },
              {
                etiket: "Okul temsilcisi",
                deger: merkezIstatistik.okulTemsilcisi,
                alt: "Bu eğitim-öğretim yılı",
              },
              {
                etiket: "İl temsilcisi",
                deger: merkezIstatistik.ilTemsilcisi,
                alt: "Bu eğitim-öğretim yılı",
              },
              {
                etiket: "İlçe temsilcisi",
                deger: merkezIstatistik.ilceTemsilcisi,
                alt: "Bu eğitim-öğretim yılı",
              },
              {
                etiket: "Danışman öğretmen",
                deger: merkezIstatistik.danismanOgretmen,
                alt: "Görevi süren danışmanlar",
              },
              {
                etiket: "İl koordinatörü",
                deger: merkezIstatistik.ilKoordinatoru,
                alt:
                  merkezIstatistik.koordinatorsuzIl > 0
                    ? `${merkezIstatistik.koordinatorsuzIl} il boş`
                    : "Tüm iller dolu",
              },
            ].map((satir) => (
              <div
                key={satir.etiket}
                className="rounded-kart border border-cizgi bg-kart p-4"
              >
                <p className="text-sm font-medium text-metin-yumusak">
                  {satir.etiket}
                </p>
                <p className="mt-1 text-2xl font-bold text-baslik">
                  {satir.deger}
                </p>
                <p className="mt-0.5 text-sm text-metin-yumusak">{satir.alt}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {bosluklar && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-baslik">
            <CircleAlert size={18} className="text-uyari-metin" aria-hidden />
            Dikkat gerektirenler
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                etiket: "Danışmansız öğrenci",
                deger: bosluklar.danismansizOgrenci,
                alt: "Aktif danışman ataması yok",
                yol: "/panel/ogrenciler",
              },
              {
                etiket: "Raporsuz biten etkinlik",
                deger: bosluklar.raporsuzFaaliyet,
                alt: "Bitti ama raporu yazılmadı",
                yol: "/panel/raporlar",
              },
              {
                etiket: "Onay bekleyen etkinlik",
                deger: bosluklar.bekleyenFaaliyetOnayi,
                alt: "Öğrenci ve öğretmen önerileri dâhil",
                yol: "/panel/etkinlikler",
              },
              {
                etiket: "Bekleyen il dışı başvuru",
                deger: bosluklar.bekleyenIlDisiBasvuru,
                alt: "Kaynak ilin kararını bekliyor",
                yol: "/panel/il-disi-basvurular",
              },
              {
                etiket: "Bekleyen bağlantı isteği",
                deger: bosluklar.bekleyenBaglantiIstegi,
                alt: "Öğrenciler iletişim için bekliyor",
                yol: "/panel/baglantilar",
              },
              {
                etiket: "Belgesi eksik koordinatör",
                deger: bosluklar.belgesiEksikKoordinator,
                alt: "Taahhütname ya da gizlilik sözleşmesi onaylanmamış",
                yol: "/panel/rol-envanteri",
              },
            ].map((satir) => (
              <Link
                key={satir.etiket}
                href={satir.yol}
                /*
                 * Sıfır olan kart SÖNÜK gösteriliyor, gizlenmiyor: kaybolan
                 * kart "böyle bir ölçüt yok" izlenimi verirdi, oysa sıfır
                 * iyi haberdir ve görünmesi gerekir.
                 */
                className={`rounded-kart border bg-kart p-4 transition hover:border-vurgu ${
                  satir.deger > 0 ? "border-uyari-cizgi" : "border-cizgi"
                }`}
              >
                <p className="text-sm font-medium text-metin-yumusak">
                  {satir.etiket}
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    satir.deger > 0 ? "text-uyari-metin" : "text-metin-yumusak"
                  }`}
                >
                  {satir.deger}
                </p>
                <p className="mt-0.5 text-sm text-metin-yumusak">{satir.alt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {basvuruYapabilirMi(kullanici) && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
              <Send size={18} className="text-vurgu-metin" aria-hidden />
              Başvuruya açık etkinlikler
            </h2>
            <Link
              href="/panel/etkinlikler?acik=1"
              className="text-sm font-medium text-vurgu-metin underline underline-offset-2"
            >
              Tüm etkinlikler
            </Link>
          </div>

          {acikFaaliyetKartlari.length === 0 ? (
            <Kart className="text-metin-yumusak">
              Kapsamınızda şu an başvuru alan etkinlik yok. Yenileri açıldığında
              burada ve bildirimlerinizde görürsünüz.
            </Kart>
          ) : (
            <ul className="space-y-2">
              {acikFaaliyetKartlari.map(({ faaliyet, karar, kalanYer }) => (
                <li
                  key={faaliyet.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-kart border border-cizgi bg-kart px-4 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/panel/etkinlikler/${faaliyet.id}`}
                      className="font-medium text-metin transition hover:text-vurgu-metin hover:underline"
                    >
                      {faaliyet.ad}
                    </Link>
                    <p className="mt-1 text-sm text-metin-yumusak">
                      {tarihYaz(faaliyet.tarih)} ·{" "}
                      {KAPSAM_ETIKETLERI[faaliyet.kapsam]} ·{" "}
                      {faaliyet.duzenleyenBirim}
                    </p>
                    <p className="mt-0.5 text-sm text-metin-yumusak">
                      Başvuru {kalanGunYaz(faaliyet.basvuruBitis, simdi)} ·{" "}
                      {kalanYer} kişilik yer kaldı
                    </p>
                  </div>
                  {/*
                    Rozet "başvurabilir misin" sorusunu SATIRDA cevaplar:
                    tıklayıp içeri girdikten sonra "zaten başvurmuşsun"
                    demek, kullanıcıyı boşuna dolaştırmak olurdu.
                  */}
                  {karar.olurMu ? (
                    <span className="shrink-0 rounded-full bg-olumlu-zemin px-3 py-1 text-xs font-semibold text-olumlu-metin">
                      Başvurabilirsiniz
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-zemin px-3 py-1 text-xs font-medium text-metin-yumusak">
                      {karar.neden}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {katilimGecmisi && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
              <CalendarCheck size={18} className="text-vurgu-metin" aria-hidden />
              Katıldığım etkinlikler
            </h2>
            <Link
              href="/panel/kazanimlarim"
              className="text-sm font-medium text-vurgu-metin underline underline-offset-2"
            >
              Tüm katkılarım
            </Link>
          </div>

          {katilimGecmisi.katilimlar.length === 0 ? (
            <Kart className="text-metin-yumusak">
              Henüz tamamlanmış bir etkinliğiniz yok. Başvurusu açık etkinliklere
              yukarıdaki listeden ya da Etkinlikler ekranından başvurabilirsiniz.
            </Kart>
          ) : (
            <ul className="space-y-2">
              {katilimGecmisi.katilimlar.slice(0, 5).map((katilim) => (
                <li
                  key={katilim.faaliyetId}
                  className="rounded-kart border border-cizgi bg-kart px-4 py-3"
                >
                  <Link
                    href={`/panel/etkinlikler/${katilim.faaliyetId}`}
                    className="font-medium text-metin transition hover:text-vurgu-metin hover:underline"
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
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-baslik">
          <CalendarDays size={18} className="text-vurgu-metin" aria-hidden />
          Etkinlik takvimi
        </h2>

        {takvimFaaliyetleri.length === 0 ? (
          <Kart className="text-metin-yumusak">
            Kapsamınızda son 90 günün ve önümüzdeki dönemin etkinlik kaydı yok.
          </Kart>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                baslik: "Bugün",
                liste: takvim.bugun,
                bos: "Bugün planlanmış etkinlik yok.",
                vurgulu: true,
              },
              {
                baslik: "Yaklaşan",
                liste: takvim.yaklasan,
                bos: "Yaklaşan etkinlik yok.",
                vurgulu: false,
              },
              {
                baslik: "Geçmiş (son 90 gün)",
                liste: takvim.gecmis,
                bos: "Son 90 günde etkinlik yok.",
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
                        değil. Tamamı Etkinlikler ekranında. */}
                    {bolum.liste.slice(0, 5).map((faaliyet) => (
                      <li key={faaliyet.id}>
                        <Link
                          href={`/panel/etkinlikler/${faaliyet.id}`}
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
              /*
                `id`: üstteki "Mesajın var" şeridi doğrudan bu satıra iner.
                `scroll-mt-6`, çıpaya inildiğinde satırın ekranın en tepesine
                yapışmasını önler.
              */
              <li
                key={bildirim.id}
                id={`bildirim-${bildirim.id}`}
                className="flex scroll-mt-6 flex-wrap items-start justify-between gap-3 rounded-kart border border-cizgi bg-kart px-4 py-3"
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
        Etkinliğe dosya/görsel ekleme, yorumlar ve raporlama ekranları
        geliştirme sırasının sonraki adımlarında açılacak.
      </BilgiKutusu>
    </div>
  );
}
