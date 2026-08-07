import { Award, ExternalLink, Printer, UserPlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TumunuSecKutusu } from "@/components/belge/TumunuSecKutusu";
import {
  BilgiKutusu, Kart, KartBasligi, SayfaBasligi, SINIF_GIRDI, SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  BELGE_TURU_ETIKETLERI,
  BELGE_TURLERI,
  imzaUnvaniOner,
} from "@/lib/belge/kurallar";
import { prisma } from "@/lib/db";
import { faaliyetKapsamiCikar, gorunurFaaliyetGetir } from "@/lib/faaliyet/erisim";
import { uygulamaYolu } from "@/lib/ortam";
import { tarihYaz } from "@/lib/tarih";
import { faaliyetRaporuYazabilirMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

export default async function BelgelerSayfasi({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kullanici = await oturumKullanicisiZorunlu();

  const faaliyet = await gorunurFaaliyetGetir(kullanici, Number.parseInt(id, 10));
  if (!faaliyet) notFound();
  if (!faaliyetRaporuYazabilirMi(kullanici, faaliyetKapsamiCikar(faaliyet))) notFound();

  const katilimcilar = await prisma.basvuru.findMany({
    where: { faaliyetId: faaliyet.id, durum: "SECILDI" },
    orderBy: { basvuruTarihi: "asc" },
    select: {
      katilimciId: true,
      katilimci: {
        select: {
          ad: true, soyad: true, sinif: true, brans: true,
          kurum: { select: { ad: true } },
        },
      },
    },
  });

  /*
   * İMZA MAKAMI (J5 · 6 Ağustos 2026). Unvan kapsamdan gelir; okul içi
   * etkinlikte okul müdürü, il etkinliğinde il millî eğitim müdürü. Ulusal
   * kapsamda karşılık yok — istekte belirtilmedi ve uydurmak resmî belgeye
   * olmayan bir makam yazmak olurdu; orada düzenleyen birim kullanılır.
   *
   * AD ELLE GİRİLİR ve alan ZORUNLUdur: okul müdürünün adı sistemde tutulmuyor,
   * e-Okul'dan da gelmiyor. Eskiden imzaya belgeyi ÜRETEN kişinin adı
   * yazılıyordu; belgeyi hazırlayan öğretmen ile imzalayan makam aynı kişi
   * değil.
   */
  const varsayilanUnvan =
    imzaUnvaniOner(faaliyet.kapsam) ?? faaliyet.duzenleyenBirim;

  return (
    <div className="space-y-6">
      <Link
        href={`/panel/etkinlikler/${faaliyet.id}`}
        className="text-sm font-medium text-vurgu-metin underline underline-offset-2"
      >
        ← Etkinliğe dön
      </Link>

      <SayfaBasligi
        baslik="Katılım ve teşekkür belgeleri"
        aciklama={`${faaliyet.ad} · ${tarihYaz(faaliyet.tarih)}`}
      />

      <BilgiKutusu cesit="uyari">
        Belgeler yeni sekmede açılır ve tarayıcının <strong>Yazdır</strong> ekranından
        &quot;PDF olarak kaydet&quot; seçeneğiyle indirilir. Toplu belgede tek yazdırma
        işlemiyle tüm kişilerin belgeleri tek bir PDF dosyasında toplanır. Düzgün çıktı
        alabilmek için tarayıcı yazdırma ekranında <strong>&quot;Arka plan grafikleri&quot;</strong> seçeneğinin
        açık olduğundan emin olun.
      </BilgiKutusu>

      <Kart>
        <KartBasligi
          baslik="Katılımcılar"
          aciklama="Etkinliğe seçilmiş kişiler. Belge, resmî şablon üzerine basılır."
          Ikon={Award}
        />

        {katilimcilar.length === 0 ? (
          <p className="text-metin-yumusak">
            Bu etkinliğe seçilmiş katılımcı yok. Aşağıdaki bölümden ad yazarak
            yine de belge üretebilirsiniz.
          </p>
        ) : (
          <form
            method="get"
            action={uygulamaYolu(`/panel/etkinlikler/${faaliyet.id}/belge/toplu`)}
            target="_blank"
            className="space-y-4"
          >
            {/* Toplu Üretim Kontrol Paneli */}
            <div className="rounded-lg border border-cizgi bg-arka-plan/50 p-4 space-y-4">
              {/*
                "Hızlı toplu yol" bağlantıları KALDIRILDI (J5): `<a href>` form
                alanı taşımıyor, dolayısıyla imza bilgisi gitmiyordu ve her
                tıklama hata ekranına düşerdi. Aynı işi aşağıdaki "Seçilenler
                için toplu belge üret" düğmesi zaten yapıyor — hiçbir kutu
                işaretlenmediğinde tüm liste basılıyor.
              */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cizgi">
                <TumunuSecKutusu selector=".katilimci-secimi" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-metin">Belge türü</span>
                  <select name="tur" defaultValue="KATILIM" className={SINIF_GIRDI}>
                    {BELGE_TURLERI.map((tur) => (
                      <option key={tur} value={tur}>
                        {BELGE_TURU_ETIKETLERI[tur]}
                      </option>
                    ))}
                  </select>
                </label>
                {/*
                  İMZA ZORUNLU (J5). Ad boş bırakılırsa belge üretilmez; imzasız
                  bir katılım belgesi resmî olarak işe yaramaz.
                */}
                <label className="block">
                  <span className="text-sm font-medium text-metin">
                    İmzalayacak kişi
                  </span>
                  <input
                    type="text"
                    name="imzaAd"
                    required
                    maxLength={120}
                    placeholder="Ad Soyad"
                    className={SINIF_GIRDI}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-metin">Unvan</span>
                  <input
                    type="text"
                    name="imzaUnvan"
                    maxLength={120}
                    defaultValue={varsayilanUnvan}
                    className={SINIF_GIRDI}
                  />
                  <span className="mt-1 block text-sm text-metin-yumusak">
                    Etkinliğin kapsamından geldi; gerekiyorsa değiştirin.
                  </span>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-metin">
                    Ortak özel metin <span className="text-metin-yumusak">(isteğe bağlı)</span>
                  </span>
                  <input
                    type="text"
                    name="metin"
                    maxLength={300}
                    placeholder="Tüm seçili belgelere eklenecek özel metin."
                    className={SINIF_GIRDI}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-metin-yumusak">
                  İpucu: Hiçbir kutu işaretlenmezse listedeki tüm katılımcılar için toplu belge üretilir.
                </p>
                <button type="submit" className={SINIF_IKINCIL_BUTON}>
                  <Printer size={16} aria-hidden />
                  Seçilenler için toplu belge üret
                </button>
              </div>
            </div>

            {/* Katılımcı Listesi */}
            <ul className="divide-y divide-cizgi">
              {katilimcilar.map((basvuru) => {
                const adSoyad = `${basvuru.katilimci.ad} ${basvuru.katilimci.soyad}`;
                return (
                  <li
                    key={basvuru.katilimciId}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        name="katilimci"
                        value={basvuru.katilimciId}
                        className="katilimci-secimi h-4 w-4 rounded border-cizgi text-vurgu focus:ring-vurgu"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-metin">{adSoyad}</p>
                        <p className="text-sm text-metin-yumusak">
                          {basvuru.katilimci.sinif ?? basvuru.katilimci.brans ?? "—"}
                          {" · "}
                          {basvuru.katilimci.kurum?.ad ?? "—"}
                        </p>
                      </div>
                    </div>
                    {/*
                      Kişi başına HIZLI BAĞLANTI değil, aynı formun DÜĞMESİ.
                      Sebebi J5: imza artık elle yazılıyor ve `<a href>` bir
                      form alanını taşıyamaz — bağlantı kalsaydı tek kişilik
                      belgeler imzasız üretilir ve reddedilirdi.

                      Belge türü yukarıdaki seçimden gelir; böylece tür için tek
                      bir doğruluk kaynağı olur. `formaction` isteği tekil belge
                      yoluna çevirir.

                      DÜĞME ADI ARTIK `katilimciId` (7 Ağustos 2026), `ad`
                      değil: belge üretimi artık kişinin profiline katılım
                      düşürüyor ve serbest metin bir ad hangi öğrenci olduğunu
                      söylemiyor — aynı adlı iki öğrencide katılım yanlış kişiye
                      giderdi. Ad, belge sayfasında kimlikten çözülüyor.
                      Bir düğme tek bir ad/değer çifti taşıyabildiği için ikisi
                      birden gönderilemiyordu; doğru olan kimlik.
                    */}
                    <button
                      type="submit"
                      name="katilimciId"
                      value={basvuru.katilimciId}
                      formAction={uygulamaYolu(
                        `/panel/etkinlikler/${faaliyet.id}/belge`,
                      )}
                      formTarget="_blank"
                      className={SINIF_IKINCIL_BUTON}
                    >
                      <ExternalLink size={15} aria-hidden />
                      Belge üret
                    </button>
                  </li>
                );
              })}
            </ul>
          </form>
        )}
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Listede olmayan biri için"
          aciklama="Konuşmacı, destek veren kurum ya da sistemde kaydı olmayan katılımcı."
          Ikon={UserPlus}
        />
        <form
          method="get"
          action={uygulamaYolu(`/panel/etkinlikler/${faaliyet.id}/belge`)}
          target="_blank"
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-metin">Ad Soyad</span>
              <input
                type="text"
                name="ad"
                required
                maxLength={120}
                placeholder="Prof. Dr. Mehmet Kaya"
                className={SINIF_GIRDI}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-metin">Belge türü</span>
              <select name="tur" defaultValue="TESEKKUR" className={SINIF_GIRDI}>
                {BELGE_TURLERI.map((tur) => (
                  <option key={tur} value={tur}>
                    {BELGE_TURU_ETIKETLERI[tur]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-metin">
                İmzalayacak kişi
              </span>
              <input
                type="text"
                name="imzaAd"
                required
                maxLength={120}
                placeholder="Ad Soyad"
                className={SINIF_GIRDI}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-metin">Unvan</span>
              <input
                type="text"
                name="imzaUnvan"
                maxLength={120}
                defaultValue={varsayilanUnvan}
                className={SINIF_GIRDI}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-metin">
              Özel metin <span className="text-metin-yumusak">(isteğe bağlı)</span>
            </span>
            <input
              type="text"
              name="metin"
              maxLength={300}
              placeholder="Atölyenin yürütülmesindeki desteği için."
              className={SINIF_GIRDI}
            />
            <span className="mt-1 block text-sm text-metin-yumusak">
              Boş bırakılırsa belge türüne uygun kalıp cümle kullanılır.
            </span>
          </label>
          <button type="submit" className={SINIF_IKINCIL_BUTON}>
            <ExternalLink size={16} aria-hidden />
            Belgeyi aç
          </button>
        </form>
      </Kart>
    </div>
  );
}
