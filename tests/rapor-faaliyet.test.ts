import {
  faaliyetRaporuHtml,
  htmlKacir,
  type RaporVerisi,
} from "@/lib/rapor/faaliyet-raporu";

/**
 * Faaliyet raporunun Word (HTML) çıktısı.
 *
 * En kritik davranış KAÇIŞ: rapor kullanıcı metni taşıyor (faaliyet
 * açıklaması, katılımcı adları). Kaçırılmazsa açıklamaya yazılan HTML,
 * üretilen belgenin yapısını bozar.
 */

const VERI: RaporVerisi = {
  faaliyetAdi: "Robotik Atölyesi",
  aciklama: "İki günlük atölye.\nİkinci satır.",
  kapsam: "İl",
  kategori: "İl Etkinliği",
  yer: "Ankara",
  tarih: "1 Mart 2026 10:00",
  sure: "2 gün",
  duzenleyen: "Ayşe Yılmaz",
  duzenleyenBirim: "Ankara İl Koordinatörlüğü",
  kontenjan: 20,
  toplamBasvuru: 25,
  katilanSayisi: 18,
  tekilKatilimci: 18,
  katilimcilar: [
    { adSoyad: "Elif Demir", sinifVeyaBrans: "11-A", okul: "Kadıköy AL", il: "İstanbul" },
  ],
  gorselAdlari: ["acilis.jpg"],
  olusturan: "Burcu Yılmaz",
  olusturmaTarihi: "31 Temmuz 2026 14:00",
};

describe("htmlKacir", () => {
  it("HTML özel karakterlerini kaçırır", () => {
    expect(htmlKacir('<script>"x"&y')).toBe(
      "&lt;script&gt;&quot;x&quot;&amp;y",
    );
  });

  it("düz metne dokunmaz", () => {
    expect(htmlKacir("Robotik Atölyesi")).toBe("Robotik Atölyesi");
  });
});

describe("faaliyetRaporuHtml", () => {
  it("faaliyet bilgilerini yazar", () => {
    const html = faaliyetRaporuHtml(VERI);
    expect(html).toContain("Robotik Atölyesi");
    expect(html).toContain("Ankara İl Koordinatörlüğü");
    expect(html).toContain("2 gün");
  });

  it("katılım sayılarını AYRI yazar", () => {
    // Toplam ve tekil farklı sorulardır; raporda ikisi de görünmeli.
    const html = faaliyetRaporuHtml(VERI);
    expect(html).toContain("Katılan (seçilmiş)");
    expect(html).toContain("Farklı kişi sayısı");
  });

  it("katılımcıları numaralı listeler", () => {
    const html = faaliyetRaporuHtml(VERI);
    expect(html).toContain("Elif Demir");
    expect(html).toContain("11-A");
  });

  it("katılımcı yoksa boş tablo yerine açıklama yazar", () => {
    const html = faaliyetRaporuHtml({ ...VERI, katilimcilar: [] });
    expect(html).toContain("Seçilmiş katılımcı yok.");
  });

  it("görsel yoksa bunu söyler", () => {
    const html = faaliyetRaporuHtml({ ...VERI, gorselAdlari: [] });
    expect(html).toContain("Faaliyete görsel eklenmemiş.");
  });

  it("açıklamadaki satır sonlarını korur", () => {
    expect(faaliyetRaporuHtml(VERI)).toContain("İki günlük atölye.<br>İkinci satır.");
  });

  it("Türkçe karakterler için charset bildirir", () => {
    // Word, charset olmadan dosyayı Latin-1 sanıp Türkçe karakterleri bozuyor.
    expect(faaliyetRaporuHtml(VERI)).toContain('<meta charset="utf-8">');
  });

  // --- Güvenlik ---------------------------------------------------------

  it("açıklamadaki HTML'i KAÇIRIR", () => {
    const html = faaliyetRaporuHtml({
      ...VERI,
      aciklama: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("katılımcı adındaki HTML'i kaçırır", () => {
    const html = faaliyetRaporuHtml({
      ...VERI,
      katilimcilar: [
        { adSoyad: "<b>Kalın</b>", sinifVeyaBrans: null, okul: null, il: null },
      ],
    });
    expect(html).not.toContain("<b>Kalın</b>");
    expect(html).toContain("&lt;b&gt;");
  });

  it("faaliyet adındaki tırnak başlık etiketini bozmaz", () => {
    const html = faaliyetRaporuHtml({ ...VERI, faaliyetAdi: 'A "B" C' });
    expect(html).toContain("A &quot;B&quot; C");
  });
});
