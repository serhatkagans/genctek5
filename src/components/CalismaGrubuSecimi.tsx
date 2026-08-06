import { SINIF_BIRINCIL_BUTON } from "@/components/ui";

/**
 * Çalışma grubu seçim formu.
 *
 * İKİ YERDE BASILIR: Panelim sayfasının içindeki bölüm ve `/panel/calisma-
 * gruplari` ekranı. Sekme menüden kalktı ama sayfa silinmedi (bildirim
 * e-postalarında ve yer imlerinde adresi var); ikisi ayrı ayrı yazılsaydı
 * birine eklenen bir grup ya da kural ötekinde eksik kalırdı.
 *
 * Seçim sayısında ÜST SINIR YOKTUR — buraya sayı kontrolü eklemeyin
 * (SKILL.md · Karara bağlanmış maddeler).
 */
export function CalismaGrubuSecimi({
  gruplar,
  seciliIdler,
  kaydetEylemi,
  donusYolu,
}: {
  gruplar: { id: number; ad: string }[];
  seciliIdler: Set<number>;
  kaydetEylemi: (veri: FormData) => Promise<void>;
  /**
   * Kaydettikten sonra dönülecek adres. Panelim'den kaydeden kişiyi başka bir
   * ekrana atmamak için gerekli: eylem tek, çağıran iki.
   */
  donusYolu: string;
}) {
  return (
    <form action={kaydetEylemi}>
      <input type="hidden" name="donusYolu" value={donusYolu} />
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
  );
}
