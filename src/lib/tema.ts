import { cookies } from "next/headers";

/**
 * Tema seçimi. Çerezde tutulur, böylece sunucu tarafı render doğru temayla
 * gelir ve sayfa yüklenirken renk atlaması olmaz.
 */

/*
 * İki tema kaldı: D (varsayılan) ve B. Daha önce A ("GençTek kurumsal",
 * lacivert) ve C ("MEB kırmızı", bordo) da vardı; kullanıcı kararıyla
 * kaldırıldılar. Kaldırılan kodları GERİ EKLEMEYİN — çerezinde "a" ya da "c"
 * kalmış kullanıcı temaGecerliMi'den geçemez ve varsayılana düşer, yani eski
 * seçim sessizce ölür, hata vermez.
 */
export type Tema = "b" | "d";

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
    kod: "b",
    ad: "B · Sade kurumsal",
    aciklama: "Açık üst bar, mavi vurgu, düşük kontrastlı sade görünüm",
  },
];

export function temaGecerliMi(deger: unknown): deger is Tema {
  return deger === "b" || deger === "d";
}

export async function aktifTema(): Promise<Tema> {
  const cerezDeposu = await cookies();
  const deger = cerezDeposu.get(TEMA_CEREZI)?.value;
  return temaGecerliMi(deger) ? deger : VARSAYILAN_TEMA;
}
