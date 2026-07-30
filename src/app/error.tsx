"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Beklenmeyen hata ekranı.
 *
 * Kullanıcıya teknik ayrıntı GÖSTERİLMEZ: yığın izi ve sorgu metni kişisel veri
 * sızdırabilir. Ayrıntı sunucu günlüğüne yazılır, kullanıcı yalnızca hatanın
 * kimliğini görür ve destek istediğinde onu iletir.
 */
export default function HataEkrani({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("İşlenmeyen hata:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <p className="mb-4 text-sm font-semibold tracking-wide text-metin-yumusak">
        GençTek Bilgi Sistemi
      </p>
      <div className="rounded-kart border border-hata-cizgi bg-hata-zemin px-6 py-5 text-hata-metin">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle size={20} aria-hidden />
          Beklenmeyen bir hata oluştu
        </h1>
        <p className="mt-2 text-sm">
          İşleminiz tamamlanamadı. Sayfayı yenilemeyi deneyebilir, sorun
          sürerse okul idareniz aracılığıyla destek isteyebilirsiniz.
        </p>
        {error.digest && (
          <p className="mt-3 text-sm">
            Hata kimliği: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md bg-birincil px-4 py-2 text-sm font-semibold text-birincil-metin transition hover:bg-birincil-koyu"
        >
          <RotateCcw size={16} aria-hidden />
          Yeniden dene
        </button>
        <Link
          href="/panel"
          className="inline-flex items-center gap-2 rounded-md border border-cizgi px-4 py-2 text-sm font-medium text-metin transition hover:bg-zemin"
        >
          Panele dön
        </Link>
      </div>
    </main>
  );
}
