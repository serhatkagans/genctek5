import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import { BilgiKutusu, Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { GIZLILIK_UYARISI } from "@/lib/iletisim/kurallar";
import { tarihSaatYaz } from "@/lib/tarih";
import { yazismaKapsamFiltresi } from "@/lib/yetki/kapsam";

export const dynamic = "force-dynamic";

/**
 * Yazışma listesi — analiz isteği Bölüm 6, Aşama 3.
 *
 * Liste merkezi kapsam filtresinden geçer: kişi kendi yazışmalarını, danışman
 * öğrencilerininkini, koordinatör ilindekileri, merkez hepsini görür. "Taraf
 * mıyım" ayrımı listede YAPILMAZ — ekranda her satırın tarafları yazılı
 * olduğu için gözetim amaçlı bakan kişi zaten kendi konuşmadığını görüyor.
 */
export default async function YazismalarSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  const yazismalar = await prisma.yazisma.findMany({
    where: yazismaKapsamFiltresi(kullanici),
    orderBy: { olusturmaTarihi: "desc" },
    take: 100,
    select: {
      baglantiIstegiId: true,
      kapatildiMi: true,
      olusturmaTarihi: true,
      baglantiIstegi: {
        select: {
          isteyenKullaniciId: true,
          hedefKullaniciId: true,
          isteyen: { select: { ad: true, soyad: true, kurum: { select: { ad: true } } } },
          hedef: { select: { ad: true, soyad: true, kurum: { select: { ad: true } } } },
          talep: { select: { baslik: true } },
        },
      },
      _count: { select: { mesajlar: true } },
    },
  });

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Yazışmalar"
        aciklama={`Onaylanmış bağlantıların konuşmaları · ${yazismalar.length} yazışma`}
      />

      <BilgiKutusu cesit="uyari">{GIZLILIK_UYARISI}</BilgiKutusu>

      <Kart>
        <KartBasligi baslik="Yazışmalar" Ikon={MessagesSquare} />
        {yazismalar.length === 0 ? (
          <p className="text-metin-yumusak">
            Görüntüleyebileceğiniz yazışma yok. Talep panosundan bağlantı isteği
            gönderebilirsiniz.
          </p>
        ) : (
          <ul className="divide-y divide-cizgi">
            {yazismalar.map((yazisma) => {
              const tarafMi =
                yazisma.baglantiIstegi.isteyenKullaniciId === kullanici.id ||
                yazisma.baglantiIstegi.hedefKullaniciId === kullanici.id;
              return (
                <li key={yazisma.baglantiIstegiId} className="py-3">
                  <Link
                    href={`/panel/yazismalar/${yazisma.baglantiIstegiId}`}
                    className="font-medium text-vurgu-metin underline underline-offset-2"
                  >
                    {yazisma.baglantiIstegi.isteyen.ad}{" "}
                    {yazisma.baglantiIstegi.isteyen.soyad}
                    {" ↔ "}
                    {yazisma.baglantiIstegi.hedef.ad}{" "}
                    {yazisma.baglantiIstegi.hedef.soyad}
                  </Link>
                  <p className="mt-0.5 text-sm text-metin-yumusak">
                    {yazisma._count.mesajlar} mesaj
                    {" · "}
                    {tarihSaatYaz(yazisma.olusturmaTarihi)}
                    {yazisma.baglantiIstegi.talep &&
                      ` · ${yazisma.baglantiIstegi.talep.baslik}`}
                    {yazisma.kapatildiMi && " · kapatıldı"}
                    {!tarafMi && " · gözetim"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Kart>
    </div>
  );
}
