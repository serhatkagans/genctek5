import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  IdCard,
  Layers,
  Mail,
  Plus,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  KatilimKarti,
  KazanimBolumleri,
  RozetOzeti,
  SaltOkunurAlan,
} from "@/components/OgrenciProfilBolumleri";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { cvTipAdlari } from "@/lib/ogrenci/cv-kurallar";
import {
  gorunurOgrenciGetir,
  ogrenciProfilVerisiGetir,
} from "@/lib/ogrenci/profil";
import { SALT_OKUNUR_ACIKLAMASI } from "@/lib/kullanici/salt-okunur";
import { tarihSaatYaz, tarihYaz } from "@/lib/tarih";
import { GOREV_ROL_ETIKETLERI } from "@/lib/yetki/etiketler";
import { ogrenciCalismaGrubuYonetebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import {
  ogrenciyeGrupEkleEylemi,
  ogrenciyiGruptanCikarEylemi,
} from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Tekil öğrenci profili — danışman öğretmen, il koordinatörü ve proje
 * yöneticisinin gördüğü ekran (references/permissions.md Bölüm 7,
 * `GET /ogrenciler/:id`).
 *
 * Erişim MERKEZİ kapsam filtresinden geçer (`gorunurOgrenciGetir`); kapsam dışı
 * öğrencide "yetkiniz yok" değil 404 döner, kaydın varlığı bile sızmaz. Öğrenci
 * kendi id'siyle buraya girebilir çünkü kapsam filtresi ona "yalnızca kendisi"
 * diyor — ama düzenleme yolları kendi profilindedir, burada yalnızca okur.
 *
 * Görüntüleme erişim logu YAZILIR: bu ekran listeden daha fazla kişisel veri
 * gösterir (iletişim bilgisi, CV, kazanım beyanları).
 */

const DURUM_MESAJLARI: Record<string, string> = {
  "grup-eklendi": "Öğrenci çalışma grubuna eklendi.",
  "grup-cikarildi": "Öğrenci çalışma grubundan çıkarıldı.",
};

function tekil(deger: string | string[] | undefined): string | null {
  if (Array.isArray(deger)) return deger[0] ?? null;
  return deger ?? null;
}

export default async function OgrenciProfilSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { id } = await params;
  const parametreler = await searchParams;

  const ogrenci = await gorunurOgrenciGetir(
    kullanici,
    Number.parseInt(id, 10),
  );
  if (!ogrenci) notFound();

  const { kazanim, eklenebilirGruplar } =
    await ogrenciProfilVerisiGetir(ogrenci);

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "OGRENCI",
    hedefId: ogrenci.id,
    detay: "Öğrenci profili görüntülendi",
  });

  const kendiProfili = ogrenci.id === kullanici.id;
  const grupYonetimi =
    ogrenciCalismaGrubuYonetebilirMi(kullanici) && !kendiProfili;

  const atama = ogrenci.ogrenciAtamalari[0];
  const danismanIletisimi = [
    atama?.danisman.ogretmenProfil?.eposta,
    atama?.danisman.ogretmenProfil?.telefon,
  ].filter((deger): deger is string => Boolean(deger?.trim()));

  const gorevRolleri = ogrenci.gorevRolleri.filter(
    (gorev) => gorev.egitimOgretimYili === ogrenci.egitimOgretimYili,
  );

  const cv = ogrenci.ogrenciProfil;
  const cvVar = Boolean(cv?.cvDepolamaYolu);

  const hata = tekil(parametreler.hata);
  const durum = tekil(parametreler.durum);

  return (
    <div className="space-y-6">
      <Link
        href="/panel/ogrenciler"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin"
      >
        <ArrowLeft size={15} aria-hidden />
        Öğrenci listesine dön
      </Link>

      <SayfaBasligi
        baslik={`${ogrenci.ad} ${ogrenci.soyad}`}
        aciklama={[
          ogrenci.sinif ? `${ogrenci.sinif}. sınıf` : null,
          ogrenci.kurum?.ad,
          ogrenci.il?.ad,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}
      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}

      <Kart>
        <KartBasligi
          baslik="Kimlik bilgileri"
          aciklama={SALT_OKUNUR_ACIKLAMASI}
          Ikon={IdCard}
        />
        <dl className="grid gap-5 sm:grid-cols-2">
          <SaltOkunurAlan etiket="Ad" deger={ogrenci.ad} />
          <SaltOkunurAlan etiket="Soyad" deger={ogrenci.soyad} />
          <SaltOkunurAlan
            etiket="Cinsiyet"
            deger={ogrenci.cinsiyet === "K" ? "Kadın" : "Erkek"}
          />
          <SaltOkunurAlan
            etiket="Eğitim-öğretim yılı"
            deger={ogrenci.egitimOgretimYili}
          />
          <SaltOkunurAlan etiket="Sınıf" deger={ogrenci.sinif} />
          <SaltOkunurAlan etiket="Okul" deger={ogrenci.kurum?.ad ?? null} />
          <SaltOkunurAlan
            etiket="Okul türü"
            deger={ogrenci.kurum?.okulTuru ?? null}
          />
          <SaltOkunurAlan
            etiket="İl / İlçe"
            deger={
              ogrenci.il
                ? `${ogrenci.il.ad}${ogrenci.ilce ? ` / ${ogrenci.ilce.ad}` : ""}`
                : null
            }
          />
        </dl>
      </Kart>

      <Kart>
        <KartBasligi
          baslik="İletişim bilgileri"
          aciklama="Öğrencinin kendi girdiği bilgilerdir; e-Okul'dan gelmez."
          Ikon={Mail}
        />
        <dl className="grid gap-5 sm:grid-cols-2">
          <SaltOkunurAlan
            etiket="E-posta"
            deger={ogrenci.ogrenciProfil?.eposta ?? null}
          />
          <SaltOkunurAlan
            etiket="Telefon"
            deger={ogrenci.ogrenciProfil?.telefon ?? null}
          />
        </dl>
      </Kart>

      <Kart>
        <KartBasligi baslik="Danışman öğretmeni" Ikon={UserCheck} />
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
        {atama && (
          <p className="mt-1 text-sm text-metin-yumusak">
            {tarihYaz(atama.baslangicTarihi)} tarihinden beri
          </p>
        )}

        {gorevRolleri.length > 0 && (
          <>
            <h3 className="mt-5 flex items-center gap-2 text-sm font-medium text-metin-yumusak">
              <BadgeCheck size={15} aria-hidden />
              Görevleri
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {gorevRolleri.map((gorev) => (
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
          baslik="Çalışma grupları"
          aciklama={
            grupYonetimi
              ? "Öğrenciyi gruba ekleyebilir ya da gruptan çıkarabilirsiniz. Üst sınır yoktur."
              : "Öğrencinin seçtiği çalışma grupları."
          }
          Ikon={Layers}
        />

        {ogrenci.calismaGruplari.length === 0 ? (
          <p className="text-metin-yumusak">Henüz çalışma grubu seçilmemiş.</p>
        ) : (
          <ul className="divide-y divide-cizgi">
            {ogrenci.calismaGruplari.map((secim) => (
              <li
                key={secim.calismaGrubuId}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-metin">
                    {secim.calismaGrubu.ad}
                    {!secim.calismaGrubu.aktif && (
                      <span className="ml-2 rounded-full bg-uyari-zemin px-2 py-0.5 text-xs text-uyari-metin">
                        Kapatılmış grup
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-metin-yumusak">
                    {tarihYaz(secim.secimTarihi)} ·{" "}
                    {secim.ekleyen
                      ? `${secim.ekleyen.ad} ${secim.ekleyen.soyad} ekledi`
                      : "öğrencinin kendi seçimi"}
                  </p>
                </div>
                {grupYonetimi && (
                  <form action={ogrenciyiGruptanCikarEylemi}>
                    <input type="hidden" name="ogrenciId" value={ogrenci.id} />
                    <input
                      type="hidden"
                      name="grupId"
                      value={secim.calismaGrubuId}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin-yumusak transition hover:bg-zemin hover:text-hata-metin"
                    >
                      <X size={14} aria-hidden />
                      Çıkar
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {grupYonetimi && eklenebilirGruplar.length > 0 && (
          <form
            action={ogrenciyeGrupEkleEylemi}
            className="mt-5 flex flex-wrap items-end gap-3 border-t border-cizgi pt-5"
          >
            <input type="hidden" name="ogrenciId" value={ogrenci.id} />
            <label className="block min-w-56 flex-1">
              <span className="text-sm font-medium text-metin">
                Çalışma grubuna ekle
              </span>
              <select
                name="grupId"
                required
                defaultValue=""
                className="mt-1 w-full rounded-md border border-cizgi bg-kart px-3 py-2 text-sm text-metin outline-none focus:border-vurgu"
              >
                <option value="" disabled>
                  Grup seçin
                </option>
                {eklenebilirGruplar.map((grup) => (
                  <option key={grup.id} value={grup.id}>
                    {grup.ad}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              <Plus size={15} aria-hidden />
              Ekle
            </button>
          </form>
        )}
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Özgeçmiş (CV)"
          aciklama="Öğrencinin kendi yüklediği belge."
          Ikon={FileText}
        />
        {cvVar && cv ? (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/panel/ogrenciler/${ogrenci.id}/cv`}
              className={SINIF_BIRINCIL_BUTON}
            >
              <FileText size={15} aria-hidden />
              CV&apos;yi görüntüle
            </Link>
            <p className="text-sm text-metin-yumusak">
              {cv.cvDosyaAdi}
              {cv.cvYuklenmeTarihi
                ? ` · ${tarihSaatYaz(cv.cvYuklenmeTarihi)}`
                : ""}
            </p>
          </div>
        ) : (
          <p className="text-metin-yumusak">
            Öğrenci henüz CV yüklemedi. Kabul edilen biçimler:{" "}
            {cvTipAdlari([
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ])}
            .
          </p>
        )}
      </Kart>

      <KatilimKarti kazanim={kazanim} />

      <Kart>
        <KartBasligi
          baslik="Kazanımlar ve üretimler"
          aciklama="Öğrencinin kendi beyan ettiği kayıtlardır; sistem doğrulamaz."
          Ikon={Sparkles}
        />
        <KazanimBolumleri
          kazanimlar={ogrenci.kazanimlar}
          bosMesaji="Kayıt girilmemiş."
        />
      </Kart>

      <RozetOzeti kazanim={kazanim} />
    </div>
  );
}
