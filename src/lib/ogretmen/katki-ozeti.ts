/**
 * Panelim'deki "Katkı kartım" ölçüm kartının metni (12 Ağustos 2026).
 *
 * İSTEK: "katkı kartım kartında tıklayın diyor ama katkıların özeti yok kartta."
 *
 * Kart `deger` alanında "Görüntüle" yazıyordu: diğer bütün ölçüm kartları
 * orada bir SAYI gösterirken bu kart bir davetiye gösteriyordu ve kişi
 * tıklamadan katkısı hakkında hiçbir şey öğrenemiyordu. Oysa sayılar zaten
 * Katkılarım ekranının başlığında duruyor (bkz. app/panel/kazanimlarim).
 *
 * SAF TUTULUR: sayım veritabanı işidir (katki.ts), buradaki iş yalnızca o
 * sayıları cümleye çevirmek — ve birim testle sabitlemek, çünkü "0 aktif
 * danışmanlık" gibi boş övgüleri yazmama kararı burada veriliyor.
 */

export interface KatkiSayilari {
  /** Düzenlediği etkinlik (reddedilenler hariç). */
  faaliyet: number;
  /** Süren danışmanlık sayısı. */
  aktifDanismanlik: number;
  /** Aldığı görev rolleri — bitmişler dahil. */
  gorev: number;
}

export interface KatkiKartiMetni {
  deger: string;
  aciklama: string;
}

/**
 * Kartın büyük satırı ve altındaki özet.
 *
 * BÜYÜK SATIR ETKİNLİK SAYISIDIR: kartın anlattığı katkının en somut ve
 * kişinin en çok aradığı ölçüsü bu. Üç sayı toplanıp tek bir "katkı puanı"
 * yazılabilirdi ama etkinlik, danışmanlık ve görev aynı birim değil; toplamları
 * hiçbir sorunun cevabı olmazdı.
 *
 * SIFIR OLAN SATIR YAZILMAZ: il koordinatörü danışman olamaz, dolayısıyla ona
 * "0 aktif danışmanlık" demek boş bir satırdır. Hiçbir katkı yoksa açıklama
 * kartın ne olduğunu anlatmaya döner — yeni kullanıcı boş bir sayıyla baş başa
 * kalmasın.
 */
export function katkiKartiMetni(sayilar: KatkiSayilari): KatkiKartiMetni {
  const parcalar: string[] = [];
  if (sayilar.aktifDanismanlik > 0) {
    parcalar.push(`${sayilar.aktifDanismanlik} aktif danışmanlık`);
  }
  if (sayilar.gorev > 0) {
    parcalar.push(`${sayilar.gorev} görev`);
  }

  const bosMu =
    sayilar.faaliyet === 0 &&
    sayilar.aktifDanismanlik === 0 &&
    sayilar.gorev === 0;

  return {
    deger: `${sayilar.faaliyet} etkinlik`,
    aciklama: bosMu
      ? "Görevleriniz, danışmanlığınız ve düzenlediğiniz etkinlikler"
      : parcalar.length > 0
        ? `${parcalar.join(" · ")} · ayrıntı için tıklayın`
        : "Ayrıntı için tıklayın",
  };
}
