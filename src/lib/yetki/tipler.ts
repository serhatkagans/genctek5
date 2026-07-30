import type { Kapsam, RolKodu } from "@/generated/prisma/enums";

/** Kullanıcının aktif (bitiş tarihi yazılmamış) rolü ve o rolün kapsamı. */
export interface AktifRol {
  rolKodu: RolKodu;
  /** IL_KOORDINATOR rolünün ili. */
  ilKodu: string | null;
  /** DANISMAN rolünün okulu. */
  kurumKodu: number | null;
}

/**
 * Oturumdaki kullanıcının yetki kararları için gereken asgari bilgisi.
 * Yetki, rolün kendisinden değil rolün bağlı olduğu kurum/ilden gelir.
 */
export interface OturumKullanicisi {
  id: number;
  authProviderId: string;
  ad: string;
  soyad: string;
  kurumKodu: number | null;
  ilKodu: string | null;
  ilceKodu: string | null;
  sinif: string | null;
  brans: string | null;
  egitimOgretimYili: string;
  roller: AktifRol[];
}

/** Yetki kararlarında kullanılan faaliyet bilgisi. */
export interface FaaliyetKapsami {
  id: number;
  kapsam: Kapsam;
  kurumKodu: number | null;
  ilKodu: string | null;
  duzenleyenKullaniciId: number;
  onayliMi: boolean;
  /**
   * Faaliyetin bağlı olduğu il. Kapsam alanlarından türetilemez: okul içi
   * faaliyette okulun ili, ulusal faaliyette düzenleyenin ilidir. Yalnızca
   * yetki devri kararında kullanılır (bkz. yetkiDevrolduMu).
   */
  kapsamIlKodu?: string | null;
  /**
   * Düzenleyen hâlâ görevde mi? `false` ise değerlendirme ve moderasyon
   * yetkisi ilin koordinatörüne devrolur. Belirtilmezse "görevde" varsayılır.
   */
  duzenleyenGorevdeMi?: boolean;
}

export class YetkiHatasi extends Error {
  constructor(mesaj = "Bu işlem için yetkiniz yok") {
    super(mesaj);
    this.name = "YetkiHatasi";
  }
}

/**
 * Kaynağın varlığını bile sızdırmamak gereken durumlarda kullanılır:
 * kapsamı dışındaki bir faaliyet 403 değil 404 döner
 * (bkz. references/permissions.md Bölüm 4).
 */
export class BulunamadiHatasi extends Error {
  constructor(mesaj = "Kayıt bulunamadı") {
    super(mesaj);
    this.name = "BulunamadiHatasi";
  }
}
