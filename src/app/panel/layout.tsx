import { LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cikisEylemi } from "@/app/giris/eylemler";
import {
  PanelGezinme,
  type GezinmeBaglantisi,
} from "@/components/PanelGezinme";
import { RolEtiketi, RolsuzEtiketi } from "@/components/RolEtiketi";
import { TemaSecici } from "@/components/TemaSecici";
import { oturumKullanicisi } from "@/lib/auth/oturum";
import { ilkGirisKilidiVarMi, onayDurumlari } from "@/lib/kvkk/onay";
import { onayliMentorMu } from "@/lib/mentor/veri";
import { aktifTema } from "@/lib/tema";
import {
  disKullaniciMi,
  rolEnvanteriGorebilirMi,
  yonetimPanosuGorebilirMi,
} from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

export default async function PanelDuzeni({
  children,
}: {
  children: React.ReactNode;
}) {
  const [kullanici, tema] = await Promise.all([
    oturumKullanicisi(),
    aktifTema(),
  ]);
  if (!kullanici) {
    redirect("/giris");
  }

  /*
   * İLK GİRİŞ KAPISI. Sisteme hiç onay vermeden girilmez: kayıt akışı olmadığı
   * için belgelerin okutulacağı tek an budur (bkz. app/onay/page.tsx).
   *
   * Kapı yalnızca GERÇEK ilk girişte kapalıdır. Sonradan eklenen belge ya da
   * güncellenen metin kimseyi dışarıda bırakmaz — onlar aşağıdaki şeritle
   * duyurulur. Sebebi pratik: bir metin güncellemesi tüm ilin koordinatörünü
   * aynı anda kapıda bırakabilir ve acil bir işin ortasında sistemin
   * kilitlenmesi korumaktan çok zarar verir; erişimler zaten kayda geçiyor.
   */
  if (await ilkGirisKilidiVarMi(kullanici)) {
    redirect("/onay");
  }

  /*
   * Onayı bekleyen belgeler tek şeritte toplanır. Belge başına ayrı şerit
   * basılsaydı yeni koordinatör panelin üçte birini uyarı olarak görürdü.
   */
  const bekleyenBelgeler = (await onayDurumlari(kullanici)).filter(
    (durum) => durum.gerekiyorMu,
  );

  /*
   * MENÜ KÜÇÜLDÜ (7 Ağustos 2026 · istek: "menü sayısı azalacak").
   *
   * Öğrencide altı sekme kaldı: Profil · Panel · Etkinlikler · Bağlantılarım ·
   * Pano · Market. Kalkanlar:
   *
   *   · "Katkılarım" — içeriğinin tamamı artık profilde (Görevlerim, katılım
   *     geçmişi, Katkı Nişanlarım). Sayfa SİLİNMEDİ; öğretmen tarafında hâlâ
   *     kendi kartlarını basıyor ve profilden bağlantı veriliyor.
   *   · "Algoritmam" — Panel'in içinde bölüm oldu ("Özdeğerlendirme
   *     Envanterleri"). Sayfa duruyor, envanter çözme oradan yürüyor.
   *
   * Yeniden adlandırılanlar: "Panelim" → "Panel", "Profilim" → "Profil",
   * "Ürünlerim" → "Market" (istek listesindeki başlıklar).
   *
   * SIRA İSTEKTEKİ SIRA: Profil önce geliyor. Panel açılış ekranı olmaya
   * devam ediyor — sıradaki yeri, hangi sayfanın açıldığını değiştirmiyor.
   *
   * YÖNETİM SEKMELERİ KALDI: altı sekme herkeste ortak, koordinatör ve merkez
   * bunlara ek olarak kendi ekranlarını görmeye devam ediyor. Onları da
   * kaldırmak, koordinatörün ilindeki öğrenciye ulaşacağı hiçbir giriş
   * bırakmazdı.
   */
  const baglantilar: GezinmeBaglantisi[] = [
    { yol: "/panel/profil", etiket: "Profil" },
    { yol: "/panel", etiket: "Panel" },
  ];

  /*
   * MEZUN / PAYDAŞ / MENTÖR MENÜSÜ: Profil · Panel · Etkinlikler · Pano · Market
   * (7 Ağustos 2026 · istek: "mezun paydaş mentör sayfasında şu sekmeler
   * olacak" — Profil, Panel, Etkinlikler).
   *
   * PANO 11 AĞUSTOS'TA EKLENDİ (istek: "panelde panoya git var ama üst menüde
   * de pano olması gerekiyor"). Panel sayfası panoyu bu kullanıcının iki
   * hakkından biri olarak anlatıp oraya bir düğme koyuyordu; menüde
   * karşılığının olmaması, panodan çıkan kişiye geri dönecek bir yol
   * bırakmıyordu.
   *
   * MARKET 13 AĞUSTOS'TA EKLENDİ (istek: "mezun, paydaş ve mentör girişlerine
   * market gelecek, onlarda market görünmüyor"). Vitrin bu rollere BAŞTAN BERİ
   * açıktı (bkz. aşağıdaki Market notu: "mezunun ekosistemde göreceği ilk şey
   * buydu"); eksik olan yalnızca menüdeki satırdı, yani sayfa vardı ama kapısı
   * yoktu. Ürün ekleme de bu rollerde çalışıyor — kayıt formu Panel'de.
   *
   * Bağlantılarım hâlâ BASILMIYOR. Erken dönüş kullanılıyor çünkü kalan
   * blokların hepsi görev rollerine bakıyor ve dış kullanıcıda zaten hiçbiri
   * açılmıyor; tek tek "dış kullanıcı değilse" koşulu eklemek aynı kararı beş
   * yerde tekrar ederdi.
   *
   * SAYFA SİLİNMEDİ ve YETKİ DARALMADI: `/panel/yazismalar` adresle çalışmaya
   * devam ediyor, onaylı yazışmalar duruyor. Kaldırılan şey yalnızca menüdeki
   * satır — istek sekme listesini sayıyor, yetki tablosunu değil.
   */
  /*
   * MENTÖRLÜĞÜM SEKMESİ — YALNIZCA ONAYLI MENTÖRDE (13 Ağustos 2026 · istek:
   * "mentörlerin kendi sayfası olsun … talepleri inceleyip cevap yazacak").
   *
   * Koşul veritabanına gidiyor, role değil: mentörlük bir rol değil onaya bağlı
   * bir kayıttır (bkz. lib/mentor/veri.ts · onayliMentorMu). Sorgu menüde
   * duruyor çünkü sekmenin varlığı da bir yetki bildirimi — sayfa 404 dönerken
   * menüde adının görünmesi, kullanıcıyı kapalı bir kapıya yollardı.
   *
   * Mentör olabilen herkeste basılıyor: dış kullanıcı da (mezun, paydaş,
   * mentör) onaylı mentör olabiliyor, bu yüzden kontrol erken dönüşten ÖNCE.
   */
  const mentorSekmesi = (await onayliMentorMu(kullanici.id))
    ? [{ yol: "/panel/mentorlugum", etiket: "Mentörlüğüm" }]
    : [];

  if (disKullaniciMi(kullanici)) {
    baglantilar.push({ yol: "/panel/etkinlikler", etiket: "Etkinlikler" });
    baglantilar.push({ yol: "/panel/talepler", etiket: "Pano" });
    baglantilar.push(...mentorSekmesi);
    baglantilar.push({ yol: "/panel/urunler", etiket: "Market" });
    return (
      <PanelCercevesi
        kullanici={kullanici}
        tema={tema}
        baglantilar={baglantilar}
        bekleyenBelgeler={bekleyenBelgeler}
      >
        {children}
      </PanelCercevesi>
    );
  }

  /*
   * YÖNETİM PANELİ, PANEL'İN HEMEN ARDINDA (11 Ağustos 2026 · istek: "öğrenciler
   * ve öğretmenler sekmesi kalkacak yönetim paneli sekmesine gelecek, paydaşlar
   * ve okullar da yönetim paneline gelecek, görev rolleri de").
   *
   * Beş sekme tek sekmeye indi: Öğrenciler · Öğretmenler · Paydaşlar · Görev
   * Rolleri · Mentörlük artık panonun İÇİNDE kart olarak duruyor
   * (bkz. app/panel/yonetim/page.tsx). Ekranların hiçbiri silinmedi ve hiçbir
   * yetki daralmadı — değişen tek şey, oraya hangi kapıdan girildiği.
   *
   * Yeri eskiden Öğrenciler'in durduğu yer: koordinatörün ve merkezin günlük
   * işi bu sekmede başlıyor.
   */
  if (yonetimPanosuGorebilirMi(kullanici)) {
    baglantilar.push({ yol: "/panel/yonetim", etiket: "Yönetim Paneli" });
  }

  /*
   * DANIŞMAN ÖĞRETMENDE "ÖĞRENCİLERİM" SEKMESİ KALKTI (13 Ağustos 2026 · istek:
   * "danışman öğretmenin öğrencilerim menüsü kalkacak, panelde zaten
   * danışmanlığımdaki öğrenciler var, danışmanlığımdaki öğrenciler öğrencilerim
   * olacak").
   *
   * Sekme 7 Ağustos'ta, listeye gidecek başka yol olmadığı için konmuştu; o
   * gerekçe artık geçerli değil — Panel'de aynı ekrana giden sayılı kart duruyor
   * ve adı isteğe uyarak "Öğrencilerim" oldu (bkz. app/panel/page.tsx). Aynı
   * listeye koordinatör ve merkez de kendi kartlarından giriyor, yani üç rolde
   * de kapı tek biçimde panelde.
   *
   * SAYFA SİLİNMEDİ ve YETKİ DARALMADI: `/panel/ogrenciler` adresle çalışmaya,
   * danışman kendi öğrencilerini görmeye ve Okul Temsilcisi atamaya devam
   * ediyor (bkz. ogrenciEnvanteriGorebilirMi). Değişen tek şey menüdeki satır.
   */

  /*
   * "Çalışma Gruplarım" ve "Danışmanım" MENÜDE YOK (B3/C1 · 5 Ağustos 2026).
   * İkisi de Panelim sayfasının içinde bölüm olarak duruyor ve seçim oradan
   * yapılıyor. Sayfaları SİLİNMEDİ: `/panel/danisman-secim` aynı zamanda giriş
   * kapısıdır (danışmansız öğrenci oraya düşer), `/panel/calisma-gruplari` ise
   * bildirim e-postalarındaki ve yer imlerindeki adreslerde duruyor.
   */

  /*
   * "KATKILARIM" ve "ALGORITMAM" SEKMELERİ KALKTI (7 Ağustos 2026).
   *
   * Katkılarım'ın içeriği profile taşındı: Görevlerim, katılım geçmişi ve
   * Katkı Nişanlarım orada. Ekran silinmedi — öğretmen tarafında kendi
   * kartlarını basmaya devam ediyor ve profilden bağlantı veriliyor.
   *
   * Algoritmam, Panel'in içinde "Özdeğerlendirme Envanterleri" bölümü oldu.
   * Sayfa duruyor ve envanterler oradan çözülüyor; yalnızca menüdeki satır
   * kalktı. Envanter sonuçları hâlâ KİŞİYE ÖZELDİR: hiçbir yetkili ekranında
   * görünmez (bkz. app/panel/algoritmam/eylemler.ts).
   */

  // Faaliyetler herkese açıktır; kimin ne göreceğini kapsam filtresi belirler.
  // Görev almamış öğretmen de okulunun ve ulusal faaliyetleri görür; mezun ve
  // paydaş temsilcisi ulusal ve kendi ilindeki etkinlikleri takvim olarak görür
  // ama başvuramaz (bkz. basvuruYapabilirMi).
  baglantilar.push({ yol: "/panel/etkinlikler", etiket: "Etkinlikler" });

  /*
   * "Bağlantılarım" (eski adı Yazışmalar) herkese açık; kimin ne göreceğini
   * kapsam filtresi belirler. Öğrenci kendi yazışmalarını, danışman
   * öğrencilerininkini, koordinatör ilindekileri görür.
   *
   * İSTEKTEKİ ALT BAŞLIKLAR: "Mesajlar · Sohbet · Bağlantılarım". Mesajlar ve
   * bağlantı onayları bu ekranın içinde; **Sohbet (grup) HENÜZ YOK** — G
   * maddesi S19/S20 cevaplarını bekliyor.
   */
  baglantilar.push({ yol: "/panel/yazismalar", etiket: "Bağlantılarım" });

  /*
   * "AKIŞ" — LinkedIn tarzı paylaşım alanı (12 Ağustos 2026 · istek: "kullanıcı
   * linkedin gibi mesaj yazabilsin, o alanda kendini tanıtabilsin diğer kişiler
   * altına mesaj yazabilsin, kariyeri hakkında paylaşım yapabilsin").
   *
   * BAĞLANTILARIM'IN HEMEN ARDINDA ve ondan AYRI bir sekme: ikisi farklı
   * şeyler. Bağlantılarım özeldir (iki kişi, danışman onaylı); Akış yayındır
   * (herkes okur, onay yok). Aynı sekmenin içine konsalardı, öğrenci "kime
   * yazdığını" ekrandan ayırt edemezdi — bu sistemde en pahalı karışıklık odur.
   */
  baglantilar.push({ yol: "/panel/akis", etiket: "Akış" });

  /*
   * "İLETİŞİM ONAYLARI" ARTIK AYRI EKRAN DEĞİL (12 Ağustos 2026 · istek:
   * "yazışmalar ve bağlantılar isminde iki bölüm var, onları birleştirip
   * linkedin tarzı bir bölüm yapmak istiyorum · menüdeki bağlantılarım
   * alanında olsun").
   *
   * 7 Ağustos'ta sekmesi kalkmış, girişi bu sayfanın başına bir kart olarak
   * konmuştu; o kart da kalktı. Bekleyen istekler doğrudan Bağlantılarım'ın
   * içinde, bağlantı listesinin üstünde basılıyor. `/panel/baglantilar` adresi
   * duruyor ve buraya yönlendiriyor.
   */

  /*
   * Pano (eski adıyla Talep Panosu) SİSTEMDEKİ HERKESE açık — proje yöneticisi
   * dahil (13 Ağustos 2026 · istek: "proje yöneticisinin pano sayfası
   * görünmüyor, diğer kullanıcılarda var").
   *
   * Sekme daha önce merkez personelinde basılmıyordu çünkü görme ile ilan açma
   * tek izinden geçiyordu ve merkez ilan açmıyor. Sonuç, sistemin en canlı
   * kullanıcı alanının onu yönetenden gizlenmesiydi. İkisi ayrıldı: merkez
   * panoyu okuyor, ilan açma ve bağlantı isteği ona hâlâ kapalı
   * (bkz. panodaEslesmeArayabilirMi).
   *
   * PANO EKOSİSTEM DIŞINA AÇILMAZ (S21 · 6 Ağustos 2026): ilanları yalnızca
   * sisteme girmiş kullanıcılar görür. Sponsor ilanı da bu kuralın içindedir —
   * dışarıya açık bir ilan sayfası istenirse bu ayrı bir karardır ve KVKK
   * tarafı yeniden değerlendirilmelidir (ilanı açan çoğunlukla 18 yaş altı).
   */
  baglantilar.push({ yol: "/panel/talepler", etiket: "Pano" });

  // Panonun hemen ardında: mentörün işi panodaki ilanları cevaplamak.
  baglantilar.push(...mentorSekmesi);

  /*
   * ÜRÜNLERİM (GençTek Market) HERKESE AÇIK (I · 6 Ağustos 2026).
   *
   * İstekteki sekme adı "Ürünlerim" ama içerik bir vitrindir: öğrenci
   * ürünleri, öğretmen ürünleri ve kişinin kendi ürünleri aynı ekranda
   * süzgeçle ayrılıyor. Bu yüzden Algoritmam gibi tek role bağlanmadı —
   * öğretmenin de ürünü olabiliyor ve istekte "Öğretmen Ürünleri" ayrı bir
   * süzgeç olarak sayılmış.
   *
   * DIŞ KULLANICILAR da görüyor: mezunun ekosistemde göreceği ilk şey buydu
   * ve market, A1'in gerekçesindeki "mezun bağını sürdürsün" beklentisine
   * karşılık gelen tek ekran. Vitrin ekosistem içine kapalı; dışarıya açık
   * bir ürün sayfası ayrı bir karardır (pano ile aynı ilke · S21).
   */
  baglantilar.push({ yol: "/panel/urunler", etiket: "Market" });

  /*
   * PAYDAŞLAR, GÖREV ROLLERİ ve MENTÖRLÜK SEKMELERİ KALKTI (11 Ağustos 2026);
   * üçü de yönetim panosunda kart oldu. Yetkileri değişmedi: paydaş kaydını
   * yine koordinatör ve merkez açıyor, il/ilçe temsilciliğini yine onlar
   * veriyor, mentör başvurusunu yine onlar onaylıyor.
   *
   * Danışman öğretmen bu üç ekranı zaten menüsünde görmüyordu (B3/J2/J4 ·
   * 5 Ağustos 2026) ve durumu değişmedi: Okul Temsilcisi'ni Öğrencilerim
   * ekranından veriyor, paydaşı etkinlik detayından bağlıyor.
   *
   * RAPORLAR ve BELGE OLUŞTUR da menüde değil (J3 · 6 Ağustos 2026): ikisi de
   * etkinlikten doğan işler ve girişleri etkinlik detayında. "Hangi raporlar
   * eksik" toplu görünümü Etkinlikler ekranındaki "Raporu bekleyenler"
   * süzgecinde.
   *
   * HİÇBİR SAYFA SİLİNMEDİ: adresler ve e-postalardaki bağlantılar çalışmaya
   * devam ediyor.
   */

  /*
   * İL DIŞI BAŞVURULAR SEKMESİ KALKTI (11 Ağustos 2026 · istek: "koordinatörün
   * etkinlikler sayfası ile il dışı başvuru sayfalarını birleştirelim, il dışı
   * başvurular kalksın, hepsi etkinliklerde olsun").
   *
   * Sayfa da silindi, menüden çıkarılmakla kalmadı. Karar zaten etkinliğe ait
   * bir karardı — "öğrencim bu etkinliğe gitsin mi" — ve ayrı bir sekmede
   * durması koordinatörü iki ekran arasında gezdiriyordu: etkinliği burada,
   * başvurusunu orada görüyordu. Liste artık Etkinlikler ekranının bir bölümü
   * (`#il-disi`) ve karar ayrıca her etkinliğin başvuru satırından da
   * verilebiliyor.
   */

  /*
   * DIŞ GİRİŞ BAŞVURULARI SEKMESİ KALKTI (11 Ağustos 2026 · istek: "dış giriş
   * başvuruları sayfası paydaşların içine gelecek"). Ekranın girişi artık
   * Paydaşlar sayfasının başında; ikisi aynı işin iki ucu — biri kurumu, öbürü
   * o kurumu temsil eden kişiyi sisteme alıyor.
   *
   * ROL/ATAMA ENVANTERİ SEKMESİ DE KALKTI (aynı gün · istek: "rol atama
   * envanteri koordinatör kartına gelecek"): yönetim panosunda "Koordinatörler"
   * kartı olarak duruyor. Ekranın içeriği zaten koordinatör envanteridir.
   *
   * İkisinin de sayfası ve yetkisi yerinde; değişen yalnızca kapı.
   */
  if (rolEnvanteriGorebilirMi(kullanici)) {
    baglantilar.push(
      // Erişim kayıtları KVKK denetiminin dayanağıdır; yalnızca merkez okur.
      { yol: "/panel/erisim-loglari", etiket: "Erişim Kayıtları" },
      /*
       * Toplu duyuru, bildirim şablonlarıyla aynı sorumluluk düzeyinde: ikisi
       * de tüm kullanıcılara giden metni belirler.
       *
       * SEKME ADI "MESAJ GÖNDER" (11 Ağustos 2026 · istek: "duyurular menüsü,
       * mesaj gönder olsun"). Ekranın yaptığı iş bir eylem — seçilen kitleye
       * bildirim yollamak; "Duyurular" ise okunacak bir liste varmış gibi
       * duruyordu. Adres değişmedi.
       */
      { yol: "/panel/duyurular", etiket: "Mesaj Gönder" },
      /*
       * SEKME ADI "SİSTEM AYARLARI" (11 Ağustos 2026 · istek: "eski yönetim
       * sayfası sistem ayarları olacak"). "Yönetim" adı, yönetim panosu
       * geldikten sonra iki farklı şeyi işaret ediyordu; bu ekran ise çalışma
       * grupları, etkinlik programları ve sistem ayarlarının bulunduğu yer.
       */
      { yol: "/panel/ayarlar", etiket: "Sistem Ayarları" },
    );
  }

  /*
   * KVKK/belge sekmesi MENÜDE YOK (5 Ağustos 2026). Belgeler artık profilin en
   * altında (`/panel/profil#kvkk`): metin üye olurken okutuluyor, sonrasında
   * lazım olduğunda profilden açılıyor. Menüden kaldırmak erişimi kapatmak
   * DEĞİLDİR — onayladığı belgeye erişemeyen kullanıcı KVKK açısından
   * savunulamaz; bu yüzden bölüm kaldırılmadı, taşındı.
   */

  return (
    <PanelCercevesi
      kullanici={kullanici}
      tema={tema}
      baglantilar={baglantilar}
      bekleyenBelgeler={bekleyenBelgeler}
    >
      {children}
    </PanelCercevesi>
  );
}

/**
 * Panelin dış çerçevesi: üst bar, rol etiketleri, onay şeridi ve gezinme.
 *
 * AYRI BİLEŞEN çünkü düzen iki yerden dönüyor: dış kullanıcı menüsü erken
 * dönüşle kapanıyor (üç sekme) ve kalan roller aşağıdan. İki kopya JSX,
 * birinde yapılan bir değişikliğin öbüründe unutulması demek olurdu.
 */
function PanelCercevesi({
  kullanici,
  tema,
  baglantilar,
  bekleyenBelgeler,
  children,
}: {
  kullanici: NonNullable<Awaited<ReturnType<typeof oturumKullanicisi>>>;
  tema: Awaited<ReturnType<typeof aktifTema>>;
  baglantilar: GezinmeBaglantisi[];
  bekleyenBelgeler: Awaited<ReturnType<typeof onayDurumlari>>;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-ust-bar-cizgi bg-ust-bar">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-ust-bar-metin-yumusak uppercase">
              MEB · YEĞİTEK
            </p>
            <p className="text-lg font-bold text-ust-bar-metin">GençTek</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <TemaSecici aktif={tema} />
            <div className="text-right">
              <p className="font-medium text-ust-bar-metin">
                {kullanici.ad} {kullanici.soyad}
              </p>
              <div className="mt-1 flex flex-wrap justify-end gap-1">
                {kullanici.roller.length === 0 ? (
                  <RolsuzEtiketi />
                ) : (
                  kullanici.roller.map((rol) => (
                    <RolEtiketi
                      key={rol.rolKodu}
                      rolKodu={rol.rolKodu}
                      ekBilgi={rol.ilKodu}
                    />
                  ))
                )}
              </div>
            </div>
            <form action={cikisEylemi}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md border border-ust-bar-cizgi px-3 py-1.5 text-sm font-medium text-ust-bar-metin-yumusak transition hover:text-ust-bar-metin"
              >
                <LogOut size={15} aria-hidden />
                Çıkış
              </button>
            </form>
          </div>
        </div>
        <PanelGezinme baglantilar={baglantilar} />
      </header>

      {/*
        Onay bekleyen belge şeridi ekranı KİLİTLEMEZ, uyarır. Belgeler ad ad
        yazılıyor: "bir belgeniz bekliyor" demek, kişiyi hangi metni açacağını
        aramaya bırakırdı.
      */}
      {bekleyenBelgeler.length > 0 && (
        <div className="border-b border-uyari-cizgi bg-uyari-zemin">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-6 py-2.5 text-sm text-uyari-metin">
            <ShieldAlert size={16} className="shrink-0" aria-hidden />
            <span>
              Onayınız bekleniyor:{" "}
              {bekleyenBelgeler
                .map((durum) => durum.tanim.baslik)
                .join(" · ")}
              . Metni güncellenen belgelerde önceki onayınız eski metne aitti.
            </span>
            {/*
              Şerit, metin güncellendiğinde yeniden onayın alındığı TEK yoldur:
              sekme kalktığı için kullanıcının belgeye kendiliğinden uğrayacağı
              bir yer yok. Çapa profilin en altındaki bölüme gider.
            */}
            <Link
              href="/panel/profil#kvkk"
              className="font-semibold underline underline-offset-2"
            >
              Belgeleri aç
            </Link>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
