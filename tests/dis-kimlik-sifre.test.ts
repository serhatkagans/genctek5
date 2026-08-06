import {
  sifirlamaJetonuDogrula,
  sifirlamaJetonuUret,
  sifreDogrula,
  sifreOzetle,
} from "@/lib/dis-kimlik/sifre";

/**
 * Şifre özetleme.
 *
 * scrypt bellek-zor bir fonksiyon olduğu için bu dosyadaki her doğrulama
 * ~100 ms sürer; süre bilinçlidir (bkz. lib/dis-kimlik/sifre.ts) ve zaman
 * aşımı buna göre yükseltildi.
 */

jest.setTimeout(30_000);

describe("şifre özeti", () => {
  test("doğru şifre doğrulanır", async () => {
    const ozet = await sifreOzetle("kavun-portakal-7");
    expect(await sifreDogrula("kavun-portakal-7", ozet)).toBe(true);
  });

  test("yanlış şifre reddedilir", async () => {
    const ozet = await sifreOzetle("kavun-portakal-7");
    expect(await sifreDogrula("kavun-portakal-8", ozet)).toBe(false);
  });

  test("aynı şifre her seferinde FARKLI özet üretir (tuz)", async () => {
    const bir = await sifreOzetle("kavun-portakal-7");
    const iki = await sifreOzetle("kavun-portakal-7");
    expect(bir).not.toBe(iki);
    expect(await sifreDogrula("kavun-portakal-7", iki)).toBe(true);
  });

  test("özet, algoritma parametrelerini kendi içinde taşır", async () => {
    // Parametreler koda sabitlenseydi N'i büyütmek tüm mevcut kullanıcıları
    // kilitlerdi; bu yüzden özetin içinde duruyorlar.
    const ozet = await sifreOzetle("kavun-portakal-7");
    expect(ozet.split("$")[0]).toBe("scrypt");
    expect(ozet.split("$")).toHaveLength(6);
  });

  test("bozuk özet HATA FIRLATMAZ, false döner", async () => {
    // Fırlatsaydı giriş ekranı 500'e düşer ve saldırgana biçim hakkında bilgi
    // verirdi.
    expect(await sifreDogrula("kavun-portakal-7", "")).toBe(false);
    expect(await sifreDogrula("kavun-portakal-7", "bcrypt$x$y")).toBe(false);
    expect(await sifreDogrula("kavun-portakal-7", "scrypt$a$b$c$d$e")).toBe(
      false,
    );
  });
});

describe("sıfırlama jetonu", () => {
  test("üretilen jeton kendi özetiyle doğrulanır, başkasıyla doğrulanmaz", async () => {
    const { jeton, ozet } = await sifirlamaJetonuUret();
    const baskasi = await sifirlamaJetonuUret();

    expect(await sifirlamaJetonuDogrula(jeton, ozet)).toBe(true);
    expect(await sifirlamaJetonuDogrula(baskasi.jeton, ozet)).toBe(false);
  });

  test("jetonun kendisi özetten okunamaz", async () => {
    const { jeton, ozet } = await sifirlamaJetonuUret();
    expect(ozet).not.toContain(jeton);
  });
});
