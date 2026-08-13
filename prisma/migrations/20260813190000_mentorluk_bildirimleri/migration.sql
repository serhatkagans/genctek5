-- Mentörlük başvurusu ve kararı için bildirim şablonları (13 Ağustos 2026).
--
-- BULGU: mentörlük, sistemdeki TEK sessiz onay kuyruğuydu. Başvuru
-- kaydediliyor (bkz. mentorluk/eylemler.ts · mentorlukBasvurEylemi) ama kimseye
-- uyarı gitmiyordu; kararı da başvurana kimse duyurmuyordu. Karşılaştırma:
-- dış giriş başvurusu, etkinlik onayı ve bağlantı isteği için iki uçta da
-- bildirim vardı.
--
-- Kuyruk ekranı 11 Ağustos'ta menüden çıkıp Yönetim Paneli'nde kart oldu; o
-- karta kendiliğinden uğramayan merkez, başvuruyu haftalarca görmeyebilirdi.
--
-- ===========================================================================
-- BAŞVURU YALNIZCA MERKEZE GİDER
-- ===========================================================================
-- Kararı yalnızca proje yöneticisi veriyor (bkz. mentorlukOnaylayabilirMi ·
-- 11 Ağustos 2026: il koordinatörü kendi başvurusunu onaylayabildiği için
-- çıkarılmıştı). Koordinatöre bilgi kopyası da çıkmıyor — yapacağı bir şey
-- olmayan uyarı, yapılacak olanı gölgeler.
--
-- ===========================================================================
-- METİN BAŞVURANIN ADINI VE ALANLARINI TAŞIR
-- ===========================================================================
-- Tekrar engeli başlık+gövde karşılaştırıyor (bkz. lib/bildirim/gonder.ts):
-- metin kişiye özel olduğu için iki farklı başvuru iki ayrı satır açar, aynı
-- kişinin okunmamış duran başvurusu ise ikinci kez düşmez.
--
-- HEDEF ALANI YOK: BildirimHedefTipi'ne üçüncü bir değer eklenmedi. Mentörlük
-- kaydının kendi sayfası yok — kuyruk bir liste ekranı, başvuranın tarafında
-- ise Panel'deki "Mentörlüklerim" kartı durumu zaten yazıyor.

INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'ONAY_BEKLEYEN_MENTORLUK',
  'Onay bekleyen mentörlük başvurusu: {{basvuranAdSoyad}}',
  'Merhaba,' || chr(10) || chr(10) ||
  '{{basvuranAdSoyad}} mentörlük başvurusu yaptı ve onayınızı bekliyor.' || chr(10) || chr(10) ||
  'Başvurduğu alanlar: {{kapsam}}' || chr(10) || chr(10) ||
  'Başvuruyu Yönetim Paneli''ndeki Mentörlük kartından inceleyip onaylayabilir ya da gerekçesiyle reddedebilirsiniz.' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;

INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'MENTORLUK_KARARI',
  'Mentörlük başvurunuz {{sonuc}}',
  'Merhaba,' || chr(10) || chr(10) ||
  'Mentörlük başvurunuz {{sonuc}}.' || chr(10) || chr(10) ||
  'Gerekçe: {{gerekce}}' || chr(10) || chr(10) ||
  'Onaylandıysa menünüzde "Mentörlüğüm" sekmesi açıldı; panodaki ilanlara oradan cevap yazabilirsiniz.' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;
