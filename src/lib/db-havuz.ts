/**
 * Bağlantı havuzu boyutunun çözümlenmesi.
 *
 * Saf tutulur: veritabanına ve ortam değişkenlerine GİTMEZ, adresi parametre
 * olarak alır. `db.ts` Prisma istemcisini içeri aldığı için birim testte
 * yüklenemiyor; karar bu yüzden ayrı dosyada duruyor.
 *
 * NİYE BÖYLE BİR KARAR VAR: `DATABASE_URL` içindeki `connection_limit`
 * PRISMA'YA ÖZGÜ bir parametredir ve `@prisma/adapter-pg` onu OKUMAZ — altta
 * node-postgres çalışıyor, o da bilmediği sorgu parametrelerini sessizce yok
 * sayıyor. Yani adrese yazılan sınır bir süre HİÇ uygulanmadı; havuz `pg`'nin
 * kendi varsayılanıyla açıldı.
 *
 * Sonucu görünür bir arızaydı: yerel `prisma dev` sunucusu dört-beş eş zamanlı
 * bağlantıdan fazlasını kapatıyor ve sayfalar "Server has closed the connection"
 * ile 500 veriyordu. Tek sorgu çalıştıran betiklerde hiç görünmüyordu (tek
 * bağlantı yetiyor), yalnızca sayfa yükü altında çıkıyordu — bu yüzden hata
 * veritabanı arızası değil kod hatası gibi okunuyordu.
 */

/**
 * Sınır yazılmamışsa kullanılan değer.
 *
 * 4, yerel `prisma dev` sunucusunun sorunsuz taşıdığı en yüksek değer (10'da
 * 25 eş zamanlı sorgunun 9'u düşüyor, 4'te hiçbiri). Gerçek bir Postgres'e
 * geçildiğinde `DATABASE_URL`'e `connection_limit=20` gibi bir değer yazmak
 * yeterli; kod değişmiyor.
 */
export const VARSAYILAN_HAVUZ_SINIRI = 4;

export function havuzSiniriniCoz(adres: string): number {
  let deger: string | null;
  try {
    deger = new URL(adres).searchParams.get("connection_limit");
  } catch {
    // Adres çözümlenemiyorsa bağlantı zaten kurulamayacak; havuz boyutu
    // yüzünden ayrıca patlamanın anlamı yok.
    return VARSAYILAN_HAVUZ_SINIRI;
  }

  if (deger === null) return VARSAYILAN_HAVUZ_SINIRI;

  /*
   * Sıfır ve negatif değer `pg`'de havuzu kilitler; sayıya çevrilemeyen değer
   * de öyle. Üçünde de varsayılana düşmek uygulamanın hiç açılmamasından iyi —
   * bu bir başarım ayarı, güvenlik kısıtı değil.
   */
  const sayi = Number.parseInt(deger, 10);
  return Number.isFinite(sayi) && sayi > 0 ? sayi : VARSAYILAN_HAVUZ_SINIRI;
}
