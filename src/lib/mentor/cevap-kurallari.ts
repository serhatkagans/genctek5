import {
  danismanMi,
  ilKoordinatoruMu,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";

/**
 * Panodaki ilan cevaplarının kuralları (13 Ağustos 2026 · mentör sayfası).
 *
 * Saf tutulur: veritabanına ve oturuma gitmez, birim testle kapsanır. Ekran ve
 * sunucu eylemi AYNI fonksiyonu çağırır — biri düğmeyi basıp öbürü izin
 * vermeseydi kullanıcı tıkladığı düğmeden hata alırdı.
 */

/**
 * Cevabı GİZLEYEBİLİR mi?
 *
 * İki taraf: yazarın kendisi (yanlış yazdığını fark eden mentör) ve gözetim
 * rolleri — danışman öğretmen, il koordinatörü, proje yöneticisi. Akıştaki
 * gönderi/yorum gizlemesiyle aynı kitle (bkz. app/panel/akis/page.tsx ·
 * gozetimYetkisi): panoyu okuyan kitle de aynı kitle ve moderasyonun iki
 * ekranda iki farklı kuralı olması, "burada kaldırılabilen şey orada
 * kaldırılamıyor" durumunu doğururdu.
 *
 * KAPSAM SORULMAZ ve bu bilinçli: pano ülke genelidir, ilanı Ankara'daki
 * öğrenci açıp cevabı İzmir'deki mentör yazabilir. Kapsam koşulu, cevabı
 * görebilen ama kaldıramayan bir öğretmen üretirdi — moderasyonda en kötü
 * durum budur.
 */
export function cevabiGizleyebilirMi(
  kullanici: OturumKullanicisi,
  yazanKullaniciId: number,
): boolean {
  if (kullanici.id === yazanKullaniciId) return true;
  return (
    danismanMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    projeYoneticisiMi(kullanici)
  );
}
