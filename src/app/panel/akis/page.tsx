import { redirect } from "next/navigation";

/**
 * ESKİ AKIŞ EKRANI — 14 Ağustos 2026'da "Bağlantılarım" içinde eridi.
 *
 * İstek: "akış bağlantılarım içine gelecek". Bölümün kendisi
 * `akis/AkisBolumu.tsx` dosyasında duruyor ve `/panel/yazismalar` sayfasının
 * içinde, bağlantı listesinin altında basılıyor.
 *
 * ADRES SİLİNMEDİ, YÖNLENDİRİYOR: `/panel/akis` bildirimlerde, yer imlerinde
 * ve eski gönderi bağlantılarında (`#gonderi-…`) geçiyordu. Emsali
 * `/panel/baglantilar` — o da 12 Ağustos'ta aynı şekilde yönlendirmeye
 * dönüştü.
 *
 * ÇAPA TAŞINMIYOR: sunucu yönlendirmesi adresin `#parça`sını göremez (tarayıcı
 * onu isteğe hiç koymaz). Kişi akış bölümüne sayfanın içinden iniyor.
 */
export default function AkisYonlendirmesi(): never {
  redirect("/panel/yazismalar#akis");
}
