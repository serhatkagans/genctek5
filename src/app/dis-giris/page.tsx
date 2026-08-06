import { KeyRound, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { KamuSayfaDuzeni } from "@/components/KamuSayfaDuzeni";
import { BilgiKutusu, SINIF_BIRINCIL_BUTON, SINIF_GIRDI } from "@/components/ui";
import { disGirisEylemi } from "./eylemler";

/**
 * Mezun ve paydaş temsilcisi girişi.
 *
 * EBA girişinden AYRI BİR EKRANDIR ve bu bilinçli: EBA tarafında şifre diye
 * bir kavram yok, hiç olmayacak. İki akışı tek forma sıkıştırmak, EBA
 * entegrasyonu geldiğinde sökülmesi gereken bir "şifreniz varsa buraya"
 * karmaşası bırakırdı.
 */

export const dynamic = "force-dynamic";

export default async function DisGirisSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; bilgi?: string; eposta?: string }>;
}) {
  const { hata, bilgi, eposta } = await searchParams;

  return (
    <KamuSayfaDuzeni
      baslik="Mezun ve paydaş girişi"
      aciklama="EBA hesabı olmayan mezun ve paydaş temsilcileri buradan giriş yapar."
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

      <form action={disGirisEylemi} className="mt-6 space-y-4">
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
