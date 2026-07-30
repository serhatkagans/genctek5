import type { DepolamaSaglayici } from "./tipler";

/**
 * S3 uyumlu depolama sağlayıcısı.
 *
 * Kova/kimlik bilgileri henüz tanımlanmadığı için gövde boştur. Bakanlık
 * sunucusuna ya da nesne depolamaya geçilirse DOLDURULACAK TEK YER burasıdır:
 * çağıran katmanlar DepolamaSaglayici arayüzünü tanıdığı için değişmeyecektir.
 *
 * Yapılacaklar (geçiş kararı verildiğinde):
 *   - DEPOLAMA_S3_* ortam değişkenlerini `src/lib/ortam.ts` şemasına ekle
 *   - yaz/oku/sil için imzalı istek (presigned) veya SDK çağrılarını bağla
 *   - anahtar biçimini yerel sağlayıcıyla aynı tut (yyyy/aa/<uuid>.<uzanti>),
 *     böylece mevcut kayıtlar taşınabilir kalır
 */
export class S3Depolama implements DepolamaSaglayici {
  readonly saglayiciAdi = "s3";

  private hata(): never {
    throw new Error(
      "S3 depolama henüz yapılandırılmadı. DEPOLAMA_SAGLAYICI=yerel ile çalışın.",
    );
  }

  async yaz(): Promise<string> {
    this.hata();
  }

  async oku(): Promise<Buffer> {
    this.hata();
  }

  async sil(): Promise<void> {
    this.hata();
  }
}
