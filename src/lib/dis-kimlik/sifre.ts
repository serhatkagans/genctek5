import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Şifre özetleme — EBA dışı kullanıcılar için.
 *
 * NEDEN DIŞ BAĞIMLILIK YOK: bcrypt/argon2 paketleri yerel derleme ister ve
 * kurulum VPS'te Node sürümüne bağlı olarak kırılır. Node'un kendi scrypt'i
 * (RFC 7914) bellek-zor bir fonksiyondur ve bu iş için yeterlidir; parametreler
 * aşağıda, özetin İÇİNDE saklanır.
 *
 * ÖZET BİÇİMİ: scrypt$N$r$p$tuz$ozet — parametreler özete gömülür ki ileride
 * sertleştirildiklerinde ESKİ özetler doğrulanmaya devam etsin. Parametre
 * koda sabitlenseydi, N'i büyütmek tüm mevcut kullanıcıları kilitlerdi.
 */

const scryptAsync = promisify(scrypt) as (
  sifre: string | Buffer,
  tuz: string | Buffer,
  uzunluk: number,
  secenekler: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * scrypt maliyet parametreleri.
 *
 * N=16384 (2^14), r=8, p=1 — Node belgelerindeki varsayılan profilin bir
 * kademe üstü. Bir giriş denemesi ~100 ms sürer: kullanıcı fark etmez, kaba
 * kuvvet denemesi pahalı hâle gelir. Değerleri BÜYÜTMEK güvenlidir (eski
 * özetler kendi parametreleriyle doğrulanır), küçültmek anlamsızdır.
 */
const N = 16384;
const R = 8;
const P = 1;
const TUZ_BAYT = 16;
const OZET_BAYT = 32;

/** scrypt varsayılan maxmem (32 MB) N=16384 için yetmez. */
const MAKS_BELLEK = 64 * 1024 * 1024;

function b64(veri: Buffer): string {
  return veri.toString("base64");
}

export async function sifreOzetle(sifre: string): Promise<string> {
  const tuz = randomBytes(TUZ_BAYT);
  const ozet = await scryptAsync(sifre.normalize("NFKC"), tuz, OZET_BAYT, {
    N,
    r: R,
    p: P,
    maxmem: MAKS_BELLEK,
  });
  return `scrypt$${N}$${R}$${P}$${b64(tuz)}$${b64(ozet)}`;
}

/**
 * Şifreyi özetle karşılaştırır.
 *
 * Bozuk/tanınmayan özet biçiminde HATA FIRLATMAZ, `false` döner: özet alanı
 * bir şekilde bozulduysa doğru sonuç "bu kişi giremez"dir; istisna fırlatmak
 * giriş ekranını 500'e düşürür ve saldırgana biçim hakkında bilgi verir.
 */
export async function sifreDogrula(
  sifre: string,
  ozetKaydi: string,
): Promise<boolean> {
  const parcalar = ozetKaydi.split("$");
  if (parcalar.length !== 6 || parcalar[0] !== "scrypt") return false;

  const [, nMetin, rMetin, pMetin, tuzB64, ozetB64] = parcalar;
  const n = Number(nMetin);
  const r = Number(rMetin);
  const p = Number(pMetin);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  let tuz: Buffer;
  let beklenen: Buffer;
  try {
    tuz = Buffer.from(tuzB64, "base64");
    beklenen = Buffer.from(ozetB64, "base64");
  } catch {
    return false;
  }
  if (tuz.length === 0 || beklenen.length === 0) return false;

  let hesaplanan: Buffer;
  try {
    hesaplanan = await scryptAsync(
      sifre.normalize("NFKC"),
      tuz,
      beklenen.length,
      { N: n, r, p, maxmem: MAKS_BELLEK },
    );
  } catch {
    return false;
  }

  return timingSafeEqual(hesaplanan, beklenen);
}

/**
 * Parola sıfırlama jetonu üretir.
 *
 * Dönen çiftin İLKİ kullanıcıya (e-postayla) gider, İKİNCİSİ veritabanına
 * yazılır. Jetonun kendisi saklanmaz: veritabanını okuyabilen biri, elindeki
 * kayıtla hesap ele geçirememeli.
 */
export async function sifirlamaJetonuUret(): Promise<{
  jeton: string;
  ozet: string;
}> {
  const jeton = randomBytes(32).toString("base64url");
  return { jeton, ozet: await sifreOzetle(jeton) };
}

export async function sifirlamaJetonuDogrula(
  jeton: string,
  ozet: string,
): Promise<boolean> {
  return sifreDogrula(jeton, ozet);
}
