import { CheckCircle2, ShieldCheck } from "lucide-react";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { aydinlatmaMetniGetir, aydinlatmaOnayDurumu } from "@/lib/kvkk/durum";
import { tarihSaatYaz } from "@/lib/tarih";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { aydinlatmaOnaylaEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * KVKK aydınlatma metni ve onay ekranı.
 *
 * Ekran herkese açıktır (metni okumak yetki gerektirmez) ama onay yalnızca
 * öğrenciden istenir: bu sistemde kişisel verisi işlenen asıl grup onlardır ve
 * büyük bölümü 18 yaş altındadır.
 */
export default async function KvkkSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const { durum } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  const [metin, onay] = await Promise.all([
    aydinlatmaMetniGetir(),
    aydinlatmaOnayDurumu(kullanici),
  ]);

  const ogrenci = ogrenciMi(kullanici);
  const guncellemeSonrasiYenidenOnay =
    onay.gerekiyorMu && onay.onayTarihi !== null;

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Kişisel verilerin korunması"
        aciklama="Bu sistemde hangi verilerinizin, neden ve ne kadar süreyle işlendiğini anlatan aydınlatma metni."
      />

      {durum === "onaylandi" && (
        <BilgiKutusu cesit="olumlu">
          Aydınlatma metnini okuduğunuz kaydedildi.
        </BilgiKutusu>
      )}

      {guncellemeSonrasiYenidenOnay && (
        <BilgiKutusu cesit="uyari">
          Aydınlatma metni güncellendi. Önceki onayınız
          {onay.onayTarihi ? ` (${tarihSaatYaz(onay.onayTarihi)})` : ""} eski
          metne aitti; güncel metni okuyup yeniden onaylamanız gerekiyor.
        </BilgiKutusu>
      )}

      <Kart>
        <KartBasligi
          baslik="Aydınlatma metni"
          aciklama={
            metin.guncellemeTarihi
              ? `Son güncelleme: ${tarihSaatYaz(metin.guncellemeTarihi)}`
              : undefined
          }
          Ikon={ShieldCheck}
        />
        {/*
          Metin sistem ayarından geliyor ve düz yazıdır; satır sonlarının
          korunması için whitespace-pre-line kullanılıyor.
        */}
        <div className="whitespace-pre-line text-sm leading-relaxed text-metin">
          {metin.metin}
        </div>
      </Kart>

      {ogrenci && (
        <Kart>
          <KartBasligi
            baslik="Onayınız"
            aciklama="On sekiz yaşından küçükseniz bu metni velinizle birlikte okumanız beklenir."
            Ikon={CheckCircle2}
          />

          {onay.gerekiyorMu ? (
            <form action={aydinlatmaOnaylaEylemi}>
              <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                <CheckCircle2 size={16} aria-hidden />
                Okudum, anladım
              </button>
            </form>
          ) : (
            <BilgiKutusu cesit="olumlu">
              Metni{" "}
              {onay.onayTarihi ? tarihSaatYaz(onay.onayTarihi) : "daha önce"}{" "}
              tarihinde onayladınız.
            </BilgiKutusu>
          )}
        </Kart>
      )}

      <Kart>
        <KartBasligi
          baslik="Haklarınız nasıl kullanılır"
          aciklama="Kimlik ve öğrenim bilgileri e-Okul kaynaklıdır; bu sistemden değiştirilemez."
        />
        <ul className="list-disc space-y-2 pl-5 text-sm text-metin">
          <li>
            Ad, soyad, okul, sınıf gibi bilgilerdeki hatalar için okul idarenize
            başvurun; düzeltme e-Okul üzerinden yapılır ve buraya yansır.
          </li>
          <li>
            E-posta ve telefon bilgilerinizi profil ekranından dilediğiniz zaman
            değiştirebilir veya boş bırakabilirsiniz.
          </li>
          <li>
            Diğer talepleriniz (verilerinizin işlenip işlenmediğini öğrenme,
            silinmesini isteme) için okul idareniz aracılığıyla Bakanlığa
            başvurabilirsiniz.
          </li>
        </ul>
      </Kart>
    </div>
  );
}
