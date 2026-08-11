import {
  BadgeCheck,
  MapPin,
  UserCheck,
  UserMinus,
  UserPlus,
} from "lucide-react";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import type { KoordinatorBilgisi } from "@/lib/danisman/atama";
import type { DanismanAdayi } from "@/lib/danisman/karar";

/**
 * Danışman öğretmen durumu ve seçim listesi.
 *
 * İKİ YERDE BASILIR: Panelim sayfasının içindeki bölüm ve `/panel/danisman-
 * secim` ekranı. Sekme menüden kalktı ama SAYFA SİLİNEMEZ — orası aynı zamanda
 * giriş KAPISIDIR: danışmansız öğrenci girişte oraya düşer ve seçimini yapana
 * kadar "boşta" kalamaz (SKILL.md · Değişmezler 2). İkisi ayrı yazılsaydı
 * kapıdaki ekran ile paneldeki bölüm zamanla ayrışırdı.
 *
 * `kartlaSar=false` verildiğinde dış çerçeve basılmaz; Panelim'de bölüm zaten
 * kendi kartının içinde duruyor ve kart içinde kart iç içe çerçeve üretirdi.
 */
export interface DanismanSecimVerisi {
  atama: {
    danismanKullaniciId: number;
    danisman: {
      ad: string;
      soyad: string;
      brans: string | null;
      ogretmenProfil: { eposta: string | null; telefon: string | null } | null;
    };
  } | null;
  adaylar: DanismanAdayi[];
  koordinator: KoordinatorBilgisi | null;
}

function iletisimSatiri(
  eposta: string | null | undefined,
  telefon: string | null | undefined,
): string[] {
  // Boş bırakılmış alan hiç basılmaz; "—" yazmak yanlış izlenim verirdi.
  return [eposta, telefon].filter((deger): deger is string =>
    Boolean(deger?.trim()),
  );
}

export function DanismanSecimi({
  veri,
  secEylemi,
  birakEylemi,
  donusYolu,
  kartlaSar = true,
}: {
  veri: DanismanSecimVerisi;
  secEylemi: (girdi: FormData) => Promise<void>;
  /** Danışmanlığı sonlandırma; seçim eylemiyle aynı iki yerden çağrılır. */
  birakEylemi: (girdi: FormData) => Promise<void>;
  /** Seçimden sonra dönülecek adres; eylem tek, çağıran iki. */
  donusYolu: string;
  kartlaSar?: boolean;
}) {
  const { atama, adaylar, koordinator } = veri;
  const koordinatoreBagliMi =
    atama !== null && atama.danismanKullaniciId === koordinator?.kullaniciId;

  const danismanIletisimi = iletisimSatiri(
    atama?.danisman.ogretmenProfil?.eposta,
    atama?.danisman.ogretmenProfil?.telefon,
  );
  const koordinatorIletisimi = iletisimSatiri(
    koordinator?.eposta,
    koordinator?.telefon,
  );

  const Sarmalayici = kartlaSar ? Kart : Bos;

  return (
    <div className="space-y-6">
      <Sarmalayici>
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
        {atama && danismanIletisimi.length > 0 && (
          <p className="mt-1 text-sm text-metin-yumusak">
            {danismanIletisimi.join(" · ")}
          </p>
        )}
        {adaylar.length > 0 && (
          <p className="mt-2 text-sm text-metin-yumusak">
            {koordinatoreBagliMi
              ? "Okulunuzda danışman öğretmen bulunduğu için aşağıdan kendi danışmanınızı seçebilirsiniz."
              : "Danışmanınızı istediğiniz zaman değiştirebilirsiniz; değişiklik anında geçerli olur, onay gerekmez."}
          </p>
        )}

        {/*
          DANIŞMANLIĞI SONLANDIRMA (11 Ağustos 2026 · istek: "öğrenci danışman
          öğretmeni bırakacak butonu yok bırakabilsin").

          Öğretmen tarafındaki bırakmanın aynası: bağ kapanır, öğrenci
          danışmansız kalır ve yeni danışmanını istediği zaman seçer. Gerekçe
          sorulmaz (bkz. lib/danisman/atama.ts · ogrenciDanismaniniBirakti).

          İL KOORDİNATÖRÜNE BAĞLIYKEN BASILMAZ. O bağ seçilmiş bir danışmanlık
          değil, okulunda danışman öğretmen bulunmayan öğrenciyi boşta
          bırakmamak için kurulan bir yedektir; sonlandırmak öğrenciye bir şey
          kazandırmaz, seçebileceği kimse de yoktur.

          Düğme İKİNCİL ve listenin ÜSTÜNDE, "mevcut durum" bölümünün içinde:
          asıl iş danışman seçmek, bu onun yanındaki çıkış yolu. Aday
          listesinin altına konsaydı "Danışmanım olsun" düğmelerinin devamı
          gibi okunurdu.
        */}
        {atama && !koordinatoreBagliMi && (
          <form action={birakEylemi} className="mt-4">
            <input type="hidden" name="donusYolu" value={donusYolu} />
            <button type="submit" className={SINIF_IKINCIL_BUTON}>
              <UserMinus size={15} aria-hidden />
              Danışmanlığı sonlandır
            </button>
            <p className="mt-1.5 text-sm text-metin-yumusak">
              Danışmanınız kalmaz ve öğretmene bilgi verilir. Yeni danışmanınızı
              istediğiniz zaman aşağıdaki listeden seçebilirsiniz.
            </p>
          </form>
        )}
      </Sarmalayici>

      {adaylar.length === 0 ? (
        /*
          Okulda danışman yok. Eskiden bu durumda yalnızca "koordinatörünüze
          bağlısınız" cümlesi vardı ve öğrenci bağlı OLDUĞU kişinin adını bile
          göremiyordu. Koordinatör artık listede — seçilebilir değil, çünkü
          seçilecek bir alternatif yok; atama zaten otomatik yapılmış durumda.
        */
        <Sarmalayici>
          {/*
            AÇIKLAMA ATAMAYA GÖRE DEĞİŞİR. "İl koordinatörünüze bağlısınız"
            cümlesi, atama gerçekten kuruluyken doğru; danışmanlığı elle
            sonlandırılmış öğrenci (kendisi bıraktı ya da öğretmeni bıraktı)
            kimseye bağlı DEĞİLDİR ve otomatik olarak da bağlanmaz
            (bkz. ilkAtamaKarariVer · elleBirakildiMi). Tek metin basılsaydı
            ekran, öğrencinin durumunu olduğundan iyi gösterirdi.
          */}
          <KartBasligi
            baslik="İl koordinatörünüz"
            aciklama={
              atama
                ? "Okulunuzda GençTek danışman öğretmeni olarak görev alan öğretmen bulunmuyor. Bu nedenle il koordinatörünüze bağlısınız; okulunuzda bir öğretmen görev aldığında bilgilendirilirsiniz."
                : "Okulunuzda GençTek danışman öğretmeni olarak görev alan öğretmen bulunmuyor ve şu anda danışmanınız yok. Okulunuzda bir öğretmen görev aldığında seçim yapabilirsiniz; o zamana kadar aşağıdaki il koordinatörünüze ulaşabilirsiniz."
            }
            Ikon={MapPin}
          />

          {/*
            İSTENEN NOT (F · 6 Ağustos 2026). Kart zaten koordinatörün adını ve
            iletişim bilgisini gösteriyor ama "ne yapmam gerekiyor" sorusunu
            cevaplamıyordu: öğrenci bağlı olduğu kişiyi görüp orada kalıyordu.
          */}
          <BilgiKutusu className="mb-4">
            Danışman öğretmeni olmayan öğrencilerin il koordinatörü ile iletişime
            geçmesi gerekmektedir.
          </BilgiKutusu>
          {koordinator ? (
            <div className="rounded-kart border border-cizgi px-4 py-3">
              <span className="block font-medium text-metin">
                {koordinator.ad} {koordinator.soyad}
              </span>
              <span className="block text-sm text-metin-yumusak">
                {koordinator.brans ?? "İl koordinatörü"}
              </span>
              {koordinatorIletisimi.length > 0 && (
                <span className="mt-1 block text-sm text-metin-yumusak">
                  {koordinatorIletisimi.join(" · ")}
                </span>
              )}
            </div>
          ) : (
            <p className="text-metin-yumusak">
              İlinize henüz il koordinatörü atanmadı. Atama yapıldığında
              danışmanınız olarak buraya yazılacak.
            </p>
          )}
        </Sarmalayici>
      ) : (
        <Sarmalayici>
          {/*
            İSTENEN NOT (F · 6 Ağustos 2026): "Platforma giriş yapmış okulunuz
            öğretmenleri arasından seçim yapabilirsiniz."

            Cümlenin işi listenin NEDEN kısa olabileceğini anlatmak: okulda
            çalışan her öğretmen burada görünmez, yalnızca platforma girip
            danışmanlık görevini işaretleyenler görünür. Bunu söylemeyen bir
            liste, öğrenciye "öğretmenim neden yok" dedirtiyordu.
          */}
          <KartBasligi
            baslik="Danışman öğretmen seçimi"
            aciklama="Platforma giriş yapmış okulunuz öğretmenleri arasından seçim yapabilirsiniz. Listede yalnızca GençTek danışman öğretmenliği görevini işaretlemiş öğretmenler görünür."
            Ikon={UserPlus}
          />
          <ul className="space-y-2">
            {adaylar.map((aday) => {
              const seciliMi = atama?.danismanKullaniciId === aday.kullaniciId;
              return (
                <li key={aday.kullaniciId}>
                  <form action={secEylemi}>
                    <input
                      type="hidden"
                      name="danismanId"
                      value={aday.kullaniciId}
                    />
                    <input type="hidden" name="donusYolu" value={donusYolu} />
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
        </Sarmalayici>
      )}
    </div>
  );
}

/** Çerçevesiz sarmalayıcı — Panelim'de bölüm zaten bir kartın içinde. */
function Bos({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
