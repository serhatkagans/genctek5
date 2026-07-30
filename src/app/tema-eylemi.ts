"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CEREZ_YOLU } from "@/lib/ortam";
import { TEMA_CEREZI, temaGecerliMi } from "@/lib/tema";

const BIR_YIL_SANIYE = 60 * 60 * 24 * 365;

export async function temaDegistirEylemi(veri: FormData): Promise<void> {
  const secilen = veri.get("tema");
  if (!temaGecerliMi(secilen)) return;

  const cerezDeposu = await cookies();
  cerezDeposu.set(TEMA_CEREZI, secilen, {
    path: CEREZ_YOLU,
    maxAge: BIR_YIL_SANIYE,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
