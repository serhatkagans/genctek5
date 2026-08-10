import {
  Award,
  Building2,
  GraduationCap,
  Info,
  KeyRound,
  LogIn,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { KamuSayfaDuzeni } from "@/components/KamuSayfaDuzeni";
import {
  BilgiKutusu,
  KatlanabilirKart,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import {
  type MockDisKimlik,
  type MockDisKimlikTuru,
  mockDisGirisAcikMi,
  mockDisKimlikleriGetir,
} from "@/lib/dis-kimlik/mock-giris";
import { disGirisEylemi, mockDisGirisEylemi } from "./eylemler";

/**
 * Mezun, paydaş ve mentör girişi ("E-Devlet ile Giriş" düğmesinin gittiği yer).
 *
 * EBA girişinden AYRI BİR EKRANDIR ve bu bilinçli: EBA tarafında şifre diye
 * bir kavram yok, hiç olmayacak. İki akışı tek forma sıkıştırmak, EBA
 * entegrasyonu geldiğinde sökülmesi gereken bir "şifreniz varsa buraya"
 * karmaşası bırakırdı.
 *
 * GELİŞTİRME KİPİNDE KİMLİK SEÇİLİR (10 Ağustos 2026 · istek: "e-Devlet girişi
 * de EBA girişi gibi mezun/paydaş/mentör listesi olsun; SSO'yu en son
 * bağlarız"). Liste `AUTH_PROVIDER="mock"` iken çıkar, üretimde hiç
 * basılmaz — bkz. lib/dis-kimlik/mock-giris.ts.
 *
 * ŞİFRELİ GİRİŞ KALDIRILMADI, ikinci plana alındı: gerçek kullanıcıların
 * bugünkü tek yolu o ve birim testleri onu ölçüyor. Kimlik seçimi SSO
 * bağlandığında silinecek olan taraf; şifreli giriş kalacak olan.
 */

export const dynamic = "force-dynamic";

const TUR_BASLIKLARI: Record<
  MockDisKimlikTuru,
  { baslik: string; aciklama: string; Ikon: typeof GraduationCap }
> = {
  MEZUN: {
    baslik: "Mezun",
    aciklama:
      "Öğrenci ve öğretmen kişisel verisine erişmez; etkinlik takvimini ve talep panosunu görür.",
    Ikon: GraduationCap,
  },
  PAYDAS: {
    baslik: "Paydaş temsilcisi",
    aciklama:
      "Temsil ettiği kurum envanterdeki paydaş kaydına bağlıdır; yetkisi mezunla aynıdır.",
    Ikon: Building2,
  },
  MENTOR: {
    baslik: "Mentör",
    aciklama:
      "Mentörlük ayrı bir rol değildir: yetki paydaş temsilcisiyle aynı, mentörlük kaydı ayrıdır.",
    Ikon: Award,
  },
};

const TUR_SIRASI: MockDisKimlikTuru[] = ["MEZUN", "PAYDAS", "MENTOR"];

function KimlikKarti({ kimlik }: { kimlik: MockDisKimlik }) {
  return (
    <form action={mockDisGirisEylemi}>
      <input
        type="hidden"
        name="kimlikBilgisi"
        value={kimlik.authProviderId}
      />
      <button
        type="submit"
        className="group flex w-full items-center justify-between gap-3 rounded-kart border border-cizgi bg-kart px-4 py-3 text-left transition hover:border-vurgu"
      >
        <span>
          <span className="block font-medium text-metin">{kimlik.adSoyad}</span>
          <span className="block text-sm text-metin-yumusak">
            {kimlik.altBilgi}
          </span>
          <span className="block text-xs text-metin-yumusak">
            {kimlik.eposta}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-vurgu-metin opacity-0 transition group-hover:opacity-100">
          Giriş yap
          <LogIn size={15} aria-hidden />
        </span>
      </button>
    </form>
  );
}

export default async function DisGirisSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; bilgi?: string; eposta?: string }>;
}) {
  const { hata, bilgi, eposta } = await searchParams;
  const kimlikSecimi = mockDisGirisAcikMi();
  const kimlikler = await mockDisKimlikleriGetir();

  const sifreFormu = (
    <form action={disGirisEylemi} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-metin-yumusak">
          E-posta adresi
        </span>
        <input
          type="email"
          name="eposta"
          required
          autoComplete="email"
          defaultValue={eposta ?? ""}
          className={SINIF_GIRDI}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-metin-yumusak">Şifre</span>
        <input
          type="password"
          name="sifre"
          required
          autoComplete="current-password"
          className={SINIF_GIRDI}
        />
      </label>

      <button type="submit" className={SINIF_BIRINCIL_BUTON}>
        <LogIn size={16} aria-hidden />
        Giriş yap
      </button>
    </form>
  );

  return (
    <KamuSayfaDuzeni
      baslik="Mezun, paydaş ve mentör girişi"
      aciklama="EBA hesabı olmayan mezun öğrenciler, paydaş temsilcileri ve mentörler buradan giriş yapar."
      genislik="max-w-xl"
    >
      {hata && (
        <BilgiKutusu cesit="hata" className="mt-6">
          {hata}
        </BilgiKutusu>
      )}

      {bilgi && (
        <BilgiKutusu cesit="olumlu" className="mt-6">
          {bilgi}
        </BilgiKutusu>
      )}

      {kimlikSecimi ? (
        <>
          <div className="mt-6 flex gap-3 rounded-kart border border-uyari-cizgi bg-uyari-zemin px-4 py-3 text-sm text-uyari-metin">
            <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
            <p>
              <strong className="font-semibold">Geliştirme kipi.</strong>{" "}
              E-Devlet bağlantısı henüz sağlanmadığı için giriş, aşağıdaki
              kimliklerden biri seçilerek yapılır. Yetki ve kapsam kuralları
              gerçek kurallarla çalışır: seçilen kişi yalnızca kendi
              kapsamındaki veriyi görür.
            </p>
          </div>

          {kimlikler.length === 0 ? (
            <div className="mt-8 rounded-kart border border-cizgi bg-kart px-4 py-6 text-metin-yumusak">
              Seçilebilecek mezun, paydaş ya da mentör kaydı yok. Örnek kayıtlar{" "}
              <code className="rounded bg-zemin px-1.5 py-0.5 text-sm">
                npm run veri:dis-kullanici
              </code>{" "}
              ile oluşturulur; gerçek kayıtlar başvurunun onaylanmasıyla doğar.
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              {TUR_SIRASI.map((tur) => {
                const grup = kimlikler.filter((kimlik) => kimlik.tur === tur);
                if (grup.length === 0) return null;
                const { baslik, aciklama, Ikon } = TUR_BASLIKLARI[tur];

                return (
                  <section key={tur}>
                    <h2 className="flex flex-wrap items-center gap-2 font-semibold text-baslik">
                      <Ikon size={17} className="text-vurgu-metin" />
                      {baslik}
                      <span className="rounded-full bg-vurgu-zemin px-2 py-0.5 text-xs font-medium text-vurgu-metin">
                        {grup.length}
                      </span>
                    </h2>
                    <p className="mt-1 mb-3 text-sm text-metin-yumusak">
                      {aciklama}
                    </p>
                    <div className="space-y-2">
                      {grup.map((kimlik) => (
                        <KimlikKarti
                          key={kimlik.authProviderId}
                          kimlik={kimlik}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <div className="mt-8">
            <KatlanabilirKart
              baslik="E-posta ve şifreyle giriş"
              aciklama="Gerçek kullanıcıların yolu; şifresini bilen buradan girer."
              Ikon={KeyRound}
            >
              {sifreFormu}
            </KatlanabilirKart>
          </div>
        </>
      ) : (
        <div className="mt-6">{sifreFormu}</div>
      )}

      <div className="mt-8 space-y-3 border-t border-cizgi pt-6 text-sm">
        <p>
          <Link
            href="/sifre-sifirlama"
            className="inline-flex items-center gap-1.5 font-medium text-vurgu-metin"
          >
            <KeyRound size={15} aria-hidden />
            Şifremi unuttum
          </Link>
        </p>
        <p>
          <Link
            href="/basvuru"
            className="inline-flex items-center gap-1.5 font-medium text-vurgu-metin"
          >
            <UserPlus size={15} aria-hidden />
            Hesabım yok, başvuru yapmak istiyorum
          </Link>
        </p>
        <p className="text-metin-yumusak">
          Öğrenci ve öğretmenler bu ekrandan giriş yapmaz;{" "}
          <Link href="/giris" className="font-medium text-vurgu-metin">
            EBA girişini
          </Link>{" "}
          kullanır.
        </p>
      </div>
    </KamuSayfaDuzeni>
  );
}
