import { DanismanSecimi } from "@/components/DanismanSecimi";
import { BilgiKutusu, Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { danismanSecimVerisiGetir } from "@/lib/danisman/atama";
import { prisma } from "@/lib/db";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { danismaniBirakEylemi, danismanSecEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Danışman öğretmen seçimi.
 *
 * SEKME MENÜDEN KALKTI (5 Ağustos 2026) ama SAYFA SİLİNEMEZ: burası aynı
 * zamanda giriş KAPISIDIR. Danışmansız öğrenci girişte buraya düşer ve seçimini
 * yapana kadar "boşta" kalamaz (SKILL.md · Değişmezler 2, bkz.
 * app/giris/eylemler.ts ve app/onay/eylemler.ts). Günlük kullanımda aynı bölüm
 * Panelim sayfasının içinde de duruyor; ikisi tek bileşenden basılıyor.
 */
export default async function DanismanSecimSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; durum?: string }>;
}) {
  const { hata, durum } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ogrenciMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Danışman öğretmenim"
          aciklama="Bu ekran öğrencilere özeldir."
        />
      </Kart>
    );
  }

  const veri = await danismanSecimVerisiGetir(kullanici);

  const okul = kullanici.kurumKodu
    ? await prisma.kurum.findUnique({
        where: { kurumKodu: kullanici.kurumKodu },
        select: { ad: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Danışman öğretmenim"
        aciklama={`${okul?.ad ?? "Okulunuz"} için danışman öğretmen ataması.`}
      />

      {durum === "secildi" && (
        <BilgiKutusu cesit="olumlu">
          Danışman öğretmeniniz kaydedildi.
        </BilgiKutusu>
      )}
      {durum === "birakildi" && (
        <BilgiKutusu cesit="olumlu">
          Danışmanlık sonlandırıldı ve öğretmene bilgi verildi. Yeni
          danışmanınızı istediğiniz zaman seçebilirsiniz.
        </BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <DanismanSecimi
        veri={veri}
        secEylemi={danismanSecEylemi}
        birakEylemi={danismaniBirakEylemi}
        donusYolu="/panel/danisman-secim"
      />
    </div>
  );
}
