-- Erişim logu hedef tipleri: denetim ekranı ve yönetim ekranları için.
--
-- ERISIM_LOGU değeri, denetim kayıtlarına kimin baktığının da kayda geçmesi
-- içindir: denetçi denetimsiz kalmaz (KVKK, domain-rules.md Bölüm 10).
ALTER TYPE "LogHedefTip" ADD VALUE IF NOT EXISTS 'ERISIM_LOGU';
ALTER TYPE "LogHedefTip" ADD VALUE IF NOT EXISTS 'SISTEM_AYARI';
ALTER TYPE "LogHedefTip" ADD VALUE IF NOT EXISTS 'CALISMA_GRUBU';
ALTER TYPE "LogHedefTip" ADD VALUE IF NOT EXISTS 'ETKINLIK_PROGRAMI';
