import { KeyRound, MailCheck } from "lucide-react";
import Link from "next/link";
import { KamuSayfaDuzeni } from "@/components/KamuSayfaDuzeni";
import { BilgiKutusu, SINIF_BIRINCIL_BUTON, SINIF_GIRDI } from "@/components/ui";
import {
  SIFIRLAMA_GECERLILIK_DAKIKA,
  SIFRE_ALT_SINIRI,
} from "@/lib/dis-kimlik/kurallar";
import {
  sifirlamaIsteEylemi,
  sifirlamaTamamlaEylemi,
} from "./eylemler";

/**
 * Parola sıfırlama — yalnızca mezun ve paydaş temsilcileri için.
 *
 * EBA/mock kimlikli kullanıcıların şifresi yoktur; bu ekran onlara hiçbir şey
 * söylemez ve söylememeli. Ekranın kendisi de "bu adres kayıtlı mı" sorusunu
 * cevaplamaz: jeton istenen her durumda aynı sonuç gösterilir.
 */

export const dynamic = "force-dynamic";

export default async function SifreSifirlamaSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    e?: string;
    jeton?: string;
    hata?: string;
    durum?: string;
  }>;
}) {
  const { e, jeton, hata, durum } = await searchParams;

  if (durum === "gonderildi") {
    return (
      <KamuSayfaDuzeni
        baslik="Sıfırlama bağlantısı gönderildi"
        geriYol="/dis-giris"
        geriEtiket="Giriş ekranı"
        genislik="max-w-xl"
      >
        <BilgiKutusu cesit="olumlu" className="mt-6">
          <p className="flex items-start gap-2">
            <MailCheck size={18} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Adres sistemde kayıtlıysa şifre sıfırlama bağlantısı gönderildi.
              Bağlantı {SIFIRLAMA_GECERLILIK_DAKIKA} dakika geçerlidir ve bir kez
              kullanılabilir.
            </span>
          </p>
        </BilgiKutusu>
        <p className="mt-6 text-sm">
          <Link href="/dis-giris" className="font-medium text-vurgu-metin">
            Giriş ekranına dön
          </Link>
        </p>
      </KamuSayfaDuzeni>
    );
  }

  // ---- Jetonlu adım: yeni şifre ------------------------------------------
  if (jeton && e) {
    return (
      <KamuSayfaDuzeni
        baslik="Yeni şifrenizi belirleyin"
        aciklama={e}
        geriYol="/dis-giris"
        geriEtiket="Giriş ekranı"
        genislik="max-w-xl"
      >
        {hata && (
          <BilgiKutusu cesit="hata" className="mt-6">
            {hata}
          </BilgiKutusu>
        )}

        <form action={sifirlamaTamamlaEylemi} className="mt-6 space-y-4">
          <input type="hidden" name="eposta" value={e} />
          <input type="hidden" name="jeton" value={jeton} />

          <label className="block">
            <span className="text-sm font-medium text-metin-yumusak">
              Yeni şifre
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
              Yeni şifre (tekrar)
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

          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            <KeyRound size={16} aria-hidden />
            Şifreyi güncelle
          </button>
        </form>
      </KamuSayfaDuzeni>
    );
  }

  // ---- İlk adım: e-posta -------------------------------------------------
  return (
    <KamuSayfaDuzeni
      baslik="Şifre sıfırlama"
      aciklama="Mezun ve paydaş temsilcisi hesapları içindir."
      geriYol="/dis-giris"
      geriEtiket="Giriş ekranı"
      genislik="max-w-xl"
    >
      {hata && (
        <BilgiKutusu cesit="hata" className="mt-6">
          {hata}
        </BilgiKutusu>
      )}

      <BilgiKutusu cesit="uyari" className="mt-6">
        Öğrenci ve öğretmen hesaplarının şifresi yoktur; onların kimliği EBA&apos;dan
        gelir. Bu ekran yalnızca başvuruyla açılmış hesaplar içindir.
      </BilgiKutusu>

      <form action={sifirlamaIsteEylemi} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-metin-yumusak">
            E-posta adresiniz
          </span>
          <input
            type="email"
            name="eposta"
            required
            autoComplete="email"
            className={SINIF_GIRDI}
          />
        </label>

        <button type="submit" className={SINIF_BIRINCIL_BUTON}>
          Sıfırlama bağlantısı gönder
        </button>
      </form>
    </KamuSayfaDuzeni>
  );
}
