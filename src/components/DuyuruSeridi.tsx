import { Megaphone } from "lucide-react";
import Link from "next/link";
import { kalanGunYaz } from "@/lib/faaliyet/takvim";

/**
 * Başvurusu açık faaliyetlerin akan şeridi — analiz dokümanı Bölüm 6:
 * "Başvuru durumu aktif olan faaliyetler ayrıca şerit halinde aksın".
 *
 * Sunucu bileşenidir: veriyi sayfa getirir, burada yalnızca gösterim var.
 * Hareket CSS ile yapılır (bkz. globals.css · serit-akisi) — JavaScript ile
 * kaydırmak, sayfanın geri kalanı sunucudan geldiği hâlde tek bir süs için
 * istemci paketi eklemek olurdu.
 *
 * Şerit ÜZERİNE GELİNDİĞİNDE ve içindeki bir bağlantıya klavyeyle
 * odaklanıldığında durur: akan bir bağlantıya tıklamaya çalışmak, hele klavyeyle
 * gezen biri için, kullanılabilirlik hatasıdır.
 */

export interface SeritKaydi {
  id: number;
  ad: string;
  basvuruBitis: Date;
}

export function DuyuruSeridi({
  kayitlar,
  simdi,
}: {
  kayitlar: SeritKaydi[];
  simdi: Date;
}) {
  if (kayitlar.length === 0) return null;

  // İçerik iki kez basılır; ikinci kopya yalnızca görsel süreklilik için var,
  // bu yüzden ekran okuyucudan gizlenir.
  const seritIcerigi = (gizliMi: boolean) => (
    <ul
      className="flex shrink-0 items-center gap-8 pr-8"
      aria-hidden={gizliMi || undefined}
    >
      {kayitlar.map((kayit) => (
        <li key={`${kayit.id}-${gizliMi ? "kopya" : "asil"}`}>
          <Link
            href={`/panel/faaliyetler/${kayit.id}`}
            tabIndex={gizliMi ? -1 : undefined}
            className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-uyari-metin hover:underline"
          >
            <span className="font-semibold">{kayit.ad}</span>
            <span className="rounded-full bg-uyari-cizgi/20 px-2 py-0.5 text-xs">
              başvuru açık · {kalanGunYaz(kayit.basvuruBitis, simdi)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label="Başvurusu açık faaliyetler"
      className="serit-kapsayici overflow-hidden rounded-kart border border-uyari-cizgi bg-uyari-zemin"
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-uyari-metin">
          <Megaphone size={16} aria-hidden />
          Başvuru açık
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="serit-akisi flex w-max">
            {seritIcerigi(false)}
            {seritIcerigi(true)}
          </div>
        </div>
      </div>
    </section>
  );
}
