import {
  type YonetimAdimi,
  yonetimYolIzi,
} from "@/lib/rapor/yonetim-kurallari";
import { yonetimYeriniGetir } from "@/lib/rapor/yonetim-ozeti";
import {
  yonetimPanosuGorebilirMi,
  yonetimPanosuIlErisimi,
} from "@/lib/yetki/izinler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";

/**
 * Öğrenci ve öğretmen envanterlerinin yol izi.
 *
 * İKİ EKRAN AYNI ŞERİDİ KULLANIR: listeler ayrı ama panodaki yerleri aynı ve
 * ikisine de aynı kartlardan giriliyor. Ayrı yazılsalardı biri düzeltildiğinde
 * öbürü eski hâlinde kalırdı — 12 Ağustos'taki şikâyet de tam olarak bir
 * ekrandaki şeridin öbüründe olmamasıydı.
 *
 * `null` dönerse şerit basılmaz: panoyu açamayan kullanıcı (danışman öğretmen)
 * için "Yönetim Paneli" bir yol değil, kapalı bir kapıdır — onun listesine
 * girişi Panel'deki "Öğrencilerim" kartı (13 Ağustos 2026'dan beri menüde sekme
 * değil, bkz. app/panel/layout.tsx).
 */
export async function envanterYolIzi(
  kullanici: OturumKullanicisi,
  sonAdim: string,
  filtreler: {
    ilKodu?: string | null;
    ilceKodu?: string | null;
    kurumKodu?: number | null;
  },
): Promise<YonetimAdimi[] | null> {
  if (!yonetimPanosuGorebilirMi(kullanici)) return null;

  const yer = await yonetimYeriniGetir(filtreler);

  /*
   * KAPSAM DIŞI İLİN BASAMAĞI YAZILMAZ. Süzgeçler yalnızca daraltır, yani
   * adres çubuğuna başka ilin kodu yazılabiliyor (liste boş döner). Şerit o
   * ilin adını basmış olsaydı hem kapsam dışı bir il adı sızardı hem de
   * açılamayan bir ekrana bağlantı verilmiş olurdu. Şeridin kendisi kalıyor:
   * panoya dönüş yolu her hâlükârda gerekli.
   */
  const erisilir = yer.il
    ? yonetimPanosuIlErisimi(kullanici, yer.il.ilKodu)
    : true;

  return yonetimYolIzi(sonAdim, erisilir ? yer : {});
}
