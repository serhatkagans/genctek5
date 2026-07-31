-- Kazanım kayıtlarına "GençTek etkinlikleri" ve "Diğer" türleri.
--
-- ÖNEMLİ KARAR: GençTek etkinliklerine katılım BUGÜNE KADAR elle girilmiyordu;
-- otomatik olarak basvuru + faaliyet kayıtlarından geliyordu ve profilde
-- "Katıldığım faaliyetler" olarak görünüyordu. Elle giriş bilerek açılıyor
-- (kullanıcı kararı): sisteme hiç girilmemiş eski etkinlikler de profilde yer
-- alabilsin.
--
-- BUNUN İKİ SONUCU VAR ve kabul edilmiştir:
--   1. Aynı etkinlik hem otomatik hem elle listede görünebilir.
--   2. Kayıt bir BEYANDIR; sistem doğrulamaz.
--
-- Rozetler/nişanlar bundan ETKİLENMEZ: onlar basvuru kayıtlarından hesaplanıyor
-- (lib/kazanim/rozetler.ts), kazanım tablosundan değil. Yani beyanla nişan
-- kazanılamaz.
ALTER TYPE "KazanimTipi" ADD VALUE IF NOT EXISTS 'GENCTEK_ETKINLIGI';
ALTER TYPE "KazanimTipi" ADD VALUE IF NOT EXISTS 'DIGER';
