/**
 * KVKK kuralları — references/domain-rules.md Bölüm 10.
 *
 * Kullanıcıların büyük bölümü 18 yaş altı olduğu için aydınlatma yükümlülüğü
 * ve saklama süresi burada gevşetilemez. Bu dosya saf tutulur: veritabanına
 * gitmez, "şimdi"yi parametre olarak alır, böylece kararlar birim testle
 * sınanabilir.
 */

export const AYAR_KVKK_METNI = "KVKK_AYDINLATMA_METNI";
export const AYAR_ERISIM_LOGU_SAKLAMA_AYI = "ERISIM_LOGU_SAKLAMA_AYI";
export const AYAR_BILDIRIM_SAKLAMA_AYI = "BILDIRIM_SAKLAMA_AYI";

/**
 * Varsayılan saklama süreleri (ay).
 *
 * Erişim logu, KVKK denetiminin dayanağı olduğu için bildirimden uzun tutulur:
 * "kim hangi öğrenci kaydını ne zaman gördü" sorusu geçmişe dönük sorulur.
 * Bildirim ise kullanıcıya ulaştıktan sonra kanıt değeri taşımaz.
 */
export const VARSAYILAN_ERISIM_LOGU_SAKLAMA_AYI = 24;
export const VARSAYILAN_BILDIRIM_SAKLAMA_AYI = 12;

/**
 * Öğrencinin aydınlatma metnini (yeniden) onaylaması gerekiyor mu?
 *
 * Metin güncellendiğinde eski onay geçersizleşir: kişi artık başka bir metni
 * onaylamış olur. Karşılaştırma sistem ayarının güncelleme tarihine bakar,
 * ayrı bir sürüm alanı tutulmaz.
 */
export function aydinlatmaOnayiGerekiyorMu(girdi: {
  onayTarihi: Date | null;
  metinGuncellemeTarihi: Date | null;
}): boolean {
  if (girdi.onayTarihi === null) return true;
  if (girdi.metinGuncellemeTarihi === null) return false;
  return girdi.onayTarihi < girdi.metinGuncellemeTarihi;
}

/** Bu tarihten eski kayıtlar saklama süresini doldurmuştur. */
export function saklamaSonTarihi(simdi: Date, ay: number): Date {
  const sinir = new Date(simdi);
  sinir.setMonth(sinir.getMonth() - ay);
  return sinir;
}

export const VARSAYILAN_AYDINLATMA_METNI = `GençTek Ekosistemi Kurumsal Bilgi Sistemi — Aydınlatma Metni

1. Veri sorumlusu
Bu sistem, Millî Eğitim Bakanlığı Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü (YEĞİTEK) adına işletilmektedir. Kişisel verileriniz 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla YEĞİTEK tarafından işlenir.

2. İşlenen veriler
Kimlik ve öğrenim bilgileriniz (ad, soyad, cinsiyet, okul, kurum kodu, il, ilçe, sınıf, eğitim-öğretim yılı) e-Okul/EBA kayıtlarından alınır ve bu sistemde değiştirilemez. Bunlara ek olarak yalnızca sizin girdiğiniz iletişim bilgileri (e-posta, telefon), seçtiğiniz çalışma grupları, danışman öğretmen tercihiniz, faaliyet başvurularınız ve başvuru gerekçeleriniz ile yazdığınız yorumlar işlenir.

3. İşleme amacı ve hukuki sebep
Veriler; danışman öğretmen eşleştirmesi, çalışma grubu takibi, faaliyet başvurusu ve değerlendirmesi ile ekosistemin yönetimi amacıyla, Bakanlığın kanunla verilen görevlerini yerine getirmesi hukuki sebebine dayanılarak işlenir.

4. Verilere kimler erişir
Erişim, görev kapsamıyla sınırlıdır. Danışman öğretmeniniz yalnızca kendi okulundaki danışmanlığını üstlendiği öğrencileri, il koordinatörü yalnızca kendi ilindeki öğrencileri, proje yöneticisi ise yönetim görevi gereği tüm kayıtları görebilir. Hiçbir öğrenci başka bir öğrencinin listesini veya kişisel verisini göremez.

5. Kayıt ve denetim
Kişisel verilerin her görüntülenmesi ve değiştirilmesi; işlemi yapan kullanıcı, tarih ve IP adresiyle birlikte kayıt altına alınır. Bu kayıtlar yalnızca kötüye kullanım denetimi için tutulur.

6. Saklama süresi
Faaliyet ve başvuru kayıtları, ekosistemin geçmişe dönük raporlaması için öğrencilik döneminiz boyunca saklanır. Erişim kayıtları 24 ay, sistem bildirimleri 12 ay sonunda silinir.

7. Haklarınız
Kanun'un 11. maddesi uyarınca; verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme ve işlemeye itiraz etme haklarına sahipsiniz. e-Okul kaynaklı bilgilerdeki hatalar bu sistemden düzeltilemez; okul idarenize başvurmanız gerekir. Diğer talepleriniz için okul idareniz aracılığıyla Bakanlığa başvurabilirsiniz.

8. Yaş durumu
On sekiz yaşından küçükseniz bu metni velinizle birlikte okumanız beklenir.`;
