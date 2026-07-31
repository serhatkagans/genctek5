/**
 * Eğitim-öğretim yılı hesapları.
 *
 * Öğretmen envanterinde istenen "görev aldığı eğitim-öğretim yılı(ları)" ayrı
 * bir sütunda TUTULMAZ: rol kayıtları zaten başlangıç ve bitiş tarihiyle
 * geçmişli duruyor (kullanici_rol). İkinci bir yer tutulsaydı rol devri ya da
 * görevden ayrılma sırasında ikisi ayrışır ve hangisinin doğru olduğu
 * bilinemezdi.
 *
 * Bu dosya veritabanına BAKMAZ; kurallar birim testlerle doğrulanır.
 */

/**
 * Eğitim-öğretim yılının başladığı ay (Eylül). Date'in ay numarası 0'dan
 * başladığı için 8'dir.
 *
 * Sınır Eylül'ün 1'idir: Ağustos'ta atanan bir öğretmen o yıla değil, birkaç
 * hafta sonra başlayacak yeni yıla sayılır demek yanlış olurdu — Ağustos hâlâ
 * bir önceki yılın idari dönemidir.
 */
const YIL_BASLANGIC_AYI = 8;

/** Verilen anın hangi eğitim-öğretim yılına düştüğü ("2025-2026"). */
export function egitimOgretimYili(tarih: Date): string {
  const yil = tarih.getFullYear();
  const baslangicYili = tarih.getMonth() >= YIL_BASLANGIC_AYI ? yil : yil - 1;
  return `${baslangicYili}-${baslangicYili + 1}`;
}

/** "2025-2026" biçimindeki ve iki yılı ardışık olan değerleri kabul eder. */
export function yilBicimiGecerliMi(yil: string): boolean {
  const eslesme = /^(\d{4})-(\d{4})$/.exec(yil.trim());
  if (!eslesme) return false;
  return Number(eslesme[2]) === Number(eslesme[1]) + 1;
}

export interface YilAraligi {
  /** Yılın ilk anı (1 Eylül 00:00). */
  baslangic: Date;
  /** Yılın son anı (31 Ağustos 23:59:59.999). */
  bitis: Date;
}

/**
 * Eğitim-öğretim yılını takvim aralığına çevirir. Geçersiz biçimde null döner:
 * filtre değerleri adres çubuğundan geliyor ve doğrulanmamış bir değerin
 * sorguya sızması, sorguyu sessizce yanlış bir aralıkla çalıştırırdı.
 */
export function egitimOgretimYiliAraligi(yil: string): YilAraligi | null {
  if (!yilBicimiGecerliMi(yil)) return null;
  const baslangicYili = Number(yil.trim().slice(0, 4));
  return {
    baslangic: new Date(baslangicYili, YIL_BASLANGIC_AYI, 1, 0, 0, 0, 0),
    bitis: new Date(baslangicYili + 1, YIL_BASLANGIC_AYI, 0, 23, 59, 59, 999),
  };
}

export interface GorevAraligi {
  baslangicTarihi: Date;
  /** null ise görev sürüyor. */
  bitisTarihi: Date | null;
}

/**
 * Rol kayıtlarının kapsadığı eğitim-öğretim yıllarını, eskiden yeniye sıralı
 * ve tekrarsız verir.
 *
 * Süren görevin bitişi `simdi` sayılır: "2020'de başladı, hâlâ görevde"
 * durumunda listenin sonsuza kadar uzamaması için. Aynı yılda başlayıp biten
 * iki ayrı rol tek yıl olarak görünür — soru "hangi yıllarda görev aldı",
 * "kaç rol aldı" değil.
 */
export function gorevYillari(
  araliklar: readonly GorevAraligi[],
  simdi: Date = new Date(),
): string[] {
  const yillar = new Set<string>();

  for (const aralik of araliklar) {
    const bitis = aralik.bitisTarihi ?? simdi;
    // Bozuk kayıt (bitiş başlangıçtan önce) sessizce atlanmaz: en azından
    // başladığı yıl sayılır, çünkü göreve gerçekten başlanmıştır.
    if (bitis < aralik.baslangicTarihi) {
      yillar.add(egitimOgretimYili(aralik.baslangicTarihi));
      continue;
    }

    const ilkYil = Number(egitimOgretimYili(aralik.baslangicTarihi).slice(0, 4));
    const sonYil = Number(egitimOgretimYili(bitis).slice(0, 4));
    for (let yil = ilkYil; yil <= sonYil; yil += 1) {
      yillar.add(`${yil}-${yil + 1}`);
    }
  }

  return [...yillar].sort();
}

/** Yıl listesini ekranda gösterilecek metne çevirir. */
export function gorevYillariYaz(yillar: readonly string[]): string {
  return yillar.length === 0 ? "—" : yillar.join(", ");
}
