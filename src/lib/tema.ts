import { cookies } from "next/headers";

/**
 * Tema seçimi. Çerezde tutulur, böylece sunucu tarafı render doğru temayla
 * gelir ve sayfa yüklenirken renk atlaması olmaz.
 */

export type Tema = "a" | "b" | "c" | "d";

export const TEMA_CEREZI = "genctek_tema";
export const VARSAYILAN_TEMA: Tema = "d";

export const TEMALAR: { kod: Tema; ad: string; aciklama: string }[] = [
  {
    kod: "d",
    ad: "D · GençTek marka",
    aciklama:
      "Kurumsal palet: beyaz zemin, nötr siyah metin, kırmızı vurgu (varsayılan)",
  },
  {
    kod: "a",
    ad: "A · GençTek kurumsal",
    aciklama: "Lacivert üst bar, kağıt zemin, amber vurgu, rol renk kodları",
  },
  {
    kod: "b",
    ad: "B · Sade kurumsal",
    aciklama: "Açık üst bar, mavi vurgu, düşük kontrastlı sade görünüm",
  },
  {
    kod: "c",
    ad: "C · MEB kırmızı",
    aciklama:
      "MEB kurumsal kimliği: bordo üst bar, kırmızı düğmeler, altın seçim vurgusu",
  },
];

export function temaGecerliMi(deger: unknown): deger is Tema {
  return (
    deger === "a" || deger === "b" || deger === "c" || deger === "d"
  );
}

export async function aktifTema(): Promise<Tema> {
  const cerezDeposu = await cookies();
  const deger = cerezDeposu.get(TEMA_CEREZI)?.value;
  return temaGecerliMi(deger) ? deger : VARSAYILAN_TEMA;
}
