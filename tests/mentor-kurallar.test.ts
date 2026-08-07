import {
  MENTOR_KONULARI_AZAMI,
  mentorKapsamiYaz,
  mentorlukKabulEdilirMi,
  mentorlukKarariGecerliMi,
  mentorluguAktifMi,
} from "@/lib/mentor/kurallar";

/**
 * Mentörlük kuralları (7 Ağustos 2026).
 *
 * İstek iki yerden geldi ve tek kayıtta toplandı:
 *   · "Öğretmen hesabında 'mentör başvurusu yap' bölümü ekleyelim..."
 *   · "Paydaş/Mentör başvurusu tek bir formdan yapılacak."
 *
 * Sınanan şey ekran değil KARARDIR: hangi başvuru kabul edilir, hangi karar
 * geçerlidir, kim aktif mentör sayılır.
 */

const GRUPLAR = [1, 2, 3];

function girdi(ozellikler: Record<string, unknown> = {}) {
  return {
    grupIdleri: [] as unknown[],
    konular: "",
    gecerliGrupIdleri: GRUPLAR,
    ...ozellikler,
  };
}

describe("mentörlük başvurusunun kabulü", () => {
  it("çalışma grubu seçilmişse kabul eder", () => {
    const karar = mentorlukKabulEdilirMi(girdi({ grupIdleri: ["2"] }));
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.grupIdleri).toEqual([2]);
  });

  it("yalnızca serbest konu yazılmışsa da kabul eder", () => {
    // "hatta mümkünse diğer mentörlük konuları ekleyebilsin" — sabit grup
    // listesi mentörlüğün tamamını taşımıyor.
    const karar = mentorlukKabulEdilirMi(girdi({ konular: "  Arduino  " }));
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) {
      expect(karar.konular).toBe("Arduino");
      expect(karar.grupIdleri).toEqual([]);
    }
  });

  it("ikisi de boşsa reddeder", () => {
    /*
     * Boş bir mentörlük, öğrencinin hangi konuda başvuracağını bilemeyeceği
     * bir kayıttır: panoda görünür ama hiçbir ilana eşleşmez.
     */
    const karar = mentorlukKabulEdilirMi(girdi({ konular: "   " }));
    expect(karar.olurMu).toBe(false);
  });

  it("listede olmayan grup kimliğini eler", () => {
    // Form girdisine güvenilseydi kapatılmış bir gruba mentörlük beyan
    // edilebilirdi.
    const karar = mentorlukKabulEdilirMi(
      girdi({ grupIdleri: ["2", "99"], konular: "" }),
    );
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.grupIdleri).toEqual([2]);
  });

  it("tekrarlanan grubu teke indirir", () => {
    // Junction tablonun birincil anahtarı çakışırdı.
    const karar = mentorlukKabulEdilirMi(girdi({ grupIdleri: ["3", "3", "1"] }));
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.grupIdleri).toEqual([3, 1]);
  });

  it("sayıya çevrilemeyen kimliği eler", () => {
    const karar = mentorlukKabulEdilirMi(
      girdi({ grupIdleri: ["abc"], konular: "Robotik" }),
    );
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.grupIdleri).toEqual([]);
  });

  it("konu üst sınırını aşarsa reddeder", () => {
    const karar = mentorlukKabulEdilirMi(
      girdi({ konular: "x".repeat(MENTOR_KONULARI_AZAMI + 1) }),
    );
    expect(karar.olurMu).toBe(false);
  });
});

describe("mentörlük kararı", () => {
  it("bekleyen başvuruyu onaylar", () => {
    const karar = mentorlukKarariGecerliMi({
      mevcutDurum: "BEKLIYOR",
      yeniDurum: "ONAYLANDI",
      retGerekcesi: "",
    });
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.retGerekcesi).toBeNull();
  });

  it("gerekçesiz reddi kabul etmez", () => {
    // Gerekçesiz ret, kişiye tekrar başvururken neyi düzelteceğini söylemez.
    const karar = mentorlukKarariGecerliMi({
      mevcutDurum: "BEKLIYOR",
      yeniDurum: "REDDEDILDI",
      retGerekcesi: "   ",
    });
    expect(karar.olurMu).toBe(false);
  });

  it("zaten karara bağlanmış kaydı ikinci kez karara bağlamaz", () => {
    /*
     * İkinci onay, karar tarihini sessizce kaydırır ve "ne zaman onaylandı"
     * sorusunun cevabını bozar.
     */
    const karar = mentorlukKarariGecerliMi({
      mevcutDurum: "ONAYLANDI",
      yeniDurum: "ONAYLANDI",
      retGerekcesi: "",
    });
    expect(karar.olurMu).toBe(false);
  });

  it("bırakılmış kaydı da doğrudan karara bağlamaz", () => {
    // Doğru yol kişinin yeniden başvurmasıdır; o zaman kayıt BEKLIYOR'a döner.
    const karar = mentorlukKarariGecerliMi({
      mevcutDurum: "BIRAKILDI",
      yeniDurum: "ONAYLANDI",
      retGerekcesi: "",
    });
    expect(karar.olurMu).toBe(false);
  });
});

describe("aktif mentörlük", () => {
  it("yalnızca ONAYLANDI aktiftir", () => {
    expect(mentorluguAktifMi("ONAYLANDI")).toBe(true);
    expect(mentorluguAktifMi("BEKLIYOR")).toBe(false);
    expect(mentorluguAktifMi("REDDEDILDI")).toBe(false);
    expect(mentorluguAktifMi("BIRAKILDI")).toBe(false);
    expect(mentorluguAktifMi(null)).toBe(false);
  });
});

describe("mentör kapsamının yazılışı", () => {
  it("grup adlarıyla serbest konuları tek listede birleştirir", () => {
    /*
     * Öğrenci için ikisi de "bu kişi neyi biliyor" sorusunun cevabıdır;
     * hangisinin sabit listeden geldiği onu ilgilendirmiyor.
     */
    expect(mentorKapsamiYaz(["Robotik", "Siber Güvenlik"], "Arduino")).toBe(
      "Robotik · Siber Güvenlik · Arduino",
    );
  });

  it("konu boşsa yalnızca grupları yazar", () => {
    expect(mentorKapsamiYaz(["Robotik"], "   ")).toBe("Robotik");
  });

  it("hiçbiri yoksa boş döner", () => {
    expect(mentorKapsamiYaz([], null)).toBe("");
  });
});
