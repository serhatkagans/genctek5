import { notFound } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  aliciAdiniCoz,
  belgeMetniUret,
  belgeTuruMu,
} from "@/lib/belge/kurallar";
import { gorunurFaaliyetGetir, faaliyetKapsamiCikar } from "@/lib/faaliyet/erisim";
import { uygulamaYolu } from "@/lib/ortam";
import { tarihYaz } from "@/lib/tarih";
import { faaliyetRaporuYazabilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * Yazdırılabilir katılım / teşekkür belgesi.
 *
 * KÜTÜPHANE YOK: belge, arka planında resmî şablonun bulunduğu bir HTML
 * sayfasıdır ve tarayıcının "Yazdır → PDF olarak kaydet" akışıyla çıktı alınır.
 * Gerçek PDF üretmek (pdfkit, puppeteer) bir bağımlılık ve sunucuda ek bir
 * çalışma zamanı demekti; tek sayfalık bir belge için buna değmiyor.
 *
 * Sayfa panel kabuğunu KULLANMAZ: kendi düzenini kurar ve yazdırmada menü,
 * başlık, bağlantı gibi hiçbir şey çıkmaz.
 */
export default async function BelgeSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tur?: string; ad?: string; metin?: string }>;
}) {
  const [{ id }, { tur, ad, metin }] = await Promise.all([params, searchParams]);
  const kullanici = await oturumKullanicisiZorunlu();

  const faaliyet = await gorunurFaaliyetGetir(kullanici, Number.parseInt(id, 10));
  if (!faaliyet) notFound();

  // Belge düzenleme yetkisiyle aynı kapı: faaliyeti açan, ilin koordinatörü,
  // merkez. Katılımcının kendisi kendine belge basamaz.
  if (!faaliyetRaporuYazabilirMi(kullanici, faaliyetKapsamiCikar(faaliyet))) {
    notFound();
  }

  if (!tur || !belgeTuruMu(tur)) notFound();
  const alici = aliciAdiniCoz(ad ?? "");
  if (!alici.olurMu) notFound();

  const belge = belgeMetniUret({
    tur,
    adSoyad: alici.adSoyad,
    faaliyetAdi: faaliyet.ad,
    tarihMetni: tarihYaz(faaliyet.tarih),
    ozelMetin: metin ?? null,
  });

  /*
   * Belge üretimi erişim kaydına yazılır: kimin kime hangi belgeyi bastığı
   * sorulabilmeli. Belgenin kendisi veritabanında tutulmadığı için izlenebilir
   * tek yer burasıdır.
   */
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "FAALIYET",
    hedefId: faaliyet.id,
    detay: `${belge.baslik} üretildi: ${belge.adSoyad}`,
  });

  return (
    <div className="belge-sayfa">
      {/*
        Ölçüler şablonun kendi oranına göre (3783x2756 ≈ 1.373). A4 yatay
        1.414; şablon tam oturmadığı için sayfa oranı şablona sabitleniyor,
        aksi halde kenar süsü kırpılırdı.
      */}
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        html, body { margin: 0; padding: 0; background: #f3f4f6; }
        .belge-sayfa { display: flex; justify-content: center; padding: 24px; }
        .belge {
          position: relative;
          width: 1100px;
          aspect-ratio: 3783 / 2756;
          background-image: url('${uygulamaYolu("/belge-sablonu.png")}');
          background-size: 100% 100%;
          background-repeat: no-repeat;
          color: #1f2430;
          font-family: Georgia, "Times New Roman", serif;
        }
        .belge-icerik {
          position: absolute;
          left: 14%; right: 14%; top: 38%;
          text-align: center;
        }
        .belge-baslik {
          font-size: 34px; font-weight: 700; letter-spacing: 3px;
          text-transform: uppercase; color: #c1272d; margin: 0 0 34px;
        }
        .belge-ad { font-size: 40px; font-weight: 700; margin: 0 0 18px; }
        .belge-govde { font-size: 21px; line-height: 1.6; margin: 0; }
        .belge-alt {
          position: absolute; left: 14%; right: 14%; bottom: 14%;
          display: flex; justify-content: space-between; align-items: flex-end;
          font-size: 15px;
        }
        .belge-imza { text-align: center; min-width: 230px; }
        .belge-imza-cizgi {
          border-top: 1px solid #9aa0aa; margin-bottom: 6px; padding-top: 6px;
        }
        .yazdir-cubugu {
          position: fixed; top: 16px; right: 16px; display: flex; gap: 8px;
          font-family: system-ui, sans-serif;
        }
        /* Yazdırmada ekrana ait her şey kaybolur; yalnızca belge kalır. */
        @media print {
          html, body { background: #fff; }
          .belge-sayfa { padding: 0; }
          .belge { width: 100vw; height: 100vh; aspect-ratio: auto; }
          .yazdir-cubugu { display: none; }
        }
      `}</style>

      <div className="yazdir-cubugu">
        <a
          href={uygulamaYolu(`/panel/faaliyetler/${faaliyet.id}/belgeler`)}
          style={{
            background: "#fff",
            border: "1px solid #d0d5dd",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 14,
            textDecoration: "none",
            color: "#1f2430",
          }}
        >
          ← Belgeler
        </a>
      </div>

      <div className="belge">
        <div className="belge-icerik">
          <p className="belge-baslik">{belge.baslik}</p>
          <p className="belge-ad">{belge.adSoyad}</p>
          <p className="belge-govde">{belge.govde}</p>
        </div>

        <div className="belge-alt">
          <div>{belge.tarihMetni}</div>
          <div className="belge-imza">
            <div className="belge-imza-cizgi" />
            {faaliyet.duzenleyen.ad} {faaliyet.duzenleyen.soyad}
            <br />
            <span style={{ color: "#5b6472" }}>{faaliyet.duzenleyenBirim}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
