import { temaDegistirEylemi } from "@/app/tema-eylemi";
import { TEMALAR, type Tema } from "@/lib/tema";

/**
 * İki tema arasında geçiş. Sunucu eylemiyle çalışır; JavaScript kapalı olsa da
 * çalışmaya devam eder. Kendi arka planını taşıdığı için hem koyu hem açık üst
 * barda okunur kalır.
 */
export function TemaSecici({ aktif }: { aktif: Tema }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-cizgi bg-kart p-0.5">
      <span className="px-2 text-[11px] font-medium tracking-wide text-metin-yumusak uppercase">
        Tema
      </span>
      {TEMALAR.map((tema) => {
        const seciliMi = tema.kod === aktif;
        return (
          <form action={temaDegistirEylemi} key={tema.kod}>
            <input type="hidden" name="tema" value={tema.kod} />
            <button
              type="submit"
              title={tema.aciklama}
              aria-pressed={seciliMi}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition ${
                seciliMi
                  ? "bg-secili-zemin text-secili-metin"
                  : "text-metin-yumusak hover:text-metin"
              }`}
            >
              {tema.kod}
            </button>
          </form>
        );
      })}
    </div>
  );
}
