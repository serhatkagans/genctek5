import { Info, LogIn, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TemaSecici } from "@/components/TemaSecici";
import { oturumKullanicisi } from "@/lib/auth/oturum";
import { ortam, uygulamaYolu } from "@/lib/ortam";
import { aktifTema } from "@/lib/tema";

/**
 * Açılış ekranı — sistemin kapısı.
 *
 * İKİ GİRİŞ YOLU VARDIR ve ikisi eşit değildir:
 *   1. EBA ile giriş — öğrenci ve öğretmenlerin TEK yolu. Kimlik EBA'dan
 *      gelir, şifre diye bir kavram yoktur ve olmayacaktır.
 *   2. E-Devlet ile Giriş (mezun, paydaş, mentör) — EBA hesabı olmayanlar için,
 *      bugün e-posta ve
 *      şifreyle. Kendiliğinden kayıt DEĞİLDİR: başvuru proje yöneticisinin
 *      onayından geçmeden hesap açılmaz.
 *
 * İkincisi ekranda bilinçli olarak ikincil ağırlıkta duruyor: kullanıcıların
 * ezici çoğunluğu birinci yoldan girer ve iki eşit düğme, öğrenciyi yanlış
 * kapıya yönlendirirdi.
 *
 * EBA SSO erişimi henüz sağlanmadığı için birinci düğme şimdilik geliştirme
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
    /*
     * Oturumu açık kullanıcı kapıda bekletilmez. Hedef PROFİLDİR, panel değil
     * (7 Ağustos 2026 · istek: "tüm kullanıcı grupları için ilk açılınca
     * profil sekmesi ile başlasın"); giriş eylemiyle aynı yere düşmeli, yoksa
     * aynı kişi nereden geldiğine göre farklı ekran görürdü.
     */
    redirect("/panel/profil");
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
          {/*
            Logo BEYAZ bir kutunun içinde: açılış ekranının zemini kurumsal
            kırmızı ve logonun kendisi de kırmızı — doğrudan konsaydı zeminde
            kaybolurdu.

            next/image KULLANILMIYOR: dosya public dizininde ve boyutu sabit;
            optimizasyon katmanı burada bir şey kazandırmıyor. Yol
            uygulamaYolu()'ndan geçiyor çünkü uygulama alt dizine kurulu
            (/genctek) ve ham src öneki kendiliğinden almaz.
          */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2.5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={uygulamaYolu("/genc.png")}
              alt="GençTek"
              className="h-full w-full object-contain"
            />
          </div>

          <h1 className="mb-1 text-2xl font-semibold text-ust-bar-metin">
            GençTek
          </h1>
          <p className="mb-8 text-sm text-ust-bar-metin-yumusak">
            Genç Bilişim Ekosistemi
          </p>

          <Link
            href="/giris"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ust-bar-secili-zemin py-3 text-sm font-medium text-ust-bar-secili-metin transition hover:opacity-90"
          >
            <LogIn size={16} aria-hidden />
            EBA ile Giriş Yap
          </Link>

          <p className="mt-4 text-xs text-ust-bar-metin-yumusak">
            Öğrenci ve öğretmen kimlik bilgileri EBA üzerinden alınır.
          </p>

          {/*
            "E-DEVLET İLE GİRİŞ" (7 Ağustos 2026 · istek).
            Düğmenin adı e-Devlet, gittiği yer bugün e-posta/şifre ekranı.

            GERÇEK E-DEVLET ENTEGRASYONU HENÜZ YOK ve yazılamaz: e-Devlet
            Kapısı kurum başvurusu, test ortamı erişimi ve istemci sertifikası
            gerektiriyor — hiçbiri elimizde değil. EBA SSO da aynı sebeple
            bekliyor (SKILL.md · adım 13).

            Düğmenin adının şimdiden e-Devlet olması BİLİNÇLİ: kullanıcıya
            gösterilecek kapı bu ve entegrasyon geldiğinde değişecek tek yer
            `AuthProvider` uygulaması olacak — bu ekran değil.
          */}
          <div className="mt-6 border-t border-ust-bar-cizgi pt-6">
            <Link
              href="/dis-giris"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-ust-bar-cizgi py-2.5 text-sm font-medium text-ust-bar-metin transition hover:bg-ust-bar-cizgi/30"
            >
              <Users size={16} aria-hidden />
              E-Devlet ile Giriş
            </Link>
            <p className="mt-2 text-xs text-ust-bar-metin-yumusak">
              Mezun öğrenci/Paydaş/Mentör girişleri için tıklayınız.
            </p>
            {/*
              BAŞVURU SATIRI KALKTI (10 Ağustos 2026 · istek). Açılış ekranı
              artık yalnızca iki kapı gösteriyor; "hesabınız yoksa başvurun"
              açıklaması kapının önünde değil, ARKASINDA duruyor.

              AKIŞ SİLİNMEDİ: /basvuru sayfası ve onay süreci yerinde,
              girişin altındaki "Hesabım yok, başvuru yapmak istiyorum"
              bağlantısıyla ulaşılıyor (bkz. app/dis-giris/page.tsx). Adres
              doğrudan da açılıyor — gönderilmiş bağlantılar kırılmadı.
            */}
          </div>

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
