import {
  Building2,
  CheckCircle2,
  GraduationCap,
  Send,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { ILLER } from "../../../prisma/veri/iller";
import { KamuSayfaDuzeni } from "@/components/KamuSayfaDuzeni";
import {
  BilgiKutusu,
  Kart,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import { prisma } from "@/lib/db";
import { disTuruMu, SIFRE_ALT_SINIRI } from "@/lib/dis-kimlik/kurallar";
import { PAYDAS_TURU_ETIKETLERI } from "@/lib/paydas/kurallar";
import { belgeMetniGetir } from "@/lib/kvkk/onay";
import { belgeTanimi } from "@/lib/kvkk/kurallar";
import { basvuruEylemi } from "./eylemler";

/**
 * EBA dışı giriş başvurusu (mezun, paydaş temsilcisi).
 *
 * FORM İKİ ADIMLIDIR ve bu bir tasarım tercihi değil zorunluluk: okul ve
 * paydaş listeleri İLE bağlıdır. Türkiye'nin tüm okullarını tek bir açılır
 * listeye basmak hem kullanılamaz hem de her başvuru sayfasında gereksiz bir
 * yük olurdu. Birinci adımda tür ve il seçilir (GET), ikinci adımda o ilin
 * listeleriyle asıl form gelir.
 *
 * AYDINLATMA METNİ BURADA OKUTULUR. Kişinin verisi başvuru anında işlenmeye
 * başlıyor, oysa kullanıcı kaydı henüz açılmıyor — onayın kullanici_onayi'na
 * yazılamamasının sebebi bu (bkz. dis_kullanici_basvurusu tablosu). İlk
 * girişte ayrıca /onay kapısından geçilir; o, sisteme girdikten SONRA işlenen
 * verinin karşılığıdır.
 */

export const dynamic = "force-dynamic";

const TUR_KARTLARI = [
  {
    kod: "MEZUN" as const,
    baslik: "Mezun",
    aciklama:
      "GençTek ekosisteminden geçmiş, mezun olmuş öğrenci. Mezun olduğunuz okulu ve yılı belirtirsiniz.",
    Ikon: GraduationCap,
  },
  {
    kod: "PAYDAS" as const,
    baslik: "Paydaş temsilcisi",
    aciklama:
      "İş birliği yapılan üniversite, kurum ya da şirketin temsilcisi. Kurumunuzun sistemde kayıtlı olması gerekir.",
    Ikon: Building2,
  },
];

export default async function BasvuruSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    tur?: string;
    il?: string;
    hata?: string;
    durum?: string;
  }>;
}) {
  const { tur, il, hata, durum } = await searchParams;

  if (durum === "alindi") {
    return (
      <KamuSayfaDuzeni
        baslik="Başvurunuz alındı"
        aciklama="Başvurunuz proje yöneticisinin onayına düştü."
        genislik="max-w-xl"
      >
        <BilgiKutusu cesit="olumlu" className="mt-6">
          <p className="flex items-start gap-2">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Başvurunuz kaydedildi. Sonuç, verdiğiniz e-posta adresine
              bildirilecek. <strong>Onaylanana kadar giriş yapamazsınız.</strong>
            </span>
          </p>
        </BilgiKutusu>
        <p className="mt-6 text-sm">
          <Link href="/" className="font-medium text-vurgu-metin">
            Açılış ekranına dön
          </Link>
        </p>
      </KamuSayfaDuzeni>
    );
  }

  const secilenTur = tur && disTuruMu(tur) ? tur : null;
  const secilenIl = il && /^\d{2}$/.test(il) ? il : null;
  const ilAdi = ILLER.find((kayit) => kayit.ilKodu === secilenIl)?.ad ?? null;

  // ---- 1. adım: tür ve il ------------------------------------------------
  if (!secilenTur || !secilenIl || !ilAdi) {
    return (
      <KamuSayfaDuzeni
        baslik="Sisteme giriş başvurusu"
        aciklama="EBA hesabı olmayan mezun ve paydaş temsilcileri için. Başvurunuz proje yöneticisi tarafından değerlendirilir."
      >
        <BilgiKutusu cesit="uyari" className="mt-6">
          Öğrenci ve öğretmenler başvuru yapmaz — kimlikleri EBA&apos;dan gelir ve{" "}
          <Link href="/giris" className="font-medium underline">
            EBA girişini
          </Link>{" "}
          kullanırlar.
        </BilgiKutusu>

        <form method="get" className="mt-8 space-y-6">
          <fieldset>
            <legend className="text-sm font-medium text-metin-yumusak">
              Hangi sıfatla başvuruyorsunuz?
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {TUR_KARTLARI.map((kart) => (
                <label
                  key={kart.kod}
                  className="flex cursor-pointer gap-3 rounded-kart border border-cizgi bg-kart p-4 transition hover:border-vurgu has-checked:border-vurgu"
                >
                  <input
                    type="radio"
                    name="tur"
                    value={kart.kod}
                    defaultChecked={secilenTur === kart.kod}
                    required
                    className="mt-1"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-medium text-metin">
                      <kart.Ikon size={16} className="text-vurgu-metin" />
                      {kart.baslik}
                    </span>
                    <span className="mt-1 block text-sm text-metin-yumusak">
                      {kart.aciklama}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block max-w-sm">
            <span className="text-sm font-medium text-metin-yumusak">
              Bulunduğunuz il
            </span>
            <select
              name="il"
              required
              defaultValue={secilenIl ?? ""}
              className={SINIF_GIRDI}
            >
              <option value="">Seçiniz</option>
              {ILLER.map((kayit) => (
                <option key={kayit.ilKodu} value={kayit.ilKodu}>
                  {kayit.ad}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Devam et
          </button>
        </form>
      </KamuSayfaDuzeni>
    );
  }

  // ---- 2. adım: asıl form ------------------------------------------------
  const mezunMu = secilenTur === "MEZUN";

  const [okullar, paydaslar, aydinlatma] = await Promise.all([
    mezunMu
      ? prisma.kurum.findMany({
          where: { ilKodu: secilenIl },
          select: { kurumKodu: true, ad: true },
          orderBy: { ad: "asc" },
        })
      : Promise.resolve([]),
    mezunMu
      ? Promise.resolve([])
      : prisma.paydas.findMany({
          where: { ilKodu: secilenIl, aktif: true },
          select: { id: true, ad: true, tur: true },
          orderBy: { ad: "asc" },
        }),
    belgeMetniGetir(belgeTanimi("AYDINLATMA")),
  ]);

  const buYil = new Date().getFullYear();

  return (
    <KamuSayfaDuzeni
      baslik={mezunMu ? "Mezun başvurusu" : "Paydaş temsilcisi başvurusu"}
      aciklama={`${ilAdi} · Başvurunuz proje yöneticisinin onayından sonra etkinleşir.`}
      geriYol="/basvuru"
      geriEtiket="Tür ve il seçimine dön"
    >
      {hata && (
        <BilgiKutusu cesit="hata" className="mt-6">
          {hata}
        </BilgiKutusu>
      )}

      {!mezunMu && paydaslar.length === 0 && (
        <BilgiKutusu cesit="uyari" className="mt-6">
          {ilAdi} ilinde kayıtlı aktif paydaş kurumu yok. Paydaş envanterini il
          koordinatörü yönetiyor: kurumunuzun eklenmesi için ilinizin GençTek
          koordinatörüne başvurun.
        </BilgiKutusu>
      )}

      <form action={basvuruEylemi} className="mt-6 space-y-8">
        <input type="hidden" name="tur" value={secilenTur} />
        <input type="hidden" name="ilKodu" value={secilenIl} />

        <Kart>
          <h2 className="mb-4 text-lg font-semibold text-baslik">
            Kimlik ve iletişim
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-metin-yumusak">Ad</span>
              <input name="ad" required maxLength={100} className={SINIF_GIRDI} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-metin-yumusak">
                Soyad
              </span>
              <input
                name="soyad"
                required
                maxLength={100}
                className={SINIF_GIRDI}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-metin-yumusak">
                E-posta adresi
              </span>
              <input
                type="email"
                name="eposta"
                required
                maxLength={150}
                autoComplete="email"
                className={SINIF_GIRDI}
              />
              <span className="mt-1 block text-xs text-metin-yumusak">
                Giriş adınız bu olacak; sonuç da buraya bildirilecek.
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-metin-yumusak">
                Telefon (isteğe bağlı)
              </span>
              <input
                name="telefon"
                maxLength={20}
                autoComplete="tel"
                className={SINIF_GIRDI}
              />
            </label>
          </div>
        </Kart>

        <Kart>
          <h2 className="mb-4 text-lg font-semibold text-baslik">
            {mezunMu ? "Mezuniyet bilgisi" : "Temsil ettiğiniz kurum"}
          </h2>

          {mezunMu ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-metin-yumusak">
                  Mezun olduğunuz okul (isteğe bağlı)
                </span>
                <select name="mezunKurumKodu" className={SINIF_GIRDI}>
                  <option value="">Listede yok / belirtmek istemiyorum</option>
                  {okullar.map((okul) => (
                    <option key={okul.kurumKodu} value={okul.kurumKodu}>
                      {okul.ad}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-metin-yumusak">
                  Yalnızca {ilAdi} ilindeki okullar listeleniyor.
                </span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-metin-yumusak">
                  Mezuniyet yılı
                </span>
                <input
                  name="mezuniyetYili"
                  required
                  inputMode="numeric"
                  pattern="\d{4}"
                  placeholder={String(buYil)}
                  className={SINIF_GIRDI}
                />
              </label>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-metin-yumusak">
                  Paydaş kurum
                </span>
                <select name="paydasId" required className={SINIF_GIRDI}>
                  <option value="">Seçiniz</option>
                  {paydaslar.map((paydas) => (
                    <option key={paydas.id} value={paydas.id}>
                      {paydas.ad} · {PAYDAS_TURU_ETIKETLERI[paydas.tur]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-metin-yumusak">
                  Kurumdaki göreviniz / unvanınız
                </span>
                <input
                  name="gorevUnvani"
                  required
                  maxLength={150}
                  className={SINIF_GIRDI}
                />
              </label>
            </div>
          )}
        </Kart>

        <Kart>
          <h2 className="mb-4 text-lg font-semibold text-baslik">
            Başvuru gerekçeniz
          </h2>
          <label className="block">
            <span className="text-sm font-medium text-metin-yumusak">
              Ekosisteme nasıl katkı vermek istiyorsunuz?
            </span>
            <textarea
              name="beyan"
              required
              rows={5}
              maxLength={2000}
              className={SINIF_GIRDI}
            />
            <span className="mt-1 block text-xs text-metin-yumusak">
              Başvurunuz bu açıklamaya bakılarak değerlendirilecek; birkaç cümle
              yazın.
            </span>
          </label>
        </Kart>

        <Kart>
          <h2 className="mb-4 text-lg font-semibold text-baslik">Şifreniz</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-metin-yumusak">
                Şifre
              </span>
              <input
                type="password"
                name="sifre"
                required
                minLength={SIFRE_ALT_SINIRI}
                autoComplete="new-password"
                className={SINIF_GIRDI}
              />
              <span className="mt-1 block text-xs text-metin-yumusak">
                En az {SIFRE_ALT_SINIRI} karakter. Adınızı, soyadınızı ya da
                e-posta adresinizi içeremez.
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-metin-yumusak">
                Şifre (tekrar)
              </span>
              <input
                type="password"
                name="sifreTekrar"
                required
                minLength={SIFRE_ALT_SINIRI}
                autoComplete="new-password"
                className={SINIF_GIRDI}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-metin-yumusak">
            Şifreniz yalnızca onaylandıktan sonra işe yarar; onay öncesi giriş
            yapılamaz.
          </p>
        </Kart>

        <Kart>
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-baslik">
            <ShieldCheck size={18} className="text-vurgu-metin" />
            KVKK aydınlatma metni
          </h2>
          <p className="text-sm text-metin-yumusak">
            Başvurunuzla birlikte kişisel verileriniz işlenmeye başlar. Metni
            okumadan başvuru alınmaz.
          </p>
          <details className="mt-4 rounded-kart border border-cizgi bg-zemin p-4">
            <summary className="cursor-pointer text-sm font-medium text-vurgu-metin">
              Aydınlatma metnini oku
            </summary>
            <pre className="mt-3 max-h-80 overflow-y-auto text-sm whitespace-pre-wrap text-metin">
              {aydinlatma.metin}
            </pre>
          </details>
          <label className="mt-4 flex gap-2 text-sm text-metin">
            <input
              type="checkbox"
              name="aydinlatmaOnayi"
              value="evet"
              required
              className="mt-0.5"
            />
            <span>Aydınlatma metnini okudum ve anladım.</span>
          </label>
        </Kart>

        <button type="submit" className={SINIF_BIRINCIL_BUTON}>
          <Send size={16} aria-hidden />
          Başvuruyu gönder
        </button>
      </form>
    </KamuSayfaDuzeni>
  );
}
