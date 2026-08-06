# Yapılacaklar

5–6 Ağustos 2026 tarihli istek listesinin planı.

**Durum: 27 maddenin 25'i yapıldı ve arşive alındı.**
Bitenlerin gerekçeleri [`YAPILACAKLAR-ARSIV.md`](YAPILACAKLAR-ARSIV.md)
dosyasında — bu dosya yalnızca **açık** maddeleri taşır.

**Kalan 2 madde: C4 ve G.** İkisi de cevap bekliyor; kod tarafında engel yok.

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
| C4 | Profil bölümleri için düzenleme/ekleme/silme ekranı | M | ⛔ **S9** |
| G | Mesajlar ve gruplar | L | ⛔ **S19, S20** |
| K | Sonraki faza bırakılanlar | — | kod yazılmayacak |

**Arşivdekiler:** A1, A2, B1, B2, B3, C1, C2, C3, D1–D8, E, F, H, I, J1–J5.

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

### C4 — Profil bölümleri için düzenleme ekranı ⛔

> **İstek:** "Panelde profil kısmında gözükecek bölümlerin düzenleme/ekleme/silme
> sayfası olacak"

**Bugün ne var.** Profil ekranında düzenleme **satır içi**: iletişim bilgisi
formu, "Yeni kayıt ekle" kartı, CV yükleme, fotoğraf yükleme aynı sayfada.

**Yapılacak.** İsteğin iki okuması var (→ **S9**): (a) profildeki her bölüm için
ayrı bir yönetim ekranı, (b) mevcut satır içi düzenlemenin eksiklerinin
tamamlanması (özellikle **silme** — bugün bazı kayıtlarda silme yok).

D3–D7 ile birlikte tasarlanmalı: yeni bölümlerin (sertifika, topluluk, ürün,
rota) düzenleme yüzeyi de buradan çıkacak.

**Büyüklük: M.**

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

1. **C4** — S9 cevaplanınca açılır. İki okumadan hangisi olursa olsun asıl iş
   aynı: kazanım kayıtlarının **düzenleme** eylemi bugün yok (yalnızca ekle ve
   sil var), onu yazmak. Ayrı sayfa mı satır içi mi, bunu S9 belirler.
2. **G** — son büyük modül. S19 (grup sohbetlerini kim okur, kim üye ekler) ve
   S20 (ekip/takım grupları) cevaplanmadan veri modeli kurulamaz.

**En verimli üç cevap:**

| Cevap | Açtığı |
|---|---|
| **S19** | G'nin veri modeli |
| **S9** | C4 |
| **S16** | E'nin kalanı — kod yazılmayacak, yalnızca tanım dosyası dolacak |

---

Kalanların özeti — durum, engelleyen sorular ve en hızlı yol —
[`liste.md`](liste.md) dosyasında.
