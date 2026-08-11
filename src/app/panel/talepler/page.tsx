import {
  Filter,
  GraduationCap,
  Handshake,
  LifeBuoy,
  Megaphone,
  X,
} from "lucide-react";
import Link from "next/link";
import { RolEtiketi, RolsuzEtiketi } from "@/components/RolEtiketi";
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
import type { RolKodu, TalepTuru } from "@/generated/prisma/enums";
import {
  type HavuzMentoru,
  mentorHavuzunuGetir,
} from "@/lib/mentor/veri";
import { uygulamaYolu } from "@/lib/ortam";
import { girdiTarihi, tarihYaz } from "@/lib/tarih";
import { talepPanosuGorebilirMi } from "@/lib/yetki/izinler";
import { baglantiIstegiGonderEylemi } from "../baglantilar/eylemler";
import { talepKapatEylemi, talepAcEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Pano (eski adıyla Talep Panosu) — analiz isteği Bölüm 6, Aşama 1.
 *
 * İLAN PANOSUDUR, mesajlaşma değil: kullanıcı "şu konuda desteğe ihtiyacım
 * var" diye talep açar, panoyu gören herkes okur. Kişiden kişiye temas
 * içermediği için modülün en düşük riskli parçası ve tek başına işe yarıyor.
 *
 * 10 AĞUSTOS 2026'DAN İTİBAREN İKİ TALEP TÜRÜ AÇILIR: destek talebi ve mentör
 * talebi (bkz. PANODAN_ACILABILIR_TURLER). Daha önce açılmış ekip arkadaşı,
 * genel ve sponsor ilanları listede ve tür süzgecinde durmaya devam eder.
 *
 * Pano KAPSAM FİLTRESİZ: ilanlar ülke genelinde görünür. Amaç zaten farklı
 * illerden öğrencilerin birbirini bulması; il sınırı konsaydı pano kendi
 * amacını baltalardı. Görünen tek kişisel veri ad, okul ve il — iletişim
 * bilgisi bağlantı onaylanmadan paylaşılmaz.
 */

/**
 * Talebi açanın rol kodları — aynı rolden birden fazla kayıt varsa (ör. iki
 * okulda danışmanlık) rozet iki kez basılmasın diye tekilleştirilir.
 */
function acanRolleri(roller: { rolKodu: RolKodu }[]): RolKodu[] {
  return [...new Set(roller.map((rol) => rol.rolKodu))];
}

/**
 * Panodaki talep formu. Aynı gövde iki kartta kullanılıyor; türü kart
 * belirliyor ve gizli alanla gönderiliyor.
 *
 * TÜR SEÇİMİ KALKTI (10 Ağustos 2026 · istek: "Talep türü kalkacak … alt alta
 * iki alan olacak, ikisi birleşik olmayacak, biri destek talebi aç diğeri
 * mentör talebi aç"). Sadeleşmenin özü bu: kullanıcı "hangi türü seçmeliyim"
 * sorusuna hiç girmiyor, doldurduğu kart cevabı zaten veriyor.
 *
 * ÇALIŞMA ALANI DA KALKTI (aynı istek). Sütun ve rozet duruyor — daha önce
 * alanı seçilmiş ilanlar panoda etiketli görünmeye devam ediyor — yalnızca
 * yeni talepte sorulmuyor.
 *
 * BUNUN SONUCU: panodan artık yalnızca bu iki tür talep açılabiliyor. Ekip
 * arkadaşı / genel / sponsor ilanları açılmıyor; var olanlar listede ve tür
 * süzgecinde duruyor (10 Ağustos 2026'da açıkça böyle istendi).
 */
/**
 * MENTÖR HAVUZU IZGARASI (11 Ağustos 2026 · istek: "mentör talebi aç kısmında
 * ızgara şeklinde mentörler listelensin").
 *
 * Talep formunun ÜSTÜNDE duruyor, altında değil: kullanıcı "kime soracağım"
 * sorusunun cevabını görmeden talebini yazarsa, boşluğa sesleniyormuş gibi
 * olur. Havuzu önce göstermek, talebin metnini de iyileştiriyor — kimin hangi
 * konuda yol gösterdiğini gören kişi daha isabetli yazıyor.
 *
 * KART BİR BAĞLANTI DEĞİL. Tıklanabilir bir profil bağlantısı vermek, panonun
 * bugün tutmadığı bir sözü verirdi: mentörün profilini görüntüleyecek bir ekran
 * ve onun kapsam kuralı yok. Havuz "kimler var" sorusunu cevaplıyor; temas yine
 * talep açmaktan ve bağlantı isteğinden geçiyor.
 *
 * IZGARA, etkinlik kartlarındaki gibi `auto-fill` ile kuruluyor: mentör sayısı
 * 3 de olabilir 60 da, sabit sütun sayısı ikisinden birinde kötü görünürdü.
 */
function MentorHavuzu({ mentorler }: { mentorler: HavuzMentoru[] }) {
  if (mentorler.length === 0) {
    return (
      <div className="mb-5 rounded-kart border border-cizgi bg-zemin p-4 text-sm text-metin-yumusak">
        Havuzda henüz onaylanmış mentör yok. Talebinizi yine de açabilirsiniz;
        mentörlük onaylandıkça panodaki ilanınız görülecek.
      </div>
    );
  }

  return (
    <div className="mb-5">
      <p className="mb-2 text-sm font-medium text-metin">
        Havuzdaki mentörler{" "}
        <span className="font-normal text-metin-yumusak">
          ({mentorler.length} kişi · talebinizi buradakiler görür)
        </span>
      </p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
        {mentorler.map((mentor) => (
          <li
            key={mentor.kullaniciId}
            className="flex flex-col items-center rounded-kart border border-cizgi p-3 text-center"
          >
            {mentor.fotografiVarMi ? (
              /*
               * next/image KULLANILMIYOR: kaynak, yetki kontrolü yapan dinamik
               * bir rota (mentorler/[id]/foto) ve optimizasyon katmanı o
               * isteği oturum çerezi olmadan yeniden yapardı — her fotoğraf
               * 404 dönerdi.
               */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={uygulamaYolu(`/panel/mentorler/${mentor.kullaniciId}/foto`)}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              /*
               * Fotoğrafı olmayan mentör için BAŞ HARF. Boş bir çerçeve
               * bırakmak ızgarayı delik deşik gösterirdi ve fotoğraf yüklemek
               * zorunlu değil.
               */
              <span
                aria-hidden
                className="flex h-16 w-16 items-center justify-center rounded-full bg-vurgu-zemin text-lg font-semibold text-vurgu-metin"
              >
                {mentor.adSoyad
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((parca) => parca[0])
                  .join("")}
              </span>
            )}
            <span className="mt-2 text-sm font-medium text-metin">
              {mentor.adSoyad}
            </span>
            <span className="text-xs text-metin-yumusak">{mentor.sifat}</span>
            {mentor.kapsam && (
              <span className="mt-1 text-xs text-vurgu-metin">
                {mentor.kapsam}
              </span>
            )}
            {mentor.ilAdi && (
              <span className="mt-1 text-xs text-metin-yumusak">
                {mentor.ilAdi}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TalepFormu({
  tur,
  baslik,
  aciklama,
  Ikon,
  yerTutucu,
  dugmeMetni,
  simdi,
  children,
}: {
  tur: TalepTuru;
  baslik: string;
  aciklama: string;
  Ikon: React.ComponentType<{ size?: number; className?: string }>;
  yerTutucu: string;
  dugmeMetni: string;
  simdi: Date;
  /** Form ile başlık arasına giren isteğe bağlı bölüm (mentör havuzu). */
  children?: React.ReactNode;
}) {
  return (
    <Kart>
      <KartBasligi baslik={baslik} aciklama={aciklama} Ikon={Ikon} />
      {children}
      <form action={talepAcEylemi} className="space-y-4">
        <input type="hidden" name="tur" value={tur} />
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
          <span className="text-sm font-medium text-metin">Talep metni</span>
          <textarea
            name="icerik"
            required
            rows={4}
            maxLength={2000}
            placeholder={yerTutucu}
            className={SINIF_GIRDI}
          />
          <span className="mt-1 block text-sm text-metin-yumusak">
            Telefon numarası, adres gibi iletişim bilgilerinizi metne YAZMAYIN.
            Bağlantı onaylandığında sistem üzerinden yazışırsınız.
          </span>
        </label>
        <label className="block sm:w-64">
          <span className="text-sm font-medium text-metin">Son geçerlilik</span>
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
          <Ikon size={16} />
          {dugmeMetni}
        </button>
      </form>
    </Kart>
  );
}

const DURUM_MESAJLARI: Record<string, string> = {
  acildi: "Talebiniz panoya eklendi.",
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

  const [gruplar, talepler, kendiTalepleri, mentorler] = await Promise.all([
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
            /*
              TALEBİ KİM AÇTI (10 Ağustos 2026 · istek: "talebi öğretmen mi
              öğrenci mi açmış görünsün"). Sınıf/branş alanı dolaylı bir
              ipucuydu ve ikisi de boşsa hiçbir şey söylemiyordu; rol açıkça
              yazılıyor. Yalnızca SÜREN roller — görevi bitmiş bir öğretmeni
              hâlâ danışman diye göstermek yanlış olurdu.
            */
            roller: {
              where: { bitisTarihi: null },
              select: { rolKodu: true },
            },
          },
        },
      },
    }),
    prisma.talep.findMany({
      where: { acanKullaniciId: kullanici.id, kapatildiMi: false },
      orderBy: { olusturmaTarihi: "desc" },
      select: { id: true, baslik: true, sonGecerlilik: true },
    }),
    /*
     * Mentör havuzu, talep formunun üstünde gösteriliyor (bkz. MentorHavuzu).
     * Diğer sorgularla AYNI Promise.all içinde: sırayla beklenseydi panonun
     * açılışına gereksiz bir gidiş dönüş eklenirdi.
     */
    mentorHavuzunuGetir(),
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

      {/*
        İKİ AYRI FORM, ALT ALTA (10 Ağustos 2026 · istek: "burada alt alta iki
        alan olacak ikisi birleşik olmayacak"). Tek formda tür seçtirmek,
        kullanıcıyı talebini yazmadan önce bir sınıflandırma kararına
        zorluyordu; iki kart bu kararı ortadan kaldırıyor.
      */}
      {acabilir && (
        <>
          <TalepFormu
            tur="TEKNIK_DESTEK"
            baslik="Destek talebi aç"
            aciklama={`Takıldığınız bir konuda yardım isteyin. En fazla ${TALEP_AZAMI_GUN} gün geçerli olur; süresi dolunca panodan düşer.`}
            Ikon={LifeBuoy}
            yerTutucu="Hangi konuda desteğe ihtiyacınız olduğunu yazın."
            dugmeMetni="Destek talebi aç"
            simdi={simdi}
          />
          <TalepFormu
            tur="MENTORE_SOR"
            baslik="Mentör talebi aç"
            aciklama={`Yol gösterecek bir mentöre sorun. En fazla ${TALEP_AZAMI_GUN} gün geçerli olur; süresi dolunca panodan düşer.`}
            Ikon={GraduationCap}
            yerTutucu="Hangi alanda yol göstermesini istediğinizi yazın."
            dugmeMetni="Mentör talebi aç"
            simdi={simdi}
          >
            <MentorHavuzu mentorler={mentorler} />
          </TalepFormu>
        </>
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
            {talepler.map((talep) => {
              const roller = acanRolleri(talep.acan.roller);
              return (
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
                {/*
                  Rol rozeti adın YANINDA duruyor, satırın sonunda değil:
                  panoda okunan ilk şey "bunu kim yazmış" ve bir öğrencinin
                  destek talebiyle öğretmenin talebi aynı ağırlıkta değil.
                  Rolsüz öğretmen de nötr bir etiketle görünür — etiketsiz
                  bırakılsaydı öğrenci sanılırdı.
                */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-metin-yumusak">
                  {roller.length > 0 ? (
                    roller.map((rolKodu) => (
                      <RolEtiketi key={rolKodu} rolKodu={rolKodu} />
                    ))
                  ) : (
                    <RolsuzEtiketi />
                  )}
                  <span>
                    {talep.acan.ad} {talep.acan.soyad}
                    {" · "}
                    {talep.acan.sinif ?? talep.acan.brans ?? "—"}
                    {" · "}
                    {talep.acan.kurum?.ad ?? talep.acan.il?.ad ?? "—"}
                    {" · "}
                    {tarihYaz(talep.sonGecerlilik)} tarihine kadar
                  </span>
                </div>

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
              );
            })}
          </ul>
        )}
      </Kart>
    </div>
  );
}
