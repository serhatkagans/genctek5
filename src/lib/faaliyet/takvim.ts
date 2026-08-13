import type { FaaliyetDurumu, Kapsam } from "@/generated/prisma/enums";
import { basvuruPenceresi } from "./kurallar";

/**
 * Etkinlik takvimi — analiz dokümanı Bölüm 6: "Sisteme ilk girişte etkinlik
 * takvimi görülecek (geçmiş/aktif/yaklaşan)".
 *
 * Saf tutulur: veritabanına gitmez, şimdiki zamanı parametre alır. Böylece
 * "bu faaliyet bugün mü, yarın mı" kararı birim testle sınanabilir — takvim
 * ekranındaki en sinsi hata, sunucunun saatine göre kayan sınırlardır.
 */

export type TakvimBolumu = "GECMIS" | "BUGUN" | "YAKLASAN";

export interface TakvimKaydi {
  id: number;
  ad: string;
  tarih: Date;
  kapsam: Kapsam;
  durum: FaaliyetDurumu;
  basvuruBaslangic: Date;
  basvuruBitis: Date;
}

export interface Takvim<T> {
  bugun: T[];
  yaklasan: T[];
  gecmis: T[];
}

function gunBasi(tarih: Date): Date {
  return new Date(
    tarih.getFullYear(),
    tarih.getMonth(),
    tarih.getDate(),
    0,
    0,
    0,
    0,
  );
}

/**
 * Faaliyetin takvimdeki yeri.
 *
 * Karşılaştırma GÜN bazındadır, an bazında değil: sabah 10'da yapılan bir
 * etkinlik öğleden sonra bakıldığında "geçmiş" görünseydi, o günün programını
 * takip eden kullanıcı etkinliği listede kaybederdi.
 */
export function takvimBolumu(
  faaliyet: { tarih: Date },
  simdi: Date,
): TakvimBolumu {
  const gun = gunBasi(faaliyet.tarih).getTime();
  const bugun = gunBasi(simdi).getTime();

  if (gun === bugun) return "BUGUN";
  return gun > bugun ? "YAKLASAN" : "GECMIS";
}

/**
 * Faaliyetleri takvim bölümlerine ayırır.
 *
 * Yaklaşanlar en yakın tarihten uzağa, geçmişler en yeniden eskiye sıralanır:
 * iki listede de kullanıcının önce görmek istediği kayıt "şimdiye en yakın"
 * olandır.
 */
export function takvimeAyir<T extends { tarih: Date }>(
  faaliyetler: readonly T[],
  simdi: Date,
): Takvim<T> {
  const takvim: Takvim<T> = { bugun: [], yaklasan: [], gecmis: [] };

  for (const faaliyet of faaliyetler) {
    switch (takvimBolumu(faaliyet, simdi)) {
      case "BUGUN":
        takvim.bugun.push(faaliyet);
        break;
      case "YAKLASAN":
        takvim.yaklasan.push(faaliyet);
        break;
      case "GECMIS":
        takvim.gecmis.push(faaliyet);
        break;
    }
  }

  takvim.bugun.sort((a, b) => a.tarih.getTime() - b.tarih.getTime());
  takvim.yaklasan.sort((a, b) => a.tarih.getTime() - b.tarih.getTime());
  takvim.gecmis.sort((a, b) => b.tarih.getTime() - a.tarih.getTime());

  return takvim;
}

/**
 * Duyuru şeridine girecek faaliyetler: başvuru penceresi AÇIK olanlar.
 *
 * İptal edilmiş faaliyet şeride girmez — penceresi teknik olarak açık kalmış
 * olabilir ama başvuru alınmıyor ve şerit "şimdi başvurabilirsin" demektir.
 * Sıra, başvurusu önce KAPANACAK olandan başlar: kaçırılma riski en yüksek
 * olan kayıt en önde durmalı.
 */
export function seritteGosterilecekler<
  T extends { basvuruBaslangic: Date; basvuruBitis: Date; durum: FaaliyetDurumu },
>(faaliyetler: readonly T[], simdi: Date): T[] {
  return faaliyetler
    .filter(
      (faaliyet) =>
        faaliyet.durum === "AKTIF" &&
        basvuruPenceresi(faaliyet, simdi) === "ACIK",
    )
    .sort((a, b) => a.basvuruBitis.getTime() - b.basvuruBitis.getTime());
}

/**
 * Başvurunun kapanmasına kalan gün. Bugün kapanıyorsa 0 döner.
 *
 * Gün farkı yine GÜN BAŞLARI üzerinden hesaplanır; saat farkı yüzünden
 * "1 gün kaldı" ile "bugün son gün" arasında gidip gelen bir sayaç güven
 * vermez.
 */
export function kalanGun(bitis: Date, simdi: Date): number {
  const GUN = 24 * 60 * 60 * 1000;
  return Math.round((gunBasi(bitis).getTime() - gunBasi(simdi).getTime()) / GUN);
}

export function kalanGunYaz(bitis: Date, simdi: Date): string {
  const kalan = kalanGun(bitis, simdi);
  if (kalan <= 0) return "son gün";
  if (kalan === 1) return "son 1 gün";
  return `${kalan} gün kaldı`;
}

/**
 * ETKİNLİĞİN kendisine kalan süre — "bugün", "yarın", "5 gün kaldı".
 *
 * `kalanGunYaz`DAN AYRI ve öyle kalmalı: o, BAŞVURUNUN kapanmasını sayıyor ve
 * dili ona göre ("son gün", "son 1 gün") — kaçırılırsa geri dönüşü olmayan bir
 * pencereyi anlatıyor. Burada sayılan şey kişinin gideceği gün; "son gün"
 * demek, etkinliğin bittiğini sandırırdı. Aynı işlevi tek fonksiyona toplamak,
 * iki farklı olayı tek cümleyle anlatmaya çalışmak olurdu.
 *
 * Gün farkı yine GÜN BAŞLARI üzerinden (bkz. kalanGun): sabah 09.00'daki
 * etkinlik, aynı günün öğleden sonrasında da "bugün" olarak yazılmalı.
 * Geçmiş tarih gelirse "bugün" döner — çağıran zaten geçmişi sormuyor, ama
 * negatif bir sayacın ekrana düşmesi bu kartın anlamını tümden bozardı.
 */
export function etkinligeKalanYaz(tarih: Date, simdi: Date): string {
  const kalan = kalanGun(tarih, simdi);
  if (kalan <= 0) return "bugün";
  if (kalan === 1) return "yarın";
  return `${kalan} gün kaldı`;
}
