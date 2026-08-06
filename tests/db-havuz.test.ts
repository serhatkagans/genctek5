import { havuzSiniriniCoz } from "@/lib/db-havuz";

/**
 * `connection_limit` çözümlemesi.
 *
 * NEDEN BU TEST VAR: bu parametre PRISMA'YA ÖZGÜDÜR ve `@prisma/adapter-pg`
 * onu okumaz — altta node-postgres var, bilmediği sorgu parametrelerini sessizce
 * yok sayıyor. Yani adres çubuğuna yazılan sınır bir süre HİÇ uygulanmadı ve
 * havuz `pg`'nin kendi varsayılanıyla açıldı; yerel `prisma dev` sunucusu bu
 * kadar eş zamanlı bağlantıyı kaldıramadığı için sayfalar "Server has closed
 * the connection" ile 500 verdi.
 *
 * Arıza tek sorgu çalıştıran betiklerde HİÇ görünmüyordu (tek bağlantı yeter),
 * yalnızca sayfa yükü altında çıkıyordu — bu yüzden veritabanı arızası değil kod
 * hatası gibi okundu. Çözümlemenin kendisi burada sınanıyor ki sınır bir daha
 * sessizce düşmesin.
 */

const TEMEL = "postgres://k:p@localhost:5432/db";

describe("havuz sınırı çözümlemesi", () => {
  it("adresteki connection_limit değerini kullanır", () => {
    expect(havuzSiniriniCoz(`${TEMEL}?connection_limit=12`)).toBe(12);
  });

  it("diğer parametrelerin arasından okur", () => {
    expect(
      havuzSiniriniCoz(
        `${TEMEL}?sslmode=disable&connection_limit=6&pgbouncer=true`,
      ),
    ).toBe(6);
  });

  it("parametre yoksa varsayılana düşer", () => {
    expect(havuzSiniriniCoz(TEMEL)).toBe(4);
  });

  /*
   * Sıfır ve negatif değerler `pg`'de havuzu kilitler ya da patlatır; sayıya
   * çevrilemeyen değer de öyle. Üçünde de varsayılana düşmek, uygulamanın hiç
   * açılmamasından iyidir — sınır bir başarım ayarıdır, güvenlik kısıtı değil.
   */
  it("geçersiz değerleri varsayılana çevirir", () => {
    expect(havuzSiniriniCoz(`${TEMEL}?connection_limit=0`)).toBe(4);
    expect(havuzSiniriniCoz(`${TEMEL}?connection_limit=-3`)).toBe(4);
    expect(havuzSiniriniCoz(`${TEMEL}?connection_limit=abc`)).toBe(4);
  });

  it("çözümlenemeyen adreste patlamaz", () => {
    expect(havuzSiniriniCoz("bu bir adres değil")).toBe(4);
  });
});
