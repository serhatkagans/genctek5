import { Mail } from "lucide-react";
import Link from "next/link";
import { tarihSaatYaz } from "@/lib/tarih";

/**
 * Panelim'in üstündeki sarı şerit: "Mesajın var".
 *
 * ÖNCEDEN NE VARDI. Aynı yerde "Başvuru açık" şeridi duruyordu ve başvurusu
 * açık etkinlikleri akıtıyordu. İstek üzerine yerini bu şerit aldı
 * (6 Ağustos 2026). Başvuru bilgisi KAYBOLMADI: aynı sayfadaki "Başvurusu açık
 * etkinlik" sayacı ve kartı ile takvim yerinde duruyor.
 *
 * NEDEN AYRI BİR ŞERİT. Okunmamış bildirimler sayfanın ALTINDA duruyor;
 * panelde işi olan biri oraya kadar inmeden çıkabiliyordu. Şerit yalnızca
 * okunmamış mesaj varken basılır — hiç mesajı olmayana boş bir kutu göstermek,
 * şeridin taşıdığı "bak buraya" anlamını yıpratırdı.
 *
 * Sunucu bileşenidir; hareket CSS ile yapılır (globals.css · serit-akisi).
 * Şerit üzerine gelindiğinde ve bir bağlantıya klavyeyle odaklanıldığında
 * durur: akan bir bağlantıya tıklamaya çalışmak kullanılabilirlik hatasıdır.
 */

export interface MesajKaydi {
  id: number;
  baslik: string;
  olusturmaTarihi: Date;
}

export function MesajSeridi({
  mesajlar,
  toplam,
}: {
  mesajlar: readonly MesajKaydi[];
  /** Okunmamış mesajın TAMAMI. Şeritte yalnızca ilk birkaçı akar. */
  toplam: number;
}) {
  if (mesajlar.length === 0) return null;

  // İçerik iki kez basılır; ikinci kopya yalnızca görsel süreklilik için var,
  // bu yüzden ekran okuyucudan gizlenir.
  const seritIcerigi = (gizliMi: boolean) => (
    <ul
      className="flex shrink-0 items-center gap-8 pr-8"
      aria-hidden={gizliMi || undefined}
    >
      {mesajlar.map((mesaj) => (
        <li key={`${mesaj.id}-${gizliMi ? "kopya" : "asil"}`}>
          {/*
            Bağlantı, mesajın KENDİ satırına iner (#bildirim-<id>). Sayfanın
            altındaki bildirim bölümü, e-posta olarak giden metnin aynısını
            gösteriyor (bildirim.icerik) — ayrı bir mesaj ekranı açmak, aynı
            metni ikinci bir yerden okutmak olurdu.
          */}
          <Link
            href={`#bildirim-${mesaj.id}`}
            tabIndex={gizliMi ? -1 : undefined}
            className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-uyari-metin hover:underline"
          >
            <span className="font-semibold">{mesaj.baslik}</span>
            <span className="rounded-full bg-uyari-cizgi/20 px-2 py-0.5 text-xs">
              {tarihSaatYaz(mesaj.olusturmaTarihi)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label="Okunmamış mesajlar"
      className="serit-kapsayici overflow-hidden rounded-kart border border-uyari-cizgi bg-uyari-zemin"
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-uyari-metin">
          <Mail size={16} aria-hidden />
          Mesajın var
          {/*
            Sayı, şeritte akan kayıt sayısından FAZLA olabilir: şerit ilk
            birkaçını gösteriyor. Toplamı yazmak, "üçü akıyor ama on tane var"
            durumunda kullanıcının eksik bilgiyle sayfadan çıkmasını önler.
          */}
          {toplam > mesajlar.length && (
            <span className="font-normal">({toplam} okunmamış)</span>
          )}
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="serit-akisi flex w-max">
            {seritIcerigi(false)}
            {seritIcerigi(true)}
          </div>
        </div>
        {/*
          ARŞİV BAĞLANTISI (12 Ağustos 2026 · istek: "okundu tıklandıktan sonra
          artık yok, eski duyurulara nereden ulaşılabilir"). Şerit akıp geçen
          bir uyarı; okuduktan sonra nereye bakılacağını da söylemesi gerekiyor.
          Akışın DIŞINDA duruyor: akan bir bağlantıya tıklamak zordur.
        */}
        <Link
          href="/panel/bildirimler"
          className="shrink-0 text-sm font-medium text-uyari-metin underline underline-offset-2"
        >
          Tümü
        </Link>
      </div>
    </section>
  );
}
