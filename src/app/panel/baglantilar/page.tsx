import { redirect } from "next/navigation";

/**
 * ESKİ ONAY EKRANI — 12 Ağustos 2026'da "Bağlantılarım" içinde eridi.
 *
 * İstek: "yazışmalar ve bağlantılar isminde iki bölüm var, onları birleştirip
 * linkedin tarzı bir bölüm yapmak istiyorum · menüdeki bağlantılarım alanında
 * olsun". Bekleyen istekler artık `/panel/yazismalar` sayfasının başında,
 * bağlantı listesinin üstünde duruyor (bkz. o dosyanın başlık yorumu).
 *
 * ADRES SİLİNMEDİ, YÖNLENDİRİYOR: bu adres panel kartlarında, bildirim
 * e-postalarında ve kullanıcıların yer imlerinde geçiyordu. Silmek onları 404'e
 * düşürürdü; kalıcı yönlendirme kimseyi yolda bırakmaz.
 *
 * `?durum=` / `?hata=` taşınmıyor çünkü karar eylemi artık doğrudan yeni adrese
 * dönüyor (bkz. yazismalar/baglanti-eylemleri.ts); buraya yalnızca eski
 * bağlantılara tıklayan düşer ve onun taşıyacak bir durumu yoktur.
 */
export default function BaglantilarYonlendirmesi(): never {
  redirect("/panel/yazismalar#istekler");
}
