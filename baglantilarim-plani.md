# Bağlantılarım — LinkedIn tarzı liste

**Açıldı:** 12 Ağustos 2026 · **Durum:** A1–A3 yapıldı, `baglantilarim-birlesik`
dalında `a01e87f`. Kalanlar aşağıda işaretli.

İlk istek: *"bağlantılarım sayfasını basit şekilde linkedin tarzına benzetebilir
miyiz."* Aynı gün genişledi: *"yazışmalar ve bağlantılar isminde iki bölüm var,
onları birleştirip linkedin tarzı bir bölüm yapmak istiyorum"* + *"menüdeki
bağlantılarım alanında olsun"*.

---

## Hangi ekran

`src/app/panel/yazismalar/page.tsx` — menüde **"Bağlantılarım"** yazan sayfa.

**Bu kart açılırken iki ayrı ekrandı ve ayrı kalacağı yazıyordu; o karar
değişti.** `src/app/panel/baglantilar/page.tsx` (onay ekranı — danışman/
koordinatör "öğrencim bu teması kursun mu" kararını verir) bu sayfanın içinde
eridi, adresi yönlendirmeye indi. Sunucu eylemleri
`yazismalar/baglanti-eylemleri.ts`'e taşındı.

## Nasıldı

Düz `<ul>`, her satırda altı çizili mavi link `Ali Yılmaz ↔ Ayşe Demir`,
altında `3 mesaj · 12.08.2026 · gözetim`. Bir bağlantı listesi gibi durmuyordu.

---

## Verilmiş kararlar

**1. Satır karşı tarafı gösterir, çifti değil.**
LinkedIn kartı "sen ↔ o" demez, o kişiyi gösterir. Taraf olunan konuşmalarda
satır tek isim olur.

**2. Gözetim satırı çift isim kalır.**
Danışman/koordinatör başkasının konuşmasına bakarken bağlantı onun değildir;
tek isme indirmek gözetimi gizler. `tarafMi` zaten hesaplanıyor
(`page.tsx:101`), ayrım ucuz.

**3. Avatar baş harf çemberidir, fotoğraf değil.**
Stil `mentorluk/page.tsx:83-88`'den birebir alınır — yeni tasarım dili
çıkmasın. Fotoğraf kapsam dışı, gerekçesi aşağıda.

**4. Altı çizili mavi link kalkar, satırın tamamı tıklanır.**
Sağ uçta ikincil buton görünümü. Bu bir `<span>` olmalı: `<a>` içine `<a>`
geçersiz HTML'dir ve ikisi de aynı adrese gidiyor.

**5. Uyarı kutusuna ve onay kartına DOKUNULMAZ.**
Bu turda sadece liste. İkisi için önerilen değişiklikler "Sonraya" bölümünde.

---

## Açık kararlar

Bunlar sorulmadan kodlanmaz.

**S1 · Gizlilik uyarısının yeri.** Şu an sayfanın tepesinde sarı `BilgiKutusu`,
**olduğu yerde bırakıldı** — birleştirme turunda dokunulmadı. Seçenekler duruyor:
`KatlanabilirKart` olsun · ince şerit · ilk girişte tam sonra şerit · listenin
altına insin. **Hâlâ kullanıcının tercihi.**

**S2 · Gözetim satırının avatarı.** ~~Onay bekliyor.~~ **Uygulandı:** gözetim
satırında nötr çember + `Users` ikonu, taraf satırında baş harf.

**S3 · Alt başlık ne yazacak.** **Uygulandı:** taraf satırında `sinif ?? brans`,
sonra kurum adı; gözetim satırında `isteyen kurumu → hedef kurumu`. Boş olanlar
atlanıyor (`altBasligiYaz`).

---

## Adımlar

- [x] **A1 · Sorguya alan ekle.** `baglantiIstegi.isteyen/hedef` seçimine
      `sinif` ve `brans`. `kurum` zaten var. Tek `findMany`, ek sorgu yok.

- [x] **A2 · Satır bileşeni.** Avatar + ad + alt başlık + meta satırı + sağda
      eylem görünümü. `tarafMi` dalı burada. Hedef görünüm:

      ┌────────────────────────────────────────────────────────┐
      │  ╭──╮  Ayşe Demir                            [ Mesaj ] │
      │  │AD│  11-A · Atatürk Anadolu Lisesi                   │
      │  ╰──╯  3 mesaj · 12 Ağustos                            │
      └────────────────────────────────────────────────────────┘
      ┌────────────────────────────────────────────────────────┐
      │  ╭──╮  Ali Yılmaz ↔ Ayşe Demir      [gözetim] [ Aç ]   │
      │  │👥│  Cumhuriyet Lisesi → Atatürk Anadolu Lisesi      │
      │  ╰──╯  7 mesaj · 9 Ağustos · kapatıldı                 │
      └────────────────────────────────────────────────────────┘

- [x] **A3 · Liste kabı.** `divide-y` yerine `space-y` + kart çerçeveli
      satırlar. Boş durum metni korunur.

- [x] **A4a · Birleştirme.** Onay ekranı sayfanın içine alındı, eski adres
      yönlendirmeye indi, eylemler taşındı, menü yorumu güncellendi.

- [x] **A4b · Statik doğrulama.** `npx tsc --noEmit` temiz, `npx eslint`
      temiz, `npx jest` 871/871 geçti.

- [x] **A4c · Ekranı aç.** Yapıldı; veritabanında hiç bağlantı kaydı yoktu,
      `.tmp-baglanti-deneme-verisi.mjs` ile örnek veri kuruldu (danışman #660
      Ahmet Öztürk, öğrencisi #662 Yusuf Demir). Görülenler:
      - öğrenci → tek isim + `10-B · Kadıköy Anadolu Lisesi` + `Mesaj`,
      - danışman → bekleyen istek kartı, kendi bağlantısı (`kapatıldı`),
        gözetim satırı (`↔` + `gözetim` rozeti + `Aç`), katlı karar arşivi,
      - bağlantısız kullanıcı → boş durum metni,
      - `/panel/baglantilar` → 307 `/panel/yazismalar#istekler`.

      Çıkan kusur düzeltildi: gözetim satırı aynı okulu iki kez yazıyordu.

- [ ] **A4d · Onayla/Reddet düğmelerine gerçekten bas.** Sunucu eylemi
      sürülmedi; `#istekler` çapasına dönüş yalnızca koddan okundu. Ekran
      görüntüsü de alınamadı (tarayıcı eklentisi bağlı değildi) — sayfa HTTP
      ile çekilip metni okundu, yani **yerleşim gözle görülmedi.**

---

## Kapsam dışı (bilerek)

**Profil fotoğrafı.** `Kullanici.fotoDepolamaYolu` var ama servis eden route
yalnızca ikisi: `panel/mentorler/[id]/foto` (sadece panoyu görebilene, sadece
onaylı mentör için) ve `panel/profil/foto` (kendi fotoğrafın). Bağlantı
listesi için yeni bir yetkilendirilmiş route ve "kim kimin fotoğrafını
görebilir" kararı gerekir. Ayrı iş.

**Son mesaj önizlemesi.** Her yazışma için ek sorgu, ayrıca gözetim satırında
mesaj içeriğini liste ekranına taşır — oysa erişim loglaması detay sayfasında
yapılıyor. İstenirse önce gizlilik kararı verilmeli.

**Arama kutusu.** Öğrencinin 5–10 bağlantısı olur, liste `take: 100`.
Danışmanın uzun gözetim listesine lazım olan şey arama değil, "sadece
benimkiler / gözetim" ayrımı olur.

---

## Sonraya (bu turun parçası değil)

- ~~İletişim onayları kartını şeride indirmek.~~ **Konusuz kaldı:** kart
  kalktı, istekler doğrudan sayfada ve bekleyen yoksa hiç basılmıyor.
- **"Sadece benimkiler / gözetim" süzgeci.** Birleştirmeden sonra daha
  gerekli: danışmanın ekranında artık hem kendi bağlantıları hem gözetim
  satırları hem de istek kartı yan yana.
- **Bekleyen istek sayısını menüye rozet olarak basmak.** Kart kalktığı için
  danışman, sayfaya girmeden bekleyen iş olduğunu göremiyor; panel kartı
  (`Bekleyen bağlantı isteği`) hâlâ var ama menüde karşılığı yok.

---

## Teknik notlar

**`basHarfler` iki ayrı yerde var, imzaları farklı:**

| Dosya | İmza |
|---|---|
| `lib/mentor/kurallar.ts` | `basHarfler(adSoyad)` — tek parça ad |
| `lib/kullanici/profil-foto-kurallar.ts` | `basHarfler(ad, soyad)` — ayrı alan |

Bu ekranda `ad` ve `soyad` ayrı geliyor → **ikincisi** kullanılır. Üçüncü bir
kullanım olduğuna göre ikisini tek yerde birleştirmek ileride ayrı bir temizlik
maddesi olabilir; bu turda birleştirilmiyor, kapsam büyümesin.

**Renkler anlam adıyla yazılır** (`globals.css`): `bg-vurgu-zemin`,
`text-vurgu-metin`, `border-cizgi`, `text-metin-yumusak`. Çıplak Tailwind
rengi girmesin, iki tema tek kaynaktan besleniyor.

---

## Kartın kendisiyle ilgili

`liste.md` hâlâ `YAPILACAKLAR.md`, `YAPILACAKLAR-ARSIV.md` ve `SORULAR.md`
dosyalarına bağlantı veriyor; üçü de 7f2a21e'de silindi. Bağlantılar kırık.
Bu kartın konusu değil, ayrıca ele alınmalı.
