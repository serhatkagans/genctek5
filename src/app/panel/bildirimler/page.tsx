import {
  ArrowRight,
  BellRing,
  ChevronLeft,
  ChevronRight,
  MailOpen,
} from "lucide-react";
import Link from "next/link";
import { Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { ayarSayi } from "@/lib/ayar";
import { bildirimBaglantisi } from "@/lib/bildirim/hedef";
import { prisma } from "@/lib/db";
import {
  AYAR_BILDIRIM_SAKLAMA_AYI,
  VARSAYILAN_BILDIRIM_SAKLAMA_AYI,
} from "@/lib/kvkk/kurallar";
import { tarihSaatYaz } from "@/lib/tarih";
import { bildirimOkunduEylemi, tumBildirimleriOkuEylemi } from "../eylemler";

export const dynamic = "force-dynamic";

/**
 * Bildirim arşivi (12 Ağustos 2026).
 *
 * İSTEK: "Duyuru geliyor, uyarı görünüyor; okundu tıklandıktan sonra artık yok.
 * Bir yerlerde olsun — eski duyurulara nereden ulaşılabilir?"
 *
 * Panelim'deki bölüm yalnızca OKUNMAMIŞ bildirimleri listeliyor ve bu bilinçli:
 * orası bir yapılacak listesi, okunan satır oradan düşmeli. Ama okunan bildirim
 * hiçbir yerde görünmediği için "okundu" düğmesi fiilen "sil" gibi çalışıyordu —
 * kullanıcı bir daha bakamıyordu. Bu ekran o eksiği kapatıyor: aynı kayıtlar,
 * okunmuşuyla birlikte.
 *
 * YENİ BİR VERİ KAYNAĞI DEĞİL: aynı `bildirim` tablosu, aynı okundu eylemi,
 * aynı hedef bağlantısı (bkz. lib/bildirim/hedef.ts). Ayrı bir "duyuru" kavramı
 * açılmadı — kullanıcının duyuru dediği şey zaten bildirimin kendisi.
 *
 * KENDİ BİLDİRİMİ, BAŞKASININKİ DEĞİL: sorgu `kullaniciId` ile kurulur, yani
 * ayrı bir yetki kapısı yok — herkesin kendi kaydı. Menüde sekmesi yoktur;
 * girişi Panelim'deki bölüm başlığındaki bağlantıdır (sekme sayısı bilinçli
 * olarak dar tutuluyor, bkz. app/panel/layout.tsx).
 */

const SAYFA_BOYUTU = 30;

type Suzgec = "tumu" | "okunmamis" | "okunmus";

function suzgecCoz(deger: string | undefined): Suzgec {
  return deger === "okunmamis" || deger === "okunmus" ? deger : "tumu";
}

const SUZGEC_ETIKETLERI: Record<Suzgec, string> = {
  tumu: "Tümü",
  okunmamis: "Okunmamış",
  okunmus: "Okunmuş",
};

function yol(suzgec: Suzgec, sayfa: number): string {
  const sorgu = new URLSearchParams();
  if (suzgec !== "tumu") sorgu.set("durum", suzgec);
  if (sayfa > 1) sorgu.set("sayfa", String(sayfa));
  const metin = sorgu.toString();
  return metin ? `/panel/bildirimler?${metin}` : "/panel/bildirimler";
}

export default async function BildirimlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; sayfa?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum, sayfa: istenenSayfa } = await searchParams;

  const suzgec = suzgecCoz(durum);
  const nerede = {
    kullaniciId: kullanici.id,
    ...(suzgec === "tumu" ? {} : { okunduMu: suzgec === "okunmus" }),
  };

  const [toplam, okunmamisSayisi, saklamaAyi] = await Promise.all([
    prisma.bildirim.count({ where: nerede }),
    prisma.bildirim.count({
      where: { kullaniciId: kullanici.id, okunduMu: false },
    }),
    ayarSayi(AYAR_BILDIRIM_SAKLAMA_AYI, VARSAYILAN_BILDIRIM_SAKLAMA_AYI),
  ]);

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYUTU));
  const sayfa = Math.min(
    Math.max(1, Number.parseInt(istenenSayfa ?? "1", 10) || 1),
    sonSayfa,
  );

  const bildirimler = await prisma.bildirim.findMany({
    where: nerede,
    orderBy: { olusturmaTarihi: "desc" },
    skip: (sayfa - 1) * SAYFA_BOYUTU,
    take: SAYFA_BOYUTU,
    select: {
      id: true,
      baslik: true,
      icerik: true,
      okunduMu: true,
      olusturmaTarihi: true,
      hedefTip: true,
      hedefId: true,
    },
  });

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Bildirimler"
        aciklama={
          sonSayfa > 1
            ? `${toplam} kayıt · sayfa ${sayfa}/${sonSayfa} · ${okunmamisSayisi} okunmamış`
            : `${toplam} kayıt · ${okunmamisSayisi} okunmamış`
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/*
          SÜZGEÇ ÜÇ HÂLLİ: varsayılan "Tümü", çünkü bu ekranın var oluş sebebi
          okunmuşları görebilmek. Varsayılan "Okunmamış" olsaydı ekran Panelim'in
          kopyası olur ve kullanıcı aradığı eski duyuruyu yine bulamazdı.
        */}
        <nav aria-label="Süzgeç" className="flex flex-wrap gap-2">
          {(["tumu", "okunmamis", "okunmus"] as const).map((secenek) => (
            <Link
              key={secenek}
              href={yol(secenek, 1)}
              aria-current={suzgec === secenek ? "page" : undefined}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                suzgec === secenek
                  ? "border-vurgu bg-vurgu-zemin text-vurgu-metin"
                  : "border-cizgi text-metin hover:bg-zemin"
              }`}
            >
              {SUZGEC_ETIKETLERI[secenek]}
            </Link>
          ))}
        </nav>

        {okunmamisSayisi > 0 && (
          <form action={tumBildirimleriOkuEylemi}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin"
            >
              <MailOpen size={15} aria-hidden />
              Tümünü okundu işaretle
            </button>
          </form>
        )}
      </div>

      {bildirimler.length === 0 ? (
        <Kart className="text-metin-yumusak">
          {suzgec === "okunmamis"
            ? "Okunmamış bildiriminiz yok."
            : suzgec === "okunmus"
              ? "Okunmuş bildiriminiz yok."
              : "Henüz bildiriminiz yok."}
        </Kart>
      ) : (
        <ul className="space-y-2">
          {bildirimler.map((bildirim) => {
            const baglanti = bildirimBaglantisi(bildirim);

            return (
              <li
                key={bildirim.id}
                id={`bildirim-${bildirim.id}`}
                className={`flex scroll-mt-6 flex-wrap items-start justify-between gap-3 rounded-kart border px-4 py-3 ${
                  bildirim.okunduMu
                    ? "border-cizgi bg-zemin"
                    : "border-vurgu bg-kart"
                }`}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-metin">
                    {bildirim.baslik}
                    {/*
                      OKUNMAMIŞ ROZETİ: iki durumu yalnızca zemin rengiyle
                      ayırmak renk körlüğünde ve yüksek kontrast temalarında
                      kaybolur; etiket her temada okunur.
                    */}
                    {!bildirim.okunduMu && (
                      <span className="rounded-full bg-vurgu-zemin px-2 py-0.5 text-xs font-medium text-vurgu-metin">
                        Okunmadı
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line text-metin-yumusak">
                    {bildirim.icerik}
                  </p>
                  <p className="mt-1 text-xs text-metin-yumusak">
                    {tarihSaatYaz(bildirim.olusturmaTarihi)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {baglanti && (
                    <Link
                      href={baglanti.yol}
                      className="inline-flex items-center gap-1 rounded-md border border-cizgi px-2.5 py-1 text-xs font-medium text-vurgu-metin transition hover:border-vurgu"
                    >
                      <ArrowRight size={13} aria-hidden />
                      {baglanti.etiket}
                    </Link>
                  )}
                  {/*
                    Okunmuş bildirimde düğme YOK, "Okundu" bilgisi var: geri
                    alma yönü (okunmadıya çekme) bilerek açılmadı — bildirim
                    tekrarını `bildirimGonder` okunmamış kayda bakarak
                    engelliyor, okunmuşu geri çevirmek aynı uyarının yeniden
                    düşmesini engelleyen bir kayıt yaratırdı.
                  */}
                  {bildirim.okunduMu ? (
                    <span className="rounded-md px-2.5 py-1 text-xs text-metin-yumusak">
                      Okundu
                    </span>
                  ) : (
                    <form action={bildirimOkunduEylemi}>
                      <input
                        type="hidden"
                        name="bildirimId"
                        value={bildirim.id}
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-cizgi px-2.5 py-1 text-xs font-medium text-metin-yumusak transition hover:bg-zemin"
                      >
                        Okundu
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {sonSayfa > 1 && (
        <nav
          aria-label="Sayfalama"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-metin-yumusak">
            {(sayfa - 1) * SAYFA_BOYUTU + 1}–
            {Math.min(sayfa * SAYFA_BOYUTU, toplam)} / {toplam} kayıt
          </p>
          <div className="flex items-center gap-2">
            {sayfa > 1 && (
              <Link
                href={yol(suzgec, sayfa - 1)}
                className="inline-flex items-center gap-1 rounded-md border border-cizgi px-3 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin"
              >
                <ChevronLeft size={15} aria-hidden />
                Önceki
              </Link>
            )}
            {sayfa < sonSayfa && (
              <Link
                href={yol(suzgec, sayfa + 1)}
                className="inline-flex items-center gap-1 rounded-md border border-cizgi px-3 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin"
              >
                Sonraki
                <ChevronRight size={15} aria-hidden />
              </Link>
            )}
          </div>
        </nav>
      )}

      {/*
        SAKLAMA SÜRESİ YAZILIYOR: okunmuş bildirimler KVKK saklama işiyle
        siliniyor (bkz. lib/kvkk/saklama.ts). Süre ekranda yazmasaydı kullanıcı
        bir gün listenin kısaldığını görür ve sebebini bilmezdi. Sayı koda
        gömülü değil, sistem ayarından geliyor.
      */}
      <Kart className="text-sm text-metin-yumusak">
        <KartBasligi
          baslik="Bildirimler ne kadar saklanır?"
          aciklama={`Okunmuş bildirimler ${saklamaAyi} ay sonra silinir; okunmamışlar silinmez. Bu süre proje yöneticisi tarafından değiştirilebilir.`}
          Ikon={BellRing}
        />
      </Kart>
    </div>
  );
}
