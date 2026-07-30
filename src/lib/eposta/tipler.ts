/**
 * E-posta gönderimi bir arayüz arkasındadır.
 *
 * Kurum posta sunucusu, dış bir servis ya da hiç göndermeme kararı —
 * hangisi olursa olsun üst katmanlar değişmez. Aynı yaklaşım kimlik doğrulama
 * (auth) ve dosya depolama (depolama) için de kullanılıyor.
 */

export interface EpostaIletisi {
  alici: string;
  konu: string;
  /** Düz metin gövde. HTML gövde bilinçli olarak yok: bkz. src/lib/eposta/index.ts */
  govde: string;
}

export interface EpostaSaglayici {
  /**
   * İletiyi gönderir. Başarısızlıkta HATA FIRLATIR; çağıran katman hatayı
   * yakalayıp kaydeder ve iş akışını sürdürür.
   */
  gonder(ileti: EpostaIletisi): Promise<void>;
}
