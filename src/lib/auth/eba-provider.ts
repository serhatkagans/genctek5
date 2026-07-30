import type { AuthKimlik, AuthProvider } from "./tipler";

/**
 * Gerçek EBA SSO sağlayıcısı.
 *
 * Token/API erişimi henüz sağlanmadığı için gövde boştur. Erişim geldiğinde
 * DOLDURULACAK TEK YER burasıdır: üst katmanlar (yetki, atama, profil)
 * AuthProvider arayüzünü tanıdığı için değişmeyecektir.
 *
 * Yapılacaklar (erişim sağlandığında):
 *   - EBA_SSO_URL üzerinden token doğrulama
 *   - Dönen talep (claim) alanlarını AuthKimlik'e eşleme
 *   - kimlikGetir için kurum/görev sorgulama servisinin bağlanması
 */
export class EbaAuthProvider implements AuthProvider {
  readonly saglayiciAdi = "eba";

  async girisYap(): Promise<AuthKimlik | null> {
    throw new Error(
      "EBA SSO entegrasyonu henüz yapılmadı. AUTH_PROVIDER=mock ile çalışın.",
    );
  }

  async kimlikGetir(): Promise<AuthKimlik | null> {
    throw new Error(
      "EBA SSO entegrasyonu henüz yapılmadı. AUTH_PROVIDER=mock ile çalışın.",
    );
  }

  /** Kullanıcı listesi dışarıya verilemez; EBA'da seçim ekranı yoktur. */
  async secilebilirKimlikler(): Promise<AuthKimlik[]> {
    return [];
  }
}
