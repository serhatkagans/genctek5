import type { OgrenciListeFiltreleri } from "@/lib/yetki/kapsam";

/**
 * Öğrenci listesi filtrelerinin adres çubuğundan okunması.
 *
 * Ekran ve CSV dışa aktarma aynı çözümlemeyi kullanır: ikisi ayrı yazılırsa
 * indirilen dosya ekranda görünenden farklı bir küme olabilir ve bunu kimse
 * fark etmez. Değerler doğrulanmaz, çünkü filtreler yalnızca daraltır
 * (bkz. ogrenciListeFiltresi) — geçersiz değer en kötü ihtimalle boş liste verir.
 */

export type SorguParametreleri = Record<string, string | string[] | undefined>;

export function tekil(deger: string | string[] | undefined): string | null {
  const ilk = Array.isArray(deger) ? deger[0] : deger;
  const kirpilmis = ilk?.trim();
  return kirpilmis ? kirpilmis : null;
}

export function sayiVeyaNull(deger: string | null): number | null {
  const sayi = Number(deger);
  return deger !== null && Number.isFinite(sayi) ? sayi : null;
}

export function ogrenciFiltreleriniCoz(
  parametreler: SorguParametreleri,
): OgrenciListeFiltreleri {
  return {
    ilKodu: tekil(parametreler.il),
    ilceKodu: tekil(parametreler.ilce),
    kurumKodu: sayiVeyaNull(tekil(parametreler.okul)),
    sinif: tekil(parametreler.sinif),
    calismaGrubuId: sayiVeyaNull(tekil(parametreler.grup)),
    ara: tekil(parametreler.ara),
    danismansizMi: tekil(parametreler.danismansiz) === "1",
  };
}

export function filtreVarMi(filtreler: OgrenciListeFiltreleri): boolean {
  return Object.values(filtreler).some(
    (deger) => deger !== null && deger !== false,
  );
}

/** Arama parametrelerini bağlantıya çevirir; boş değerler düşer. */
export function sorguMetni(
  parametreler: SorguParametreleri,
  haric: readonly string[] = [],
): string {
  const sorgu = new URLSearchParams();
  for (const [anahtar, deger] of Object.entries(parametreler)) {
    if (haric.includes(anahtar)) continue;
    const ilk = Array.isArray(deger) ? deger[0] : deger;
    if (ilk) sorgu.set(anahtar, ilk);
  }
  return sorgu.toString();
}
