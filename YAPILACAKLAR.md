# Yapılacaklar

31 Temmuz 2026 tarihli istek listesinin takibi. `duzeltmeler.txt` ham istek
metnidir; bu dosya o isteklerin **durumunu** tutar.

Durum işaretleri: `[x]` bitti · `[ ]` bekliyor · `[?]` karar/bilgi bekliyor

---

## 0. Hatalar (önce bunlar)

- [x] **Faaliyet açıklamasındaki linkler tıklanmıyor**
      → `src/lib/metin/baglanti.ts` + `src/components/MetinBaglantili.tsx`.
      Metin HTML'e çevrilmiyor, parçalanıp basılıyor (XSS'e kapalı).
- [x] **Faaliyet görselleri görünmüyor** — ÇÖZÜLDÜ. Sebep veri değil,
      basePath'ti: `<img src={`/panel/...`}>` ham öznitelik olduğu için
      `/genctek` öneki eklenmiyordu, Apache 404 veriyordu.
- [x] **Rol envanterinde "koordinatör ata" hata veriyor** — ÇÖZÜLDÜ.
      Atama mantığında sorun yoktu; "Koordinatör ata" BAĞLANTISI ham `<a>`
      olduğu için `/genctek` öneki düşüyor ve Apache 404 basıyordu. Hatanın
      Apache'den gelmesi ("ErrorDocument") ipucuydu.

      Kök neden ikisinde de aynı: ham HTML öznitelikleri basePath almaz.
      `uygulamaYolu()` eklendi (src/lib/ortam.ts), altı çağrı yeri düzeltildi,
      `tests/ham-yol-taramasi.test.ts` tekrarını engelliyor.

---

## 1. Öğrenci paneli

- [x] "Kazanımlarım ve üretimlerim" → **"Ekosisteme katkı"**
- [x] "Rozetlerim" → **"Katkılarım"** (sayfa içi kart: "Katkı nişanlarım")
- [x] **İlçe temsilcisi** rolü — şema + etiket hazır
- [x] İlçe temsilciliğinin ekranlarda gösterilmesi (rol atama, profil, listeler)
      → Görev Rolleri ekranından **ilin koordinatörü** verir (ilçe düzeyinde
      görevli yok). Kapsam göreve yazılır, dönem başına tek kişi kısıtı
      veritabanında (`ux_ilce_temsilcisi`). Unvan öğrenci listesinde, profilde
      ve katkı kartında tam yazılır ("Ankara / Çankaya İlçe Temsilcisi").
- [x] **Katkı kartı**: okul temsilcisi / il temsilcisi / çalışma grupları /
      aldığı görevler tek kartta
      → `src/components/KatkiKarti.tsx`. Aynı bileşen hem öğrencinin kendi
      ekranına hem yetkilinin gördüğü profile basılır. Geçmiş dönem görevleri
      dönemiyle birlikte durur, silinmez.
- [x] **Panelim**: açık başvurulardan son 5'i + "tüm faaliyetler" bağlantısı
- [x] **Panelim**: başvurabileceği açık faaliyetler
      → İkisi tek kartta birleşti: liste zaten kapsam filtresinden geçiyor,
      her satır ayrıca "başvurabilir misin"i rozetle söylüyor. İki ayrı kart
      aynı faaliyeti iki kez gösterirdi.
- [x] **Yeni kayıt ekle** formu: GençTek etkinlikleri + "diğer" seçeneği,
      yüz yüze / online, hedef kitle alanı
      → Program listeden seçilir, "Diğer" serbest metne düşer: yalnızca liste
      olsaydı listede olmayan etkinlik girilemez, yalnızca serbest metin olsaydı
      aynı program onlarca yazımla girilip sayılamazdı.
- [x] **"Yaptığım ürünler"** bölümü
      → Ayrı tablo değil, `ogrenci_kazanim`'ın `tip=URUN` kayıtları; Katkılarım
      ekranında ve öğrenci profilinde kendi kartında. Kart ekleme kısayolu
      verir, silme yolu vermez (silme tek yerde: profil).
- [x] Profil iletişim bilgilerine **GitHub · kişisel site · LinkedIn**
      → Beyandır, yalnızca biçim doğrulanır; protokolsüz adres reddedilmez
      tamamlanır (`github.com/ali` → `https://github.com/ali`).
- [x] **Öğrenci faaliyet oluşturabilsin** — onay il koordinatörü ve YEĞİTEK
      yöneticilerine düşsün (büyük iş: yetki + onay akışı + bildirim)
      → Kapsam sınırı yok (okul/il/ulusal), sınır onayda: öğrencinin açtığı her
      faaliyet `BEKLIYOR` başlar. Onayı ilin koordinatörü de YEĞİTEK de
      verebilir, **ilk karar geçerlidir**. Açılışta ikisine, sonuçta öğrenciye
      bildirim gider; onaylı öneride tarih değişirse onay düşer ve uyarı
      yeniden gider.

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
- [x] Daha önce katıldığı kendi etkinlikleri
      → Panelim'de son 5 tamamlanmış katılım + Katkılarım ekranında tam liste.
      "Seçildin" yetmez, tarih geçmiş ve faaliyet iptal edilmemiş olmalı.
- [x] Öğretmene de **katkı sistemi**
      → Katkılarım ekranı: katkı kartı (görevler, danışmanlık, düzenlediği
      faaliyetler), öğretmene özel nişanlar, profilde kazanım kaydı. Öğrenci
      listesi birebir kullanılamazdı — öğretmenin katkısı danışmanlık ve
      faaliyet düzenlemede, temsilcilikte değil.
- [x] Kendi faaliyetinin **başvuru listesini CSV** alabilme
      → Faaliyet detayındaki Başvurular kartından; telefon/e-posta yok,
      erişim logu yazılır. Yalnızca değerlendirme yetkisi olan görür.

---

## 3. İl koordinatörü

- [x] Paydaş türlerine **GençTek üniversitesi** ve **Mezun** — şema + etiket
- [x] Paydaş eklerken **il kısıtı kalktı**. Ekleme yetkisi ilden bağımsız
      (`paydasEkleyebilirMi`); düzenleme dar kaldı (kendi ili **veya** kendi
      eklediği kayıt). Kapsam filtresi genişletildi ki başka ile eklenen
      kayıt listeden kaybolmasın.
- [x] Danışman öğretmenlerinin girdiği etkinlikleri **görme ve onaylama**
      → Öğretmen faaliyeti artık ilin koordinatörünün onayını bekliyor.
      Bildirim yalnızca koordinatöre gider; koordinatörsüz ilde merkeze düşer.
- [x] Başka ildeki etkinliğe başvuran kendi öğrencilerini görme
      → `/panel/il-disi-basvurular`
- [x] **Çift onay akışı**. İkinci onay YENİ BİR ADIM DEĞİL: düzenleyenin
      değerlendirmesi zaten etkinliğin yapıldığı ilin kararıdır. Eklenen adım,
      öğrencinin kendi ilinin izni. Kaynak il karar vermeden değerlendirme
      yapılamıyor; ret gerekçesi zorunlu.
- [x] Biten etkinlik için **faaliyet raporu sayfası**
      → `/panel/faaliyetler/[id]/rapor`. Katılım sayıları (toplam + tekil),
      katılımcı listesi, görseller ve değerlendirme metni bir arada; Word/Excel
      indirme de burada. Sayılar rapora KOPYALANMAZ, her açılışta
      başvurulardan hesaplanır. Rapor ancak faaliyet bittikten sonra yazılır
      (çok günlüde bitiş tarihine bakılır) ve iptal edilmiş faaliyette yazılmaz.
- [x] **Gizlilik / taahhütname imzası**
      → `/panel/taahhut`. Metin Yönetim ekranından düzenlenebilir; güncellenince
      onay eskir ve yeniden istenir (aydınlatma metniyle aynı desen). Erişim
      ENGELLENMEZ, şeritle uyarılır — acil bir durumda sistemin kilitlenmesi
      korumaktan çok zarar verirdi ve erişimler zaten kayda geçiyor.

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

- [x] Faaliyete katılan **öğrenci sayısı: toplam ve tekil (uniq)**
      Panelde "Faaliyet katılımı" kartı; ikisi ayrı gösteriliyor çünkü biri
      programın yükünü, diğeri kaç farklı kişiye ulaşıldığını söyler.
- [x] **Panelim istatistik kartları** — "Ekosistem sayıları" bölümü. İlçe
      temsilcisi ve "kaç il boş" da eklendi. Çalışma grubunda SEÇİM değil
      ÖĞRENCİ sayılıyor (bir öğrenci çok grup seçebiliyor).
- [x] Faaliyet raporunu **Word / Excel** olarak alabilme
      → `/panel/faaliyetler/[id]/rapor` (`?bicim=word`). Yalnızca merkeze açık.
      Word = HTML gövdeli `.doc` (kütüphane bağımlılığı eklemedik);
      Excel = mevcut CSV altyapısı (sahte `.xls` Excel'de uyarı çıkarırdı).
- [x] **Tüm öğrenci ve öğretmenlere toplu bildirim + e-posta**
      → `/panel/duyurular`. Geri alınamaz olduğu için onay kutusu zorunlu ve
      alıcı sayısı seçenekte yazılı. Bildirimler tek `createMany` ile yazılıyor;
      e-posta kopyası döngüde, alıcı sayısı büyürse kuyruğa taşınmalı.

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

- [x] **Yedekleme cron'u kuruldu** — `/usr/local/bin/genctek-yedek`, her gece
      02:00, günlük `/var/log/genctek-yedek.log`. Elle bir kez çalıştırılıp
      doğrulandı. Cron satırında `sudo -u postgres` YOK: olsaydı yüklenen
      dosyalar sessizce yedeklenmezdi (depolama arşivi 120 bayt kalırdı).
- [x] **Geri yükleme provası yapıldı** (31 Temmuz 2026) — yedek geçerli:
      10 kullanıcı, 81 il, 92 kısıt, 11 migration geri yüklendi, canlıya
      dokunulmadı.

      **Prova bir hata yakaladı:** rehberdeki geri yükleme komutu çalışmıyordu.
      Yedekler `600 root:root` olduğu için `sudo -u postgres pg_restore <dosya>`
      "Permission denied" alıyor. Doğrusu içeriği boruyla geçirmek:
      `sudo cat <dump> | sudo -u postgres pg_restore -d genctek`.
      `dagitim/yedek.sh` ve DAGITIM.md düzeltildi.
- [ ] Root ve DirectAdmin **parolalarının değiştirilmesi** — SENDE. Parolayı
      ben değiştirmiyorum: yanlış giderse sunucuya erişimin kesilir ve bu
      senin kararın olmalı.
- [x] `guncelle.bat` silindi (işaret ettiği betik yoktu, commit edilmemişti)
- [ ] **GitHub deploy key** — sunucu tarafı HAZIR: `genctek` kullanıcısı için
      anahtar üretildi, `~/.ssh/config` yazıldı. Kalan tek adım GitHub'da
      **Settings → Deploy keys → Add deploy key** ile açık anahtarı eklemek.
      Eklenene kadar `origin` bundle dosyasında bırakıldı; erkenden
      çevirseydim `guncelle.sh` çalışmaz hâle gelirdi.

      Açık anahtar:
      `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIP10DkXWh+JLUo5JZBAcRd91Zyt37Izge4PFVI17g+BP genctek-deploy@aiotechs`
