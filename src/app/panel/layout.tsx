import { LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cikisEylemi } from "@/app/giris/eylemler";
import {
  PanelGezinme,
  type GezinmeBaglantisi,
} from "@/components/PanelGezinme";
import { RolEtiketi, RolsuzEtiketi } from "@/components/RolEtiketi";
import { TemaSecici } from "@/components/TemaSecici";
import { oturumKullanicisi } from "@/lib/auth/oturum";
import { aydinlatmaOnayDurumu } from "@/lib/kvkk/durum";
import { taahhutDurumu } from "@/lib/kvkk/taahhut";
import { aktifTema } from "@/lib/tema";
import {
  danismanMi,
  ilKoordinatoruMu,
  ogrenciMi,
  projeYoneticisiMi,
  rolEnvanteriGorebilirMi,
} from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

export default async function PanelDuzeni({
  children,
}: {
  children: React.ReactNode;
}) {
  const [kullanici, tema] = await Promise.all([
    oturumKullanicisi(),
    aktifTema(),
  ]);
  if (!kullanici) {
    redirect("/giris");
  }

  /*
   * Aydınlatma metni onayı ekranları KİLİTLEMEZ: KVKK'nın istediği şey
   * bilgilendirmedir, kullanımın engellenmesi değil. Onaylamamış öğrenciye her
   * sayfada görünen kalıcı bir şerit gösterilir.
   */
  const kvkkOnayi = await aydinlatmaOnayDurumu(kullanici);
  /*
   * Koordinatör taahhüdü: aydınlatma metniyle aynı desende bir şerit. İkisi
   * aynı anda çıkabilir ve bu doğrudur — biri kişinin kendi verisi hakkında,
   * öbürü BAŞKASININ verisiyle nasıl davranacağı hakkında.
   */
  const taahhut = await taahhutDurumu(kullanici);

  const baglantilar: GezinmeBaglantisi[] = [
    { yol: "/panel", etiket: "Panelim" },
    { yol: "/panel/profil", etiket: "Profilim" },
  ];

  if (ogrenciMi(kullanici)) {
    baglantilar.push(
      { yol: "/panel/calisma-gruplari", etiket: "Çalışma Gruplarım" },
      { yol: "/panel/danisman-secim", etiket: "Danışmanım" },
    );
  }

  /*
   * Katkılarım ekranı iki role de açıktır ve aynı adreste ikisine farklı
   * kartlar basar (öğrencide temsilcilik/çalışma grubu, öğretmende görev
   * geçmişi/danışmanlık). Proje yöneticisi dışarıdadır: YEĞİTEK personelinin
   * ne danışmanlığı ne de katılımcılığı olur, ekran ona sürekli boş görünürdü.
   */
  if (!projeYoneticisiMi(kullanici)) {
    baglantilar.push({ yol: "/panel/kazanimlarim", etiket: "Katkılarım" });
  }

  // Faaliyetler herkese açıktır; kimin ne göreceğini kapsam filtresi belirler.
  // Görev almamış öğretmen de okulunun ve ulusal faaliyetleri görür.
  baglantilar.push({ yol: "/panel/faaliyetler", etiket: "Faaliyetler" });

  if (
    danismanMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    projeYoneticisiMi(kullanici)
  ) {
    baglantilar.push(
      { yol: "/panel/ogrenciler", etiket: "Öğrenciler" },
      // Öğretmen envanteri öğrenciyle aynı kapıdan geçmez ama aynı kişilere
      // açıktır; kapsamı ogretmenKapsamFiltresi belirler.
      { yol: "/panel/ogretmenler", etiket: "Öğretmenler" },
      // İl bazlı paydaş envanteri: danışman öğretmen görür, kayıt açmayı
      // ilin koordinatörü yapar.
      { yol: "/panel/paydaslar", etiket: "Paydaşlar" },
      // Görev rolü atama: il koordinatörü kendi ilinde İl Temsilcisi, danışman
      // öğretmen kendi okulunda Okul Temsilcisi belirler.
      { yol: "/panel/gorev-rolleri", etiket: "Görev Rolleri" },
    );
  }

  /*
   * İl dışına giden başvurular: koordinatör kendi ilinden başka bir ilin
   * etkinliğine yapılan başvuruları onaylar. Danışman öğretmene GÖSTERİLMEZ —
   * karar ilin, okulun değil.
   */
  if (ilKoordinatoruMu(kullanici) || projeYoneticisiMi(kullanici)) {
    baglantilar.push({
      yol: "/panel/il-disi-basvurular",
      etiket: "İl Dışı Başvurular",
    });
  }

  // Rol/atama envanteri toplu bir yönetim görünümüdür; tekil profil erişiminden
  // ayrı bir yetkidir ve yalnızca proje yöneticisine açıktır.
  if (rolEnvanteriGorebilirMi(kullanici)) {
    baglantilar.push(
      { yol: "/panel/rol-envanteri", etiket: "Rol/Atama Envanteri" },
      // Erişim kayıtları KVKK denetiminin dayanağıdır; yalnızca merkez okur.
      { yol: "/panel/erisim-loglari", etiket: "Erişim Kayıtları" },
      // Toplu duyuru, bildirim şablonlarıyla aynı sorumluluk düzeyinde:
      // ikisi de tüm kullanıcılara giden metni belirler.
      { yol: "/panel/duyurular", etiket: "Duyurular" },
      { yol: "/panel/ayarlar", etiket: "Yönetim" },
    );
  }

  // Taahhütname yalnızca koordinatörde anlamlı; menüde de yalnızca ona çıkar.
  if (ilKoordinatoruMu(kullanici)) {
    baglantilar.push({ yol: "/panel/taahhut", etiket: "Taahhütname" });
  }

  baglantilar.push({ yol: "/panel/kvkk", etiket: "KVKK" });

  return (
    <div className="min-h-screen">
      <header className="border-b border-ust-bar-cizgi bg-ust-bar">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-ust-bar-metin-yumusak uppercase">
              MEB · YEĞİTEK
            </p>
            <p className="text-lg font-bold text-ust-bar-metin">GençTek</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <TemaSecici aktif={tema} />
            <div className="text-right">
              <p className="font-medium text-ust-bar-metin">
                {kullanici.ad} {kullanici.soyad}
              </p>
              <div className="mt-1 flex flex-wrap justify-end gap-1">
                {kullanici.roller.length === 0 ? (
                  <RolsuzEtiketi />
                ) : (
                  kullanici.roller.map((rol) => (
                    <RolEtiketi
                      key={rol.rolKodu}
                      rolKodu={rol.rolKodu}
                      ekBilgi={rol.ilKodu}
                    />
                  ))
                )}
              </div>
            </div>
            <form action={cikisEylemi}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md border border-ust-bar-cizgi px-3 py-1.5 text-sm font-medium text-ust-bar-metin-yumusak transition hover:text-ust-bar-metin"
              >
                <LogOut size={15} aria-hidden />
                Çıkış
              </button>
            </form>
          </div>
        </div>
        <PanelGezinme baglantilar={baglantilar} />
      </header>

      {kvkkOnayi.gerekiyorMu && (
        <div className="border-b border-uyari-cizgi bg-uyari-zemin">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-6 py-2.5 text-sm text-uyari-metin">
            <ShieldAlert size={16} className="shrink-0" aria-hidden />
            <span>
              {kvkkOnayi.onayTarihi
                ? "Aydınlatma metni güncellendi; güncel metni okuyup yeniden onaylamanız gerekiyor."
                : "Kişisel verilerinizin nasıl işlendiğini anlatan aydınlatma metnini henüz okumadınız."}
            </span>
            <Link
              href="/panel/kvkk"
              className="font-semibold underline underline-offset-2"
            >
              Metni aç
            </Link>
          </div>
        </div>
      )}

      {taahhut.gerekiyorMu && (
        <div className="border-b border-uyari-cizgi bg-uyari-zemin">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-6 py-2.5 text-sm text-uyari-metin">
            <ShieldAlert size={16} className="shrink-0" aria-hidden />
            <span>
              {taahhut.onayTarihi
                ? "Gizlilik taahhütnamesi güncellendi; güncel metni okuyup yeniden onaylamanız gerekiyor."
                : "İlinizdeki öğretmen ve öğrenci verilerine erişebiliyorsunuz. Gizlilik taahhütnamesini henüz onaylamadınız."}
            </span>
            <Link
              href="/panel/taahhut"
              className="font-semibold underline underline-offset-2"
            >
              Taahhütnameyi aç
            </Link>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
