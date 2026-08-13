import { School, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { tarihYaz } from "@/lib/tarih";
import { rolEnvanteriGorebilirMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * YEĞİTEK OKUL SORUMLULARI (13 Ağustos 2026).
 *
 * İSTEK: "proje yöneticisinin yönetim panelinde de YEĞİTEK Okul Sorumlusu
 * isminde bir kart olsun ve oradan onların listesini görebilsin".
 *
 * YALNIZCA MERKEZ (rolEnvanteriGorebilirMi): liste ülke geneli bir görünümdür
 * ve rol/atama envanteriyle aynı kategoride — kim nerede hangi görevde. İl
 * koordinatörüne açılması ayrı bir karardır; açılırsa kapsam filtresi
 * (ilKodu) buraya eklenmeli. Yetkisi olmayan 404 görür, ekranın varlığı
 * sızmasın.
 *
 * İŞARET BEYANDIR, ATAMA DEĞİL: öğretmen kendisi işaretliyor (bkz.
 * app/panel/eylemler.ts). Ekran bunu açıkça yazıyor — liste bir yetki tablosu
 * gibi okunmamalı.
 */
export default async function OkulSorumlulariSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ ara?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!rolEnvanteriGorebilirMi(kullanici)) notFound();

  const { ara } = await searchParams;
  const aramaMetni = (ara ?? "").trim();

  /*
   * Sorgu PROFİL üzerinden yürüyor, kullanıcı üzerinden değil: koşul
   * (`yegitekOkulSorumlusu`) o tabloda ve kısmi indeks de onu taşıyor
   * (bkz. migration). Kullanıcıdan başlansaydı her satır için profil
   * birleştirilir, işaretsizler de taranırdı.
   */
  const sorumlular = await prisma.ogretmenProfil.findMany({
    where: {
      yegitekOkulSorumlusu: true,
      kullanici: {
        aktif: true,
        ...(aramaMetni
          ? {
              OR: [
                { ad: { contains: aramaMetni, mode: "insensitive" as const } },
                { soyad: { contains: aramaMetni, mode: "insensitive" as const } },
                {
                  kurum: {
                    ad: { contains: aramaMetni, mode: "insensitive" as const },
                  },
                },
              ],
            }
          : {}),
      },
    },
    orderBy: [
      { kullanici: { il: { ad: "asc" } } },
      { kullanici: { ad: "asc" } },
    ],
    take: 500,
    select: {
      kullaniciId: true,
      yegitekIsaretlemeTarihi: true,
      eposta: true,
      telefon: true,
      kullanici: {
        select: {
          ad: true,
          soyad: true,
          brans: true,
          kurum: { select: { ad: true } },
          il: { select: { ad: true } },
          ilce: { select: { ad: true } },
          /*
            DANIŞMANLIK DURUMU DA BASILIYOR: işaret danışman öğretmende
            konuyor ama görevini sonradan bırakan kişide işaret kalmaya devam
            eder (bırakma, profil bayrağına dokunmuyor). Merkez bu satırları
            görebilmeli — "sorumlu görünüyor ama artık danışman değil"
            listedeki en işe yarar bilgi.
          */
          roller: {
            where: { rolKodu: "DANISMAN", bitisTarihi: null },
            select: { rolKodu: true },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="YEĞİTEK Okul Sorumluları"
        aciklama="Panelinde kendini YEĞİTEK Okul Sorumlusu olarak işaretlemiş danışman öğretmenler."
      />

      <BilgiKutusu>
        Bu liste bir <strong>beyandır</strong>, atama değil: öğretmen işareti
        kendi panelinden koyar ve onay aranmaz. İşaret hiçbir ek veri erişimi
        vermez — yalnızca okulda YEĞİTEK&apos;in muhatabının kim olduğunu
        gösterir.
      </BilgiKutusu>

      <Kart>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="block grow">
            <span className="text-sm font-medium text-metin">
              Ad, soyad ya da okul
            </span>
            <input
              type="search"
              name="ara"
              defaultValue={aramaMetni}
              placeholder="Örn. Kadıköy Anadolu"
              className={SINIF_GIRDI}
            />
          </label>
          <button type="submit" className={SINIF_IKINCIL_BUTON}>
            Ara
          </button>
          {aramaMetni && (
            <Link
              href="/panel/okul-sorumlulari"
              className="text-sm font-medium text-vurgu-metin underline underline-offset-2"
            >
              Temizle
            </Link>
          )}
        </form>
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Sorumlular"
          aciklama={`${sorumlular.length} kişi${aramaMetni ? " (filtreli)" : ""}`}
          Ikon={ShieldCheck}
        />
        {sorumlular.length === 0 ? (
          <p className="text-metin-yumusak">
            {aramaMetni
              ? "Aramanıza uyan sorumlu bulunamadı."
              : "Henüz kimse kendini YEĞİTEK Okul Sorumlusu olarak işaretlemedi."}
          </p>
        ) : (
          <ul className="divide-y divide-cizgi">
            {sorumlular.map((satir) => (
              <li key={satir.kullaniciId} className="py-3">
                <p className="flex flex-wrap items-center gap-2 font-medium text-metin">
                  <School size={15} className="text-vurgu-metin" aria-hidden />
                  {satir.kullanici.ad} {satir.kullanici.soyad}
                  {satir.kullanici.roller.length === 0 && (
                    <span className="rounded-full bg-uyari-zemin px-2.5 py-0.5 text-xs font-semibold text-uyari-metin">
                      Danışmanlık görevi yok
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-metin-yumusak">
                  {satir.kullanici.kurum?.ad ?? "Okul kaydı yok"}
                  {" · "}
                  {[satir.kullanici.ilce?.ad, satir.kullanici.il?.ad]
                    .filter(Boolean)
                    .join(" / ") || "—"}
                  {" · "}
                  {satir.kullanici.brans ?? "Branş girilmemiş"}
                </p>
                <p className="mt-0.5 text-sm text-metin-yumusak">
                  {satir.yegitekIsaretlemeTarihi
                    ? `${tarihYaz(satir.yegitekIsaretlemeTarihi)} tarihinde işaretledi`
                    : "İşaretleme tarihi yok"}
                  {" · "}
                  {satir.eposta ?? "e-posta girilmemiş"}
                  {satir.telefon ? ` · ${satir.telefon}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Kart>
    </div>
  );
}
