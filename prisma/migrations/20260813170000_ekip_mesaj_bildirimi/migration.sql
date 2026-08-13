-- Ekip sohbetinde yeni mesaj bildirimi (13 Ağustos 2026).
--
-- İSTEK: ekibe eklenme bildirimi vardı ama sonraki mesajlar için yoktu; üye
-- sohbete yazıldığını ancak ekrana girince görüyordu.
--
-- ===========================================================================
-- BİLDİRİM METNİNDE MESAJ İÇERİĞİ YOK
-- ===========================================================================
-- Metin yalnızca "şu ekipte yeni mesaj var" der; yazan kişinin adını ve mesajı
-- taşımaz. İki sebep:
--
--   1. TEKRAR ENGELİ İÇERİK KARŞILAŞTIRIR (bkz. lib/bildirim/gonder.ts):
--      okunmamış aynı başlık+gövde varsa ikinci kayıt açılmaz. Metin sabit
--      olduğu için bir ekipteki arka arkaya on mesaj TEK bildirim üretir ve
--      panel aynı satırın kopyalarıyla dolmaz. Yazan adı metne konsaydı her
--      farklı kişi yeni bir satır açardı.
--   2. BİLDİRİMİN E-POSTA KOPYASI ÇIKIYOR (bkz. eposta-kopyasi.ts). Ekip
--      sohbeti ekosistem içi bir kanaldır; içeriğinin e-postayla dışarı
--      taşınması, sohbeti okuyabilecek kitleyi sessizce genişletirdi.
--
-- ===========================================================================
-- BİLDİRİM HEDEFİ: EKİP
-- ===========================================================================
-- BildirimHedefTipi'ne ikinci değer ekleniyor. Hedefi olan bildirim panelde
-- "Ekibe git" düğmesine dönüşür (bkz. lib/bildirim/hedef.ts); düğme olmasaydı
-- kullanıcı ekibini iki ayrı kapıdan (üyeyse Panel kartı, koordinatörse
-- Yönetim Paneli kartı) kendisi aramak zorunda kalırdı.
ALTER TYPE "BildirimHedefTipi" ADD VALUE IF NOT EXISTS 'EKIP';

INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'EKIPTE_YENI_MESAJ',
  '{{ekipAdi}} ekibinde yeni mesaj',
  'Merhaba,' || chr(10) || chr(10) ||
  '"{{ekipAdi}}" ekibinin sohbetine yeni mesaj yazıldı. Okumak için bildirimdeki bağlantıyı kullanabilir ya da Ekiplerim kartından ekibe girebilirsiniz.' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;
