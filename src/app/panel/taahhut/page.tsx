import { ShieldCheck } from "lucide-react";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { taahhutDurumu, taahhutMetniGetir } from "@/lib/kvkk/taahhut";
import { tarihSaatYaz } from "@/lib/tarih";
import { ilKoordinatoruMu } from "@/lib/yetki/izinler";
import { taahhutOnaylaEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * İl koordinatörü gizlilik taahhütnamesi — analiz isteği Bölüm 4.
 *
 * Öğrenci aydınlatma metniyle aynı desende ama TERS YÖNDE bir belge:
 * aydınlatma metni kişiye "senin verini şöyle işliyoruz" der, taahhüt ise
 * koordinatöre "başkasının verisiyle şöyle davranacaksın" dedirtir.
 *
 * Erişim ENGELLENMEZ, uyarılır: koordinatörün ilindeki bir öğrenciye acil
 * ulaşması gerektiğinde onaylanmamış bir metin yüzünden sistemin kilitlenmesi,
 * korumaktan çok zarar verirdi. Onay durumu şeritte sürekli görünür ve
 * erişimler zaten kayda geçer.
 */
export default async function TaahhutSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum } = await searchParams;

  if (!ilKoordinatoruMu(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Gizlilik taahhütnamesi"
          aciklama="Bu belge il koordinatörü görevine özeldir."
        />
      </Kart>
    );
  }

  const [metin, taahhut] = await Promise.all([
    taahhutMetniGetir(),
    taahhutDurumu(kullanici),
  ]);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Gizlilik taahhütnamesi"
        aciklama="İl koordinatörü olarak eriştiğiniz kişisel verilere ilişkin yükümlülükleriniz."
      />

      {durum === "onaylandi" && (
        <BilgiKutusu cesit="olumlu">
          Taahhütname onaylandı. Onayınız erişim kayıtlarına işlendi.
        </BilgiKutusu>
      )}

      {taahhut.gerekiyorMu ? (
        <BilgiKutusu cesit="uyari">
          {taahhut.onayTarihi
            ? "Taahhütname metni güncellendi. Güncel metni okuyup yeniden onaylamanız gerekiyor."
            : "Bu taahhütnameyi henüz onaylamadınız."}
        </BilgiKutusu>
      ) : (
        <BilgiKutusu cesit="olumlu">
          Bu metni {taahhut.onayTarihi ? tarihSaatYaz(taahhut.onayTarihi) : "—"}{" "}
          tarihinde onayladınız.
        </BilgiKutusu>
      )}

      <Kart>
        <KartBasligi baslik="Taahhüt metni" Ikon={ShieldCheck} />
        <p className="whitespace-pre-line text-metin">{metin.metin}</p>
        {metin.guncellemeTarihi && (
          <p className="mt-4 text-sm text-metin-yumusak">
            Metnin son güncellenme tarihi:{" "}
            {tarihSaatYaz(metin.guncellemeTarihi)}
          </p>
        )}
      </Kart>

      {taahhut.gerekiyorMu && (
        <form action={taahhutOnaylaEylemi}>
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            <ShieldCheck size={16} aria-hidden />
            Okudum, kabul ediyorum
          </button>
        </form>
      )}
    </div>
  );
}
