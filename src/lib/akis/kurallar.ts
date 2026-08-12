/**
 * Akış kuralları — gönderi, yorum ve "Hakkımda".
 *
 * TEK CÜMLELİK TASARIM İLKESİ (iletisim/kurallar.ts ile aynı): gizli kanal
 * yoktur. Gönderi ve yorum, yazışmadan da açıktır — ekosistemdeki HERKES
 * okur. Ekranda kalıcı olarak yazılı; bir yayın alanının okunmadığı izlenimi
 * verilmiyor.
 *
 * GÖNDERİ, YAZIŞMA DEĞİLDİR: yazışma iki kişi arasındadır ve danışman onayı
 * ister; gönderi yayındır ve onay istemez. Emsali panodaki ilandır (model
 * Talep) — öğrenci oraya da onaysız yazıyor ve ilan bütün ekosisteme görünür.
 *
 * Saf tutulur: veritabanına ve oturuma bakmaz, birim testle kapsanır.
 */

export const GONDERI_MAKS = 3000;
export const YORUM_MAKS = 1000;
export const HAKKINDA_MAKS = 1500;

export type MetinKarari =
  | { olurMu: true; icerik: string }
  | { olurMu: false; neden: string };

function metniCoz(
  metin: string,
  maks: number,
  bosNeden: string,
  adi: string,
): MetinKarari {
  const icerik = metin.trim();
  if (!icerik) return { olurMu: false, neden: bosNeden };
  if (icerik.length > maks) {
    return { olurMu: false, neden: `${adi} en fazla ${maks} karakter olabilir.` };
  }
  return { olurMu: true, icerik };
}

export function gonderiMetniniCoz(metin: string): MetinKarari {
  return metniCoz(metin, GONDERI_MAKS, "Gönderi boş olamaz.", "Gönderi");
}

export function yorumMetniniCoz(metin: string): MetinKarari {
  return metniCoz(metin, YORUM_MAKS, "Yorum boş olamaz.", "Yorum");
}

/**
 * "Hakkımda" metni — diğer ikisinden farklı olarak BOŞ BIRAKILABİLİR.
 *
 * Boşaltmak bir silme işlemidir ve geçerlidir: kişi kendini tanıtmak
 * zorunda değil. Bu yüzden `null` dönebiliyor.
 */
export type HakkindaKarari =
  | { olurMu: true; icerik: string | null }
  | { olurMu: false; neden: string };

export function hakkindaMetniniCoz(metin: string): HakkindaKarari {
  const icerik = metin.trim();
  if (!icerik) return { olurMu: true, icerik: null };
  if (icerik.length > HAKKINDA_MAKS) {
    return {
      olurMu: false,
      neden: `Hakkımda metni en fazla ${HAKKINDA_MAKS} karakter olabilir.`,
    };
  }
  return { olurMu: true, icerik };
}

/**
 * Gizlenmiş içeriğin METNİ kime açılır?
 *
 * model Mesaj'daki kuralın aynısı: gizlenen içerik SİLİNMEZ, gözetim yetkisi
 * olana içeriğiyle görünmeye devam eder. Şikâyet incelemesinde en çok ihtiyaç
 * duyulan kayıt, gizlenmiş olandır.
 *
 * YAZARIN KENDİSİ DE GÖREMEZ: gizleme bir moderasyon kararıdır, yazara
 * "neyin gizlendiğini" göstermek onu yeniden yayınlamaya davet ederdi. Kendi
 * gizlediği gönderi de buna dâhil — geri alma yoktur.
 */
export function gizliIcerikGorunurMu(girdi: {
  gizlendiMi: boolean;
  gozetimYetkisiVarMi: boolean;
}): boolean {
  return !girdi.gizlendiMi || girdi.gozetimYetkisiVarMi;
}

/**
 * Bir gönderiyi/yorumu kim gizleyebilir?
 *
 * İki taraf: gözetim yetkisi olanlar (danışman, il koordinatörü, proje
 * yöneticisi) ve İÇERİĞİN YAZARI. Yazarın kendi paylaşımını kaldırabilmesi
 * gerekir — aksi halde yanlışlıkla yazdığı bir şey için öğretmenine başvurmak
 * zorunda kalırdı ve bu, paylaşmayı caydırırdı.
 *
 * Yazarın gizlemesi de İZ BIRAKIR (gizleyen_kullanici_id + tarih): "kendi
 * sildi" ile "yetkili kaldırdı" ayrımı denetimde görünür kalmalı.
 */
export function gizleyebilirMi(girdi: {
  kullaniciId: number;
  yazanKullaniciId: number;
  gozetimYetkisiVarMi: boolean;
  zatenGizliMi: boolean;
}): { olurMu: boolean; neden?: string } {
  if (girdi.zatenGizliMi) {
    return { olurMu: false, neden: "Bu içerik zaten gizlenmiş." };
  }
  if (girdi.gozetimYetkisiVarMi) return { olurMu: true };
  if (girdi.kullaniciId === girdi.yazanKullaniciId) return { olurMu: true };
  return {
    olurMu: false,
    neden: "Yalnızca içeriğin yazarı ya da gözetim yetkisi olanlar gizleyebilir.",
  };
}

/**
 * Akış ekranında kalıcı olarak gösterilecek uyarı.
 *
 * GIZLILIK_UYARISI'ndan (iletisim/kurallar.ts) AYRI bir cümle, çünkü ayrı bir
 * gerçeği söylüyor: yazışma "yetkililer okur" der, gönderi "herkes okur" der.
 * İkisini tek cümlede toplamak, akışın yazışmadan daha açık olduğunu gizlerdi.
 */
export const AKIS_UYARISI =
  "Buraya yazdıklarınızı GençTek'teki herkes görür. Kişisel bilgilerinizi (telefon, adres, okul dışı hesaplar) paylaşmayın; uygunsuz içerik danışman öğretmeniniz ve koordinatörünüz tarafından kaldırılır.";
