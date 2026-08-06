import { eposta, epostaEtkinMi } from "../eposta";

/**
 * Dış kullanıcıya giden e-postalar.
 *
 * NEDEN bildirim_sablonu ÜZERİNDEN GİTMİYOR: panel bildirimi bir KULLANICIYA
 * yazılır, oysa buradaki iletilerin alıcısının çoğu zaman kullanıcı kaydı
 * yoktur — reddedilen başvuru sahibinin hiç açılmaz, parola sıfırlama isteyen
 * kişi de tanım gereği sisteme giremiyordur. Bu yüzden tek kanal doğrudan
 * e-postadır.
 *
 * GÖNDERİM HATASI İŞ AKIŞINI KESMEZ: onay verildikten sonra postanın
 * gidememesi onayı geçersiz kılmaz, kişi zaten giriş yapabilir durumdadır.
 * Hata sunucu günlüğüne yazılır.
 */

async function gonder(alici: string, konu: string, govde: string): Promise<void> {
  if (!epostaEtkinMi()) return;
  try {
    await eposta().gonder({ alici, konu, govde });
  } catch (hata) {
    console.error(`Dış kullanıcı e-postası gönderilemedi (${konu}):`, hata);
  }
}

export async function basvuruAlindiEpostasi(
  alici: string,
  adSoyad: string,
): Promise<void> {
  await gonder(
    alici,
    "GençTek giriş başvurunuz alındı",
    `Merhaba ${adSoyad},\n\nGençTek Bilgi Sistemi'ne giriş başvurunuz alındı ve proje yöneticisinin onayına düştü.\n\nBaşvurunuz sonuçlandığında bu adrese bilgi verilecek. Onaylanana kadar giriş yapamazsınız.\n\nGençTek`,
  );
}

export async function basvuruOnaylandiEpostasi(
  alici: string,
  adSoyad: string,
): Promise<void> {
  await gonder(
    alici,
    "GençTek giriş başvurunuz onaylandı",
    `Merhaba ${adSoyad},\n\nGençTek Bilgi Sistemi'ne giriş başvurunuz onaylandı. Artık başvuruda belirlediğiniz e-posta ve şifreyle giriş yapabilirsiniz.\n\nİlk girişinizde KVKK aydınlatma metni ve açık rıza onayı gösterilecek; onaylamadan panele giriş yapılamaz.\n\nGençTek`,
  );
}

export async function basvuruReddedildiEpostasi(
  alici: string,
  adSoyad: string,
  gerekce: string,
): Promise<void> {
  await gonder(
    alici,
    "GençTek giriş başvurunuz hakkında",
    `Merhaba ${adSoyad},\n\nGençTek Bilgi Sistemi'ne giriş başvurunuz bu aşamada onaylanmadı.\n\nGerekçe: ${gerekce}\n\nEksikleri gidererek yeniden başvurabilirsiniz.\n\nGençTek`,
  );
}

export async function sifreSifirlamaEpostasi(
  alici: string,
  adSoyad: string,
  baglanti: string,
  gecerlilikDakika: number,
): Promise<void> {
  await gonder(
    alici,
    "GençTek şifre sıfırlama",
    `Merhaba ${adSoyad},\n\nŞifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın. Bağlantı ${gecerlilikDakika} dakika geçerlidir ve bir kez kullanılabilir.\n\n${baglanti}\n\nBu isteği siz yapmadıysanız bu iletiyi yok sayın; şifreniz değişmez.\n\nGençTek`,
  );
}
