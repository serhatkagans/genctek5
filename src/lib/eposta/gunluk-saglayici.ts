import type { EpostaIletisi, EpostaSaglayici } from "./tipler";

/**
 * Geliştirme sağlayıcısı: iletiyi göndermez, sunucu günlüğüne yazar.
 *
 * Varsayılan budur. Yanlışlıkla gerçek öğrencilere posta gitmesindense hiç
 * gitmemesi yeğdir; SMTP bilgisi girilene kadar sistem bu kipte çalışır ve
 * akışın geri kalanı (bildirim kaydı, durum alanı) gerçek gönderimdeki gibi
 * işler.
 */
export class GunlukEpostaSaglayici implements EpostaSaglayici {
  async gonder(ileti: EpostaIletisi): Promise<void> {
    console.info(
      `[eposta:gunluk] ${ileti.alici} · ${ileti.konu}\n${ileti.govde}`,
    );
  }
}
