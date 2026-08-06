import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { BilgiKutusu, Kart, KartBasligi, SINIF_BIRINCIL_BUTON } from "@/components/ui";
import type { BelgeDurumu } from "@/lib/kvkk/onay";
import { tarihSaatYaz } from "@/lib/tarih";

/**
 * "KVKK ve onay belgelerim" — profil ekranının en alt bölümü.
 *
 * NEDEN PROFİLDE: belge akışı menüden kaldırıldı (istek: "KVKK metni üye
 * olunurken görülsün sadece"). Ama onayladığı belgeye sonradan erişememek KVKK
 * açısından savunulabilir değil; kişi imzaladığı metni istediği an okuyabilmeli.
 * Profilin en altı, günlük işi bölmeyen ama her zaman aynı yerde duran yer.
 *
 * METİNLER KATLI (`<details>`): dört belgenin tamamı açık basılsaydı profil
 * sayfası birkaç ekran boyu hukuki metinle biterdi ve üstündeki asıl içerik
 * (kazanımlar, kayıt formu) kullanılamaz hâle gelirdi. Onay BEKLEYEN belge
 * varsayılan olarak AÇIK gelir — okunması gereken metni katlı bırakmak, onayı
 * körlemesine tıklatmak olurdu.
 */
export function OnayBelgeleriBolumu({
  durumlar,
  onaylaEylemi,
}: {
  durumlar: BelgeDurumu[];
  onaylaEylemi: (veri: FormData) => Promise<void>;
}) {
  // Kullanıcıdan hiçbir belge istenmiyorsa bölüm hiç basılmaz; boş bir "onay
  // belgeleriniz" başlığı, olmayan bir yükümlülüğü varmış gibi gösterirdi.
  if (durumlar.length === 0) return null;

  const bekleyenler = durumlar.filter((satir) => satir.gerekiyorMu);

  return (
    <Kart>
      <KartBasligi
        baslik="KVKK ve onay belgelerim"
        aciklama="Sisteme girerken onayladığınız belgeler, yürürlükteki metinleriyle birlikte. Metin güncellenirse burada yeniden onayınız istenir."
        Ikon={ShieldCheck}
      />

      {bekleyenler.length > 0 && (
        <BilgiKutusu cesit="uyari" className="mb-5">
          {bekleyenler.length === durumlar.length
            ? "Aşağıdaki belgeleri okuyup onaylamanız bekleniyor."
            : `${bekleyenler.length} belge onayınızı bekliyor. Metni güncellenen belgelerde önceki onayınız eski metne aitti.`}
        </BilgiKutusu>
      )}

      <div className="space-y-4">
        {durumlar.map((satir) => (
          <div
            key={satir.tanim.belge}
            className="rounded-kart border border-cizgi p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="flex items-center gap-2 font-semibold text-baslik">
                <FileText size={16} className="text-vurgu-metin" aria-hidden />
                {satir.tanim.baslik}
              </h3>
              {satir.gerekiyorMu ? (
                <span className="rounded-full bg-uyari-zemin px-2.5 py-0.5 text-sm text-uyari-metin">
                  {satir.onayTarihi ? "Yeniden onay bekliyor" : "Onaylanmadı"}
                </span>
              ) : (
                <span className="rounded-full bg-olumlu-zemin px-2.5 py-0.5 text-sm text-olumlu-metin">
                  Onaylandı
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-metin-yumusak">
              {satir.tanim.aciklama}
            </p>

            <p className="mt-2 text-sm text-metin-yumusak">
              {satir.gerekiyorMu
                ? satir.onayTarihi
                  ? `Metin güncellendi. Önceki onayınız (${tarihSaatYaz(satir.onayTarihi)}) eski metne aitti; güncel metni okuyup yeniden onaylamanız gerekiyor.`
                  : "Bu belgeyi henüz onaylamadınız."
                : `Onay tarihiniz: ${
                    satir.onayTarihi ? tarihSaatYaz(satir.onayTarihi) : "—"
                  }`}
              {satir.metinGuncellemeTarihi &&
                ` · Metnin son güncellenmesi: ${tarihSaatYaz(satir.metinGuncellemeTarihi)}`}
            </p>

            <details className="mt-3" open={satir.gerekiyorMu}>
              <summary className="cursor-pointer text-sm font-medium text-vurgu-metin underline underline-offset-2">
                Belgenin tam metnini {satir.gerekiyorMu ? "kapat" : "oku"}
              </summary>
              {/*
                Metin sistem ayarından geliyor ve düz yazıdır; satır sonlarının
                korunması için whitespace-pre-line kullanılıyor.
              */}
              <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-metin">
                {satir.metin}
              </div>
            </details>

            {satir.gerekiyorMu && (
              <form action={onaylaEylemi} className="mt-4">
                <input type="hidden" name="belge" value={satir.tanim.belge} />
                <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                  <CheckCircle2 size={16} aria-hidden />
                  {satir.tanim.onayEtiketi}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-cizgi pt-5">
        <h3 className="font-semibold text-baslik">Haklarınız nasıl kullanılır</h3>
        <p className="mt-1 text-sm text-metin-yumusak">
          Kimlik ve öğrenim bilgileri e-Okul kaynaklıdır; bu sistemden
          değiştirilemez.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-metin">
          <li>
            Ad, soyad, okul, sınıf gibi bilgilerdeki hatalar için okul idarenize
            başvurun; düzeltme e-Okul üzerinden yapılır ve buraya yansır.
          </li>
          <li>
            E-posta ve telefon bilgilerinizi bu sayfanın üst bölümünden
            dilediğiniz zaman değiştirebilir veya boş bırakabilirsiniz.
          </li>
          <li>
            Açık rızanızı geri almak dâhil diğer talepleriniz (verilerinizin
            işlenip işlenmediğini öğrenme, silinmesini isteme) için okul idareniz
            aracılığıyla Bakanlığa başvurabilirsiniz.
          </li>
        </ul>
      </div>
    </Kart>
  );
}
