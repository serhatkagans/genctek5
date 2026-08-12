# Hata kimliği — ne anlama gelir?

Kullanıcı ekranda gördüğü "Hata kimliği" değeri, sunucunun ürettiği tekil hata tanımlayıcısıdır. Bu kimlik, hatanın detayını tek başına anlatmaz; ama günlükteki ilgili kayıtla birlikte hangi sunucu hatası oluştuğunu bulmamızı sağlar.

> Örnek:
> Hata kimliği: `598556021`
>
> Bu değer, hatanın "mesajından" türetilen bir özet olup Next.js tarafından üretilir. Aynı hata tekrar ederse aynı kimlik gelir; farklı hata olursa farklı kimlik oluşur.

---

## 1) Hata kimliği nasıl bakılır?

Sunucu tarafında oluşan her beklenmeyen hata kaydedilir. Bu kayıtların olduğu yer:

- `depolama/hata-gunlugu/`
- Dosya formatı: `hata-YYYY-AA.jsonl`
- Her satır bir hatayı temsil eder.

Komut:

```bash
npm run hata:ara 598556021
npm run hata:ara
```

- `npm run hata:ara 598556021` → sadece o kimliğe ait kayıtları gösterir.
- `npm run hata:ara` → son 20 hata kaydını listeler.

Yazılan kayıtta şunlar olur:

- kimlik
- zaman
- istek yolu ve metodu
- hata adı
- hata mesajı
- yığın izi

Kullanıcıya gösterilen kimlik tek başına teknik ayrıntı değildir; amaç bir referanstır. Gerçek nedenin çözümü sistem yöneticisi veya geliştirici tarafından günlükten okunur.

---

## 2) Sunucuda oluşan hata türleri ve kısa anlamları

Aşağıdaki tablo, en yaygın sunucu hatalarının kısa anlamını ve neye işaret ettiğini gösterir. "Hata kimliği" ile birlikte bu tablodaki ifadeleri karşılaştırmak gerekir.

| Hata / işaret | Kısa anlamı | Ne yapılır? |
|---|---|---|
| `PrismaClientInitializationError` | Veritabanı bağlantısı kurulamadı. Sunucu Prisma istemcisini başlatamadı. | Veritabanının çalıştığından emin olun; `baslat.bat` veya servisleri kontrol edin. |
| `ECONNREFUSED` | Veritabanı sunucusuna bağlantı reddedildi. Port kapalı ya da servis düşmüş. | DB servislerini başlatın; `.env` bağlantı bilgilerini kontrol edin. |
| `PrismaClientKnownRequestError` | Prisma sorgusu çalışırken veritabanı tarafında kural/uyumsuzluk hatası oluştu. | Hatanın mesajındaki alan/tabloları kontrol edin; göç ve şema uyumunu kontrol edin. |
| `P2025` | Kayıt bulunamadı; veritabanında istenen satır yok. | Kayıt var mı kontrol edin; erişim sırasında eklenmemiş olabilir. |
| `column ... does not exist` | Veritabanı şeması koddan geride kalmış. | `npx prisma migrate deploy` veya uygun göçü uygulayın. |
| `relation ... does not exist` | İstenen tablo/ilişki veritabanında yok. | Göçleri çalıştırın; schema ile veritabanı eşleşmesini kontrol edin. |
| `Unknown argument` | Prisma istemcisi, şemanın tanımadığı alan/parametreye bakıyor. | `npx prisma generate` çalıştırın ve sunucuyu yeniden başlatın. |
| `Unknown field` | Prisma client tarafından tanınmayan bir alan kullanıldı. | Şema ve kod arasında alan adı uyumsuzluğu var; veritabanı ve kodu eşitleyin. |
| `Body exceeded ... limit` | İstek gövdesi izin verilen boyut sınırını aştı. | Dosya yükleme veya büyük istek boyutunu artırın; `next.config.ts` içindeki `bodySizeLimit` kontrol edilir. |
| `PayloadTooLargeError` | İstek gövdesi çok büyük; sunucu bunu reddetti. | Yüklenen dosyanın boyutunu küçültün veya sunucu sınırını ayarlayın. |
| `ENOENT` | Dosya veya dizin bulunamadı. | Depolama yolu, upload klasörü veya dosya konumunu kontrol edin. |
| `EACCES` | Dosya yazma/erişim izni yok. | Klasör izinlerini kontrol edin; uygulama kullanıcı adına yazma hakkı verin. |
| `Cannot read properties of undefined` | Bir nesne veya değer `undefined` olduğu için işlenemedi. | Kodda eksik alan/parametre kontrolü yapılmalı; `?.` güvenliği eklenebilir. |
| `Cannot read properties of null` | `null` değeri üzerinde özellik okunmaya çalışıldı. | Veri gelmeden önce kontrol ekleyin; boş veri akışını yönetmek gerekir. |
| `ReferenceError` | Tanımlanmamış bir değişken kullanıldı. | Kodda değişken adı yanlış mı, import eksik mi kontrol edin. |
| `TypeError` | Veri tipi beklenen biçimde değil. | String/number/object dönüşümlerini ve null kontrolünü denetleyin. |
| `SyntaxError` | JavaScript/TypeScript kodu çözümlenemedi veya JSON hatalı. | Kod yazım hatası veya bozuk JSON/JSONL kontrolü gerekir. |
| `Next.js 500` / `Internal Server Error` | Sunucuda beklenmeyen bir hata oluştu; sayfa açma sırasında genel hata. | Durumunu daha detaylı günlükten görün; hata mesajı ve yığın izi kontrol edilir. |
| `NotFound` / `404` | İstek var olan bir rota, dosya veya kayıt değil. | Rota, parametre, dosya yolu veya veritabanı kaydı kontrol edilir. |
| `Unauthorized` / `Forbidden` | Kullanıcı yetkisi yok. | Kullanıcının rolü, oturum bilgisi ve izin kontrolü yapılır. |
| `Bad Request` | İstek formatı veya veri yapısı uygunsuz. | Form alanları, query, body, validation doğrulaması kontrol edilir. |
| `TimeoutError` | Sunucu/DB/harici sistem yanıt vermedi. | Ağ bağlantısı, DB gecikmesi veya dış servis erişimi kontrol edilir. |
| `Failed to fetch` | Harici servis veya API çağrısı başarısız oldu. | API adresi, ağ erişimi, CORS ve servis durumunu kontrol edin. |

---

## 3) En sık görülen yerel açıklamalar

Bu projede en sık çıkan sorunlar için aşağıdaki kısa açıklamalar geçerlidir:

| Sorun | Anlamı | Hızlı yorum |
|---|---|---|
| `PrismaClientValidationError: Unknown field ...` | Model ve prisma client arasında alan adı uyuşmuyor. | Kod çalıştırıldı ama Prisma istemcisi eski bellekte kalmış olabilir. |
| `relation ... does not exist` | Veritabanı göçü uygulanmadı. | `prisma migrate` veya uygun script çalıştırılmalı. |
| `column ... does not exist` | Şema koddan geride. | Son çalıştırılan schema değişikliğinin DB'ye yansıtılması gerekir. |
| `ECONNREFUSED` | Veritabanı servis erişilemez. | Veritabanı açıldı mı; port doğru mu; `.env` doğru mu? |
| `ENOENT` / `EACCES` | Depolama klasörü yok veya yazma izni yok. | Depolama yolu ve izinleri kontrol edilmelidir. |
| `Body exceeded ...` | Dosya veya istek çok büyük. | Büyük yükleri kabul edecek şekilde sınır kontrol edilmelidir. |
| `Unknown field / Unknown argument` | Prisma şeması ile uygulama koduın eski/uyumsuz. | `prisma generate` ve yeniden başlatma gerekir. |
| `Yetkiniz yok` / `Bulunamadı` | Bu hata değil; iş kuralı doğru çalışıyor. | Bu ekranlar kullanıcıya bilgi vermek için tasarlanmıştır. |

---

## 4) Ne zaman yeniden başlatmak gerekir?

Prisma veya veritabanı yapısı değiştiğinde sunucuyu yeniden başlatmak çok önemlidir:

```bash
npx prisma generate
npx prisma migrate deploy
# sonra sunucu / servis yeniden başlatılır
```

Not: Kod değişimi HMR ile görünür hale gelebilir; ancak çalışan süreçteki Prisma istemcisi ve belleği otomatik olarak değişmez. Bu yüzden bazı hatalar sayfada görünür, ama arka plandaki route veya veritabanı erişim katmanı hâlâ eski istemcide çalışmaya devam eder.

---

## 5) Hata günlüğüne bakma kuralı

Bir hata görünür görünmez ilk yapılacak iş:

1. Hata kimliğini not alın.
2. `npm run hata:ara <kimlik>` komutunu çalıştırın.
3. Hata adını, mesajını ve yığın izini okuyun.
4. Hatanın ilk satırında hangi sistem hatası göründüğünü kontrol edin.
5. Hata tipi, DB, dosya, izin veya valitasyon ise uygun adımı uygulayın.

> Kısa özet: Hata kimliği bir "tanımlayıcıdır"; hata açıklaması o kimlikten hangi sunucu sorunuyla karşılaşıldığını anlatır.

---

## 6) Hata kaydı ve güvenlik

Hata günlüğü, teknik hata kaydıdır. Oraya yazılan bilgiler şunlardır:

- zaman
- yol
- yöntem
- hata adı
- mesaj
- yığın izi

Aşağıdakiler yazılmaz:

- form değerleri
- kullanıcı adı
- session çerezleri
- kişisel veriler
- şifreler

Bu yüzden hata kaydı, sistem yöneticisinin anlaşılması için yeterli bir referans oluşturur; ancak kullanıcı verilerini açığa çıkaracak bir veri deposu değildir.

---

## 7) Sık kullanılan hata durumları için kısa kılavuz

| Durum | Anlamı |
|---|---|
| Veritabanı hatası | DB yok, kapalı, erişilemez, şema eski veya tablo eksik. |
| Prisma hatası | Şema ve uygulama kodu uyumsuz; alan/parametre tekrar kontrol edilmeli. |
| İzin hatası | Depolama klasörüne yazma veya erişim izni yok. |
| Yük boyutu hatası | Dosya/istek çok büyük; limit aşılmış. |
| 404 | Yol, rota veya veri kaydı bulunamadı. |
| 500 | Sunucu beklenmeyen hataya düştü; detay günlükten bakılır. |
| Yetki hatası | Kullanıcının işlemi yapma hakkı yok. |

Bu dosya, kullanıcıya değil sistem tarafına bakma rehberi olarak düşünülmelidir. Hata kimliği tek başına açıklama değildir; birlikte kullanıldığında sebebi netleştirir.
