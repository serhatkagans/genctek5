# GençTek Bilgi Sistemi

MEB YEĞİTEK GençTek ekosisteminin öğrenci ve danışman öğretmen envanterini tutan,
çalışma grubu bazlı izleme yapan ve faaliyet başvuru/değerlendirme süreçlerini
yürüten bilgi sistemi.

İş kuralları `SKILL.md`, `domain-rules.md`, `data-model.md` ve `permissions.md`
dosyalarında tanımlıdır. Kod yazmadan önce ilgili bölüm okunmalıdır; kurallar
koddan türetilemez.

## Teknoloji

| Katman | Seçim | Gerekçe |
|---|---|---|
| Çalışma zamanı | Node.js 24 | Skill'de sabit |
| Çerçeve | Next.js 16 (App Router) + TypeScript | Tek süreç, VPS'te tek `npm start` ile çalışır |
| Veritabanı | PostgreSQL | Kısmi (partial) unique index'leri yerel destekler |
| ORM | Prisma 7 | Veritabanı değişirse geçiş maliyetini düşürür |
| Arayüz | Tailwind CSS 4 | — |
| Test | Jest (birim) + duman testi scripti | Kritik iş kuralları için |

Barındırma şimdilik kendi VPS sunucunuzdadır. Bakanlık sunucusuna geçiş ileride
konuşulacağı için mimari bu kaygıyla karmaşıklaştırılmamıştır; geçişte etkilenecek
iki nokta (veritabanı ve dosya depolama) soyutlama arkasındadır.

## Kurulum

```bash
npm install
cp .env.example .env      # değerleri doldurun
```

### Veritabanı — yerel geliştirme

Docker veya kurulu bir PostgreSQL yoksa Prisma'nın kendi geliştirme sunucusu
yeterlidir:

```bash
npx prisma dev            # ayrı bir terminalde açık kalmalı
```

Verdiği `DATABASE_URL` değerini `.env` dosyasına yazın. Ardından:

```bash
npm run db:deploy         # şemayı ve kısıtları uygular
npm run db:seed           # referans veriler + başlangıç yöneticisi
npm run dev               # http://localhost:3000
```

### VPS dağıtımı

Sunucu kurulumunun tamamı ayrı bir rehberdedir: **[`DAGITIM.md`](DAGITIM.md)** —
AlmaLinux/Rocky 9 üzerinde nginx ters vekil, systemd servisi, Let's Encrypt,
gecelik senkron zamanlayıcısı, yedekleme ve doğrulama kontrol listesi.

Hazır dosyalar `dagitim/` altındadır:

| Dosya | İşlev |
|---|---|
| `genctek.service` | Uygulama servisi (sıkılaştırılmış, yalnızca 127.0.0.1 dinler) |
| `genctek-senkron.service` / `.timer` | Gecelik danışman senkronu |
| `nginx-genctek.conf` | Ters vekil; gerçek istemci IP'sini erişim loguna taşır |
| `guncelle.sh` | Sürüm güncelleme: derle → migration → yeniden başlat → sağlık kontrolü |
| `yedek.sh` | Veritabanı + yüklenen dosya yedeği |

Kısa hâli: `git clone` → `.env` doldur → `npm ci && npm run build` →
`prisma migrate deploy` → `db:seed` → systemd + nginx + certbot.

## Komutlar

| Komut | İşlev |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Üretim derlemesi ve sunucu |
| `npm test` | Birim testler (287 test) |
| `npm run test:duman` | Gerçek veritabanında uçtan uca doğrulama (40 kontrol) |
| `npm run test:eposta` | E-posta kopyasının bildirim akışına doğru bağlandığını sınar (4 kontrol) |
| `npm run senaryo:goruntu` | Yetki senaryolarını ve faaliyet akışını tarayıcıda gezer, ekran görüntüsü alır (`--tema=a` / `--tema=b` / `--tema=c` ile diğer temalar) |
| `npm run disaaktarma:dogrula` | CSV çıktısının ekranla aynı kümeyi verdiğini ve kapsam dışına sızmadığını canlı sistemde sınar |
| `npm run hata:goruntu` | Bulunamadı ekranının dört temadaki görüntüsünü alır |
| `npm run db:deploy` | Migration'ları uygular |
| `npm run db:seed` | Referans veri ve başlangıç yöneticisi |
| `npm run veri:ornek` | Örnek envanter üretir (50 koordinatör, 50 öğretmen, 300 öğrenci); `-- --temizle` ile geri alır |
| `npm run veri:kazanim` | Kazanımlar ekranını dolu görmek için demo katılım üretir (yalnızca geliştirme) |
| `npm run skill:paketle` | `genctek-platform.skill` paketini kökteki SKILL.md ve üç referans belgesinden yeniden üretir |
| `npm run senkron:danisman` | Gecelik senkron (cron) |
| `npm run bakim:saklama` | Saklama süresi dolan erişim kaydı ve okunmuş bildirimi siler (cron) |
| `npm run lint` | ESLint |

`SKILL.md`, `domain-rules.md`, `data-model.md` veya `permissions.md` değiştiğinde
**`npm run skill:paketle` çalıştırın.** `genctek-platform.skill` bu dört belgenin
paketlenmiş kopyasıdır; elle güncellenmediği için bir kez üç tur geride kaldı ve
paketi okuyan taraf sessizce eski kuralları uyguladı — hiçbir yerde hata vermeyen
bir sapma. Paket belirlenimlidir: içerik değişmediyse aynı baytları üretir, o
yüzden gereksiz fark oluşturmaz.

VPS'te iki zamanlanmış iş vardır:

```
# Gecelik senkron — okul/sınıf değişiklikleri ve ayrılan danışmanlar
0 3 * * * cd /opt/genctek && npm run senkron:danisman >> /var/log/genctek-senkron.log 2>&1

# Aylık saklama temizliği — KVKK veri saklama süresi
0 4 1 * * cd /opt/genctek && npm run bakim:saklama >> /var/log/genctek-saklama.log 2>&1
```

## Kimlik doğrulama

### Açılış ekranı

`/` adresi sistemin kapısıdır (`src/app/page.tsx`): GençTek markası, tek bir
**EBA ile Giriş Yap** düğmesi ve "dış kayıt yoktur, kimlik bilgileri EBA
üzerinden alınır" notu. Kayıt, şifre ve parola sıfırlama akışı yoktur ve
olmayacaktır. Oturumu açık kullanıcı kapıda bekletilmez, doğrudan `/panel`'e
gider.

EBA SSO erişimi gelene kadar düğme, geliştirme senaryolarının bulunduğu
`/giris` ekranına götürür ve ekranda bunu söyleyen bir not durur. Erişim
sağlandığında burada değişecek tek şey düğmenin hedefidir; ekranın kendisi aynı
kalır. Ekran dört temada da çalışır (D: beyaz zemin + kırmızı düğme, A:
lacivert zemin + amber düğme, B: açık zemin + mavi düğme, C: bordo zemin +
kırmızı düğme) — renkler anlam adından geldiği için ayrıca uyarlanmadı.

EBA SSO erişimi henüz sağlanmadı. Kimlik doğrulama bir arayüz arkasına alındı:

```
src/lib/auth/tipler.ts          AuthProvider arayüzü ve AuthKimlik
src/lib/auth/mock-provider.ts   şimdilik etkin olan sağlayıcı
src/lib/auth/eba-provider.ts    erişim gelince doldurulacak TEK yer
src/lib/auth/index.ts           AUTH_PROVIDER ortam değişkenine göre seçim
```

Üst katmanlar (yetki, atama, profil) yalnızca bu arayüzü tanır. EBA token'ı
geldiğinde `eba-provider.ts` yazılır, `AUTH_PROVIDER=eba` yapılır; başka hiçbir
yer değişmez. Mock aşamada da salt okunur alanlar ve kapsam filtreleri gerçek
kurallarla çalışır, böylece entegrasyonda sürpriz çıkmaz.

### Dört giriş senaryosu

Giriş ekranı kimlikleri dört yetki senaryosuna göre gruplar; test edilen şey
kişi değil o rolün ne görüp ne yapabildiğidir. Gruplama sabit listeden değil
veritabanındaki aktif rollerden gelir, yani bir öğretmen danışmanlık görevini
bıraktığında kartı kendiliğinden son gruba düşer.

| Senaryo | Rol | Öğrenci listesinde gördüğü | Ek yetkileri |
|---|---|---|---|
| YEĞİTEK | `PROJE_YONETICISI` | Tüm iller | Ulusal faaliyet onayı, il/ulusal faaliyet açma, il koordinatörü atama, rol/atama envanteri |
| İl koordinatörü | `IL_KOORDINATOR` | Yalnızca kendi ili | İl ve ulusal faaliyet açma (ulusal onaya tabi), İl Temsilcisi görevi verme, okulunda danışman olmayan öğrencilerin danışmanı |
| Okul koordinatörü | `DANISMAN` | Yalnızca danışmanlığındaki öğrenciler | Okul kapsamlı faaliyet açma, Okul Temsilcisi görevi verme |
| Öğrenci | `OGRENCI` | Ekrana hiç erişemez | Kendi profili, danışman ve çalışma grubu seçimi, faaliyete başvuru |

Beşinci bir durum daha var: görev almamış öğretmen sisteme girer ama hiçbir
öğrenci verisi göremez; danışmanlığı profilinden kendisi işaretler.

Adlandırma: okul düzeyindeki sorumlu giriş ekranında "okul koordinatörü" olarak
anılır (kurumsal dilde bu yerleşik karşılık), diğer ekranlarda ve bildirimlerde
rolün resmi adı olan "danışman öğretmen" kullanılır. İkisi aynı roldür:
`DANISMAN`.

`npm run senaryo:goruntu` bu senaryoların hepsini gerçek giriş akışıyla gezer,
her ekranın görüntüsünü alır ve her rolün ne gördüğünü konsola yazar — kapsam
izolasyonunun canlı sistemdeki kanıtı budur. Faaliyet akışını da uçtan uca
yürütür ve şunları raporlar:

- onay bekleyen ulusal faaliyet öğrencinin listesinde çıkmıyor, adresine
  doğrudan gidildiğinde 403 değil **404** dönüyor (kaydın varlığı sızmıyor);
- okul içi faaliyet başka okulun öğrencisine görünmüyor;
- değerlendirme paneli başvuran öğrenciye açılmıyor;
- öğrenci başvuruyor, düzenleyen değerlendiriyor, sonuç bildirimi düşüyor.

### Örnek envanter (hacim verisi)

Senaryo katalogu yetki kurallarını gösterir ama sistemin gerçek hacimde nasıl
davrandığını göstermez. `npm run veri:ornek` bunun için vardır:

```
50 il koordinatörü · 50 öğretmen · 300 öğrenci · 55 il · 110 okul
```

Kayıtlar veritabanına elle yazılmaz; gerçek akışlar çağrılır (`kullaniciSagla`,
`danismanlikDurumunuDegistir`, `ilkAtamayiYurut`). Bu yüzden üretilen veri
uygulamanın kendi kurallarıyla tutarlıdır ve dört atama dalının hepsi temsil
edilir:

| Sonuç | Neden |
|---|---|
| Otomatik atandı | Okulda tek danışman adayı var |
| İl koordinatörüne bağlandı | Okulda aday yok, ilin koordinatörü var |
| Öğrenci seçimi bekliyor | Okulda birden fazla aday var |
| Atanamadı | Okulda aday yok, ilin koordinatörü de yok (bilinçli kenar durum) |

Üretilen kayıtlar `uretilen-` önekli kimlik taşır; senaryo katalogundaki
kullanıcılara dokunulmaz. Tohumlanmış rastgelelik kullanıldığı için aynı komut
aynı kişileri üretir, tekrar çalıştırmak veriyi bozmaz. `--temizle` yalnızca
üretilenleri (ve 800000'den başlayan örnek okulları) siler.

Aktif koordinatörü olan il ATLANIR: bir ilde iki koordinatör, atama akışının
"ilin koordinatörü kim" sorusunu belirsiz bırakırdı. Mock katalogdaki İstanbul
ve Ankara koordinatörleri bu yüzden korunur.

Üretilen kullanıcılar giriş yapabilir: mock sağlayıcı `uretilen-` önekli
kimlikleri veritabanından okur. Giriş ekranı senaryo başlıklarının yanında
gerçek sayıyı gösterir (İl koordinatörü 52, Öğrenci 305 …), her başlık altında
en fazla 25 kart listeler ve kaç kişinin gizlendiğini yazar. Aradığınız kişiye
**ad, il veya okul** araması ile ulaşırsınız — "Adana" araması o ildeki
koordinatörü, öğretmenleri ve öğrencileri birlikte getirir.

### Test kullanıcıları

Katalog `src/lib/auth/mock-kullanicilar.ts` içindedir ve şu senaryoları kapsar:

| Kimlik | Senaryo |
|---|---|
| `ogrenci-001`, `ogrenci-002` | Okulda iki danışman adayı → öğrenci seçim yapar |
| `ogrenci-003` | Okulda danışman yok → il koordinatörüne bağlanır |
| `ogrenci-004` | Okulda tek aday → otomatik atanır |
| `ogrenci-005` | Van: ilin koordinatörü yok → atanamaz, yöneticiye uyarı düşer |
| `ogretmen-001`, `ogretmen-002` | Aynı okulda iki danışman adayı |
| `koordinator-34`, `koordinator-06` | İl koordinatörleri (seed atar) |
| `proje-yoneticisi-001` | YEĞİTEK proje yöneticisi |

Öğrenci ve öğretmen kayıtları seed'de oluşturulmaz; ilk girişte kullanıcı sağlama
akışıyla oluşur. Yalnızca elle atanması gereken roller (proje yöneticisi, il
koordinatörleri) seed tarafından hazırlanır.

## Değişmezler nerede korunuyor

Skill'deki değişmezler uygulama katmanına bırakılmadı; eşzamanlı iki istek
uygulama kontrolünü atlayabildiği için veritabanı kısıtı olarak duruyorlar
(`prisma/migrations/20260728000000_ilk_kurulum/migration.sql` sonundaki
"DEĞİŞMEZLER" bloğu):

- Bir öğretmen aynı anda hem danışman hem il koordinatörü olamaz
- Bir öğrencinin tek aktif danışmanı olur
- **Bir ilin tek aktif koordinatörü olur** (`ux_il_koordinator_tek_aktif`)
- Aynı faaliyete aktif ikinci başvuru yapılamaz (geri çekilenler hariç)
- Dönem başına bir İl Temsilcisi ve okul başına bir Okul Temsilcisi
- Rol ve faaliyet kapsam tutarlılığı, boş gerekçe/yorum yasağı, soft delete izi

İl başına tek koordinatör kısıtı sonradan eklendi
(`20260729150000_il_basina_tek_koordinator`). Kural zaten uygulamada vardı ama
kontrol transaction dışında yapılıyordu: aynı ile aynı anda atama yapan iki
proje yöneticisi ili boş görürdü. Migration önce varsa çakışmayı temizler (en
son atanan görevde kalır, öncekilerin bitiş tarihi yazılır — silme yok), sonra
kısıtı kurar. Kısıta takılan istek ham veritabanı hatası değil "bu ilde görevli
bir koordinatör zaten var" mesajı alır.

Boş gerekçe/yorum kısıtı `20260728120000_bosluk_kisitlari` migration'ında
düzeltildi: ilk hâli `btrim` kullanıyordu, o da Postgres'te yalnızca boşluk
karakterini kırptığı için satır sonundan oluşan bir metin kısıttan geçiyordu.
Şimdi POSIX boşluk sınıfıyla en az bir boşluk-olmayan karakter zorunlu.

Bu kısıtların gerçekten tuttuğu `npm run test:duman` ile sınanır.

Yetki kararları tek yerdedir:

```
src/lib/yetki/izinler.ts   yetki matrisi (saf fonksiyonlar, birim testli)
src/lib/yetki/kapsam.ts    merkezi kapsam filtresi — her sorgu buradan geçer
src/lib/yetki/log.ts       erişim logu
```

Öğrenci sorgulayan hiçbir yerde filtre elle yazılmaz. Yetki belirlenemezse filtre
"hiçbir kaydı döndürmeyen" hâle döner (fail closed).

Öğrenci listesi sayfa sayfa gelir (50 kayıt). Sayfalama yalnızca ekran için
değil: her görüntülenen öğrenci için erişim logu yazıldığından, tek sayfada 300
kayıt dökmek log tablosunu her bakışta şişirirdi. Loglanan, gerçekten gösterilen
sayfadır.

## Arayüz temaları

Dört tema var, kullanıcı sağ üstteki **Tema D / A / B / C** düğmesiyle geçiş
yapar:

| Tema | Görünüm |
|---|---|
| **D** (varsayılan) | GençTek marka: tam kırmızı üst bar (menü alanı), beyaz sayfa gövdesi, nötr siyah metin, kırmızı düğme ve bağlantılar |
| **A** | GençTek kurumsal: koyu lacivert üst bar, kağıt tonu zemin, amber vurgu, rol renk kodları |
| **B** | Sade kurumsal: açık üst bar, mavi vurgu, düşük kontrastlı sade görünüm |
| **C** | MEB kırmızı: bordo üst bar, MEB kırmızısı düğme ve bağlantılar, altın seçim vurgusu |

Varsayılan tema D, kurumsal renk paletinin doğrudan karşılığıdır:

| Renk | HEX | Pantone | Kullanım |
|---|---|---|---|
| Kırmızı | `#c4161c` | 7621 C | Üst bar, düğme, bağlantı, vurgu |
| Nötr siyah | `#414042` | Neutral Black U | Gövde metni ve başlıklar |
| Soğuk gri | `#939598` | Cool Gray 8 U | Kart, tablo ve girdi çizgileri |

Üçü de birebir kullanılır. Türetilen tek şey ara tonlardır: ikincil metin
`#6d6e71` (soğuk grinin koyultulmuşu — ham gri beyaz üstünde 3.1:1, metin için
yetersiz), sayfa zemini `#f7f7f8` ve rol rozeti zeminleri.

Seçim `genctek_tema` çerezinde tutulur ve sunucuda okunur (`src/lib/tema.ts`),
böylece ilk boyamada renk atlaması olmaz ve seçim sekmeler arası korunur. Geçiş
bir sunucu eylemidir; JavaScript kapalı olsa da çalışır.

Ekranlar renk adı değil **anlam adı** kullanır: `bg-zemin`, `bg-kart`,
`text-baslik`, `bg-birincil`, `bg-uyari-zemin`, `bg-rol-danisman-zemin` gibi. Bu
adların temaya göre karşılıkları yalnızca `src/app/globals.css` içindeki dört
değişken bloğunda tanımlıdır. Sonuç olarak:

- yeni bir tema eklemek `[data-tema="..."]` bloğu yazıp `src/lib/tema.ts`'e bir
  satır eklemekten ibarettir — ekranlara dokunulmaz (Tema C ve marka teması D
  tam olarak böyle eklendi);
- kurumsal kimlik değişirse tek dosya güncellenir.

Tema D kırmızı üst bar için ek bir token çifti getirdi:
`ust-bar-secili-zemin` / `ust-bar-secili-metin`. Sebebi, seçim vurgusunun iki
ayrı zeminde yaşaması: sayfa gövdesinde beyaz kartın üstünde (kırmızı olmalı) ve
kırmızı üst barda menü sekmesi olarak (beyaz olmalı). Tek token ikisini birden
karşılayamıyordu. Diğer üç temada bu çift kendi `secili-*` değerlerine eşit
tanımlandı, dolayısıyla A/B/C'nin görünümü değişmedi.

Tema D'de iki bilinçli sapma var: sayfa zemini saf beyaz değil **#f7f7f8**,
çünkü `bg-zemin` yalnızca sayfa arka planı değil kart içindeki ikincil yüzey de
(tablo başlığı, ikincil düğme hover'ı, pasif rozet) — kartla aynı beyaz olsaydı
bu yüzeyler kaybolurdu. Ve **hata rengi vurgu renginden ayrı**, aksi halde
kırmızı bir temada hata kutusu sıradan bir etiketten ayırt edilemezdi.

Tema C'de iki bilinçli sapma var: seçim vurgusu kırmızı değil **altın**, çünkü
kırmızının bir tonu hem bordo üst barda hem beyaz kartta aynı anda okunur
kalamıyordu; ve hata rengi yine vurgudan ayrı tutuldu.

Roller her ekranda kendi renginde görünür (`src/components/RolEtiketi.tsx`):
öğrenci amber, danışman yeşil, il koordinatörü lacivert, YEĞİTEK mor.

## Dizin yapısı

```
prisma/
  schema.prisma          veri modeli
  migrations/            şema + değişmez kısıtları
  seed.ts                referans veri, çalışma grupları, şablonlar
src/lib/
  tema.ts                tema seçimi (çerez)
  tarih.ts               tarih biçimleme ve form girdisi çözümleme
  auth/                  AuthProvider soyutlaması ve oturum
  depolama/              DepolamaSaglayici soyutlaması (yerel disk / S3)
  yetki/                 izin matrisi, kapsam filtresi, log
  danisman/              atama ve devir (karar.ts saf, atama.ts veritabanı)
  faaliyet/              kurallar.ts + ek-kurallar.ts + takvim.ts saf kurallar, erisim.ts görünürlük
  kullanici/             ilk giriş sağlama, salt okunur alanlar, senkron
  ogrenci/               profil erişimi, kazanım ve CV kuralları (kurallar saf, cv.ts depolama)
  ogretmen/              danışmanlık görevi, görev yılı hesabı (gorev-yillari.ts saf)
  paydas/                il bazlı paydaş envanteri kuralları (saf)
  bildirim/              şablonlu bildirim + e-posta ve SMS kopyası
  eposta/                EpostaSaglayici soyutlaması (günlük / SMTP)
  sms/                   SmsSaglayici soyutlaması (kapalı / günlük / operatör)
  kazanim/               rozet kuralları (rozetler.ts saf, getir.ts veritabanı)
  rapor/                 rol envanteri, CSV üretimi ve filtre seçenekleri
src/app/page.tsx         açılış ekranı (EBA ile giriş kapısı)
src/app/giris/           kimlik seçimi (mock aşama) ve giriş eylemi
src/app/panel/           Next.js ekranları ve sunucu eylemleri
  faaliyetler/           liste, açma formu, detay + başvuru + değerlendirme + paydaş
  gorev-rolleri/         İl Temsilcisi / Okul Temsilcisi atama
  rol-envanteri/         il koordinatörü / danışman boşlukları + koordinatör atama
  ogrenciler/            öğrenci envanteri, filtreler ve CSV çıktısı
  ogrenciler/[id]/       tekil öğrenci profili, çalışma grubu ekleme, CV indirme
  ogretmenler/           öğretmen envanteri, filtreler ve CSV çıktısı
  ogretmenler/[id]/      tekil öğretmen kaydı: görev yılları, etkinlikleri
  paydaslar/             il bazlı paydaş envanteri + CSV
  paydaslar/[id]/        tekil paydaş kaydı ve düzenleme
  profil/                kendi profili: iletişim, kazanım girişi, CV yükleme
  kazanimlarim/          öğrencinin katılım geçmişi ve rozetleri
src/app/globals.css      dört temanın renk değişkenleri
src/components/          ortak arayüz parçaları (kart, buton, rol etiketi)
tests/                   birim testler
scripts/                 gecelik senkron, duman testi
```

## Tamamlanan ve kalan işler

Skill'deki 13 adımlık geliştirme sırasına göre:

| # | Adım | Durum |
|---|---|---|
| 1 | Referans veriler ve şema | Tamam |
| 2 | Mock kimlik doğrulama ve kullanıcı sağlama | Tamam |
| 3 | Rol ve yetki altyapısı, erişim logu | Tamam |
| 4 | Profil ekranları, salt okunur alan davranışı | Tamam |
| 5 | Danışman atama, devir, gecelik senkron | Tamam |
| 6 | Çalışma grupları | Tamam (öğrenci seçimi + yönetim ekranı) |
| 7 | Faaliyet yönetimi ve ulusal onay akışı | Tamam |
| 8 | Dosya/görsel yükleme ve yorumlar | Tamam |
| 9 | Başvuru ve değerlendirme | Tamam |
| 10 | Raporlama ve filtreleme | Tamam (filtreler + CSV dışa aktarma) |
| 11 | KVKK aydınlatma ve saklama süresi | Tamam |
| 12 | Birim testler | 3, 5, 6, 7, 8, 9, 10 ve 11 için tamam (287 test) |
| 13 | Gerçek EBA SSO entegrasyonu | Erişim bekleniyor |
| 14 | Danışman öğretmen envanteri (analiz Bölüm 2) | Tamam |
| 15 | İl bazlı paydaş bilgi sistemi (analiz Bölüm 3) | Tamam |
| 16 | Öğretmen ve vekaleten başvuru (analiz 4.2) | Tamam |
| 17 | Etkinlik takvimi ve duyuru şeridi (analiz Bölüm 6) | Tamam |
| 18 | Bildirim şablonu yönetimi ve SMS kanalı (analiz 6.1) | Tamam |

### Tanıtıcı görsel

Faaliyetin tanıtıcı (kapak) görseli **iki yerden** eklenir:

1. **Faaliyet açılırken** — "Yeni faaliyet" formundaki *Tanıtıcı görsel* alanı.
2. **Sonradan** — faaliyet detayında görsel yükleyip *Tanıtıcı yap* düğmesiyle.
   Faaliyetin henüz kapağı yoksa yüklenen ilk görsel kendiliğinden kapak olur.

Kapak, faaliyet listesindeki kartın üstünde ve detay sayfasında görünür. Ayrı
bir dosya alanı değildir: `faaliyet.kapak_ek_id` mevcut eklerden **birine**
işaret eder, böylece aynı görsel iki kez yüklenmez ve kapak da diğer ekler gibi
kapsam kontrolünden geçen indirme yolunu kullanır. Belge (pdf) kapak olamaz.

Tanıtıcı görsel isteğe bağlıdır ve kabul edilmezse faaliyet **geri alınmaz** —
tarihleri doğru girilmiş bir faaliyeti yalnızca dosya yüzünden silmek kullanıcıyı
formu baştan doldurmaya zorlardı; faaliyet açılır, gerekçe detay ekranında
gösterilir.

### Ekler ve yorumlar

Faaliyet detayında **Görseller ve belgeler** ile **Yorumlar** kartları vardır:

- Görseller resim olarak (galeri), belgeler bağlantı olarak listelenir.
- Ek yükleme yalnızca faaliyeti açan kullanıcıdadır; öğrenci indirir, ekleyemez.
  Tip ve boyut sınırları `sistem_ayari` tablosundan gelir (varsayılan: görsel
  jpg/png/webp 5 MB, belge pdf 10 MB), koda gömülü değildir.
- Yorumu, faaliyeti görebilen herkes yazar; yanıt zinciri vardır.
- Silme soft-delete'tir: içerik gösterilmez, kayıt ve silen bilgisi logda kalır.
  Silinen üst yorum "silindi" görünür, altındaki yanıtlar yerinde durur.

Dosyalar public bir dizinden servis **edilmez**. Her indirme
`/panel/faaliyetler/[id]/ekler/[ekId]` üzerinden gider ve önce oturum, sonra
faaliyetin kapsam filtresi kontrol edilir — kapsam dışında 404 döner. Yani ek ve
yorum ayrı bir izin sistemi değil, faaliyet kapsamının uzantısıdır (Değişmez 8).

Depolama `src/lib/depolama/` altında soyutlanmıştır:

```
tipler.ts   DepolamaSaglayici arayüzü
yerel.ts    şimdilik etkin olan sağlayıcı (disk)
s3.ts       nesne depolamaya geçilirse doldurulacak TEK yer
index.ts    DEPOLAMA_SAGLAYICI ortam değişkenine göre seçim
```

Veritabanında dosya yolu değil sağlayıcının döndürdüğü **anahtar** saklanır.
Dosya adı kullanıcıdan gelmez, üretilir (`yyyy/aa/<uuid>.<uzanti>`) — aksi halde
`../` içeren bir ad depolama dizininin dışına yazabilirdi.

### Yetki devri

Faaliyeti açan kullanıcı görevden ayrılırsa (aktif rolü kalmazsa) o faaliyetin
**değerlendirme ve moderasyon** yetkisi boşta kalmaz; faaliyetin iline bakan il
koordinatörüne düşer (`yetkiDevrolduMu`). Proje yöneticisi zaten her durumda
yetkilidir. Devir yalnızca ayrılma durumunda olur: görevdeki bir öğretmenin
faaliyetine kendi ilinin koordinatörü karışamaz. Düzenleyenin rol durumu
bilinmiyorsa devir **olmaz** — eksik veriyle yetki genişletmek yerine dar tarafta
kalınır.

### Bilinen eksikler

Skill dosyalarına karşı yapılan denetimde tespit edilenler. Şema ve yetki
fonksiyonları hazır, eksik olan iş akışı/ekran katmanı:

| Eksik | Nerede duruyor | Etki |
|---|---|---|
| **Gerçek EBA SSO** (adım 13) | `eba-provider.ts` boş, `mock` etkin | Yüksek ama dışa bağımlı: erişim gelene kadar yapılabilecek her şey yapıldı |
| **Mezun modülü** (analiz 1.3) | Yok; bilinçli olarak kapsam dışı | Kullanıcı kararıyla ertelendi |
| **SMS operatör anlaşması** | Sağlayıcı ve akış hazır (`src/lib/sms/`), `SMS_SAGLAYICI="kapali"` | Düşük: uç nokta ve anahtar girildiğinde kanal kod değişikliği olmadan açılır |
| **PDF çıktısı** | CSV var, PDF yok | Düşük: listeler tabloya dökülüyor; imzalı belge ihtiyacı ortaya çıkarsa eklenir |

### Danışman öğretmen envanteri

`/panel/ogretmenler` — analiz dokümanı Bölüm 2. Kapsamı öğrenci envanteriyle
aynı mantıkta kurulur (`ogretmenKapsamFiltresi`): danışman öğretmen kendi
okulunu, il koordinatörü kendi ilini, YEĞİTEK tüm ülkeyi görür. Öğrenci bu
ekrana hiçbir koşulda giremez.

"Öğretmen" ayrı bir tip DEĞİLDİR: aktif öğrenci rolü olmayan kullanıcıdır.
YEĞİTEK personeli listeden çıkarılır — okulda görevli bir öğretmen değildir.

**Görev aldığı eğitim-öğretim yılları** ayrı bir sütunda tutulmaz; `kullanici_rol`
kayıtlarının başlangıç/bitiş tarihlerinden türetilir
(`src/lib/ogretmen/gorev-yillari.ts`). İkinci bir yer tutulsaydı rol devri
sırasında ikisi ayrışır ve hangisinin doğru olduğu bilinemezdi. Yıl sınırı
**1 Eylül**'dür: Ağustos'ta yapılan atama önceki yıla sayılır.

Tekil kayıtta (`/panel/ogretmenler/[id]`) branş, okul, görev geçmişi, iletişim
bilgisi, danışmanlığındaki öğrenciler, düzenlediği ve katıldığı etkinlikler
görünür. **Öğrenci ve faaliyet listeleri bakan kişinin KENDİ kapsamından
yeniden geçer**: bir danışman, meslektaşının profilini açarak onun
öğrencilerinin adlarını göremez.

Ulusal/uluslararası etkinlikler için ayrı bir tablo açılmadı: GençTek'in ulusal
programları (Zirve, Sınır Ötesi, G2S, EğitiJAM) zaten `kapsam = ULUSAL` olan
faaliyetlerdir ve liste oradan türetilir.

### Paydaş envanteri

`/panel/paydaslar` — analiz dokümanı Bölüm 3. Kayıt **ile** bağlıdır; il
koordinatörü ve YEĞİTEK yönetir, danışman öğretmen görür ve kendi faaliyetine
bağlar.

Görme ile yönetme AYRI kapılardır (`paydasGorebilirMi` / `paydasYonetebilirMi`).
Her öğretmen de ekleyebilseydi aynı üniversite onlarca kez farklı yazımla
girilir ve "il bazlı iş birliği haritası" kullanılamaz hâle gelirdi.

- Zorunlu alanlar: kurum adı, tür, il, **iş birliği alanı** ve en az bir
  iletişim bilgisi (yetkili kişi / e-posta / telefon). Ulaşılamayan paydaş,
  paydaş değildir.
- Aynı ilde aynı adla ikinci **aktif** kayıt açılamaz (kısmi unique index).
- **Silme yoktur**: iş birliği bitince kayıt pasife alınır, geçmiş faaliyet
  bağlantıları bozulmaz.
- İl DEĞİŞTİRİLEMEZ: kaydı başka ile taşımak, o ilin envanterine haberi olmadan
  satır eklemek olurdu.

Faaliyet detayındaki **Paydaş bilgisi** kartı, analiz dokümanı 4.3'teki
"paydaş bilgisi (varsa)" sonuç alanının karşılığıdır. Bağlantıyı faaliyeti açan
kullanıcı kurar; paydaşın ili faaliyetin iliyle aynı olmak zorunda değildir.

### Öğretmen ve vekaleten başvuru

Analiz dokümanı 4.2 iki maddeyi birden istiyor: "öğrenci ve öğretmenler
başvurabilmeli" ve "danışman öğretmen öğrenci adına başvurabilir". İkisi de
`basvuru` tablosunun katılımcı temeline geçmesiyle karşılandı:

- `ogrenci_id` → **`katilimci_id`**. Katılımcı öğrenci de öğretmen de olabilir.
- Yeni `adina_basvuran_kullanici_id`: NULL ise başvuruyu katılımcı kendisi
  yapmıştır, doluysa öğretmen öğrenci adına yapmıştır.

Katılımcının öğrenci mi öğretmen mi olduğu **sütunda tutulmaz**, aktif rolünden
okunur: kopyalanan bir tip alanı, öğrenci mezun olduğunda ya da öğretmen görev
değiştirdiğinde eskirdi.

Vekaleten başvurunun sınırları:

- Yalnızca **öğrenci** adına yapılır; öğretmen adına yapılamaz.
- Hedef öğrenci, başvuranın **kapsam filtresinden** geçmek zorundadır — rol
  kontrolü tek başına yeterli olsaydı bir danışman ilin öbür ucundaki öğrenci
  adına başvurabilirdi.
- Öğrenciye **bildirim gider** ve başvuruyu kendisi geri çekebilir. Katılım
  kişinin kendi zamanını bağlayan bir karardır; habersiz bırakılamaz.
- Başvuruyu, katılımcı ile onun adına başvuran kişi geri çekebilir.
  Değerlendirme sonucu ikisine de bildirilir.

Proje yöneticisi (YEĞİTEK) katılımcı olamaz: ulusal faaliyetleri düzenleyen ve
onaylayan taraf kendi etkinliğine başvurmaz.

### Etkinlik takvimi ve duyuru şeridi

Analiz dokümanı Bölüm 6: "Sisteme ilk girişte etkinlik takvimi görülecek
(geçmiş/aktif/yaklaşan). Başvurusu aktif olan faaliyetler ayrıca şerit halinde
aksın."

Panelin üstünde **akan şerit** başvurusu açık faaliyetleri gösterir; başvurusu
önce kapanacak olan başta durur. Şeridin altında **üç sütunlu takvim** vardır:
bugün / yaklaşan / geçmiş (son 90 gün). Takvim bir arşiv değildir; tamamı
Faaliyetler ekranındadır.

İki ayrıntı kasıtlı:

- Takvim karşılaştırması **gün** bazındadır, an bazında değil. Sabah 10'da
  yapılan etkinlik öğleden sonra "geçmiş" görünseydi, o günün programını takip
  eden kullanıcı etkinliği listede kaybederdi.
- Şerit, **üzerine gelindiğinde ve klavyeyle odaklanıldığında durur**;
  `prefers-reduced-motion` açıksa hiç akmaz. Akan bir bağlantıya tıklamaya
  çalışmak kullanılabilirlik hatasıdır, sürekli hareket ise vestibüler
  duyarlılığı olan kullanıcıda rahatsızlık yaratır.

### Bildirim şablonları ve SMS

Şablon metinleri `bildirim_sablonu` tablosundadır ve **Yönetim** ekranından
düzenlenir (analiz dokümanı 6.1). Kod listesi sabittir ve koddan gelir
(`src/lib/bildirim/sablon.ts`): şablonu tetikleyen olay kodda yaşar, veritabanına
elle eklenen bir satır kendiliğinden bildirim üretmez.

Ekran, metni **kaydetmeden önce doğrular**: her şablonun kullanabileceği
değişkenler tanımlıdır ve metne yazılan `{{ogrenci}}` gibi tanımsız bir yer
tutucu reddedilir. Aksi halde hata ancak bildirim kullanıcıya ham süslü
parantezle ulaştığında fark edilirdi.

SMS, e-postanın ikizi olan ikinci bir kopya kanalıdır (`src/lib/sms/`):

| Sağlayıcı | Davranış |
|---|---|
| `kapali` | Hiç denenmez — **varsayılan** |
| `gunluk` | Gönderilmez, sunucu günlüğüne yazılır |
| `http` | Operatör/toplu SMS servisinin uç noktasına gönderilir |

Varsayılan e-postadan farklı olarak "gunluk" bile değil, tamamen kapalıdır: SMS
ücretli, geri alınamaz ve alıcıların çoğu 18 yaş altı. Operatör anlaşması
yapıldığında `SMS_SAGLAYICI="http"`, `SMS_API_URL` ve `SMS_API_ANAHTARI`
girilir; kod değişmez. Gönderim sonucu bildirim kaydına yazılır (`sms_durumu`,
`sms_hatasi`) ve Yönetim ekranında sayılır — sessiz başarısızlık, hiç
göndermemekten kötüdür.

Panel bildirimi her koşulda yazılır; iki kanal da yalnızca birer kopyadır ve
gitmemeleri bildirimi geçersiz kılmaz.

### Rapor dışa aktarma (CSV)

Öğrenci ve faaliyet listelerinin altındaki **CSV indir** bağlantısı, ekranda o
an görünen listeyi dosyaya döker. Bağlantı adresteki filtreleri taşır; indirilen
dosya ekrandaki kümenin aynısıdır.

| Yol | İçerik |
|---|---|
| `/panel/ogrenciler/disa-aktar` | Ad, sınıf, okul, il/ilçe, danışman, çalışma grupları |
| `/panel/faaliyetler/disa-aktar` | Faaliyet, tarih, kapsam, kategori, kontenjan/başvuru sayıları, onay ve faaliyet durumu |

Üç kural:

1. **Ekranda olmayan alan dosyada da yoktur.** Öğrenci çıktısında telefon ve
   e-posta bulunmaz — indirme yolunu kapsam genişletmenin arka kapısı hâline
   getirmemek için. Sorgu aynı `ogrenciListeFiltresi` / `faaliyetListeFiltresi`
   fonksiyonundan geçer, filtre çözümlemesi ekranla paylaşılır; iki yol ayrı
   yazılsaydı dosya ile ekran zamanla ayrışır ve bunu kimse fark etmezdi.
2. **Satır sınırı aşılırsa indirme reddedilir**, liste sessizce kırpılmaz
   (varsayılan 5000, `DISA_AKTARMA_UST_SINIRI` ayarı). Eksik olduğu belli olmayan
   bir rapor, hiç rapor olmamasından kötüdür.
3. **Her satır loglanır** ve detayında "CSV" geçer: veri bu yolla kurum dışına
   çıkabildiği için denetimde ekranda bakılan kayıtla indirilen kayıt ayırt
   edilebilmelidir.

Dosya UTF-8 BOM ile başlar ve sütunlar noktalı virgülle ayrılır — Türkçe yerel
ayardaki Excel aksi hâlde karakterleri bozar ve her satırı tek hücreye yığar.
`=`, `+`, `-`, `@` ile başlayan hücrelerin başına tırnak konur: elektronik tablo
programları bu hücreleri formül sayıp dosyayı açan kişinin makinesinde çalıştırır.

`npm run disaaktarma:dogrula` bu kuralları canlı sistemde sınar: her rol için
ekrandaki kayıt sayısı ile dosyadaki satır sayısını karşılaştırır, öğrencinin ve
oturumsuz isteğin 404 aldığını doğrular.

### E-posta bildirimi

Bildirim her koşulda panele yazılır; e-posta yalnızca bir **kopyadır**. Kişinin
profilinde adres varsa ve gönderim açıksa kopya postalanır, sonuç bildirim
kaydına işlenir (`bildirim.eposta_durumu`: `GEREKMIYOR` / `GONDERILDI` /
`BASARISIZ` + `eposta_hatasi`).

```
src/lib/eposta/tipler.ts           EpostaSaglayici arayüzü
src/lib/eposta/gunluk-saglayici.ts varsayılan: göndermez, günlüğe yazar
src/lib/eposta/smtp-saglayici.ts   kurum posta sunucusu (nodemailer)
src/lib/eposta/index.ts            EPOSTA_SAGLAYICI ortam değişkenine göre seçim
src/lib/bildirim/eposta-kopyasi.ts panel bildirimini e-postaya bağlayan katman
```

Varsayılan `gunluk`'tur: yanlış yapılandırmayla gerçek öğrencilere posta
gitmesindense hiç gitmemesi yeğdir. Üretimde bilinçli olarak `smtp` yapılır ve
`SMTP_SUNUCU` ile `EPOSTA_GONDEREN` zorunlu hâle gelir (açılışta doğrulanır).

Gönderim **iş akışını kesmez**: posta sunucusu erişilemezse başvuru
değerlendirmesi ya da danışman devri yarıda kalmaz, hata bildirim kaydına yazılır
ve **Panel → Yönetim** ekranındaki *E-posta bildirimi* kartında gönderilen /
başarısız / adressiz sayıları ile son hata görünür. Adres olmaması hata değildir;
iletişim bilgisi zorunlu değildir.

Gövdeler düz metindir. HTML e-posta hem şablonları ikiye katlar hem de bildirim
metinleri kullanıcıdan gelen değerlerle (faaliyet adı, okul adı) doldurulduğu
için kaçış hatalarına açık kapı bırakır. Bildirimin işi "panele bak" demektir.

### Kazanımlar ve rozetler

**Panel → Kazanımlarım** (yalnızca öğrenci) katılım geçmişini ve rozetleri
gösterir. Rozetler **elle verilmez**, katılımdan türetilir
(`src/lib/kazanim/rozetler.ts` — saf, birim testli). Elle verilseydi öğrencinin
gördüğü rozetle sistemdeki kayıt zamanla ayrışır, kimin neyi neden aldığı
tartışma konusu olurdu.

"Katılım" = faaliyete **seçildi** + faaliyet **tarihi geçti** + faaliyet **iptal
edilmedi**. Sadece seçilmiş olmak yetmez: gerçekleşmemiş bir etkinlik için rozet
vermek, öğrenciye yapmadığı bir şeyi başarmış gibi göstermek olurdu.

| Rozet | Koşul |
|---|---|
| İlk Adım / Düzenli Katılım / GençTek Gönüllüsü | 1 / 3 / 10 katılım |
| Çok Yönlü | Üç etkinlik kategorisinin üçünde de katılım |
| İl Sahnesi / Türkiye Sahnesi | İl geneli / ulusal faaliyete katılım |
| İlgi Alanı / Meraklı | 1 / 3 çalışma grubu seçimi |
| Sorumluluk | Bir temsil görevi (İl Temsilcisi, Okul Temsilcisi) |

Kazanılmamış rozetler "yolda olanlar" başlığında ilerleme çubuğuyla görünür.
Ekran yalnızca oturumdaki öğrencinin verisini okur; başka bir öğrencinin
rozetlerine bakmanın yolu bu ekranda yoktur — kapsamındaki öğrencinin rozet
özeti tekil profil ekranında görünür (aşağı bakın).

### Öğrenci profili: kazanımlar, yarışmalar ve CV

**Panel → Profilim** öğrenci için üç bölüm daha taşır:

| Bölüm | Kaynak | Kim düzenler |
|---|---|---|
| **Katıldığı GençTek etkinlikleri** | Türetilir: seçildiği + tarihi geçmiş + iptal edilmemiş faaliyetler | Hiç kimse — elle girilmez |
| **Kazanımlar ve üretimler** | Öğrenci beyanı (`ogrenci_kazanim`) | Yalnızca öğrencinin kendisi |
| **Özgeçmiş (CV)** | Öğrencinin yüklediği pdf/doc/docx | Yalnızca öğrencinin kendisi |

Kazanım kayıtları dört türdür ve öğrenci **Yeni kayıt ekle** kartındaki sekmelerden
seçer: **GençTek dışı etkinlikler**, **yaptığı ürünler** (web sitesi, uygulama,
oyun, film), **verdiği akran eğitimleri**, **derece aldığı yarışmalar**. Alanlar
türe göre değişir — `derece` yalnızca yarışmada, `duzenleyen` ürünler dışında
sorulur. Form sunucuda basılır (tür adresten gelir), istemci tarafı JavaScript
gerekmez.

Bunlar **beyandır**: sistem doğrulamaz, onaya girmez, rozet üretmez. Katıldığı
GençTek etkinlikleri ise beyan değildir, o yüzden aynı tabloya yazılmaz —
türetilebilen veriyi öğrencinin eliyle ikinci kez girmesi hem yanlış hem
doğrulanamaz olurdu.

CV öğrenci başına **tek kayıttır**: yeni yükleme eskisinin yerine geçer ve eski
dosya silinir. Biçim ve boyut sınırları **Yönetim** ekranındaki `IZINLI_CV_TIPLERI`
ve `CV_MAKS_BAYT` ayarlarındadır; faaliyet eklerinin belge ayarından ayrıdır
(CV'de doc/docx var, faaliyet ekinde yok).

### Tekil öğrenci profili (danışman / koordinatör / YEĞİTEK)

**Panel → Öğrenciler** listesinde ada tıklamak öğrencinin profilini açar
(`/panel/ogrenciler/:id`); aynı bağlantı **Görev rolleri** ekranında da var.
Ekran kimlik ve iletişim bilgilerini, danışmanını, çalışma gruplarını, görev
rollerini, CV'sini, katıldığı GençTek etkinliklerini, kazanım beyanlarını ve
rozet özetini gösterir.

Erişim listeyle **aynı merkezi kapsam filtresinden** geçer: danışman öğretmen
danışmanlığındaki öğrencileri, il koordinatörü kendi ilini, YEĞİTEK tüm illeri
görür. Kapsam dışı bir id yazıldığında "yetkiniz yok" değil **404** döner —
kaydın varlığı bile sızmaz. Ekran listeden daha fazla kişisel veri gösterdiği
için her görüntüleme erişim kaydına yazılır.

Danışman, il koordinatörü ve YEĞİTEK bu ekrandan öğrenciyi **çalışma grubuna
ekleyip çıkarabilir**. Kaydı kimin açtığı saklanır ve öğrenci kendi profilinde
"X Y ekledi" olarak görür. Kazanım kayıtlarına ve CV'ye **dokunamazlar**:
onlar öğrencinin kendi geçmişidir, grup üyeliği ise programın işleyişine ait bir
karardır.

### Faaliyet akışı nerede

| Kim | Nereden |
|---|---|
| Danışman öğretmen okul içi faaliyet açar | **Faaliyetler → Yeni faaliyet** |
| İl koordinatörü il / ulusal faaliyet açar | aynı ekran; ulusal seçildiğinde onaya düşer |
| YEĞİTEK onaylar | **Faaliyetler** → faaliyet detayı → *Onayla ve yayına al* (panelde sayaç da bu ekrana bağlar) |
| Öğrenci görür ve başvurur | **Faaliyetler** → faaliyet detayı → gerekçe yazıp *Başvur* |
| Düzenleyen değerlendirir | faaliyet detayındaki **Başvurular** kartı → *Seç / Yedeğe al / Reddet* |
| Düzenleyen tarih/kontenjan değiştirir | faaliyet detayındaki **Faaliyeti düzenle** kartı |
| Düzenleyen faaliyeti iptal eder | aynı kartın altındaki *Faaliyeti iptal et* |

Faaliyetin yeri (okul / il) forma sorulmaz, roldan türetilir; aksi halde bir
danışman öğretmen başka okulun, bir koordinatör başka ilin adına faaliyet
açabilirdi. Tek istisna YEĞİTEK'in il faaliyetinde ili seçmesidir.

### Kapsam ≠ etkinlik kategorisi

Faaliyette iki ayrı ve **bağımsız** alan var:

- **Kapsam** (Okul / İl / Ulusal) — kimin başvurabileceğini belirler, roldan türetilir.
- **Etkinlik kategorisi** (Temel Etkinlik / Çalışma Grubu Etkinliği / İl Etkinliği) —
  etkinliğin ne olduğunu belirler, formda seçilir.

Temel Etkinlik ve Çalışma Grubu Etkinliği'nde faaliyetin **adı serbest metin
değildir**: `temel_etkinlik_programi` tablosundaki sabit listeden gelir. İl
Etkinliği'nde tam tersine ad serbesttir ve program bağlantısı boş kalır — ad
zaten temayı taşır. Bu tutarlılık veritabanı CHECK kısıtıyla korunur; programın
doğru gruptan olduğu ise uygulama katmanında (`etkinlikKategorisiDogrula`)
doğrulanır, çünkü CHECK iki tabloya birden bakamaz.

Bu, faaliyetin **çalışma grubu etiketiyle** (Yapay Zekâ, Robotik…) aynı şey
değildir; o ayrı bir etiketleme ve hâlâ karar bekliyor.

### Kontenjan nasıl sayılır

Kontenjan **aktif başvuru sayısını** sınırlar: BEKLIYOR + SECILDI + YEDEK. Red ve
geri çekme yer açar, iptal edilen faaliyetin başvuruları da yer tutmaz.

Sayaç tutulmaz — her başvuru denemesinde aktif başvurular canlı sayılır ve sayım
kaydın açıldığı transaction'ın **içinde** yapılır. Sabit sayaç tutulsaydı
red/geri çekme sonrası açılan yerler sistemde "dolu" görünmeye devam ederdi;
transaction dışında sayılsaydı eşzamanlı iki başvuru kontenjanı aşardı.

Kontenjan sonradan **seçilen öğrenci sayısının altına düşürülemez** (seçim geri
alınmış olurdu); artırmak her zaman serbesttir ve yeni başvuruların önünü açar.
Onaylı ulusal faaliyette tarih değişirse faaliyet yeniden onaya düşer — yalnızca
kontenjan artışı bunu tetiklemez.

### Rol/Atama Envanteri (yalnızca YEĞİTEK)

**Panel → Rol/Atama Envanteri.** Proje yöneticisi öğrencileri ve öğretmenleri tek
tek zaten görebiliyordu; eksik olan toplu görünümdü. Ekran iki liste gösterir:

1. **İl koordinatörü durumu** — 81 il; boş olanlar listenin başında ve vurgulu.
   Kim atanmış, ne zaman atanmış, ilde kaç öğrenci var, kaçı atanmamış durumda.
2. **Danışman öğretmen durumu** — kurum bazında danışman ve öğrenci sayısı;
   danışmansız okullar başta ve öğrencilerinin hangi il koordinatörüne düştüğü
   yazılı. İlin koordinatörü de yoksa satır kırmızıdır: o öğrenciler atanmamış.

İl koordinatörü atama ve görevden alma da buradan yapılır — boşluğu görmek ve
doldurmak tek akış. **Yeni tablo yok:** ekran `kullanici_rol` ve `danisman_atama`
üzerine yazılmış bir rapor katmanıdır (`src/lib/rapor/rol-envanteri.ts`).

Koordinatör görevden alındığında ona bağlı öğrenciler "atanmamış" duruma düşer ve
envanterde kırmızı uyarı olarak görünür; ile yeni koordinatör atandığı anda bu
öğrenciler **ayrı bir onay adımı olmadan** ona bağlanır.

### Görev rolleri

`IL_TEMSILCISI` ve `OKUL_TEMSILCISI` **Görev Rolleri** ekranından verilir: il
koordinatörü kendi ilinde, danışman öğretmen kendi okulunda, proje yöneticisi
her yerde. Aday listesi öğrenci kapsam filtresinden geçer, dönem başına tek
kişi kısıtı veritabanındadır.

Kimlik ve okul bilgileri bu ekrandan **da** düzenlenemez: e-Okul kaynaklı
alanlar hiçbir rolde yazılabilir değildir (SKILL.md kural 6). Yetkilinin
değiştirebildiği tek şey dönem bazlı görev rolüdür ve bu rol hiçbir ek
görüntüleme yetkisi vermez.

### Profildeki iletişim bilgileri

**Panel → Profilim** ekranında telefon ve e-posta alanları **her rolde**
düzenlenebilir: öğrenci, danışman öğretmen, il koordinatörü ve proje yöneticisi.
İletişim bilgisi kimlik bilgisi değildir — e-Okul'dan gelmez, senkron üzerine
yazmaz ve sahibinden başkası giremez. İzinli alan listesi role göre değişmez
(`src/app/panel/profil/eylemler.ts`); rol farkı yalnızca bilginin hangi profil
tablosuna yazıldığındadır (`ogrenci_profil` / `ogretmen_profil`).

Bilgi işe yarar: öğrenci, profilindeki *Danışman öğretmenim* kartında
danışmanının girdiği e-posta ve telefonu görür. Bildirim e-postaları da bu
adrese gider.

## KVKK

Hedef kitle 18 yaş altı olduğu için aydınlatma ve saklama süresi ayrı bir ekran
değil, sistemin işleyişine gömülü iki mekanizmadır.

**Aydınlatma onayı.** Metni okumamış öğrenciye panelin üstünde kalıcı bir uyarı
şeridi çıkar ve **Panel → KVKK** ekranına götürür. Onay tarihi
`ogrenci_profil.aydinlatma_metni_onay_tarihi` alanına yazılır ve erişim loguna
düşer. Metin yönetim ekranından güncellenirse onay **geçersizleşir** ve şerit
yeniden görünür (`aydinlatmaOnayiGerekiyorMu`): değişen bir metne verilmiş eski
onay, onay değildir. Onay işlemi engelleyici değildir — öğrenci uyarıyı görmezden
gelip sistemi kullanabilir; erişimi kesmek, bilgilendirme yükümlülüğünü yerine
getirmenin değil cezalandırmanın aracı olurdu.

**Saklama süresi.** `npm run bakim:saklama` süresi dolan kayıtları siler:

| Veri | Varsayılan | Ayar |
|---|---|---|
| Erişim kaydı | 24 ay | `ERISIM_LOGU_SAKLAMA_AYI` |
| Okunmuş bildirim | 12 ay | `BILDIRIM_SAKLAMA_AYI` |

Okunmamış bildirime dokunulmaz: kullanıcının hiç görmediği bir başvuru sonucunu
süre doldu diye silmek, bilgiyi ulaşmadan yok etmek olurdu. Öğrenci ve faaliyet
kayıtları bu işin kapsamında değildir — envanterin kendisi projenin kalıcı
verisidir.

### Erişim kayıtları (yalnızca YEĞİTEK)

**Panel → Erişim Kayıtları.** Kim, ne zaman, hangi kaydı görüntüledi/değiştirdi/
sildi; kullanıcıya, işlem tipine, hedef tipine ve tarih aralığına göre
filtrelenir. IP adresi `x-forwarded-for` / `x-real-ip` başlığından alınır — ters
vekil arkasında çalışırken nginx'in bu başlığı **iletmesi gerekir**, yoksa alan
boş kalır. Cron işlerinde istek bağlamı olmadığı için IP boştur ve bu bir hata
değildir.

Bu ekranın kendisi de loglanır: denetim kaydına bakmak da denetlenen bir
işlemdir.

### Yönetim (yalnızca YEĞİTEK)

**Panel → Yönetim** üç listeyi tek ekranda toplar:

1. **Sistem ayarları** — dosya boyutu/tip sınırları (faaliyet ekleri ve öğrenci
   CV'si ayrı ayrı), saklama süreleri, KVKK aydınlatma metni. Değerler
   `sistem_ayari` tablosundadır; kod değişikliği ve yeniden dağıtım gerekmez.
   İzinli tip listesine yeni bir MIME tipi eklerseniz karşılığını
   `src/lib/depolama/yerel.ts` içindeki uzantı eşlemesine de ekleyin — yoksa
   yükleme "desteklenmeyen dosya tipi" ile düşer.
2. **Çalışma grupları** — yeni grup eklenir, kullanımdan kaldırılır.
3. **Temel etkinlik programları** — faaliyet formundaki sabit ad listesi.

Listelerde **silme yoktur, pasife alma vardır**: kullanımdan kalkmış bir çalışma
grubu silinirse o gruba yazılmış geçmiş öğrenci kayıtları anlamsızlaşırdı. Pasif
kayıt yeni seçimlerde görünmez, eski kayıtlarda durur.

## VPS'e dağıtım

```bash
npm ci
npm run build                 # .next/standalone üretir
npm run db:deploy
npm run db:seed               # yalnızca ilk kurulumda
```

`npm run build` çıktısı kendi kendine yeter (`output: "standalone"`); sunucuda
`node .next/standalone/server.js` çalışır. `public/` ve `.next/static/` bu dizine
kopyalanmalıdır.

systemd birimi:

```ini
[Unit]
Description=GençTek Bilgi Sistemi
After=network.target postgresql.service

[Service]
Type=simple
User=genctek
WorkingDirectory=/opt/genctek
EnvironmentFile=/opt/genctek/.env
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

nginx ters vekil — **erişim kaydındaki IP için `X-Forwarded-For` şarttır**:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 12m;   # serverActions.bodySizeLimit ile aynı
}
```

### Hata ekranları

`src/app/error.tsx` ve `src/app/not-found.tsx` iki farklı durumu karşılar ve
ikisi de **teknik ayrıntı göstermez**: yığın izi ve sorgu metni kişisel veri
sızdırabilir. Beklenmeyen hatada kullanıcı yalnızca Next.js'in ürettiği hata
kimliğini (`digest`) görür; ayrıntı sunucu günlüğüne yazılır ve destek istendiğinde
bu kimlikle eşleştirilir.

Kapsamı dışındaki bir kayda erişmeye çalışan kullanıcı da "bulunamadı" ekranına
düşer — "yetkiniz yok" demek kaydın var olduğunu söylerdi.

Oturumu düşmüş kullanıcı hata ekranı görmez, giriş ekranına yönlendirilir: süresi
dolan oturum bir arıza değil, olağan bir durumdur.

### Güvenlik notları

- **Oturum anahtarı.** `OTURUM_GIZLI_ANAHTARI` örnek değerde bırakılırsa uygulama
  `NODE_ENV=production` ile **açılmaz**. Anahtar çerez imzasını üretir; depoda
  yazılı bir değerle imzalanan oturum taklit edilebilir.
- **Güvenlik başlıkları** `next.config.ts` içindedir (`X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`), vekilde değil — sunucu
  taşındığında geride kalmasınlar diye.
- **HTTPS zorunlu.** Oturum çerezi üretimde `secure` işaretlidir; TLS olmadan
  giriş çalışmaz. HSTS başlığını nginx tarafında verin (sertifika yenilenene
  kadar geri dönüşü olmadığı için uygulamaya gömülmedi).
- **Yüklenen dosyalar** web kökünün dışında durur ve yalnızca kapsam kontrolünden
  geçen indirme rotasından servis edilir; `DEPOLAMA_YEREL_DIZIN`'i nginx'e
  açmayın.
- **Veritabanı** yalnızca `localhost`'tan dinlemeli; uygulama için ayrı bir
  PostgreSQL kullanıcısı açın, `postgres` süper kullanıcısını kullanmayın.

### Yedekleme

Yedeklenmesi gereken **iki** şey var: veritabanı ve yüklenen dosyalar. Yalnızca
biri yedeklenirse geri yükleme sonrası faaliyet ekleri kayıt olarak var ama
dosya olarak yok görünür.

```bash
# Günlük — veritabanı
0 2 * * * pg_dump -Fc genctek > /yedek/genctek-$(date +\%F).dump

# Günlük — yüklenen dosyalar
30 2 * * * tar czf /yedek/depolama-$(date +\%F).tar.gz /opt/genctek/depolama
```

Geri yükleme: `pg_restore -d genctek -c /yedek/genctek-YYYY-AA-GG.dump`.
Yedekler öğrenci kişisel verisi içerir; sunucu dışına alınıyorsa şifrelenmeli ve
saklama süresi bu belgedeki politikayla uyumlu olmalıdır.

## Karar bekleyen maddelerde kullanılan varsayımlar

Skill bu maddelerde karar verilmemesini söylüyor. Kullanıcı "VPS'e yükleyeceğim,
sonra değişebilir" dediği için skill'in kendi önerileri varsayılan alındı; hepsi
tek yerden değiştirilebilir:

| Madde | Varsayılan | Nerede değişir |
|---|---|---|
| Görsel/belge boyut sınırı | 5 MB / 10 MB | `sistem_ayari` tablosu |
| Faaliyet–çalışma grubu ilişkisi | Etiket (başvuruyu kısıtlamaz) | `faaliyet_calisma_grubu` |
| Dosya depolama hedefi | Yerel disk (soyutlama arkasında) | `DEPOLAMA_SAGLAYICI` |
| Yorumda "şikayet et" | Yok; yetkili silmesi çalışıyor | — |

Farklı karar verirseniz bu tabloya bakarak tek noktadan değiştirebilirsiniz.

### Artık varsayım olmayanlar

Şu maddeler karara bağlandı; tabloda yer almıyorlar çünkü değiştirilebilir bir
ayar değil, uygulanmış kural hâline geldiler:

- **Öğrenci başına çalışma grubu üst sınırı yok.** `OGRENCI_CALISMA_GRUBU_UST_SINIRI`
  ayarı kaldırıldı (migration mevcut kaydı da siliyor).
- **Danışman öğretmen il koordinatörü yapılabilir.** Atama engellenmez; danışmanlığı
  kapanır, öğrencileri devir kurallarına göre dağıtılır ve proje yöneticisine
  "X öğrenci yeniden dağıtıldı" uyarısı gösterilir (`src/lib/rol/koordinator.ts`).
- **Kontenjan aktif başvuru sayısını sınırlar**, yalnızca seçilenleri değil; dolu
  kontenjan artık "yedek listesi" değil kapalı kapı demektir.
- **Etkinlik kategorisi kapsamdan ayrı, zorunlu bir alandır.** Faaliyetin çalışma
  grubu etiketiyle (konu alanı) karıştırılmamalı — o hâlâ karar bekliyor.

## Kapsam dışı

Mezun modülü (analiz dokümanı 1.3), çalışma grubu sohbet odaları ve faaliyete
TOPLU öğrenci ekleme bilinçli olarak yapılmadı. Tek tek öğrenci adına başvuru
yapılabiliyor (bkz. *Öğretmen ve vekaleten başvuru*); toplu ekleme, kontenjan
kilidini tek tek başvuruyla aynı güvenlikte tutmayı zorlaştırdığı için ayrı bir
faz olarak bırakıldı.

İl bazlı paydaş bilgi sistemi ARTIK kapsam dışı DEĞİL: uygulandı (bkz.
*Paydaş envanteri*).

Rozet sistemi kapsam dışı **değil**: türetilmiş rozetlerle uygulandı (bkz.
*Kazanımlar ve rozetler*). `domain-rules.md` Bölüm 13'teki elle verilen kazanım
kategorileri (belge, sertifika) hâlâ Faz 2'dedir; o aşamada yeni tablo açmak
yerine `ogrenci_kazanim` tablosunun `tip` alanı genişletilecek.
