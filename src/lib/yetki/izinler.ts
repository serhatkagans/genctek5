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

/**
 * Kişi faaliyete KATILIMCI olarak başvurabilir mi?
 *
 * Öğrenciler ve öğretmenler başvurur. Öğretmenin katılımcı olması bir istisna
 * değildir: analiz dokümanı 4.2 katılımcıyı "öğretmen/öğrenci" diye sayıyor ve
 * eğitici etkinliklerin bir kısmı zaten öğretmene yöneliktir. Görev almamış
 * öğretmen de başvurabilir — GençTek'e katılmanın yolu genelde buradan geçer.
 *
 * Proje yöneticisi (YEĞİTEK) dışarıdadır: ulusal faaliyetleri düzenleyen ve
 * onaylayan taraf kendi açtığı etkinliğe katılımcı olarak başvurmaz.
 */
export function basvuruYapabilirMi(kullanici: OturumKullanicisi): boolean {
  return !projeYoneticisiMi(kullanici);
}

/**
 * Başkası ADINA başvuru yetkisi (analiz dokümanı 4.2: "Danışman öğretmen
 * öğrenci adına başvurabilir").
 *
 * Yetki danışmanla sınırlı tutulmadı: il koordinatörü de kendi ilindeki
 * öğrencilerin faaliyet katılımını yürütüyor ve danışmanı olmayan öğrencinin
 * başvurusunu başka kimse yapamazdı.
 *
 * DİKKAT: Bu fonksiyon yalnızca ROLÜ sorar. "Bu öğrenci onun kapsamında mı"
 * sorusu ayrıca `ogrenciKapsamFiltresi` ile sorulmak zorundadır; tek başına
 * kullanılırsa bir danışman, ilinin öbür ucundaki öğrenci adına başvuru
 * yapabilirdi.
 */
export function baskasiAdinaBasvurabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return (
    projeYoneticisiMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    danismanMi(kullanici)
  );
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

// ---------------------------------------------------------------------------
// Öğretmen envanteri
// ---------------------------------------------------------------------------

/**
 * Danışman öğretmen envanterini görebilir mi?
 *
 * Öğrenci envanterinden AYRI bir kapıdır ama kapsam mantığı aynıdır: danışman
 * kendi okulundaki, il koordinatörü kendi ilindeki, YEĞİTEK tüm ülkedeki
 * öğretmenleri görür (bkz. ogretmenKapsamFiltresi). Öğrenci hiçbir koşulda
 * göremez: öğretmenin branşı ve iletişim bilgisi öğrencinin işine yaramaz,
 * kendi danışmanını zaten "Danışmanım" ekranında görüyor.
 *
 * Görev almamış öğretmen de göremez — öğrenci envanterinde olduğu gibi fail
 * closed davranılır.
 */
export function ogretmenEnvanteriGorebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return (
    projeYoneticisiMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    danismanMi(kullanici)
  );
}

// ---------------------------------------------------------------------------
// Paydaş envanteri
// ---------------------------------------------------------------------------

/**
 * Paydaş listesini görebilir mi? (analiz dokümanı Bölüm 3)
 *
 * Liste "faaliyet planlarken hızlıca ulaşılacak kurumlar" defteridir; faaliyet
 * düzenleyen herkes görür. Öğrenci göremez: kayıtlar kurum yetkililerinin adı
 * ve doğrudan iletişim bilgisidir, öğrencinin bu bilgiyle yapacağı bir iş yok.
 */
export function paydasGorebilirMi(kullanici: OturumKullanicisi): boolean {
  return (
    projeYoneticisiMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    danismanMi(kullanici)
  );
}

/**
 * Paydaş kaydı EKLEYEBİLİR Mİ?
 *
 * Görmekten dar bir yetkidir: kayıt ilin koordinatörüne ve merkeze bırakıldı.
 * Her danışman öğretmen de ekleyebilseydi aynı üniversite onlarca kez farklı
 * yazımla girilir ve "il bazlı iş birliği haritası" kullanılamaz hâle gelirdi.
 * Danışman öğretmen paydaşı görür ve faaliyetine bağlar; listeye yeni kurum
 * eklenmesini koordinatöründen ister.
 *
 * EKLEMEDE İL SORULMAZ. Koordinatörün iş birliği kurduğu üniversite ya da
 * şirket başka ilde olabilir (İzmir koordinatörünün Ankara'daki bir
 * üniversiteyle çalışması olağandır); kaydı kendi iline yazmaya zorlamak
 * envanteri yanlışlardı. Kaydın hangi ile ait olduğu formda seçilir.
 */
export function paydasEkleyebilirMi(kullanici: OturumKullanicisi): boolean {
  return projeYoneticisiMi(kullanici) || ilKoordinatoruMu(kullanici);
}

/**
 * MEVCUT bir paydaş kaydını düzenleyebilir mi?
 *
 * Eklemeden DAR bir yetkidir ve iki kapısı vardır:
 *   1. Kayıt kendi ilindeyse — envanter ile bağlıdır, koordinatör değişse de
 *      yeni koordinatör devralır.
 *   2. Kaydı kendisi eklediyse — başka ile yazdığı kaydı düzeltebilmeli,
 *      yoksa yanlış yazdığı bir kurumu düzeltemez hâle gelirdi.
 *
 * Başka bir ilin koordinatörünün eklediği kayda dokunulamaz: aynı kurumu iki
 * il farklı biçimde yönetiyorsa bu bir veri çatışmasıdır, yetki sorunu değil.
 */
export function paydasYonetebilirMi(
  kullanici: OturumKullanicisi,
  ilKodu: string,
  ekleyenKullaniciId?: number,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (!ilKoordinatoruMu(kullanici)) return false;
  if (koordinatorIlKodu(kullanici) === ilKodu) return true;
  return ekleyenKullaniciId !== undefined && ekleyenKullaniciId === kullanici.id;
}

/**
 * Faaliyete paydaş bağlayabilir mi?
 *
 * Bağlantı, paydaş kaydını YÖNETMEKTEN farklıdır: faaliyeti açan danışman
 * öğretmen kendi etkinliğinin hangi kurumla yapıldığını yazabilmelidir, ama
 * bu ona paydaş listesini düzenleme yetkisi vermez. Kapı, faaliyetin ek ve
 * içerik kapısıyla aynıdır — ikisi de "bu faaliyet senin mi" sorusudur.
 */
export function faaliyetPaydasiYonetebilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  return ekYukleyebilirMi(kullanici, faaliyet);
}
