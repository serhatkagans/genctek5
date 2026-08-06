# Kalanlar

5 Ağustos 2026 istek listesinden **geriye kalanlar**. Kaynak:
[`YAPILACAKLAR.md`](YAPILACAKLAR.md) (planın kendisi) ve
[`SORULAR.md`](SORULAR.md) (açık sorular). Bu dosya onların özeti — ayrıntı
oralarda, burada yalnızca "ne kaldı, neden bekliyor" var.

> **6 Ağustos 2026 · uçtan uca denetim:** biten 25 maddenin tamamı çalışan
> uygulamada beş rolle gezilerek sınandı — **64 kontrol, 64'ü geçti.** Çıkan
> tek kusur (`/panel/dis-basvurular` yetkisiz kullanıcıya "Beklenmeyen bir
> hata" diyordu) düzeltildi. Ayrıntı: `YAPILACAKLAR.md` · "Uçtan uca denetim".

**Durum:** 27 maddenin **25'i bitti**, **2'si duruyor: C4 ve G.**
**Öğretmen tarafı (J1–J5), profil bölümünün tamamı (D1–D8), Algoritmam (E) ve
GençTek Market (I) bitti.** Kalan iki madde de cevap bekliyor. Üç bitmiş
maddenin artığı var: D5'ten **ürün taahhütnamesi** (→ S12), E'den **dört
ölçeğin madde metni** (→ S16), I'den **DİLİM'in tanımı** (→ S22).

---

## Biten

| # | Madde | Tarih |
|---|---|---|
| A1 | EBA dışı giriş (mezun, paydaş) + proje yöneticisi onayı | 5 Ağustos |
| C3 | Girişte profil ekranı | 5 Ağustos |
| F | Danışman seçimi ekranı (notlar 6 Ağustos'ta tamamlandı) | 5–6 Ağustos |
| B1 | "Faaliyet" → "Etkinlik" (arayüz + URL) | 5 Ağustos |
| D1 | "GençTek Yolculuğum" bölümü | 5 Ağustos |
| D2 | "Bilişim Yolculuğum" bölümü | 5 Ağustos |
| D8 | "Yeni kayıt ekle" düzeltmeleri | 5 Ağustos |
| A2 | KVKK/belge akışı menüden kaldırıldı, profile taşındı | 5 Ağustos |
| C1 | Panelim: çalışma grubu + danışman seçimi + katkı girişi | 5 Ağustos |
| J2 | Okul Temsilcisi ataması → Öğrencilerim | 5 Ağustos |
| J4 | Paydaş envanteri koordinatörde, bağlama etkinlik detayında | 5 Ağustos |
| B3 | Menüden beş sekme kaldırıldı (J3 hariç) | 5 Ağustos |
| B2 | Sekme ve başlık adları | 5–6 Ağustos |
| H | Talep panosu → "Pano" + dört talep türü | 6 Ağustos |
| J1 | Tek öğrencinin danışmanlığını bırakma (gerekçeli) | 6 Ağustos |
| J3 | Raporlar + Belge Oluştur → Etkinlikler'e | 6 Ağustos |
| J5 | Katılım belgesinde imza makamı | 6 Ağustos |
| C2 | "Başvuru Açık" şeridi → "Mesajın var" | 6 Ağustos |
| D7 | Seferlerim: nişanlar profile + beş seviye | 6 Ağustos |
| D3 | Sertifikalarım | 6 Ağustos |
| D4 | Topluluklarım | 6 Ağustos |
| D5 | Ürün formu + "markette paylaş" (taahhütname hariç) | 6 Ağustos |
| D6 | Rotam | 6 Ağustos |
| **E** | **Algoritmam** — motor + üç envanter (dört ölçeğin içeriği hariç) | 6 Ağustos |
| **I** | **GençTek Market** — "Ürünlerim" sekmesi, süzgeçler, sayaçlar (DİLİM hariç) | 6 Ağustos |

---

## Yapılanlardan artakalan küçük sorular

Ayrıntı `YAPILACAKLAR.md`'deki "YAPILDI" bölümlerinde; buraya yalnızca
**cevap bekleyen artıklar** yazıldı:

| # | Kalan | Ne gerekiyor |
|---|---|---|
| **E** | Dört yayımlanmış ölçeğin madde metni | Teknoloji Liderliği, Dick Kişilik, EPAI, ENTCOM. Madde metinleri + puanlama anahtarı + kullanım izni hak sahibinden gelmeli. **Maddeleri uydurulmadı**; ekranda "içeriği bekleniyor" diye duruyorlar. Geldiğinde tek iş `lib/envanter/tanimlar.ts`'i doldurmak (→ S16) |
| **E** | "Dick Kişilik Envanteri" adı | Literatürde bu adla yaygın bir envanter yok. DISC mi? Hangi sürüm? (→ S16) |
| **I** | "DİLİM" nedir? | Süzgeç listede duruyor ama seçilemiyor, nedeni ekranda yazılı. Bir rol değil kategori gibi duruyor; hangi kategoriler, kim atıyor, zorunlu mu bilinmeden ürüne kategori alanı açılamaz. Uydurma kategori sonradan elle temizlenecek veri üretirdi (→ S22) |
| **I** | "İndirilme sayısı" ne saysın? | Ürünlerde dosya yükleme kapsam dışı — indirilecek dosya yok. **Bağlantıya gidilmesi** sayılıyor ve ekranda "Bağlantı ziyareti" diye yazıyor, "indirilme" denmiyor. Başka bir şey sayılacaksa söyleyin (→ S22) |
| **D5** | Ürün taahhütnamesi metni | Onay altyapısı hazır, metin bekleniyor (→ S12) |
| **B1** | KVKK belgelerindeki "faaliyet" sözcüğü | Bilerek dokunulmadı: metin koddaki varsayılandan geliyor ve yeniden onay ayarın güncelleme tarihine bakıyor — sözcüğü değiştirmek, kimseye yeniden sormadan onaylanmış metni değiştirirdi |

**Yürürlükteki varsayımlar:**

- **E** — envanter sonuçları **yalnızca kişinin kendisine** açık; danışman,
  koordinatör ve merkez göremiyor, erişim loguna da yazılmıyor. Danışmanın
  görmesi ya da toplu istatistik istenirse bu ayrı bir karardır ve **açık rıza
  metnini de değiştirir** (→ S16).
- **D8** — destekleyici belgelerin tip ve boyut sınırları etkinlik ekleriyle
  ortak bırakıldı (ikisi de aynı türde içerik taşıyor). Ayrı sınır isterseniz
  değişecek tek yer `lib/kazanim/ek.ts`.
- **S5** — "Katkılarım" sekmesi duruyor ve veri **giriş** ekranı; görüntüleme
  profilde. Onaylarsanız listeden düşer.
- **S2** — mezun ve paydaştan aydınlatma + açık rıza istendi, gizlilik
  sözleşmesi istenmedi. Değiştirmek ucuz — eşleme tek dosyada.
- **H** — dört talep türü sabit liste; beşinci tür gerekirse migration gerekir.
  Sponsor ilanını herkes açabiliyor (pano dışarı kapalı olduğu için kısıtlamanın
  gerekçesi kalmadı).

---

## Cevap bekleyenler

### C. Öğrenci paneli düzeni

| # | Madde | Büyüklük | Bekleyen |
|---|---|---|---|
| C4 | Profil bölümleri için düzenleme/ekleme/silme ekranı | M | **S9** |

### D. Profil içeriği

**Tamamı bitti (D1–D8).** Tek eksik, D5'in ürün taahhütnamesi: onay altyapısı
hazır, **metin sizden bekleniyor** (→ S12).

### E. Algoritmam

**Modül bitti.** Üç envanter çözülebiliyor; dördü **içerik bekliyor** (→ S16).
Kod tarafında yapılacak bir şey kalmadı — tanım dosyasına metin girilmesi
yeterli.

### I. GençTek Market

**Modül bitti.** "Ürünlerim" sekmesi, dört çalışan süzgeç, ürün detayı ve iki
sayaç hazır. İki artık: **DİLİM'in tanımı** ve **moderasyon kararı** (→ S22,
S12). Bugünkü koruma, vitrinin ekosistem içine kapalı olması — ürünleri
yalnızca sisteme girmiş kullanıcılar görüyor.

### Büyük modüller

| # | Madde | Büyüklük | Bekleyen |
|---|---|---|---|
| **G** | Mesajlar ve gruplar | L | **S19, S20** |

---

## Bekleyen sorular

**8 soru açık**, ikisi (S16 ve S22) kısmen cevaplandı — o iki madde yapıldı,
yalnızca artıkları bekliyor. Cevaplanan on yedisi A1, C3, A2, C1, B2, B3, C2,
D3, D4, D5, D6, D7, H, E, I ve J1–J5'i açtı.

### 🔴 Önce bunlar — mimari/veri modeli kararı bunlara bağlı

| # | Soru | Engellediği |
|---|---|---|
| S2 | Mezun ve paydaştan hangi onay belgeleri istenecek? | A1 (varsayımla uygulandı) |

> **S2 fiilen cevaplandı sayılabilir:** varsayımla uygulandı (mezun ve paydaş →
> aydınlatma + açık rıza; gizlilik sözleşmesi istenmedi). Değiştirmek ucuz —
> eşleme tek dosyada. Onaylarsanız listeden düşer.

### 🟡 Yakında — ilgili madde başlamadan gerekli

| # | Soru | Engellediği |
|---|---|---|
| S16 | Algoritmam: dört ölçeğin madde metni + izin; "Dick" adı; sonucu kim görecek | E'nin kalanı |
| S22 | Market: "DİLİM" nedir? | I'nin kalanı |
| S9 | "Profil bölümlerinin düzenleme sayfası" ne demek? | C4 |
| S12 | Ürün taahhütnamesi metni ve markette moderasyon | D5'in kalanı, I |
| S19 | Grup sohbetlerini kim okuyabilecek, kim üye ekleyecek? | G |

### 🟢 Sonra — küçük ya da geç sıradaki maddeler

| # | Soru | Engellediği |
|---|---|---|
| S5 | "Katkılarım" hem sekme hem profil bölümü mü? *(varsayımla ilerlendi)* | — |
| S20 | Ekip arkadaşlığı ve takım grupları *(istekte de soru işaretli)* | G |

---

## Kod yazılmayacaklar

Kayıt altına alındı, sonraki faza bırakıldı:

- **Yapay zekâ ile öz değerlendirme** — "ileride" (E'nin devamı)
- **Ürün dosyası yükleme / program paylaşımı** — "şimdilik sadece tanıtım
  yapsınlar". Yükleme açılırsa zararlı yazılım taraması ve dağıtım sorumluluğu
  ayrıca konuşulmalı
- **Takım/ekip grubu kurma** — istekte soru işaretiyle yazılmış
- **Ürün markette moderasyon akışı** — S12'nin cevabına bağlı
- **Mezun–öğrenci mentor eşleştirmesi** — mezunun *girişi* yapıldı, eşleştirme
  modülü kapsam dışı

---

## Önerilen sıra

1. ~~**F**~~ ✅
2. ~~**B1**~~ ✅ — sonraki maddelerin metinleri artık "etkinlik" diye yazılmalı
3. ~~**D1, D2, D8**~~ ✅
4. ~~**B2, B3, C1**~~ ✅ (+ J2, J4) — menü ve panel düzeni birlikte yapıldı
5. ~~**H**~~ ✅ — Pano ve talep türleri
6. ~~**J1–J5**~~ ✅ — öğretmen tarafı tamamlandı
7. ~~**C2**~~ ✅ — sarı şerit artık "Mesajın var"
8. ~~**D3–D7**~~ ✅ — profil bölümleri tamamlandı
9. ~~**E**~~ ✅ — Algoritmam (dört ölçeğin içeriği bekliyor)
10. ~~**I**~~ ✅ — GençTek Market (DİLİM'in tanımı bekliyor)
11. **C4** — profil bölümlerinin düzenleme ekranı (S9 ile açılır)
12. **G** — son büyük modül

---

## En hızlı yol

Kalan 2 madde: **C4 ve G.** Ayrıca üç bitmiş maddenin artığı var.
En verimli dört cevap:

| Cevap | Açılan |
|---|---|
| **S16** — dört ölçeğin madde metni + izin | E'nin kalanı; kod yazılmayacak, yalnızca tanım dosyası dolacak |
| **S22** — "DİLİM" nedir? | I'nin kalanı; tek süzgeç eklenecek |
| **S19** — grup sohbetlerini kim okuyacak, kim üye ekleyecek? | G |
| **S9** — "profil bölümleri için düzenleme sayfası" ne demek? | C4 |

**S12** (ürün taahhütnamesi + markette moderasyon) hem D5'i hem I'yi
tamamlıyor: bugün markete çıkan ürünü kimse onaylamıyor ve kullanıcıların çoğu
18 yaş altı.
