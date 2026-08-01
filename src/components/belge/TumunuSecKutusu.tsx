"use client";

import React, { useEffect, useRef } from "react";

/**
 * Katılımcı seçim listesindeki checkbox'ların tümünü seçme/kaldırma ve
 * kısmi seçim (indeterminate) durumunu yöneten istemci bileşeni.
 */
export function TumunuSecKutusu({ selector = ".katilimci-secimi" }: { selector?: string }) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  const tumunuDegistir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    const kutular = document.querySelectorAll<HTMLInputElement>(selector);
    kutular.forEach((kutu) => {
      kutu.checked = checked;
    });
  };

  useEffect(() => {
    const kutular = document.querySelectorAll<HTMLInputElement>(selector);
    const guncelle = () => {
      if (!checkboxRef.current) return;
      const toplam = kutular.length;
      const secili = Array.from(kutular).filter((k) => k.checked).length;
      checkboxRef.current.checked = toplam > 0 && secili === toplam;
      checkboxRef.current.indeterminate = secili > 0 && secili < toplam;
    };

    kutular.forEach((kutu) => kutu.addEventListener("change", guncelle));
    return () => {
      kutular.forEach((kutu) => kutu.removeEventListener("change", guncelle));
    };
  }, [selector]);

  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium text-metin cursor-pointer select-none">
      <input
        ref={checkboxRef}
        type="checkbox"
        onChange={tumunuDegistir}
        className="h-4 w-4 rounded border-cizgi text-vurgu focus:ring-vurgu"
      />
      <span>Tümünü seç / kaldır</span>
    </label>
  );
}
