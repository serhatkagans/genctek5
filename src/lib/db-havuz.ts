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

/**
 * Havuzdaki bir bağlantının BOŞTA kalabileceği süre (11 Ağustos 2026).
 *
 * NİYE VAR: yerel `prisma dev` sunucusu boşta duran bağlantıyı yaklaşık on beş
 * saniye sonra KENDİ KAPATIYOR. `pg` bunu fark etmiyor, bağlantıyı havuzda
 * "hazır" sayıyor ve sıradaki isteğe ÖLÜ bağlantıyı veriyor; sonuç "Server has
 * closed the connection" hatası ve ekranda 500. Belirti sinsiydi: hata her
 * zaman aynı sayfada çıkmıyordu, "bir süredir açık duran sekmede ilk tıklama
 * patlıyor, yenileyince düzeliyor" biçiminde görünüyordu.
 *
 * SORUN EŞ ZAMANLILIK DEĞİL: on eş zamanlı sorgu arka arkaya sorunsuz
 * çalışıyor, on beş saniye bekledikten sonra yapılan TEK sorgu patlıyor.
 * Bağlantı sınırını düşürmek ya da sorguları dalgalara bölmek bu yüzden
 * çözmüyordu, yalnızca isabet olasılığını değiştiriyordu.
 *
 * BİR SANİYE, sunucunun kapatma eşiğinin çok altında: havuz bağlantıyı
 * sunucudan önce kendisi bırakıyor, bir sonraki istek taze bağlantı açıyor.
 * Ölçüm: 5000'de yirmi saniyelik aralıklarla yapılan yedi denemenin biri
 * düşüyordu, 1000'de hiçbiri düşmedi.
 *
 * MALİYETİ, seyrek kullanılan sayfalarda bir bağlantı kurma gecikmesi. Gerçek
 * bir Postgres'e geçildiğinde bu kadar kısa tutmaya gerek yok (sunucu boştaki
 * bağlantıyı kendiliğinden kapatmıyor); değer o zaman yükseltilebilir.
 *
 * NOT: yerel `prisma dev` sunucusu bunun DIŞINDA da arada bağlantı düşürüyor
 * (uygulama açılırken, hiç boşta beklemeden). O davranış bu ayarla ilgili
 * değil ve sunucu yeniden başlatılınca geçiyor.
 */
export const BOSTA_KALMA_SURESI_MS = 1000;

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
