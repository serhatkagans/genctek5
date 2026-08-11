import type { Kapsam, RolKodu } from "@/generated/prisma/enums";
import type { FaaliyetKapsami, OturumKullanicisi } from "./tipler";

/**
 * Açtığı etkinlik İL KOORDİNATÖRÜNÜN onayına tabi olan roller.
 *
 * TEK KAYNAK (11 Ağustos 2026). Bu liste iki yerde birden gerekiyor:
 *
 *   1. `ilKoordinatoruOnaylayabilirMi` — koordinatör bu kaydı onaylayabilir mi?
 *   2. `faaliyetKapsamFiltresi` — koordinatör bu kaydı GÖREBİLİR mi?
 *
 * İkisi iki ayrı dosyada elle yazılıyordu ve İKİ KEZ AYRIŞTI: önce danışman
 * öğretmen onaya tabi kılınıp filtre unutuldu, sonra aynısı mezun/paydaş/mentör
 * için tekrarlandı. Sonuç her seferinde aynı sessiz kilitlenme oldu —
 * koordinatöre "onayınızı bekliyor" bildirimi gidiyor, bildirimdeki bağlantı
 * 404 veriyor, etkinlik sonsuza kadar BEKLIYOR'da kalıyor. Hiçbir yerde hata
 * görünmüyor.
 *
 * Artık ikisi de bu diziden türüyor; yeni bir rol eklemek tek satır.
 */
export const KOORDINATOR_ONAYINA_TABI_ROLLER: readonly RolKodu[] = [
  "OGRENCI",
  "DANISMAN",
  "MEZUN",
  "PAYDAS_TEMSILCISI",
];

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

export function mezunMu(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.some((rol) => rol.rolKodu === "MEZUN");
}

export function paydasTemsilcisiMi(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.some((rol) => rol.rolKodu === "PAYDAS_TEMSILCISI");
}

/**
 * Kimliği EBA'dan (mock aşamada AuthProvider'dan) GELMEYEN kullanıcı: mezun ve
 * paydaş temsilcisi.
 *
 * NİYE TEK KAVRAM: ikisinin yetki tablosu bugün aynı — "yalnızca kendi
 * profilini, etkinlik takvimini ve talep panosunu görür". Her kapıda iki rolü
 * ayrı ayrı saymak, birinin unutulduğu bir kapı bırakırdı ve unutulan kapı
 * hata vermez, sessizce veri gösterirdi. İkisinin yetkisi gerçekten ayrışırsa
 * o kapıda ayrı ayrı sorulur, bu fonksiyon kaldırılmaz.
 *
 * DİKKAT: Bu, "kullanıcının kurum kodu yok" demek DEĞİLDİR. YEĞİTEK personeli
 * de kurumsuzdur ama kimliği AuthProvider'dan gelir ve yetkisi en geniştir.
 */
export function disKullaniciMi(kullanici: OturumKullanicisi): boolean {
  return mezunMu(kullanici) || paydasTemsilcisiMi(kullanici);
}

/**
 * EBA dışı giriş başvurularını görme ve karara bağlama yetkisi.
 *
 * Yalnızca proje yöneticisi: talebin kendisi böyle ("onayı proje yöneticisine
 * düşecek"). İl koordinatörüne açılması bir ürün kararıdır — başvuran kişinin
 * ili belli olsa da mezun/paydaş kabulü ekosistem düzeyinde bir karardır.
 */
export function disBasvuruYonetebilirMi(kullanici: OturumKullanicisi): boolean {
  return projeYoneticisiMi(kullanici);
}

/**
 * Mentörlük başvurusu YAPABİLİR mi? (7 Ağustos 2026)
 *
 * ÖĞRENCİ DIŞINDA herkes: öğretmen, il koordinatörü, proje yöneticisi, mezun
 * ve paydaş temsilcisi. Dışarıdan gelenler bunu başvuru formundan istiyor;
 * içerideki kullanıcılar Panel'den başvuruyor.
 *
 * ÖĞRENCİ HARİÇ ve bu bilinçli: mentörlük, 18 yaş altı bir kullanıcıyla
 * birebir yazışma hakkı doğurur ve o hakkın karşı tarafı yetişkin olmalıdır.
 * Akran desteği için "akran eğitimi" kaydı ve panodaki ekip arkadaşı ilanı
 * zaten var.
 */
export function mentorlukBasvurabilirMi(kullanici: OturumKullanicisi): boolean {
  return !ogrenciMi(kullanici) && kullanici.roller.length > 0;
}

/**
 * Mentörlük başvurusunu ONAYLAYABİLİR mi?
 *
 * İl koordinatörü ve proje yöneticisi. Koordinatör kendi ilindeki başvuruları
 * görür; proje yöneticisinin il sınırı yoktur (istek: "proje yöneticisi de
 * onaylayabilir mentörü").
 *
 * KAPSAM AYRIMI BURADA DEĞİL sorguda yapılır (`mentorlukKapsamFiltresi`):
 * bu fonksiyon "ekranı görebilir mi" sorusuna cevap veriyor, "hangi satırları
 * görür" sorusuna değil — projedeki her yetki kararında olduğu gibi.
 */
export function mentorlukOnaylayabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return ilKoordinatoruMu(kullanici) || projeYoneticisiMi(kullanici);
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

/**
 * Danışman öğretmen yalnızca okul içi faaliyet açabilir.
 *
 * ÖĞRENCİ DE FAALİYET AÇABİLİR ve kapsam sınırı yoktur: okul, il ve ulusal
 * kapsamın üçünü de önerebilir. Sınır kapsamda değil ONAYDA kuruldu — öğrencinin
 * açtığı faaliyet hiçbir kapsamda kendiliğinden yayına girmez
 * (bkz. faaliyetOnayGerekiyorMu), o yüzden kapsamı ayrıca daraltmak öneriyi
 * baştan kesmekten başka bir şey yapmazdı.
 *
 * MEZUN, PAYDAŞ TEMSİLCİSİ VE MENTÖR DE AÇABİLİR (7 Ağustos 2026 · istek:
 * "3. sekme Etkinlikler · Etkinlik Bildir · Görüntüle"). Öğrencideki mantığın
 * aynısı: kapsam serbest, güvence onayda — açtıkları hiçbir etkinlik
 * kendiliğinden yayına girmiyor.
 *
 * OKUL KAPSAMI HARİÇ: dış kullanıcının kurum kodu yoktur, "kendi okulu" diye
 * bir yer yok. Bir okulun içine etkinlik açmak, o okulun sorumlusunun işidir
 * (bkz. faaliyetYeriBelirle — kurumsuz kullanıcıda zaten hata veriyor).
 *
 * DİKKAT: bu, dış kullanıcının etkinliğe KATILIMCI olarak başvurabildiği
 * anlamına gelmez; o kapı ayrıdır ve kapalı kalmaya devam ediyor
 * (bkz. basvuruYapabilirMi).
 */
export function faaliyetAcabilirMi(
  kullanici: OturumKullanicisi,
  kapsam: Kapsam,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (ilKoordinatoruMu(kullanici)) return true;
  if (ogrenciMi(kullanici)) return true;
  if (disKullaniciMi(kullanici)) return kapsam !== "OKUL";
  if (danismanMi(kullanici)) return kapsam === "OKUL";
  return false;
}

/**
 * Faaliyet onaya tabi mi?
 *
 * İki durum var:
 *   1. İl koordinatörünün açtığı ULUSAL faaliyet — ülke geneline açılan bir
 *      çağrıyı merkez görmeden yayına almıyoruz.
 *   2. Öğrencinin açtığı HER faaliyet — kapsamı ne olursa olsun. Öğrenci
 *      etkinliği düzenleyebilir ama 18 yaş altı bir kullanıcının açtığı
 *      çağrının okul dışına (hatta okul içine) sorumlusuz çıkması olmaz.
 */
export function faaliyetOnayGerekiyorMu(
  kullanici: OturumKullanicisi,
  kapsam: Kapsam,
): boolean {
  if (projeYoneticisiMi(kullanici)) return false;
  if (ogrenciMi(kullanici)) return true;
  /*
   * Mezun, paydaş temsilcisi ve mentörün açtığı HER etkinlik — kapsamı ne
   * olursa olsun. Gerekçe öğrencidekinden farklı: yaş değil, EKOSİSTEM DIŞI
   * kimlik. Bu kişilerin kimliği EBA'dan gelmiyor, bir okul ya da il görevine
   * bağlı değiller; adlarına ilan edilen bir MEB etkinliğinin sorumlusu
   * olmadan yayına çıkması olmaz.
   */
  if (disKullaniciMi(kullanici)) return true;
  /*
   * 3. Danışman öğretmenin açtığı faaliyet — ilin koordinatörü görmeden
   *    yayına girmez. Koordinatör ilinde ne yapıldığından sorumludur ve
   *    okullardaki etkinlikleri ancak onaydan geçirirse görebilir.
   *
   * MEVCUT KAYITLAR ETKİLENMEZ: bu karar yalnızca yeni açılan faaliyette
   * verilir, veritabanındaki ONAY_GEREKMEZ satırları olduğu gibi kalır.
   */
  if (danismanMi(kullanici)) return true;
  return kapsam === "ULUSAL" && ilKoordinatoruMu(kullanici);
}

/**
 * İl koordinatörü bu faaliyeti onaylayabilir mi?
 *
 * Kapı, faaliyeti KİMİN açtığına bakar: öğrenci, danışman öğretmen ve dış
 * kullanıcı (mezun/paydaş/mentör) ilin koordinatörünün sorumluluk alanındadır.
 * Koordinatörün ve merkezin kendi açtığı faaliyet buradan geçmez — kimse kendi
 * işini onaylamaz.
 *
 * DIŞ KULLANICI DA BURADAN GEÇER (7 Ağustos 2026): ilinin koordinatörü, mezunu
 * ya da paydaş kurumu tanıyan en yakın sorumludur. Kapı yalnızca merkeze
 * bırakılsaydı, bir paydaşın önerdiği il etkinliği YEĞİTEK sırası gelene kadar
 * beklerdi.
 *
 * Onay merkeze bırakılsaydı bir okulun kendi içindeki etkinlik YEĞİTEK sırası
 * gelene kadar bekler ve pratikte ölürdü; ilin koordinatörü hem kişiyi hem
 * okulu tanıyan en yakın sorumludur. Merkez de yetkilidir (bkz.
 * faaliyetOnaylayabilirMi), hangisi önce karar verirse faaliyet sonuçlanır —
 * ayrı bir sıra kurulmaz.
 */
export function ilKoordinatoruOnaylayabilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  /*
   * Üç bayrak, KOORDINATOR_ONAYINA_TABI_ROLLER'ın karşılığıdır: öğrenci,
   * danışman öğretmen ve dış kullanıcı (mezun + paydaş temsilcisi). Bayraklar
   * `faaliyetKapsamiCikar`da aynı rollerden üretiliyor; liste değişirse orası
   * ve buradaki üçlü birlikte güncellenmeli — testi
   * `yetki-izinler.test.ts` tutuyor.
   */
  const onayaTabi =
    faaliyet.duzenleyenOgrenciMi === true ||
    faaliyet.duzenleyenDanismanMi === true ||
    faaliyet.duzenleyenDisKullaniciMi === true;
  if (!onayaTabi) return false;
  if (!ilKoordinatoruMu(kullanici)) return false;

  const faaliyetIli = faaliyet.kapsamIlKodu ?? faaliyet.ilKodu;
  return faaliyetIli !== null && koordinatorIlKodu(kullanici) === faaliyetIli;
}

/**
 * Faaliyeti onaylama/reddetme yetkisi.
 *
 * Faaliyet verilmezse yalnızca "her koşulda onaylayabilen" proje yöneticisi
 * geçer; il koordinatörünün yetkisi hangi faaliyet olduğuna bağlıdır ve
 * faaliyetsiz sorulduğunda yanıt "hayır"dır.
 */
export function faaliyetOnaylayabilirMi(
  kullanici: OturumKullanicisi,
  faaliyet?: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (!faaliyet) return false;
  return ilKoordinatoruOnaylayabilirMi(kullanici, faaliyet);
}

/**
 * Faaliyetin kullanıcıya görünüp görünmediğini söyler. Onay bekleyen faaliyet
 * yalnızca düzenleyene, onaylamaya yetkili olana ve proje yöneticisine görünür.
 */
export function faaliyetGorunurMu(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (faaliyet.duzenleyenKullaniciId === kullanici.id) return true;
  // Onaylayacak kişi, onaylayacağı şeyi görmek zorunda.
  if (ilKoordinatoruOnaylayabilirMi(kullanici, faaliyet)) return true;
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
/**
 * Faaliyet raporunu yazabilir mi?
 *
 * Ek yükleme yetkisinden GENİŞTİR ve bu bilinçlidir: il koordinatörü, ilindeki
 * HER biten faaliyetin raporunu yazabilir — o faaliyeti kendisi açmamış olsa
 * bile. Raporlama ilin sorumluluğudur; okulundaki bir öğretmen etkinliği
 * yapıp raporu yazmadan görevden ayrılırsa faaliyet raporsuz kalmamalı.
 *
 * Ek yükleme yetkisi bundan dar kalmaya devam ediyor: koordinatörün başkasının
 * faaliyetine dosya eklemesi ayrı bir müdahaledir ve gerekmiyor.
 *
 * Kapsayan roller: faaliyeti açan, ilin koordinatörü, yetki devrolmuşsa
 * koordinatör ve proje yöneticisi.
 */
export function faaliyetRaporuYazabilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (ekYukleyebilirMi(kullanici, faaliyet)) return true;

  if (!ilKoordinatoruMu(kullanici)) return false;
  const faaliyetIli = faaliyet.kapsamIlKodu ?? faaliyet.ilKodu;
  return faaliyetIli !== null && koordinatorIlKodu(kullanici) === faaliyetIli;
}

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

/**
 * BAŞKASININ yürüttüğü danışmanlığı sonlandırabilir mi? (10 Ağustos 2026 ·
 * istek: "öğretmen öğrenciyi bırakabilsin, gerekirse koordinatör de
 * bırakabilsin")
 *
 * İl koordinatörü ve proje yöneticisi. Danışmanın KENDİ öğrencisini bırakması
 * bu kapıdan geçmez — o zaten kendi kaydıdır ve ayrı sorulur.
 *
 * Danışman öğretmen buraya girmez ve bu bilinçli: bir öğretmenin başka bir
 * öğretmenin öğrencisini danışmanlıktan çıkarabilmesi, öğrenci çekme kapısı
 * açardı (aynı gerekçeyle "yalnızca danışmansız öğrenci alınabilir" kuralı
 * var — bkz. ogrenciyiDanismanligaAlEylemi).
 *
 * KAPSAM BURADA SORULMAZ: bu fonksiyon "ekranda düğme olsun mu" sorusuna
 * cevap verir; "bu öğrenci onun kapsamında mı" sorusu merkezi kapsam
 * filtresine aittir ve eylemde ayrıca sorulur.
 */
export function danismanligiSonlandirabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return ilKoordinatoruMu(kullanici) || projeYoneticisiMi(kullanici);
}

/**
 * Etkinlik listesi CSV olarak indirilebilir mi? (10 Ağustos 2026 · istek:
 * "öğrenci etkinliklerinde CSV indir kalkacak")
 *
 * ÖĞRENCİ HARİÇ herkes. Gerekçe gizlilik DEĞİL: dosya zaten kişinin ekranda
 * gördüğü kayıtlardan fazlasını içermiyor, başvuran adı da hiç girmiyor
 * (bkz. etkinlikler/disa-aktar). Kapının sebebi İŞLEV: CSV bir raporlama
 * aracı ve raporlama öğrencinin işi değil — öğrenci için etkinlik listesi
 * başvurulacak bir çağrı panosu, dökümü alınacak bir kayıt tablosu değil.
 *
 * KAPI HEM EKRANDA HEM ROTADA sorulur: bağlantıyı gizlemek yetmez, adres
 * çubuğuna /panel/etkinlikler/disa-aktar yazan öğrenci de dosyayı almamalı.
 */
export function faaliyetDisaAktarabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return !ogrenciMi(kullanici);
}

// ---------------------------------------------------------------------------
// Yorum
// ---------------------------------------------------------------------------

/**
 * Faaliyeti görebilen herkes yorum yazabilir — dış kullanıcılar HARİÇ.
 *
 * İstisnanın sebebi: mezun ve paydaş temsilcisi ulusal ve kendi ilindeki
 * etkinlikleri takvimde görüyor, dolayısıyla "görebiliyorsa yazabilir" kuralı
 * onlara faaliyet altında söz hakkı verirdi. Faaliyet yorumları ağırlıklı
 * olarak 18 yaş altı katılımcıların bulunduğu bir alan ve moderasyonu
 * faaliyeti açan kişide; oraya, etkinliğe katılamayan bir dış kullanıcıyı
 * sokmak dar başlangıç kararıyla bağdaşmıyor.
 *
 * Bu bir yasak değil SIRALAMA: mezunun etkinlik altında konuşması istenirse
 * açılacak yer burasıdır, ama önce o yorumun kime görüneceği ve kimin
 * moderasyonunda olduğu kararlaştırılmalı.
 */
export function yorumYazabilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (disKullaniciMi(kullanici)) return false;
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
 *
 * MEZUN VE PAYDAŞ TEMSİLCİSİ DE DIŞARIDADIR. Bu, kalıcı bir karar değil DAR
 * BAŞLANGIÇTIR: iki rol yeni ve ne yapabilecekleri satır satır kararlaştırılmış
 * değil. Eksik yetki sonradan verilebilir; fazla verilmiş yetkiyle görülen veri
 * geri alınamaz. Mezunun etkinliğe eğitmen/katılımcı olarak girmesi istenirse
 * burada açılacak — ama başvuru, katılımcı listesi ve belge akışlarının o rolde
 * ne anlama geldiği önce kararlaştırılmalı.
 */
export function basvuruYapabilirMi(kullanici: OturumKullanicisi): boolean {
  return !projeYoneticisiMi(kullanici) && !disKullaniciMi(kullanici);
}

/**
 * Talep panosunu görebilir mi?
 *
 * `basvuruYapabilirMi`den AYRI tutuldu: pano bir ilan tahtasıdır, faaliyete
 * başvurmakla ilgisi yok. Mezun ve paydaş temsilcisi panoyu görür (sponsorluk,
 * teknik destek, mentorluk ilanları ekosistemin en doğal buluşma noktası) ama
 * faaliyete katılımcı olarak başvuramaz.
 *
 * Merkez personeli yine dışarıda: YEĞİTEK'in takım arkadaşı araması diye bir
 * durum yok, onun duyuru kanalı ayrı.
 */
export function talepPanosuGorebilirMi(kullanici: OturumKullanicisi): boolean {
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

/**
 * Okul Temsilcisi görevini verebilir/kaldırabilir mi?
 *
 * DANIŞMAN YALNIZCA KENDİ ÖĞRENCİSİNE (10 Ağustos 2026 · istek: "danışmanı
 * olmadığı öğrenciyi okul temsilcisi yapabiliyor, bu bir tezat").
 *
 * Sınır önceden ÖRTÜKTÜ: öğretmenin listesinde zaten yalnızca kendi
 * öğrencileri vardı, dolayısıyla okul kodu eşitliği yetiyordu. Okulundaki
 * danışmansız öğrenciler de listeye girince (bkz. ogrenciKapsamFiltresi) örtük
 * sınır düştü ve öğretmen, danışmanı olmadığı bir öğrenciye görev verebilir
 * hâle geldi. Kural artık açıkça yazılı: göreceği her öğrenciye görev veremez,
 * yalnızca sorumluluğunu üstlendiklerine.
 *
 * MERKEZ HARİÇ: proje yöneticisinin danışmanlığı yoktur ve okulda danışman
 * kalmadığında düzeltmeyi yapabilecek tek kişidir; ona bu koşul sorulmaz.
 */
export function okulTemsilcisiAtayabilirMi(
  kullanici: OturumKullanicisi,
  kurumKodu: number,
  /** Öğrenci bu kullanıcının danışmanlığında mı? */
  kendiOgrencisiMi: boolean,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (!kendiOgrencisiMi) return false;
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

/**
 * Çalışma Grubu Yöneticisi atama yetkisi — YALNIZCA MERKEZ (11 Ağustos 2026 ·
 * istek: "koordinatör öğrenciyi çalışma grubu yöneticisi yapamasın, çalışma
 * grubu üyesi yapabilsin sadece").
 *
 * NİYE AYRI BİR KAPI: bu rol `ilTemsilcisiAtayabilirMi` ile aynı kapıdan
 * geçiyordu, yani il koordinatörü kendi ilindeki bir öğrenciyi yönetici
 * yapabiliyordu. Kapıyı paylaşmaları bir varsayıma dayanıyordu — "atama kararı
 * ilindir" — ve o varsayım çalışma grubunda tutmuyor: ÇALIŞMA GRUBU İL DEĞİL
 * ÜLKE GENELİ bir yapıdır. Bir grubun yöneticisi tek kişidir ve o kişi tüm
 * ülkedeki gruba karşı sorumludur; her ilin koordinatörü kendi ilinden birini
 * atayabilseydi, aynı grup için 81 il birbiriyle yarışır ve "önce atayan
 * kazanır" gibi bir kural doğardı.
 *
 * ÜYELİK BUNUN DIŞINDA ve koordinatörde KALIYOR: öğrenciyi gruba yazmak ayrı
 * bir yetkidir (bkz. ogrenciCalismaGrubuYonetebilirMi) ve o kapı
 * değiştirilmedi. İstek de tam olarak bu ayrımı söylüyor — üye evet, yönetici
 * hayır.
 */
export function calismaGrubuYoneticisiAtayabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

/**
 * İlçe Temsilcisi atama yetkisi — ilçenin BAĞLI OLDUĞU İL üzerinden sorulur.
 *
 * Sistemde ilçe düzeyinde bir görevli yoktur (RolKodu'nda ILCE_KOORDINATOR
 * diye bir değer yok); ilçe, ilin içindeki bir basamaktır ve temsilcisini o ilin
 * koordinatörü belirler. Bu yüzden fonksiyon ilçe kodunu değil il kodunu alır:
 * ilçe kodundan ili çözmek veritabanına gitmek olurdu ve bu dosya saf kalmalı.
 * Çağıran, öğrencinin ilçesiyle ilinin tutarlılığını sorgudan alır.
 */
export function ilceTemsilcisiAtayabilirMi(
  kullanici: OturumKullanicisi,
  ilKodu: string,
): boolean {
  return ilTemsilcisiAtayabilirMi(kullanici, ilKodu);
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
// Öğrenci ve öğretmen envanteri
// ---------------------------------------------------------------------------

/**
 * Öğrenci envanterini (liste ekranı ve CSV çıktısı) görebilir mi?
 *
 * KAPI EKRAN SEVİYESİNDE DE KAPALI OLMALI (11 Ağustos 2026). Ekran önceden
 * yalnızca ÖĞRENCİYİ eliyordu; kalan herkes listeyi açabiliyor ve kapsam
 * filtresi sayesinde "0 kayıt" görüyordu. Mezun, paydaş temsilcisi, mentör ve
 * görev almamış öğretmen için bu ekran hiç açılmamalı:
 *
 *   · Boş liste, veri sızdırmasa da YANLIŞ BİLGİ verir — "sistemde öğrenci
 *     yok" diye okunur.
 *   · Asıl mesele kırılganlık: erişimi tek başına `ogrenciKapsamFiltresi`nin
 *     varsayılan dalı (HICBIRI) tutuyordu. O dalda bir gün yapılacak bir
 *     genişletme, bu ekranı kimse fark etmeden veri gösterir hâle getirirdi.
 *     Yetki iki katmanda birden sorulur (permissions.md · Bölüm 4).
 *
 * Liste `ogretmenEnvanteriGorebilirMi` ile AYNI: kapsam filtresinde kayıt
 * görebilen roller tam olarak bunlar (danışman kendi okulu, koordinatör kendi
 * ili, merkez ülke geneli).
 */
export function ogrenciEnvanteriGorebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return (
    projeYoneticisiMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    danismanMi(kullanici)
  );
}

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
