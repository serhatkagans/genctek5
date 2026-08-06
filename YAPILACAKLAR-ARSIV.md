# Yapılacaklar — ARŞİV (kapanmış liste)

> Bu dosya **kapanmıştır**. 31 Temmuz 2026 tarihli istek listesinin (`duzeltmeler.txt`)
> takibiydi; maddelerinin tamamı tamamlandı ve 5 Ağustos 2026'da arşive alındı.
> Yürürlükteki liste: **`YAPILACAKLAR.md`**.
>
> Silinmedi çünkü kapanmış maddelerin **gerekçeleri** burada: bir kararın neden
> öyle verildiği, koddan okunamayan tek bilgidir. Yeni bir talep eski bir kararı
> ters çevirmek istediğinde önce buraya bakın.

---

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
- [x] **Yeni kayıt ekle** sekmelerine "GençTek etkinlikleri" ve "Diğer
      etkinlikler" eklendi. GençTek katılımı normalde OTOMATİK gelir
      (basvuru + faaliyet); elle giriş BEYAN olarak açıldı — çift kayıt ve
      doğrulanamazlık riski bilerek kabul edildi. Rozetler bu kayıtlardan
      hesaplanmıyor, yani beyanla nişan kazanılamıyor.
- [x] **Yeni FAALİYET formunda da** aynı alanlar: program listesine "Diğer",
      katılım biçimi (yüz yüze/online/karma), hedef kitle. Detay sayfasında ve
      Word/CSV raporunda gösteriliyor.
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
- [x] **İl koordinatörü rapor modülü** → `/panel/raporlar`. Koordinatör
      ilindeki HER biten faaliyetin raporunu yazabilir, kendi açmamış olsa
      bile — raporlama ilin sorumluluğu. Rapor yetkisi bu yüzden ek yükleme
      yetkisinden geniş tutuldu.
- [x] Biten etkinlik için **faaliyet raporu sayfası**
      → `/panel/faaliyetler/[id]/rapor`. Katılım sayıları (toplam + tekil),
      katılımcı listesi, görseller ve değerlendirme metni bir arada; Word/Excel
      indirme de burada. Sayılar rapora KOPYALANMAZ, her açılışta
      başvurulardan hesaplanır. Rapor ancak faaliyet bittikten sonra yazılır
      (çok günlüde bitiş tarihine bakılır) ve iptal edilmiş faaliyette yazılmaz.
- [x] **Gizlilik / taahhütname imzası**
      → Artık `/panel/kvkk` altında, dört onay belgesinden ikisi olarak duruyor
      (taahhütname = görev yükümlülüğü, gizlilik sözleşmesi = veri
      yükümlülüğü). Eski `/panel/taahhut` yolu kalıcı yönlendirmeye çevrildi.
      Metinler Yönetim ekranından düzenlenebilir; güncellenince onay eskir ve
      yeniden istenir. Güncelleme sonrası erişim ENGELLENMEZ, şeritle uyarılır —
      acil bir durumda sistemin kilitlenmesi korumaktan çok zarar verirdi ve
      erişimler zaten kayda geçiyor.

- [x] **İlk giriş onay kapısı** (KVKK açık rıza + taahhütname + gizlilik)
      → `/onay`. Sistemde kayıt akışı olmadığı için belgelerin okutulacağı tek
      an ilk giriştir. Hiç onay vermemiş kullanıcı panele giremez; belgeleri tek
      tek işaretler. Kilit YALNIZCA ilk giriştedir — sonradan eklenen belge ya da
      güncellenen metin kimseyi kapıda bırakmaz.
      Rol eşlemesi (kullanıcı kararı, roller **değiştirilmedi**): aydınlatma →
      öğrenci, açık rıza → herkes, taahhütname ve gizlilik sözleşmesi → il
      koordinatörü.

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

## 5. İletişim modülü

- [x] Öğretmen–öğrenci ve öğrenci–öğrenci mesajlaşması → `/panel/yazismalar`
- [x] Öğrencinin çalışma alanına göre **başka öğrenci arayabilmesi**
      → `/panel/talepler` (ilan panosu + arama + çalışma alanı filtresi)
- [x] **Duyuru yapabilme** → talep panosunda ilan açma
- [x] **Koordinatör onaylı iletişim** → `/panel/baglantilar`. Onayı isteği
      yapanın danışmanı YA DA ilinin koordinatörü verir; yalnızca koordinatöre
      bırakılsaydı il başına tek kişi darboğaz olurdu.

**Karar: gizli kanal yok.** Yazışmalar tarafların danışmanlarına, illerinin
koordinatörlerine ve proje yöneticilerine TAM İÇERİKLE görünür. Veli onayı
alınmadığı için izleme aydınlatma metnine 2.1 maddesi olarak yazıldı; metin
değiştiği için öğrencilerden yeniden onay istenecek.

Okuma ile yazma AYRI: gözetim yetkisi olan okur ama taraf değilse yazamaz ve
ekran bunu açıkça söyler. Başkasının yazışmasını okumak erişim kaydına geçer.
Mesaj silinmez, gizlenir — şikâyet incelemesinde en çok ihtiyaç duyulan kayıt
gizlenmiş mesajdır.

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
