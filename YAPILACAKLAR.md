# Yapılacaklar

31 Temmuz 2026 tarihli istek listesinin takibi. `duzeltmeler.txt` ham istek
metnidir; bu dosya o isteklerin **durumunu** tutar.

Durum işaretleri: `[x]` bitti · `[ ]` bekliyor · `[?]` karar/bilgi bekliyor

---

## 0. Hatalar (önce bunlar)

- [x] **Faaliyet açıklamasındaki linkler tıklanmıyor**
      → `src/lib/metin/baglanti.ts` + `src/components/MetinBaglantili.tsx`.
      Metin HTML'e çevrilmiyor, parçalanıp basılıyor (XSS'e kapalı).
- [ ] **Faaliyet görselleri görünmüyor**
      Yerelde üretilemedi: dev veritabanında hiç faaliyet eki yok (0 kayıt).
      Servis rotası (`faaliyetler/[id]/ekler/[ekId]/route.ts`) kodu doğru
      görünüyor. **Sunucudaki veriye bakılacak** — dosya diskte var mı,
      `depolama_yolu` kayıtla eşleşiyor mu.
- [?] **Rol envanterinde "koordinatör ata" hata veriyor**
      Üretilemedi. Sade öğretmen ✓, zaten danışman olan öğretmen ✓ (4 öğrenci
      devredildi). Dört hata yolu da okunur mesaj veriyor:
      "Bu ilde görevli bir il koordinatörü zaten var" / "yalnızca öğretmenlere
      verilir" / "Geçersiz il" / "Kullanıcı bulunamadı".
      **Gereken: görülen hata mesajının tam metni.** Bunlardan biriyse hata
      değil, kasıtlı uyarı.

---

## 1. Öğrenci paneli

- [x] "Kazanımlarım ve üretimlerim" → **"Ekosisteme katkı"**
- [x] "Rozetlerim" → **"Katkılarım"** (sayfa içi kart: "Katkı nişanlarım")
- [x] **İlçe temsilcisi** rolü — şema + etiket hazır
- [ ] İlçe temsilciliğinin ekranlarda gösterilmesi (rol atama, profil, listeler)
- [ ] **Katkı kartı**: okul temsilcisi / il temsilcisi / çalışma grupları /
      aldığı görevler tek kartta
- [ ] **Panelim**: açık başvurulardan son 5'i + "tüm faaliyetler" bağlantısı
- [ ] **Panelim**: başvurabileceği açık faaliyetler
- [ ] **Yeni kayıt ekle** formu: GençTek etkinlikleri + "diğer" seçeneği,
      yüz yüze / online, hedef kitle alanı
- [ ] **"Yaptığım ürünler"** bölümü
- [ ] Profil iletişim bilgilerine **GitHub · kişisel site · LinkedIn**
- [ ] **Öğrenci faaliyet oluşturabilsin** — onay il koordinatörü ve YEĞİTEK
      yöneticilerine düşsün (büyük iş: yetki + onay akışı + bildirim)

### Kod gerektirmeyen
- [x] **Çalışma grupları** (Bilişim Hukuku, Güvenli İnternet, GençX, Diğer)
      → **Yönetim → Çalışma grupları** ekranından eklenebilir. Silme yok,
      eskiler pasife alınır.

---

## 2. Öğretmen paneli

- [x] Yeni faaliyette **kaç gün süreceği** — bitiş tarihi alanı, süre gösterimi,
      süre değişimi onayı düşürüyor
- [x] **İl koordinatörü kartı** — ad soyad + e-posta. Koordinatörün
      kendisine ve proje yöneticisine gösterilmez.
- [ ] Daha önce katıldığı kendi etkinlikleri
- [ ] Öğretmene de **katkı sistemi**
- [ ] Kendi faaliyetinin **başvuru listesini CSV** alabilme

---

## 3. İl koordinatörü

- [x] Paydaş türlerine **GençTek üniversitesi** ve **Mezun** — şema + etiket
- [x] Paydaş eklerken **il kısıtı kalktı**. Ekleme yetkisi ilden bağımsız
      (`paydasEkleyebilirMi`); düzenleme dar kaldı (kendi ili **veya** kendi
      eklediği kayıt). Kapsam filtresi genişletildi ki başka ile eklenen
      kayıt listeden kaybolmasın.
- [ ] Danışman öğretmenlerinin girdiği etkinlikleri **görme ve onaylama**
- [ ] Başka ildeki etkinliğe başvuran kendi öğrencilerini görme
- [ ] **Çift onay akışı**: önce başvuran öğrencinin koordinatörü, sonra
      etkinliğin yapıldığı ilin koordinatörü
- [ ] Biten etkinlik için **faaliyet raporu sayfası**: kaç öğrenci katıldı,
      kim katıldı, etkinliğe ait görsel ekleme
- [ ] **Gizlilik / taahhütname imzası** — koordinatör öğretmen verilerini
      görebildiği için

### Cevaplanmış sorular
- [x] **"Koordinatör değişince paydaşları yeni koordinatör görebilecek mi?"**
      → **Evet, kendiliğinden.** Paydaş kaydı kişiye değil **ile** bağlı;
      devir işlemi gerekmiyor, yeni koordinatör ilin tüm kayıtlarını görür.
      (Not: il kısıtı kalkınca kapsam filtresine "kendi eklediği kayıtlar"
      koşulu da eklendi. Bu il bağını değiştirmez — koordinatör ayrılsa da
      kayıt ilinde kalır ve yeni koordinatöre geçer; ek koşul yalnızca
      **başka ile** yazılmış kayıtların ekleyende görünmesini sağlar.)
- [x] **Paydaş giriş başlıkları (analiz 3.1)** → **zaten mevcut**: il, kurum
      adı, tür, yetkili kişi, e-posta, telefon, adres, iş birliği alanı, notlar.

---

## 4. Proje yöneticisi

- [ ] Faaliyete katılan **öğrenci sayısı: toplam ve tekil (uniq)**
- [ ] **Panelim istatistik kartları**: toplam öğrenci · çalışma grubuna kayıtlı
      öğrenci · okul temsilcisi · il temsilcisi · danışman öğretmen ·
      koordinatör öğretmen sayısı
- [ ] Faaliyet raporunu **Word / Excel** olarak alabilme
- [ ] **Tüm öğrenci ve öğretmenlere toplu bildirim + e-posta**

---

## 5. İletişim modülü (en büyük iş, tek başına ele alınmalı)

- [ ] Öğretmen–öğrenci mesajlaşması
- [ ] Öğrencinin ilgili çalışma alanı için **başka öğrenci arayabilmesi**
- [ ] **Duyuru** yapabilme
- [ ] **Koordinatör onaylı iletişim**: koordinatör iletişim taleplerini
      onaylayacak ve sistem üzerindeki yazışmayı görebilecek (okul da görsün)

> Bu öbek kişisel veri ve 18 yaş altı koruması açısından en hassas olanı.
> Tasarıma başlamadan önce KVKK tarafının netleşmesi gerekiyor.

---

## Sunucu / işletim

- [ ] **Yedekleme cron'u kurulu değil** — `dagitim/yedek.sh` hazır, cron kaydı
      yok. Yedekler şu an elle alınıyor. Komutlar DAGITIM.md Bölüm 9'da.
- [ ] **Geri yükleme provası** hiç yapılmadı (DAGITIM.md kontrol listesi
      maddesi). Denenmemiş yedek yedek değildir.
- [ ] Root ve DirectAdmin **parolalarının değiştirilmesi**
- [ ] `guncelle.bat` yerelde duruyor ama işaret ettiği betik yok — silinecek
      ya da tamamlanacak
- [ ] Sunucu deposu GitHub yerine **bundle dosyasından** besleniyor. Kalıcı
      çözüm: GitHub deploy key + `origin`'in gerçek depoya çevrilmesi.
