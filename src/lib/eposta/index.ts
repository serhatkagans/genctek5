import { ortam } from "../ortam";
import { GunlukEpostaSaglayici } from "./gunluk-saglayici";
import { SmtpEpostaSaglayici } from "./smtp-saglayici";
import type { EpostaSaglayici } from "./tipler";

/**
 * Etkin e-posta sağlayıcısı, EPOSTA_SAGLAYICI ortam değişkenine göre seçilir.
 *
 * Gövdeler DÜZ METİNDİR. HTML e-posta hem şablonları ikiye katlar hem de
 * bildirim metinlerinin kullanıcıdan gelen değerlerle (faaliyet adı, okul adı)
 * doldurulduğu düşünülürse kaçış hatalarına açık kapı bırakır. Bildirimin işi
 * "panele bak" demektir; ayrıntı zaten paneldedir.
 */

let saglayici: EpostaSaglayici | null = null;

export function eposta(): EpostaSaglayici {
  if (saglayici) return saglayici;

  saglayici =
    ortam.EPOSTA_SAGLAYICI === "smtp"
      ? new SmtpEpostaSaglayici()
      : new GunlukEpostaSaglayici();

  return saglayici;
}

export function epostaEtkinMi(): boolean {
  return ortam.EPOSTA_SAGLAYICI !== "kapali";
}

export type { EpostaIletisi, EpostaSaglayici } from "./tipler";
