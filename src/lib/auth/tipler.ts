/**
 * Kimlik doğrulama soyutlaması.
 *
 * EBA SSO erişimi henüz sağlanmadığı için sistem şu an mock bir sağlayıcıyla
 * çalışır. Üst katmanlar (yetki, atama, profil) YALNIZCA bu arayüzü tanır;
 * EBA token'ı geldiğinde tek yapılacak iş AuthProvider'ın gerçek
 * implementasyonunu yazmaktır. Bu dosyanın dışına "mock" kavramı sızmamalıdır.
 */

export type KimlikTipi = "OGRENCI" | "OGRETMEN" | "PERSONEL";

/**
 * AuthProvider'dan gelen kimlik bilgisi.
 *
 * Bu alanların TAMAMI salt okunurdur: e-Okul/EBA kaynaklıdır ve hiçbir ekranda
 * düzenlenemez. Mock aşamada da aynı kural geçerlidir (bkz. SKILL.md
 * "Değişmezler" 6).
 */
export interface AuthKimlik {
  /** Mock aşamada test kullanıcı kimliği, sonra EBA kimliği. */
  authProviderId: string;
  tip: KimlikTipi;
  ad: string;
  soyad: string;
  cinsiyet: "E" | "K";
  /** Öğrenci/öğretmen için okul kodu. YEĞİTEK personelinde null. */
  kurumKodu: number | null;
  ilKodu: string | null;
  ilceKodu: string | null;
  /** Yalnızca öğrencide dolu. */
  sinif: string | null;
  /** Yalnızca öğretmende dolu. */
  brans: string | null;
  egitimOgretimYili: string;
}

export interface AuthProvider {
  /** Günlüklerde ve tanılamada görünen sağlayıcı adı. */
  readonly saglayiciAdi: string;

  /**
   * Kimlik bilgisini doğrular. Mock sağlayıcıda bu bir test kullanıcısı
   * kimliğidir; EBA sağlayıcısında SSO token'ı olacaktır.
   */
  girisYap(kimlikBilgisi: string): Promise<AuthKimlik | null>;

  /**
   * Kayıtlı bir kullanıcının güncel kimlik bilgisini getirir. Gecelik senkron
   * kurum kodu değişimini bununla yakalar.
   */
  kimlikGetir(authProviderId: string): Promise<AuthKimlik | null>;

  /**
   * Giriş ekranında seçilebilecek kimlikler. Yalnızca mock sağlayıcı doldurur;
   * EBA sağlayıcısı boş liste döndürür (kullanıcı listesi dışarıya verilemez).
   */
  secilebilirKimlikler(): Promise<AuthKimlik[]>;
}
