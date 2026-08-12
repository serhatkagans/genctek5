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
 * BÜYÜK SATIR YALNIZCA SAYIDIR (12 Ağustos 2026 · istek: "katkı kartımda
 * '0 etkinlik' yazıyor, o etkinlik yazısını silelim, diğerleri gibi sadece sayı
 * versin"). Panelin bütün ölçüm kartlarında o satırda çıplak bir sayı duruyor;
 * birinin birim taşıması ızgarayı hizasız gösteriyordu. Sayının NEYİN sayısı
 * olduğu hemen altındaki açıklamada yazıyor.
 *
 * Sayı, düzenlenen etkinliktir: kartın anlattığı katkının en somut ölçüsü bu.
 * Üç sayı toplanıp tek bir "katkı puanı" yazılabilirdi ama etkinlik,
 * danışmanlık ve görev aynı birim değil; toplamları hiçbir sorunun cevabı
 * olmazdı.
 *
 * SIFIR OLAN SATIR YAZILMAZ: il koordinatörü danışman olamaz, dolayısıyla ona
 * "0 aktif danışmanlık" demek boş bir satırdır. Hiçbir katkı yoksa açıklama
 * kartın ne olduğunu anlatmaya döner — yeni kullanıcı çıplak bir sıfırla baş
 * başa kalmasın.
 */
export function katkiKartiMetni(sayilar: KatkiSayilari): KatkiKartiMetni {
  const parcalar = ["Düzenlediğiniz etkinlik"];
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
    deger: String(sayilar.faaliyet),
    aciklama: bosMu
      ? "Görevleriniz, danışmanlığınız ve düzenlediğiniz etkinlikler"
      : parcalar.join(" · "),
  };
}
