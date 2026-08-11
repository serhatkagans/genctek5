-- Özgeçmişte kabul edilen tek biçim: PDF (11 Ağustos 2026).
--
-- İSTEK: "özgeçmişimde kabul edilen tek format pdf olsun".
--
-- ===========================================================================
-- NEDEN AYAR SATIRI DA DEĞİŞİYOR
-- ===========================================================================
-- Kodun varsayılanı (lib/ogrenci/cv.ts) yalnızca ayar satırı YOKKEN geçerli.
-- Kurulu her veritabanında satır zaten var ve doc/docx içeriyor; seed de
-- mevcut satırın `deger` alanına dokunmuyor (yalnızca açıklamayı tazeliyor —
-- yöneticinin elle yaptığı düzenleme seed ile geri alınmasın diye). Yani bu
-- UPDATE olmadan kural yalnızca yeni kurulumlarda geçerli olurdu.
--
-- ===========================================================================
-- NİYE DOC/DOCX KAPANIYOR
-- ===========================================================================
-- CV, sahibinden başkasının (danışman öğretmen, koordinatör) açtığı bir
-- belgedir. Word dosyası alıcıda farklı sürümlerde farklı dizilir, makro
-- taşıyabilir ve tarayıcıda görüntülenemediği için indirilmek zorundadır.
-- PDF üçünü de çözer.
--
-- MEVCUT DOSYALAR SİLİNMEZ. Kural yeni yüklemelere uygulanır; yüklenmiş bir
-- doc/docx CV yerinde kalır ve indirilebilir. Var olan kaydı geçersiz kılmak,
-- kişinin haberi olmadan profilinden bir belgeyi düşürmek olurdu — sahibi
-- yenisini yüklediğinde eskisi zaten siliniyor (bkz. lib/ogrenci/cv.ts).
--
-- AYAR EKRANDAN DÜZENLENEBİLİR OLMAYA DEVAM EDER: proje yöneticisi Yönetim
-- ekranından tipi yeniden açabilir. Buradaki değişiklik kuralı koyar, kapıyı
-- kaynak koda çivilemez — MIME listelerinin ayarda tutulması sistemin kendi
-- tasarımı (bkz. lib/ayar.ts).
UPDATE "sistem_ayari"
SET "deger" = 'application/pdf',
    "aciklama" = 'Özgeçmiş olarak yüklenebilecek MIME tipleri. Yalnızca PDF (11 Ağustos 2026).'
WHERE "anahtar" = 'IZINLI_CV_TIPLERI';
