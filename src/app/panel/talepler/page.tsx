import { Filter, Handshake, Megaphone, Plus, X } from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  GIZLILIK_UYARISI,
  TALEP_AZAMI_GUN,
  TALEP_TURLERI,
  TALEP_TURU_BELIRTILMEMIS,
  TALEP_TURU_ETIKETLERI,
  talepTuruGecerliMi,
} from "@/lib/iletisim/kurallar";
import type { TalepTuru } from "@/generated/prisma/enums";
import { girdiTarihi, tarihYaz } from "@/lib/tarih";
import { talepPanosuGorebilirMi } from "@/lib/yetki/izinler";
import { baglantiIstegiGonderEylemi } from "../baglantilar/eylemler";
import { talepKapatEylemi, talepAcEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Pano (eski adıyla Talep Panosu) — analiz isteği Bölüm 6, Aşama 1.
 *
 * İLAN PANOSUDUR, mesajlaşma değil: öğrenci "şu alan için takım arkadaşı
 * arıyorum" diye ilan açar, kapsamındakiler görür. Kişiden kişiye temas
 * içermediği için modülün en düşük riskli parçası ve tek başına işe yarıyor.
 *
 * Pano KAPSAM FİLTRESİZ: ilanlar ülke genelinde görünür. Amaç zaten farklı
 * illerden öğrencilerin birbirini bulması; il sınırı konsaydı pano kendi
 * amacını baltalardı. Görünen tek kişisel veri ad, okul ve il — iletişim
 * bilgisi bağlantı onaylanmadan paylaşılmaz.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  acildi: "İlanınız panoya eklendi.",
  "istek-gonderildi":
    "Bağlantı isteğiniz gönderildi. Danışman öğretmeniniz ya da il koordinatörünüz onayladığında yazışma açılır.",
  kapatildi: "İlanınız kapatıldı; listede görünmüyor.",
};

export default async function TaleplerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    durum?: string;
    hata?: string;
    grup?: string;
    ara?: string;
    tur?: string;
  }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum, hata, grup, ara, tur } = await searchParams;

  const acabilir = talepPanosuGorebilirMi(kullanici);
  const simdi = new Date();

  const grupId = Number.parseInt(grup ?? "", 10);
  const aramaMetni = (ara ?? "").trim();

  /*
   * Tür filtresi. "belirtilmemis" ayrı bir seçenek: türü olmayan ESKİ ilanlar
   * (alan 6 Ağustos 2026'da eklendi) hiçbir tür filtresine düşmezdi ve pano
   * filtrelenince sessizce kaybolurlardı.
   */
  const seciliTur = talepTuruGecerliMi(tur ?? "") ? (tur as TalepTuru) : null;
  const tursuzIstendi = tur === "belirtilmemis";

  const [gruplar, talepler, kendiTalepleri] = await Promise.all([
    prisma.calismaGrubu.findMany({
      where: { aktif: true },
      orderBy: { siraNo: "asc" },
      select: { id: true, ad: true },
    }),
    prisma.talep.findMany({
      where: {
        AND: [
          { kapatildiMi: false, sonGecerlilik: { gte: simdi } },
          Number.isFinite(grupId) ? { calismaGrubuId: grupId } : {},
          seciliTur ? { tur: seciliTur } : tursuzIstendi ? { tur: null } : {},
          aramaMetni
            ? {
                OR: [
                  { baslik: { contains: aramaMetni, mode: "insensitive" } },
                  { icerik: { contains: aramaMetni, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      orderBy: { olusturmaTarihi: "desc" },
      take: 60,
      select: {
        id: true,
        tur: true,
        baslik: true,
        icerik: true,
        sonGecerlilik: true,
        olusturmaTarihi: true,
        calismaGrubu: { select: { ad: true } },
        acan: {
          select: {
            id: true,
            ad: true,
            soyad: true,
            sinif: true,
            brans: true,
            kurum: { select: { ad: true } },
            il: { select: { ad: true } },
          },
        },
      },
    }),
    prisma.talep.findMany({
      where: { acanKullaniciId: kullanici.id, kapatildiMi: false },
      orderBy: { olusturmaTarihi: "desc" },
      select: { id: true, baslik: true, sonGecerlilik: true },
    }),
  ]);

  const filtreVar =
    Boolean(aramaMetni) || Number.isFinite(grupId) || Boolean(tur);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Pano"
        aciklama="Ekip arkadaşı, teknik destek, sponsor ve duyuru ilanları. Pano ekosistem dışına açık değildir; ilanları yalnızca sisteme girmiş kullanıcılar görür."
      />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      {/*
        Uyarı panoda da gösteriliyor: kullanıcı iletişimi buradan başlatıyor ve
        kuralı ilk temasta bilmeli. Metin tek bir sabitten geliyor.
      */}
      <BilgiKutusu cesit="uyari">{GIZLILIK_UYARISI}</BilgiKutusu>

      <form method="get" className="rounded-kart border border-cizgi bg-kart p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-baslik">
            <Filter size={16} className="text-vurgu-metin" aria-hidden />
            Ara
          </h2>
          {filtreVar && (
            <Link
              href="/panel/talepler"
              className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
            >
              <X size={14} aria-hidden />
              Temizle
            </Link>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-metin-yumusak">
              Talep türü
            </span>
            <select
              name="tur"
              defaultValue={seciliTur ?? (tursuzIstendi ? "belirtilmemis" : "")}
              className={SINIF_GIRDI}
            >
              <option value="">Tümü</option>
              {TALEP_TURLERI.map((deger) => (
                <option key={deger} value={deger}>
                  {TALEP_TURU_ETIKETLERI[deger]}
                </option>
              ))}
              {/*
                Tür alanı sonradan eklendi; eski ilanların türü boş. Bu seçenek
                olmasaydı o ilanlara filtreyle hiç ulaşılamazdı.
              */}
              <option value="belirtilmemis">{TALEP_TURU_BELIRTILMEMIS}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin-yumusak">
              İlan metninde ara
            </span>
            <input
              type="search"
              name="ara"
              defaultValue={aramaMetni}
              placeholder="görüntü işleme, mobil uygulama…"
              className={SINIF_GIRDI}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin-yumusak">
              Çalışma alanı
            </span>
            <select
              name="grup"
              defaultValue={Number.isFinite(grupId) ? String(grupId) : ""}
              className={SINIF_GIRDI}
            >
              <option value="">Tümü</option>
              {gruplar.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.ad}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className={`${SINIF_IKINCIL_BUTON} mt-3`}>
          Ara
        </button>
      </form>

      {acabilir && (
        <Kart>
          <KartBasligi
            baslik="Yeni ilan"
            aciklama={`En fazla ${TALEP_AZAMI_GUN} gün geçerli olur; süresi dolunca panodan düşer.`}
            Ikon={Plus}
          />
          <form action={talepAcEylemi} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/*
                Tür ZORUNLU (yeni ilanlarda). Seçilemez bir yer tutucu
                kullanılıyor: `required` tek başına, ilk seçenek geçerli bir
                değer olduğunda hiçbir şey yapmaz. Eski ilanlar etkilenmez,
                sütun NULL kabul etmeye devam ediyor.
              */}
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Talep türü
                </span>
                <select
                  name="tur"
                  required
                  defaultValue=""
                  className={SINIF_GIRDI}
                >
                  <option value="" disabled>
                    Seçiniz
                  </option>
                  {TALEP_TURLERI.map((deger) => (
                    <option key={deger} value={deger}>
                      {TALEP_TURU_ETIKETLERI[deger]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-metin">Başlık</span>
                <input
                  type="text"
                  name="baslik"
                  required
                  maxLength={200}
                  className={SINIF_GIRDI}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Çalışma alanı{" "}
                  <span className="text-metin-yumusak">(isteğe bağlı)</span>
                </span>
                <select name="calismaGrubuId" defaultValue="" className={SINIF_GIRDI}>
                  <option value="">Seçilmedi</option>
                  {gruplar.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.ad}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-metin">İlan metni</span>
              <textarea
                name="icerik"
                required
                rows={4}
                maxLength={2000}
                placeholder="Ne yapmak istediğinizi ve nasıl bir arkadaş aradığınızı yazın."
                className={SINIF_GIRDI}
              />
              <span className="mt-1 block text-sm text-metin-yumusak">
                Telefon numarası, adres gibi iletişim bilgilerinizi ilan metnine
                YAZMAYIN. Bağlantı onaylandığında sistem üzerinden yazışırsınız.
              </span>
            </label>
            <label className="block sm:w-64">
              <span className="text-sm font-medium text-metin">
                Son geçerlilik
              </span>
              <input
                type="date"
                name="sonGecerlilik"
                required
                defaultValue={girdiTarihi(
                  new Date(simdi.getTime() + 30 * 86_400_000),
                )}
                className={SINIF_GIRDI}
              />
            </label>
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              <Megaphone size={16} aria-hidden />
              İlanı yayınla
            </button>
          </form>
        </Kart>
      )}

      {kendiTalepleri.length > 0 && (
        <Kart>
          <KartBasligi baslik="Açık ilanlarım" />
          <ul className="divide-y divide-cizgi">
            {kendiTalepleri.map((talep) => (
              <li
                key={talep.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
              >
                <span className="text-metin">
                  {talep.baslik}
                  <span className="ml-2 text-sm text-metin-yumusak">
                    {tarihYaz(talep.sonGecerlilik)} tarihine kadar
                  </span>
                </span>
                <form action={talepKapatEylemi}>
                  <input type="hidden" name="talepId" value={talep.id} />
                  <button type="submit" className={SINIF_IKINCIL_BUTON}>
                    Kapat
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Kart>
      )}

      <Kart>
        <KartBasligi
          baslik="Panodaki ilanlar"
          aciklama={`${talepler.length} ilan${filtreVar ? " (filtreli)" : ""}`}
          Ikon={Megaphone}
        />
        {talepler.length === 0 ? (
          <p className="text-metin-yumusak">
            {filtreVar
              ? "Aramanıza uyan ilan yok."
              : "Panoda henüz ilan yok. İlkini siz açabilirsiniz."}
          </p>
        ) : (
          <ul className="space-y-4">
            {talepler.map((talep) => (
              <li key={talep.id} className="rounded-kart border border-cizgi p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-baslik">{talep.baslik}</h3>
                  <span className="flex flex-wrap items-center gap-2">
                    {/*
                      Tür rozeti önce basılıyor: ilanın NE ARADIĞI, hangi
                      çalışma alanına ait olduğundan önce okunmalı. Türü
                      olmayan eski ilanlar da açıkça etiketleniyor — rozetsiz
                      bırakmak onları "duyuru" sanılabilir hâle getirirdi.
                    */}
                    <span className="rounded-full bg-rol-ogrenci-zemin px-2.5 py-0.5 text-xs font-medium text-rol-ogrenci-metin">
                      {talep.tur
                        ? TALEP_TURU_ETIKETLERI[talep.tur]
                        : TALEP_TURU_BELIRTILMEMIS}
                    </span>
                    {talep.calismaGrubu && (
                      <span className="rounded-full bg-vurgu-zemin px-2.5 py-0.5 text-xs font-medium text-vurgu-metin">
                        {talep.calismaGrubu.ad}
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-metin">
                  {talep.icerik}
                </p>
                <p className="mt-3 text-sm text-metin-yumusak">
                  {talep.acan.ad} {talep.acan.soyad}
                  {" · "}
                  {talep.acan.sinif ?? talep.acan.brans ?? "—"}
                  {" · "}
                  {talep.acan.kurum?.ad ?? talep.acan.il?.ad ?? "—"}
                  {" · "}
                  {tarihYaz(talep.sonGecerlilik)} tarihine kadar
                </p>

                {/*
                  Kendi ilanına istek gönderilmez. İletişim bilgisi burada
                  GÖSTERİLMEZ: taraflar ancak onaydan sonra ve sistem üzerinden
                  konuşur.
                */}
                {acabilir && talep.acan.id !== kullanici.id && (
                  <form
                    action={baglantiIstegiGonderEylemi}
                    className="mt-3 flex flex-wrap items-end gap-2 border-t border-cizgi pt-3"
                  >
                    <input type="hidden" name="talepId" value={talep.id} />
                    <label className="block grow">
                      <span className="text-sm font-medium text-metin">
                        Kendinizi tanıtın
                      </span>
                      <input
                        type="text"
                        name="mesaj"
                        required
                        maxLength={1000}
                        placeholder="Neden bağlanmak istediğinizi kısaca yazın."
                        className={SINIF_GIRDI}
                      />
                    </label>
                    <button type="submit" className={SINIF_IKINCIL_BUTON}>
                      <Handshake size={16} aria-hidden />
                      Bağlantı isteği gönder
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Kart>
    </div>
  );
}
