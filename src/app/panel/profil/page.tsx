import {
  BadgeCheck,
  Camera,
  FileText,
  IdCard,
  Link2,
  Mail,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { KatkiKarti } from "@/components/KatkiKarti";
import {
  KazanimBolumleri,
  SaltOkunurAlan,
  SeferlerimKarti,
} from "@/components/OgrenciProfilBolumleri";
import { OnayBelgeleriBolumu } from "@/components/OnayBelgeleriBolumu";
import { RotamKarti } from "@/components/RotamKarti";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { aktifAtamaGetir } from "@/lib/danisman/atama";
import { prisma } from "@/lib/db";
import { uygulamaYolu } from "@/lib/ortam";
import { kazanimlariGetir } from "@/lib/kazanim/getir";
import {
  basHarfler,
  profilFotoTipAdlari,
} from "@/lib/kullanici/profil-foto-kurallar";
import { profilFotoSinirlariniGetir } from "@/lib/kullanici/profil-foto";
import { SALT_OKUNUR_ACIKLAMASI } from "@/lib/kullanici/salt-okunur";
import { cvSinirlariniGetir } from "@/lib/ogrenci/cv";
import { kazanimEkSinirlariniGetir } from "@/lib/kazanim/ek";
import { onayDurumlari } from "@/lib/kvkk/onay";
import { cvTipAdlari } from "@/lib/ogrenci/cv-kurallar";
import {
  ETKINLIK_KATEGORISI_ETIKETLERI,
  TEMEL_ETKINLIK_GRUPLARI,
} from "@/lib/faaliyet/kurallar";
import { BAGLANTI_TANIMLARI } from "@/lib/ogrenci/iletisim-kurallar";
import { katkiVerisiGetir } from "@/lib/ogrenci/katki";
import {
  BILISIM_YOLCULUGU_TIPLERI,
  KATILIM_BICIMI_ETIKETLERI,
  KATILIM_BICIMLERI,
  kazanimTipiGecerliMi,
  kazanimTipiTanimi,
  kazanimTipleri,
} from "@/lib/kazanim/kurallar";
import { tarihSaatYaz } from "@/lib/tarih";
import { kullaniciRolEtiketi } from "@/lib/yetki/etiketler";
import {
  danismanMi,
  ilKoordinatoruMu,
  koordinatorIlKodu,
  ogrenciMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import {
  danismanlikEylemi,
  profilFotoSilEylemi,
  profilFotoYukleEylemi,
  profilGuncelleEylemi,
} from "./eylemler";
import { belgeOnaylaEylemi } from "./belge-eylemleri";
import {
  cvSilEylemi,
  cvYukleEylemi,
  kazanimBelgeEkleEylemi,
  kazanimBelgeSilEylemi,
  kazanimEkleEylemi,
  kazanimSilEylemi,
} from "./kazanim-eylemleri";
import {
  hedefDurumuEylemi,
  hedefEkleEylemi,
  hedefSilEylemi,
} from "./hedef-eylemleri";

export const dynamic = "force-dynamic";

const DURUM_MESAJLARI: Record<string, string> = {
  "iletisim-kaydedildi": "İletişim bilgileriniz kaydedildi.",
  "kazanim-eklendi": "Kayıt profiline eklendi.",
  "kazanim-silindi": "Kayıt silindi.",
  "cv-yuklendi": "CV'niz yüklendi.",
  "cv-silindi": "CV'niz kaldırıldı.",
  "foto-yuklendi": "Profil fotoğrafınız güncellendi.",
  "foto-silindi": "Profil fotoğrafınız kaldırıldı.",
  "belge-eklendi": "Destekleyici belge eklendi.",
  "belge-silindi": "Destekleyici belge kaldırıldı.",
  "belge-onaylandi": "Onayınız kaydedildi ve erişim kayıtlarına işlendi.",
};

/** Kazanım ekleme formunun hangi tür için açık olduğu. */
const VARSAYILAN_TUR = kazanimTipleri()[0].tip;

function tekil(deger: string | string[] | undefined): string | null {
  if (Array.isArray(deger)) return deger[0] ?? null;
  return deger ?? null;
}

const SINIF_SEKME =
  "rounded-full border border-cizgi px-3 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin";
const SINIF_SEKME_SECILI =
  "rounded-full border border-vurgu bg-vurgu-zemin px-3 py-1.5 text-sm font-semibold text-vurgu-metin";

export default async function ProfilSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const parametreler = await searchParams;

  const kayit = await prisma.kullanici.findUniqueOrThrow({
    where: { id: kullanici.id },
    include: {
      kurum: { select: { ad: true, okulTuru: true } },
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      ogrenciProfil: true,
      ogretmenProfil: true,
      kazanimlar: {
        // Kullanıcının girdiği tarih boş olabildiği için ikinci sıralama ölçütü
        // gerekiyor; yoksa tarihsiz kayıtların sırası belirsiz kalır.
        orderBy: [{ tarih: "desc" }, { olusturmaTarihi: "desc" }],
        include: {
          // Destekleyici belgeler. Yalnızca ad ve kimlik gerekiyor; depolama
          // anahtarı ekrana HİÇ çıkmaz, indirme kapsam kontrollü rotadan geçer.
          ekler: {
            select: { id: true, dosyaAdi: true },
            orderBy: { yuklenmeTarihi: "asc" },
          },
          // Ürünün çoklu bağlantıları (D5).
          baglantilar: {
            select: { id: true, adres: true, etiket: true },
            orderBy: { siraNo: "asc" },
          },
        },
      },
    },
  });

  const ogrenci = ogrenciMi(kullanici);
  // Kazanım kayıtları öğretmende de var; metinler bununla ayrılıyor.
  const kazanimSahibi = ogrenci ? "OGRENCI" : "OGRETMEN";

  const atama = ogrenci ? await aktifAtamaGetir(kullanici.id) : null;

  // Rozetler ve katkı kartı öğrenciye özgüdür; öğretmenin karşılığı
  // /panel/kazanimlarim ekranındadır (kaynakları bambaşka tablolar).
  const kazanim = ogrenci ? await kazanimlariGetir(kullanici.id) : null;
  const katki = ogrenci ? await katkiVerisiGetir(kullanici.id) : null;
  const cvSinirlari = ogrenci ? await cvSinirlariniGetir() : null;

  /*
   * "Rotam" hedefleri (D6). Yalnızca öğrencide çekiliyor — kart da yalnızca
   * öğrencide basılıyor; öğretmen için sorgu boşa dönerdi.
   *
   * Sıralama KODDA yapılıyor (lib/hedef/kurallar.ts), SQL'de değil: kural
   * "önce süren, sonra planlanan, en sonda tamamlanan" ve bunun testi saf
   * fonksiyon üzerinden yazılabiliyor. Burada sabit bir `id` sırası veriliyor
   * ki sıralayıcının son kırıcısı belirli bir girdi görsün.
   */
  const hedefler = ogrenci
    ? await prisma.kullaniciHedefi.findMany({
        where: { kullaniciId: kullanici.id },
        orderBy: { id: "asc" },
        select: {
          id: true,
          baslik: true,
          aciklama: true,
          durum: true,
          hedefTarihi: true,
        },
      })
    : [];

  /*
   * Kazanım formunun "GençTek etkinliği" listesi, faaliyet formununkiyle AYNI
   * kaynaktan gelir. Pasife alınmışlar teklif edilmez; geçmiş kayıtların
   * bağlantısı korunur.
   */
  const programlar = await prisma.temelEtkinlikProgrami.findMany({
    where: { aktif: true },
    orderBy: [{ grup: "asc" }, { siraNo: "asc" }],
    select: { id: true, ad: true, grup: true },
  });
  // Fotoğraf sınırları role bakılmadan alınır: kart herkese gösteriliyor.
  const fotoSinirlari = await profilFotoSinirlariniGetir();

  /*
   * Destekleyici belge sınırları etkinlik ekleriyle ORTAKTIR: ikisi de aynı
   * türde içerik taşıyor (etkinlik fotoğrafı ve belgesi). Ayrışmaları gerekirse
   * değişecek tek yer lib/kazanim/ek.ts.
   */
  const belgeSinirlari = await kazanimEkSinirlariniGetir();

  /*
   * KVKK ve onay belgeleri. Menüden kaldırıldığı için buraya, sayfanın EN
   * ALTINA taşındı: onayladığı belgeye sonradan erişememek KVKK açısından
   * savunulabilir değil. Kullanıcıdan hiçbir belge istenmiyorsa liste boş
   * döner ve bölüm hiç basılmaz.
   */
  const belgeDurumlari = await onayDurumlari(kullanici);
  const izinliBelgeTipleri = [
    ...belgeSinirlari.izinliGorselTipleri,
    ...belgeSinirlari.izinliBelgeTipleri,
  ];
  const belgeEylemleri = {
    silmeEylemi: kazanimSilEylemi,
    belgeEkleEylemi: kazanimBelgeEkleEylemi,
    belgeSilEylemi: kazanimBelgeSilEylemi,
    izinliBelgeTipleri,
  };

  // Koordinatörün sorumlu olduğu il, kişinin kayıtlı ilinden farklı olabilir;
  // adı ayrıca getirilir çünkü ham "34" kodu ekranda hiçbir şey anlatmıyor.
  const sorumluIlKodu = koordinatorIlKodu(kullanici);
  const sorumluIl = sorumluIlKodu
    ? await prisma.il.findUnique({
        where: { ilKodu: sorumluIlKodu },
        select: { ad: true },
      })
    : null;

  /*
   * Danışmanlık işareti yalnızca okulunda görev alabilecek öğretmene sorulur.
   * YEĞİTEK personelinin ve il koordinatörünün okulu yoktur (kurum kodu boş),
   * ayrıca il koordinatörü aynı anda danışman olamaz — bu kutuyu onlara
   * göstermek yapılamayacak bir işi teklif etmek olurdu.
   */
  const danismanlikSecimiGosterilir =
    !ogrenci &&
    !ilKoordinatoruMu(kullanici) &&
    !projeYoneticisiMi(kullanici) &&
    kayit.kurumKodu !== null;

  const okulBilgisiVar = kayit.kurumKodu !== null;

  // İletişim bilgisi iki profil tablosundan birinde durur; ekran için hangisi
  // olduğu önemli değil.
  const iletisim = ogrenci ? kayit.ogrenciProfil : kayit.ogretmenProfil;

  const danismanIletisimi = [
    atama?.danisman.ogretmenProfil?.eposta,
    atama?.danisman.ogretmenProfil?.telefon,
  ].filter((deger): deger is string => Boolean(deger?.trim()));

  const hata = tekil(parametreler.hata);
  const durum = tekil(parametreler.durum);

  // Kazanım ekleme formunun türü adresten gelir: alanlar türe göre değiştiği
  // için (derece yalnızca yarışmada var) form sunucuda o türe göre basılır.
  const istenenTur = tekil(parametreler.tur);
  const seciliTur =
    istenenTur && kazanimTipiGecerliMi(istenenTur)
      ? istenenTur
      : VARSAYILAN_TUR;
  const seciliTanim = kazanimTipiTanimi(seciliTur, kazanimSahibi);

  const cv = kayit.ogrenciProfil;
  const cvVar = Boolean(cv?.cvDepolamaYolu);

  const fotoVar = Boolean(kayit.fotoDepolamaYolu);
  /*
   * Adresin sonundaki sürüm damgası, yeni fotoğraf yüklendiğinde tarayıcının
   * eskisini göstermesini engeller: rota kısa ömürlü bir ön bellek bıraktığı
   * için adres değişmezse görsel güncellenmiş görünmezdi.
   */
  const fotoAdresi = kayit.fotoYuklenmeTarihi
    ? uygulamaYolu(`/panel/profil/foto?s=${kayit.fotoYuklenmeTarihi.getTime()}`)
    : null;

  return (
    <div className="space-y-8">
      <SayfaBasligi
        baslik="Profilim"
        aciklama="Kimlik ve okul bilgileri e-Okul kayıtlarından gelir ve düzenlenemez."
      />

      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}
      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}

      <Kart>
        <KartBasligi
          baslik="Profil fotoğrafı"
          aciklama="Yalnızca siz yükleyebilir ve kaldırabilirsiniz. e-Okul kayıtlarından gelmez; tek kopya tutulur, yeni yükleme öncekinin yerine geçer."
          Ikon={Camera}
        />

        <div className="flex flex-wrap items-start gap-6">
          {/*
            Fotoğraf yoksa boş kare değil baş harfler gösteriliyor: "henüz
            yüklenmedi" ile "yüklendi ama gösterilemiyor" ayırt edilebilsin.
          */}
          {/*
            next/image KULLANILMIYOR: optimizasyon görseli kendi sunucusundan
            çekmeye çalışır, oysa bu dosya public dizinde değil oturum arkasında
            bir rotadan geliyor. Boyut zaten 112px ve üst sınır 2 MB.
          */}
          {fotoAdresi ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoAdresi}
              alt="Profil fotoğrafınız"
              width={112}
              height={112}
              className="h-28 w-28 shrink-0 rounded-full border border-cizgi object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-cizgi bg-zemin text-2xl font-semibold text-metin-yumusak"
            >
              {basHarfler(kayit.ad, kayit.soyad)}
            </div>
          )}

          <div className="min-w-60 grow space-y-3">
            <form action={profilFotoYukleEylemi} className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  {fotoVar ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
                </span>
                <input
                  type="file"
                  name="foto"
                  required
                  accept={fotoSinirlari.izinliTipler.join(",")}
                  className={SINIF_GIRDI}
                />
                <span className="mt-1 block text-sm text-metin-yumusak">
                  {profilFotoTipAdlari(fotoSinirlari.izinliTipler)} · en fazla{" "}
                  {(fotoSinirlari.maksBayt / (1024 * 1024)).toFixed(0)} MB
                </span>
              </label>
              <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                Yükle
              </button>
            </form>

            {fotoVar && (
              <form action={profilFotoSilEylemi}>
                <button type="submit" className={SINIF_IKINCIL_BUTON}>
                  <Trash2 size={16} aria-hidden />
                  Fotoğrafı kaldır
                </button>
              </form>
            )}
          </div>
        </div>
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Kimlik bilgileri"
          aciklama={SALT_OKUNUR_ACIKLAMASI}
          Ikon={IdCard}
        />
        <dl className="grid gap-5 sm:grid-cols-2">
          <SaltOkunurAlan etiket="Ad" deger={kayit.ad} />
          <SaltOkunurAlan etiket="Soyad" deger={kayit.soyad} />
          {/*
            Üç değer var, iki değil: dış başvuruda (mezun, paydaş) cinsiyet
            SORULMUYOR ve kayıt "B" ile açılıyor. İkili bir gösterim, sorulmamış
            bir bilgiyi "Erkek" diye uydururdu.
          */}
          <SaltOkunurAlan
            etiket="Cinsiyet"
            deger={
              kayit.cinsiyet === "K"
                ? "Kadın"
                : kayit.cinsiyet === "E"
                  ? "Erkek"
                  : "Belirtilmedi"
            }
          />
          <SaltOkunurAlan
            etiket="Eğitim-öğretim yılı"
            deger={kayit.egitimOgretimYili}
          />
          {okulBilgisiVar && (
            <>
              <SaltOkunurAlan etiket="Okul" deger={kayit.kurum?.ad ?? null} />
              <SaltOkunurAlan
                etiket="Kurum kodu"
                deger={String(kayit.kurumKodu)}
              />
              <SaltOkunurAlan
                etiket="Okul türü"
                deger={kayit.kurum?.okulTuru ?? null}
              />
            </>
          )}
          {kayit.il && <SaltOkunurAlan etiket="İl" deger={kayit.il.ad} />}
          {kayit.ilce && <SaltOkunurAlan etiket="İlçe" deger={kayit.ilce.ad} />}
          {ogrenci ? (
            <SaltOkunurAlan etiket="Sınıf" deger={kayit.sinif} />
          ) : (
            kayit.brans && <SaltOkunurAlan etiket="Branş" deger={kayit.brans} />
          )}
          <SaltOkunurAlan
            etiket="Sistem görevi"
            deger={kullaniciRolEtiketi(kullanici)}
          />
          {sorumluIlKodu && (
            <SaltOkunurAlan
              etiket="Sorumlu olduğu il"
              deger={
                sorumluIl ? `${sorumluIl.ad} (${sorumluIlKodu})` : sorumluIlKodu
              }
            />
          )}
        </dl>
      </Kart>

      <Kart>
        <KartBasligi
          baslik="İletişim bilgileri"
          aciklama={
            ogrenci
              ? "Bu alanları siz düzenleyebilirsiniz."
              : "Bu alanları siz düzenleyebilirsiniz; kapsamınızdaki kişiler size buradan ulaşır."
          }
          Ikon={Mail}
        />
        <form action={profilGuncelleEylemi} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-metin">E-posta</span>
              <input
                type="email"
                name="eposta"
                defaultValue={iletisim?.eposta ?? ""}
                className={SINIF_GIRDI}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-metin">Telefon</span>
              <input
                type="tel"
                name="telefon"
                defaultValue={iletisim?.telefon ?? ""}
                className={SINIF_GIRDI}
              />
            </label>
          </div>

          {/*
            Bağlantılar yalnızca öğrenciye sorulur: sütunlar ogrenci_profil
            tablosunda. Öğretmenin GitHub adresi bir eksiklik değil, sistemin
            işine yaramayan bir bilgi.
          */}
          {ogrenci && (
            <fieldset className="space-y-4 border-t border-cizgi pt-4">
              <legend className="flex items-center gap-2 text-sm font-medium text-metin">
                <Link2 size={15} aria-hidden />
                Bağlantılarım
              </legend>
              <p className="text-sm text-metin-yumusak">
                İsteğe bağlıdır. Girdiğiniz adresleri danışmanınız, il
                koordinatörünüz ve proje yöneticisi profilinizde görür.
                &quot;https://&quot; yazmasanız da olur.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {BAGLANTI_TANIMLARI.map((tanim) => (
                  <label key={tanim.alan} className="block">
                    <span className="text-sm font-medium text-metin">
                      {tanim.etiket}
                    </span>
                    <input
                      type="text"
                      name={tanim.alan}
                      maxLength={200}
                      placeholder={tanim.ornek}
                      defaultValue={kayit.ogrenciProfil?.[tanim.alan] ?? ""}
                      className={SINIF_GIRDI}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Kaydet
          </button>
        </form>
      </Kart>

      {/*
        Danışmanlık işareti öğretmenin bu ekrandaki asıl EYLEMİdir; kazanım
        kartlarından önce durur, yoksa iki uzun listenin altında kaybolurdu.
      */}
      {danismanlikSecimiGosterilir && (
        <Kart>
          <KartBasligi
            baslik="GençTek danışman öğretmenliği"
            aciklama="Bu görevi işaretlediğinizde okulunuzdaki öğrencilerin danışman seçim listesinde görünürsünüz. Onay süreci yoktur."
            Ikon={ShieldCheck}
          />
          <form action={danismanlikEylemi}>
            <input
              type="hidden"
              name="gorevAlmakIstiyor"
              value={danismanMi(kullanici) ? "hayir" : "evet"}
            />
            {danismanMi(kullanici) ? (
              <div className="flex flex-wrap items-center gap-4">
                <p className="inline-flex items-center gap-2 rounded-full bg-olumlu-zemin px-3 py-1 text-sm font-medium text-olumlu-metin">
                  <BadgeCheck size={15} aria-hidden />
                  Danışman öğretmen olarak görev alıyorsunuz.
                </p>
                <button type="submit" className={SINIF_IKINCIL_BUTON}>
                  Görevi bırak
                </button>
              </div>
            ) : (
              <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                GençTek danışman öğretmeni olarak görev almak istiyorum
              </button>
            )}
          </form>
          {danismanMi(kullanici) && (
            <p className="mt-3 text-sm text-metin-yumusak">
              Görevi bıraktığınızda danışmanlığınızdaki öğrenciler okuldaki
              diğer danışmanlara ya da il koordinatörüne devredilir.
            </p>
          )}
        </Kart>
      )}

      {ogrenci && (
        <>
          <Kart>
            <KartBasligi baslik="Danışman öğretmenim" Ikon={UserCheck} />
            <p className="text-metin">
              {atama
                ? `${atama.danisman.ad} ${atama.danisman.soyad}${
                    atama.danisman.brans ? ` · ${atama.danisman.brans}` : ""
                  }`
                : "Henüz danışman atanmadı."}
            </p>
            {atama && danismanIletisimi.length > 0 && (
              <p className="mt-1 text-sm text-metin-yumusak">
                {danismanIletisimi.join(" · ")}
              </p>
            )}
          </Kart>

          {/*
            Temsilcilik, çalışma grubu ve düzenlenen etkinlikler bu kartta
            TOPLANDI; daha önce ilki danışman kartının dibinde, ikincisi ayrı
            bir listede duruyor ve üçüncüsü hiç görünmüyordu.
          */}
          {katki && (
            <KatkiKarti
              kendiMi
              gorevler={katki.gorevler}
              gruplar={katki.gruplar}
              faaliyetler={katki.faaliyetler}
              egitimOgretimYili={kullanici.egitimOgretimYili}
              katilim={kazanim}
              kazanimlar={kayit.kazanimlar}
              {...belgeEylemleri}
            />
          )}

          {/*
            SEFERLERİM (D7 · 6 Ağustos 2026) — eski adıyla "Katkı nişanlarım".
            İstek nişanları profil bölümüne aldı; aynı kart Katkılarım
            ekranında da duruyor ve ikisi tek bileşenden basılıyor.

            SEVİYE SİSTEMİ HENÜZ YOK: istekteki iki liste (usta/kalfa/çırak ve
            keşfeden/üreten/paylaşan/lider/elçi) arasından hangisinin geçerli
            olduğu ve seviye atlama ölçütleri belirsiz (→ S15).
          */}
          {kazanim && (
            <SeferlerimKarti
              rozetler={kazanim.rozetler}
              seferler={kazanim.seferler}
              bosMesaji="Henüz seferin yok. İlk etkinliğine katıldığında burası dolmaya başlayacak."
            />
          )}

          <Kart>
            <KartBasligi
              baslik="Özgeçmiş (CV)"
              aciklama={`Danışmanınız, il koordinatörünüz ve proje yöneticisi profilinizden indirebilir. Kabul edilen biçimler: ${cvTipAdlari(cvSinirlari?.izinliTipler ?? [])}.`}
              Ikon={FileText}
            />

            {cvVar && cv && (
              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-kart border border-cizgi bg-zemin p-4">
                <Link
                  href={`/panel/ogrenciler/${kullanici.id}/cv`}
                  className={SINIF_IKINCIL_BUTON}
                >
                  <FileText size={15} aria-hidden />
                  {cv.cvDosyaAdi}
                </Link>
                <span className="text-sm text-metin-yumusak">
                  {cv.cvYuklenmeTarihi
                    ? `${tarihSaatYaz(cv.cvYuklenmeTarihi)} tarihinde yüklendi`
                    : ""}
                </span>
                <form action={cvSilEylemi} className="ml-auto">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin-yumusak transition hover:bg-kart hover:text-hata-metin"
                  >
                    <Trash2 size={14} aria-hidden />
                    Kaldır
                  </button>
                </form>
              </div>
            )}

            <form action={cvYukleEylemi} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  {cvVar ? "Yeni CV yükle" : "CV dosyası"}
                </span>
                <input
                  type="file"
                  name="cv"
                  required
                  accept={cvSinirlari?.izinliTipler.join(",")}
                  className="mt-1 block w-full text-sm text-metin file:mr-3 file:rounded-md file:border file:border-cizgi file:bg-kart file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-metin"
                />
              </label>
              {cvVar && (
                <p className="text-sm text-metin-yumusak">
                  Yeni dosya mevcut CV&apos;nizin yerine geçer; eski sürüm
                  saklanmaz.
                </p>
              )}
              <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                {cvVar ? "CV'yi değiştir" : "CV yükle"}
              </button>
            </form>
          </Kart>

          {/*
            "Katıldığım etkinlikler" ARTIK AYRI KART DEĞİL: GençTek
            Yolculuğum'un içine taşındı. Ayrı kart olarak da bırakılsaydı aynı
            liste sayfada iki kez görünürdü.
          */}
        </>
      )}

      {/*
        Kazanım kayıtları ÖĞRETMENDE DE VAR: dışarıda katıldığı etkinlik,
        geliştirdiği materyal, verdiği eğitim ve derece aldığı yarışma da
        ekosisteme katkıdır. Kayıt, alanları ve doğrulaması aynı; değişen
        yalnızca etiketler (bkz. lib/kazanim/kurallar.ts).

        ÖĞRENCİDE bu kart yalnızca GençTek DIŞI kayıtları taşır: GençTek
        tarafındakiler (katıldığı etkinlikler, akran eğitimleri) yukarıdaki
        "GençTek Yolculuğum" kartına taşındı. ÖĞRETMENDE bölünme YOK — onun
        profilinde GençTek Yolculuğum kartı basılmıyor, tipleri buradan da
        çıkarsaydık kayıtları hiçbir yerde göremezdi.
      */}
      <Kart>
        <KartBasligi
          baslik={ogrenci ? "Bilişim Yolculuğum" : "Ekosisteme katkı"}
          aciklama={
            ogrenci
              ? "GençTek dışında yaptıkların: katıldığın etkinlikler, yaptığın ürünler ve derecelerin. Kayıtları sen girersin; danışmanın ve koordinatörün profilinde görür."
              : "GençTek dışı etkinlikler, geliştirdiğiniz ürünler, verdiğiniz eğitimler ve derece aldığınız yarışmalar. Kayıtları siz girersiniz; il koordinatörünüz ve proje yöneticisi öğretmen kaydınızda görür."
          }
          Ikon={Sparkles}
        />
        <KazanimBolumleri
          kazanimlar={kayit.kazanimlar}
          bosMesaji="Henüz kayıt girmediniz."
          sahip={kazanimSahibi}
          tipler={ogrenci ? BILISIM_YOLCULUGU_TIPLERI : undefined}
          {...belgeEylemleri}
        />
      </Kart>

      {/*
        "Rotam" — istekteki profil sırasının SONUNCUSU ("… GençTek Yolculuğum,
        Bilişim Yolculuğu, Rotam"). Yolculuk kartlarından sonra gelmesi
        anlamlı: yukarısı yapılanlar, burası yapılacaklar.
      */}
      {ogrenci && (
        <RotamKarti
          hedefler={hedefler}
          ekleEylemi={hedefEkleEylemi}
          durumEylemi={hedefDurumuEylemi}
          silmeEylemi={hedefSilEylemi}
        />
      )}

      {/* `id`: Panelim'deki "katkı girişi" bağlantısı doğrudan buraya iner. */}
      <Kart className="scroll-mt-6" id="kayit-ekle">
        <KartBasligi baslik="Yeni kayıt ekle" Ikon={Plus} />

        <nav className="mb-5 flex flex-wrap gap-2" aria-label="Kayıt türü">
          {kazanimTipleri(kazanimSahibi).map((tanim) => (
            <Link
              key={tanim.tip}
              href={`/panel/profil?tur=${tanim.tip}`}
              className={
                tanim.tip === seciliTur ? SINIF_SEKME_SECILI : SINIF_SEKME
              }
            >
              {tanim.baslik}
            </Link>
          ))}
        </nav>

        <p className="mb-4 text-sm text-metin-yumusak">
          {seciliTanim.aciklama}
        </p>

        <form action={kazanimEkleEylemi} className="space-y-4">
          <input type="hidden" name="tip" value={seciliTur} />

          <div className="grid gap-4 sm:grid-cols-2">
            {/*
                  GençTek etkinliği listeden seçilir; "Diğer" bırakılırsa ad
                  serbest yazılır. İki alan da AYNI ANDA basılır çünkü sayfada
                  JavaScript yok ve seçime göre alan gösterip gizlemenin bir
                  yolu yok — sunucu hangisinin dolduğuna bakıp adı ona göre
                  belirler (bkz. lib/ogrenci/kazanim-kurallar.ts).
                */}
            {seciliTanim.programSecimiVarMi && (
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-metin">
                  GençTek etkinliği
                </span>
                <select
                  name="temelEtkinlikProgramiId"
                  defaultValue=""
                  className={SINIF_GIRDI}
                >
                  <option value="">
                    Diğer — adını aşağıya kendim yazacağım
                  </option>
                  {TEMEL_ETKINLIK_GRUPLARI.map((grup) => (
                    <optgroup
                      key={grup}
                      label={ETKINLIK_KATEGORISI_ETIKETLERI[grup]}
                    >
                      {programlar
                        .filter((program) => program.grup === grup)
                        .map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.ad}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            )}

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-metin">
                {seciliTanim.baslikEtiketi}
                {seciliTanim.programSecimiVarMi && (
                  <span className="ml-1 font-normal text-metin-yumusak">
                    (yalnızca &quot;Diğer&quot; seçtiyseniz)
                  </span>
                )}
              </span>
              <input
                type="text"
                name="baslik"
                required={!seciliTanim.programSecimiVarMi}
                maxLength={250}
                placeholder={seciliTanim.baslikOrnegi}
                className={SINIF_GIRDI}
              />
            </label>

            {/*
              "Belirtmek istemiyorum" KALDIRILDI ve alan zorunlu oldu. Boş
              seçenek yerine seçilemez bir yer tutucu duruyor: `required` tek
              başına, ilk seçenek geçerli bir değer olduğunda hiçbir şey
              yapmazdı.

              Eski kayıtlar bundan etkilenmez; sütun NULL kabul etmeye devam
              ediyor ve geriye dönük doldurma YAPILMADI (bkz.
              lib/kazanim/kurallar.ts · katılım biçimi).
            */}
            {seciliTanim.katilimBicimiVarMi && (
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Katılım biçimi
                </span>
                <select
                  name="katilimBicimi"
                  required
                  defaultValue=""
                  className={SINIF_GIRDI}
                >
                  <option value="" disabled>
                    Seçiniz
                  </option>
                  {KATILIM_BICIMLERI.map((bicim) => (
                    <option key={bicim} value={bicim}>
                      {KATILIM_BICIMI_ETIKETLERI[bicim]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {seciliTanim.hedefKitleVarMi && (
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Hedef kitle
                </span>
                <input
                  type="text"
                  name="hedefKitle"
                  maxLength={200}
                  placeholder="9. sınıflar, veliler, öğretmenler"
                  className={SINIF_GIRDI}
                />
              </label>
            )}

            {seciliTanim.duzenleyenVarMi && (
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Düzenleyen kurum
                </span>
                <input
                  type="text"
                  name="duzenleyen"
                  maxLength={200}
                  className={SINIF_GIRDI}
                />
              </label>
            )}

            {/*
              ÜRÜNE ÖZGÜ ALANLAR (D5 · 6 Ağustos 2026). İstekteki form:
              Ürün Adı · Geliştiren Ekip · Açıklamalar · Destekleyici Görseller
              · Linkler. Ad ve açıklama zaten ortak alanlar; görseller
              "Destekleyici belgeler" alanından yükleniyor (kazanim_ek).

              PROGRAM DOSYASI YÜKLENMİYOR — istek "şimdilik sadece tanıtım
              yapsınlar" diyor. Yükleme açılırsa zararlı yazılım taraması ve
              dağıtım sorumluluğu ayrıca konuşulmalı.
            */}
            {seciliTanim.urunAlanlariVarMi && (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-metin">
                    Geliştiren ekip{" "}
                    <span className="font-normal text-metin-yumusak">
                      (isteğe bağlı)
                    </span>
                  </span>
                  <input
                    type="text"
                    name="gelistirenEkip"
                    maxLength={250}
                    placeholder="Kendim · ya da ekip arkadaşlarının adları"
                    className={SINIF_GIRDI}
                  />
                </label>

                <label className="flex items-start gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    name="markettePaylasilsin"
                    value="evet"
                    className="mt-1 h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
                  />
                  <span className="text-sm text-metin">
                    <span className="font-medium">Bu ürünü markette paylaş</span>
                    {/*
                      Metin 6 Ağustos 2026'da güncellendi: market ekranı açıldı
                      (I). Eski metin "Market ekranı henüz açılmadı" diyordu ve
                      artık yanlıştı.
                    */}
                    <span className="mt-0.5 block text-metin-yumusak">
                      İşaretlerseniz ürününüz{" "}
                      <Link
                        href="/panel/urunler"
                        className="text-vurgu-metin underline underline-offset-2"
                      >
                        GençTek Market
                      </Link>
                      &apos;te listelenir ve GençTek&apos;e girmiş herkes
                      görebilir. İşaretlemezseniz ürün yalnızca sizde kalır;
                      paylaşımı sonradan ürün sayfasından açıp kapatabilirsiniz.
                    </span>
                  </span>
                </label>

                <fieldset className="sm:col-span-2">
                  <legend className="text-sm font-medium text-metin">
                    Bağlantılar{" "}
                    <span className="font-normal text-metin-yumusak">
                      (isteğe bağlı)
                    </span>
                  </legend>
                  <p className="mt-1 mb-2 text-sm text-metin-yumusak">
                    Ürünün deposu, canlı sürümü ve tanıtım videosu ayrı ayrı
                    yazılabilir. Boş satırlar yok sayılır.
                  </p>
                  {/*
                    Sabit üç satır: JavaScript olmadan "satır ekle" düğmesi
                    yapılamıyor ve sunucuya gidip gelmek formu sıfırlardı. Üç,
                    istekteki kullanım için yeterli; kural katmanı ona da
                    üst sınır koyuyor.
                  */}
                  <div className="space-y-2">
                    {[0, 1, 2].map((sira) => (
                      <div key={sira} className="grid gap-2 sm:grid-cols-3">
                        <input
                          type="url"
                          name="baglantiAdres"
                          maxLength={500}
                          placeholder="https://"
                          className={`${SINIF_GIRDI} sm:col-span-2`}
                          aria-label={`${sira + 1}. bağlantı adresi`}
                        />
                        <input
                          type="text"
                          name="baglantiEtiket"
                          maxLength={100}
                          placeholder="kaynak kod"
                          className={SINIF_GIRDI}
                          aria-label={`${sira + 1}. bağlantı etiketi`}
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {seciliTanim.dereceVarMi && (
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Aldığınız derece
                </span>
                <input
                  type="text"
                  name="derece"
                  maxLength={120}
                  placeholder="Türkiye 1.si"
                  className={SINIF_GIRDI}
                />
              </label>
            )}

            <label className="block">
              <span className="text-sm font-medium text-metin">Tarih</span>
              <input type="date" name="tarih" className={SINIF_GIRDI} />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-metin">
                Bağlantı (isteğe bağlı)
              </span>
              <input
                type="url"
                name="baglantiUrl"
                maxLength={500}
                placeholder="https://"
                className={SINIF_GIRDI}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-metin">
                Açıklama (isteğe bağlı)
              </span>
              <textarea
                name="aciklama"
                rows={3}
                maxLength={2000}
                className={SINIF_GIRDI}
              />
            </label>

            {/*
              Destekleyici belgeler. Kayıt oluşturulduktan SONRA yazılır; dosya
              reddedilirse kayıt geri alınmaz, uyarı gösterilir ve dosya
              sonradan eklenebilir (bkz. kazanimEkleEylemi).
            */}
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-metin">
                Destekleyici belgeler (isteğe bağlı)
              </span>
              <input
                type="file"
                name="belgeler"
                multiple
                accept={izinliBelgeTipleri.join(",")}
                className="mt-1 block w-full text-sm text-metin file:mr-3 file:rounded-md file:border file:border-cizgi file:bg-kart file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-metin"
              />
              <span className="mt-1 block text-sm text-metin-yumusak">
                Etkinliğe dair fotoğraf ve belge ekleyebilirsiniz. Görsel için
                en fazla{" "}
                {(belgeSinirlari.gorselMaksBayt / (1024 * 1024)).toFixed(0)} MB,
                belge için{" "}
                {(belgeSinirlari.belgeMaksBayt / (1024 * 1024)).toFixed(0)} MB.
                Yüklediğiniz belgeleri danışmanınız ve koordinatörünüz de görür.
              </span>
            </label>
          </div>

          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            <Plus size={15} aria-hidden />
            Ekle
          </button>
        </form>
      </Kart>

      {/*
        EN ALTTA duruyor ve `id="kvkk"` taşıyor: şerit ile eski /panel/kvkk
        adresi buraya çapa ile geliyor. Yukarı taşınırsa o iki bağlantı da
        yanlış yere düşer.
      */}
      <div id="kvkk" className="scroll-mt-6">
        <OnayBelgeleriBolumu
          durumlar={belgeDurumlari}
          onaylaEylemi={belgeOnaylaEylemi}
        />
      </div>
    </div>
  );
}
