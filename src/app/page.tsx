import { Info, LogIn, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TemaSecici } from "@/components/TemaSecici";
import { oturumKullanicisi } from "@/lib/auth/oturum";
import { ortam } from "@/lib/ortam";
import { aktifTema } from "@/lib/tema";

/**
 * Açılış ekranı — sistemin kapısı.
 *
 * Tek bir iş yapar: kullanıcıyı EBA ile girişe yönlendirir. Dış kayıt, şifre ya
 * da parola sıfırlama akışı YOKTUR ve olmayacaktır; kimlik EBA'dan gelir.
 *
 * EBA SSO erişimi henüz sağlanmadığı için düğme şimdilik geliştirme
 * senaryolarının bulunduğu /giris ekranına götürür. Erişim geldiğinde burada
 * değişecek tek şey düğmenin hedefidir — ekranın kendisi aynı kalır.
 */

export const dynamic = "force-dynamic";

export default async function AcilisSayfasi() {
  const [kullanici, tema] = await Promise.all([
    oturumKullanicisi(),
    aktifTema(),
  ]);

  // Oturumu açık olan kapıda bekletilmez.
  if (kullanici) {
    redirect("/panel");
  }

  const mockMu = ortam.AUTH_PROVIDER === "mock";

  return (
    <div className="flex min-h-screen flex-col bg-ust-bar">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <p className="text-[11px] font-semibold tracking-widest text-ust-bar-metin-yumusak uppercase">
          MEB · YEĞİTEK
        </p>
        <TemaSecici aktif={tema} />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-ust-bar-secili-zemin">
            <Sparkles size={26} className="text-ust-bar-secili-metin" aria-hidden />
          </div>

          <h1 className="mb-1 text-2xl font-semibold text-ust-bar-metin">
            GençTek
          </h1>
          <p className="mb-8 text-sm text-ust-bar-metin-yumusak">
            Ekosistem Kurumsal Bilgi Sistemi
          </p>

          <Link
            href="/giris"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ust-bar-secili-zemin py-3 text-sm font-medium text-ust-bar-secili-metin transition hover:opacity-90"
          >
            <LogIn size={16} aria-hidden />
            EBA ile Giriş Yap
          </Link>

          <p className="mt-4 text-xs text-ust-bar-metin-yumusak">
            Dış kayıt yoktur. Kimlik bilgileri EBA üzerinden alınır.
          </p>

          {mockMu && (
            <div className="mt-10 rounded-xl border border-ust-bar-cizgi bg-ust-bar-cizgi/25 p-4 text-left">
              <p className="text-xs text-ust-bar-metin-yumusak">
                <Info size={12} className="mr-1 mb-0.5 inline" aria-hidden />
                EBA SSO erişimi henüz sağlanmadı. Bu düğme sizi geliştirme
                senaryolarının bulunduğu giriş ekranına götürür; yetki ve kapsam
                kuralları orada da gerçek kurallarla çalışır.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-6 text-center text-xs text-ust-bar-metin-yumusak">
        T.C. Millî Eğitim Bakanlığı · Yenilik ve Eğitim Teknolojileri Genel
        Müdürlüğü
      </footer>
    </div>
  );
}
