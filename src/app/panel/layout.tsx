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
import { aktifTema } from "@/lib/tema";
import {
  danismanMi,
  disBasvuruYonetebilirMi,
  disKullaniciMi,
  ilKoordinatoruMu,
  ogrenciMi,
  paydasEkleyebilirMi,
  projeYoneticisiMi,
  rolEnvanteriGorebilirMi,
  talepPanosuGorebilirMi,
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

  const baglantilar: GezinmeBaglantisi[] = [
    { yol: "/panel", etiket: "Panelim" },
    { yol: "/panel/profil", etiket: "Profilim" },
  ];

  /*
   * "Çalışma Gruplarım" ve "Danışmanım" MENÜDE YOK (B3/C1 · 5 Ağustos 2026).
   * İkisi de Panelim sayfasının içinde bölüm olarak duruyor ve seçim oradan
   * yapılıyor. Sayfaları SİLİNMEDİ: `/panel/danisman-secim` aynı zamanda giriş
   * kapısıdır (danışmansız öğrenci oraya düşer), `/panel/calisma-gruplari` ise
   * bildirim e-postalarındaki ve yer imlerindeki adreslerde duruyor.
   */

  /*
   * Katkılarım ekranı iki role de açıktır ve aynı adreste ikisine farklı
   * kartlar basar (öğrencide temsilcilik/çalışma grubu, öğretmende görev
   * geçmişi/danışmanlık). Dışarıda kalanlar: proje yöneticisi (YEĞİTEK
   * personelinin ne danışmanlığı ne katılımcılığı olur) ve dış kullanıcılar
   * (ekranın beslendiği kayıtların hiçbiri onlarda yok — sürekli boş görünür).
   */
  if (!projeYoneticisiMi(kullanici) && !disKullaniciMi(kullanici)) {
    baglantilar.push({ yol: "/panel/kazanimlarim", etiket: "Katkılarım" });
  }

  /*
   * ALGORITMAM yalnızca ÖĞRENCİDE (E · 6 Ağustos 2026). İstek bölümü öğrenci
   * paneli için tarif ediyor ("öğrenciler kendilerini geliştirebilecekleri
   * alanları keşfeder") ve envanterlerin madde metinleri de öğrenciye yazıldı
   * ("arkadaşım takıldığında", "grup çalışmasında üstüme düşeni").
   *
   * Öğretmene ve koordinatöre BAŞKASININ sonucunu gösteren bir giriş de yok:
   * envanter sonuçları kişiye özeldir ve hiçbir yetkili ekranında görünmez
   * (bkz. app/panel/algoritmam/eylemler.ts).
   */
  if (ogrenciMi(kullanici)) {
    baglantilar.push({ yol: "/panel/algoritmam", etiket: "Algoritmam" });
  }

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
  baglantilar.push({ yol: "/panel/urunler", etiket: "Ürünlerim" });

  // Faaliyetler herkese açıktır; kimin ne göreceğini kapsam filtresi belirler.
  // Görev almamış öğretmen de okulunun ve ulusal faaliyetleri görür; mezun ve
  // paydaş temsilcisi ulusal ve kendi ilindeki etkinlikleri takvim olarak görür
  // ama başvuramaz (bkz. basvuruYapabilirMi).
  baglantilar.push({ yol: "/panel/etkinlikler", etiket: "Etkinlikler" });

  /*
   * Pano (eski adıyla Talep Panosu) öğrenci, öğretmen ve dış kullanıcılara
   * açık. Merkez personeli dışarıda: YEĞİTEK'in takım arkadaşı araması diye bir
   * durum yok, onun duyuru kanalı ayrı.
   *
   * PANO EKOSİSTEM DIŞINA AÇILMAZ (S21 · 6 Ağustos 2026): ilanları yalnızca
   * sisteme girmiş kullanıcılar görür. Sponsor ilanı da bu kuralın içindedir —
   * dışarıya açık bir ilan sayfası istenirse bu ayrı bir karardır ve KVKK
   * tarafı yeniden değerlendirilmelidir (ilanı açan çoğunlukla 18 yaş altı).
   */
  if (talepPanosuGorebilirMi(kullanici)) {
    baglantilar.push({ yol: "/panel/talepler", etiket: "Pano" });
  }

  /*
   * "Bağlantılarım" (eski adı Yazışmalar) herkese açık; kimin ne göreceğini
   * kapsam filtresi belirler. Öğrenci kendi yazışmalarını, danışman
   * öğrencilerininkini, koordinatör ilindekileri görür.
   */
  baglantilar.push({ yol: "/panel/yazismalar", etiket: "Bağlantılarım" });

  /*
   * Onay ekranının adı "İletişim Onayları" (B2 · S13 · 5 Ağustos 2026). Eski
   * adı "Bağlantı İstekleri"ydi ve yazışma sekmesi "Bağlantılarım" olunca
   * menüde neredeyse aynı iki giriş yan yana düşüyordu; öğretmen ve koordinatör
   * ikisini birden görüyor.
   */
  if (
    danismanMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    projeYoneticisiMi(kullanici)
  ) {
    baglantilar.push({ yol: "/panel/baglantilar", etiket: "İletişim Onayları" });
  }

  if (
    danismanMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    projeYoneticisiMi(kullanici)
  ) {
    /*
     * Danışman öğretmende "ÖĞRENCİLERİM" (istek listesi · J2), koordinatör ve
     * merkezde "Öğrenciler". Ad kapsamı anlatıyor: danışmanın listesi kendi
     * danışmanlığındaki öğrencilerdir, koordinatörünki ilin tamamı, merkezinki
     * ülke geneli. "Öğrencilerim" demek koordinatöre yanlış bir sahiplik
     * duygusu verirdi.
     */
    baglantilar.push(
      {
        yol: "/panel/ogrenciler",
        etiket: danismanMi(kullanici) ? "Öğrencilerim" : "Öğrenciler",
      },
      // Öğretmen envanteri öğrenciyle aynı kapıdan geçmez ama aynı kişilere
      // açıktır; kapsamı ogretmenKapsamFiltresi belirler.
      { yol: "/panel/ogretmenler", etiket: "Öğretmenler" },
    );

    /*
     * PAYDAŞLAR ve GÖREV ROLLERİ danışman öğretmenin menüsünden kalktı
     * (B3/J2/J4 · 5 Ağustos 2026); ikisi de kayıt AÇMA ekranı ve iki iş de
     * il koordinatöründe:
     *
     *   - Paydaş envanteri: danışman öğretmen paydaşı etkinlik detayından
     *     bağlıyor; yeni kurum kaydını koordinatör açıyor (aynı kurumun
     *     onlarca yazımla girilmemesi için).
     *   - Görev rolleri: danışman öğretmen Okul Temsilcisi'ni artık
     *     Öğrencilerim ekranından veriyor; il/ilçe temsilciliği koordinatörde.
     *
     * Sayfalar SİLİNMEDİ, yalnızca menüden çıktı: yetkisi olan doğrudan
     * adresle girebilir, e-postalardaki bağlantılar çalışmaya devam eder.
     */
    if (paydasEkleyebilirMi(kullanici)) {
      baglantilar.push({ yol: "/panel/paydaslar", etiket: "Paydaşlar" });
    }
    if (ilKoordinatoruMu(kullanici) || projeYoneticisiMi(kullanici)) {
      baglantilar.push({ yol: "/panel/gorev-rolleri", etiket: "Görev Rolleri" });
    }

    /*
     * RAPORLAR ve BELGE OLUŞTUR MENÜDE YOK (J3 · 6 Ağustos 2026). İkisi de
     * etkinlikten doğan işler ve girişleri zaten etkinlik detayında vardı;
     * menüdeki satırlar kestirmeydi.
     *
     * Sekmelerin kaybolmasıyla kaybolacak TEK ŞEY, "hangi raporlar eksik"
     * TOPLU görünümüydü — koordinatörün ilindeki eksikleri etkinlik detayından
     * tek tek arayarak bulması imkânsızdı. O görünüm Etkinlikler ekranına
     * "Raporu bekleyenler" filtresi olarak taşındı.
     *
     * Sayfalar SİLİNMEDİ: `/panel/raporlar` ve `/panel/belgeler` doğrudan
     * adresle çalışmaya devam ediyor.
     */
  }

  /*
   * İl dışına giden başvurular: koordinatör kendi ilinden başka bir ilin
   * etkinliğine yapılan başvuruları onaylar. Danışman öğretmene GÖSTERİLMEZ —
   * karar ilin, okulun değil.
   */
  if (ilKoordinatoruMu(kullanici) || projeYoneticisiMi(kullanici)) {
    baglantilar.push({
      yol: "/panel/il-disi-basvurular",
      etiket: "İl Dışı Başvurular",
    });
  }

  /*
   * EBA dışı giriş başvuruları (mezun, paydaş temsilcisi). Talebin kendisi
   * onayı proje yöneticisine bağladığı için kapı da orada; il koordinatörüne
   * açmak ayrı bir ürün kararıdır.
   */
  if (disBasvuruYonetebilirMi(kullanici)) {
    baglantilar.push({
      yol: "/panel/dis-basvurular",
      etiket: "Dış Giriş Başvuruları",
    });
  }

  // Rol/atama envanteri toplu bir yönetim görünümüdür; tekil profil erişiminden
  // ayrı bir yetkidir ve yalnızca proje yöneticisine açıktır.
  if (rolEnvanteriGorebilirMi(kullanici)) {
    baglantilar.push(
      { yol: "/panel/rol-envanteri", etiket: "Rol/Atama Envanteri" },
      // Erişim kayıtları KVKK denetiminin dayanağıdır; yalnızca merkez okur.
      { yol: "/panel/erisim-loglari", etiket: "Erişim Kayıtları" },
      // Toplu duyuru, bildirim şablonlarıyla aynı sorumluluk düzeyinde:
      // ikisi de tüm kullanıcılara giden metni belirler.
      { yol: "/panel/duyurular", etiket: "Duyurular" },
      { yol: "/panel/ayarlar", etiket: "Yönetim" },
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
