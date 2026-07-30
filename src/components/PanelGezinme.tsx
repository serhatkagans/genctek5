"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type GezinmeBaglantisi = { yol: string; etiket: string };

export function PanelGezinme({
  baglantilar,
}: {
  baglantilar: GezinmeBaglantisi[];
}) {
  const yol = usePathname();

  return (
    <nav className="mx-auto max-w-5xl px-6">
      <ul className="flex flex-wrap gap-1 pb-2">
        {baglantilar.map((baglanti) => {
          const aktifMi =
            baglanti.yol === "/panel"
              ? yol === "/panel"
              : yol.startsWith(baglanti.yol);

          return (
            <li key={baglanti.yol}>
              <Link
                href={baglanti.yol}
                aria-current={aktifMi ? "page" : undefined}
                className={`inline-block rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  aktifMi
                    ? "bg-ust-bar-secili-zemin text-ust-bar-secili-metin"
                    : "text-ust-bar-metin-yumusak hover:text-ust-bar-metin"
                }`}
              >
                {baglanti.etiket}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
