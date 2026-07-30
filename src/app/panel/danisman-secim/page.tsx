import { BadgeCheck, MapPin, UserCheck, UserPlus } from "lucide-react";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  aktifAtamaGetir,
  danismanAdaylariGetir,
  ilKoordinatoruGetir,
} from "@/lib/danisman/atama";
import { prisma } from "@/lib/db";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { danismanSecEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

export default async function DanismanSecimSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; durum?: string }>;
}) {
  const { hata, durum } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ogrenciMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Danışman seçimi"
          aciklama="Bu ekran öğrencilere özeldir."
        />
      </Kart>
    );
  }

  const atama = await aktifAtamaGetir(kullanici.id);
  const adaylar =
    kullanici.kurumKodu !== null
      ? await danismanAdaylariGetir(kullanici.kurumKodu)
      : [];
  const koordinatorId = await ilKoordinatoruGetir(kullanici.ilKodu);
  const koordinatoreBagliMi =
    atama !== null && atama.danismanKullaniciId === koordinatorId;

  const okul = kullanici.kurumKodu
    ? await prisma.kurum.findUnique({
        where: { kurumKodu: kullanici.kurumKodu },
        select: { ad: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Danışman öğretmenim"
        aciklama={`${okul?.ad ?? "Okulunuz"} için danışman öğretmen ataması.`}
      />

      {durum === "secildi" && (
        <BilgiKutusu cesit="olumlu">
          Danışman öğretmeniniz kaydedildi.
        </BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <Kart>
        <h2 className="text-sm font-medium text-metin-yumusak">Mevcut durum</h2>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-lg text-metin">
          {atama ? (
            <>
              <UserCheck size={18} className="text-vurgu-metin" aria-hidden />
              {atama.danisman.ad} {atama.danisman.soyad}
              {atama.danisman.brans ? ` · ${atama.danisman.brans}` : ""}
              {koordinatoreBagliMi && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rol-koordinator-zemin px-2.5 py-0.5 text-sm text-rol-koordinator-metin">
                  <MapPin size={13} aria-hidden />
                  İl koordinatörü
                </span>
              )}
            </>
          ) : (
            "Danışman atanmadı."
          )}
        </p>
        {adaylar.length > 0 && (
          <p className="mt-2 text-sm text-metin-yumusak">
            {koordinatoreBagliMi
              ? "Okulunuzda danışman öğretmen bulunduğu için aşağıdan kendi danışmanınızı seçebilirsiniz."
              : "Danışmanınızı istediğiniz zaman değiştirebilirsiniz; değişiklik anında geçerli olur, onay gerekmez."}
          </p>
        )}
      </Kart>

      {adaylar.length === 0 ? (
        <Kart>
          <p className="text-metin-yumusak">
            Okulunuzda GençTek danışman öğretmeni olarak görev alan öğretmen
            bulunmuyor. Bu nedenle il koordinatörünüze bağlısınız. Okulunuzda bir
            öğretmen görev aldığında bilgilendirileceksiniz.
          </p>
        </Kart>
      ) : (
        <Kart>
          <KartBasligi
            baslik="Danışman öğretmen adayları"
            aciklama="Okulunuzda görev almak isteyen öğretmenler listelenir. Yalnızca kendi okulunuzdaki öğretmenler arasından seçim yapabilirsiniz."
            Ikon={UserPlus}
          />
          <ul className="space-y-2">
            {adaylar.map((aday) => {
              const seciliMi = atama?.danismanKullaniciId === aday.kullaniciId;
              return (
                <li key={aday.kullaniciId}>
                  <form action={danismanSecEylemi}>
                    <input
                      type="hidden"
                      name="danismanId"
                      value={aday.kullaniciId}
                    />
                    <div
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-kart border px-4 py-3 ${
                        seciliMi
                          ? "border-olumlu-cizgi bg-olumlu-zemin"
                          : "border-cizgi"
                      }`}
                    >
                      <span>
                        <span className="block font-medium text-metin">
                          {aday.ad} {aday.soyad}
                        </span>
                        <span className="block text-sm text-metin-yumusak">
                          {aday.brans ?? "—"}
                        </span>
                      </span>
                      {seciliMi ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-olumlu-metin">
                          <BadgeCheck size={16} aria-hidden />
                          Danışmanınız
                        </span>
                      ) : (
                        <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                          Danışmanım olsun
                        </button>
                      )}
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
        </Kart>
      )}
    </div>
  );
}
