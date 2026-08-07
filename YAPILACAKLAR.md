# Yapılacaklar

5–6 Ağustos 2026 tarihli istek listesinin planı.

**Durum: 27 maddenin 26'sı yapıldı ve arşive alındı.**
Bitenlerin gerekçeleri [`YAPILACAKLAR-ARSIV.md`](YAPILACAKLAR-ARSIV.md)
dosyasında — bu dosya yalnızca **açık** maddeleri taşır.

**Kalan 1 madde: G.** Cevap bekliyor; kod tarafında engel yok.

7 Ağustos'ta ikinci bir istek dalgası geldi ve uygulandı (menü küçültme,
bölüm düzeni, mentörlük, giriş kapısı) — ayrıntı aşağıda **"7 Ağustos eki —
ikinci tur"** başlığında; engelli kalan dört madde de orada.

**C4, 7 Ağustos 2026'da tamamlandı** (S9 cevaplandı): profil salt okunur oldu,
düzenlemenin tamamı Panelim'e taşındı. Aynı gün üç ek istek de yapıldı — bkz.
aşağıdaki "7 Ağustos eki".

Anlaşılmayan ya da çelişkili bulduğum noktalar **[`SORULAR.md`](SORULAR.md)**
dosyasında soru–cevap biçiminde duruyor. Aşağıdaki maddelerde `→ S9` gibi
göndermeler o dosyadaki soru numaralarıdır. **Cevap gelmeden başlanmaması
gereken maddeler ⛔ ile işaretlendi.**

Bir önceki liste (31 Temmuz, `duzeltmeler.txt`) da aynı arşivde.

---

## Nasıl okunmalı

Her madde şu başlıkları taşır:

- **İstek** — talebin kendi ifadesi (kısaltılmadan, tırnak içinde).
- **Bugün ne var** — mevcut durum; hangi dosya/ekran değişecek.
- **Yapılacak** — adımlar.
- **Büyüklük** — XS / S / M / L / XL. Ölçü *iş miktarı* değil **risk ve
  yayılım**: bir metin değişikliği XS'tir, veri modeline dokunan her şey en az
  M'dir çünkü migration + geri alma + belge güncellemesi getirir.
- **Not** — bağımlılık, risk, çelişki.

---

## Özet

| # | Madde | Büyüklük | Durum |
|---|---|---|---|
| G | Mesajlar ve gruplar | L | ⛔ **S19, S20** |
| K | Sonraki faza bırakılanlar | — | kod yazılmayacak |

**Arşivdekiler:** A1, A2, B1, B2, B3, C1, C2, C3, **C4**, D1–D8, E, F, H, I, J1–J5.

### Bitmiş maddelerin açık artıkları

Maddeler tamam, ama üçünün **metin/karar** eksiği var — kod tarafında yapılacak
bir şey yok:

| Nereden | Eksik | Soru |
|---|---|---|
| D5 | Ürün taahhütnamesinin metni | S12 |
| E | Dört yayımlanmış ölçeğin madde metni + kullanım izni | S16 |
| I | "DİLİM" ne demek | S22 |

---

## C. Öğrenci paneli düzeni

### C4 — Profil bölümleri için düzenleme ekranı ✅ YAPILDI (7 Ağustos 2026)

> **İstek:** "Panelde profil kısmında gözükecek bölümlerin düzenleme/ekleme/silme
> sayfası olacak"

Sonraki istek okumayı netleştirdi: *"foto ekleme değiştirme panelden yapılsın,
profil kısmında sadece foto görünsün, iletişim bilgileri düzenleme panel
sekmesine taşınsın, profilden sadece görünsün, profildeki danışman ekleme
düzenleme panel kısmına taşınsın, profilde sadece danışmanın adı gözüksün,
GençTek Yolculuğum Bilişim Yolculuğum ve Rotam bölümlerinin sadece bilgileri
profilde görünsün, bilgi girişleri ve düzenleme panelden yapılsın."*

**Yapıldı.** Profil (`/panel/profil`) **salt okunur** oldu; düzenlemenin tamamı
Panelim (`/panel`) içindeki katlanabilir bölümlere taşındı: `#fotografim`,
`#iletisim-bilgilerim`, `#danismanim`, `#danismanligim`, `#kayitlarim`, `#cvm`,
`#rotam`. Kapsam öğrenciyle sınırlı tutulmadı, **öğretmen tarafına da**
uygulandı.

**Tek istisna KVKK onayıdır:** onay bir profil bilgisi değil hukuki bir
beyandır ve metnin okunduğu yerde verilmelidir; şerit ve eski `/panel/kvkk`
adresi de o çapaya iniyor.

İki yüzey **aynı bileşenlerden** basılıyor; düzenleme yetenekleri isteğe bağlı
eylem proplarıdır (eylem verilmezse form hiç basılmaz). Ayrıntı: `README.md` ·
"Profil gösterir, Panelim düzenler".

---

## 7 Ağustos eki — üç ek istek ✅ YAPILDI

### 1. "Beyan ettiği GençTek etkinlikleri" kaldırıldı

Profildeki bölüm kalktı ve `GENCTEK_ETKINLIGI` kayıt türü **kapatıldı** (yeni
kayıt kabul etmiyor, sekme listesinde yok). Tip enum'dan silinmedi ve kayıtlar
temizlenmedi: girilmiş beyanlar kullanıcının verisidir. Eski kayıtlar Panelim'in
"Girdiğim kayıtlar" bölümünde, neden profilde görünmediklerini açıklayan bir
notla birlikte duruyor ve silinebiliyor.

### 2. Katılım artık üretilen belgeden düşüyor

> **İstek:** "Düzenlenen GençTek Etkinliği sonunda ismine belge oluşturulan
> öğrencilerin profiline katıldığı etkinlik düşecek"

**Veri modeline dokundu (M).** Belge bugüne kadar hiçbir yerde kalıcı değildi;
izi yalnızca erişim kaydının serbest metnindeydi ve o kayıtlar KVKK saklama
süresiyle siliniyor. `faaliyet_belgesi` tablosu açıldı — belgenin **metnini
değil, üretildiği olgusunu** tutuyor.

**Geçiş tarihi var** (`BELGE_TEMELLI_KATILIM_BASLANGICI`, 7 Ağustos 2026): o
tarihten öncesi için "seçilmiş olmak" saymaya devam ediyor. Kural geriye
işletilseydi bugün profilinde katılım görünen herkesin listesi boşalır, o
listeden hesaplanan rozetler ve "Seferlerim" seviyeleri geri alınırdı.

Tekil belge üretimi artık **katılımcı kimliğiyle** çalışıyor (serbest metin adla
değil): aynı adlı iki öğrencide katılım yanlış kişiye düşerdi.

### 3. Çalışma grubu notu kaldırıldı

"İstediğiniz kadar grup seçebilirsiniz; sayı sınırı yoktur" cümlesi iki yerden
de (Panelim bölümü ve `/panel/calisma-gruplari`) kaldırıldı.

---

## G. Mesajlar ve gruplar ⛔

> **İstek:** "Sekme ismi 'Bağlantılarım' olarak değiştirilecek. Yazışmalar
> 'mesajlar' olarak değiştirilecek. Sohbet Kategorileri eklenecek (Çalışma
> Grupları, Temsilci Grupları, Okul Grupları). Bağlantılarım? Ekip arkadaşları
> belirlenebilecek. Birbirini eklme? GM / takım grubu oluşturulabilecek mi?"

**Bugün ne var.** Yazışma **iki kişi arasında**: `yazisma` + `mesaj`. Grup
sohbeti yok. Ayrıca yürürlükte açık bir kural var (`domain-rules.md`,
aydınlatma metni madde 2.1): **gizli kanal yoktur**, her yazışma danışman,
koordinatör ve proje yöneticisince okunabilir.

**Yapılacak.** Adlandırmalar S; **grup sohbeti L**. Grup sohbeti yeni bir veri
modeli (grup, üyelik, mesaj) ve daha önemlisi yeni bir **gözetim** sorusu
getiriyor: 30 kişilik bir okul grubunu kim okuyabilecek, kim üye ekleyecek,
üyelikten çıkarma var mı (→ **S19**).

İsteğin son iki satırı zaten soru işaretli ("Birbirini eklme? GM", "takım grubu
oluşturulabilecek mi?"). Bunlar plana alınmadı, **S20**'ye taşındı.

**Büyüklük: L.**

---

## 7 Ağustos eki — ikinci tur ✅ YAPILDI

Aynı gün gelen ikinci istek dalgası. Hepsi uygulandı; engelli kalanlar en altta.

### Menü altı sekmeye indi

> **İstek:** "menü sayısı azalacak" + Profil / Panel / Etkinlikler /
> Bağlantılarım / Pano / Market listeleri

Kalkanlar: **Katkılarım** (içeriği profile taşındı), **Algoritmam** (Panel'de
"Özdeğerlendirme Envanterleri" bölümü), **İletişim Onayları** (Bağlantılarım
sayfasının başında). Yeniden adlandırılanlar: Panelim → Panel, Profilim →
Profil, Ürünlerim → Market.

**Yönetim sekmeleri kaldı** (karar): koordinatör ve merkez Öğrenciler,
Öğretmenler, Paydaşlar, Görev Rolleri, İl Dışı Başvurular ve merkez ekranlarını
görmeye devam ediyor. Kaldırılsaydı koordinatörün ilindeki öğrenciye ulaşacağı
hiçbir giriş kalmazdı. Kaldırılan hiçbir sayfa **silinmedi**.

### Profil ve Panel bölümleri yeniden düzenlendi

Profil: Fotoğraf · Kimlik · İletişim · Danışman · **GençTek Yolculuğum**
(Görevlerim → Verdiğim Akran Eğitimleri → Katıldığım Etkinlikler → Çalışma
Gruplarım) · **Bilişim Yolculuğum** (Ürünlerim / Deneyimlerim /
Topluluklarım-Ekiplerim) · Katkı Nişanlarım · Rotam · Özgeçmiş.

"Seferlerim" → **Katkı Nişanlarım**. Yedi kazanım tipi üç başlık altında
gruplandı; tipler birleştirilmedi, yalnızca gruplandı (alan kuralları tipe
bağlı). "Yeni Kayıt Ekle" sekmeleri aynı üç grupla hizalandı.

### Çalışma Grubu Yöneticisi (yeni görev rolü)

`CALISMA_GRUBU_YONETICISI`. Diğer üçünden farkı kapsamının bir YER değil bir
**çalışma grubu** olması. Atama il koordinatöründe; tekillik grup başına, kişi
başına değil. Bugün ek yetki getirmiyor, unvan.

### Pano türleri

Destek talebi (eski Teknik destek) · **Mentöre sor (yeni)** · Genel (eski
Duyuru) · Ekip arkadaşı arama. `SPONSOR` kapatılmadı — açılmış ilanları türsüz
bırakmamak için listede.

### Özgeçmiş tarayıcıda açılıyor

PDF artık `inline` geliyor ve bağlantı yeni sekmede açılıyor. doc/docx yine
iniyor (tarayıcı gösteremiyor ve `inline` bazı tarayıcılarda dosyayı adsız
indiriyor). `inline` açıldığı için rotaya `X-Content-Type-Options: nosniff`
eklendi.

### Mentörlük

> **İstek:** "Öğretmen hesabında 'mentör başvurusu yap' bölümü ekleyelim…
> yani öğretmen mentör olabilsin" + "Paydaş/Mentör başvurusu tek bir formdan
> yapılacak"

Tek kayıt (`mentorluk`), iki giriş yolu: içeriden Panel'den (il koordinatörü
**ya da** proje yöneticisi onaylar), dışarıdan başvuru formundan (proje
yöneticisi başvuruyu onayladığı anda mentörlük de açılır). Çoklu çalışma grubu
seçimi + serbest konular. Öğrenci mentör olamaz. Erişim panodaki "Mentöre sor"
ilanı üzerinden.

### Giriş kapısı

Açılış ekranı: **EBA ile Giriş Yap** + **E-Devlet ile Giriş** ("Paydaş/Mentör
girişleri için tıklayınız"). Başvuru formu tek; içinde Mezun / Paydaş
temsilcisi / Mentör seçimi ve mezun-paydaş için "ayrıca mentörlük yapmak
istiyorum" kutusu. `MEZUN` türü korundu.

---

## 7 Ağustos ekinden ENGELLİ kalanlar ⛔

| # | Madde | Neden bekliyor |
|---|---|---|
| **E-Devlet entegrasyonu** | Düğme ve kapı hazır, gerçek SSO yazılmadı | e-Devlet Kapısı **kurum başvurusu**, **test ortamı erişimi** ve **istemci sertifikası** gerekiyor; hiçbiri elde değil. EBA SSO da aynı sebeple bekliyor (→ **S26**) |
| **Bağlantılarım › Sohbet** | Grup sohbeti yok | G maddesi · **S19, S20** |
| **Market › Taahhütname metni** | Bölüm var, metin yok | **S12** |
| **Akran eğitimi öğretmen onayı** | Kayıt hâlâ beyan | Karar gereği sonraki işe bırakıldı; onay kuyruğu + bildirim gerektiriyor (M/L) |

---

## K. Sonraki faza bırakılanlar

İstek listesinde açıkça "ileride" / "şimdilik" denen ya da ön koşulu
tamamlanmamış olanlar. **Kayıt altına alındı, kod yazılmayacak:**

- **Yapay zekâ ile öz değerlendirme** — "ileride" (E maddesinin devamı).
- **Ürün dosyası yükleme / program paylaşımı** — "Şimdilik sadece tanıtım
  yapsınlar" (D5'in 2. seçeneği). Yükleme açıldığında zararlı yazılım taraması
  ve dağıtım sorumluluğu ayrıca konuşulmalı.
- **Takım/ekip grubu kurma** — istekte soru işaretiyle yazılmış (G · S20).
- **Ürün markette moderasyon akışı** — S12'nin cevabına bağlı.
- **Mezun–öğrenci mentor eşleştirmesi** — mezunun *girişi* yapıldı (A1),
  eşleştirme modülü kapsam dışı.

---

## Önerilen sıra

1. ~~**C4**~~ ✅ — 7 Ağustos 2026'da yapıldı.
2. **G** — son büyük modül. S19 (grup sohbetlerini kim okur, kim üye ekler) ve
   S20 (ekip/takım grupları) cevaplanmadan veri modeli kurulamaz.

**En verimli iki cevap:**

| Cevap | Açtığı |
|---|---|
| **S19** | G'nin veri modeli |
| **S16** | E'nin kalanı — kod yazılmayacak, yalnızca tanım dosyası dolacak |

---

Kalanların özeti — durum, engelleyen sorular ve en hızlı yol —
[`liste.md`](liste.md) dosyasında.
