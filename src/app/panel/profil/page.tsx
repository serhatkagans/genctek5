import {
  BadgeCheck,
  Camera,
  FileText,
  IdCard,
  Layers,
  Mail,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import {
  KatilimKarti,
  KazanimBolumleri,
  SaltOkunurAlan,
} from "@/components/OgrenciProfilBolumleri";
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
import { kazanimlariGetir } from "@/lib/kazanim/getir";
import {
  basHarfler,
  profilFotoTipAdlari,
} from "@/lib/kullanici/profil-foto-kurallar";
import { profilFotoSinirlariniGetir } from "@/lib/kullanici/profil-foto";
import { SALT_OKUNUR_ACIKLAMASI } from "@/lib/kullanici/salt-okunur";
import { cvSinirlariniGetir } from "@/lib/ogrenci/cv";
import { cvTipAdlari } from "@/lib/ogrenci/cv-kurallar";
import {
  KAZANIM_TIPLERI,
  kazanimTipiGecerliMi,
  kazanimTipiTanimi,
} from "@/lib/ogrenci/kazanim-kurallar";
import { tarihSaatYaz } from "@/lib/tarih";
import {
  GOREV_ROL_ETIKETLERI,
  kullaniciRolEtiketi,
} from "@/lib/yetki/etiketler";
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
import {
  cvSilEylemi,
  cvYukleEylemi,
  kazanimEkleEylemi,
  kazanimSilEylemi,
} from "./kazanim-eylemleri";

export const dynamic = "force-dynamic";

const DURUM_MESAJLARI: Record<string, string> = {
  "kazanim-eklendi": "Kayıt profiline eklendi.",
  "kazanim-silindi": "Kayıt silindi.",
  "cv-yuklendi": "CV'niz yüklendi.",
  "cv-silindi": "CV'niz kaldırıldı.",
  "foto-yuklendi": "Profil fotoğrafınız güncellendi.",
  "foto-silindi": "Profil fotoğrafınız kaldırıldı.",
};

/** Kazanım ekleme formunun hangi tür için açık olduğu. */
const VARSAYILAN_TUR = KAZANIM_TIPLERI[0].tip;

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
      gorevRolleri: {
        where: { egitimOgretimYili: kullanici.egitimOgretimYili },
        select: { rolKodu: true },
      },
      calismaGruplari: {
        select: {
          calismaGrubuId: true,
          secimTarihi: true,
          calismaGrubu: { select: { ad: true, aktif: true } },
          ekleyen: { select: { ad: true, soyad: true } },
        },
      },
      kazanimlar: {
        // Kullanıcının girdiği tarih boş olabildiği için ikinci sıralama ölçütü
        // gerekiyor; yoksa tarihsiz kayıtların sırası belirsiz kalır.
        orderBy: [{ tarih: "desc" }, { olusturmaTarihi: "desc" }],
      },
    },
  });

  const ogrenci = ogrenciMi(kullanici);

  const atama = ogrenci ? await aktifAtamaGetir(kullanici.id) : null;

  // Katılım geçmişi ve rozetler yalnızca öğrenci için anlamlı; öğretmen
  // profilinde sorgu hiç çalıştırılmıyor.
  const kazanim = ogrenci ? await kazanimlariGetir(kullanici.id) : null;
  const cvSinirlari = ogrenci ? await cvSinirlariniGetir() : null;
  // Fotoğraf sınırları role bakılmadan alınır: kart herkese gösteriliyor.
  const fotoSinirlari = await profilFotoSinirlariniGetir();

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
    istenenTur && kazanimTipiGecerliMi(istenenTur) ? istenenTur : VARSAYILAN_TUR;
  const seciliTanim = kazanimTipiTanimi(seciliTur);

  const cv = kayit.ogrenciProfil;
  const cvVar = Boolean(cv?.cvDepolamaYolu);

  const fotoVar = Boolean(kayit.fotoDepolamaYolu);
  /*
   * Adresin sonundaki sürüm damgası, yeni fotoğraf yüklendiğinde tarayıcının
   * eskisini göstermesini engeller: rota kısa ömürlü bir ön bellek bıraktığı
   * için adres değişmezse görsel güncellenmiş görünmezdi.
   */
  const fotoAdresi = kayit.fotoYuklenmeTarihi
    ? `/panel/profil/foto?s=${kayit.fotoYuklenmeTarihi.getTime()}`
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
          <SaltOkunurAlan
            etiket="Cinsiyet"
            deger={kayit.cinsiyet === "K" ? "Kadın" : "Erkek"}
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
            kayit.brans && (
              <SaltOkunurAlan etiket="Branş" deger={kayit.brans} />
            )
          )}
          <SaltOkunurAlan
            etiket="Sistem görevi"
            deger={kullaniciRolEtiketi(kullanici)}
          />
          {sorumluIlKodu && (
            <SaltOkunurAlan
              etiket="Sorumlu olduğu il"
              deger={sorumluIl ? `${sorumluIl.ad} (${sorumluIlKodu})` : sorumluIlKodu}
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
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Kaydet
          </button>
        </form>
      </Kart>

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
            {kayit.calismaGruplari.length > 0 && (
              <>
                <h3 className="mt-5 flex items-center gap-2 text-sm font-medium text-metin-yumusak">
                  <Layers size={15} aria-hidden />
                  Çalışma gruplarım
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {kayit.calismaGruplari.map((secim) => (
                    <li
                      key={secim.calismaGrubuId}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span className="rounded-full bg-vurgu-zemin px-3 py-1 text-sm text-vurgu-metin">
                        {secim.calismaGrubu.ad}
                      </span>
                      {/*
                       * Grubu danışmanı ya da koordinatörü eklemiş olabilir;
                       * öğrenci profilinde bir grubun nereden geldiğini
                       * görebilmeli.
                       */}
                      {secim.ekleyen && (
                        <span className="text-sm text-metin-yumusak">
                          {secim.ekleyen.ad} {secim.ekleyen.soyad} ekledi
                        </span>
                      )}
                      {!secim.calismaGrubu.aktif && (
                        <span className="rounded-full bg-uyari-zemin px-2 py-0.5 text-xs text-uyari-metin">
                          Kapatılmış grup
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/panel/calisma-gruplari"
                  className="mt-3 inline-block text-sm font-medium text-vurgu-metin underline underline-offset-2"
                >
                  Grup seçimimi düzenle
                </Link>
              </>
            )}
            {kayit.gorevRolleri.length > 0 && (
              <>
                <h3 className="mt-5 flex items-center gap-2 text-sm font-medium text-metin-yumusak">
                  <BadgeCheck size={15} aria-hidden />
                  Görevlerim
                </h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {kayit.gorevRolleri.map((gorev) => (
                    <li
                      key={gorev.rolKodu}
                      className="rounded-full bg-rol-ogrenci-zemin px-3 py-1 text-sm text-rol-ogrenci-metin"
                    >
                      {GOREV_ROL_ETIKETLERI[gorev.rolKodu]}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Kart>

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

          {kazanim && <KatilimKarti kazanim={kazanim} />}

          <Kart>
            <KartBasligi
              baslik="Ekosisteme katkı"
              aciklama="GençTek dışı etkinlikler, yaptığınız ürünler, verdiğiniz akran eğitimleri ve derece aldığınız yarışmalar. Kayıtları siz girersiniz; danışmanınız ve koordinatörünüz profilinizde görür."
              Ikon={Sparkles}
            />
            <KazanimBolumleri
              kazanimlar={kayit.kazanimlar}
              silmeEylemi={kazanimSilEylemi}
              bosMesaji="Henüz kayıt girmediniz."
            />
          </Kart>

          <Kart>
            <KartBasligi baslik="Yeni kayıt ekle" Ikon={Plus} />

            <nav className="mb-5 flex flex-wrap gap-2" aria-label="Kayıt türü">
              {KAZANIM_TIPLERI.map((tanim) => (
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
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-metin">
                    {seciliTanim.baslikEtiketi}
                  </span>
                  <input
                    type="text"
                    name="baslik"
                    required
                    maxLength={250}
                    placeholder={seciliTanim.baslikOrnegi}
                    className={SINIF_GIRDI}
                  />
                </label>

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
              </div>

              <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                <Plus size={15} aria-hidden />
                Ekle
              </button>
            </form>
          </Kart>
        </>
      )}

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
    </div>
  );
}
