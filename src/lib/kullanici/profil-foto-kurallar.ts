/**
 * Profil fotoğrafının kabul kuralları.
 *
 * `ogrenci/cv-kurallar.ts` ile aynı desende ve aynı gerekçeyle AYRI: CV bir
 * belgedir (pdf/doc/docx), fotoğraf bir görseldir ve sınırları farklıdır.
 * Faaliyet eklerinden de ayrıdır — oradaki görsel sınırı sayfa genişliğinde bir
 * fotoğraf için konmuştur, buradaki küçük bir avatar için.
 *
 * Saf tutulur: sınırlar parametreyle gelir (kaynak `sistem_ayari`), dosya
 * sistemine ve veritabanına gitmez. Böylece kurallar birim testle doğrulanır.
 */

export interface ProfilFotoSinirlari {
  izinliTipler: string[];
  maksBayt: number;
}

/** Ekranda "jpg, png, webp" yazmak için: MIME tipinin okunur karşılığı. */
const TIP_ADLARI: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function profilFotoTipAdlari(izinliTipler: string[]): string {
  return izinliTipler.map((tip) => TIP_ADLARI[tip] ?? tip).join(", ");
}

function megabayt(bayt: number): string {
  const mb = bayt / (1024 * 1024);
  // 2 MB gibi tam değerler "2 MB", 512 KB gibi küçük değerler "0.5 MB" yazılır;
  // sınır 1 MB'ın altındaysa "0 MB" demek kullanıcıya hiçbir şey anlatmaz.
  return mb >= 1 ? `${mb.toFixed(0)} MB` : `${mb.toFixed(1)} MB`;
}

export function profilFotoKabulEdilirMi(
  dosya: { mimeTipi: string; boyutBayt: number; dosyaAdi: string },
  sinirlar: ProfilFotoSinirlari,
): { olurMu: boolean; neden?: string } {
  if (!dosya.dosyaAdi.trim()) {
    return { olurMu: false, neden: "Dosya seçilmedi." };
  }
  if (dosya.boyutBayt <= 0) {
    return { olurMu: false, neden: "Boş dosya yüklenemez." };
  }
  if (!sinirlar.izinliTipler.includes(dosya.mimeTipi)) {
    return {
      olurMu: false,
      neden: `Profil fotoğrafı yalnızca ${profilFotoTipAdlari(
        sinirlar.izinliTipler,
      )} biçiminde yüklenebilir.`,
    };
  }
  if (dosya.boyutBayt > sinirlar.maksBayt) {
    return {
      olurMu: false,
      neden: `Dosya ${megabayt(dosya.boyutBayt)} boyutunda; profil fotoğrafı için üst sınır ${megabayt(
        sinirlar.maksBayt,
      )}.`,
    };
  }
  return { olurMu: true };
}

/**
 * Fotoğrafı olmayan kullanıcı için gösterilecek baş harfler.
 *
 * Boş bir gri kare yerine baş harf gösteriliyor: liste ve profil ekranlarında
 * "yüklenmemiş" ile "yüklenemedi" ayırt edilebilir olsun. Soyadı olmayan kayıt
 * teoride yok ama savunmacı davranılıyor — tek harf de geçerli bir sonuçtur.
 */
export function basHarfler(ad: string, soyad: string): string {
  const harf = (metin: string) => metin.trim().charAt(0).toLocaleUpperCase("tr");
  return `${harf(ad)}${harf(soyad)}` || "?";
}
