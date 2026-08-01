"use client";

/**
 * Yazdırma düğmesi.
 *
 * Ayrı bir istemci bileşeni olmak zorunda: `window.print()` tarayıcıda çalışır
 * ve sunucu bileşenine onClick verilemez. Belge sayfasının geri kalanı sunucu
 * bileşeni olarak kalıyor — yalnızca bu düğme istemciye iniyor.
 */
export function YazdirButonu({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      Yazdır / PDF olarak kaydet
    </button>
  );
}
