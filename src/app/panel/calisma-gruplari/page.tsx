import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { calismaGrubuKaydetEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

export default async function CalismaGruplariSayfasi({
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
          baslik="Çalışma grupları"
          aciklama="Grup seçimi öğrencilere özeldir."
        />
      </Kart>
    );
  }

  const [gruplar, secimler] = await Promise.all([
    prisma.calismaGrubu.findMany({
      where: { aktif: true },
      orderBy: { siraNo: "asc" },
    }),
    prisma.ogrenciCalismaGrubu.findMany({
      where: { ogrenciId: kullanici.id },
      select: { calismaGrubuId: true },
    }),
  ]);

  const seciliIdler = new Set(secimler.map((secim) => secim.calismaGrubuId));

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Çalışma gruplarım"
        aciklama="İlgi alanınıza göre istediğiniz kadar grup seçebilirsiniz; sayı sınırı yoktur."
      />

      {durum === "kaydedildi" && (
        <BilgiKutusu cesit="olumlu">Seçiminiz kaydedildi.</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <form
        action={calismaGrubuKaydetEylemi}
        className="rounded-kart border border-cizgi bg-kart p-6"
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {gruplar.map((grup) => (
            <li key={grup.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-kart border border-cizgi px-4 py-3 transition hover:border-vurgu hover:bg-vurgu-zemin">
                <input
                  type="checkbox"
                  name="grupId"
                  value={grup.id}
                  defaultChecked={seciliIdler.has(grup.id)}
                  className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
                />
                <span className="text-metin">{grup.ad}</span>
              </label>
            </li>
          ))}
        </ul>
        <button type="submit" className={`${SINIF_BIRINCIL_BUTON} mt-6`}>
          Kaydet
        </button>
      </form>
    </div>
  );
}
