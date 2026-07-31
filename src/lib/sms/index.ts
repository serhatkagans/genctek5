import { ortam } from "../ortam";
import { GunlukSmsSaglayici } from "./gunluk-saglayici";
import { HttpSmsSaglayici } from "./http-saglayici";
import type { SmsSaglayici } from "./tipler";

/**
 * Etkin SMS sağlayıcısı, SMS_SAGLAYICI ortam değişkenine göre seçilir.
 *
 * VARSAYILAN "kapali"dır — e-postadan farklı olarak "gunluk" bile değil.
 * SMS ücretli, geri alınamaz ve alıcılarının çoğu 18 yaş altı; bu kanalın
 * yanlışlıkla açık kalması, yanlışlıkla kapalı kalmasından çok daha pahalıdır.
 * Panel bildirimi zaten her koşulda yazılıyor, bilgi kaybolmuyor.
 */

let saglayici: SmsSaglayici | null = null;

export function sms(): SmsSaglayici {
  if (saglayici) return saglayici;

  saglayici =
    ortam.SMS_SAGLAYICI === "http"
      ? new HttpSmsSaglayici()
      : new GunlukSmsSaglayici();

  return saglayici;
}

export function smsEtkinMi(): boolean {
  return ortam.SMS_SAGLAYICI !== "kapali";
}

export type { SmsIletisi, SmsSaglayici } from "./tipler";
