# Hata kimliği — ne demek, nasıl bakılır

Kullanıcı beklenmeyen bir hatayla karşılaştığında ekranda şunu görür:

> **Beklenmeyen bir hata oluştu.** İşleminiz tamamlanamadı…
> Hata kimliği: `598556021`

Bu sayfa o kimliğin ne olduğunu, karşılığına nasıl bakılacağını ve bugüne kadar
görülen hataların ne olduğunu anlatır.

---

## 1. Kimlik nedir, neden ekranda başka bir şey yazmıyor

Kimlik, Next.js'in **digest** değeridir: hatanın **mesajından** türetilen bir
özet. Aynı hata tekrar oluşursa aynı kimlik çıkar, farklı hata farklı kimlik
verir.

Ekranda hatanın kendisi **bilinçli olarak** gösterilmez: yığın izi ve sorgu
metni öğrenci adı, kimlik numarası gibi kişisel veri sızdırabilir ve bu ekranı
gören kişi çoğu zaman öğrencinin kendisidir. Kullanıcının işi kimliği iletmek,
karşılığına bakmak sistem yöneticisinin işidir.

## 2. Kimliğin karşılığına nasıl bakılır

```
npm run hata:ara 598556021     # o kimliğe ait bütün kayıtlar
npm run hata:ara               # son 20 hata
```

Çıktı: kimlik, zaman, istek yolu (`POST /panel/etkinlikler/12/rapor` gibi),
hatanın adı ve mesajı, tam yığın izi.

**Kayıtlar nerede:** `depolama/hata-gunlugu/hata-YYYY-AA.jsonl` — aya göre bir
dosya, satır başına bir hata (JSONL). Dizin `.gitignore` içindedir, depoya
girmez.

**Ne yazılır:** kimlik, zaman, istek yolu ve yöntemi, hata adı/mesajı, yığın
izi.
**Ne yazılmaz:** form içerikleri, sorgu değerleri, oturum çerezi, kullanıcı adı.
Hata günlüğü bir olay kaydıdır, ikinci bir kişisel veri deposu değil.

Kaydı yazan yer: `src/instrumentation.ts` → `src/lib/hata-kaydi.ts`.

## 3. "Kimlik bulunamadı" diyorsa

İki sebebi olabilir:

1. **Hata, günlük açılmadan önce oluştu.** Günlük 12 Ağustos 2026'da eklendi;
   daha eski kimliklerin karşılığı hiçbir yerde saklanmadı, yalnızca o anki
   sunucu terminaline düşmüştü.
2. **Hata tarayıcıda oluştu.** İstemci tarafındaki hatalar sunucuya uğramaz;
   onlar tarayıcının geliştirici konsolunda görünür.

## 4. Sık karşılaşılan hata sınıfları

Bunlar "sistem çöktü" değil, çoğu zaman ortamın eksik olmasıdır. Yığın izindeki
ilk satır genelde hangisi olduğunu söyler.

| Belirti (mesajın içinde geçen) | Anlamı | Yapılacak |
|---|---|---|
| `column ... does not exist`, `relation ... does not exist` | Veritabanı şeması koddan geride | `npm run db:deploy` |
| `PrismaClientInitializationError`, `ECONNREFUSED` | Veritabanı çalışmıyor / adres yanlış | `baslat.bat`, sonra `npx prisma dev ls` |
| `Unknown argument`, `Unknown field` | Prisma istemcisi şemadan geride | `npx prisma generate` ve sunucuyu yeniden başlat |
| `Ortam değişkenleri hatalı` | `.env` eksik | `.env.example` ile karşılaştırın |
| `Body exceeded ... limit` | Yüklenen dosya istek sınırından büyük | `next.config.ts` · `bodySizeLimit` (şu an 12 MB) |
| `ENOENT`, `EACCES` (depolama yolunda) | Dosya dizini yok ya da yazma izni yok | `DEPOLAMA_YEREL_DIZIN` dizinini ve iznini kontrol edin |
| `Yetkiniz yok` / `Bulunamadı` sınıfı | **Hata değil**, kural işliyor | Bu ekranlar zaten kendi mesajını gösterir |

## 5. Kayda geçmiş olaylar

| Kimlik | Tarih | Ne oldu | Durum |
|---|---|---|---|
| `598556021` | 12 Ağustos 2026 | Yoklama alanları (`basvuru.katildi_mi`) koda eklendi ama göç henüz veritabanına uygulanmamıştı; o alanı okuyan her ekran (etkinlik detayı, belgeler, GençTek Yolculuğum) hata verdi. Karşılığı kayıt altına alınamadı — günlük aynı gün, bu olaydan sonra eklendi. | **Giderildi:** göç uygulandı (`20260812120000_yoklama`). |
| `4173420533`, `1230599811`, `3579813635`, `1738166923` | 12 Ağustos 2026 | `PrismaClientValidationError: Unknown field katildiMi`. Şema ve göç doğruydu; **çalışan dev sunucusu** yeniden başlatılmadığı için bellekteki Prisma istemcisi eskiydi. Aynı kök sebep, yan etkisi olarak `route.ts` uçlarını (`.../ekler/[ekId]` — etkinlik görselleri) 404'e düşürdü: görseller "yüklenmedi" değil, **servis edilemedi**. | **Giderildi:** dev sunucusu yeniden başlatıldı; `/panel/etkinlikler/*/ekler/*` artık `200 image/png`. |

> **Kural:** `prisma generate` ya da `prisma migrate` çalıştıktan sonra dev
> sunucusu **yeniden başlatılmalı**. Sıcak yenileme (HMR) kodu tazeler ama
> sürecin belleğine yüklenmiş Prisma istemcisini değiştirmez. Belirti şaşırtıcı
> olabilir: sayfalar açılır, `route.ts` uçları 404 verir.

> Yeni bir olay çıktığında bu tabloya satır ekleyin: kimlik, tarih, sebep,
> çözüm. Tablo `npm run hata:ara` çıktısının yerini tutmaz — o, ham kaydı verir;
> bu tablo **neden** olduğunu ve **ne yapıldığını** hatırlatır.
