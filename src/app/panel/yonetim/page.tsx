import {
  BadgeCheck,
  Compass,
  Download,
  FileText,
  GraduationCap,
  Handshake,
  MapPin,
  Megaphone,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import {
  BirimKarti,
  KisayolKarti,
  ToplamSeridi,
} from "@/components/YonetimKartlari";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { ekipYonetebilirMi } from "@/lib/ekip/kurallar";
import {
  birimUyarilari,
  illeriSuz,
  ilSiralamasiCoz,
  ozetToplami,
} from "@/lib/rapor/yonetim-kurallari";
import {
  ilceOzetleriniGetir,
  ilOzetleriniGetir,
} from "@/lib/rapor/yonetim-ozeti";
import {
  ilKoordinatoruMu,
  koordinatorIlKodu,
  mentorlukOnaylayabilirMi,
  ogrenciEnvanteriGorebilirMi,
  ogretmenEnvanteriGorebilirMi,
  paydasGorebilirMi,
  projeYoneticisiMi,
  rolEnvanteriGorebilirMi,
  yonetimPanosuGorebilirMi,
} from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

const SINIF_ETIKET = "text-sm font-medium text-metin-yumusak";
const SINIF_SECIM =
  "mt-1 w-full rounded-md border border-cizgi bg-kart px-3 py-2 text-sm text-metin outline-none focus:border-vurgu";

/**
 * YÖNETİM PANELİ (11 Ağustos 2026 · istek: "il koordinatörü ve proje yöneticisi
 * için yönetim paneli olacak, burada olan her şey kart düzeninde olacak").
 *
 * İki işi birden yapar:
 *
 *   1. KIRILIM. Merkez tüm illeri, il koordinatörü kendi ilinin ilçelerini
 *      görür; her kartta o birimdeki okul, öğretmen, danışman öğretmen, öğrenci
 *      ve (ilde) etkinlik sayısı yazar, altında da o birimin EKSİKLERİ durur.
 *      Karta tıklandıkça bir basamak inilir: il → ilçe → okul.
 *   2. ALT MENÜ. Üst menüden kalkan yönetim sekmeleri (Öğrenciler, Öğretmenler,
 *      Paydaşlar, Görev Rolleri, Mentörlük) burada kart olarak duruyor.
 *
 * MERKEZ İLE KOORDİNATÖR AYNI EKRANI PAYLAŞIR, yalnızca başladıkları basamak
 * farklı. Ayrı iki sayfa yazılsaydı ikisinde de aynı kart düzeni ve aynı
 * sayımlar iki kez durur, birinde yapılan düzeltme öbüründe unutulurdu.
 */
export default async function YonetimSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ ara?: string; sirala?: string }>;
}) {
  const { ara, sirala } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  if (!yonetimPanosuGorebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Yönetim Paneli"
          aciklama="Bu ekrana erişim yetkiniz yok."
        />
      </Kart>
    );
  }

  const merkezMi = projeYoneticisiMi(kullanici);
  const ilKodu = koordinatorIlKodu(kullanici);

  /*
   * Merkezde il, koordinatörde ilçe kırılımı. Koordinatör için il basamağı
   * atlanıyor: tek ili var ve o basamak ona tek kartlık bir ara sayfa olurdu.
   */
  const tumIller = merkezMi ? await ilOzetleriniGetir() : [];
  const ilceler = !merkezMi && ilKodu ? await ilceOzetleriniGetir(ilKodu) : [];
  const il =
    !merkezMi && ilKodu
      ? await prisma.il.findUnique({
          where: { ilKodu },
          select: { ad: true },
        })
      : null;

  const siralama = ilSiralamasiCoz(sirala);
  const aranan = ara?.trim() ?? "";
  const iller = illeriSuz(tumIller, { ara: aranan, sirala: siralama });

  /*
   * TOPLAM SÜZÜLMÜŞ LİSTEDEN HESAPLANIR, tamamından değil: şerit her zaman
   * "aşağıda duran kartların toplamı"dır. Ülke toplamı sabit kalsaydı, tek il
   * arayan kişi kartında 12 okul görüp şeritte 1.204 okul okurdu.
   */
  const toplam = ozetToplami(merkezMi ? iller : ilceler);
  const suzgecVar = aranan !== "" || siralama !== "ad";

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Yönetim Paneli"
        aciklama={
          merkezMi
            ? "Ülke genelindeki kırılım ve yönetim ekranları. Bir ile tıklayarak ilçelerine, ilçeye tıklayarak okullarına inebilirsiniz."
            : `${il?.ad ?? "İliniz"} ilindeki ilçeler ve yönetim ekranları. Bir ilçeye tıklayarak okullarını görebilirsiniz.`
        }
      />

      {/*
        ALT MENÜ KARTLARI. Sırası üst menüdeki eski sırayı korur: kullanıcı
        sekmeleri soldan sağa nasıl okuyorduysa kartları da öyle okuyor.

        Her kart KENDİ YETKİSİNİ sorar; pano kapısını geçmiş olmak kartların
        hepsini hak etmek anlamına gelmiyor (bkz. yonetimPanosuGorebilirMi).
      */}
      <Kart>
        <KartBasligi
          baslik="Yönetim ekranları"
          aciklama="Üst menüden kaldırılan yönetim sekmeleri burada."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {ogrenciEnvanteriGorebilirMi(kullanici) && (
            <KisayolKarti
              baslik="Öğrenciler"
              aciklama={
                merkezMi
                  ? "Ülke genelindeki öğrenci envanteri, süzgeçler ve CSV çıktısı"
                  : "İlinizdeki öğrenci envanteri, süzgeçler ve CSV çıktısı"
              }
              Ikon={GraduationCap}
              yol="/panel/ogrenciler"
            />
          )}
          {ogretmenEnvanteriGorebilirMi(kullanici) && (
            <KisayolKarti
              baslik="Öğretmenler"
              aciklama="Danışman öğretmenler ve görev almamış öğretmenler"
              Ikon={Users}
              yol="/panel/ogretmenler"
            />
          )}
          {paydasGorebilirMi(kullanici) && (
            <KisayolKarti
              baslik="Paydaşlar"
              aciklama="İş birliği yapılan kurumlar ve iletişim kişileri"
              Ikon={Handshake}
              yol="/panel/paydaslar"
            />
          )}
          {(merkezMi || ilKoordinatoruMu(kullanici)) && (
            <KisayolKarti
              baslik="Görev Rolleri"
              aciklama="İl ve ilçe temsilcisi görevlerinin verilmesi"
              Ikon={BadgeCheck}
              yol="/panel/gorev-rolleri"
            />
          )}
          {/*
            KOORDİNATÖRLER = eski "Rol/Atama Envanteri" (11 Ağustos 2026 ·
            istek: "yönetim paneline bir de koordinatörler sayfası gelecek, rol
            atama envanteri koordinatör kartına gelecek").

            Ekran zaten hangi ilde kimin koordinatör olduğunu, hangi ilin boş
            kaldığını gösteriyordu; adı yaptığı işi söylemiyordu. Sekmesi kalktı,
            adresi ve yetkisi aynı kaldı — yalnızca merkeze açık.
          */}
          {rolEnvanteriGorebilirMi(kullanici) && (
            <KisayolKarti
              baslik="Koordinatörler"
              aciklama="İl koordinatörü atamaları, boş iller ve rol geçmişi"
              Ikon={UserCog}
              yol="/panel/rol-envanteri"
            />
          )}
          {mentorlukOnaylayabilirMi(kullanici) && (
            <KisayolKarti
              baslik="Mentörler"
              aciklama="Mentör başvuruları ve karara bağlanan mentörler"
              Ikon={Compass}
              yol="/panel/mentorluk"
            />
          )}
          {/*
            EKİPLERİM (13 Ağustos 2026 · istek: "il koordinatörü ekipler
            kurabilsin … bunu da yönetim paneline kart olarak ekleyelim, ismi
            ekiplerim olsun").

            Kart, ekibin kurulduğu ve yönetildiği tek kapıdır: menüde sekmesi
            yok, çünkü ekip günlük bir iş değil — koordinatörün ihtiyaç
            duyduğunda kurduğu bir topluluk. Üyeler ekiplerine kendi
            panellerindeki karttan giriyor (bkz. app/panel/page.tsx).

            Yetki `ekipYonetebilirMi`: il koordinatörü ve merkez. Yönetim
            panosunu zaten bu ikisi açıyor ama kart yine de koşullu — panoya
            ileride başka bir rol girerse ekip kurma kapısı sessizce açılmasın.
          */}
          {/*
            YEĞİTEK OKUL SORUMLULARI (13 Ağustos 2026 · istek: "proje
            yöneticisinin yönetim panelinde de YEĞİTEK Okul Sorumlusu isminde
            bir kart olsun ve oradan onların listesini görebilsin").

            Yalnızca merkezde: liste ülke geneli bir görünüm ve rol/atama
            envanteriyle aynı kategoride. Koordinatör kartı görmüyor çünkü
            ekranın kendisi de ona kapalı (bkz. okul-sorumlulari/page.tsx).
          */}
          {rolEnvanteriGorebilirMi(kullanici) && (
            <KisayolKarti
              baslik="YEĞİTEK Okul Sorumlusu"
              aciklama="Kendini okul sorumlusu olarak işaretlemiş danışman öğretmenlerin listesi"
              Ikon={ShieldCheck}
              yol="/panel/okul-sorumlulari"
            />
          )}
          {ekipYonetebilirMi(kullanici) && (
            <KisayolKarti
              baslik="Ekiplerim"
              aciklama="İlinizde kurduğunuz ekipler, üyeleri ve ekip sohbetleri"
              Ikon={UsersRound}
              yol="/panel/ekipler"
            />
          )}
          {/*
            ETKİNLİK RAPORLARI ekranının HİÇ KAPISI YOKTU: menüde sekmesi yok,
            panoda kartı yoktu; tek girişi Panelim'deki "Raporsuz biten etkinlik"
            ölçüm kartıydı. Yani sayı sıfırken — raporların hepsi yazılmışken —
            ekrana gidecek bir yol kalmıyordu ve yazılmış raporlara bakmak
            isteyen kişi adresi ezbere bilmek zorundaydı.

            Kart pano kapısını geçen herkese açık: ekranın kendi yetkisi zaten
            koordinatör, merkez ve danışman öğretmen; ilk ikisi burada.
          */}
          <KisayolKarti
            baslik="Etkinlik Raporları"
            aciklama="Biten etkinliklerin raporları ve raporu eksik olanlar"
            Ikon={FileText}
            yol="/panel/raporlar"
          />
          {/*
            MERKEZİN ÜÇ EKRANI (11 Ağustos 2026). Panonun kuruluş gerekçesi
            "yönetim ekranlarının girişi burada olsun"du ama merkeze özel bu üç
            sekme üst menüde kalmıştı; menüde de duruyorlar, çünkü ikisi de
            günlük iş ve sekmeden kaldırmak istenmedi. Panoya inmelerinin
            sebebi, merkezin yönetim işini tek ekrandan görebilmesi.
          */}
          {rolEnvanteriGorebilirMi(kullanici) && (
            <>
              <KisayolKarti
                baslik="Erişim Kayıtları"
                aciklama="Kimin hangi kaydı görüntülediği — KVKK denetimi"
                Ikon={ShieldCheck}
                yol="/panel/erisim-loglari"
              />
              <KisayolKarti
                baslik="Mesaj Gönder"
                aciklama="Seçilen kitleye toplu bildirim ve duyuru"
                Ikon={Megaphone}
                yol="/panel/duyurular"
              />
              <KisayolKarti
                baslik="Sistem Ayarları"
                aciklama="Çalışma grupları, etkinlik programları ve sistem ayarları"
                Ikon={Settings}
                yol="/panel/ayarlar"
              />
            </>
          )}
        </div>
      </Kart>

      <Kart>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <KartBasligi
            baslik={merkezMi ? "İller" : "İlçeler"}
            aciklama={
              merkezMi
                ? "Her kartta ildeki okul, öğretmen, danışman öğretmen, öğrenci ve etkinlik sayısı"
                : "Her kartta ilçedeki okul, öğretmen, danışman öğretmen ve öğrenci sayısı"
            }
            Ikon={MapPin}
          />
          {/*
            CSV, EKRANDA GÖRÜNEN LİSTENİN AYNISI: arama ve sıralama adresten
            geldiği için indirme bağlantısına da aynı parametreler ekleniyor.
            Ölçütler taşınmasaydı "koordinatörsüz iller" listesini süzen kişi,
            indirdiği dosyada 81 ilin tamamını bulurdu.
          */}
          <Link
            href={`/panel/yonetim/disa-aktar${
              suzgecVar
                ? `?${new URLSearchParams({
                    ...(aranan ? { ara: aranan } : {}),
                    ...(siralama !== "ad" ? { sirala: siralama } : {}),
                  }).toString()}`
                : ""
            }`}
            className={SINIF_IKINCIL_BUTON}
          >
            <Download size={16} aria-hidden />
            CSV indir
          </Link>
        </div>

        {/*
          SÜZGEÇ YALNIZCA MERKEZDE: koordinatörün ilçe sayısı onlarla ölçülür ve
          zaten tek ekranda görünür; 81 il ise aranmadan bulunmuyordu. Form GET
          ile çalışıyor, yani sonuç adres çubuğunda duruyor ve paylaşılabiliyor.
        */}
        {merkezMi && (
          <form method="get" className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={SINIF_ETIKET}>İl ara</span>
                <input
                  type="search"
                  name="ara"
                  defaultValue={aranan}
                  placeholder="İl adı"
                  className={SINIF_SECIM}
                />
              </label>
              <label className="block">
                <span className={SINIF_ETIKET}>Sıralama</span>
                <select
                  name="sirala"
                  defaultValue={siralama}
                  className={SINIF_SECIM}
                >
                  <option value="ad">İl adına göre</option>
                  <option value="ogrenci">Öğrencisi çok olan üstte</option>
                  <option value="bosluk">Eksiği çok olan üstte</option>
                </select>
              </label>
            </div>
            <div className="flex items-end gap-3">
              <button type="submit" className={SINIF_IKINCIL_BUTON}>
                <Search size={16} aria-hidden />
                Uygula
              </button>
              {suzgecVar && (
                <Link
                  href="/panel/yonetim"
                  className="inline-flex items-center gap-1 pb-2 text-sm font-medium text-vurgu-metin"
                >
                  <X size={14} aria-hidden />
                  Temizle
                </Link>
              )}
            </div>
          </form>
        )}

        <div className="mb-5 rounded-kart border border-cizgi bg-zemin px-5 py-4">
          <ToplamSeridi
            /*
             * İl sayısı ozetToplami'den gelmez, KART SAYISININ KENDİSİDİR:
             * il kartında "kaç il" diye bir alan yok, listenin uzunluğu o sayı.
             * Koordinatör görünümünde ölçüm hiç basılmıyor — tek ili var.
             */
            il={merkezMi ? iller.length : undefined}
            ilce={toplam.ilce}
            okul={toplam.okul}
            ogretmen={toplam.ogretmen}
            danismanOgretmen={toplam.danismanOgretmen}
            ogrenci={toplam.ogrenci}
            faaliyet={merkezMi ? toplam.faaliyet : undefined}
            koordinatorsuzIl={toplam.koordinatorsuzIl}
            danismansizOkul={toplam.danismansizOkul}
            danismansizOgrenci={toplam.danismansizOgrenci}
            raporsuzFaaliyet={toplam.raporsuzFaaliyet}
          />
        </div>

        {merkezMi ? (
          iller.length === 0 ? (
            <p className="text-sm text-metin-yumusak">
              &ldquo;{aranan}&rdquo; aramasıyla eşleşen il yok.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {iller.map((il) => (
                <BirimKarti
                  key={il.ilKodu}
                  ad={il.ad}
                  /*
                   * İlçe sayısı kartın alt satırında: tıklanınca ne kadar liste
                   * açılacağını önceden söylüyor. Koordinatör adı ise merkezin
                   * bu ekranda aradığı ilk bilgi — koordinatörsüz il,
                   * doldurulacak bir boşluktur (bkz. istatistik.ts).
                   */
                  altBilgi={`${il.ilceSayisi} ilçe · ${
                    il.koordinatorAdi ?? "Koordinatör atanmadı"
                  }`}
                  okulSayisi={il.okulSayisi}
                  ogretmenSayisi={il.ogretmenSayisi}
                  danismanOgretmenSayisi={il.danismanOgretmenSayisi}
                  ogrenciSayisi={il.ogrenciSayisi}
                  faaliyetSayisi={il.faaliyetSayisi}
                  uyarilar={birimUyarilari(il)}
                  yol={`/panel/yonetim/il/${il.ilKodu}`}
                />
              ))}
            </div>
          )
        ) : ilceler.length === 0 ? (
          <p className="text-sm text-metin-yumusak">
            İlinize bağlı ilçe kaydı bulunamadı.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ilceler.map((ilce) => (
              <BirimKarti
                key={ilce.ilceKodu}
                ad={ilce.ad}
                okulSayisi={ilce.okulSayisi}
                ogretmenSayisi={ilce.ogretmenSayisi}
                danismanOgretmenSayisi={ilce.danismanOgretmenSayisi}
                ogrenciSayisi={ilce.ogrenciSayisi}
                /*
                 * Şeritteki eksiklerin hangi ilçeden geldiği ancak kartta
                 * görünür; toplam "nerede iş var" der, kart "kimde" der.
                 */
                uyarilar={birimUyarilari(ilce)}
                yol={`/panel/yonetim/ilce/${ilce.ilceKodu}`}
              />
            ))}
          </div>
        )}
      </Kart>

      {/*
        Kırılımın dışındaki tek çıkış: ilin tamamının listesi. Kartlar ilçe
        ilçe gidiyor, "ilimdeki bütün öğrenciler" ise tek tıkla açılmalı.
      */}
      {!merkezMi && ilKodu && (
        <p className="text-sm text-metin-yumusak">
          İlin tamamı:{" "}
          <Link
            href="/panel/ogrenciler"
            className="font-medium text-vurgu-metin underline underline-offset-2"
          >
            öğrenciler
          </Link>{" "}
          ·{" "}
          <Link
            href="/panel/ogretmenler"
            className="font-medium text-vurgu-metin underline underline-offset-2"
          >
            öğretmenler
          </Link>
        </p>
      )}
    </div>
  );
}
