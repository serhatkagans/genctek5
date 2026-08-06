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

---

# 5–6 Ağustos 2026 listesi — tamamlanan maddeler

> Bu bölüm **`YAPILACAKLAR.md`'den 6 Ağustos 2026'da taşındı.** O dosya
> yürürlükteki listedir ve artık yalnızca **açık** maddeleri taşıyor; bitenlerin
> gerekçeleri buraya indi.
>
> 27 maddenin 25'i burada. Açık kalan ikisi — **C4** (profil bölümlerinin
> düzenleme ekranı, → S9) ve **G** (mesajlar ve gruplar, → S19/S20) —
> `YAPILACAKLAR.md`'de duruyor.
>
> **Neden silinmedi:** her maddenin altında yalnızca "ne yapıldı" değil, **neden
> öyle yapıldı** yazıyor — ve bir kararın gerekçesi koddan okunamayan tek
> bilgidir. Yeni bir talep buradaki bir kararı ters çevirmek istediğinde önce
> buraya bakın; özellikle "bilerek yapılmadı" diye işaretlenmiş yerlere.
>
> Her maddede önce **planın kendisi** (istek, bugün ne var, yapılacak), sonra
> **`YAPILDI` kaydı** durur. İkisi bilerek yan yana: plandan sapıldığı yerlerde
> sapmanın gerekçesi ancak ikisi birlikte okununca anlaşılıyor.

**Tamamlanan 25 madde:**

| # | Madde | Tarih |
|---|---|---|
| A1 | EBA dışı giriş (mezun, paydaş) + proje yöneticisi onayı | 5 Ağustos |
| A2 | KVKK/belge akışının menüden kaldırılması | 5 Ağustos |
| B1 | "Faaliyet" → "Etkinlik" (arayüz + URL) | 5 Ağustos |
| B2 | Sekme ve başlık adları | 5–6 Ağustos |
| B3 | Menüden kaldırılan sekmeler | 5 Ağustos |
| C1 | Panelim: çalışma grubu + danışman seçimi + katkı girişi | 5 Ağustos |
| C2 | "Başvuru Açık" şeridi → "Mesajın var" | 6 Ağustos |
| C3 | İlk girişte profil ekranı | 5 Ağustos |
| D1 | "GençTek Yolculuğum" | 5 Ağustos |
| D2 | "Bilişim Yolculuğum" | 5 Ağustos |
| D3 | Sertifikalarım | 6 Ağustos |
| D4 | Topluluklarım | 6 Ağustos |
| D5 | Ürünlerim + "markette paylaş" *(taahhütname hariç → S12)* | 6 Ağustos |
| D6 | Rotam | 6 Ağustos |
| D7 | Seferlerim | 6 Ağustos |
| D8 | "Yeni kayıt ekle" düzeltmeleri | 5 Ağustos |
| E | Algoritmam *(dört ölçeğin içeriği hariç → S16)* | 6 Ağustos |
| F | Danışman seçimi ekranı | 5–6 Ağustos |
| H | Talep panosu → "Pano" + dört talep türü | 6 Ağustos |
| I | GençTek Market *(DİLİM hariç → S22)* | 6 Ağustos |
| J1 | Danışmanlığı bırakma | 6 Ağustos |
| J2 | Görev Rolleri → Öğrencilerim | 5 Ağustos |
| J3 | Raporlar + Belge Oluştur → Etkinlikler | 6 Ağustos |
| J4 | Paydaşlar → etkinlik ekleme | 5–6 Ağustos |
| J5 | Katılım belgesinde imza makamı | 6 Ağustos |

**Üç maddenin artığı hâlâ açık:** D5'in ürün taahhütnamesi (S12), E'nin dört
ölçeğinin madde metni (S16), I'nin DİLİM tanımı (S22). Üçü de **metin/karar**
bekliyor, kod değil.

---

## A. Kimlik ve erişim

### A1 — EBA dışı giriş: mezun ve paydaş ⛔

> **İstek:** "EBA dışında sisteme giriş eklenecek. (mezun, paydaş) bunların
> onayı proje yöneticisine düşecek o onaylayacak"

**Bugün ne var.** Sistemde **dış kayıt yoktur ve olmayacaktır** — bu, açılış
ekranına yazılı bir karar (`src/app/page.tsx`) ve `SKILL.md`'de de böyle duruyor.
Kimlik yalnızca `AuthProvider` üzerinden gelir (`src/lib/auth/`), şifre alanı,
kayıt formu, parola sıfırlama akışı hiç yazılmadı. Mezun modülü ise açıkça
**kapsam dışı** bırakılmıştı (`SKILL.md` · Kapsam dışı).

Bu talep, projenin en temel mimari kararlarından birini tersine çeviriyor. Bu
yüzden listenin en büyük maddesi.

**Yapılacak.**

1. **Kimlik doğrulama yolu** — EBA'sı olmayan kişi kendini nasıl kanıtlayacak?
   (→ **S1**) Karar ne olursa olsun `AuthProvider` soyutlamasının yanına ikinci
   bir yol açılır; oturum katmanı (`src/lib/auth/oturum.ts`) değişmez.
2. **Başvuru kaydı** — yeni tablo: `dis_kullanici_basvurusu` (ad, soyad,
   e-posta, telefon, tür MEZUN/PAYDAS, beyan alanları, durum
   BEKLIYOR/ONAYLANDI/REDDEDILDI, karar veren, karar tarihi, gerekçe).
   Onaylanana kadar `kullanici` satırı **açılmaz** — açılırsa onaysız kişi
   sistemde "varmış" gibi görünür ve kapsam filtrelerine sızma riski doğar.
3. **Onay ekranı** — proje yöneticisine yeni sekme; onayda `kullanici` +
   `kullanici_rol` satırı açılır, bildirim gider. Reddetmede gerekçe (→ S1).
4. **Rol kodları** — `RolKodu` enum'ına `MEZUN` ve `PAYDAS_TEMSILCISI`
   eklenecek. Bu, `permissions.md` Bölüm 1'deki yetki matrisine **iki yeni
   sütun** demek: her satır için "mezun görür mü / paydaş görür mü" tek tek
   cevaplanmalı (→ **S3**).
5. **Kapsam filtresi** — `src/lib/yetki/kapsam.ts` bugün il/kurum eksenli.
   Mezunun ve paydaşın kurum kodu yok; filtrelerin bu iki rolde ne yapacağı
   ayrıca yazılmalı. **Varsayılan "hiçbir şey görmez" olmalı**, aksi hâlde
   filtresi yazılmamış bir ekran sessizce her şeyi gösterir.
6. **Onay belgeleri** — mezun ve paydaştan hangi belgeler istenecek (→ **S2**).
7. **Paydaş bağlantısı** — sistemde zaten il bazlı bir `paydas` **kurum**
   envanteri var. Paydaş kullanıcısı bu kayda mı bağlanacak (→ S1).

**Büyüklük: XL.** Tek başına bir faz. Yetki matrisi genişlemesi ve kapsam
filtresi, iş miktarından çok **risk** taşıyor: yanlış yazılmış bir filtre hata
vermez, sadece görülmemesi gereken veriyi gösterir.

### A1 — YAPILDI (5 Ağustos 2026)

Alınan cevaplar: **e-posta + şifre** (e-Devlet değil), **dar başlangıç** yetki
kümesi, paydaş temsilcisi **mevcut kurum kaydına** bağlanır. S2 (hangi belgeler)
cevaplanmadı; varsayımla ilerlendi ve gerekçesi aşağıda.

**Veri modeli** — iki yeni tablo, iki yeni rol:
`dis_kullanici_basvurusu` (başvuru + şifre, onaya kadar), `dis_kimlik`
(onaylanmışın giriş kimliği, sistemin şifre tutan tek tablosu), `RolKodu` +=
`MEZUN`, `PAYDAS_TEMSILCISI`, `LogHedefTip` += `DIS_BASVURU`.
Migration'lar: `20260805150000_dis_giris_enumlari`,
`20260805150100_dis_kullanici_girisi`.

**Ekranlar** — `/basvuru` (iki adımlı form, aydınlatma metni okutulur),
`/dis-giris`, `/sifre-sifirlama` (iste + tamamla),
`/panel/dis-basvurular` (proje yöneticisinin onay kuyruğu).

**Kod** — `src/lib/dis-kimlik/`: `kurallar.ts` (saf kararlar), `sifre.ts`
(scrypt, dış bağımlılık yok), `basvuru.ts`, `giris.ts`, `sifirlama.ts`,
`eposta.ts`.

**Kapsam** — dar başlangıç uygulandı; ayrıntı `permissions.md` Bölüm 1.1.
Uygulama sırasında **üç sessiz açık** bulunup kapatıldı; üçü de "görebiliyorsa
yapabilir" biçimindeki genel kurallardan kendiliğinden doğuyordu:

1. `paydasKapsamFiltresi` "ili var ve öğrenci değil" dediği için paydaş
   temsilcisi kendi ilinin **tüm paydaş envanterini** (yetkili kişi adları ve
   iletişim bilgileriyle) görecekti.
2. `ogretmenKapsamFiltresi`'nin "öğretmen" tanımı "öğrenci olmayan" olduğu için
   mezunlar **il koordinatörünün öğretmen envanterinde** listelenecekti; aynı
   sebeple `koordinatorAdaylari` bir mezunu **il koordinatörü adayı** olarak
   gösterebilirdi ve "öğretmenlere duyuru" onlara da giderdi.
3. `yorumYazabilirMi` faaliyeti görene yorum hakkı verdiği için dış kullanıcı,
   takvimde gördüğü ulusal etkinliğin altına yazabilecekti.

**KVKK (S2 varsayımı)** — mezun ve paydaştan **aydınlatma + açık rıza**
isteniyor. Gizlilik sözleşmesi İSTENMİYOR; plandaki varsayım "paydaştan da
istensin" demişti ama yürürlükteki dar yetkiyle paydaş hiçbir kişisel veriye
erişmiyor ve metnin kendisi baştan sona "İl Koordinatörü" diye yazılı.
Yükümlülüğü doğuran şey rolün adı değil eriştiği veri. **Kapsam genişletilirse
bu karar yeniden verilmeli** (`lib/kvkk/kurallar.ts` içinde de yazılı).
Ayrıca başvuru anında ayrı bir aydınlatma onayı alınıyor: veri işleme orada
başlıyor ama `kullanici_onayi`na yazılamaz, çünkü kullanıcı kaydı henüz yok.

**Testler** — `tests/dis-kimlik-kurallar.test.ts`,
`tests/dis-kimlik-sifre.test.ts`, `tests/yetki-dis-kullanici.test.ts`.

**Not.** Bu madde bitti; I (Market) maddesindeki "öğretmen ürünleri /
mezun ürünleri" görünürlüğü artık tasarlanabilir. Ama dikkat: mezunun bugün
**hiçbir** öğrenci/etkinlik verisine erişimi yok — market tasarımı bu dar
kümenin üstüne kurulmalı, "mezun zaten görüyor" varsayımıyla değil.

### A2 — KVKK belgelerinin menüden kaldırılması

> **İstek:** "KVKK metni üye olunurken görülsün sadece. Menüden kaldırılacak.
> Panele ilk giriş yaptığında kvkk, gizlilik sözleşmesi, taahhütname görülecek"
> · Öğretmen için de: "KVKK kaldırılacak. Üye olunurken görüntülenip
> onaylanacak."

**Bugün ne var.** İsteğin ikinci cümlesi **zaten yapıldı** (5 Ağustos):
`/onay` kapısı ilk girişte KVKK aydınlatma + açık rıza + taahhütname + gizlilik
sözleşmesini okutuyor, onaylamadan panele girilemiyor. Kalan tek fark **menü
girişi**: bugün "KVKK ve Belgelerim" sekmesi var.

**Yapılacak.** Menü girişini kaldırmak XS. Ama kaldırınca iki durum sahipsiz
kalıyor ve bunların cevabı gerekiyor (→ **S4**):

- Metin güncellendiğinde yeniden onay nasıl alınacak? (Bugün: şerit → sekme.)
- Kullanıcı imzaladığı belgeyi sonradan okumak isterse nereden bakacak?
  Onayladığı bir belgeye erişememek KVKK açısından savunulabilir değil.

**Büyüklük: S** (cevap geldiğinde).

### A2 — YAPILDI (5 Ağustos 2026)

Gelen cevap: *"profil sayfasının en altına alalım, gerekirse kvkk'yı okuyabilir.
menüden kaldıralım"* (→ S4).

**Menü girişi kaldırıldı.** "KVKK ve Belgelerim" sekmesi yok.

**Belgeler profilin en altında** (`/panel/profil#kvkk`, yeni bileşen
`components/OnayBelgeleriBolumu.tsx`): her belgenin onay durumu, onay tarihi ve
metnin son güncellenme tarihi görünür; tam metin `<details>` içinde katlı durur.
Dört metnin tamamı açık basılsaydı profil birkaç ekran boyu hukuki metinle biter
ve üstündeki asıl içerik kullanılamaz hâle gelirdi. **Onay bekleyen belge
varsayılan olarak AÇIK gelir** — okunması gereken metni katlı bırakmak, onayı
körlemesine tıklatmak olurdu.

**Sahipsiz kalan iki durumun karşılığı:**

1. **Yeniden onay** — şerit kaldırılmadı ve artık doğrudan profildeki bölüme
   götürüyor. Sekme kalktığı için kullanıcının belgeye kendiliğinden uğrayacağı
   başka bir yer yok: **şerit artık yeniden onayın tek yolu.**
2. **Sonradan okuma** — aynı bölümden, onay tarihiyle birlikte.

**Eski adresler yaşıyor.** `/panel/kvkk` ve `/panel/taahhut` kalıcı
yönlendirmeye dönüştü (`permanentRedirect`), ikisi de doğrudan
`/panel/profil#kvkk`'ya gidiyor — zincirleme yönlendirme yok. Bildirim
e-postalarında ve yer imlerinde bu adresler duruyor; 404 göstermek, onayladığı
belgeyi kaybettiğini düşündürürdü.

**Onay eylemi taşındı:** `app/panel/kvkk/eylemler.ts` → `app/panel/profil/
belge-eylemleri.ts`. İlk giriş kapısının (`/onay`) toplu onay eylemi ayrıdır ve
değişmedi.

---

---

## B. Adlandırma ve menü düzeni

Bu bölümdeki maddeler ucuz ama **her yere dokunuyor**; erken yapılırsa sonraki
maddeler doğru adla yazılır, geç yapılırsa iki kez elden geçirilir. Önerim: B1'i
ilk sıraya almak.

### B1 — "Faaliyet" → "Etkinlik"

> **İstek:** "Faaliyetler ismi 'etkinlikler' olarak değiştirilecek"

**Bugün ne var.** "Faaliyet" sözcüğü arayüzde, tablo adında (`faaliyet`,
`faaliyet_ek`, `faaliyet_raporu`, `faaliyet_paydas`, `faaliyet_calisma_grubu`),
kod dosyalarında (`src/lib/faaliyet/`, `src/app/panel/faaliyetler/`), URL'de
(`/panel/faaliyetler`) ve dört belgede geçiyor.

**Yapılacak.** Katman katman ayrılmalı, hepsi birden değil:

1. **Arayüz metinleri** — kullanıcının gördüğü her yerde "etkinlik". *Yapılacak
   olan bu.*
2. **URL** — `/panel/faaliyetler` → `/panel/etkinlikler`. Eski yol kalıcı
   yönlendirmeyle korunur (bildirim ve e-postalarda eski bağlantılar var).
3. **Tablo ve kod adları** — **önermiyorum.** Beş tablo, ~40 dosya ve 21
   migration'ı ilgilendirir; kullanıcıya hiçbir şey kazandırmaz, buna karşılık
   her migration'ı yeniden okumak gerekir. Kod içinde "faaliyet" kalması bir
   tutarsızlık değil, bilinçli bir sınır: **ekran dili ile şema dili ayrı
   yaşayabilir.** Aksini isterseniz ayrı bir madde açalım.

Bir tuzak: "faaliyet" kökü `EtkinlikKategorisi`, `TemelEtkinlikProgrami` gibi
zaten "etkinlik" diyen adlarla iç içe. Toplu değiştirme yapılırsa
"Temel Etkinlik Etkinliği" gibi metinler çıkar; değişiklik **elle** gözden
geçirilmeli.

**Büyüklük: M.**

### B1 — YAPILDI (5 Ağustos 2026)

Plandaki 1. ve 2. katman uygulandı, 3. katman (tablo/kod adları) **bilerek
yapılmadı**.

**Arayüz** — 45 dosyada, kullanıcının gördüğü her metin "etkinlik" oldu: menü
girişi, ekran ve kart başlıkları, hata mesajları, CSV sütun adları, erişim
logu etiketi (`LogHedefTip.FAALIYET` → ekranda "Etkinlik"), Word rapor
şablonu, katılım/teşekkür belgesi metni ve bildirim şablonları
(`prisma/seed.ts`). Dönüşüm elle gözden geçirildi: "İl etkinliğinde etkinlik
adı zorunludur" gibi çift adlandırmalar düzeltildi.

**URL** — `src/app/panel/faaliyetler` → `src/app/panel/etkinlikler`. Eski yol
`next.config.ts` içinde **kalıcı yönlendirmeyle** yaşıyor; gönderilmiş
bildirim e-postalarındaki bağlantılar geri alınamaz, yönlendirme silinemez.

**Değişmeyenler** — tablo adları, `src/lib/faaliyet/`, `{{faaliyetAdi}}` yer
tutucusu, enum kodları ve migration'lar. Bu sınır `SKILL.md` · "Başlamadan önce
doğrula" bölümüne yazıldı ki sonraki geliştirici tutarsızlık sanıp düzeltmeye
kalkmasın.

**Dokunulmayan tek arayüz metni: KVKK belgeleri.** Aydınlatma metni, açık rıza
ve taahhütnamede "faaliyet" sözcüğü duruyor. Sebep: bu metinler
`sistem_ayari`'nda boşsa koddaki varsayılan gösteriliyor ve yeniden onay
kararı **ayarın güncelleme tarihine** bakıyor (`onayiGerekiyorMu`). Kodda
metni değiştirmek, ayar boş olduğu için kimseye yeniden onay sordurmadan
insanların onayladığı metni sessizce değiştirirdi. Sözcük hukuken de doğru.
Değiştirilecekse bilinçli bir karar ve yeniden onay gerekir.

### B2 — Sekme ve başlık adları

> **İstek:** (dağınık hâlde) "Danışman Öğretmen Adayları" → "Danışman
> Öğretmenim" · "Katkı Kartım" → "GençTek Yolculuğum" · "Ekosisteme Katkı" →
> "Bilişim Yolculuğum" · "Katkı Nişanı" → "Seferlerim" · "Derece aldığım
> yarışmalar" → "Derecelerim" · "Yazışmalar" → "mesajlar" · sekme →
> "Bağlantılarım" · "Talep Panosu" → "(çağrı?)"

**Bugün ne var.** Karşılıkları sırasıyla:
`danisman-secim/page.tsx` "Danışman öğretmen adayları" ·
`components/KatkiKarti.tsx` "Katkı kartım" ·
`profil/page.tsx` "Ekosisteme katkı" ·
`kazanimlarim/page.tsx` "Katkı nişanlarım" ·
`lib/kazanim/kurallar.ts` etiketleri · `panel/layout.tsx` menü etiketleri.

**Yapılacak.** Düz metin değişiklikleri. İki tanesi belirsiz:

- **Talep panosunun yeni adı** soru işaretiyle yazılmış ("çağrı?") → **S21**.
- **"Bağlantılarım"** adı çakışıyor: bugün `/panel/baglantilar` ekranının adı
  zaten **"Bağlantı İstekleri"** (koordinatörün öğrenci–öğretmen iletişim
  onayı). Yazışmalar da "Bağlantılarım" olursa menüde birbirine çok benzeyen
  iki giriş olur → **S13**.

**Büyüklük: S.**

### B2 — YAPILDI (5 Ağustos 2026)

Sekiz yeniden adlandırmanın hepsi yapıldı.

| Eski | Yeni | Nerede yapıldı |
|---|---|---|
| Danışman Öğretmen Adayları | Danışman öğretmen seçimi | F |
| Katkı Kartım | GençTek Yolculuğum | D1 |
| Ekosisteme Katkı | Bilişim Yolculuğum | D2 |
| Derece aldığım yarışmalar | Derecelerim | D2 |
| Yazışmalar (sekme) | Bağlantılarım | B2 |
| Yazışmalar (liste başlığı) | Mesajlar | B2 |
| Bağlantı İstekleri | İletişim Onayları | B2 (→ S13) |
| Talep Panosu | Pano | H (→ S21) |

"Katkı Nişanı" → "Seferlerim" **D7'ye aittir** ve S15 bekliyor: orada iş bir ad
değişikliği değil, seviye hesabı.

**"Yazışma" sözcüğü gövde metinlerinde KALDI.** Orada bir *konuşmanın tamamını*
anlatıyor; "mesaj" tek bir iletidir. İkisini birleştirmek "bu mesajın tarafı
değilsiniz" gibi yanlış cümleler üretirdi — kod da bu ayrımı taşıyor
(`yazisma` + `mesaj` tabloları).

### B3 — Menüden kaldırılacak sekmeler

> **İstek:** "Çalışma Gruplarım ve Danışmanım sekmeleri kaldırılacak" ·
> "Görev Rolleri sekmesi kaldırılacak" · "Raporlar ve Belge Oluştur sekmesi
> kaldırılıp Etkinlikler kısmında oluşturulacak" · "Paydaşlar sekmesi
> kaldırılacak" · "KVKK kaldırılacak"

**Bugün ne var.** Altı menü girişi: `/panel/calisma-gruplari`,
`/panel/danisman-secim`, `/panel/gorev-rolleri`, `/panel/raporlar`,
`/panel/belgeler`, `/panel/paydaslar`, `/panel/kvkk`.

**Yapılacak.** Menüden çıkarmak XS; asıl iş, **her ekranın işlevinin nereye
taşınacağı**. Beşi ayrı maddede: C1 (çalışma grubu + danışman), J2 (görev
rolleri), J3 (raporlar + belge), J4 (paydaşlar), A2 (KVKK).

**Sekmeyi kaldırmak sayfayı silmek değildir.** Sayfalar kalmalı ve kalıcı
yönlendirme ya da doğrudan erişimle çalışmaya devam etmeli: bildirim
e-postalarında bu adresler var.

**Büyüklük: S** (taşıma maddeleri hariç).

### B3 — YAPILDI (5 Ağustos 2026), biri hariç

Altı menü girişinin beşi kalktı; altıncısı (Raporlar + Belge Oluştur) **S24**
bekliyor.

| Sekme | Kimden kalktı | İşlevi nereye gitti |
|---|---|---|
| Çalışma Gruplarım | Öğrenci | Panelim içinde bölüm (C1) |
| Danışmanım | Öğrenci | Panelim içinde bölüm (C1) |
| Görev Rolleri | Danışman öğretmen | Okul Temsilcisi → Öğrencilerim (J2); il/ilçe koordinatörde kaldı |
| Paydaşlar | Danışman öğretmen | Etkinlik detayından bağlama (J4); envanter koordinatörde kaldı |
| KVKK ve Belgelerim | Herkes | Profilin en altı (A2) |
| Raporlar + Belge Oluştur | — | ⛔ S24 (J3) |

**Hiçbir sayfa silinmedi.** `/panel/kvkk` ve `/panel/taahhut` kalıcı
yönlendirmeye dönüştü; diğerleri olduğu gibi duruyor ve yetkisi olan doğrudan
adresle giriyor. `/panel/danisman-secim` ayrıca **silinemez**: orası giriş
kapısı — danışmansız öğrenci girişte oraya düşüyor.

---

---

## C. Öğrenci paneli düzeni

> C4 açık kaldı ve `YAPILACAKLAR.md`'de duruyor.

### C1 — Panelim: çalışma grubu ve danışman seçimi

> **İstek:** "Panelim (Çalışma gruplarım, Danışman Öğretmenim, Katkılarım (Veri
> girişi)" · "Çalışma Gruplarım ve Danışmanım sekmeleri kaldırılacak. Sadece
> panelim kısmında görüntülenip seçme işlemi yapılacak."

**Bugün ne var.** Üçü de ayrı ekran: çalışma grubu seçimi, danışman seçimi ve
katkı girişi. Panelim (`/panel`) bugün özet + takvim + şerit gösteriyor.

**Çelişki var.** Aynı istek listesinde birkaç satır sonra "Danışmanım (Panel
sekmesinde gözükecek)" ve "Katkılarım (Panel sekmesinden giriş olacak)" yazıyor.
Sekmeler kalkıyor mu, kalıyor mu? → **S6**

**Yapılacak** (sekmeler kalkıyorsa): Panelim'e üç bölüm gömülür; seçim
işlemleri sunucu eylemi olarak orada çalışır. Mevcut ekranların iş mantığı
(`lib/danisman/`, çalışma grubu kuralları) **değişmez**, yalnızca çağrıldıkları
yer değişir.

Dikkat: Panelim bugün de yoğun. Üç bölüm daha eklenince öğrencinin ilk gördüğü
ekran uzun bir forma dönüşebilir; bölümlerin katlanabilir olması gerekebilir.

**Büyüklük: M.**

### C1 — YAPILDI (5 Ağustos 2026)

S6'ya gelen cevap: **(a)** — sekmeler kalksın, ikisi de Panelim'in içinde bölüm
olsun.

**Üç bölüm eklendi:**

1. **Danışman öğretmenim** — mevcut durum, iletişim bilgisi ve seçim listesi.
2. **Çalışma gruplarım** — grup seçim formu.
3. **Katkı girişi** — kayıt formunun kendisi DEĞİL, ona giden yol
   (`/panel/profil#kayit-ekle`) ve Katkılarım bağlantısı. Formu buraya ikinci
   kez basmak, aynı kaydın iki yerden girildiği ve birinde görünüp öbüründe
   görünmediği bir düzen üretirdi.

**Bölümler KATLI** (`<details>`, JavaScript yok). Uyarıdaki risk gerçekti:
Panelim öğrencinin ilk gördüğü ekran ve asıl işi (başvurusu açık etkinlikler,
takvim) iki formun altında kalmamalı. İstisna, kullanıcının gerçekten bir şey
yapması gereken hâl — **danışmanı yoksa** ya da **hiç grup seçmemişse** ilgili
bölüm açık geliyor.

**İş mantığı değişmedi.** Formlar ve sorgular tek kaynaktan geliyor
(`components/DanismanSecimi.tsx`, `components/CalismaGrubuSecimi.tsx`,
`lib/danisman/atama.ts`, `lib/ogrenci/calisma-grubu.ts`); eski sayfalar da aynı
bileşenleri basıyor. Eylemler `donusYolu` alıyor: Panelim'den kaydeden kişi
Panelim'e dönüyor. Bu alan formdan geldiği için **beyaz listeyle** doğrulanıyor
— serbest bırakılsaydı açık yönlendirme açığı olurdu.

### C2 — "Başvuru Açık" şeridi → "Mesajın Var" ✅

> **İstek:** "'Başvuru Açık' Sarı renkli kısım 'Mesajın Var' şeklinde
> değiştirilecek. Tıklandığında mail olarak atılan mesaj gözükecek."

**Yapıldı (6 Ağustos).** Sarı şerit artık okunmamış **mesajları** duyuruyor
(`src/components/MesajSeridi.tsx`; eski `DuyuruSeridi.tsx` silindi — başka
kullanan kalmamıştı).

- Şerit **yalnızca okunmamış mesaj varken** basılır. Hiç mesajı olmayana boş
  bir kutu göstermek, şeridin taşıdığı "bak buraya" anlamını yıpratırdı.
- Başlıkla birlikte **toplam okunmamış sayısı** yazılır: şeritte ilk beşi
  akıyor, "üçü akıyor ama on tane var" durumunda kullanıcı eksik bilgiyle
  sayfadan çıkmamalı.
- Her başlık, sayfanın altındaki bildirim bölümünde **o mesajın kendi satırına**
  iner (`#bildirim-<id>`). Orada e-posta olarak giden gövdenin **aynısı**
  duruyor (`bildirim.icerik`; e-posta yalnızca altına bir dipnot ekliyor).
- Ayrı bir mesaj ekranı açılmadı — aynı metni ikinci bir yerden okutmak olurdu.

**"Mail olarak atılan mesaj" belirsizliği (S7) kendiliğinden çözüldü:** sistemde
e-posta gönderen tek mekanizma `bildirim` tablosudur. Toplu duyuru
(`TOPLU_DUYURU`) da, kullanıcılar arası yazışma (`YENI_YAZISMA`) da oraya
bildirim yazar; üçü **aynı gelen kutusudur**.

**Başvurusu açık etkinlikler hiçbir yere taşınmadı — taşınması gerekmedi.**
Plandaki endişe ("şerit onları göstermeyi bırakırsa öğrencinin başvuru fırsatını
gördüğü tek yer kaybolur") **yanlıştı**: aynı Panelim sayfasında hem
**"Başvurusu açık etkinlik" ölçüm kartı** hem de kontenjan durumunu gösteren
**"Başvuruya açık etkinlikler" kart listesi** duruyor — ikincisi şeridin
verdiğinden daha fazlasını söylüyor. Şerit üçüncü kopyaydı. `seritKayitlari`
hesabı silinmedi; ölçüm kartındaki sayıyı beslemeye devam ediyor.

### C3 — İlk girişte profil ✅ YAPILDI

> **İstek:** "İlk girişte profil gözükecek"

**Önceki durum.** İlk giriş: `/onay` kapısı → `/panel` (öğrenci danışmansızsa
`/panel/danisman-secim`).

**Yapılan (5 Ağustos).** Cevap: **her girişte** profil açılsın. Uygulanan kural:

- **Öğrenci** giriş sonrası `/panel/profil`'e düşer — her girişte, yalnızca
  ilkinde değil.
- **Danışman seçimi önceliklidir**: danışmansız öğrenci önce
  `/panel/danisman-secim`'e gider. Bu bir kapı, tercih değil — danışmansız
  öğrenci "boşta" kalamaz (SKILL.md · Değişmezler 2). Seçimini yapan öğrenci
  bir sonraki girişinde profile düşer.
- **Öğretmen, koordinatör, merkez personeli ve dış kullanıcılar panele girer.**
  Talep "Öğrenci Hesabı" başlığı altındaydı; günlük işi listelerde olan
  kullanıcıyı profiline düşürmek istenmemişti.

Yönlendirme İKİ yerde: `app/giris/eylemler.ts` (normal giriş) ve
`app/onay/eylemler.ts` (belge kapısı araya girdiğinde hedef kaybolduğu için
orada geri kazandırılıyor).

**Büyüklük: XS.**

---

## D. Profil içeriği

### D1 — "GençTek Yolculuğum"

> **İstek:** "'Katkı Kartım', 'GençTek Yolculuğum' adı ile değiştirilecek.
> 'Katıldığı GençTek etkinlikleri' ve 'Verdiğim Akran Eğitimleri'de bu bölümün
> içinde görüntülenecek."

**Bugün ne var.** `KatkiKarti.tsx` içinde temsilcilikler ve çalışma grupları
var. Katıldığı etkinlikler `kazanimlarim` ekranında ayrı kart; akran eğitimleri
`kullanici_kazanim` tablosunda `tip=AKRAN_EGITIMI`.

**Yapılacak.** Yeniden adlandırma + iki listeyi bu kartın içine taşımak. **Veri
modeli değişmiyor** — ikisi de zaten var, sadece başka yerde gösteriliyor.

**Büyüklük: S.** Cevap beklemeden başlanabilir.

### D1 — YAPILDI (5 Ağustos 2026)

`KatkiKarti` başlığı **"GençTek Yolculuğum"** oldu (başkasının profilinde
"GençTek yolculuğu") ve iki bölüm içine taşındı:

- **Katıldığı GençTek etkinlikleri** — `KatilimKarti` ayrı kart olmaktan çıktı,
  profilde artık bu kartın bölümü. Liste hâlâ **türetilmiş**: seçildiği ve
  tarihi geçmiş etkinlikler.
- **Verdiğim akran eğitimleri** — `kullanici_kazanim` · `tip=AKRAN_EGITIMI`.
- Ayrıca **beyan ettiği GençTek etkinlikleri** (`tip=GENCTEK_ETKINLIGI`) ayrı
  başlıkta duruyor: biri kanıtlı, öbürü beyan; tek listede toplamak ikisini de
  "sistemin doğruladığı kayıt" gibi gösterirdi.

**Veri modeli değişmedi.** İki bölüm de isteğe bağlı prop; verilmediğinde hiç
basılmıyor — Katkılarım ekranı aynı listeleri kendi kartlarında gösterdiği için
orada iki kez görünmesinler.

### D2 — "Bilişim Yolculuğum"

> **İstek:** "'Ekosisteme Katkı' başlığı 'Bilişim Yolculuğum' ile değiştirilcek,
> GençTek dışı etkinlikler, Yaptığım ürünler, Derece aldığım yarışmalar (yeni
> ismi: Derecelerim) bu bölümde görüntülenecek."

**Bugün ne var.** `profil/page.tsx` "Ekosisteme katkı" kartı; içinde
`kullanici_kazanim` kayıtları tip'e göre gruplu (DIS_ETKINLIK / URUN /
YARISMA_DERECESI).

**Yapılacak.** Başlık değişikliği + grup adlarının güncellenmesi. Sertifika,
topluluk ve "markette paylaş" ayrı maddelerde (D3, D4, D5).

**Büyüklük: S.** Cevap beklemeden başlanabilir.

### D2 — YAPILDI (5 Ağustos 2026)

Öğrenci profilindeki "Ekosisteme katkı" kartı **"Bilişim Yolculuğum"** oldu ve
yalnızca GençTek **dışı** kayıtları taşıyor: `DIS_ETKINLIK`, `URUN`,
`YARISMA_DERECESI`, `DIGER`. GençTek tarafındakiler D1'e taşındı.

**"Derece aldığım yarışmalar" → "Derecelerim"** (öğretmende "Derecelerimiz").

Bölümleme `lib/kazanim/kurallar.ts` içinde iki listede duruyor
(`GENCTEK_YOLCULUGU_TIPLERI` / `BILISIM_YOLCULUGU_TIPLERI`) ve **birim testle
korunuyor**: bir kazanım tipi ikisine de girmezse kullanıcı kaydı girer ve
profilinde hiçbir yerde göremez — hata da almaz.

**Öğretmende bölünme YOK.** Onun profilinde GençTek Yolculuğum kartı
basılmıyor; tipleri buradan da çıkarsaydık akran eğitimi ve GençTek etkinliği
kayıtlarını hiçbir ekranda göremezdi. Öğretmen kartı "Ekosisteme katkı" adıyla
ve altı tipin tamamıyla duruyor.

### D3 — Sertifikalarım ⛔

> **İstek:** "Ayrıca 'Sertifikalarım' … bölümü eklenecek." · "Sertifika ve
> Topluluk ekle başlıkları da oluşturulacak.(bu bölüm panelde olacak)"

**Bugün ne var.** Yok.

**Yapılacak.** İki yol var (→ **S10**): `kullanici_kazanim` tablosuna yeni bir
`tip` değeri eklemek (`SERTIFIKA`) ya da ayrı tablo açmak. **Tip eklemeyi
öneriyorum** — arşivdeki Faz 2 notu da bunu söylüyor: aynı form, aynı doğrulama,
aynı silme yolu ikinci kez yazılmasın.

Açık olan: sertifikanın **dosyası** yüklenecek mi (PDF/görsel)? Yüklenecekse
depolama soyutlaması (`lib/depolama/`) hazır, ama boyut/tip sınırı ve saklama
süresi kararı gerekir.

**Büyüklük: M** (dosya yüklenecekse), **S** (yalnızca metin beyanıysa).

### D3 — YAPILDI (6 Ağustos 2026)

**Ayrı tablo açılmadı, kazanım TİPİ eklendi** (`SERTIFIKA`) — önerilen yol
seçildi: aynı form, aynı doğrulama, aynı silme yolu ikinci kez yazılmadı.

**Dosya sorusu (S10) kendiliğinden kapandı.** 5 Ağustos'ta D8 ile `kazanim_ek`
tablosu açılmıştı (destekleyici belgeler); sertifika ayrı bir dosya alanı
istemiyor, kaydın altındaki mevcut yükleme alanını kullanıyor. Tip ve boyut
sınırları da oradan geliyor (`lib/kazanim/ek.ts`).

**Beyandır** — sistem doğrulamaz, danışman onayına tabi değildir. Diğer kazanım
kayıtlarıyla aynı görünürlük kuralına bağlı.

Form alanları: sertifikanın adı, düzenleyen kurum, tarih, açıklama. Derece,
program seçimi, katılım biçimi ve hedef kitle bu tipte kapalı — sertifikada
karşılığı yok.

`prisma/migrations/20260806160000_sertifika_topluluk_urun`,
`lib/kazanim/kurallar.ts` (`KAZANIM_TANIMLARI`),
`components/OgrenciProfilBolumleri.tsx`.

### D4 — Topluluklarım ⛔

> **İstek:** "içinde yer aldığı toplulukları gösterebileceği (Klüp, proje ekibi,
> takım vb.) 'Topluluklarım' bölümü eklenecek."

**Bugün ne var.** Yok. En yakın kavram `calisma_grubu` ama o merkezden yönetilen
sabit bir liste; topluluk ise öğrencinin kendi beyanı.

**Yapılacak.** D3 ile aynı desen. Açık olan (→ **S11**): topluluk **beyan** mı
yoksa **doğrulanan** bir kayıt mı (danışman onayı)? Aynı topluluğa birden çok
öğrenci bağlanacaksa bu ayrı bir referans tablosu demektir ve iş büyür.

**Büyüklük: M.**

### D4 — YAPILDI (6 Ağustos 2026)

**Beyan seçildi** (→ S11), ortak kayıt değil. D3 ile aynı desen: `TOPLULUK`
kazanım tipi. Aynı kulübe iki öğrenci yazdığında iki ayrı satır oluşur ve sistem
bunları eşleştirmez.

Eşleştirilmiş topluluk yapılmadı çünkü ayrı bir referans tablosu ve üyelik
yönetimi demekti — istekte istenen bu değil, kişinin "içinde yer aldığı
toplulukları **gösterebileceği**" bir bölüm. Ters yön de pahalı: serbest metinle
girilmiş toplulukları sonradan eşleştirmek elle yapılır. Bu risk S11'de yazılı.

Form alanları: topluluğun adı (örn. "Robotik Kulübü — takım kaptanı"), bağlı
olduğu kurum, tarih, açıklama. Ekranda "Kendi beyanınızdır; sistem doğrulamaz"
notu duruyor.

Aynı migration ve aynı dosyalar (bkz. D3).

### D5 — Ürünlerim ve "markette paylaş" ⛔

> **İstek:** "Yaptığım ürünler ('Bu ürünü markette paylaş' check box
> eklenecek)" · "1) ürünün tanıtımını yapabilir. yada 2) programı yükleyebilir,
> link atabilir. Ürün ekleme taahhütname imzalaması gerekmekte. **Şimdilik
> sadece tanıtım yapsınlar.** Ürün Ekleme Formu: Ürün Adı, Geliştiren Ekip,
> Açıklamalar, Destekleyici Görseller, Linkler"

**Bugün ne var.** `kullanici_kazanim` · `tip=URUN`: başlık, açıklama, tarih,
bağlantı adresi. **Yok olanlar:** geliştiren ekip, birden çok görsel, birden çok
bağlantı, markette paylaşım bayrağı.

**Yapılacak.**

1. `kullanici_kazanim`'a alan eklemek yerine **ayrı `urun` tablosu** öneriyorum:
   ürünün çoklu görseli ve çoklu bağlantısı var, kazanım tablosunun diğer
   tipleri bu alanları hiç kullanmaz. Kazanım tablosuna eklenirse satırların
   çoğunda boş duran beş sütun oluşur.
2. Görseller: mevcut depolama soyutlaması + `faaliyet_ek` deseni.
3. `markette_paylasilsin` bayrağı → I maddesi (Market) bunu okuyacak.
4. **Ürün taahhütnamesi**: "ürün ekleme taahhütname imzalaması gerekmekte".
   Onay altyapısı 5 Ağustos'ta kuruldu (`kullanici_onayi` + `BELGE_TANIMLARI`);
   yeni bir belge türü eklemek ucuz. Metni sizden gelmeli (→ **S12**).
5. Program yükleme (2. seçenek) **kapsam dışı** — "şimdilik sadece tanıtım".
   K bölümüne yazıldı.

**Büyüklük: M.**

### D5 — YAPILDI (6 Ağustos 2026), taahhütname hariç

**Plandaki 1. madde tersine döndü: ayrı `urun` tablosu AÇILMADI.** Gerekçesi
("çoklu görsel ve çoklu bağlantı kazanım tablosuna sığmaz") 5 Ağustos'ta
geçersiz oldu — çoklu dosya `kazanim_ek` ile çözülmüştü. Geriye ürüne özgü iki
sütun kaldı, plandaki "beş boş sütun" değil. Ayrı tablo bugün zarar verirdi:
istek ürünlerin diğer kayıtlarla **birlikte** "Bilişim Yolculuğum" bölümünde
görünmesini istiyor; ayrı tablo aynı bölümü iki kaynaktan birleştirmek ve aynı
formu ikinci kez yazmak demekti.

Form (istekte sayılan alanların tamamı):

| İstenen | Nerede |
|---|---|
| Ürün Adı | mevcut `baslik` |
| Geliştiren Ekip | yeni `gelistiren_ekip` sütunu (250 karakter) |
| Açıklamalar | mevcut `aciklama` |
| Destekleyici Görseller | `kazanim_ek` (D8'de kurulan yükleme alanı) |
| Linkler *(çoğul)* | yeni `kazanim_baglanti` tablosu — kayıt başına en fazla 10, her birinin isteğe bağlı etiketi var ("kaynak kod", "canlı sürüm", "tanıtım videosu") |

Tek `baglanti_url` alanı **kaldırılmadı ve taşınmadı**: dolu kayıtlar var ve
diğer tipler onu kullanmaya devam ediyor. Kopyalamak, aynı adresin iki yerde
yaşamasına ve birinden silinip öbüründe kalmasına yol açardı.

**"Bu ürünü markette paylaş"** onay kutusu eklendi (`markette_paylasilsin`),
**varsayılan kapalı** — paylaşım bir tercihtir; açık gelmesi kullanıcının
istemeden vitrine çıkması olurdu. I maddesi (Market) bu bayrağı okuyacak.
Bayrak bugün profilde bir rozet olarak görünüyor; market ekranı yok.

Ürüne özgü iki alan yalnızca `tip=URUN` kayıtlarında anlamlı; diğer tiplerde
uygulama katmanı bunları sessizce düşürüyor (`kazanimKabulEdilirMi`).

**Program yükleme kapsam dışı** — "şimdilik sadece tanıtım yapsınlar". K
bölümünde duruyor.

**⛔ EKSİK: ürün taahhütnamesi.** İstek "ürün ekleme taahhütname imzalaması
gerekmekte" diyor. Onay altyapısı hazır (`kullanici_onayi` + `BELGE_TANIMLARI`,
5 Ağustos); yeni bir belge türü eklemek ucuz. **Metin sizden bekleniyor**
(→ **S12**). Bugün ürün eklemek taahhütname istemiyor.

`prisma/migrations/20260806160000_sertifika_topluluk_urun`,
`lib/kazanim/kurallar.ts`, `app/panel/profil/kazanim-eylemleri.ts`,
`components/OgrenciProfilBolumleri.tsx`, `tests/kazanim-kurallar.test.ts`
(64 test).

### D6 — Rotam ✅

> **İstek:** "Profilim bölümünde 'Rotam' kısmı oluşturulmasını talep ediyoruz.
> Öğrencinin yapmak istedikleri bu bölümde görüntülenecek. Hedefleri, yapmak
> istedikleri vb."

**Yapıldı (6 Ağustos).** Profilin en altında, "Bilişim Yolculuğum"dan sonra:
yukarısı yapılanlar, burası yapılacaklar.

**Biçim: hedef listesi** (→ S14). Her hedefin başlığı, isteğe bağlı açıklaması,
isteğe bağlı hedef tarihi ve durumu var: *Planladım / Üzerinde çalışıyorum /
Tamamladım*. Durum tek tıkla ilerletiliyor ("Başladım", "Tamamladım");
tamamlanma anı ayrı sütunda tutuluyor — `durum` alanından türetilemiyor.

Serbest metin yerine liste seçildi çünkü seçim **tek yönlü**: listeden serbest
metne geçiş kayıpsız, tersi değil.

**Sıralama:** önce süren, sonra planlanan, en sonda tamamlanan; aynı durumda
yakın tarih önce, tarihsizler sona. Rota ileriye bakar, biten işler listeyi
tıkamaz. Sıralama SQL'de değil `lib/hedef/kurallar.ts` içinde — saf fonksiyon,
testi var.

**Görünürlük: yalnızca kişinin kendisi.** Danışman ve koordinatör GÖREMEZ.
Kazanımdan ayrıldığı yer burasıdır: kazanım "yaptım" beyanıdır ve yetkiliye
açıktır; hedef "yapmak istiyorum" beyanıdır ve istekte kimsenin göreceği
yazmıyor. Dar taraftan başlandı — açmak kolay, geri almak değil.

**Düzenleme formu yok:** yanlış yazılan hedef silinip yeniden yazılıyor. Her
satırın altına ikinci bir form basmak, kısa satırlardan oluşan bir liste için
pahalıydı. "Vazgeçtim" durumu da yok — vazgeçilen hedef silinir; ayrı bir durum,
profilde vazgeçilenlerin kalıcı listesini tutmak olurdu.

**Sınır:** kişi başına 30 hedef. Kota değil, taşma koruması.

`prisma/migrations/20260806180000_ogrenci_rotasi`, `lib/hedef/kurallar.ts`,
`app/panel/profil/hedef-eylemleri.ts`, `components/RotamKarti.tsx`,
`tests/hedef-kurallar.test.ts` (21 test).

### D7 — Seferlerim

> **İstek:** "'Katkı Nişanı' kısmı profil bölümüne alınacak ismi 'Seferlerim'
> değiştirilecek. Öğrenciyi usta/kalfa/çırak vb (keşfeden, üreten, paylaşan,
> lider, elçi) seviyelerine göre derecelendirilebilecek."

**Bugün ne var.** `lib/kazanim/rozetler.ts` — nişanlar **hesaplanıyor**,
tabloda tutulmuyor: başvuru ve faaliyet kayıtlarından türetiliyor. Bu bilinçli
bir karardı ("beyanla nişan kazanılamaz").

**Yapılacak.** Seviye sistemi yeni: bugün nişanlar var/yok ikilisi, seviye yok.

İki liste verilmiş — "usta/kalfa/çırak" ve "keşfeden/üreten/paylaşan/lider/elçi"
— hangisinin geçerli olduğu ve **seviye atlama ölçütleri** belirsiz (→ **S15**).
Ölçüt olmadan bu madde yazılamaz: seviye, ekranın gösterdiği bir etiket değil,
bir hesaplama kuralıdır.

**Büyüklük: M** (ölçütler netleştiğinde).

### D7 — YAPILDI (6 Ağustos 2026)

**Nişanlar profile taşındı ve adı "Seferlerim" oldu.** Aynı kart Katkılarım
ekranında da duruyor; ikisi tek bileşenden basılıyor.

**Seviyeler** (S15 cevabı): keşfeden / üreten / paylaşan / lider / elçi.
usta/kalfa/çırak kullanılmadı.

**Seviyeler bir MERDİVEN DEĞİL, kazanılan niteliklerdir.** "Üreten" ile
"paylaşan" biri öbürünün üstü değil, farklı davranışlar. Sıralı kurulsaydı ürün
eklemeyen bir öğrenci akran eğitimi verse bile "paylaşan" olamazdı. Her birinin
kendi ölçütü var ve hepsi geçmişten türetiliyor — nişanlarla aynı desen, elle
verilmiyor, tabloda tutulmuyor:

| Seviye | Ölçüt |
|---|---|
| Keşfeden | Bir GençTek etkinliğine katıldı |
| Üreten | Profiline ürün ekledi |
| Paylaşan | Akran eğitimi verdi |
| Lider | Temsilcilik üstlendi **ya da** etkinlik önerdi (onaylanmış) |
| Elçi | İl geneli ya da ulusal etkinliğe katıldı (okul içi sayılmaz) |

**Seviye düşmez** ve **dönem sıfırlaması yok** ("seneye için bakarız"). Tek
istisna: bir yetkili görev rolünü silerse "Lider" düşebilir — ama etkinlik
önermek de aynı seviyeyi verdiği için o yol açık kalıyor.

Kazanılmayan seviyeler de soluk olarak gösteriliyor: hangi yolların açık olduğunu
görmek, yalnızca kazanılanları görmekten daha çok şey anlatıyor.

**⚠️ Cevapta ÜÇ ad sayıldı, istekte BEŞ vardı.** Beşi de kuruldu; "lider" ve
"elçi" istenmiyorsa `SEFERLER` listesinden çıkarmak tek satır.

### D8 — "Yeni kayıt ekle" düzeltmeleri

> **İstek:** "'Yeni Kayıt Ekle' bölümünde 'Katılım Biçiminde' Belirtmek
> İstemiyorum ifadesi kaldırılacak. Etkinliğe dair 'Destekleyici Balgeler' kısmı
> oluşturulacak (etkinliğe dair fotoğraf, belge ekleyebilmesi için)."

**Bugün ne var.** `KatilimBicimi` enum'ı YUZ_YUZE/ONLINE/KARMA; alan nullable ve
formda boş seçenek "belirtmek istemiyorum" olarak sunuluyor.

**Yapılacak.**

1. Boş seçeneği kaldırmak ve alanı **zorunlu** yapmak. Dikkat: bugünkü kayıtların
   bir kısmında bu alan boş; migration'da ya varsayılan atanmalı ya da eski
   kayıtlar boş bırakılıp yalnızca yeni kayıtlarda zorunlu olmalı. İkincisini
   öneriyorum — geçmiş beyanı sonradan doldurmak veriyi uydurmak olur.
2. Destekleyici belgeler: `faaliyet_ek` ile aynı depolama deseni, kazanım
   kaydına bağlı yeni bir ek tablosu.

**Büyüklük: M.** Cevap beklemeden başlanabilir.

### D8 — YAPILDI (5 Ağustos 2026)

**1. Katılım biçimi zorunlu.** "Belirtmek istemiyorum" seçeneği kalktı; yerine
seçilemez bir "Seçiniz" yer tutucusu var (`required` tek başına, ilk seçenek
geçerli bir değer olduğunda hiçbir şey yapmazdı). Zorunluluk sunucuda da
uygulanıyor — form kurcalanarak atlanamaz.

**Geriye dönük doldurma YAPILMADI ve sütun NULL kabul etmeye devam ediyor.**
Migration yok, varsayılan yok: bugüne kadar boş bırakılmış beyanları "yüz yüze"
diye varsaymak veriyi uydurmak olurdu. Kural yalnızca yeni kayıt kapısından
geçenlere uygulanıyor. Alanın sorulmadığı türlerde (ürün) zorunluluk yok.

**2. Destekleyici belgeler.** Yeni tablo `kazanim_ek`
(`20260805170000_kazanim_ekleri`), `faaliyet_ek` ile aynı depolama deseni:
diskte gerçek dosya adı tutulmuyor, depolama soyutlamasının anahtarı
saklanıyor. Bir kayda birden çok dosya eklenebiliyor.

- Yeni kayıt formunda çoklu dosya alanı; kayıt oluştuktan **sonra** yazılıyor
  ve dosya reddedilirse kayıt geri alınmıyor (kullanıcı yazdığı metni
  kaybetmesin), uyarı gösteriliyor.
- Var olan kayda sonradan belge ekleme ve tek tek kaldırma, kayıt satırının
  içinde.
- İndirme `/panel/kazanim-ekleri/[ekId]` üzerinden, **kapsam kontrollü**:
  belgeyi kazanımı görebilen görür. Public dizinden servis edilmiyor.
- Ek **soft-delete DEĞİL** — kazanım kaydının kendisi de kalıcı siliniyor,
  yarısı soft yarısı hard silinen bir çift tutarsız olurdu. Silme erişim
  loguna yazılıyor.

**Açık bırakılan karar:** dosya tipi ve boyut sınırları **etkinlik ekleriyle
ortak** (`IZINLI_GORSEL_TIPLERI`, `GORSEL_MAKS_BAYT` vb.). Gerekçe: ikisi de
aynı türde içerik taşıyor. CV'nin ayrı sınırları olmasının sebebi tür farkıydı
(orada doc/docx kabul ediliyor); burada öyle bir fark yok. Ayrışmaları
istenirse değişecek tek yer `lib/kazanim/ek.ts`.

---

---

## E. Algoritmam — öz değerlendirme envanterleri

> **İstek:** "Yeni Bölüm: Algoritmam: Öğrencinin güçlü yönlerini, öğrenme
> stilini, çalışma biçimini ve teknoloji alanındaki eğilimlerini keşfetmesini
> sağlayan bir yapı (envanter)… Teknoloji Liderliği Özyeterlilik Ölçeği · Dick
> Kişilik Envanteri · İlgi Envanteri · Beceri Envanteri · Mesleki Yaklaşım
> Envanteri · EPAI Girişimcilik Potansiyeli · entcom Girişimci Özellikleri ·
> yapay zekâ ile öz değerlendirme fırsatı ileride"

**Bugün ne var.** Hiçbir şey. Bu, tek başına bir modül.

**Yapılacak.** Teknik iş aslında düz: envanter tanımı (madde listesi, ölçek,
puanlama anahtarı), oturum kaydı, cevaplar, sonuç raporu. Zor olan teknik kısım
değil:

1. **İçerik ve lisans** — bu ölçeklerin madde metinleri ve puanlama anahtarları
   telif korumalıdır; hiçbiri koddan üretilemez, sizden gelmeli. Kullanım izni
   de gerekir (→ **S16**).
2. **KVKK** — kişilik ve mesleki eğilim sonuçları hassas veridir. Kim görecek?
   Öğrencinin kendisi mi, danışmanı da mı, koordinatör de mi? Bu karar açık rıza
   metnini de değiştirir (→ S16).
3. **"Dick Kişilik Envanteri"** — muhtemelen **DISC** kastediliyor (→ S16).

**Büyüklük: XL.** Ayrı faz olarak planlanmasını öneriyorum; içerik gelmeden
tek satır yazılamaz.

### E — YAPILDI (6 Ağustos 2026), dört envanterin içeriği hariç

**Ne değişti.** İstek listesi 6 Ağustos'ta envanterlerin adlarını verdi. Bu,
S16'nın "hangi envanterler" kısmını cevapladı; "madde metinleri nereden
gelecek" kısmını cevaplamadı. Modül, o ayrımın üstüne kuruldu.

#### Yapılan

**Menüde "Algoritmam"** (yalnızca öğrencide) → envanter listesi → tek envanter
ekranı (çöz / sonuç). Motor, ekranlar ve puanlama tamamlandı.

| Envanter | Durum |
|---|---|
| **İlgi Envanteri** | ✅ Çözülebiliyor — 24 madde, 6 başlık |
| **Beceri Envanteri** | ✅ Çözülebiliyor — 25 madde, 5 başlık |
| **Mesleki Yaklaşım Envanteri** | ✅ Çözülebiliyor — 20 madde, 5 başlık |
| Teknoloji Liderliği Özyeterlilik Ölçeği | ⛔ İçerik bekleniyor |
| Dick Kişilik Envanteri | ⛔ İçerik bekleniyor + **adı doğrulanmalı** |
| EPAI — Girişimcilik Potansiyeli | ⛔ İçerik bekleniyor |
| ENTCOM — Girişimci Özellikleri | ⛔ İçerik bekleniyor |

**Üçünün maddeleri bu proje için YAZILDI**, yayımlanmış bir ölçekten
uyarlanmadı; ekranda da böyle yazıyor. Dördü, geçerlik–güvenirlik çalışması
yapılmış yayımlanmış ölçekler: **maddeleri uydurulmadı.** Bir ölçeğin adını
taşıyıp maddelerini uydurmak, öğrenciye o ölçeğin sonucu diye başka bir şey
göstermek olurdu. Tanımları boş duruyor, ekranda "içeriği beklenen envanterler"
başlığı altında neden bekledikleriyle birlikte görünüyorlar ve çözülemiyorlar.

**İçerik geldiğinde yapılacak tek iş** `lib/envanter/tanimlar.ts` içindeki
ilgili tanımın `boyutlar` ve `maddeler` dizilerini doldurmaktır; motor, ekran
ve puanlama hazır. Ters puanlanan madde ve 1–5 dışı ölçek (1–7, 0–4) destekli
ve testli.

#### Kararlar

- **Tanımlar kodda, veritabanında değil** — `KAZANIM_TANIMLARI` /
  `BELGE_TANIMLARI` deseni. Madde metni değişirse geçmiş cevapların anlamı
  değişir; kodda duran tanımın **sürümü** var ve eski sürümle çözülmüş bir
  uygulama **puanlanmıyor**, "eski sürümle çözüldü" diye gösteriliyor. Yeni
  anahtarla eski cevabı puanlamak, kimsenin göremeyeceği bir hata üretirdi.
- **Puanlar saklanmıyor, hesaplanıyor** — nişanlardaki kararın aynısı
  (`lib/kazanim/rozetler.ts`). Saklansaydı puanlama düzeltmesi geçmişe
  yansımazdı.
- **GÖRÜNÜRLÜK: yalnızca kişinin kendisi.** Danışman, il koordinatörü ve proje
  yöneticisi GÖREMEZ; hiçbir yetkili ekranında yer almıyor. Sonuçlar erişim
  loguna da yazılmıyor — yalnızca "başlatıldı/tamamlandı" olayı yazılıyor,
  cevaplar ve puanlar yazılsaydı kişiye özel veri yan kapıdan denetim kaydına
  açılırdı. **Bu bir VARSAYIMDIR** (→ S16'nın KVKK kısmı); dar taraftan
  başlandı, açmak kolay, geri almak değil.
- **Sonuç bir tanı değil.** Ekranların dili buna göre: düşük çıkan başlıkta
  "yapamazsın" denmiyor, "henüz denemedin olabilir" deniyor. Çubuk rengi de
  nötr — kırmızı çubuk "kötü" diye okunurdu.
- **Yarıda bırakmak normal**: işaretlenenler kaydediliyor, kaldığı yerden
  devam ediliyor. Tamamlamak için TÜM maddeler gerekli — boyutlar farklı
  sayıda maddeden hesaplanırsa birbiriyle karşılaştırılamaz.
- **Yeniden çözmek geçmişi silmez**: eski sonuç duruyor, "bir yıl sonra ne
  değişti" ancak böyle görülebilir.
- **Mesleki Yaklaşım'ın başlıkları Seferlerim ile aynı sözcükler** (keşfeden,
  üreten, paylaşan, lider, elçi) — istekte de bu beşli geçiyordu. Ama envanter
  **hiçbir seviye kazandırmaz**: Seferlerim ne YAPTIĞINI sayar, envanter nasıl
  YAKLAŞTIĞINI sorar. Kazandırsaydı form doldurarak nişan alınabilirdi ve
  "beyanla nişan kazanılamaz" ilkesi çökerdi.

#### Kapsam dışı

**Yapay zekâ ile öz değerlendirme** — istekte "ileride yapılacak" yazıyor,
K bölümünde duruyor.

`prisma/migrations/20260806200000_algoritmam_envanterleri`,
`lib/envanter/tanimlar.ts`, `lib/envanter/kurallar.ts`,
`app/panel/algoritmam/` (liste + `[kod]` + eylemler),
`components/EnvanterFormu.tsx`, `components/EnvanterSonucu.tsx`,
`tests/envanter-kurallar.test.ts` (40 test).

---

---

## F. Danışman seçimi ekranı

> **İstek:** "Danışman Öğetmen Adayları başlığı 'Danışman Öğretmenim' olarak
> değiştirilecek." · "Okulunda danışman öğretmen yoksa il koordinatörü de
> listelensin." · "Açıklamadan '…' notu eklenecek." · "Mevcut durum kısmında il
> koordinatörünün de bilgileri (ad soyad, iletişim bilgileri) görüntülenecek."

**Bugün ne var.** `/panel/danisman-secim`: okulundaki danışman adayları
listeleniyor. Okulda danışman yoksa öğrenci zaten **otomatik** olarak il
koordinatörüne bağlanıyor (`IL_KOORDINATOR_FALLBACK`) ama ekranda koordinatörün
bilgisi görünmüyor — istek bu boşluğu kapatıyor, kuralı değiştirmiyor.

**Yapılacak.** Dördü de mevcut veriyle yapılabilir; yeni tablo, yeni kural yok.
İl koordinatörünün iletişim bilgisi `ogretmen_profil`'de zaten var ve öğrenciye
gösterilmesi bu istekle açıkça talep ediliyor.

**Büyüklük: S.** Cevap beklemeden başlanabilir. **Bu maddeyi ilk sıraya almanızı
öneriyorum:** küçük, riski yok ve öğrencinin en çok takıldığı yeri düzeltiyor.

### F — YAPILDI (5–6 Ağustos 2026)

**Başlık.** Sayfa başlığı zaten "Danışman öğretmenim"di; ekranda kalan
"Danışman öğretmen adayları" kart başlığı **"Danışman öğretmen seçimi"** oldu.
Kart başlığını da "Danışman Öğretmenim" yapmadım: sayfanın en üstünde aynı
metin zaten duruyor, ikisi üst üste gelirdi.

**İl koordinatörü artık listede.** Okulunda danışman olmayan öğrenci eskiden
yalnızca "koordinatörünüze bağlısınız" cümlesini görüyordu — bağlı OLDUĞU
kişinin adını bile göremiyordu. Artık koordinatör adı, branşı ve iletişim
bilgisiyle kartta duruyor. **Seçilebilir değil:** seçilecek bir alternatif yok,
atama zaten otomatik yapılmış durumda (`IL_KOORDINATOR_FALLBACK`).

**Mevcut durum bölümü** artık danışmanın iletişim bilgisini de gösteriyor
(koordinatör olsun olmasın). Bilgi `ogretmen_profil`'den geliyor ve yalnızca o
kişiye BAĞLI öğrenciye gösteriliyor — koordinatörün telefonu ilin tamamına açık
bir bilgi değil.

**Notlar eklendi (6 Ağustos).** İstekteki metin ilk turda üç noktayla
kısaltılmıştı ve hiçbir kayıtta yoktu; gelince iki ayrı yere kondu — çünkü ikisi
farklı duruma sesleniyor:

- Aday listesi olan öğrencide, seçim kartının açıklamasında: *"Platforma giriş
  yapmış okulunuz öğretmenleri arasından seçim yapabilirsiniz."* Cümlenin işi
  listenin NEDEN kısa olabileceğini anlatmak — okulda çalışan her öğretmen
  değil, yalnızca platforma girip danışmanlık görevini işaretleyenler görünür.
- Okulunda aday OLMAYAN öğrencide, koordinatör kartının üstünde: *"Danışman
  öğretmeni olmayan öğrencilerin il koordinatörü ile iletişime geçmesi
  gerekmektedir."* Kart koordinatörün adını ve iletişim bilgisini zaten
  gösteriyordu ama "ne yapmam gerekiyor" sorusunu cevaplamıyordu.

Notlar `components/DanismanSecimi.tsx` içinde, yani hem `/panel/danisman-secim`
kapısında hem Panelim'deki bölümde çıkıyor.

---

---

## H. Talep panosu

> **İstek:** "ismi değiştirilecek (çağrı?)" · "Talepler: Ekip arkadaşı, teknik
> destek, sponsor, duyuru (tanıtım/yaygınlaştırma)"

**Bugün ne var.** `/panel/talepler`: serbest metinli ilan + çalışma grubu
filtresi. **Talep türü alanı yok.**

**Yapılacak.** `talep` tablosuna `tur` alanı (enum) + forma seçim + panoya
filtre. Ekran adı → S21.

Bir nokta dikkat çekiyor: **sponsor** talebi ekosistem dışına bakıyor. Bugün
panoyu yalnızca sisteme girmiş kullanıcılar görüyor; sponsor arayan bir ilanın
kime görüneceği açık değil (→ S21). A1 (paydaş girişi) ile bağlantılı.

**Büyüklük: M.**

### H — YAPILDI (6 Ağustos 2026)

S21'e gelen cevap: **"pano olsun adı, eko sistem dışında gözükmeyecek"**.

**Ad "Pano"** — menüde, sayfa başlığında ve gönderme metinlerinde. Varsayımdaki
"Çağrılar" kullanılmadı.

**Dört tür** `TalepTuru` enum'ı olarak geldi: `EKIP_ARKADASI`, `TEKNIK_DESTEK`,
`SPONSOR`, `DUYURU` (migration `20260806120000_talep_turu`). İlan kartında tür
rozeti, panoda tür filtresi, formda **zorunlu** tür seçimi var.

**Sütun NULL kabul ediyor ve eski ilanlar geriye dönük DOLDURULMADI.** Türü
bilinmeyen bir ilana "duyuru" demek, o türle filtreleyen kişiye yanlış liste
gösterirdi. Zorunluluk uygulama katmanında ve yalnızca yeni ilanlarda — aynı
karar 5 Ağustos'ta kazanım kayıtlarının katılım biçimi için de verilmişti.
Filtrede **"Tür belirtilmemiş"** seçeneği var; olmasaydı eski ilanlara filtreyle
hiç ulaşılamazdı.

**Pano ekosistem dışına açılmıyor.** İlanları yalnızca sisteme girmiş
kullanıcılar görüyor ve bu ekranda da yazılı. Dışarıya açık bir ilan sayfası
istenirse bu AYRI bir karardır ve KVKK tarafı yeniden değerlendirilmelidir:
ilanı açan çoğunlukla 18 yaş altı.

**Sponsor ilanını herkes açabiliyor** — plandaki varsayım tersine çevrildi.
Kısıtlamanın gerekçesi ilanın dışarıya görünmesiydi; pano dışarı kapalı olduğu
için o gerekçe kalmadı. Sponsor arayan öğrencinin ilanı sistemdeki paydaş
temsilcilerine ulaşıyor ve temas zaten danışman/koordinatör onayından geçen
bağlantı isteğiyle kuruluyor (A1 ile bağlantılı). Kısıtlamak, çalışan tek yolu
kapatırdı.

---

---

## I. GençTek Market

> **İstek:** "Yeni Sekme: 'Ürünlerim' GençTek Market. Ürün Listele: Kendi
> Ürünlerim, Öğrenci ürünleri, Öğretmen Ürünleri, DİLİM vb. Ürünlerin
> görüntülenme sayıları, indirilme sayıları görüntülenecek. Ürün Ekle:
> 'Profilden ekleyebilirsiniz' notu girilecek."

**Bugün ne var.** Yok. D5 (ürün kaydı) bu maddenin ön koşulu.

**Yapılacak.**

1. Market ekranı: D5'te `markette_paylasilsin` işaretlenmiş ürünler; sahibinin
   rolüne göre sekmeler.
2. **Görüntülenme sayacı** — ürün detayı her açıldığında artan sayaç.
3. **İndirilme sayısı** — indirilecek bir dosya yok ("şimdilik sadece tanıtım").
   Bu sayacın şimdilik neyi sayacağı belirsiz (→ **S22**).
4. **"DİLİM"** — bu kısaltmanın ne olduğunu bilmiyorum (→ **S22**).
5. Moderasyon: markete çıkan ürünü kimse onaylamayacaksa, öğrencinin yazdığı her
   şey doğrudan yayımlanır. Kullanıcıların çoğu 18 yaş altı olduğu için bunun
   bilinçli bir karar olması gerekir (→ S12).

**Büyüklük: L.**

### I — YAPILDI (6 Ağustos 2026), DİLİM ve moderasyon hariç

Menüye **"Ürünlerim"** sekmesi eklendi (`/panel/urunler`) — herkese açık.
Vitrin, D5'te `markette_paylasilsin` işaretlenmiş ürünleri gösteriyor.

#### Yapılan

- **Süzgeçler:** Tüm ürünler · Kendi ürünlerim · Öğrenci ürünleri · Öğretmen
  ürünleri · *DİLİM (tanım bekleniyor)*.
- **"Kendi ürünlerim" diğerlerinden farklı çalışır:** kişinin markette
  PAYLAŞMADIĞI ürünlerini de gösterir. Sekmenin adı "Ürünlerim" ve kişi buraya
  kendi ürünlerini görmeye geliyor; paylaşmadıklarının kaybolması onları
  sildiğini düşündürürdü. Paylaşım durumu satırda rozetle yazıyor ve o ürünü
  sahibinden başkası göremiyor.
- **Ürün detay sayfası:** açıklama, geliştiren ekip, destekleyici görseller,
  bağlantılar, belgeler.
- **Ürün ekleme ekranı YOK** — istekteki not bunu söylüyor: "Profilden
  ekleyebilirsiniz". Markette düğme yerine profile giden bir not duruyor.
  İki yerden eklenebilseydi aynı formun iki kopyası olurdu.
- **Paylaşım anahtarı** ürün sayfasında (yalnızca sahibine): "Markette paylaş"
  / "Paylaşımı kaldır".
- **Mezun ve paydaş ürünleri** rol sekmelerinde görünmüyor ama "Tüm
  ürünler"de var: mezunu öğrenci saymak yanlış olurdu (artık öğrenci değil),
  öğretmen saymak da öyle.

#### "İndirilme sayısı" — indirilecek bir şey yok

İstek "indirilme sayıları görüntülenecek" diyor. Ama ürünlerde **dosya yükleme
kapsam dışı** — isteğin kendi ifadesi: *"Şimdilik sadece tanıtım yapsınlar"*
(D5 · K). Ürün kaydının taşıdığı şey tanıtım metni, görseller ve bağlantılar;
indirilebilir bir dosya yok, dolayısıyla "indirilme" diye sayılabilecek bir
olay da yok.

Sayacı hiç koymamak (istekte açıkça isteniyor) ya da koyup her üründe 0
göstermek (ekranda bozuk görünen ölü bir sayı) yerine **ölçülebilen en yakın
olay** sayılıyor: **ürünün bağlantısına gidilmesi**. Kullanıcı bir ürünü
edinmek istediğinde yaptığı şey tam olarak budur — deposuna, canlı sürümüne ya
da tanıtımına gider.

Ekranda "İndirilme" **yazmıyor**, "Bağlantı ziyareti" yazıyor ve sayfanın
altında ne saydığı açıkça anlatılıyor. Dosya yükleme açılırsa gerçek indirme
ayrı bir sütun olur, bu sayaç anlamını korur. **→ S22 hâlâ açık.**

#### Sayaçlar

- **Görüntülenme:** ürün detayı her açıldığında artar. **Sahibinin kendi bakışı
  sayılmaz** — kişi kendi sayfasını yenileyerek sayacı şişirebilseydi ürünler
  arası karşılaştırma anlamını yitirirdi. Tekilleştirme yok: aynı kişi iki kez
  bakarsa iki sayılır (vitrin sayacı, denetim kaydı değil).
- **Bağlantı ziyareti:** sahibinin kendi tıklaması DA sayılıyor — görüntülemeden
  farklı, çünkü bağlantıya gitmek iradeli bir eylem.
- **Sayaçlar sütun, ayrı tablo değil.** "Her görüntülemeyi satır olarak tut"
  daha zengin olurdu ama popüler bir üründe milyonlarca satır demekti; kim neye
  baktı bilgisi zaten erişim logunda.

#### İki güvenlik kararı

1. **Bağlantılar ara duraktan geçiyor** (`/panel/urunler/[id]/git/[baglantiId]`)
   çünkü sayaç ancak sunucudan geçen bir istekle artabilir. **Adres istekten
   OKUNMUYOR**, veritabanındaki satırdan geliyor: adres parametre olarak
   alınsaydı bu yol, GençTek alan adının arkasına gizlenmiş bir **açık
   yönlendirici** olurdu — oltalama için birebir malzeme. Protokol ayrıca
   yeniden doğrulanıyor (http/https), 302 kullanılıyor (301 önbelleğe alınır ve
   sayaç bir daha artmazdı).
2. **Markette paylaşılan ürünün görseli kapsam filtresinden muaf tutuldu**
   (`kazanim-ekleri/[ekId]`). Kapsam filtresi iki öğrencinin birbirini
   görmesini engelliyor ve bu, vitrindeki ürünün görselini herkes için kırık
   gösteriyordu. Muafiyetin dayanağı sahibinin **açık tercihi**; muafiyet dar:
   yalnızca `tip=URUN` ve yalnızca paylaşım açıkken. Sertifika görseli kimseye
   açılmıyor.

#### Kalan

- **DİLİM** — ne olduğu bilinmiyor (→ **S22**). Süzgeç listede duruyor ama
  seçilemiyor ve nedeni ekranda yazıyor. Gizlenseydi istekte sayılmış bir
  başlık unutulmuş gibi görünürdü; uydurma bir kategori açmak da sonradan elle
  temizlenecek veri üretirdi. Tanım geldiğinde `MARKET_SUZGECLERI` içindeki
  bayrak kalkar ve `urunleriSuz`'e bir dal eklenir.
- **Moderasyon** — markete çıkan ürünü kimse onaylamıyor; öğrencinin yazdığı
  doğrudan yayımlanıyor. Kullanıcıların çoğu 18 yaş altı olduğu için bu bilinçli
  bir karar olmalı (→ **S12**). Bugünkü koruma: vitrin **ekosistem içine
  kapalı** — ilanları yalnızca sisteme girmiş kullanıcılar görüyor (pano ile
  aynı ilke · S21).

#### İlk denemede çıkan iki kusur (aynı gün düzeltildi)

1. **"Profilden ekleyebilirsiniz" notu boşa düşüyordu.** Bağlantı olmayan bir
   çıpaya (`#urunlerim`) gidiyordu; profil uzun bir sayfa olduğu için kişi
   tepede kalıyor ve formu bulamıyordu. Doğrusu
   **`/panel/profil?tur=URUN#kayit-ekle`** — hem "Yaptığım ürünler" sekmesini
   seçiyor hem forma iniyor.
2. **Paylaşılmamış ürün markete HİÇ çıkamıyordu.** Kazanım kayıtlarının
   düzenleme eylemi yok (yalnızca ekle/sil), yani kutu işaretlenmeden eklenen
   ürün için tek yol, ürünü silip açıklamasıyla ve görselleriyle baştan
   girmekti. "Kendi ürünlerim" sekmesi de o ürünü gösterip hiçbir şey
   yaptırmıyordu. **Ürün sayfasına paylaşım anahtarı eklendi**
   (`app/panel/urunler/eylemler.ts`). Tam bir düzenleme formu yazılmadı: eksik
   olan tek şey bu bayraktı ve düzenleme formu, tüm kazanım tipleri için
   verilmiş "ekle/sil" kararını tek tip için delen ayrı bir karardır.
   Paylaşım kapatılıp açıldığında **sayaçlar sıfırlanmıyor** — sayaç ürünün
   geçmişidir, vitrinde kaldığı sürenin değil.

Ayrıca profildeki onay kutusunun açıklaması güncellendi: "Market ekranı henüz
açılmadı" diyordu, artık yanlıştı.

`prisma/migrations/20260806220000_market_sayaclari`, `lib/market/kurallar.ts`,
`app/panel/urunler/` (liste + `[id]` + `git/[baglantiId]` + eylemler),
`app/panel/kazanim-ekleri/[ekId]/route.ts` (muafiyet),
`app/panel/profil/page.tsx` (onay kutusu metni),
`tests/market-kurallar.test.ts` (23 test).

---

---

## J. Öğretmen tarafı

### J1 — Danışmanlığı bırakma

> **İstek:** "Öğretmen danışmanlığını yaptığı öğrencileri isterse
> bırakabilmeli"

**Bugün ne var.** Öğretmen profilinden **danışmanlık görevinin tamamını**
bırakabiliyor (`DANISMANLIK_BIRAKILDI`), o zaman bütün öğrencileri dağıtılıyor.
**Tek tek** öğrenci bırakma yok.

**Yapılacak.** Tek öğrenci bırakıldığında o öğrenci nereye gidecek? Okuldaki
başka danışmana mı, "yeniden seç" bildirimi mi, il koordinatörüne mi? Devir
tablosu (`domain-rules.md`) bu durumu **toplu ayrılma** için tanımlıyor, tekil
bırakma için tanımlamıyor (→ **S23**).

Ayrıca kötüye kullanım kapısı: "zor" öğrencinin bırakılması. Gerekçe zorunlu
tutulmalı ve erişim kaydına yazılmalı — bunu öneriyorum.

**Büyüklük: M.**

### J1 — YAPILDI (6 Ağustos 2026)

S23'e gelen cevap: *"koordinatöre bilgi gitsin gerekçe şart"*.

Öğrenci detayında, **yalnızca o öğrencinin kendi danışmanına** görünen katlı bir
bölüm. Koordinatör ya da merkez buradan bırakamaz — o bir devir işlemidir,
farklı bir karardır.

**Üç şey birlikte yapılır, hiçbiri isteğe bağlı değil:** gerekçe zorunlu (en az
10 karakter), il koordinatörüne gerekçeli bildirim, erişim kaydına yazım. Üçü
birden olmadan "zor öğrenciyi sessizce bırakma" kapısı açık kalırdı.

**Öğrenci nereye gider:** ayrı bir kural yazılmadı, mevcut devir kuralları
(`devirKarariVer`) aynen uygulandı. Okulda başka danışman kaldıysa ona, birden
fazla varsa "yeniden seç" bildirimi ve geçici olarak koordinatöre, hiç kalmadıysa
koordinatöre. **Devredilecek kimse yoksa bırakma YAPILMAZ:** öğretmen görevde
kalır, proje yöneticisine uyarı düşer — boşta öğrenci kalamaz.

Yeni bildirim şablonu: `DANISMANLIK_TEKIL_BIRAKILDI`. Yeni tablo yok; kapanma
nedeni olarak mevcut `DANISMANLIK_BIRAKILDI` kullanıldı.

### J2 — Görev Rolleri → Öğrencilerim

> **İstek:** "Görev Rolleri sekmesi kaldırılacak. Öğrencilerim sekmesinden
> Filtreleme bölümünde 'Okul Temsilcisi Yap' check boxı olmalı."

**Bugün ne var.** `/panel/gorev-rolleri` üç rolü yönetiyor: **İl Temsilcisi**
(koordinatör atar), **İlçe Temsilcisi** (koordinatör atar), **Okul Temsilcisi**
(danışman atar).

**Sorun:** istek yalnızca Okul Temsilcisi'nden söz ediyor. Sekme kaldırılırsa il
ve ilçe temsilcisi atamaları **sahipsiz kalır** (→ **S17**).

**Büyüklük: M.**

### J2 — YAPILDI (5 Ağustos 2026)

S17'ye gelen cevap: **(a)** — sekme koordinatörde kalsın.

- **Okul Temsilcisi**, Öğrencilerim tablosunda satır başına düğme oldu. Yalnızca
  o öğrencinin okulunda yetkisi olana basılıyor; yetki eylemin içinde bir kez
  daha sorgulanıyor (form kurcalanabilir).
- İşlem sonrası listeye **filtreler korunarak** dönülüyor: 400 kişilik listede
  filtreleyip atama yapan öğretmen baştan filtrelemek zorunda kalmasın.
- **Menüdeki ad danışman öğretmende "Öğrencilerim"** oldu (6 Ağustos);
  koordinatör ve merkezde "Öğrenciler" kaldı. Ad kapsamı anlatıyor: danışmanın
  listesi kendi danışmanlığındaki öğrencilerdir, koordinatörünki ilin tamamı.
- **Görev Rolleri sekmesi** danışman öğretmenin menüsünden çıktı; il koordinatörü
  ve merkezde kaldı. Başlığı artık "İl ve İlçe Temsilcisi atamaları" diyor ve
  koordinatöre Okul Temsilcisi'nin nerede olduğunu söyleyen bir not var.
- Görevi **kaldırma** koordinatörde de duruyor: okulda danışman kalmadığında
  yanlış bir atamayı düzeltebilecek tek kişi o.

### J3 — Raporlar ve Belge Oluştur → Etkinlikler

> **İstek:** "Raporlar ve Belge Oluştur sekmesi kaldırılıp Etkinlikler kısmında
> oluşturulacak."

**Bugün ne var.** `/panel/raporlar` (raporu yazılmamış bitmiş etkinlikler
listesi) ve `/panel/belgeler` (katılım/teşekkür belgesi). İkisinin de **etkinlik
detayından** girişi zaten var; menü girişleri kestirme.

**Yapılacak.** Menüden kaldırmak kolay. Belirsiz olan: "Etkinlikler kısmında"
etkinlik **listesinde bir sekme** mi, yoksa **her etkinliğin detayında** mı
(→ **S24**). Rapor bekleyen etkinliklerin toplu listesi kaybolmamalı —
koordinatörün "hangi raporlar eksik" görünümü buradan geliyor.

**Büyüklük: M.**

### J3 — YAPILDI (6 Ağustos 2026)

S24 için "sen öner" dendi; önerilen ve uygulanan çözüm:

- **İki sekme menüden kalktı**, sayfalar kaldı (`/panel/raporlar`,
  `/panel/belgeler` doğrudan adresle çalışıyor).
- Uyarıdaki risk gerçekti: sekmenin kaldırılmasıyla kaybolacak **tek şey** "hangi
  raporlar eksik" toplu görünümüydü. O görünüm Etkinlikler listesine **"Raporu
  bekleyenler" filtresi** olarak taşındı.
- Bitmiş ama raporsuz etkinlikler listede **rozetle** de işaretleniyor; filtre
  kapalıyken gözden kaçmasınlar diye.
- "Bitmiş" ölçütü **bitiş tarihi** (yoksa etkinlik tarihi): çok günlü bir etkinlik
  daha sürerken rapor beklenir görünmemeli. İptal edilen etkinlik listelenmiyor —
  raporu zaten yazılmaz.
- Filtre ve rozet yalnızca **rapor yazabilenlere** basılıyor; kimsenin
  yazamayacağı bir eksiği listelemek gürültüdür.
- Belge Oluştur ekranına Etkinlikler listesinden düğme kondu.

### J4 — Paydaşlar → etkinlik ekleme

> **İstek:** "Paydaşlar sekmesi kaldırılacak. Faaliyet Ekle kısmında iş birliği
> yapılan paylaşlar eklenecek."

**Bugün ne var.** `/panel/paydaslar`: il bazlı paydaş **envanteri** (kayıt açma,
düzenleme, CSV). Ayrıca etkinliğe paydaş bağlama zaten var (`faaliyet_paydas`).

**Sorun:** envanter ile bağlama iki ayrı iş. Sekme kalkarsa koordinatör yeni
paydaş kaydını nereden açacak, mevcut kayıtları nereden düzeltecek? Etkinlik
formunun içinden kurum kaydı açtırmak, aynı kurumun onlarca kez farklı yazımla
girilmesine yol açar (→ **S18**).

**Büyüklük: M.**

### J4 — YAPILDI (5 Ağustos 2026)

S18'e gelen cevap: **(b)** — envanter koordinatörde kalsın.

- **Paydaşlar sekmesi** danışman öğretmenin menüsünden çıktı; kayıt açma yetkisi
  olanlarda (il koordinatörü, merkez) kaldı. Yetki zaten böyleydi
  (`paydasEkleyebilirMi`); menü artık onu yansıtıyor.
- **Etkinliğe paydaş bağlama** yerinde; danışman öğretmen için tek yol o.
- Paydaş bölümüne, **listede olmayan kurum için ne yapılacağı** yazıldı: "il
  koordinatörünüzden paydaş envanterine eklemesini isteyin". Bu not olmadan
  öğretmen çıkmaz sokakta kalır ve kaydı uydurmaya çalışırdı — S18'in uyardığı
  kirlenme tam olarak böyle başlıyor.

**Envanter etkinlik formuna TAŞINMADI.** Aynı kurumun "Ankara Üniv." / "Ankara
Üniversitesi" / "A.Ü." diye onlarca kez girilmesi ve il bazlı paydaş raporunun
anlamsızlaşması, geri dönüşü olmayan bir veri kaybıdır.

### J4 — tamamlandı (6 Ağustos 2026)

İlk turda paydaş bağlama yalnızca etkinlik DETAYINDA vardı; istekte ise
"**Faaliyet Ekle** kısmında iş birliği yapılan paydaşlar eklenecek" yazıyor.
Eksik parça kapatıldı: **yeni etkinlik formunda paydaş seçimi** var.

- Seçenekler kapsam filtresinden geçiyor ve formdan gelen kimlikler sunucuda
  yeniden doğrulanıyor — istek kurcalanıp başka ilin paydaş kimliği yazıldığında
  kurum bağlanmaz. Pasife alınmış kurum da yeni etkinliğe bağlanmaz.
- **Envanter yine açılmıyor, yalnızca seçiliyor.** Kurum kaydını il koordinatörü
  açıyor (S18).
- Kart liste BOŞKEN de basılıyor: gizlemek, kullanıcıya hem böyle bir alanın
  varlığını hem kurumun oraya nasıl ekleneceğini kaybettirirdi.
- Katkı metni (mekân, eğitmen, ödül desteği) açılış formunda sorulmuyor; katkı
  çoğu zaman etkinlik yürürken netleşiyor ve detay ekranından yazılabiliyor.

### J5 — Katılım belgesinde imza makamı

> **İstek:** "Katılım Belgesi: Okul içinde ise okul müdürü, il bazında ise il
> milli eğitim müdürü imzalı"

**Bugün ne var.** Belge, resmî şablon üzerine yazdırılıyor; imza bloğu
kapsama göre değişmiyor.

**Yapılacak.** Kural basit (kapsam OKUL → okul müdürü, kapsam İL → il millî
eğitim müdürü). **Veri yok:** sistemde okul müdürü ya da il millî eğitim müdürü
adı tutulmuyor; e-Okul'dan da gelmiyor (→ **S25**). Ulusal kapsamda ne
yazılacağı da belirtilmemiş.

**Büyüklük: M** (ad kaynağı çözülünce **S**).

### J5 — YAPILDI (6 Ağustos 2026)

S25'e gelen cevap: *"elle yazılsın, yani sistemden anlık giriş olsun; eskiden
oturum kişisinden geliyordu"*.

- **Ad elle giriliyor ve ZORUNLU.** İmzasız bir katılım belgesi resmî olarak işe
  yaramaz; sessizce üretmek, farkına varılmadan imzasız belge dağıtılmasına yol
  açardı. Adres çubuğundan imzasız istenen belge de reddediliyor.
- **Unvan kapsamdan türetiliyor:** OKUL → "Okul Müdürü", IL → "İl Millî Eğitim
  Müdürü". Alan düzenlenebilir (müdür yardımcısı gibi durumlar için).
- **ULUSAL kapsamda öneri ÜRETİLMİYOR:** istekte belirtilmedi ve uydurmak resmî
  bir belgeye olmayan bir makam yazmak olurdu; orada düzenleyen birim geliyor.
- Tekil ve toplu belge **aynı kuraldan** geçiyor: iki ekran ayrı hesaplasaydı
  aynı etkinliğin çıktıları farklı imza taşıyabilirdi.
- **Yan etki:** kişi başına "hızlı belge" bağlantıları düğmeye dönüştü.
  `<a href>` bir form alanını taşıyamıyor; bağlantı kalsaydı tekil belgeler
  imzasız üretilmeye çalışılır ve reddedilirdi. Belge türü artık tek yerden
  (üstteki seçim) geliyor.

---

---

## Uçtan uca denetim (6 Ağustos 2026)

Yapıldı denen 25 maddenin tamamı, **çalışan uygulamada** rol rol gezilerek
sınandı: öğrenci, danışman öğretmen, il koordinatörü, proje yöneticisi ve
oturumsuz ziyaretçi. **64 kontrol, 64'ü geçti.**

Kontrol edilenler arasında: menü adları ve kalkan sekmeler (B2/B3), eski
adreslerin yaşamaya devam etmesi (`/panel/faaliyetler` → 308, `/panel/kvkk`
→ 200), profil bölümlerinin varlığı (D1–D8), kayıt türü sekmeleri
(Sertifikalarım, Topluluklarım, Yaptığım ürünler), ürün formunun alanları,
dört talep türü (H), Algoritmam'ın üç çözülebilir + dört bekleyen envanteri,
Market süzgeçleri ve sayaçları, öğretmen tarafının beş maddesi ve rol
sızıntısı olmadığı.

### Denetimde çıkan tek kusur — düzeltildi

**`/panel/dis-basvurular` yetkisiz kullanıcıya 500 veriyordu.** Sayfa
`throw new YetkiHatasi(...)` yapıyor, hata sınırına düşüyor ve ekranda
*"Beklenmeyen bir hata oluştu"* yazıyordu. Ortada beklenmeyen bir şey yok —
ekran o kişiye kapalı.

Panelde **deseni bozan tek sayfa buydu**: diğer korumalı ekranların hepsi
(paydaşlar, erişim kayıtları, rol envanteri, duyurular, raporlar, öğrenciler,
öğretmenler, görev rolleri, il dışı başvurular) nazik bir kart basıyor. Aynı
desene çekildi. Veri sızıntısı yoktu ve yok: yetki kontrolü hiçbir başvuru
okunmadan önce dönüyor.

`YetkiHatasi` sunucu **eylemlerinde** kullanılmaya devam ediyor; orada hata
fırlatmak doğru davranış.

### Doğrulanan "bilerek böyle" davranışlar

Denetimde ilk bakışta kusur gibi görünüp aslında kasıtlı olduğu doğrulananlar:

- **J1 düğmesi listede değil, öğrenci detayında ve katlanmış** — ekranın asıl
  işi bu değil, açıkta duran bir düğme yanlışlıkla tıklanırdı.
- **Parametresiz `/etkinlikler/[id]/belge` 404 veriyor** — J5'in kuralı:
  imzasız belge üretilmez, adres çubuğundan istenen de reddedilir.
- **Yetkisiz ekranlar 200 döndürüyor** (403/404 değil): varlığı gizlenmesi
  gereken KAYITLAR için 404 kullanılıyor (`BulunamadiHatasi`), ekranın kendisi
  için nazik kart. İkisi ayrı araç.
- **Kodda `faaliyet` tanımlayıcıları duruyor** — B1 zaten "arayüz + URL" diyor;
  tablo adları, `lib/faaliyet/` ve `{{faaliyetAdi}}` bilerek değişmedi.

---

---

## Uygulanan sıra (tarihsel kayıt)

> Plan aşamasında önerilen sıra buydu ve büyük ölçüde bu sırayla uygulandı.
> Kayıt olarak duruyor: bir maddenin neden o anda yapıldığı — ya da neden
> bekletildiği — sonradan sorulabilir.

Cevap beklenmeden yapılabilecekler önde, mimariyi değiştirenler sonda:

1. **F** (danışman seçimi ekranı) — küçük, risksiz, en çok takılınan yer.
2. **B1** (Faaliyet → Etkinlik) — sonraki maddeler doğru adla yazılsın diye erken.
3. **D1, D2, D8** (profil başlıkları ve kayıt formu düzeltmeleri).
4. **B2, B3, C1** — cevaplar geldikçe (menü ve panel düzeni birlikte).
5. **C2, C4, D3–D7** — profil ve panel içeriği.
6. **H, J1–J5** — talep türleri ve öğretmen tarafı.
7. **G** (gruplar), **I** (Market) — büyük modüller.
8. **E** (Algoritmam) — ayrı faz.

**E'yi bu listenin geri kalanıyla aynı pakete koymamanızı öneriyorum.** Tek
başına diğer 24 maddenin toplamı kadar iş ve risk taşıyor; aynı sürüme
sıkıştırılırsa küçük ve kesin işler de onun takviminde bekler. A1 için de aynısı
geçerliydi ve ayrı tutuldu (5 Ağustos'ta tek başına yapıldı).

Kalanların özeti — durum, engelleyen sorular ve en hızlı yol —
[`liste.md`](liste.md) dosyasında.
