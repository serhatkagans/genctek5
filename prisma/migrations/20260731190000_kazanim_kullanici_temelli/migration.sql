-- Kazanım kayıtları artık ÖĞRETMENİN de girebildiği kayıtlar.
--
-- Öğretmen paneline katkı sistemi eklendi: bir öğretmen de dışarıda katıldığı
-- etkinliği, geliştirdiği ürünü, verdiği eğitimi ve derece aldığı yarışmayı
-- profiline yazabiliyor. Kayıt aynı kayıt — alanları, doğrulaması ve gösterimi
-- birebir aynı; değişen yalnızca ekrandaki etiketler ("verdiğim akran
-- eğitimleri" / "verdiğim eğitimler").
--
-- Bu yüzden İKİNCİ TABLO AÇILMADI, mevcut tablo dürüst adına kavuşturuldu:
-- `ogrenci_kazanim` adında bir tabloya öğretmen satırı yazmak, sonraki her
-- okuyucuya "burada ne işi var" dedirtirdi. Ayrı bir `ogretmen_kazanim` tablosu
-- ise aynı dört tipi, aynı sınırları ve aynı ekranları ikiye kopyalar, ikisi
-- zamanla ayrışırdı. Aynı karar `basvuru` tablosunda da verilmişti: katılımcı
-- öğretmen de olabildiği için sütun `ogrenci_id` değil `katilimci_id`'dir.
--
-- Yeniden adlandırma VERİ TAŞIMAZ: satırlar, id'ler ve yabancı anahtarlar
-- yerinde kalır. Tabloyu yeniden yaratıp veriyi kopyalamak, aynı sonuç için
-- öğrencilerin kazanım geçmişini riske atmak olurdu.

ALTER TABLE "ogrenci_kazanim" RENAME TO "kullanici_kazanim";
ALTER TABLE "kullanici_kazanim" RENAME COLUMN "ogrenci_id" TO "kullanici_id";

-- Kısıt ve indeks adları tabloyla birlikte taşınmaz; Prisma'nın beklediği
-- adlara elle çevriliyor. Adlar tutmazsa şema karşılaştırması her migrate
-- çalıştırmasında fark görür ve gereksiz migration üretmeye çalışır.
ALTER TABLE "kullanici_kazanim" RENAME CONSTRAINT "ogrenci_kazanim_pkey"
  TO "kullanici_kazanim_pkey";
ALTER TABLE "kullanici_kazanim" RENAME CONSTRAINT "ogrenci_kazanim_ogrenci_id_fkey"
  TO "kullanici_kazanim_kullanici_id_fkey";
ALTER TABLE "kullanici_kazanim" RENAME CONSTRAINT "ogrenci_kazanim_temel_etkinlik_programi_id_fkey"
  TO "kullanici_kazanim_temel_etkinlik_programi_id_fkey";

ALTER INDEX "ogrenci_kazanim_ogrenci_id_idx"
  RENAME TO "kullanici_kazanim_kullanici_id_idx";
ALTER INDEX "ogrenci_kazanim_temel_etkinlik_programi_id_idx"
  RENAME TO "kullanici_kazanim_temel_etkinlik_programi_id_idx";
