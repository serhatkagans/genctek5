import { prisma } from "../db";

/**
 * Çalışma grubu seçim ekranının verisi.
 *
 * Panelim'deki bölüm ile `/panel/calisma-gruplari` sayfası AYNI sorguyu
 * kullanır: iki yerde ayrı yazılsaydı biri pasif grupları gizlemeyi unutabilir
 * ve öğrenciye kapatılmış bir grup teklif edilirdi.
 *
 * Yalnızca AKTİF gruplar listelenir; geçmiş seçimler pasif gruplarda korunur
 * ama yeniden seçilemez (bkz. calisma-gruplari/eylemler.ts).
 */
export async function calismaGruplariniGetir(ogrenciId: number): Promise<{
  gruplar: { id: number; ad: string }[];
  seciliIdler: Set<number>;
}> {
  const [gruplar, secimler] = await Promise.all([
    prisma.calismaGrubu.findMany({
      where: { aktif: true },
      orderBy: { siraNo: "asc" },
      select: { id: true, ad: true },
    }),
    prisma.ogrenciCalismaGrubu.findMany({
      where: { ogrenciId },
      select: { calismaGrubuId: true },
    }),
  ]);

  return {
    gruplar,
    seciliIdler: new Set(secimler.map((secim) => secim.calismaGrubuId)),
  };
}
