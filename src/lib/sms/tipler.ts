/**
 * SMS gönderimi bir arayüz arkasındadır.
 *
 * Operatör anlaşması yapılana kadar gerçek bir sağlayıcı yok; akışın geri
 * kalanı (bildirim kaydı, durum alanı, hata metni) yine de gerçek gönderimdeki
 * gibi işlesin diye soyutlama şimdi kuruluyor. Aynı yaklaşım e-posta, kimlik
 * doğrulama ve dosya depolama için de kullanılıyor: sağlayıcı değişince
 * üst katmanlar değişmez.
 */

export interface SmsIletisi {
  /** E.164 ya da yerel biçimde telefon numarası. */
  alici: string;
  /** SMS gövdesi. Başlık/gönderen adı sağlayıcı yapılandırmasından gelir. */
  govde: string;
}

export interface SmsSaglayici {
  /**
   * İletiyi gönderir. Başarısızlıkta HATA FIRLATIR; çağıran katman hatayı
   * yakalayıp kaydeder ve iş akışını sürdürür.
   */
  gonder(ileti: SmsIletisi): Promise<void>;
}
