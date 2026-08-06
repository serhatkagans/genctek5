/**
 * Ekranların paylaştığı arayüz parçaları. Renkler burada da anlam adıyla
 * yazılır (bkz. globals.css), böylece iki tema tek kaynaktan beslenir.
 */

export const SINIF_BIRINCIL_BUTON =
  "inline-flex items-center gap-2 rounded-md bg-birincil px-4 py-2 text-sm font-semibold text-birincil-metin transition hover:bg-birincil-koyu disabled:opacity-50";

export const SINIF_IKINCIL_BUTON =
  "inline-flex items-center gap-2 rounded-md border border-cizgi px-4 py-2 text-sm font-medium text-metin transition hover:bg-zemin";

export const SINIF_GIRDI =
  "mt-1 w-full rounded-md border border-cizgi bg-kart px-3 py-2 text-metin outline-none focus:border-vurgu";

export function Kart({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  /** Adres çapası; bir bağlantı doğrudan bu karta inebilsin diye. */
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-kart border border-cizgi bg-kart p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function KartBasligi({
  baslik,
  aciklama,
  Ikon,
}: {
  baslik: string;
  aciklama?: string;
  Ikon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="mb-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
        {Ikon && <Ikon size={18} className="text-vurgu-metin" />}
        {baslik}
      </h2>
      {aciklama && (
        <p className="mt-1 text-sm text-metin-yumusak">{aciklama}</p>
      )}
    </div>
  );
}

export function SayfaBasligi({
  baslik,
  aciklama,
}: {
  baslik: string;
  aciklama?: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-baslik">{baslik}</h1>
      {aciklama && <p className="mt-1 text-metin-yumusak">{aciklama}</p>}
    </div>
  );
}

/**
 * Katlanabilir kart.
 *
 * Panelim, çalışma grubu ve danışman seçimi içine gömülünce uzun bir forma
 * dönüşme riski taşıyor: öğrencinin ilk gördüğü ekran bu ve asıl işi (başvurusu
 * açık etkinlikler, takvim) formların altında kalmamalı. Bölümler bu yüzden
 * varsayılan olarak KAPALI; `baslangictaAcik` yalnızca kullanıcının bir işlem
 * yapması gerektiğinde (danışmanı yoksa gibi) açık gelir.
 *
 * JavaScript YOK: `<details>` tarayıcının kendi davranışı, sayfanın geri kalanı
 * gibi sunucuda basılıyor.
 */
export function KatlanabilirKart({
  baslik,
  aciklama,
  Ikon,
  baslangictaAcik = false,
  capa,
  children,
}: {
  baslik: string;
  aciklama?: string;
  Ikon?: React.ComponentType<{ size?: number; className?: string }>;
  baslangictaAcik?: boolean;
  /** Adres çapası; eylemler işlem sonrası bu bölüme geri döner. */
  capa?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={capa}
      className="scroll-mt-6 rounded-kart border border-cizgi bg-kart"
    >
      <details open={baslangictaAcik}>
        <summary className="cursor-pointer list-none px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
              {Ikon && <Ikon size={18} className="text-vurgu-metin" />}
              {baslik}
            </h2>
            <span className="text-sm font-medium text-vurgu-metin underline underline-offset-2">
              Aç / kapat
            </span>
          </div>
          {aciklama && (
            <p className="mt-1 text-sm text-metin-yumusak">{aciklama}</p>
          )}
        </summary>
        <div className="border-t border-cizgi px-6 py-5">{children}</div>
      </details>
    </section>
  );
}

export function BilgiKutusu({
  cesit = "bilgi",
  className = "",
  children,
}: {
  cesit?: "bilgi" | "uyari" | "hata" | "olumlu";
  className?: string;
  children: React.ReactNode;
}) {
  const sinif = {
    bilgi: "border-cizgi bg-kart text-metin",
    uyari: "border-uyari-cizgi bg-uyari-zemin text-uyari-metin",
    hata: "border-hata-cizgi bg-hata-zemin text-hata-metin",
    olumlu: "border-olumlu-cizgi bg-olumlu-zemin text-olumlu-metin",
  }[cesit];

  return (
    <div className={`rounded-kart border px-4 py-3 text-sm ${sinif} ${className}`}>
      {children}
    </div>
  );
}
