# GençTek — İş Kuralları

İçindekiler:
1. Kimlik doğrulama ve kullanıcı sağlama (mock aşama)
2. Roller
3. Danışman atama ve devir
4. Öğrenci görev rolleri
5. Çalışma grupları
6. Faaliyet yönetimi
7. Dosya, görsel ve yorumlar
8. Başvuru ve değerlendirme
9. Bildirimler
10. KVKK ve loglama
11. Kenar durumlar
12. Rol/Atama Envanteri (proje yöneticisi)
13. Rozet / katkı kategorileri — Faz 2

---

## 1. Kimlik doğrulama ve kullanıcı sağlama (mock aşama)

EBA SSO erişimi henüz yok. Bu aşamada:

- Bir `AuthProvider` arayüzü tanımla: girdi kimlik bilgisi, çıktı `{ kullaniciId, ad, soyad, cinsiyet, kurumKodu, il, ilce, sinif|brans, egitimOgretimYili }`.
- Mock implementasyon: sabit test kullanıcıları (birkaç öğrenci, birkaç öğretmen, farklı okul/il kombinasyonlarıyla) döndürsün. Basit bir "test kullanıcısı seç" ekranı yeterli — şifre/kayıt akışı kurma, EBA zaten bunu yapmayacak.
- **Bu bölüm yalnızca okul tarafını anlatır.** Mezun ve paydaş temsilcisinin kimliği `AuthProvider`'dan hiç geçmez; onlar e-posta ve şifreyle girer (Bölüm 17). İki akış oturum katmanında birleşir: çerez yalnızca `authProviderId` taşır, rol ve kapsam her istekte veritabanından okunur. EBA SSO bağlandığında dış akış olduğu gibi kalır.
- Üst katmanlar (profil, yetki, atama) `AuthProvider` çıktısına göre çalışsın; EBA geldiğinde yalnızca bu katman değişecek.

**İlk giriş:** Kullanıcı yoksa oluştur. Rol tayini:
- `AuthProvider` öğrenci döndürüyorsa → `OGRENCI`
- Öğretmen ise → rolsüz kullanıcı, danışman listesine girmesi için kendi işaretlemesi gerekir
- `IL_KOORDINATOR` ve `PROJE_YONETICISI` asla otomatik verilmez, elle atanır

**Sonraki girişler:** `AuthProvider`'dan gelen alanları güncelle. Kurum kodu değiştiyse Bölüm 3'teki devir akışını tetikle.

**Gecelik senkron:** Öğretmen uzun süre giriş yapmazsa kurum kodu değişikliği fark edilmez. Bu yüzden gecelik bir iş, aktif danışmanların kurum bilgisini kontrol eder ve değişenler için devir akışını çalıştırır. Mock aşamada bu işi test verisiyle de çalıştırılabilir şekilde kur.

**Salt okunur alanlar (mock aşamada da geçerli):** Ad, Soyad, Cinsiyet, Okul adı, Kurum kodu, Okul türü, İl, İlçe, Sınıf (öğrenci), Branş (öğretmen), Eğitim-öğretim yılı.

Bu alanların yanında şu açıklama gösterilir: *"Bu bilgi e-Okul kayıtlarından gelmektedir; hatalı ise okul idaresine başvurunuz."*

---

## 2. Roller

**Okul tarafı (kimliği EBA'dan gelir):**
`OGRENCI` · `DANISMAN` · `IL_KOORDINATOR` · `PROJE_YONETICISI`

**EBA dışı (kimliği başvuruyla açılır, bkz. Bölüm 17):**
`MEZUN` · `PAYDAS_TEMSILCISI`

Kurallar:
- Bir öğretmen aynı anda hem `DANISMAN` hem `IL_KOORDINATOR` olamaz (DB kısıtı).
- `IL_KOORDINATOR` atamasını yalnızca `PROJE_YONETICISI` yapar.
- `PROJE_YONETICISI` = YEĞİTEK kullanıcısı. Ayrı bir süper-admin rolü yok.
- Tüm öğretmenler sisteme giriş yapabilir; danışman listesinde görünmek için `DanismanOlarakGorevAlmakIstiyorum` alanını işaretlemeleri gerekir. Onay süreci yoktur.
- `MEZUN` ve `PAYDAS_TEMSILCISI` **otomatik verilmez ve elle de atanmaz**: yalnızca onaylanan bir dış başvurudan doğar (Bölüm 17). İkisinin de **kurum kodu yoktur** — bu, kapsam filtrelerini yazarken sürekli akılda tutulması gereken tek fark.
- İki dış rol, kapsam filtrelerinin hiçbirinde varsayılan olarak "görür" tarafına düşmez. Yetkileri `permissions.md` Bölüm 1.1'de sayılıdır ve **dar başlangıç** ilkesine tabidir.

---

## 3. Danışman atama ve devir

Eşleştirme anahtarı **kurum kodu**dur.

### İlk atama

Öğrenci profilini tamamladığında:

- Okulda danışman işaretli öğretmen **birden fazla** → öğrenci listeden seçer
- **Tek** → otomatik atanır
- **Hiç yok** → il koordinatörüne atanır

Öğrenci profilinde her zaman tek bir danışman gösterilir.

### Danışman ayrıldığında (kurum kodu değişimi)

| Okulda kalan danışman | Yapılacak |
|---|---|
| Tek danışman kaldı | Öğrenciler otomatik ona devredilir |
| Birden fazla danışman var | Öğrenciye "danışmanın değişti, yeniden seç" bildirimi; seçim yapılana kadar geçici olarak il koordinatörüne bağlanır |
| Hiç danışman kalmadı | İl koordinatörüne devredilir |

Devir işleminde eski `DanismanAtama` kaydı kapatılır (`bitisTarihi` yazılır), yeni kayıt açılır. Güncelleme yapma — geçmiş kaybolur.

### Okula sonradan danışman gelirse

İl koordinatörüne bağlı öğrenciler **otomatik devredilmez**. İl koordinatörüne "okulunuzda yeni danışman öğretmen var, X öğrenci devredilebilir" bildirimi gider; devri o onaylar.

### Öğretmen tek bir öğrencinin danışmanlığını bırakırsa (6 Ağustos 2026)

Öğretmen görevin TAMAMINI bırakmadan, tek bir öğrenciyi bırakabilir. Üç şey
birlikte olur ve hiçbiri isteğe bağlı değildir:

1. **Gerekçe zorunlu** (en az 10 karakter).
2. **İl koordinatörüne bildirim** gider; gerekçe ve öğrencinin yeni durumu
   metinde yazılıdır.
3. **Erişim kaydına** yazılır.

Sebebi açık bir kötüye kullanım kapısıdır: "zor" bulunan öğrencinin sessizce
bırakılması. Üçü birden olmadan karar görünmez kalır.

**Öğrenci nereye gider:** yukarıdaki devir tablosu AYNEN uygulanır. Ayrı bir
kural yazılmadı; aynı soru daha önce cevaplanmıştı ve iki ayrı cevap zamanla
ayrışırdı.

**Devredilecek kimse yoksa bırakma YAPILMAZ:** okulda başka danışman ve ilde
koordinatör yoksa öğretmen görevde kalır, proje yöneticisine uyarı düşer.
Boşta öğrenci kalamaz.

Yalnızca öğrencinin KENDİ danışmanı bırakabilir; koordinatör ve merkez bu yolu
kullanamaz — onlarınki bir devir işlemidir, farklı bir karardır.

### Öğrenci kendi isteğiyle danışman değiştirirse

Öğrenci danışmanını **istediği zaman** değiştirebilir; danışmanın ayrılmasını beklemesi gerekmez. Onay aranmaz, değişiklik anında geçerlidir (ilk seçimle aynı mantık). Sıklık sınırı da yoktur.

Tek kısıt: yalnızca **kendi kurum kodundaki ve danışman olarak işaretli** öğretmenler arasından seçim yapabilir.

Veri modelinde: eski kayıt `kapanma_nedeni = OGRENCI_ISTEGI` ile kapanır, yeni kayıt `atama_tipi = OGRENCI_SECTI` ile açılır.

### Danışmanı olan öğretmen il koordinatörü yapılırsa

**Karar verildi (varsayım değil).** Atama **engellenmez**. Sıra şudur:

1. Öğretmenin danışmanlık görevi kapatılır (bir öğretmen aynı anda hem danışman hem il koordinatörü olamaz — DB kısıtı).
2. İl koordinatörlüğü açılır.
3. Öğretmenin üzerindeki öğrenciler yukarıdaki **devir tablosuna göre** yeniden dağıtılır: okulda tek danışman kaldıysa ona; birden fazla danışman varsa öğrenciye "yeniden seç" bildirimi gider ve seçim yapılana kadar geçici olarak il koordinatörüne bağlanır; hiç danışman kalmadıysa il koordinatörüne devredilir.
4. İşlemi yapan proje yöneticisine **"X öğrenci yeniden dağıtıldı"** uyarısı gösterilir.

Dağıtım rol değişiminden **sonra** yapılır: böylece "il koordinatörüne devret" kararı yeni koordinatörü (yani bu öğretmeni) bulur. Okulda başka danışman kalmadıysa öğrenciler fiilen yerinde kalır — aynı kişi yeniden yazılmaz ve gereksiz "danışmanınız değişti" bildirimi gitmez.

---

## 4. Öğrenci görev rolleri

Üç görev rolü vardır ve bunlar **öğrencilere** verilir:

- **İl Temsilcisi** — her ilde bir öğrenci, il koordinatörü atar
- **İlçe Temsilcisi** — her ilçede bir öğrenci, **ilin** koordinatörü atar
- **Okul Temsilcisi** — her okulda bir öğrenci, danışman öğretmen atar

Kurallar:
- Bu roller **hiçbir ek veri görüntüleme yetkisi vermez**. Görev etiketidir; ileride rozet olarak kullanılacaktır.
- Eğitim-öğretim yılı bazlıdır (görev dönemi). Kalıcı bayrak olarak tutma.
- Tekillik: il başına bir İl Temsilcisi, ilçe başına bir İlçe Temsilcisi, okul başına bir Okul Temsilcisi — dönem bazında, kısmi unique index'lerle korunur.
- Her rolün kapsamı **kendi sütununda** durur (`il_kodu` / `ilce_kodu` / `kurum_kodu`) ve rolüne göre zorunludur (`ck_ogrenci_gorev_kapsam`). Kapsam öğrencinin güncel kaydından okunmaz, göreve **yazılır**: öğrenci dönem içinde okul (dolayısıyla ilçe) değiştirdiğinde görev verildiği yerde kalmalıdır.
- **İlçe düzeyinde görevli yoktur.** `RolKodu`'nda `ILCE_KOORDINATOR` diye bir değer yok; ilçe, ilin içindeki bir basamaktır ve temsilcisini o ilin koordinatörü belirler.
- e-Okul kaydında ilçesi boş olan öğrenciye İlçe Temsilciliği verilemez — kapsam sütunu boş kalacağı için veritabanı kısıtı zaten reddeder.

### Katkı kartı

Temsilcilikler, çalışma grupları ve öğrencinin **düzenlediği faaliyetler** öğrencinin ekranlarında tek bir "Katkı kartı"nda toplanır (`/panel/profil` ve `/panel/kazanimlarim`). Kartta **geçmiş dönemlerin** görevleri de dönemiyle birlikte durur: geçen yılın il temsilciliği bir katkıdır ve eylülde sessizce silinmemelidir.

Öğretmenin katkı kartı aynı ekranlarda ama **kendi kalemleriyle** durur: rolleri, aktif danışmanlıkları ve düzenlediği faaliyetler. Öğrencinin kalemleri (çalışma grubu seçimi, temsilcilik) öğretmende hiçbir zaman dolmaz; ortak bir kart bunları boş satır olarak taşırdı.

---

## 5. Çalışma grupları

Tanımlı gruplar:

1. Oyun Tasarımı
2. Siber Güvenlik
3. Bilgisayar Olimpiyatları
4. Mobil Programlama
5. Web Programlama
6. Havacılık Sistemleri
7. Robotik
8. Yapay Zekâ
9. E-Ticaret ve E-İhracat
10. Dijital Sanatlar ve İçerik Geliştirme
11. Açık Kaynak
12. Espor

Kurallar:
- Liste **sabit kodlanmaz**; tanım tablosunda tutulur, proje yöneticisi yönetir.
- Kapanan grup silinmez, `Aktif=false` yapılır. Pasif gruplar yeni seçimlerde listelenmez, geçmiş kayıtlar korunur.
- Öğrenci birden fazla grup seçebilir. **Üst sınır yoktur** — istediği kadar grup seçer. "En fazla 3" gibi bir kısıt eklemeyin; bu daha önce vardı, kaldırıldı.

### Öğrenciyi gruba kim ekler

Seçimi öğrenci kendisi yapar (`/panel/calisma-gruplari`), ama **danışman öğretmeni, il koordinatörü ve proje yöneticisi de** öğrencinin profilinden ekleyip çıkarabilir. Kayıt hangi yoldan açıldıysa `ogrenci_calisma_grubu.ekleyen_kullanici_id` onu söyler (NULL = öğrencinin kendi seçimi) ve öğrenci bunu profilinde görür.

Bu, **grubu tanımlamak**tan (yalnızca proje yöneticisi) ayrı bir yetkidir: burada listeye yeni grup eklenmiyor, mevcut bir gruba öğrenci yazılıyor.

Ekleme iki kontrolden **birlikte** geçer: rol (`ogrenciCalismaGrubuYonetebilirMi`) **ve** kapsam (merkezi öğrenci kapsam filtresi). Yalnızca rol sorulsaydı bir danışman, forma başka bir okulun öğrenci id'sini yazarak o öğrenciyi gruba kaydedebilirdi. Yeni kayıt yalnızca **aktif** gruba açılır; çıkarma pasif gruptan da yapılabilir.

---

## 6. Faaliyet yönetimi

### Kapsam ve yetki

| Kapsam | Açan rol | Başvurabilecek öğrenciler | Değerlendiren |
|---|---|---|---|
| Okul içi | Danışman öğretmen, öğrenci | Sadece o okulun öğrencileri | Faaliyeti açan |
| İl içi | İl koordinatörü, öğrenci | Sadece o ilin öğrencileri | Faaliyeti açan |
| Ulusal | İl koordinatörü, proje yöneticisi, öğrenci | Ülke genelindeki tüm öğrenciler | Faaliyeti açan |

Danışman öğretmen **il içi veya ulusal faaliyet açamaz.**

**Öğrencinin kapsam sınırı yoktur** ama açtığı hiçbir faaliyet kendiliğinden yayına girmez (bkz. Onay akışı). Yeri roldan değil kayıtlı okul/ilinden gelir: okul içi önerisi kendi okuluna, il geneli önerisi kendi iline yazılır. Kartta düzenleyen birim **"Öğrenci girişimi"** olarak görünür; okulun adıyla anılması etkinliği okul yönetimine mal ederdi.

### Onay akışı

İki kaynak vardır:

1. **İl koordinatörünün açtığı ulusal faaliyet** — proje yöneticisi onayından sonra yayına girer.
2. **Öğrencinin açtığı her faaliyet** — kapsamı ne olursa olsun. Okul içi öneri bile onay bekler: 18 yaş altı bir kullanıcının açtığı çağrı sorumlusuz çıkmamalıdır.

Onaya kadar `onayDurumu=BEKLIYOR` ve faaliyet öğrencilere görünmez; yalnızca açan kişi ve onaylamaya yetkili olanlar görür.

Öğrenci faaliyetini **iki taraf onaylayabilir**: öğrencinin ilinin koordinatörü ve YEĞİTEK proje yöneticileri. İkisi de tam yetkilidir ve **ilk verilen karar geçerlidir** — çift onay adımı yoktur. Öneri açıldığında bildirim ikisine birden gider (`ONAY_BEKLEYEN_OGRENCI_FAALIYETI`); ilin koordinatörü yoksa uyarı merkeze gitmeye devam eder ve öneri kaybolmaz. Karar çıktığında sonuç faaliyeti açan öğrenciye bildirilir (`FAALIYET_ONAY_SONUCU`).

Onaylanmış bir öğrenci faaliyetinde tarih değişirse ya da kontenjan düşerse onay yeniden düşer ve uyarı yine **her iki tarafa** gider; yoksa koordinatör açılışta gördüğü öneriyi ikinci kez hiç görmezdi.

Öğretmenlerin açtığı okul içi ve il içi faaliyetler onaysız yayına girer.

### Etkinlik kategorisi (Kapsam'dan AYRI bir alan)

Kapsam ile etkinlik kategorisi **iki ayrı, bağımsız alandır**:

- **Kapsam** (Okul / İl / Ulusal) → *kimin başvurabileceğini* belirler.
- **Etkinlik kategorisi** → *etkinliğin niteliğini* belirler.

Her kapsam her kategoriyle birleşebilir; birini diğerinden türetme.

| Kategori | Nedir | Faaliyetin adı |
|---|---|---|
| Temel Etkinlik | GençTek'in ulusal düzeyde her yıl tekrarlanan programları | Sabit listeden seçilir |
| Çalışma Grubu Etkinliği | Çalışma grubu öğrencilerinin yıl boyunca planlayıp yürüttüğü programlar | Sabit listeden seçilir |
| İl Etkinliği | İl koordinatörlüğünün kendi iline özel tasarladığı temalı etkinlik | **Serbest metin** — koordinatör kendisi girer |

İl Etkinliği'nin sabit bir isim listesi **yoktur**. "Robot Futbol Ligi", "Yapay Zekâ ile Hikâyeni Anlat" gibi adlar yalnızca örnektir; bunları referans listesi hâline getirmeyin.

Temel Etkinlik ve Çalışma Grubu Etkinliği programları `temel_etkinlik_programi` tablosunda tutulur (`calisma_grubu` ile aynı mantık: silme yok, pasife alma var). İlk seed listesi için bkz. `references/data-model.md` Bölüm 10.

Bu, faaliyetin **çalışma grubu etiketiyle** (konu alanı: Yapay Zekâ, Robotik…) karıştırılmamalıdır — o ayrı bir etiketlemedir ve filtre mi kısıt mı olacağı hâlâ karar beklemektedir.

### Kontenjan

Ulusal faaliyette **tek havuz** kullanılır; il bazlı kota **yoktur**.

Kontenjan **aktif başvuru sayısını** sınırlar, yalnızca seçilenleri değil. Aktif başvuru = geri çekilmemiş, reddedilmemiş ve iptal edilmemiş her başvuru (BEKLIYOR + SECILDI + YEDEK).

- Kontenjan dolduğunda yeni başvuru **kabul edilmez**; öğrenciye "kontenjan doldu" mesajı gösterilir. (Dolu kontenjan artık "yedek listesi" demek değildir.)
- Bir başvuru reddedilir veya geri çekilirse yer **anında** açılır.
- Sayaç tutulmaz: her başvuru denemesinde aktif başvurular canlı sayılır ve sayım, kaydın açıldığı transaction'ın içinde yapılır.

### Faaliyet alanları

Faaliyet adı, açıklama, tarih, kapsam, **etkinlik kategorisi**, il/ilçe, kontenjan, düzenleyen birim/okul/ekip, başvuru başlangıç/bitiş tarihi, ilgili çalışma grubu etiketi (karar bekliyor), ekli dosya/görseller.

### Faaliyet düzenleme

Faaliyeti açan kullanıcı (düzenleyen görevden ayrıldıysa ilin koordinatörü, her durumda proje yöneticisi) **tarih ve kontenjanı** düzenleyebilir.

- Kontenjan, mevcut **"Seçildi" sayısının altına düşürülemez** — 40 kişi seçilmişse kontenjan 30 yapılamaz.
- Kontenjan her zaman artırılabilir; artış yeni başvuruların önünü yeniden açar.
- Onaylanmış **ulusal** faaliyette tarih gibi kritik alanlar değişirse faaliyet otomatik olarak `onay_durumu=BEKLIYOR`'a düşer ve proje yöneticisi tekrar onaylamalıdır. **Yalnızca kontenjan artırımı bunu tetiklemez.**

### Faaliyet iptali

Faaliyeti açan kullanıcı veya proje yöneticisi faaliyeti iptal edebilir. `faaliyet.durum` alanı: `AKTIF` / `IPTAL_EDILDI`.

- İptal edilince tüm aktif başvurular (BEKLIYOR, SECILDI, YEDEK) `IPTAL_EDILDI` durumuna geçer. Bu, öğrencinin kendi geri çekmesinden (`GERI_CEKILDI`) **ayrı** bir değerdir: sistem tetikler.
- Başvurmuş tüm öğrencilere bildirim gider.
- İptal edilen faaliyet listelerde **"İptal edildi" etiketiyle görünmeye devam eder**; yeni başvuru, yorum ve dosya kabul etmez. Mevcut yorum ve dosyalar geçmiş kaydı olarak görünür kalır (moderasyon amaçlı silme yetkisi sürer).
- İptal gerekçesi **isteğe bağlı** bir metin alanıdır.

### Toplu ekleme

**Yoktur.** İl koordinatörünün ilindeki öğrencileri faaliyete topluca ekleme özelliği kapsamdan çıkarıldı. Yazma.

---

## 7. Dosya, görsel ve yorumlar

### Ekler

- Faaliyete dosya/görsel ekleme yetkisi **yalnızca faaliyeti açan kullanıcıdadır** (danışman/koordinatör/yönetici). Öğrenci ekleyemez, sadece görüntüler/indirir.
- İzin verilen tipler: görsellerde jpg/png/webp; belgelerde pdf. Boyut sınırı proje yöneticisi tarafından yapılandırılabilir olmalı (varsayım: görsel başına 5 MB, belge başına 10 MB — karar bekliyor).
- Dosyalar bir depolama soyutlamasının arkasında tutulur (yerel disk arayüzü ile başla, ileride S3 uyumlu servise geçiş kolay olsun).

### Yorumlar

- Faaliyeti görme yetkisi olan **herkes** (kapsamına giren öğrenci, faaliyeti açan, ilgili koordinatör/yönetici) yorum yazabilir.
- Yorumun görünürlüğü, bağlı olduğu faaliyetin kapsamıyla birebir aynıdır — okul içi faaliyetin yorumları başka okuldan görünmez.
- **Silme yetkisi:** faaliyeti açan kullanıcı kendi faaliyetindeki her yorumu silebilir; proje yöneticisi her yorumu her yerde silebilir. Öğrenci yalnızca kendi yorumunu silebilir.
- Silinen yorumun içeriği kullanıcıya gösterilmez ama log'da tutulur (kim, ne zaman, hangi yorumu sildi) — KVKK ve olası kötüye kullanım denetimi için.
- Yorumlarda dosya eki **yoktur** (kapsam dışı) — yalnızca metin.
- Kullanıcı-tetikli "şikayet et" mekanizması karar bekliyor; olmadan da moderasyon (yetkili silmesi) çalışır durumda olmalı.

---

## 8. Başvuru ve değerlendirme

- Başvuruyu **katılımcının kendisi** yapar. Katılımcı öğrenci de öğretmen de olabilir; proje yöneticisi (YEĞİTEK) katılımcı olamaz.
- **Danışman öğretmen ve il koordinatörü, kapsamındaki bir ÖĞRENCİ adına başvuru yapabilir.** Öğretmen adına vekaleten başvuru yapılamaz. Öğrenciye bildirim gider ve başvuruyu kendisi geri çekebilir; başvuruyu yapan öğretmen de geri çekebilir ve sonuç bildirimini alır.
- Başvuru formunda **"Bu faaliyete neden başvuruyorum / bu alandaki ilgim"** alanı yer alır ve **zorunludur**.
- Aynı faaliyete aktif ikinci başvuru **engellenir**.
- Öğrenci başvurusunu **geri çekebilir**; gerekçe istenmez. Geri çekme **aktif başvurunun her durumunda** yapılabilir (BEKLIYOR, SECILDI, YEDEK): kontenjanı üçü birden doldurduğu için, yeri asıl açan hareket seçilmiş katılımcının vazgeçmesidir. Reddedilmiş başvuru geri çekilemez — yer tutmuyor, geri çekme yalnızca red kaydını silikleştirirdi.
- **Seçilmiş** bir katılımcı çekildiğinde faaliyeti düzenleyene bildirim gider (açılan yer ve yedek sayısı yazılıdır); bekleyen ya da yedek çekilmesinde gitmez, düzenleyenin vereceği bir karar yoktur.
- Geri çekilen başvuru, kontenjan dolmadığı sürece **yeniden yapılabilir**.
- Kontenjan doluysa **hiç kimse** başvuramaz (ilk başvuru dahil) — bkz. Bölüm 6 "Kontenjan".
- Başvuruyu yalnızca **faaliyeti açan kullanıcı** değerlendirir.
- Değerlendirme sonuçları: `SECILDI` · `REDDEDILDI` · `YEDEK`
- Başka ilden ulusal faaliyete başvuran öğrencide **danışman onayı aranmaz**; bildirim danışmana kopya olarak iletilir.

---

## 9. Bildirimler

Panel bildirimi **her koşulda** yazılır; e-posta ve SMS yalnızca birer kopyadır ve gitmemeleri bildirimi geçersiz kılmaz. İki kanalın durumu bildirim kaydında ayrı ayrı tutulur — sessiz başarısızlık, hiç göndermemekten kötüdür.

Şablon **metinleri** veritabanındadır ve Yönetim ekranından düzenlenir; şablon **kodları** koddadır, çünkü şablonu tetikleyen olay uygulamada yaşar. Metin kaydedilirken yer tutucular doğrulanır: tanımsız bir `{{degisken}}` kabul edilmez.

Bildirim gereken olaylar:
- Başvuru sonucu (seçildi / reddedildi / yedek)
- Danışman değişikliği ("yeniden seç" durumu dahil)
- İl koordinatörüne: okulda yeni danışman var, öğrenci devredilebilir
- Proje yöneticisine: onay bekleyen ulusal faaliyet
- Proje yöneticisine **ve ilin koordinatörüne**: onay bekleyen öğrenci faaliyeti
- Faaliyeti öneren öğrenciye: onay sonucu (onaylandı / reddedildi)
- Danışmana kopya: öğrencisi başka ilin ulusal faaliyetine başvurdu
- Faaliyete başvurmuş öğrencilere: faaliyet iptal edildi
- Öğrenciye: adına başvuru yapıldı / adına yapılan başvuru geri çekildi
- Faaliyeti düzenleyene: seçilmiş katılımcı çekildi, kontenjanda yer açıldı
- Adına başvuran öğretmene: başvuru sonuçlandı

**Etkinlik takvimi ve mesaj şeridi.** Panelde ilk görülen şey **"Mesajın var" şeridi** ve geçmiş/bugün/yaklaşan takvimidir. Takvim ayrımı **gün** bazındadır: sabah yapılan etkinlik öğleden sonra "geçmiş" görünürse o günün programı kaybolur. Şerit, üzerine gelindiğinde ve klavyeyle odaklanıldığında durur; `prefers-reduced-motion` açıksa hiç akmaz.

Şerit **6 Ağustos 2026'da** başvuru duyurusundan mesaja çevrildi. Yalnızca **okunmamış bildirim varken** basılır ve her başlık, sayfanın altındaki bildirim bölümünde o mesajın kendi satırına iner (`#bildirim-<id>`) — orada e-posta olarak giden gövdenin aynısı durur. Ayrı bir mesaj ekranı **yoktur**: aynı metni ikinci bir yerden okutmak olurdu. Toplu duyurular ve kullanıcılar arası yazışmalar da `bildirim` tablosuna yazdığı için şerit üçünü birden kapsar.

**Başvurusu açık etkinlikler şeritten çıktı ama Panelim'den çıkmadı:** aynı sayfadaki "Başvurusu açık etkinlik" ölçüm kartı ve kontenjan durumunu gösteren "Başvuruya açık etkinlikler" listesi yerinde. Şerit üçüncü kopyaydı.

---

## 10. KVKK ve loglama

- Kullanıcıların önemli bölümü 18 yaş altı; aydınlatma metni buna göre.
- Veri saklama süresi politikası tanımlı olmalı.

**Onay belgeleri.** Sistemde KAYIT AKIŞI YOKTUR; kimlik EBA'dan gelir. Bu yüzden
belgelerin okutulacağı tek an, kişinin sisteme **ilk girdiği** andır. Dört belge
tanımlıdır ve kimden isteneceği role bağlıdır:

| Belge | Kimden |
|---|---|
| KVKK Aydınlatma Metni | Öğrenci |
| KVKK Açık Rıza Onayı | **Herkes** |
| İl Koordinatörü Taahhütnamesi | İl koordinatörü |
| Gizlilik Sözleşmesi | İl koordinatörü |

Taahhütname ile gizlilik sözleşmesi AYRI belgelerdir: biri görevin nasıl
yürütüleceğini, öbürü eriştiği veriyle nasıl davranacağını taahhüt ettirir. Tek
metinde toplansalardı birinin ihlali diğerinin onayını da tartışmalı yapardı.
Aynı gerekçeyle açık rıza aydınlatmadan ayrıdır ve yalnızca kanunî dayanağı
olmayan işlemleri (isteğe bağlı iletişim bilgisi, profil fotoğrafı, belgelerde ad
kullanımı) kapsar — rızaya bağlanmayan işlem bu onaya dayandırılamaz.

**Kilit yalnızca ilk giriştedir.** Hiç onay vermemiş kullanıcı panele giremez;
`/onay` kapısından geçer. Sonradan eklenen bir belge ya da güncellenen bir metin
kimseyi kapıda bırakmaz — panelde şerit çıkar, **profilin en altındaki bölümden**
onaylanır (`/panel/profil#kvkk`). Sebebi pratik: bir metin güncellemesi tüm ilin
koordinatörünü aynı anda dışarıda bırakabilir ve acil bir işin ortasında sistemin
kilitlenmesi korumaktan çok zarar verir; erişimler zaten kayda geçiyor.

**Belgelerin yeri: profil, menü değil** (5 Ağustos 2026). "KVKK ve Belgelerim"
sekmesi menüden kaldırıldı; metin üye olurken okutuluyor, sonrasında lazım
olduğunda profilin en altından açılıyor. Eski `/panel/kvkk` ve `/panel/taahhut`
adresleri **kalıcı yönlendirmeyle** yaşıyor.

**Kaldırılan sekme, kaldırılan erişim değildir.** Kişinin onayladığı belgeye
sonradan erişememesi KVKK açısından savunulamaz; bu yüzden bölüm silinmedi,
taşındı. İki yol da korunmak zorunda:

1. **Yeniden onay** — metin güncellendiğinde şerit çıkar ve profildeki bölüme
   götürür. Sekme kalktığı için kullanıcının belgeye kendiliğinden uğrayacağı
   başka bir yer yok; **şerit artık yeniden onayın tek yoludur** ve kaldırılamaz.
2. **Sonradan okuma** — onay tarihleri ve yürürlükteki metinler aynı bölümde,
   katlanmış hâlde durur. Metinler açık basılsaydı profil birkaç ekran boyu
   hukuki metinle biterdi; onay BEKLEYEN belge varsayılan olarak açık gelir,
   çünkü okunması gereken metni katlı bırakmak onayı körlemesine tıklatmak olur.

**Rol eşlemesi genişletilirken dikkat.** Taahhütname ve gizlilik sözleşmesinin
yalnızca il koordinatöründen istenmesi bir ürün kararıdır: danışman öğretmen
kendi okulundaki öğrencilerle zaten yüz yüze çalışır, koordinatör ise tanımadığı
onlarca öğretmenin iletişim bilgisine erişir. Kapsamı danışmana ya da proje
yöneticisine açmak teknik bir düzeltme değildir.
- **Erişim logu:** hangi kullanıcı, hangi öğrenci/öğretmen kaydını, ne zaman görüntüledi veya değiştirdi.
- **İçerik logu:** yorum silme ve dosya kaldırma işlemleri de erişim logundan ayrı ya da aynı yapıda tutulur — kim sildi, ne zaman.
- Rol bazlı erişim sınırları uygulama katmanında zorunlu — istemci tarafı filtreleme yeterli değildir.
- SMS/e-posta için rıza akışı değerlendirilmeli.

---

## 11. Kenar durumlar

Bunlar test edilmeli:

| Durum | Beklenen davranış |
|---|---|
| Öğrenci okul değiştirdi | Yeni okulun danışman akışına girer; eski atama kapatılır |
| Öğrenci sınıf atladı | Yeni eğitim-öğretim yılı kaydı; danışman ilişkisi devam eder |
| Danışman ve öğrenci aynı anda okul değiştirdi | Her ikisi de yeni kurum koduna göre değerlendirilir; otomatik eşleşme varsayma |
| Kontenjan dolu faaliyete geri çekilmiş başvuru sahibi dönmek istiyor | Reddedilir, kontenjan uyarısı gösterilir |
| İl koordinatörü olmayan ilde okul danışmansız | Öğrenci atanamaz — proje yöneticisine uyarı düşer ve Rol/Atama Envanteri ekranında kırmızı olarak görünür |
| İl koordinatörünün görevi kaldırıldı | Ona bağlı öğrenciler "atanmamış" duruma düşer (okulları zaten danışmansız); proje yöneticisine envanterde kırmızı uyarı çıkar |
| İle yeni koordinatör atandı | O ildeki atanmamış öğrenciler **otomatik** olarak ona bağlanır; ayrı bir onay adımı yoktur (okula sonradan danışman gelmesi durumundan farklı) |
| Danışman öğretmen il koordinatörü yapıldı | Atama engellenmez; danışmanlığı kapanır, öğrencileri devir tablosuna göre dağıtılır, proje yöneticisine "X öğrenci yeniden dağıtıldı" uyarısı gösterilir |
| Faaliyet iptal edildi | Aktif başvurular `IPTAL_EDILDI`'ye geçer, öğrencilere bildirim gider; faaliyet listede etiketiyle kalır, yeni başvuru/yorum/dosya alınmaz |
| Onaylı ulusal faaliyetin tarihi değiştirildi | Faaliyet `BEKLIYOR`'a düşer ve yeniden onaylanana kadar öğrencilere görünmez |
| Faaliyeti açan kullanıcı görevden ayrıldı | Değerlendirme yetkisi il koordinatörüne / proje yöneticisine düşer; o kullanıcının açtığı faaliyetteki yorum silme yetkisi de aynı şekilde devrolur |
| Öğretmen henüz mock kullanıcı olarak tanımlanmadı | Danışman listesinde çıkmaz, öğrenci il koordinatörüne düşer |
| Aynı okulda iki öğretmen de danışman işaretli, biri işareti kaldırdı | Üzerindeki öğrenciler devir akışına girer |
| Faaliyete izin verilmeyen dosya tipi/boyutu yüklenmeye çalışıldı | Reddedilir, açık hata mesajı gösterilir |
| Silinen bir yoruma başkası zaten yanıt vermiş | Üst yorum "silindi" olarak görünür, alt yorumlar kalır (zincir kopmaz) |

---

## 12. Rol/Atama Envanteri (proje yöneticisi)

Proje yöneticisi öğrencileri ve öğretmenleri tek tek zaten görebiliyor; eksik olan **toplu görünüm**dü. Rol/Atama Envanteri ekranı iki listeyi gösterir:

1. **İl koordinatörü durumu** — 81 il, her biri için: atanmış mı, atandıysa kim, atanma tarihi. Boş iller görsel olarak öne çıkarılır.
2. **Danışman öğretmen durumu** — kurum bazında: kaç danışman öğretmen var, öğrenci sayısı, danışmansız kalmış okullar ve bu okulların öğrencilerinin hangi il koordinatörüne düştüğü.

İl koordinatörü atama ve görevden alma da bu ekrandan yapılır: boşluğu görmek ve doldurmak tek akıştır.

**Yeni tablo gerekmez.** Ekran, mevcut `kullanici_rol` (aktif il koordinatörlükleri) ve `danisman_atama` (aktif atamalar) tabloları üzerine yazılmış bir sorgu/rapor katmanıdır — il koordinatörünün kendi ilinde gördüğü "danışmansız okullar" listesiyle aynı mantık, yalnızca il filtresi olmadan.

Erişim yalnızca proje yöneticisindedir ve bu, "öğrenci/öğretmen verisi görüntüleme" yetkisinden **ayrı** bir satırdır (bkz. `references/permissions.md` Bölüm 1).

---

## 13. Rozet / katkı kategorileri — FAZ 2

Rozet sisteminin uygulanması sonraki faza bırakıldı; **şimdi kod yazılmayacak**. Kategori listesi netleşti:

- İl Temsilcisi
- Okul Temsilcisi
- Verdiği akran eğitimleri
- Çalışma grubu yöneticisi / organizasyon ekibi üyesi *(bu madde hâlâ belirsiz, Faz 2'de netleşecek)*
- Moderatörlük yaptığı etkinlikler
- Derece aldığı yarışmalar (EğitiJAM gibi GençTek etkinlikleri ya da GençTek dışı yarışmalar)

Liste, mevcut `kullanici_kazanim.tip` değerleriyle (DIS_ETKINLIK / URUN / AKRAN_EGITIMI / YARISMA_DERECESI) büyük ölçüde örtüşüyor. Faz 2 açıldığında **yeni tablo açmak yerine bu tabloyu genişletmek** daha az iş çıkarır. İl/Okul Temsilcisi kategorilerinin kaynağı zaten `ogrenci_gorev_rolu`'dur; türetilebilen kategoriler için ayrıca kayıt tutmayın.

**Faz 2 olan yalnızca ROZETLERDİR.** Kayıtların kendisi (kazanım girişi ve profilde gösterimi) uygulandı — bkz. Bölüm 14.

---

## 14. Öğrenci profili: kazanımlar, yarışmalar ve CV

Öğrenci profili şu bölümlerden oluşur. İlk üçü sistemden **türetilir**, son ikisi öğrencinin **beyanıdır**:

| Bölüm | Kaynak | Kim düzenler |
|---|---|---|
| Kimlik ve okul bilgileri | e-Okul (AuthProvider senkronu) | Hiç kimse — salt okunur |
| İletişim bilgileri (telefon, e-posta, GitHub, kişisel site, LinkedIn) | Öğrencinin kendi girdisi | Öğrenci |
| Çalışma grupları, görev rolleri, danışman | `ogrenci_calisma_grubu`, `ogrenci_gorev_rolu`, `danisman_atama` | Bkz. Bölüm 3, 4, 5 |
| **Katıldığı GençTek etkinlikleri** | **Türetilir:** `basvuru.durum=SECILDI` + faaliyet tarihi geçmiş + `faaliyet.durum=AKTIF` | Hiç kimse — elle girilmez |
| **Kazanım kayıtları** (8 tür) | Öğrenci beyanı, `kullanici_kazanim` | Yalnızca öğrencinin kendisi |
| **Rotam** (hedefler) | Öğrenci beyanı, `kullanici_hedefi` | Yalnızca öğrencinin kendisi — **başkası göremez** |
| **Özgeçmiş (CV)** | Öğrencinin yüklediği dosya | Yalnızca öğrencinin kendisi |

### Kazanım kayıtları

Öğrencinin kendi girdiği türler:

1. **GençTek dışı etkinlikler** (`DIS_ETKINLIK`) — program dışında katıldığı ulusal/uluslararası etkinlikler
2. **Yaptığı ürünler** (`URUN`) — web sitesi, uygulama, oyun, film vb.
3. **Verdiği akran eğitimleri** (`AKRAN_EGITIMI`) — akranlarına **verdiği** eğitimler
4. **Derece aldığı yarışmalar** (`YARISMA_DERECESI`) — bilişim alanında derece aldığı yarışmalar; GençTek etkinlikleri (EğitiJAM, Capture The Flag) de buraya girilebilir
5. **Sertifikalarım** (`SERTIFIKA`) — aldığı belge ve sertifikalar (6 Ağustos 2026). Belgenin kendisi "destekleyici belgeler" alanından yüklenir; ayrı bir dosya alanı açılmadı
6. **Topluluklarım** (`TOPLULUK`) — içinde yer aldığı kulüp, proje ekibi, takım (6 Ağustos 2026). **Beyandır**: aynı kulübü yazan iki öğrenci sistemde eşleştirilmez

Kurallar:
- Kayıt **öğrenci beyanıdır**: sistem doğrulamaz, onay süreci yoktur, rozet üretmez.
- Kayıtları **yalnızca sahibi** girer ve siler. Danışman, koordinatör ve proje yöneticisi kapsamındaki öğrencinin kayıtlarını **görür ama düzenlemez** — çalışma grubu eklemeden farkı budur.
- `derece` alanı yalnızca yarışmalarda, `duzenleyen` alanı ürünler dışında sorulur. Türüne uymayan alan gelirse **sessizce düşürülür**: ekran o alanı hiç göstermediği için değer ancak istek elle kurcalandığında gelir ve bunun kullanıcıya anlatılacak bir tarafı yok.
- Bağlantı adresinde yalnızca `http`/`https` kabul edilir. `javascript:` ile başlayan bir adres, profile bakan danışmanın tarayıcısında kod çalıştırırdı.
- **Katıldığı GençTek etkinlikleri bu tabloya yazılmaz.** Türetilebilen veriyi öğrencinin eliyle ikinci kez girmesi hem yanlış hem doğrulanamaz olurdu.

Etkinliğe dayalı türlerde (dış etkinlik, akran eğitimi, yarışma derecesi) üç alan daha sorulur:

- **GençTek programı** — `temel_etkinlik_programi` listesinden seçilir, son seçenek **"Diğer"**dir ve serbest metne düşer. Serbest metin tek başına bırakılsaydı aynı program ("EğitiJAM", "Egitijam", "eğiti jam") onlarca yazımla girilir ve program bazlı sayım hiç yapılamazdı.
- **Katılım biçimi** — yüz yüze / çevrim içi / karma.
- **Hedef kitle** — akran eğitiminde kime anlatıldığı, yarışmada hangi kategoride yarışıldığı. Serbest metindir; kitleyi listeye sığdırmaya çalışmak beyanı çarpıtırdı.

**Ürün formu** (6 Ağustos 2026) şunları sorar: Ürün Adı, **Geliştiren Ekip**, Açıklamalar, Destekleyici Görseller (`kazanim_ek`), **Linkler** (çoklu, `kazanim_baglanti`) ve **"Bu ürünü markette paylaş"** onay kutusu. Kutu varsayılan **kapalıdır**: paylaşım bir tercihtir, açık gelmesi kullanıcının istemeden vitrine çıkması demek olurdu.

**Program dosyası yüklenmez.** İstek iki seçenek sunuyordu ("ürünün tanıtımını yapabilir" ya da "programı yükleyebilir") ve "şimdilik sadece tanıtım yapsınlar" denildi. Yürütülebilir dosya kabul etmek ayrıca virüs taraması ve dağıtım sorumluluğu getirirdi.

**Ürün taahhütnamesi henüz YOK.** İstekte "ürün ekleme taahhütname imzalaması gerekmekte" yazıyor; onay altyapısı hazır (`kullanici_onayi` + `BELGE_TANIMLARI`) ama **metin gelmedi**. Metin geldiğinde ürün eklemenin önüne kapı olarak konur.

**"Yaptığım ürünler" ayrı bir bölüm olarak da gösterilir** (`/panel/kazanimlarim` ve öğrenci detay ekranı). Ayrı bir tablo değildir — aynı `kullanici_kazanim` kayıtlarının `tip=URUN` olanlarıdır; ikinci bir tablo açmak, aynı kaydın iki yerde yaşamasına ve birinden silinip diğerinde kalmasına yol açardı. Kart ekleme kısayolu verir ama **silme yolu vermez**: silme tek yerde, profil ekranında durur.

### Öğretmenin kazanım kayıtları

Aynı dört tür **öğretmen için de** açıktır ve aynı tabloya yazılır: öğretmenin geliştirdiği ders materyali ile öğrencinin geliştirdiği oyun aynı türden kayıttır, ayrı tablo aynı kuralları ikinci kez yazdırırdı. Ayrışan tek şey **etiketlerdir** — öğretmende "verdiğim akran eğitimleri" yerine "verdiğim eğitimler" yazar; öğretmenin öğrencisine verdiği eğitim akran eğitimi değildir. Alan kuralları (hangi türde hangi alan sorulur) rolden bağımsızdır: role bağlansaydı aynı kayıt girenin rolüne göre farklı doğrulanır, öğretmenlikten ayrılan birinin kaydı geçersizleşirdi.

Öğretmenin kayıtlarını il koordinatörü ve proje yöneticisi tekil öğretmen kaydında **görür ama düzenlemez**; öğrenci kayıtlarındaki kuralın aynısı.

### Rotam (hedefler)

Öğrencinin **yapmak istediklerini** yazdığı bölüm; profilin en altında, yolculuk kartlarından sonra durur (yukarısı yapılanlar, burası yapılacaklar).

Serbest metin değil **hedef listesidir**: her hedefin başlığı, isteğe bağlı açıklaması, isteğe bağlı hedef tarihi ve durumu vardır — *Planladım / Üzerinde çalışıyorum / Tamamladım*. Biçim seçimi tek yönlü olduğu için liste seçildi: listeden serbest metne geçiş kayıpsız, tersi değil.

- **Yalnızca kişinin kendisi görür.** Danışman, koordinatör ve proje yöneticisi bu bölümü **göremez** — kazanımlardan ayrıldığı yer burasıdır. İstekte kimsenin göreceği yazmıyor ve dar taraftan başlandı: açmak kolay, öğrenciler özel hedeflerini yazdıktan sonra geri almak değil.
- Durum **tek tıkla** ilerletilir ("Başladım", "Tamamladım"); geri alma düğmesi yoktur, yanlış işaretlenen hedef silinip yeniden yazılır.
- **Düzenleme formu yoktur** — aynı gerekçe: kısa satırlardan oluşan bir listede her satırın altına ikinci bir form basmak pahalıydı.
- **Sıralama:** önce süren, sonra planlanan, en sonda tamamlanan; aynı durumda yakın tarih önce, tarihsizler sona. Rota ileriye bakar, biten işler listeyi tıkamaz.
- Tamamlanma **anı** ayrı tutulur ve hedef zaten tamamlanmışken korunur: başlığı düzeltmek, hedefi bugün tamamlanmış göstermemeli.
- Kişi başına **30 hedef**; kota değil, taşma koruması.

### Özgeçmiş (CV)

- Öğrenci başına **tek CV** tutulur; yeni yükleme eskisinin yerine geçer ve eski dosya silinir. Sürüm arşivi yoktur.
- Kabul edilen biçimler **pdf, doc, docx**; sınırlar `sistem_ayari` içindedir (`IZINLI_CV_TIPLERI`, `CV_MAKS_BAYT`, varsayılan 5 MB). Faaliyet eklerinin belge ayarından **ayrıdır** — ortak ayar kullanılsaydı CV için açılan doc/docx faaliyet eklerinde de açılırdı.
- Dosya public bir dizinden servis **edilmez**: indirme her istekte oturumdan ve merkezi öğrenci kapsam filtresinden geçer, kapsam dışında **404** döner.
- CV'yi öğrencinin kendisi, danışmanı, il koordinatörü ve proje yöneticisi indirebilir. Her indirme erişim logu yazar.

### Tekil profil erişimi

`/panel/ogrenciler/:id` ekranı danışman öğretmen, il koordinatörü ve proje yöneticisine açıktır; **erişim merkezi kapsam filtresinden geçer** ve kapsam dışı öğrencide "yetkiniz yok" değil **404** döner (kaydın varlığı bile sızmaz). Öğrenci kendi id'siyle bu adrese girebilir çünkü kapsam filtresi ona "yalnızca kendisi" diyor; düzenleme yolları ise kendi profilindedir.

Bu ekran listeden **daha fazla** kişisel veri gösterdiği için (iletişim bilgisi, CV, kazanım beyanları) her görüntülemede erişim logu yazılır.

---

## 15. Danışman öğretmen envanteri

`/panel/ogretmenler` ekranı, analiz dokümanı Bölüm 2'nin karşılığıdır.

- **"Öğretmen" ayrı bir kullanıcı tipi değildir**: aktif öğrenci rolü olmayan kullanıcıdır. Görev almamış öğretmen de envanterdedir — listenin en çok işe yarayan satırı, henüz danışmanlık işaretlememiş öğretmendir. YEĞİTEK personeli listeden çıkarılır: okulda görevli bir öğretmen değildir.
- Kapsam: danışman öğretmen **kendi okulu**, il koordinatörü **kendi ili**, proje yöneticisi **tüm iller**. Öğrenci hiçbir koşulda göremez.
- Danışmanın kapsamı okuldur, "kendi danışmanlığındakiler" değil (öğrenci envanterinden farkı budur): meslektaş listesi kişisel veri bakımından daha dar ve okuldaki diğer danışmanı görmek iş birliğinin ön koşulu.
- **Görev aldığı eğitim-öğretim yılları ayrı bir alanda tutulmaz**, `kullanici_rol` kayıtlarının tarihlerinden türetilir. İkinci bir yer tutulsaydı rol devrinde ikisi ayrışır ve hangisinin doğru olduğu bilinemezdi. Yıl sınırı **1 Eylül**'dür.
- Tekil kayıtta gösterilen **öğrenci ve faaliyet listeleri, bakan kişinin kendi kapsamından yeniden geçer**. Aksi halde bir danışman, meslektaşının profilini açarak onun öğrencilerinin adlarını görebilirdi.
- Ulusal/uluslararası etkinlikler için ayrı tablo yoktur: GençTek'in ulusal programları zaten `kapsam = ULUSAL` olan faaliyetlerdir, liste oradan türetilir.

---

## 16. İl bazlı paydaş envanteri

`/panel/paydaslar` ekranı, analiz dokümanı Bölüm 3'ün karşılığıdır.

- Kayıt **ile** bağlıdır ve **ilin koordinatörü** ile proje yöneticisi tarafından yönetilir. Danışman öğretmen listeyi **görür** ve kendi faaliyetine bağlar ama kayıt ekleyemez: her öğretmen ekleseydi aynı kurum onlarca kez farklı yazımla girilir ve "il bazlı iş birliği haritası" kullanılamaz hâle gelirdi.
- Zorunlu alanlar: kurum adı, tür, il, **iş birliği alanı** ve **en az bir iletişim bilgisi**. Ne için iş birliği yapılacağı yazılmayan kayıt listeyi kalabalıklaştırmaktan başka işe yaramaz; ulaşılamayan paydaş da paydaş değildir.
- Aynı ilde aynı adla ikinci **aktif** kayıt açılamaz. Pasif kayıt engel değildir — kurum gerçekten yeniden iş birliğine dönebilir.
- **Silme yoktur**: iş birliği bitince kayıt pasife alınır, geçmiş faaliyet bağlantıları korunur.
- Kaydın **ili değiştirilemez**: başka ile taşımak, o ilin envanterine haberi olmadan satır eklemek olurdu.
- Faaliyete paydaş bağlamak, paydaş kaydını yönetmekten **ayrı** bir yetkidir ve faaliyetin sahipliğine bakar (ek yükleme kapısıyla aynı). Paydaşın ili faaliyetin iliyle aynı olmak zorunda değildir.

---

## 17. EBA dışı giriş: mezun ve paydaş temsilcisi

EBA hesabı olmayan iki grup sisteme girebilir. Bu, projenin ilk kararlarından
birini (**"dış kayıt yoktur ve olmayacaktır"**) bilerek tersine çevirir; o
karar hâlâ **okul tarafı için** geçerlidir — öğrenci ve öğretmenin şifresi yok
ve olmayacak.

### Akış

```
Kişi başvuru formunu doldurur (tür + il → kimlik, kurum/mezuniyet, gerekçe, şifre)
  └─ aydınlatma metni OKUTULUR ve onayı başvuru satırına yazılır
       └─ başvuru BEKLIYOR durumunda kuyruğa girer, proje yöneticilerine bildirim gider
            ├─ ONAY  → kullanici + kullanici_rol + iletişim profili + dis_kimlik açılır
            │           şifre başvurudan dis_kimlik'e TAŞINIR, başvuruda NULL'lanır
            └─ RET   → gerekçe ZORUNLU, şifre NULL'lanır, kayıt durur; tekrar başvuru serbest
```

**Onaylanana kadar `kullanici` satırı açılmaz.** Açılsaydı onaysız kişi kapsam
filtrelerine, envanter sayılarına ve öğretmen listesine ("öğrenci rolü olmayan
herkes") sızardı.

**Kararı yalnızca proje yöneticisi verir.** Talep böyle: mezun/paydaş kabulü
ekosistem düzeyinde bir karardır, ilin değil.

### Kimlik doğrulama

- **E-posta + şifre.** Şifre `dis_kimlik` tablosunda, scrypt özetiyle
  (`scrypt$N$r$p$tuz$ozet`). Parametreler özetin **içindedir**: ileride
  sertleştirilirse eski özetler doğrulanmaya devam etmeli.
- **Şifre tutan tek tablo `dis_kimlik`tir** ve `kullanici`dan ayrıdır. Sütun
  olarak eklenseydi "şifresi olmayan giriş yapamaz" garantisi şemadan değil
  uygulamadan gelirdi.
- E-posta **küçük harfe indirgenerek** saklanır ve karşılaştırılır — ama Türkçe
  kuralla değil: `toLocaleLowerCase("tr")` "I"yı "ı"ya çevirir ve kişi kendi
  adresiyle giremez.
- **Kaba kuvvet koruması:** 5 hatalı denemeden sonra 15 dakika kilit. Kilit
  **süreli**; kalıcı olsaydı saldırgan başkasının hesabını kasten kilitleyebilirdi.
  Kilit gelince sayaç sıfırlanır, kilidi biten kişi tam bir hak setiyle döner.
- **Parola sıfırlama:** jetonun kendisi değil **özeti** saklanır, 60 dakika
  geçerlidir ve tek kullanımlıktır. İstek ekranı, adres kayıtlı olsun olmasın
  **aynı sonucu** gösterir; aksi hâlde "hangi adres kayıtlı" sorusunu cevaplayan
  bir araç olurdu.
- **İkinci faktör yoktur** (karar: 5 Ağustos 2026).

### Alanlar ve doğrulama

- **Mezun:** mezuniyet yılı zorunlu, okul **isteğe bağlı** — kapanmış ya da
  referans tablosunda bulunmayan bir okuldan mezun olan kişi başvuramaz hâle
  gelmemeli.
- **Paydaş temsilcisi:** kurumu **envanterden seçer**, serbest metin yazamaz
  (aynı gerekçe: `paydasEkleyebilirMi`). Aynı kurumdan birden fazla temsilci
  başvurabilir. Görev/unvan zorunludur.
- **Gerekçe zorunlu:** adı ve e-postası olan ama ne yapmak istediği yazılmayan
  başvuru, onaylayan için karar verilemez bir kayıttır.
- **Şifre:** en az 10 karakter, en az dört farklı karakter, kişinin adını /
  soyadını / e-posta kullanıcı adını içeremez. Karmaşıklık maskesi bilinçli
  olarak yok — maskeler kullanıcıyı `Sifre123!` gibi tahmin edilebilir
  kalıplara iter.
- **Aynı e-posta için tek bekleyen başvuru** (kısmi unique index). Reddedilmiş
  ya da onaylanmış eski başvurular engel değildir.

### KVKK

**İki ayrı aydınlatma onayı vardır ve ikisi de gereklidir:**

1. **Başvuru anında** — `dis_kullanici_basvurusu.aydinlatma_onay_tarihi`. Veri
   işleme burada başlar, oysa `kullanici_onayi`na yazılamaz: henüz kullanıcı
   kaydı yoktur.
2. **İlk girişte** — `/onay` kapısı; aydınlatma + açık rıza. Bu, sisteme
   girdikten sonra işlenen verinin karşılığıdır.

Koordinatör taahhütnamesi ve gizlilik sözleşmesi bu rollerden **istenmez**:
yürürlükteki yetkileriyle hiçbir öğrenci/öğretmen kişisel verisine
erişmiyorlar. Yükümlülüğü doğuran şey rolün adı değil eriştiği veridir —
kapsam genişletilirse bu karar da yeniden verilmelidir.

### Kenar durumlar

- **Onay bekleyen kişi giriş denerse**, şifresi doğruysa "başvurunuz onay
  bekliyor" denir; yanlışsa genel hata. Bilgi yalnızca başvuruyu gerçekten
  yapmış olana verilir.
- **Pasife alınmış dış kullanıcı**, şifresi doğru olsa da genel hata alır.
  "Hesabınız kapatıldı" demek hesabın varlığını doğrulamaktan başka işe yaramaz.
- **Başarılı giriş, bekleyen sıfırlama jetonunu düşürür**: şifresini
  hatırladığını kanıtlayan kişi için jetonun açık kalmasının anlamı yok.
- **Gecelik senkron dış kullanıcılara dokunmaz** — yalnızca aktif danışmanları
  tarar; `AuthProvider` bu kimlikleri zaten tanımaz.
- **Dış kullanıcı danışman öğretmen olamaz**: işaretleme akışı kurum kodu
  olmayan kullanıcıyı reddeder (YEĞİTEK personelinde de aynı kural).
