# GençTek — Veri Modeli

Postgres sözdizimiyle yazıldı (veritabanı henüz sabitlenmedi — bkz. SKILL.md). Bir ORM/query builder (Prisma, Knex, Drizzle) üzerinden tanımlanması önerilir; burada verilenler şemanın mantığıdır, birebir DDL olarak kopyalanması şart değildir.

İçindekiler:
1. Referans tabloları
2. Kullanıcı ve rol
3. Danışman atama
4. Çalışma grupları
5. Öğrenci envanteri
6. Faaliyet, dosya/görsel ve yorum
7. Başvuru
8. Log ve bildirim
9. Kritik kısıtlar
10. Seed verisi

---

## 1. Referans tabloları

**il** — `il_kodu` (PK, char(2)), `ad`

**ilce** — `ilce_kodu` (PK), `il_kodu` (FK), `ad`

**kurum** — `kurum_kodu` (PK, int), `ad`, `il_kodu`, `ilce_kodu`, `okul_turu`, `aktif`

Bu üç tablo MEB kaynaklarından beslenir, uygulama içinden düzenlenmez.

---

## 2. Kullanıcı ve rol

**kullanici**
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| auth_provider_id | varchar(64), unique | Mock aşamada test kullanıcı kimliği, sonra EBA kimliği |
| ad, soyad | varchar(100) | Salt okunur |
| cinsiyet | char(1) | Salt okunur |
| kurum_kodu | int, FK | Salt okunur |
| il_kodu, ilce_kodu | char(2)/char(4) | Salt okunur |
| sinif | varchar(10), null | Öğrenci için |
| brans | varchar(100), null | Öğretmen için |
| egitim_ogretim_yili | varchar(9) | "2025-2026" |
| son_senkron_tarihi | timestamptz | Kurum kodu değişimi takibi için |
| aktif | boolean | |

**kullanici_rol**
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| kullanici_id | int, FK | |
| rol_kodu | varchar(20) | OGRENCI / DANISMAN / IL_KOORDINATOR / PROJE_YONETICISI |
| il_kodu | char(2), null | IL_KOORDINATOR için kapsam |
| kurum_kodu | int, null | DANISMAN için kapsam |
| baslangic_tarihi | timestamptz | |
| bitis_tarihi | timestamptz, null | null = aktif |
| atayan_kullanici_id | int, null, FK | |

Roller geçmişli tutulur; silme yapma, `bitis_tarihi` yaz.

**ogretmen_profil**
`kullanici_id` (PK, FK), `danisman_olmak_istiyor` (boolean), `isaretleme_tarihi`

Bu bayrak `true` olmadan öğretmen danışman seçim listesinde görünmez.

---

## 3. Danışman atama

**danisman_atama** — geçmiş tablosu, güncelleme yapma
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| ogrenci_id | int, FK | |
| danisman_kullanici_id | int, FK | Danışman öğretmen veya il koordinatörü |
| atama_tipi | varchar(20) | OGRENCI_SECTI / OTOMATIK / IL_KOORDINATOR_FALLBACK / DEVIR |
| baslangic_tarihi | timestamptz | |
| bitis_tarihi | timestamptz, null | null = aktif atama |
| kapanma_nedeni | varchar(50), null | OGRETMEN_AYRILDI / OGRENCI_OKUL_DEGISTIRDI / YENIDEN_SECIM / DEVIR / DANISMANLIK_BIRAKILDI / IL_KOORDINATORU_OLDU / OGRENCI_ISTEGI |

Devir yaparken: eski kaydın `bitis_tarihi`'ni yaz, yeni kayıt aç. Aynı öğrenci için aynı anda birden fazla `bitis_tarihi IS NULL` kaydı olamaz.

---

## 4. Çalışma grupları

**calisma_grubu** — `id`, `ad`, `sira_no`, `aktif` (boolean)

Silme yok. Kapanan grup `aktif=false`.

**ogrenci_calisma_grubu** — `ogrenci_id` (FK), `calisma_grubu_id` (FK), `secim_tarihi`, `ekleyen_kullanici_id` (FK, null). Bileşik PK.

Öğrenci başına **üst sınır yoktur**; istediği kadar grup seçebilir. Buna karşılık gelen bir sistem ayarı da tutulmaz.

`ekleyen_kullanici_id` **NULL ise seçim öğrencinin kendisine aittir**; dolu ise kaydı danışmanı, il koordinatörü ya da proje yöneticisi öğrencinin profilinden açmıştır. Alan **yetki kararında kullanılmaz** — yalnızca öğrenci "bu grubu kim ekledi" sorusunun cevabını görebilsin diye tutulur.

Öğrencinin seçim ekranı kaydı **sil-yeniden-yaz ile güncellemez, fark hesaplar**: aksi halde (a) yalnızca aktif gruplar listelendiği için pasif bir gruba ait geçmiş seçim silinir, (b) danışmanın açtığı kaydın `secim_tarihi` ve `ekleyen_kullanici_id` izi sıfırlanırdı.

---

## 4a. Etkinlik programları (Temel Etkinlik / Çalışma Grubu Etkinliği)

**temel_etkinlik_programi** — `id`, `ad` (unique), `grup` (TEMEL_ETKINLIK / CALISMA_GRUBU_ETKINLIGI), `sira_no`, `aktif`

`calisma_grubu` ile aynı mantık: liste koda gömülmez, proje yöneticisi yönetir, **silme yoktur** — kapanan program `aktif=false` yapılır, geçmiş faaliyetlerin bağlantısı korunur.

İl Etkinliği'nin burada karşılığı **yoktur**: il koordinatörü faaliyet adını serbestçe girer, sabit isim listesi tutulmaz.

---

## 5. Öğrenci envanteri

**ogrenci_profil** — `kullanici_id` (PK, FK), `eposta`, `telefon`, `aydinlatma_metni_onay_tarihi`, `cv_dosya_adi`, `cv_depolama_yolu`, `cv_mime_tipi`, `cv_boyut_bayt`, `cv_yuklenme_tarihi`

CV alanları `faaliyet_ek` ile **aynı depolama soyutlamasını** kullanır: `cv_depolama_yolu` bir anahtardır, dosya yolu değil; orijinal ad yalnızca indirirken gösterilmek üzere saklanır. Öğrenci başına **tek kayıt** tutulur — yeni yükleme eskisinin yerine geçer, sürüm arşivi tutulmaz. Alanlar birlikte dolar ya da birlikte boşalır (`ck_ogrenci_profil_cv`).

**ogrenci_gorev_rolu**
`id`, `ogrenci_id` (FK), `rol_kodu` (IL_TEMSILCISI / OKUL_TEMSILCISI), `egitim_ogretim_yili`, `il_kodu` veya `kurum_kodu`, `atayan_kullanici_id`, `atama_tarihi`

**ogrenci_kazanim** — öğrencinin kendi girdiği başarı/üretim kayıtları
`id`, `ogrenci_id`, `tip` (DIS_ETKINLIK / URUN / AKRAN_EGITIMI / YARISMA_DERECESI), `baslik`, `aciklama`, `tarih`, `baglanti_url`, `derece`, `duzenleyen`, `olusturma_tarihi`

| Alan | Not |
|---|---|
| tip | DIS_ETKINLIK: GençTek dışı ulusal/uluslararası etkinlikler · URUN: web sitesi, uygulama, oyun, film · AKRAN_EGITIMI: öğrencinin **verdiği** eğitimler · YARISMA_DERECESI: bilişim alanında derece aldığı yarışmalar (GençTek içi ve dışı) |
| derece | varchar(120), null. Serbest metin ("Türkiye 1.si", "Mansiyon") — adlandırma yarışmadan yarışmaya değiştiği için sabit liste yok. Yalnızca YARISMA_DERECESI'nde anlamlı |
| duzenleyen | varchar(200), null. Düzenleyen kurum. URUN'de anlamsızdır, o türde yazılmaz |
| olusturma_tarihi | Sıralama için zorunlu: kullanıcının girdiği `tarih` boş olabildiği için tek başına ölçüt olamıyor |

**Katıldığı GençTek etkinlikleri bu tabloda TUTULMAZ.** O liste `basvuru` (durum=SECILDI) + `faaliyet` (tarihi geçmiş, durum=AKTIF) üzerinden türetilir. Türetilebilen veriyi öğrencinin eliyle ikinci kez girmesi hem yanlış hem doğrulanamaz olurdu; aynı gerekçeyle İl/Okul Temsilcisi görevleri de buraya yazılmaz (kaynağı `ogrenci_gorev_rolu`).

> **Faz 2 (rozet sistemi) notu.** Rozet/katkı kategorileri netleşti: İl Temsilcisi, Okul Temsilcisi, verdiği akran eğitimleri, çalışma grubu yöneticiliği / organizasyon ekibi üyeliği (bu madde hâlâ belirsiz), moderatörlük yaptığı etkinlikler, derece aldığı yarışmalar (GençTek içi ve dışı). Liste mevcut `tip` değerleriyle büyük ölçüde örtüştüğü için Faz 2 açıldığında **yeni tablo açma**: bu tablonun `tip` alanını genişlet. Bazı kategorilerin (İl/Okul Temsilcisi) kaynağı zaten `ogrenci_gorev_rolu`, bazılarının (moderatörlük) kaynağı faaliyet ilişkisidir — türetilebilenler için ayrıca kayıt tutma.

---

## 6. Faaliyet, dosya/görsel ve yorum

**faaliyet**
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| ad, aciklama | text | |
| tarih | timestamptz | |
| kapsam | varchar(10) | OKUL / IL / ULUSAL — **kimin başvurabileceğini** belirler |
| etkinlik_kategorisi | varchar(30) | TEMEL_ETKINLIK / CALISMA_GRUBU_ETKINLIGI / IL_ETKINLIGI — **etkinliğin ne olduğunu** belirler. Zorunlu |
| temel_etkinlik_programi_id | int, null, FK | Yalnızca ilk iki kategoride dolu; İl Etkinliği'nde boş |
| kurum_kodu | int, null | Kapsam=OKUL ise dolu |
| il_kodu | char(2), null | Kapsam=IL ise dolu |
| kontenjan | int | Aktif başvuru sayısını sınırlar (bkz. Bölüm 7) |
| duzenleyen_kullanici_id | int, FK | |
| duzenleyen_birim | varchar(200) | |
| onay_durumu | varchar(20) | ONAY_GEREKMEZ / BEKLIYOR / ONAYLANDI / REDDEDILDI |
| basvuru_baslangic, basvuru_bitis | timestamptz | |
| durum | varchar(20) | AKTIF / IPTAL_EDILDI |
| iptal_gerekcesi | text, null | İsteğe bağlı |
| iptal_eden_kullanici_id | int, null, FK | durum=IPTAL_EDILDI ise zorunlu |
| iptal_tarihi | timestamptz, null | durum=IPTAL_EDILDI ise zorunlu |

Kapsam=ULUSAL ve düzenleyen il koordinatörü ise `onay_durumu=BEKLIYOR` ile oluşur. Diğer durumlarda `ONAY_GEREKMEZ`.

**Kapsam ve etkinlik kategorisi bağımsız iki alandır.** Her kapsam her kategoriyle birleşebilir; birini diğerinden türetme. Temel Etkinlik ve Çalışma Grubu Etkinliği'nde faaliyetin **adı serbest metin değildir**, `temel_etkinlik_programi`'ndan gelir; İl Etkinliği'nde tam tersine ad serbesttir ve program bağlantısı boş kalır (ad zaten temayı taşır).

**İptal silme değildir:** faaliyet listelerde "İptal edildi" etiketiyle kalır, mevcut yorum ve dosyalar geçmiş kaydı olarak görünür. Kapanan şey yeni başvuru ve yeni içeriktir.

**faaliyet_calisma_grubu** — `faaliyet_id`, `calisma_grubu_id`. Etiket amaçlı, başvuruyu kısıtlamaz. (Karar bekliyor.)

**faaliyet_ek** — faaliyete eklenen dosya/görsel
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| faaliyet_id | int, FK | |
| yukleyen_kullanici_id | int, FK | Yalnızca faaliyeti açan kullanıcı olabilir — uygulama katmanında kontrol et |
| dosya_adi | varchar(255) | Orijinal ad |
| depolama_yolu | text | Depolama soyutlamasının döndürdüğü anahtar/yol |
| mime_tipi | varchar(100) | |
| boyut_bayt | bigint | |
| yuklenme_tarihi | timestamptz | |
| silindi_mi | boolean, default false | Soft delete |

**yorum** — faaliyet altındaki yorumlar
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| faaliyet_id | int, FK | |
| yazan_kullanici_id | int, FK | |
| icerik | text | |
| olusturma_tarihi | timestamptz | |
| silindi_mi | boolean, default false | Soft delete — içerik gösterilmez ama kayıt kalır |
| silen_kullanici_id | int, null, FK | Log amaçlı |
| silinme_tarihi | timestamptz, null | |

Yorum listesi sorgusu her zaman `WHERE faaliyet_id = ? ORDER BY olusturma_tarihi` ile gelir; kapsam filtresi zaten faaliyet üzerinden uygulanmış olmalı (bkz. `references/permissions.md`).

---

## 7. Başvuru

**basvuru**
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| faaliyet_id | int, FK | |
| katilimci_id | int, FK | Faaliyete KATILACAK kişi; öğrenci ya da öğretmen |
| adina_basvuran_kullanici_id | int, null, FK | Dolu ise başvuruyu katılımcı adına başka biri yaptı |
| gerekce | text | Zorunlu |
| durum | varchar(20) | BEKLIYOR / SECILDI / REDDEDILDI / YEDEK / GERI_CEKILDI / IPTAL_EDILDI |
| basvuru_tarihi | timestamptz | |
| geri_cekme_tarihi | timestamptz, null | |
| degerlendiren_kullanici_id | int, null, FK | |
| degerlendirme_tarihi | timestamptz, null | |

**Katılımcı öğrenci olmak zorunda değildir.** Öğretmenler de faaliyetlere başvurur (alan adı bu yüzden `ogrenci_id` değil `katilimci_id`). Katılımcının öğrenci mi öğretmen mi olduğu **sütunda tutulmaz**, aktif rolünden okunur: kopyalanan bir tip alanı öğrenci mezun olduğunda ya da öğretmen görev değiştirdiğinde eskir.

`adina_basvuran_kullanici_id` NULL ise başvuruyu katılımcının kendisi yapmıştır; doluysa danışman öğretmen / il koordinatörü **öğrenci adına** yapmıştır. Ayrı bir "başvuru tipi" enum'u tutma: alanın dolu olması zaten vekaleten başvuru demek ve kimin yaptığını da söylüyor. `ck_basvuru_vekalet_baskasi` kısıtı kimsenin kendi adına "vekaleten" başvurmasına izin vermez.

`IPTAL_EDILDI`, faaliyet iptal edildiğinde **sistem tarafından** yazılır; öğrencinin kendi geri çekmesinden (`GERI_CEKILDI`) ayrı tutulur.

### Kontenjan modeli

Kontenjan **aktif başvuru sayısını** sınırlar, yalnızca seçilenleri değil. Aktif başvuru = `durum NOT IN ('GERI_CEKILDI','REDDEDILDI','IPTAL_EDILDI')`, yani BEKLIYOR + SECILDI + YEDEK.

- Kontenjan dolduğunda (aktif başvuru = kontenjan) yeni başvuru **kabul edilmez**; öğrenciye "kontenjan doldu" mesajı gösterilir.
- Bir başvuru reddedilir veya geri çekilirse yer **anında** açılır.
- **Sayaç tutma.** Her başvuru denemesinde canlı say:

```sql
SELECT count(*) FROM basvuru
WHERE faaliyet_id = ?
  AND durum NOT IN ('GERI_CEKILDI','REDDEDILDI','IPTAL_EDILDI');
```

Statik sayaç tutulursa red/geri çekme sonrası açılan yerler sistemde "dolu" görünmeye devam eder. Sayım, kaydın açıldığı transaction'ın **içinde** yapılmalı; aksi halde eşzamanlı iki başvuru kontenjanı aşar.

---

## 8. Log ve bildirim

**erisim_logu** — `id`, `kullanici_id`, `islem` (GORUNTULEME / DEGISIKLIK / SILME), `hedef_tip`, `hedef_id`, `tarih`, `ip_adresi`, `detay`

`hedef_tip` değerleri arasında `OGRENCI`, `OGRETMEN`, `FAALIYET`, `YORUM`, `FAALIYET_EK`, `PAYDAS`, `BILDIRIM_SABLONU` bulunur — yorum ve dosya silme işlemleri de bu tabloya yazılır (ayrı bir log tablosuna gerek yok).

**bildirim** — `id`, `kullanici_id`, `tip`, `baslik`, `icerik`, `okundu_mu`, `gonderim_kanali` (EPOSTA / SMS / SISTEM), `olusturma_tarihi`, `eposta_durumu`, `eposta_hatasi`, `sms_durumu`, `sms_hatasi`

Kopya kanallarının durumu **ayrı ayrı** izlenir (ikisi de `GonderimDurumu`: GEREKMIYOR / GONDERILDI / BASARISIZ). Biri gitmiş öbürü gitmemiş olabilir; "bildirim ulaşmadı" şikâyetinde hangi kanalın düştüğü bilinmeden bakılacak yer yoktur.

**bildirim_sablonu** — `id`, `kod`, `konu`, `govde_sablonu`, `aciklama`, `aktif`. Şablonları koda gömme; metin Yönetim ekranından düzenlenir. Kod listesi ise **kodda** yaşar (`src/lib/bildirim/sablon.ts`): şablonu tetikleyen olay uygulamadadır, tabloya elle eklenen satır kendiliğinden bildirim üretmez.

---

## 7b. Paydaş envanteri

**paydas**
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| il_kodu | char(2), FK | Kayıt ile bağlıdır; ilin koordinatörü yönetir |
| ad | varchar(250) | Boş olamaz |
| tur | PaydasTuru | UNIVERSITE / OZEL_SEKTOR / STK / KAMU_KURUMU / MESLEK_KURULUSU / BELEDIYE / DIGER |
| yetkili_kisi | varchar(150), null | |
| eposta | varchar(150), null | |
| telefon | varchar(20), null | |
| adres | text, null | |
| is_birligi_alani | text | Boş olamaz |
| notlar | text, null | |
| aktif | boolean | Silme yok; iş birliği bitince pasife alınır |
| ekleyen_kullanici_id | int, FK | |
| olusturma_tarihi / guncelleme_tarihi | timestamptz | |

Yetkili kişi, e-posta ve telefondan **en az biri** dolu olmalı (uygulama katmanında doğrulanır): ulaşılamayan paydaş, paydaş değildir. `ux_paydas_il_ad_aktif` kısmi unique index'i aynı ilde aynı adla ikinci **aktif** kaydı engeller; pasif kayıt aynı adın yeniden açılmasını engellemez, çünkü kurum gerçekten yeniden iş birliğine dönebilir.

**faaliyet_paydas** — `faaliyet_id`, `paydas_id` (bileşik PK), `katkisi`, `ekleme_tarihi`

Analiz dokümanı 4.3'teki "paydaş bilgisi (varsa)" sonuç alanının karşılığı. Paydaşın ili faaliyetin iliyle aynı olmak **zorunda değildir**: ulusal bir faaliyete başka ilden bir üniversite destek verebilir. Faaliyet silinirse bağlantı da gider (CASCADE); paydaş silinmediği için o yönde RESTRICT.

---

## 9. Kritik kısıtlar

Postgres'te partial (kısmi) unique index olarak:

```sql
-- Bir öğretmen aynı anda hem danışman hem il koordinatörü olamaz
CREATE UNIQUE INDEX ux_kullanici_rol_cakisan
ON kullanici_rol(kullanici_id)
WHERE bitis_tarihi IS NULL AND rol_kodu IN ('DANISMAN','IL_KOORDINATOR');

-- Bir öğrencinin tek aktif danışmanı olur
CREATE UNIQUE INDEX ux_danisman_atama_tek_aktif
ON danisman_atama(ogrenci_id)
WHERE bitis_tarihi IS NULL;

-- Aynı faaliyete aktif ikinci başvuru yapılamaz (geri çekilenler hariç)
CREATE UNIQUE INDEX ux_basvuru_tek_aktif
ON basvuru(faaliyet_id, ogrenci_id)
WHERE durum <> 'GERI_CEKILDI';

-- Dönem başına il/okul tekilliği
CREATE UNIQUE INDEX ux_il_temsilcisi
ON ogrenci_gorev_rolu(il_kodu, egitim_ogretim_yili)
WHERE rol_kodu = 'IL_TEMSILCISI';

CREATE UNIQUE INDEX ux_okul_temsilcisi
ON ogrenci_gorev_rolu(kurum_kodu, egitim_ogretim_yili)
WHERE rol_kodu = 'OKUL_TEMSILCISI';
```

CHECK kısıtı olarak:

```sql
-- Etkinlik kategorisi ile program bağlantısı tutarlı olmalı
ALTER TABLE faaliyet ADD CONSTRAINT ck_faaliyet_etkinlik_kategorisi
CHECK (
  (etkinlik_kategorisi = 'IL_ETKINLIGI' AND temel_etkinlik_programi_id IS NULL)
  OR (etkinlik_kategorisi <> 'IL_ETKINLIGI' AND temel_etkinlik_programi_id IS NOT NULL)
);

-- İptal izi: "kim ne zaman iptal etti" kaybolmamalı
ALTER TABLE faaliyet ADD CONSTRAINT ck_faaliyet_iptal_izi
CHECK (
  (durum = 'AKTIF' AND iptal_eden_kullanici_id IS NULL AND iptal_tarihi IS NULL)
  OR (durum = 'IPTAL_EDILDI' AND iptal_eden_kullanici_id IS NOT NULL AND iptal_tarihi IS NOT NULL)
);

-- CV alanları birlikte dolar ya da birlikte boşalır. Kısmi dolu satır
-- "dosyası olmayan CV" demek olurdu; indirme endpoint'i sessizce 404 döndürüp
-- hatayı gizlerdi.
ALTER TABLE ogrenci_profil ADD CONSTRAINT ck_ogrenci_profil_cv
CHECK (
  (cv_depolama_yolu IS NULL AND cv_dosya_adi IS NULL AND cv_mime_tipi IS NULL
   AND cv_boyut_bayt IS NULL AND cv_yuklenme_tarihi IS NULL)
  OR (cv_depolama_yolu IS NOT NULL AND cv_dosya_adi IS NOT NULL AND cv_mime_tipi IS NOT NULL
      AND cv_boyut_bayt IS NOT NULL AND cv_yuklenme_tarihi IS NOT NULL)
);
```

Programın **doğru gruptan** olduğu (ör. Temel Etkinlik kategorisine Çalışma Grubu Etkinliği programı bağlanmaması) CHECK ile tutulamaz — iki tabloya birden bakması gerekir. O kontrol uygulama katmanındadır (`etkinlikKategorisiDogrula`).

Farklı bir veritabanına geçilirse: MySQL'de partial unique index native desteklenmez — generated column + unique index ile taklit edilir; Oracle'da function-based unique index kullanılır. ORM kullanıyorsan bu kısıtları migration dosyalarında saklı tut, uygulama koduna güvenme.

---

## 10. Seed verisi

`calisma_grubu` tablosu şu 12 kayıtla başlar (`sira_no` bu sırayla):

Oyun Tasarımı · Siber Güvenlik · Bilgisayar Olimpiyatları · Mobil Programlama · Web Programlama · Havacılık Sistemleri · Robotik · Yapay Zekâ · E-Ticaret ve E-İhracat · Dijital Sanatlar ve İçerik Geliştirme · Açık Kaynak · Espor

`temel_etkinlik_programi` tablosunun başlangıç listesi (tam liste geldiğinde genişletilecek):

- **Temel Etkinlik:** Genç Gölge · Sahne Senin · G2S Genç Sektör Buluşmaları · Sınır Ötesi (Beyond The Borders) · Öğrenci Forumu · Hack The Idea · Akran Öğretimi · Dijital Yürüyüş STEM · Oyunun e Hâli · Tek Maraton · Misafir Öğretmenlik/Öğrencilik · GençTek Zirvesi
- **Çalışma Grubu Etkinliği:** EğitiJAM · Capture The Flag (Bayrağı Yakala) · Mobil Uygulama Geliştirme Yarışması · Teknik Gezi · Master Tek · E-Ticaret Ideathonu

`il`, `ilce`, `kurum` tabloları MEB kaynaklarından yüklenir; migration içine gömme.

Mock kimlik doğrulama aşaması için önerilen test kullanıcı seti: en az 2 farklı okuldan öğrenci (biri danışmanlı, biri danışmansız okul), aynı okulda 2 danışman adayı öğretmen (seçim ekranını test etmek için), 1 il koordinatörü, 1 proje yöneticisi.
