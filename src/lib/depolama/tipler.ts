/**
 * Depolama soyutlaması.
 *
 * Dosyalar diskte değil, bu arayüzün arkasında tutulur: VPS'ten S3 uyumlu bir
 * servise geçiş olursa yalnızca yeni bir sağlayıcı yazılır, çağıran kod
 * değişmez. Veritabanında dosya yolu değil, sağlayıcının döndürdüğü ANAHTAR
 * saklanır (`faaliyet_ek.depolama_yolu`); anahtarın ne anlama geldiğini
 * yalnızca sağlayıcı bilir.
 */

export interface YazmaIstegi {
  icerik: Buffer;
  /** Kullanıcının yüklediği orijinal ad — yalnızca uzantı için kullanılır. */
  dosyaAdi: string;
  mimeTipi: string;
}

export interface DepolamaSaglayici {
  readonly saglayiciAdi: string;
  yaz(istek: YazmaIstegi): Promise<string>;
  oku(anahtar: string): Promise<Buffer>;
  sil(anahtar: string): Promise<void>;
}

export class DepolamaHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "DepolamaHatasi";
  }
}
