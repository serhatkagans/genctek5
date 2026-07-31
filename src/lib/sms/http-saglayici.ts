import { ortam } from "../ortam";
import type { SmsIletisi, SmsSaglayici } from "./tipler";

/**
 * Operatör / toplu SMS servisi sağlayıcısı.
 *
 * Türkiye'deki toplu SMS servislerinin çoğu "JSON gövdeli POST + başlıkta
 * anahtar" biçiminde bir uç nokta sunuyor; bu sınıf o ortak biçimi konuşur ve
 * uç nokta, anahtar ve gönderen başlığı ORTAM DEĞİŞKENİNDEN gelir. Böylece
 * anlaşma yapılan servise geçmek kod değişikliği değil yapılandırma işidir.
 *
 * Servisin gövde şeması farklıysa değiştirilecek TEK yer burasıdır — üst
 * katmanlar SmsSaglayici arayüzünü görüyor.
 */
export class HttpSmsSaglayici implements SmsSaglayici {
  async gonder(ileti: SmsIletisi): Promise<void> {
    const adres = ortam.SMS_API_URL;
    if (!adres) {
      throw new Error("SMS_API_URL tanımlı değil.");
    }

    /*
     * Zaman aşımı ŞART: sağlayıcı yanıt vermediğinde istek sonsuza kadar
     * beklerse, bildirimi tetikleyen işlem (başvuru değerlendirme gibi) de
     * askıda kalır. Bildirim asla iş akışını kesmemeli.
     */
    const iptal = AbortSignal.timeout(10_000);

    const yanit = await fetch(adres, {
      method: "POST",
      signal: iptal,
      headers: {
        "Content-Type": "application/json",
        ...(ortam.SMS_API_ANAHTARI
          ? { Authorization: `Bearer ${ortam.SMS_API_ANAHTARI}` }
          : {}),
      },
      body: JSON.stringify({
        baslik: ortam.SMS_BASLIK ?? "GENCTEK",
        alicilar: [ileti.alici],
        mesaj: ileti.govde,
      }),
    });

    if (!yanit.ok) {
      /*
       * Yanıt gövdesi hata kaydına giriyor ama KIRPILIYOR: bazı servisler
       * hata durumunda tüm HTML hata sayfasını döndürüyor ve bu, bildirim
       * tablosundaki hata alanını okunamaz hâle getirir.
       */
      const govde = (await yanit.text().catch(() => "")).slice(0, 300);
      throw new Error(
        `SMS sağlayıcı ${yanit.status} döndü${govde ? `: ${govde}` : ""}`,
      );
    }
  }
}
