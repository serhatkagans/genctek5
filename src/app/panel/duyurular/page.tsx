import { Megaphone } from "lucide-react";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  DUYURU_HEDEF_ETIKETLERI,
  DUYURU_HEDEFLERI,
} from "@/lib/bildirim/toplu";
import { prisma } from "@/lib/db";
import { ortam } from "@/lib/ortam";
import { tarihSaatYaz } from "@/lib/tarih";
import { sistemAyarlariniYonetebilirMi } from "@/lib/yetki/izinler";
import { duyuruGonderEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Toplu duyuru — analiz isteği Bölüm 5.
 *
 * Ekranın tasarımı "yanlışlıkla gönderme"yi zorlaştırmak üzerine kurulu:
 * alıcı sayısı seçenekle birlikte yazılı, onay kutusu zorunlu ve geri
 * alınamazlık açıkça söyleniyor. "Emin misiniz?" sormak yerine SAYIYI
 * göstermek daha dürüst — kullanıcı 12 kişiye mi 4000 kişiye mi gönderdiğini
 * bilerek karar verir.
 */

export default async function DuyurularSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; hata?: string; sayi?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum, hata, sayi } = await searchParams;

  if (!sistemAyarlariniYonetebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Duyurular"
          aciklama="Bu ekran yalnızca proje yöneticisine açıktır."
        />
      </Kart>
    );
  }

  const [ogrenciSayisi, ogretmenSayisi, sonDuyurular] = await Promise.all([
    prisma.kullanici.count({
      where: {
        aktif: true,
        roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
      },
    }),
    prisma.kullanici.count({
      where: {
        aktif: true,
        roller: { none: { rolKodu: "OGRENCI", bitisTarihi: null } },
      },
    }),
    // Aynı duyuru herkese aynı başlıkla gittiği için gruplanarak listeleniyor.
    prisma.bildirim.groupBy({
      by: ["baslik"],
      where: { tip: "TOPLU_DUYURU" },
      _count: { _all: true },
      _max: { olusturmaTarihi: true },
      orderBy: { _max: { olusturmaTarihi: "desc" } },
      take: 10,
    }),
  ]);

  const sayilar = { ogrenci: ogrenciSayisi, ogretmen: ogretmenSayisi };

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Duyurular"
        aciklama="Tüm öğrenci ve öğretmenlere panel bildirimi gönderin."
      />

      {durum === "gonderildi" && (
        <BilgiKutusu cesit="olumlu">
          Duyuru {sayi ?? "—"} kişiye gönderildi.
        </BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <BilgiKutusu cesit="uyari">
        <strong>Duyuru geri alınamaz.</strong> Gönderdikten sonra bildirimleri
        silmenin bir yolu yoktur; e-posta kopyası gitmişse o da geri çağrılamaz.
        Göndermeden önce metni okuyun.
      </BilgiKutusu>

      <Kart>
        <KartBasligi
          baslik="Yeni duyuru"
          aciklama={
            ortam.EPOSTA_SAGLAYICI === "kapali"
              ? "E-posta kanalı kapalı; duyuru yalnızca panele düşer."
              : ortam.EPOSTA_SAGLAYICI === "gunluk"
                ? "E-posta sağlayıcısı GÜNLÜK kipinde: ileti gönderilmez, sunucu günlüğüne yazılır. Duyuru panele düşer."
                : "Duyuru panele düşer; e-posta adresi kayıtlı olanlara kopyası da gider."
          }
          Ikon={Megaphone}
        />

        <form action={duyuruGonderEylemi} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-metin">Alıcılar</span>
            <select name="hedef" required className={SINIF_GIRDI}>
              {DUYURU_HEDEFLERI.map((hedef) => {
                const adet =
                  hedef === "OGRENCI"
                    ? sayilar.ogrenci
                    : hedef === "OGRETMEN"
                      ? sayilar.ogretmen
                      : sayilar.ogrenci + sayilar.ogretmen;
                return (
                  <option key={hedef} value={hedef}>
                    {DUYURU_HEDEF_ETIKETLERI[hedef]} ({adet} kişi)
                  </option>
                );
              })}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-metin">Başlık</span>
            <input
              type="text"
              name="baslik"
              required
              maxLength={200}
              className={SINIF_GIRDI}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-metin">Metin</span>
            <textarea
              name="icerik"
              required
              rows={8}
              maxLength={4000}
              className={SINIF_GIRDI}
            />
            <span className="mt-1 block text-sm text-metin-yumusak">
              Düz metin olarak gönderilir. Bağlantı yazabilirsiniz; panelde
              tıklanabilir görünür.
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-metin">
            <input
              type="checkbox"
              name="onay"
              value="evet"
              className="mt-0.5 h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
            />
            <span>
              Metni okudum ve bu duyurunun geri alınamayacağını biliyorum.
            </span>
          </label>

          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            <Megaphone size={16} aria-hidden />
            Duyuruyu gönder
          </button>
        </form>
      </Kart>

      {sonDuyurular.length > 0 && (
        <Kart>
          <KartBasligi
            baslik="Son duyurular"
            aciklama="Gönderilmiş duyurular; kayıt amaçlıdır, silinemez."
          />
          <ul className="divide-y divide-cizgi">
            {sonDuyurular.map((duyuru) => (
              <li
                key={duyuru.baslik}
                className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
              >
                <span className="font-medium text-metin">{duyuru.baslik}</span>
                <span className="text-sm text-metin-yumusak">
                  {duyuru._count._all} kişi ·{" "}
                  {duyuru._max.olusturmaTarihi
                    ? tarihSaatYaz(duyuru._max.olusturmaTarihi)
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        </Kart>
      )}
    </div>
  );
}
