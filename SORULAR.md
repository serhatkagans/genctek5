# Sorular — 5 Ağustos 2026 talep listesi

Talep listesini planlarken **anlamadığım, emin olamadığım ya da kendi içinde
çelişkili bulduğum** noktalar. Talep sahibine olduğu gibi iletilebilir.

Plan dosyası: [`YAPILACAKLAR.md`](YAPILACAKLAR.md). Oradaki `→ S7` göndermeleri
bu dosyadaki soru numaralarıdır.

## Bu dosya nasıl okunur

Her sorunun altında **"Cevap gelmezse varsayımım"** satırı var. Bunu bilerek
koyuyorum: cevap gecikirse hangi okumayla ilerleyeceğim baştan yazılı olsun,
sonradan "ben bunu kastetmemiştim" sürprizi çıkmasın. Varsayımı onaylamak da bir
cevaptır — "evet, öyle olsun" demeniz yeter.

**Öncelik sırası.** Hepsi aynı derecede acil değil:

| Öncelik | Sorular | Neden |
|---|---|---|
| ✅ Cevaplandı | S1, S3, S4, S6, S7, S8, S9, S10, S11, S13, S14, S15, S17, S18, S21, S23, S24, S25 | 5–7 Ağustos — A1, C3, A2, C1, B2, B3, C2, **C4**, D3, D4, D5(kısmi), D6, D7, H, J1–J5 |
| 🔴 Önce bunlar | S2, S16, **S26** | Cevap gelmeden mimari/veri modeli kararı verilemiyor |
| 🟡 Yakında | S12, S19 | İlgili madde başlamadan gerekli |
| 🟢 Sonra | S5, S20, S22 | Küçük ya da geç sıradaki maddeler |

---

## ✅ S1 — EBA dışı kullanıcı kendini nasıl kanıtlayacak? — CEVAPLANDI

**İlgili madde:** A1 · **Durum:** cevaplandı ve uygulandı (5 Ağustos 2026)

> **Cevap:** e-posta + şifre. Parola sıfırlama var, ikinci faktör yok. Paydaş
> temsilcisi **mevcut paydaş kurum kaydına** bağlanır; aynı kurumdan birden
> fazla temsilci olabilir. Ret gerekçesi zorunlu, tekrar başvuru serbest.
> Mezun, mezun olduğu okulla **isteğe bağlı** olarak ilişkilendirilir — okul
> zorunlu tutulsaydı kapanmış okuldan mezun olan kişi başvuramazdı.

Uygulama ayrıntısı: `YAPILACAKLAR.md` · A1 — YAPILDI.

> **Talepte yazan:** "EBA dışında sisteme giriş eklenecek. (mezun, paydaş)
> bunların onayı proje yöneticisine düşecek o onaylayacak"

**Anladığım.** EBA hesabı olmayan iki grup (mezun öğrenciler ve paydaş
kurumların temsilcileri) sisteme girebilecek; başvuruları proje yöneticisinin
onayından geçecek.

**Emin olamadığım.** Onay *sürecini* anlatmışsınız ama *kimlik doğrulamayı*
anlatmamışsınız. Bugün sistemde şifre alanı, kayıt formu, parola sıfırlama
hiç yok — bunlar bilinçli olarak yazılmamıştı ("dış kayıt yoktur ve
olmayacaktır", açılış ekranında da yazılı). Bu talep o kararı tersine
çeviriyor, dolayısıyla yerine ne konacağı kararı sizin.

**Sorular.**

1. Giriş nasıl olacak: **(a)** e-posta + şifre mi, **(b)** e-Devlet mi,
   **(c)** başka bir yol mu?
2. (a) ise: parola sıfırlama, hesap kilitleme, ikinci faktör isteniyor mu?
3. Başvuru **reddedilirse** kişiye ne gösterilecek? Gerekçe yazılacak mı,
   tekrar başvurabilecek mi?
4. Paydaş temsilcisi, sistemdeki mevcut **paydaş kurum kaydına** mı bağlanacak?
   (İl bazlı paydaş envanteri zaten var.) Aynı kurumdan birden fazla kişi
   girebilecek mi?
5. Mezun, mezun olduğu okulla ilişkilendirilecek mi?

**Cevap gelmezse varsayımım:** e-posta + şifre; parola sıfırlama var, ikinci
faktör yok; ret gerekçesi zorunlu ve tekrar başvuru serbest; paydaş temsilcisi
mevcut kurum kaydına bağlanıyor.
**Yanlışsa etkisi:** Kimlik doğrulama yöntemi bütün modülün temeli — sonradan
değişirse başvuru tablosu, giriş ekranı ve oturum akışı yeniden yazılır.

---

## 🔴 S2 — Mezun ve paydaştan hangi onay belgeleri istenecek?

**İlgili madde:** A1, A2 · **Durum:** cevaplanmadı; varsayımla uygulandı,
değiştirilmesi ucuz

> **Uygulanan:** Mezun ve paydaş → **aydınlatma + açık rıza**. Gizlilik
> sözleşmesi paydaştan da İSTENMEDİ — bu, aşağıdaki varsayımdan bilinçli bir
> sapmadır: yürürlükteki dar yetkiyle paydaş hiçbir öğrenci/öğretmen kişisel
> verisine erişmiyor ve metnin kendisi baştan sona "İl Koordinatörü" diye
> yazılı. Yükümlülüğü doğuran şey rolün adı değil eriştiği veri.
> **Paydaşın kapsamı genişletilirse bu karar yeniden verilmeli.**
>
> Ayrıca: başvuru anında AYRI bir aydınlatma onayı alınıyor
> (`dis_kullanici_basvurusu.aydinlatma_onay_tarihi`). Veri işleme orada
> başlıyor ama `kullanici_onayi`na yazılamıyor — o anda kullanıcı kaydı yok.
> Ayrı metin yazılmadı; 18 yaş üstü grup için "velinizle okuyun" maddesi hâlâ
> metinde duruyor (3. soru cevaplanmadı).

**Anladığım.** Sisteme giren herkes ilk girişte belge onaylıyor (bu 5 Ağustos'ta
yapıldı): öğrenciye aydınlatma + açık rıza, il koordinatörüne ayrıca taahhütname
+ gizlilik sözleşmesi.

**Emin olamadığım.** Mezun ve paydaş bu tabloya girmiyor.

**Sorular.**

1. Mezundan hangileri istenecek? (Öğrenciyle aynı ikili mi?)
2. Paydaş temsilcisinden? Paydaş, öğrenci verisi görecekse **gizlilik sözleşmesi**
   ondan da istenmeli mi?
3. Bu iki grup 18 yaş üstü olduğu için aydınlatma metnindeki "velinizle birlikte
   okuyunuz" maddesi onlara gösterilmemeli — ayrı metin mi yazılacak?

**Cevap gelmezse varsayımım:** Mezun → aydınlatma + açık rıza. Paydaş →
aydınlatma + açık rıza + gizlilik sözleşmesi. Ayrı metin yazılmıyor.
**Yanlışsa etkisi:** Düşük — belge–rol eşlemesi tek dosyada
(`lib/kvkk/kurallar.ts`), sonradan değiştirmek ucuz.

---

## ✅ S3 — Mezun ve paydaş sistemde neyi görecek? — CEVAPLANDI

**İlgili madde:** A1 · **Durum:** cevaplandı ve uygulandı (5 Ağustos 2026)

> **Cevap: dar başlangıç.** Yalnızca kendi profili, etkinlik takvimi ve talep
> panosu. Öğrenci/öğretmen kişisel verisine hiç erişim yok; mesajlaşma yalnızca
> koordinatör onaylı bağlantı üzerinden. Etkinliğe katılımcı olarak başvuru ve
> faaliyet altına yorum **kapalı**.

Tam matris: `permissions.md` Bölüm 1 ve 1.1. Kapsam genişletilecekse açılacak
yerler orada tek tek yazılı.

**Anladığım.** İki yeni kullanıcı türü geliyor.

**Emin olamadığım.** Ne yapabilecekleri hiç yazılmamış. Bu, sistemin **yetki
matrisine iki yeni sütun** eklemek demek ve her satır tek tek cevaplanmalı.

**Sorular.** Mezun ve paydaş için ayrı ayrı: etkinlikleri görebilecek mi?
Etkinliğe başvurabilecek/başvuru alabilecek mi? Öğrenci listesi görecek mi
(**görmemeli diye düşünüyorum**)? Öğrencilerle mesajlaşabilecek mi? Talep
panosuna ilan açabilecek mi (sponsor/teknik destek ilanları için mantıklı
görünüyor)? Markette ürün görebilecek/yayımlayabilecek mi?

**Cevap gelmezse varsayımım:** İkisi de **yalnızca** kendi profilini, etkinlik
takvimini ve talep panosunu görür; öğrenci/öğretmen kişisel verisine hiç
erişemez; mesajlaşma yalnızca koordinatör onaylı bağlantı üzerinden.
**Yanlışsa etkisi:** Yüksek. Bu, dar taraftan başlayan bir varsayım: eksik yetki
sonradan verilebilir, fazla verilmiş yetkiyle görülen veri geri alınamaz.

---

## ✅ S6 — Sekmeler kalkıyor mu, kalıyor mu? — CEVAPLANDI

**İlgili madde:** B3, C1 · **Durum:** cevaplandı ve uygulandı (5 Ağustos 2026)

> **Talepte yazan (1):** "Çalışma Gruplarım ve Danışmanım sekmeleri kaldırılacak.
> Sadece panelim kısmında görüntülenip seçme işlemi yapılacak."
>
> **Talepte yazan (2), birkaç satır sonra:** "Danışmanım (**Panel sekmesinde
> gözükecek**)"
>
> **Talepte yazan (3):** "Katkılarım (**Panel sekmesinden giriş olacak**,
> profilde gözükecek)"

**Anladığım.** Birinci cümle "bu sekmeleri menüden sil" diyor; ikinci ve üçüncü
cümle "panel sekmesinde/sekmesinden" diyerek sanki sekme kalıyormuş gibi
okunuyor.

**Emin olamadığım.** İkisinden hangisi geçerli. İki farklı okuma mümkün:

- **(a)** Menüde ayrı sekme kalmayacak; çalışma grubu ve danışman seçimi
  **Panelim sayfasının içinde bölüm** olarak duracak. ("Panel sekmesinde
  gözükecek" = "Panelim sayfasında görünecek".)
- **(b)** Sekmeler duracak ama içerikleri Panelim'de de özetlenecek.

**Soru:** Burada (a)'yı mı kastettiniz — yani menüde "Çalışma Gruplarım" ve
"Danışmanım" girişleri hiç olmayacak, ikisi de Panelim sayfasının içinde bölüm
olarak mı duracak?

**Cevap gelmezse varsayımım:** (a). "Panel sekmesi" ifadesini "Panelim sayfası"
olarak okuyorum, çünkü birinci cümle sekmelerin kaldırılmasını açıkça söylüyor.
**Yanlışsa etkisi:** Orta — menü ve Panelim düzeni yeniden kurgulanır.

### Gelen cevap (5 Ağustos 2026)

**(a) onaylandı:** sekmeler menüden kalktı, ikisi de Panelim sayfasının içinde
bölüm. Bölümler KATLI geliyor (Panelim zaten yoğun); yalnızca kullanıcının
gerçekten bir şey yapması gereken hâlde — danışmanı yoksa, hiç grup seçmemişse —
açık açılıyor. Sayfalar silinmedi: `/panel/danisman-secim` aynı zamanda giriş
kapısı, `/panel/calisma-gruplari` ise eski bağlantılar için duruyor.

---

## ✅ S7 — "Mesajın Var" şeridi: başvurusu açık etkinlikler nereye gidecek? — CEVAPLANDI

**İlgili madde:** C2 — **yapıldı**

> **Talepte yazan (6 Ağustos, yinelendi):** "'Başvuru Açık' Sarı renkli kısım
> 'Mesajın Var' şeklinde değiştirilecek. Tıklandığında mail olarak atılan mesaj
> gözükecek."

**Karar: şerit tamamen mesaja ayrıldı, ikiye bölünmedi.**

**Sorduğum ikinci nokta ("mail olarak atılan mesaj" nedir) kendiliğinden
çözüldü:** sistemde e-posta gönderen tek mekanizma `bildirim` tablosudur
(`lib/bildirim/eposta-kopyasi.ts`). Toplu duyurular da (`TOPLU_DUYURU`),
kullanıcılar arası yazışmalar da (`YENI_YAZISMA`) oraya bildirim yazar. Yani
(a), (b) ve (c) **aynı gelen kutusudur**; şerit üçünü de gösteriyor.

**Birinci nokta için endişem YERSİZ ÇIKTI — düzeltme.** "Şerit onları
göstermeyi bırakırsa öğrencinin başvuru fırsatını gördüğü tek yer kaybolur"
demiştim. **Yanlıştı.** Panelim'de aynı bilgi zaten iki yerde daha duruyor:

- **"Başvurusu açık etkinlik" ölçüm kartı** (sayı + `/panel/etkinlikler?acik=1`
  bağlantısı),
- **"Başvuruya açık etkinlikler" kart listesi** — kontenjan durumu ve kişinin o
  etkinliğe başvurup başvuramayacağı ile birlikte, şeridin verdiğinden **daha
  fazla** bilgi.

Şerit üçüncü kopyaydı. Bu yüzden şeridi ikiye bölmeye gerek kalmadı; bölmek,
zaten iki yerde duran bir bilgiyi üçüncü kez ve en dar biçimde göstermek için
sarı alanın yarısını harcamak olurdu.

**Ne yapıldı.** Şerit yalnızca **okunmamış mesaj varken** basılıyor, "Mesajın
var" diyor ve okunmamış toplam sayıyı yazıyor. Şeritteki her başlık, sayfanın
altındaki bildirim bölümünde o mesajın **kendi satırına** iniyor
(`#bildirim-<id>`); orada e-posta olarak giden gövdenin aynısı duruyor.

Ayrı bir mesaj ekranı açılmadı: aynı metni ikinci bir yerden okutmak olurdu.

---

## 🟡 S16 — Algoritmam: envanterlerin içeriği nereden gelecek? — KISMEN CEVAPLANDI

**İlgili madde:** E · **Durum:** modül yapıldı; **dört ölçeğin madde metni ve
kullanım izni bekleniyor** (aşağıda "Kısmî karar")

> **Talepte yazan:** "Teknoloji Liderliği Özyeterlilik Ölçeği · **Dick Kişilik
> Envanteri** · İlgi Envanteri · Beceri Envanteri · Mesleki Yaklaşım Envanteri ·
> EPAI Girişimcilik Potansiyeli Belirleme Envanteri · entcom Girişimci
> özellikleri envanteri · yapay zeka ile öz değerlendirme fırsatı ileride"

**Anladığım.** Öğrencinin kendini tanımasını sağlayan bir envanter modülü;
listelenen ölçekler uygulanacak, sonuçlar öğrenciye gösterilecek.

**Emin olamadığım — dört nokta.**

1. **Madde metinleri ve puanlama anahtarları kimden gelecek?** Bu ölçeklerin
   soruları ve puanlama kuralları telif korumalı akademik materyaldir; koddan
   üretilemez, tahmin edilemez. Her ölçek için soru listesi + cevap ölçeği
   (5'li Likert vb.) + puanlama anahtarı + sonuç yorumu metinleri gerekli.
2. **Kullanım izni alındı mı?** Ölçek sahiplerinden yazılı izin gerekiyorsa bu
   iş, kod yazmaya başlamadan çözülmeli.
3. **"Dick Kişilik Envanteri"** — **DISC** kişilik envanterini mi kastediyorsunuz?
   "Dick" adlı bir envanter bulamadım.
4. **Sonucu kim görecek?** Yalnızca öğrenci mi; danışman öğretmeni de mi; il
   koordinatörü / YEĞİTEK toplu istatistik olarak mı? Kişilik ve mesleki eğilim
   sonuçları hassas veridir — cevap, açık rıza metnini de değiştirir.

**Cevap gelmezse varsayımım:** Bu madde **başlatılmıyor.** İçerik olmadan
yazılacak şey boş bir kabuk olur.
**Yanlışsa etkisi:** —


### Kısmî karar (6 Ağustos 2026)

İstek listesi envanterlerin adlarını verdi ve "öğrenciler için bu işlemi yap"
dedi. Bu, dört sorudan **birini** cevapladı; modül o ayrımın üstüne kuruldu ve
**E yapıldı** (bkz. YAPILACAKLAR.md · E).

**Cevaplanan:** hangi envanterler olacağı. Yedisi de sisteme tanımlandı.

**Hâlâ bekleyen — 1 ve 2 (madde metinleri ve izin).** Dördü yayımlanmış,
geçerlik–güvenirlik çalışması yapılmış ölçek: *Teknoloji Liderliği
Özyeterlilik Ölçeği, Dick Kişilik Envanteri, EPAI, ENTCOM*. **Maddeleri
uydurulmadı.** Bir ölçeğin adını taşıyıp maddelerini uydurmak, öğrenciye o
ölçeğin sonucu diye başka bir şey göstermek olurdu — ne telif ne de ölçme
açısından savunulabilirdi. Tanımları boş duruyor, ekranda "içeriği beklenen
envanterler" başlığı altında görünüyor ve çözülemiyorlar.

Üçü — *İlgi, Beceri, Mesleki Yaklaşım* — **bu proje için yazıldı** ve
çözülebiliyor. Genel adlar oldukları için özgün madde yazmak mümkündü;
ekranda "yayımlanmış bir ölçeğin uyarlaması değildir" notu duruyor.

> **Gereken:** dört ölçeğin madde metinleri, alt boyutları, puanlama anahtarı
> ve kullanım izni. Geldiğinde yapılacak tek iş `lib/envanter/tanimlar.ts`
> içindeki tanımı doldurmaktır — motor, ekran ve puanlama hazır, ters
> puanlanan madde ve 1–5 dışı ölçek destekli.

**3 — "Dick Kişilik Envanteri" HÂLÂ AÇIK.** Literatürde bu adla yaygın bir
envanter bulunamadı. DISC kastediliyorsa hangi sürüm olduğu da belirtilmeli.
Not ekranda da yazılı.

**4 — görünürlük: VARSAYIMLA ilerlendi.** Sonuçlar **yalnızca kişinin
kendisine** açık; danışman, il koordinatörü ve proje yöneticisi göremiyor,
erişim loguna da yazılmıyor (yalnızca "başlatıldı/tamamlandı" olayı yazılıyor).
Gerekçe: kişilik ve mesleki eğilim sonucu hassas veridir ve kullanıcıların
çoğu 18 yaş altıdır. Dar taraftan başlandı — açmak kolay, geri almak değil.
Danışmanın görmesi ya da toplu istatistik isteniyorsa bu ayrı bir karardır ve
**açık rıza metnini de değiştirir**.

---

## ✅ S4 — KVKK menüden kalkınca imzalanan belgeye nasıl bakılacak? — CEVAPLANDI

**İlgili madde:** A2 · **Durum:** cevaplandı ve uygulandı (5 Ağustos 2026)

> **Talepte yazan:** "KVKK metni üye olunurken görülsün sadece. Menüden
> kaldırılacak."

**Anladığım.** Belgeler ilk girişte okutulacak (bu zaten yapıldı), menüdeki
"KVKK ve Belgelerim" girişi kaldırılacak.

**Emin olamadığım.** Menü girişi kalkınca iki durum sahipsiz kalıyor:

1. Yönetim ekranından bir belge metni **güncellenirse** yeniden onay nasıl
   alınacak? (Bugün: uyarı şeridi → o sekme.)
2. Kullanıcı **imzaladığı belgeyi sonradan okumak** isterse nereden bakacak?
   Onayladığı metne erişememesi KVKK açısından savunulabilir değil.

**Sorular.** Menüden tamamen mi kalksın, yoksa **Profilim** sayfasının altında
"Onayladığım belgeler" başlığı olarak mı dursun? Metin güncellendiğinde uyarı
şeridi çıkmaya devam etsin mi?

**Cevap gelmezse varsayımım:** Menüden kaldırıyorum; belgeler **Profilim**
sayfasında bir bölüm olarak duruyor; metin güncellenince şerit çıkıyor ve oraya
götürüyor.
**Yanlışsa etkisi:** Düşük.

### Gelen cevap (5 Ağustos 2026)

> "profil sayfasının en altına alalım, gerekirse kvkk'yı okuyabilir. menüden
> kaldıralım"

Varsayım onaylandı ve uygulandı:

- Menüdeki "KVKK ve Belgelerim" girişi **kaldırıldı**.
- Belgeler profilin **en altında** (`/panel/profil#kvkk`): onay durumu ve tarihi
  görünür, tam metin katlanmış hâlde açılır.
- Metin güncellendiğinde **şerit çıkmaya devam ediyor** ve doğrudan bu bölüme
  götürüyor. Sekme kalktığı için şerit artık yeniden onayın **tek yolu**;
  kaldırılamaz.
- Eski `/panel/kvkk` ve `/panel/taahhut` adresleri kalıcı yönlendirmeyle
  yaşıyor — e-postalarda ve yer imlerinde duruyorlar.

---

## ✅ S9 — "Profil bölümlerinin düzenleme sayfası" ne demek? — CEVAPLANDI

**İlgili madde:** C4 · **Durum:** cevaplandı ve uygulandı (7 Ağustos 2026)

> **Cevap:** Üçüncü bir okuma seçildi — ne ayrı sayfalar ne satır içi
> düzenleme. **Profil GÖSTERİR, Panelim DÜZENLER:** `/panel/profil` salt
> okunur hâle geldi, düzenlemenin tamamı Panelim içindeki katlanabilir
> bölümlere taşındı. Kapsam öğrenciyle sınırlı tutulmadı, **öğretmen tarafına
> da** uygulandı: tek düzen, tek davranış.

> **Talepte yazan:** "Panelde profil kısmında gözükecek bölümlerin
> düzenleme/ekleme/silme sayfası olacak"

İsteğin sonraki hâli bunu netleştirdi: *"foto ekleme değiştirme panelden
yapılsın, profil kısmında sadece foto görünsün, iletişim bilgileri düzenleme
panel sekmesine taşınsın, profilden sadece görünsün, profildeki danışman ekleme
düzenleme panel kısmına taşınsın, profilde sadece danışmanın adı gözüksün,
GençTek Yolculuğum Bilişim Yolculuğum ve Rotam bölümlerinin sadece bilgileri
profilde görünsün, bilgi girişleri ve düzenleme panelden yapılsın."*

Ayrı sayfalar açılmadı çünkü kullanıcıyı aynı içeriğin iki ayrı görünümü
arasında gidip getirirdi; satır içi düzenleme de kalmadı çünkü istek profilin
salt görüntüleme olmasını söylüyor. Uygulama ayrıntısı: `README.md` · "Profil
gösterir, Panelim düzenler".

**Tek istisna KVKK onayıdır** ve bilinçli: onay bir profil bilgisi değil hukuki
bir beyandır, metnin okunduğu yerde verilmelidir.

---

## 🔴 S26 — E-Devlet entegrasyonu için erişim bilgileri

**İlgili madde:** 7 Ağustos eki · giriş kapısı · **Durum:** AÇIK, kod yazılamıyor

> **Talepte yazan:** "Giriş sayfası — 1. EBA ile Giriş, 2. E-Devlet ile Giriş
> (açıklama: Paydaş/Mentör Girişleri için tıklayınız)"

**Yapılan.** Açılış ekranındaki düğme ve açıklama istendiği gibi duruyor;
bugün mevcut e-posta/şifre ekranına (`/dis-giris`) götürüyor.

**Yapılamayan.** Gerçek e-Devlet Kapısı entegrasyonu. Üç şey gerekiyor ve
hiçbiri elde değil:

1. **Kurum başvurusu** — e-Devlet Kapısı'na kurum olarak kayıt ve onay
2. **Test ortamı erişimi** — entegrasyon uçları ve örnek kimlikler
3. **İstemci sertifikası / anahtar** — imzalama ve doğrulama için

**Soru:** Bu üçü ne zaman sağlanabilir? Kurum başvurusu yapıldı mı, hangi
aşamada?

**Cevap gelmezse varsayımım:** Düğme mevcut hâliyle kalır. Mimari bu geçişe
hazır — değişecek tek yer `AuthProvider` uygulamasıdır, ekranlar değil
(SKILL.md · Değişmezler 1). EBA SSO da tam olarak aynı sebeple bekliyor.
**Yanlışsa etkisi:** Yok — bugünkü akış çalışıyor, entegrasyon eklendiğinde
kullanıcı tarafında görünen hiçbir şey değişmiyor.

---

## ✅ S10 — Sertifika: dosya yüklenecek mi? — CEVAPLANDI

**İlgili madde:** D3

**Anladığım.** Öğrenci aldığı sertifikaları profilinde listeleyebilecek.

**Emin olamadığım.** Sertifikanın **belgesi** yüklenecek mi, yoksa yalnızca
bilgileri mi girilecek (ad, veren kurum, tarih)?

**Sorular.**

1. Dosya yüklenecekse: hangi tipler (PDF/JPG/PNG), boyut sınırı?
2. Sertifikayı kim görebilecek — yalnızca öğrenci ve danışmanı mı, profili
   görebilen herkes mi?
3. Doğrulama var mı, yoksa **beyan** mı? (Sistemin bugünkü tutumu: kazanım
   kayıtları beyandır, doğrulanmaz.)

**Cevap gelmezse varsayımım:** Dosya yükleniyor (PDF/JPG/PNG, 5 MB); profili
görebilen görüyor; beyan — doğrulama yok.
**Yanlışsa etkisi:** Düşük–orta (dosya yüklenmeyecekse iş yarıya iner).


### Karar (6 Ağustos 2026)

Soru fiilen KENDİLİĞİNDEN cevaplandı: 5 Ağustos'ta D8 ile `kazanim_ek` tablosu
açıldı (destekleyici belgeler). Sertifika ayrı bir dosya alanı istemiyor —
kaydın altındaki mevcut yükleme alanını kullanıyor. Boyut ve tip sınırları da
oradan geliyor.

Sertifika **ayrı tablo değil, kazanım TİPİ** olarak eklendi: aynı form, aynı
doğrulama, aynı silme yolu ikinci kez yazılmasın diye (arşivdeki Faz 2 notu da
bunu söylüyordu).
---

## ✅ S11 — Topluluk: beyan mı, ortak kayıt mı? — CEVAPLANDI

**İlgili madde:** D4

> **Talepte yazan:** "içinde yer aldığı toplulukları gösterebileceği (Klüp,
> proje ekibi, takım vb.) 'Topluluklarım' bölümü eklenecek"

**Anladığım.** Öğrenci üyesi olduğu klüp/ekip/takımları profiline yazacak.

**Emin olamadığım.** Topluluk **kişisel bir beyan** mı, yoksa sistemde **paylaşılan
bir kayıt** mı?

- **(a) Beyan:** öğrenci serbest metin yazar. Aynı klübün on üyesi on farklı
  yazımla girer, ama iş küçüktür.
- **(b) Ortak kayıt:** topluluk bir kere açılır, üyeler ona bağlanır. Üye
  listesi, kurucu, onay gerekir — iş büyür ama "topluluk sayfası", "üyelerim"
  gibi şeyler mümkün olur.

**Soru:** Şimdilik (a) yeterli mi, yoksa (b)'yi mi hedefliyoruz?

**Cevap gelmezse varsayımım:** (a) beyan. Diğer kazanım kayıtlarıyla aynı desen.
**Yanlışsa etkisi:** Yüksek — sonradan (a)'dan (b)'ye geçmek, serbest metinle
girilmiş toplulukları eşleştirmeyi gerektirir ve bu elle yapılır.


### Karar (6 Ağustos 2026)

**Beyan.** Diğer kazanım kayıtlarıyla aynı desen: sistem doğrulamaz, danışman
onayına tabi değildir.

Ortak kayıt yapılmadı: aynı kulübe iki öğrenci yazdığında iki ayrı satır oluşur
ve sistem bunları eşleştirmez. Eşleştirilmiş topluluk, ayrı bir referans tablosu
ve üyelik yönetimi demekti — istekte istenen bu değil, kişinin "içinde yer
aldığı toplulukları **gösterebileceği**" bir bölüm.
---

## 🟡 S12 — Ürün taahhütnamesi ve markette moderasyon

**İlgili madde:** D5, I

> **Talepte yazan:** "Ürün ekleme taahhütname imzalaması gerekmekte." ·
> "'Bu ürünü markette paylaş' check box eklenecek"

**Anladığım.** Ürün eklerken bir taahhütname imzalanacak; öğrenci ürününü
markette yayımlamayı seçebilecek.

**Emin olamadığım.**

1. **Taahhütname metni** kimden gelecek? (Altyapı hazır — 5 Ağustos'ta kurulan
   onay belgesi sistemine yeni bir tür eklemek yeterli. Eksik olan metnin
   kendisi.)
2. Taahhütname **her üründe mi** imzalanacak, yoksa bir kez mi?
3. **Markete çıkan ürünü kimse onaylıyor mu?** Onay yoksa öğrencinin yazdığı her
   şey doğrudan yayımlanır. Kullanıcıların çoğu 18 yaş altı olduğu için bunun
   bilinçli bir karar olması gerekir. Danışman öğretmen ya da il koordinatörü
   onayı isteniyor mu?
4. Yayımlanmış bir ürün **şikâyet edilebilecek** mi / kaldırılabilecek mi?

**Cevap gelmezse varsayımım:** Taahhütname bir kez imzalanır; markete çıkış
**danışman öğretmen onayına** tabidir; kaldırma yetkisi koordinatör ve proje
yöneticisindedir.
**Yanlışsa etkisi:** Yüksek — moderasyonsuz yayın, sonradan eklenmesi zor bir
sorumluluk doğurur.

---

## ✅ S14 — "Rotam": serbest metin mi, hedef listesi mi? — CEVAPLANDI

**İlgili madde:** D6 — **yapıldı**

> **Talepte yazan (6 Ağustos):** "Profilim bölümünde 'Rotam' kısmı
> oluşturulmasını talep ediyoruz. Öğrencinin yapmak istedikleri bu bölümde
> görüntülenecek. Hedefleri, yapmak istedikleri vb."

**Karar: (b) hedef listesi**, durum takipli, danışman yorumsuz.

**Neden.** İstek biçimi hâlâ açıkça söylemiyor; ama seçim **geri dönüşü olan
yöne** yapıldı:

- liste → serbest metin geçişi **kayıpsızdır** (satırlar alt alta yazılır),
- serbest metin → liste geçişi **değildir** (yazılmış paragraf hedeflere
  bölünemez, "durum" bilgisi hiç yoktur ve sonradan üretilemez).

Ayrıca "Hedefleri, yapmak istedikleri" **çoğuldur** ve "Rotam" adı bir yön ile
ilerleme ima eder; tek paragraf ilerlemeyi taşıyamaz.

**Ne yapıldı.** Her hedefin başlığı, isteğe bağlı açıklaması, isteğe bağlı
hedef tarihi ve durumu (Planladım / Üzerinde çalışıyorum / Tamamladım) var.
Durum tek tıkla ilerletiliyor; tamamlanma anı ayrı tutuluyor.

**Görünürlük: yalnızca kişinin kendisi.** Kazanımlardan ayrıldığı yer burasıdır
— kazanım "yaptım" beyanıdır ve danışman/koordinatör görür; hedef "yapmak
istiyorum" beyanıdır ve istekte kimsenin göreceği yazmıyor. Danışmana açmak
sonradan eklenebilir; açılmış bir görünürlüğü, öğrenciler özel hedeflerini
yazdıktan SONRA geri almak mümkün değildir.

**Hâlâ açık olan (küçük):** Danışmanın öğrencinin rotasını görmesi istenirse
söylemeniz yeterli — tek bir sorgu ve tek bir kart eklenir.

---

## ✅ S15 — "Seferlerim": hangi seviye listesi, hangi ölçüt? — CEVAPLANDI

**İlgili madde:** D7

> **Talepte yazan:** "Öğrenciyi **usta/kalfa/çırak vb** (**keşfeden, üreten,
> paylaşan, lider, elçi**) seviyelerine göre derecelendirilebilecek."

**Anladığım.** Bugünkü "katkı nişanları" seviyeli bir sisteme dönüşecek ve
"Seferlerim" adını alacak.

**Emin olamadığım — iki nokta.**

1. **İki farklı liste** verilmiş: "usta / kalfa / çırak" (üç kademeli bir usta–
   çırak hiyerarşisi) ve "keşfeden / üreten / paylaşan / lider / elçi" (beş
   farklı **rol**, hiyerarşi değil). Bunlar aynı şey değil. Hangisi geçerli —
   yoksa ikisi birlikte mi (ör. "üreten çırak" → "üreten usta")?
2. **Seviye atlama ölçütü nedir?** Bu maddenin yazılabilmesi için asıl gereken
   bu. Ne olursa öğrenci bir üst seviyeye çıkar: kaç etkinliğe katılım, kaç
   akran eğitimi, kaç ürün, kaç derece? Ölçüt olmadan seviye bir etiket olur,
   hesaplanamaz.

Not: bugünkü nişanlar **hesaplanıyor**, elle verilmiyor — "beyanla nişan
kazanılamaz" diye karar verilmişti. Seviyeler de hesaplanacaksa ölçüt şart;
elle verilecekse **kim verecek** sorusu doğar.

**Cevap gelmezse varsayımım:** Bu madde **başlatılmıyor.** Ölçüt olmadan
yazılabilecek bir şey yok.
**Yanlışsa etkisi:** —


### Gelen cevap (6 Ağustos 2026)

> "keşfeden üreten paylaşan geçerli, 2 etkinlikler verdiği eğitimler vs.,
> 3 düşmesin, seneye için bakarız sonra"

1. **Liste:** keşfeden/üreten/paylaşan/lider/elçi. usta/kalfa/çırak kullanılmadı.
2. **Ölçüt:** her seviyenin KENDİ ölçütü var ve geçmişten türetiliyor —
   Keşfeden: etkinliğe katıldı · Üreten: ürün ekledi · Paylaşan: akran eğitimi
   verdi · Lider: temsilcilik üstlendi ya da etkinlik önerdi · Elçi: il geneli
   veya ulusal etkinliğe katıldı.
3. **Düşmez.** Ölçütlerin hepsi geçmişe bakan sayımlar; kazanılan seviye
   kendiliğinden geri alınmıyor. **Dönem sıfırlaması yok** ("seneye için bakarız").

**Seviyeler bir merdiven DEĞİL, kazanılan niteliklerdir.** "Üreten" ile
"paylaşan" biri öbürünün üstü değil. Sıralı kurulsaydı ürün eklemeyen bir
öğrenci, akran eğitimi verse bile "paylaşan" olamazdı.

**Açık kalan iki nokta:**

- Cevapta **üç** ad sayıldı ("keşfeden üreten paylaşan"), istekte **beş** vardı.
  Beşi de kuruldu; "lider" ve "elçi" istenmiyorsa listeden çıkarmak tek satır.
- Seviyenin düşebileceği TEK yol, bir yetkilinin görev rolünü silmesi (kaldırma
  gerçek silmedir). Düzenlenen etkinlik de aynı seviyeyi verdiği için bu yol
  pratikte açık kalıyor.
---

## ✅ S17 — Görev Rolleri kalkarsa İl ve İlçe Temsilcisi atamaları nereye gidecek? — CEVAPLANDI

**İlgili madde:** J2 · **Durum:** cevaplandı ve uygulandı (5 Ağustos 2026)

> **Talepte yazan:** "Görev Rolleri sekmesi kaldırılacak. Öğrencilerim
> sekmesinden Filtreleme bölümünde 'Okul Temsilcisi Yap' check boxı olmalı."

**Anladığım.** Danışman öğretmen, Okul Temsilcisi atamasını artık Öğrencilerim
ekranından yapacak.

**Emin olamadığım.** O sekme **üç** rolü yönetiyor:

| Rol | Kim atıyor | İstekte yeri var mı |
|---|---|---|
| Okul Temsilcisi | Danışman öğretmen | ✅ Öğrencilerim'e taşınıyor |
| **İl Temsilcisi** | İl koordinatörü | ❓ belirtilmemiş |
| **İlçe Temsilcisi** | İl koordinatörü | ❓ belirtilmemiş |

Sekme kaldırılırsa il koordinatörünün il ve ilçe temsilcisi ataması yapacağı yer
kalmıyor.

**Soru:** İl ve İlçe Temsilcisi atamaları nereye taşınsın? Seçenekler:
**(a)** Görev Rolleri sekmesi yalnızca **il koordinatörü** için kalsın, danışman
öğretmende kalksın; **(b)** koordinatör de Öğrencilerim ekranından atasın;
**(c)** bu iki rol tamamen kaldırılıyor.

**Cevap gelmezse varsayımım:** (a). Sekme koordinatörde kalır, danışman
öğretmende menüden çıkar ve Okul Temsilcisi ataması Öğrencilerim'e taşınır.
**Yanlışsa etkisi:** Orta.

### Gelen cevap (5 Ağustos 2026)

**(a) onaylandı.** Görev Rolleri sekmesi il koordinatörü ve merkezde kaldı;
danışman öğretmenin menüsünden çıktı. Okul Temsilcisi ataması Öğrencilerim
tablosunda satır başına düğme oldu ve işlem sonrası **filtreler korunarak**
listeye dönüyor. Görevi KALDIRMA koordinatörde de duruyor: okulda danışman
kalmadığında yanlış bir atamayı düzeltebilecek tek kişi o.

---

## ✅ S18 — Paydaşlar sekmesi kalkarsa paydaş kaydı nereden açılacak? — CEVAPLANDI

**İlgili madde:** J4 · **Durum:** cevaplandı ve uygulandı (5 Ağustos 2026)

> **Talepte yazan:** "Paydaşlar sekmesi kaldırılacak. Faaliyet Ekle kısmında iş
> birliği yapılan paylaşlar eklenecek."

**Anladığım.** Etkinlik oluştururken iş birliği yapılan paydaşlar seçilebilecek.

**Emin olamadığım.** Bunlar **iki ayrı iş** ve ikincisi zaten var:

- **Etkinliğe paydaş bağlama** — *zaten mevcut* (etkinlik formunda paydaş
  seçimi var).
- **Paydaş envanteri** — kurumun kaydını açmak, adres/yetkili/telefon bilgisini
  girmek, düzeltmek, CSV almak. Bunu il koordinatörü yapıyor ve **yalnızca o
  sekmede** yapılabiliyor.

Sekme kalkarsa yeni bir paydaş kurumu ilk kez kim, nereden kaydedecek?

**Soru:** Kastınız **(a)** "envanter ekranı kalksın, paydaş kurum kaydı doğrudan
etkinlik formundan açılsın" mı, yoksa **(b)** "etkinlik formunda paydaş seçimi
olsun" mu (ki o zaten var, sekmenin kalkması gerekmez)?

Uyarı: (a) olursa aynı kurum onlarca kez farklı yazımla girilir ("Ankara Üniv.",
"Ankara Üniversitesi", "A.Ü.") ve il bazlı paydaş raporu anlamsızlaşır.

**Cevap gelmezse varsayımım:** (b). Sekme **il koordinatöründe kalıyor**,
danışman öğretmenin menüsünden çıkıyor; etkinlik formundaki paydaş seçimi
belirginleştiriliyor.
**Yanlışsa etkisi:** Yüksek — (a) seçilirse paydaş verisi geri dönüşü zor
biçimde kirlenir.

### Gelen cevap (5 Ağustos 2026)

**(b) onaylandı.** Envanter il koordinatöründe ve merkezde kaldı, danışman
öğretmenin menüsünden çıktı. Etkinlik detayındaki paydaş bölümüne, listede
olmayan kurum için ne yapılacağı yazıldı ("il koordinatörünüzden eklemesini
isteyin") — aksi hâlde öğretmen çıkmaz sokakta kalır ve kaydı uydurmaya
çalışırdı.

---

## 🟡 S19 — Grup sohbetlerini kim okuyabilecek, kim üye ekleyecek?

**İlgili madde:** G

> **Talepte yazan:** "Sohbet Kategorileri eklenecek (Çalışma Grupları, Temsilci
> Grupları, Okul Grupları)"

**Anladığım.** Bire bir yazışmanın yanına grup sohbetleri gelecek: çalışma grubu
bazlı, temsilci bazlı ve okul bazlı.

**Emin olamadığım.** Sistemde bugün açık bir kural var: **gizli kanal yoktur** —
her yazışma danışman, il koordinatörü ve proje yöneticisince tam içerikle
okunabilir, ve bu aydınlatma metnine madde 2.1 olarak yazılı. Bu kural grupta
nasıl işleyecek?

**Sorular.**

1. Grubu **kim açar**? (Sistem otomatik mi kuruyor — ör. her çalışma grubu için
   bir sohbet — yoksa kullanıcı mı açıyor?)
2. **Üyelik** nasıl belirlenir? Çalışma grubunu seçen herkes otomatik üye mi?
3. Bir okul grubunda 200 öğrenci olabilir. **Kim yazabilir**, herkes mi?
4. Gözetim: bir okul grubunu **hangi öğretmen** okuyabilecek? Yalnızca o okulun
   danışmanları mı, ilin koordinatörü de mi?
5. **Üyelikten çıkarma / susturma** olacak mı? (200 kişilik bir grupta
   moderasyon aracı olmadan sorun çıkarsa yapılabilecek tek şey grubu kapatmak
   olur.)

**Cevap gelmezse varsayımım:** Gruplar **sistem tarafından otomatik** kurulur
(her çalışma grubu / okul için bir tane), üyelik mevcut kayıttan gelir, herkes
yazabilir, gözetim bire bir yazışmayla aynı kurala tabidir, moderasyon aracı
olarak yalnızca **mesaj gizleme** vardır (bugünkü desen).
**Yanlışsa etkisi:** Yüksek.

---

## 🟢 S5 — "Katkılarım" hem sekme hem profil bölümü mü?

**İlgili madde:** B2, D7

> **Talepte yazan:** "Katkılarım (Panel sekmesinden giriş olacak, profilde
> gözükecek)" · "'Katkı Nişanı' kısmı profil bölümüne alınacak"

**Anladığım.** Katkılarım sekmesi kalıyor; nişanlar (yeni adıyla "Seferlerim")
profile taşınıyor.

**Emin olamadığım.** Sekme kalıyorsa, "Katkılarım" ekranında **nişanlar
çıkınca ne kalacak?** Bugün orada katıldığı etkinlikler + katkı kartı + nişanlar
var; katkı kartı D1 ile, nişanlar D7 ile profile taşınıyor.

**Soru:** "Katkılarım" sekmesi yalnızca **veri girişi** ekranı mı olacak
(profilde görünen kayıtların eklendiği yer), görüntüleme tamamen profile mi
geçecek? Talepteki "Katkılarım (Veri girişi)" ifadesi bunu ima ediyor.

**Cevap gelmezse varsayımım:** Evet — "Katkılarım" veri **giriş** ekranı,
görüntüleme profilde. Sekme kalıyor.
**Yanlışsa etkisi:** Düşük.

---

## ✅ S8 — "İlk girişte profil": her girişte mi, bir kez mi? — CEVAPLANDI

**İlgili madde:** C3 · **Durum:** cevaplandı ve uygulandı (5 Ağustos 2026)

> **Cevap: her girişte.** Öğrenci giriş sonrası profiline düşer. Belge
> kapısından sonra gelir; danışmansız öğrencide **danışman seçimi öne geçer**
> (o bir kapı, tercih değil). Öğretmen ve koordinatör panele girmeye devam eder.

**Anladığım.** Kullanıcı sisteme ilk girdiğinde profil ekranıyla karşılaşacak.

**Emin olamadığım.**

1. Yalnızca **ilk** girişte mi, her girişte mi?
2. Onay belgeleri kapısından **sonra** mı (öyle olmalı diye düşünüyorum)?
3. Öğrencinin **danışman seçimi** yönlendirmesinin önüne mi geçecek, sonrasına
   mı? (Bugün danışmansız öğrenci girişte doğrudan seçim ekranına gidiyor.)

**Cevap gelmezse varsayımım:** Yalnızca ilk girişte; belge kapısından sonra;
danışman seçiminden **önce** (önce kendini tanıt, sonra danışman seç).
**Yanlışsa etkisi:** Düşük — tek yönlendirme satırı.

---

## ✅ S13 — "Bağlantılarım" adı, mevcut "Bağlantı İstekleri" ile karışır mı? — CEVAPLANDI

**İlgili madde:** B2, G · **Durum:** cevaplandı ve uygulandı (5 Ağustos 2026)

> **Talepte yazan:** "Sekme ismi 'Bağlantılarım' olarak değiştirilecek."
> (Yazışmalar sekmesi için)

**Anladığım.** Yazışmalar sekmesi "Bağlantılarım" olacak.

**Emin olamadığım.** Menüde **zaten** "Bağlantı İstekleri" adlı bir sekme var —
öğrencinin bir öğretmenle iletişime geçme isteğini danışman/koordinatörün
onayladığı ekran. Yazışmalar da "Bağlantılarım" olursa menüde:

```
Bağlantılarım        ← mesajlar
Bağlantı İstekleri   ← onay bekleyen iletişim istekleri
```

yan yana duracak. Öğretmen ve koordinatör her ikisini de görüyor.

**Soru:** Bu ikisi karışır mı? Alternatif: onay ekranının adını **"İletişim
Onayları"** yapmak. Uygun mudur?

**Cevap gelmezse varsayımım:** Onay ekranının adını "İletişim Onayları" yapıyorum.
**Yanlışsa etkisi:** Düşük.

### Gelen cevap (5 Ağustos 2026)

Varsayım onaylandı: Yazışmalar → **"Bağlantılarım"**, eski "Bağlantı İstekleri"
→ **"İletişim Onayları"**. Ekranın içindeki liste başlığı ayrıca **"Mesajlar"**
oldu (istek ikisini ayrı söylüyordu).

**"Yazışma" sözcüğü metinlerde KALDI** — orada bir *konuşmanın tamamını*
anlatıyor ve "mesaj" tek bir iletidir; ikisini birleştirmek "bu mesajın tarafı
değilsiniz" gibi yanlış cümleler üretirdi.

---

## 🟢 S20 — Ekip arkadaşlığı ve takım grupları (talepte de soru işaretli)

**İlgili madde:** G, K

> **Talepte yazan:** "Bağlantılarım? Ekip arkadaşları belirlenebilecek.
> Birbirini eklme? **GM** / takım grubu oluşturulabilecek mi?"

**Anladığım.** Bu satırlar sizin de karara bağlamadığınız notlar gibi duruyor.

**Sorular.**

1. **"GM"** kısaltması ne anlama geliyor? Çözemedim.
2. "Ekip arkadaşı belirleme" — sosyal ağlardaki gibi **karşılıklı arkadaş
   ekleme** mi kastediliyor? Öyleyse mevcut **koordinatör onaylı iletişim**
   kuralıyla nasıl bağdaşacak? (Bugün öğrenciler birbirine doğrudan
   ulaşamıyor; onay gerekiyor ve bu, 18 yaş altı kullanıcıları korumak için
   konmuş bir kuraldı.)
3. "Takım grubu oluşturulabilecek mi?" — bu bir talep mi, yoksa henüz karar
   verilmemiş bir fikir mi?

**Cevap gelmezse varsayımım:** Bu üç satır **plana alınmıyor**, "sonraki faz"
olarak kaydediliyor.
**Yanlışsa etkisi:** —

---

## ✅ S21 — Talep panosunun yeni adı ve sponsor ilanları — CEVAPLANDI

**İlgili madde:** H · **Durum:** cevaplandı ve uygulandı (6 Ağustos 2026)

> **Talepte yazan:** "ismi değiştirilecek (**çağrı?**)" · "Talepler: Ekip
> arkadaşı, teknik destek, sponsor, duyuru (tanıtım/yaygınlaştırma)"

**Anladığım.** İlan panosuna tür alanı gelecek; ekranın adı da değişecek.

**Emin olamadığım.**

1. Yeni ad **"Çağrılar"** mı? Soru işaretiyle yazıldığı için emin olamadım.
2. Dört tür kesin mi, sonradan eklenecek mi? (Sabit liste yapabilirim, ya da
   çalışma grupları gibi yönetim ekranından büyütülebilir bir liste.)
3. **Sponsor** ilanları ekosistem dışına bakıyor. Bu ilanı kim görecek? Bugün
   panoyu yalnızca sisteme girmiş kullanıcılar görüyor; sponsor arayan bir ilanın
   sisteme girmemiş bir kuruma ulaşma yolu yok. **S1 kısmen çözdü:** paydaş
   temsilcisi artık sisteme girip panoyu görebiliyor ve ilan açabiliyor — ama
   yalnızca envanterde **zaten kayıtlı** bir kurumun temsilcisi başvurabildiği
   için, hiç tanışılmamış bir sponsora ulaşma sorunu duruyor.
4. Öğrenci sponsor ilanı açabilecek mi, yoksa bu yalnızca koordinatöre mi açık?

**Cevap gelmezse varsayımım:** Ad "Çağrılar"; dört tür sabit liste; sponsor
ilanı **yalnızca koordinatör ve proje yöneticisi** açabilir; pano dışarıya
açılmıyor.
**Yanlışsa etkisi:** Düşük–orta.

### Gelen cevap (6 Ağustos 2026)

> "pano olsun adı, eko sistem dışında gözükmeyecek"

- **Ad "Pano"** — varsayımdaki "Çağrılar" değil.
- **Pano ekosistem dışına açılmıyor**; ilanları yalnızca sisteme girmiş
  kullanıcılar görüyor. Bu, ekranda da yazılı.
- **Dört tür sabit liste** (cevaplanmadı, varsayım yürürlükte). Beşinci tür
  gerekirse enum'a eklenir; bu bir migration'dır ve öyle olmalı — tür listesi
  büyüdüğünde kimin ne göreceği yeniden düşünülmeli.
- **Sponsor ilanını herkes açabilir** — varsayım TERSİNE ÇEVRİLDİ. Kısıtlamanın
  gerekçesi ilanın dışarıya görünmesiydi; pano dışarı kapalı olduğu için o
  gerekçe kalmadı. Sponsor arayan öğrencinin ilanı, sistemdeki paydaş
  temsilcilerine ulaşıyor ve temas zaten danışman/koordinatör onayından geçen
  bağlantı isteğiyle kuruluyor. Kısıtlamak, çalışan bir yolu kapatırdı.

---

## ✅ S22 — Market: "DİLİM" nedir, "indirilme sayısı" neyi sayacak? — CEVAPLANDI

**İlgili madde:** I · **Durum:** Market yapıldı; DİLİM 10 Ağustos 2026'da
kaldırıldı (aşağıda "Kısmî karar")

> **Talepte yazan:** "Ürün Listele: Kendi Ürünlerim, Öğrenci ürünleri, Öğretmen
> Ürünleri, **DİLİM** vb" · "Ürünlerin görüntülenme sayıları, indirilme sayıları
> görüntülenecek"

**Sorular.**

1. **"DİLİM"** nedir? Bir ürün kategorisi mi, bir kurum/proje adı mı, bir
   kısaltma mı? Çözemedim.
2. **"vb"** — başka listeler de olacak mı? Liste sabit mi olacak, yönetimden
   eklenebilir mi?
3. **"İndirilme sayısı"** — ürünler şimdilik yalnızca **tanıtım** olacağı için
   indirilecek bir dosya yok. Bu sayaç ne sayacak: dış bağlantıya tıklama mı,
   yoksa ürün yükleme açılana kadar boş mu kalsın?
4. **Öğretmen ürünleri** nereden gelecek? Bugün öğretmen de kazanım tablosuna
   ürün girebiliyor; ürün kaydı öğretmen profilinde de olacak mı?
5. Görüntülenme/indirilme sayısını **kim** görecek — herkes mi, yalnızca ürün
   sahibi mi?

**Cevap gelmezse varsayımım:** "DİLİM" sekmesi **yapılmıyor** (ne olduğunu
bilmeden yapılamaz); indirilme sayacı, yükleme özelliği açılana kadar
gösterilmiyor; öğretmen ürünleri de aynı tablodan geliyor; sayaçları herkes
görüyor.
**Yanlışsa etkisi:** Düşük.


### Kısmî karar (6 Ağustos 2026)

Market **yapıldı** (bkz. YAPILACAKLAR.md · I). Beş sorudan üçü kapandı, ikisi
duruyor.

**4 — kapandı.** Öğretmen ürünleri aynı tablodan geliyor (`kullanici_kazanim` ·
tip=URUN); sekme ayrımı kaydın sahibinin ROL listesine bakılarak yapılıyor.
İstekte "Öğretmen Ürünleri" ayrı bir süzgeç olarak sayıldığı için bu doğrulandı.

**5 — kapandı (varsayımla).** Sayaçları **herkes** görüyor. Yalnızca sahibine
gösterilseydi vitrinin "hangi ürün ilgi görüyor" bilgisi kaybolurdu.

**3 — İNDİRİLME SAYACI: varsayımdan farklı davranıldı, gerekçesiyle.**
Varsayım "gösterilmesin" idi; onun yerine **dış bağlantıya gidilmesi**
sayılıyor. Sebep: sayaç istekte açıkça isteniyor, hiç koymamak isteği
görmezden gelmek; koyup her üründe 0 göstermek ise ekranda bozuk görünen ölü
bir sayı olurdu. Kullanıcının bir ürünü edinmek için yaptığı şey tam olarak
bağlantısına gitmektir.

> Ekranda **"İndirilme" yazmıyor**, "Bağlantı ziyareti" yazıyor ve sayfanın
> altında ne saydığı anlatılıyor. Dosya yükleme açılırsa gerçek indirme ayrı
> bir sütun olur; bu sayaç anlamını korur. **Soru hâlâ açık:** başka bir şey
> sayılması isteniyorsa değişecek yer iki sütun ve market ekranıdır.

**1 ve 2 — KAPANDI (10 Ağustos 2026): DİLİM KALDIRILDI.**

İstek: *"dilim kalkacak, kendi ürünlerim ürünlerim olacak, öğrenci ve öğretmen
ürünleri ayrı olmayacak."*

Ne olduğu hiç tanımlanmadı ve süzgeç aylarca "tanım bekleniyor" etiketiyle
ekranda durdu; beklemeye devam etmek yerine kaldırıldı. Aynı turda rol bazlı
iki süzgeç de (Öğrenci ürünleri / Öğretmen ürünleri) kalktı: market bir ÜRÜN
vitrinidir, bir uygulamanın işe yarayıp yaramaması onu yazanın öğrenci mi
öğretmen mi olduğuna bakmaz; ayrım ayrıca mezun/paydaş ürününü iki sekmenin de
dışında bırakıyordu.

**Kalan iki süzgeç:** "Tüm ürünler" ve "Ürünlerim". Kaydın sahibi kartın
üstünde yazmaya devam ediyor (ad + "Öğrenci/Öğretmen/Ekosistem ürünü") —
bilgi duruyor, vitrini bölen süzgeç kalkıyor. Eski `?suzgec=` adresleri
sessizce vitrine düşüyor.

DİLİM'in tanımı bir gün gelirse iş, ürüne bir kategori alanı açmak ve
`MARKET_SUZGECLERI`'ne yeni bir satır eklemektir.

---

## ✅ S23 — Öğretmen tek bir öğrencinin danışmanlığını bırakırsa o öğrenci nereye gider? — CEVAPLANDI

**İlgili madde:** J1

> **Talepte yazan:** "Öğretmen danışmanlığını yaptığı öğrencileri isterse
> bırakabilmeli"

**Anladığım.** Öğretmen, danışmanı olduğu bir öğrenciyi bırakabilecek.

**Emin olamadığım.** Bugün öğretmen **görevin tamamını** bırakabiliyor ve o
zaman bütün öğrencileri devir tablosuna göre dağıtılıyor. **Tek** öğrenci
bırakıldığında ne olacağı tanımlı değil.

**Sorular.**

1. Bırakılan öğrenci: okuldaki başka bir danışmana mı atanacak, "yeniden seç"
   bildirimi mi alacak, il koordinatörüne mi düşecek?
2. **Gerekçe** zorunlu olsun mu? (Zorunlu olmasını öneriyorum: bu, "zor"
   öğrencinin sessizce bırakılmasına açık bir kapı; gerekçe ve erişim kaydı
   caydırıcı olur.)
3. Öğrenciye bildirim gidecek mi? Ne yazacak? ("Danışmanınız sizi bıraktı"
   cümlesini bir öğrenciye göstermek istemeyiz — metin dikkatli seçilmeli.)
4. Öğrenci aynı öğretmeni **yeniden seçebilecek** mi?

**Cevap gelmezse varsayımım:** Öğrenci "yeniden seç" durumuna düşer, seçim
yapana kadar il koordinatörüne bağlı kalır (mevcut devir kuralıyla aynı);
gerekçe zorunlu; öğrenciye nötr bir bildirim gider ("danışman öğretmen seçiminiz
yenilenmelidir"); aynı öğretmen yeniden seçilebilir.
**Yanlışsa etkisi:** Orta.



### Gelen cevap (6 Ağustos 2026)

> "koordinatöre bilgi gitsin gerekçe şart"

- **Gerekçe zorunlu** (en az 10 karakter): tek harflik bir gerekçe, zorunluluğu
  biçimsel olarak karşılayıp anlamını boşaltırdı.
- **İl koordinatörüne bildirim** gidiyor; gerekçe ve öğrencinin yeni durumu
  metinde yazılı. Erişim kaydına da aynı bilgi yazılıyor.
- **Öğrenci nereye gider:** ayrı bir kural yazılmadı, mevcut devir kuralları
  (`devirKarariVer`) aynen uygulandı — okulda başka danışman kaldıysa ona,
  birden fazla varsa "yeniden seç" bildirimi ve geçici olarak koordinatöre, hiç
  kalmadıysa koordinatöre. İki ayrı cevap zamanla ayrışırdı.
- **Devredilecek kimse yoksa bırakma YAPILMAZ:** öğretmen görevde kalır, proje
  yöneticisine uyarı düşer. Boşta öğrenci kalamaz (SKILL.md · Değişmezler 2).
---

## ✅ S24 — "Etkinlikler kısmında" tam olarak neresi? — CEVAPLANDI

**İlgili madde:** J3

> **Talepte yazan:** "Raporlar ve Belge Oluştur sekmesi kaldırılıp Etkinlikler
> kısmında oluşturulacak."

**Anladığım.** İki menü girişi kalkacak, işlevleri etkinlik ekranlarına
taşınacak.

**Emin olamadığım.** "Etkinlikler kısmı" ikisinden hangisi:

- **(a)** Etkinlik **listesinin** üstünde sekme/düğme ("Raporlar", "Belge
  Oluştur") — toplu görünüm korunur.
- **(b)** Her **etkinliğin detay sayfasında** — ki bu zaten var; o hâlde
  değişiklik yalnızca menü girişlerini silmek olur.

Bir uyarı: (b) seçilirse **"raporu yazılmamış etkinlikler" toplu listesi
kaybolur.** Koordinatörün "hangi raporlar eksik" sorusunu cevapladığı tek yer
orası.

**Cevap gelmezse varsayımım:** (a) — etkinlik listesinin üstünde iki sekme.
Toplu görünüm korunuyor, menü sadeleşiyor.
**Yanlışsa etkisi:** Orta.



### Gelen cevap (6 Ağustos 2026)

> "sen öner"

Önerilen ve uygulanan çözüm: **iki sekme menüden kalktı, sayfalar kaldı.**

- "Hangi raporlar eksik" TOPLU görünümü kaybolmasın diye Etkinlikler listesine
  **"Raporu bekleyenler"** filtresi eklendi. Sekmenin kaldırılmasıyla kaybolacak
  tek şey buydu — koordinatörün ilindeki eksikleri etkinlik detayından tek tek
  arayarak bulması imkânsızdı.
- Bitmiş ama raporsuz etkinlikler listede **rozetle** işaretleniyor; filtre
  kapalıyken de gözden kaçmıyorlar.
- "Bitmiş" ölçütü bitiş tarihi (yoksa etkinlik tarihi): çok günlü bir etkinlik
  daha sürerken rapor beklenir görünmemeli. İptal edilenler listelenmiyor.
- Belge Oluştur ekranına Etkinlikler'den düğme var. `/panel/raporlar` ve
  `/panel/belgeler` doğrudan adresle çalışmaya devam ediyor.
---

## ✅ S25 — Katılım belgesindeki imza sahibinin adı nereden gelecek? — CEVAPLANDI

**İlgili madde:** J5

> **Talepte yazan:** "Katılım Belgesi: Okul içinde ise okul müdürü, il bazında
> ise il milli eğitim müdürü imzalı"

**Anladığım.** Belgedeki imza bloğu etkinliğin kapsamına göre değişecek.

**Emin olamadığım.** Kural açık ama **veri yok**: sistemde okul müdürünün ya da
il millî eğitim müdürünün adı tutulmuyor ve e-Okul'dan da gelmiyor.

**Sorular.**

1. Bu adlar nereden gelecek? **(a)** Yönetim ekranından il il / okul okul elle
   girilecek (81 il + binlerce okul), **(b)** belge üretilirken kullanıcı elle
   yazacak, **(c)** ad hiç yazılmayacak, yalnızca **unvan** basılacak
   ("Okul Müdürü" + boş imza yeri)?
2. **Ulusal** kapsamlı etkinliklerde kim imzalayacak? (İstekte yalnızca okul ve
   il var.)
3. Islak imza mı bekleniyor (belge yazdırılıp imzalanacak), yoksa **imza
   görüntüsü** mü basılacak? Görüntü basılacaksa imza görselleri sisteme
   yüklenmeli — bu ayrı ve hassas bir iş.

**Cevap gelmezse varsayımım:** (c) — yalnızca unvan basılır, altında ıslak imza
için boş alan bırakılır. Ulusal kapsamda "YEĞİTEK Genel Müdürü" yazılır.
**Yanlışsa etkisi:** Orta — (a) seçilirse ayrı bir veri girişi ekranı gerekir.


### Gelen cevap (6 Ağustos 2026)

> "elle yazılsın yani sistemden anlık giriş olsun, eskiden oturum kişisinden
> geliyordu"

Seçenek **(b)** uygulandı.

- **Ad, belge üretilirken elle giriliyor** ve alan ZORUNLU: imzasız bir katılım
  belgesi resmî olarak işe yaramaz; sessizce üretmek, farkına varılmadan imzasız
  belge dağıtılmasına yol açardı.
- **Unvan kapsamdan türetiliyor:** OKUL → "Okul Müdürü", IL → "İl Millî Eğitim
  Müdürü". Alan düzenlenebilir (müdür yardımcısı gibi durumlar için).
- **ULUSAL kapsamda öneri üretilmiyor:** istekte belirtilmedi ve uydurmak resmî
  bir belgeye olmayan bir makam yazmak olurdu; orada düzenleyen birim geliyor ve
  elle değiştirilebiliyor.
- Islak imza varsayımı sürüyor: imza görseli yüklenmiyor, altında boş alan
  bırakılıyor.
- Yan etki: kişi başına "hızlı belge" bağlantıları düğmeye dönüştü — `<a href>`
  bir form alanını taşıyamıyor, bağlantı kalsaydı tekil belgeler imzasız
  üretilmeye çalışılır ve reddedilirdi.
