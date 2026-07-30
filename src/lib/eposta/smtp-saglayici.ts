import { createTransport, type Transporter } from "nodemailer";
import { ortam } from "../ortam";
import type { EpostaIletisi, EpostaSaglayici } from "./tipler";

/**
 * Kurum posta sunucusu üzerinden gönderim.
 *
 * Taşıyıcı (transport) bir kez kurulur ve yeniden kullanılır: her ileti için
 * yeni bağlantı açmak, arka arkaya bildirim çıkan akışlarda (bir faaliyetin
 * tüm başvurularının değerlendirilmesi gibi) sunucuyu gereksiz yorar.
 */
export class SmtpEpostaSaglayici implements EpostaSaglayici {
  private tasiyici: Transporter | null = null;

  private tasiyiciyiAl(): Transporter {
    if (this.tasiyici) return this.tasiyici;

    const port = Number.parseInt(ortam.SMTP_PORT ?? "587", 10);

    this.tasiyici = createTransport({
      host: ortam.SMTP_SUNUCU,
      port,
      // 465 örtük TLS'tir; diğer portlarda STARTTLS ile yükseltilir.
      secure: port === 465,
      auth:
        ortam.SMTP_KULLANICI && ortam.SMTP_SIFRE
          ? { user: ortam.SMTP_KULLANICI, pass: ortam.SMTP_SIFRE }
          : undefined,
    });

    return this.tasiyici;
  }

  async gonder(ileti: EpostaIletisi): Promise<void> {
    await this.tasiyiciyiAl().sendMail({
      from: ortam.EPOSTA_GONDEREN,
      to: ileti.alici,
      subject: ileti.konu,
      text: ileti.govde,
    });
  }
}
