import type { Kapsam } from "@/generated/prisma/enums";
import type { FaaliyetKapsami, OturumKullanicisi } from "./tipler";

/**
 * references/permissions.md Bölüm 1'deki yetki matrisinin birebir karşılığı.
 *
 * Buradaki fonksiyonlar saf tutulur (veritabanına gitmez) ki birim testle
 * eksiksiz kapsanabilsinler. Sık yapılan hatayı önlemek için her fonksiyon
 * hem ROLÜ hem KAPSAMI sorar: "il koordinatörü mü" yeterli değildir,
 * "bu kayıt onun ilinde mi" de sorulmalıdır.
 */

export function projeYoneticisiMi(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.some((rol) => rol.rolKodu === "PROJE_YONETICISI");
}

export function ilKoordinatoruMu(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.some((rol) => rol.rolKodu === "IL_KOORDINATOR");
}

export function danismanMi(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.some((rol) => rol.rolKodu === "DANISMAN");
}

export function ogrenciMi(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.some((rol) => rol.rolKodu === "OGRENCI");
}

/** İl koordinatörünün sorumlu olduğu il. Rol yoksa null. */
export function koordinatorIlKodu(
  kullanici: OturumKullanicisi,
): string | null {
  return (
    kullanici.roller.find((rol) => rol.rolKodu === "IL_KOORDINATOR")?.ilKodu ??
    null
  );
}

/** Danışman öğretmenin sorumlu olduğu okul. Rol yoksa null. */
export function danismanKurumKodu(
  kullanici: OturumKullanicisi,
): number | null {
  return (
    kullanici.roller.find((rol) => rol.rolKodu === "DANISMAN")?.kurumKodu ??
    null
  );
}

// ---------------------------------------------------------------------------
// Faaliyet
// ---------------------------------------------------------------------------

/** Danışman öğretmen yalnızca okul içi faaliyet açabilir. */
export function faaliyetAcabilirMi(
  kullanici: OturumKullanicisi,
  kapsam: Kapsam,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (ilKoordinatoruMu(kullanici)) return true;
  if (danismanMi(kullanici)) return kapsam === "OKUL";
  return false;
}

/** İl koordinatörünün açtığı ulusal faaliyet proje yöneticisi onayı bekler. */
export function faaliyetOnayGerekiyorMu(
  kullanici: OturumKullanicisi,
  kapsam: Kapsam,
): boolean {
  if (projeYoneticisiMi(kullanici)) return false;
  return kapsam === "ULUSAL" && ilKoordinatoruMu(kullanici);
}

export function faaliyetOnaylayabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

/**
 * Faaliyetin kullanıcıya görünüp görünmediğini söyler. Onay bekleyen faaliyet
 * yalnızca düzenleyene ve proje yöneticisine görünür.
 */
export function faaliyetGorunurMu(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (faaliyet.duzenleyenKullaniciId === kullanici.id) return true;
  if (!faaliyet.onayliMi) return false;

  switch (faaliyet.kapsam) {
    case "OKUL":
      return (
        faaliyet.kurumKodu !== null &&
        faaliyet.kurumKodu === kullanici.kurumKodu
      );
    case "IL":
      return faaliyet.ilKodu !== null && faaliyet.ilKodu === kullanici.ilKodu;
    case "ULUSAL":
      return true;
  }
}

/**
 * Faaliyeti açan kullanıcı görevden ayrıldığında değerlendirme ve moderasyon
 * yetkisi boşta kalmaz; faaliyetin iline bakan il koordinatörüne düşer
 * (references/domain-rules.md Bölüm 11). Proje yöneticisi zaten her durumda
 * yetkilidir, o yüzden burada aranmaz.
 *
 * Devir YALNIZCA düzenleyen görevden ayrıldığında olur: görevdeki bir
 * öğretmenin faaliyetine kendi ilinin koordinatörü karışamaz.
 */
export function yetkiDevrolduMu(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (faaliyet.duzenleyenGorevdeMi !== false) return false;
  if (!ilKoordinatoruMu(kullanici)) return false;

  const faaliyetIli = faaliyet.kapsamIlKodu ?? faaliyet.ilKodu;
  return faaliyetIli !== null && koordinatorIlKodu(kullanici) === faaliyetIli;
}

/**
 * Ek yükleme yetkisi yalnızca faaliyeti açan kullanıcıdadır. Rol kontrolü tek
 * başına yeterli değildir: aynı rolden başka bir danışman, başkasının
 * faaliyetine dosya ekleyemez.
 */
export function ekYukleyebilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (faaliyet.duzenleyenKullaniciId === kullanici.id) return true;
  return yetkiDevrolduMu(kullanici, faaliyet);
}

/**
 * İptal yetkisi düzenleme yetkisinden DARDIR: yalnızca faaliyeti açan kullanıcı
 * ve proje yöneticisi (references/domain-rules.md Bölüm 6).
 *
 * Düzenleyen görevden ayrıldığında değerlendirme ve moderasyon ilin
 * koordinatörüne devrolur ama iptal devrolmaz — başkasının kurduğu bir
 * organizasyonu kapatmak, başvurmuş tüm öğrencileri etkileyen ve geri
 * alınamayan bir karardır. Koordinatörün gerçekten iptal etmesi gerekiyorsa
 * proje yöneticisine başvurur.
 */
export function faaliyetIptalEdebilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  return faaliyet.duzenleyenKullaniciId === kullanici.id;
}

// ---------------------------------------------------------------------------
// Yorum
// ---------------------------------------------------------------------------

/** Faaliyeti görebilen herkes yorum yazabilir. */
export function yorumYazabilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  return faaliyetGorunurMu(kullanici, faaliyet);
}

/**
 * Silme yetkisi: yorum sahibi, faaliyeti açan kullanıcı veya proje yöneticisi.
 * Öğrenci yalnızca kendi yorumunu silebilir. Düzenleyen görevden ayrıldıysa
 * moderasyon yetkisi ilin koordinatörüne devrolur — 18 yaş altı kullanıcıların
 * olduğu bir faaliyet moderatörsüz kalamaz.
 */
export function yorumSilebilirMi(
  kullanici: OturumKullanicisi,
  yorum: { yazanKullaniciId: number },
  faaliyet: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (yorum.yazanKullaniciId === kullanici.id) return true;
  if (faaliyet.duzenleyenKullaniciId === kullanici.id) return true;
  return yetkiDevrolduMu(kullanici, faaliyet);
}

// ---------------------------------------------------------------------------
// Başvuru
// ---------------------------------------------------------------------------

/** Başvuruyu öğrenci kendisi yapar; öğretmen öğrenci adına başvuramaz. */
export function basvuruYapabilirMi(kullanici: OturumKullanicisi): boolean {
  return ogrenciMi(kullanici) && !projeYoneticisiMi(kullanici);
}

/**
 * Başvuruyu yalnızca faaliyeti açan kullanıcı değerlendirir; o görevden
 * ayrılmışsa yetki ilin koordinatörüne düşer, böylece başvurular
 * değerlendirilmeden kalmaz.
 */
export function basvuruDegerlendirebilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (faaliyet.duzenleyenKullaniciId === kullanici.id) return true;
  return yetkiDevrolduMu(kullanici, faaliyet);
}

// ---------------------------------------------------------------------------
// Rol ve görev atama
// ---------------------------------------------------------------------------

export function ilKoordinatorAtayabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

export function okulTemsilcisiAtayabilirMi(
  kullanici: OturumKullanicisi,
  kurumKodu: number,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  return danismanMi(kullanici) && danismanKurumKodu(kullanici) === kurumKodu;
}

export function ilTemsilcisiAtayabilirMi(
  kullanici: OturumKullanicisi,
  ilKodu: string,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  return (
    ilKoordinatoruMu(kullanici) && koordinatorIlKodu(kullanici) === ilKodu
  );
}

export function calismaGrubuTanimlayabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

/**
 * Bir öğrenciyi çalışma grubuna ekleyip çıkarma yetkisi.
 *
 * Grubun kendisini TANIMLAMAK'tan (yalnızca proje yöneticisi) ayrı bir
 * yetkidir: burada listeye yeni bir grup eklenmiyor, mevcut bir gruba öğrenci
 * yazılıyor. Danışman öğretmen, il koordinatörü ve proje yöneticisi yapabilir;
 * öğrenci de kendi seçimini yapar ama o akış `/panel/calisma-gruplari`
 * ekranındadır ve burada aranmaz.
 *
 * DİKKAT: Bu fonksiyon yalnızca ROLÜ sorar. "Bu öğrenci onun kapsamında mı"
 * sorusu ayrıca `ogrenciKapsamFiltresi` ile sorulmak zorundadır — tek başına
 * kullanılırsa danışman, ilinin öbür ucundaki bir öğrenciyi gruba yazabilirdi.
 */
export function ogrenciCalismaGrubuYonetebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return (
    projeYoneticisiMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    danismanMi(kullanici)
  );
}

/**
 * Rol/atama envanteri — hangi ilde koordinatör atanmış, hangi okul danışmansız
 * kalmış sorularının TOPLU cevabı.
 *
 * "Öğrenci/öğretmen verisi görüntüleme" satırından AYRI bir yetkidir: o tekil
 * profil erişimi, bu yönetimsel bir görünüm. İl koordinatörü kendi ilindeki
 * danışmansız okulları zaten görür; bu ekran aynı sorguyu il filtresi olmadan
 * çalıştırdığı için yalnızca proje yöneticisine açıktır.
 */
export function rolEnvanteriGorebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

/**
 * Erişim kayıtları — "kim hangi öğrenci kaydını ne zaman gördü" defteri.
 *
 * Defterin kendisi de kişisel veri içerdiğinden yalnızca merkeze açıktır; il
 * koordinatörü kendi ilinin kayıtlarını bile göremez, çünkü kayıtlar il
 * sınırından bağımsız olarak birbirine referans verir.
 */
export function erisimLoglariniGorebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

/** Sistem ayarları, çalışma grupları ve etkinlik programları merkezden yönetilir. */
export function sistemAyarlariniYonetebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}
