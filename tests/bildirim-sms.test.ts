import { smsGovdesiHazirla } from "@/lib/sms/govde";

/**
 * SMS kopyasının gövde hazırlığı — analiz dokümanı Bölüm 6.1.
 *
 * SMS uzunluk sınırlı ve ücretlidir; panel bildirimi ise sınırsız. Bu yüzden
 * gövde tek satıra indirilir ve gerekirse kırpılır.
 */

describe("sms gövdesi", () => {
  it("başlık ve içeriği tek satırda birleştirir", () => {
    expect(smsGovdesiHazirla("Başvuru sonucu", "Seçildiniz.")).toBe(
      "Başvuru sonucu: Seçildiniz.",
    );
  });

  it("satır sonlarını ve fazla boşlukları tek boşluğa indirir", () => {
    // Panel metinleri çok satırlı; SMS'te satır sonu boşa karakter harcar.
    expect(smsGovdesiHazirla("Konu", "Bir satır\n\nİkinci   satır")).toBe(
      "Konu: Bir satır İkinci satır",
    );
  });

  it("sınırı aşan metni üç noktayla kırpar", () => {
    const govde = smsGovdesiHazirla("Konu", "a".repeat(400));
    expect(govde).toHaveLength(300);
    expect(govde.endsWith("...")).toBe(true);
  });

  it("sınırın altındaki metne dokunmaz", () => {
    const govde = smsGovdesiHazirla("Konu", "kısa metin");
    expect(govde.endsWith("...")).toBe(false);
  });
});
