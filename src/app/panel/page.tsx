import {
  BellRing,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Layers,
  MapPin,
  Send,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { aktifAtamaGetir } from "@/lib/danisman/atama";
import { prisma } from "@/lib/db";
import {
  danismanMi,
  ilKoordinatoruMu,
  koordinatorIlKodu,
  ogrenciMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import {
  faaliyetKapsamFiltresi,
  ogrenciKapsamFiltresi,
} from "@/lib/yetki/kapsam";
import { bildirimOkunduEylemi, tumBildirimleriOkuEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

function OlcumKarti({
  baslik,
  deger,
  aciklama,
  Ikon,
  yol,
}: {
  baslik: string;
  deger: string;
  aciklama?: string;
  Ikon: React.ComponentType<{ size?: number; className?: string }>;
  /** Verilirse kart, ilgili ekrana giden bir bağlantı olur. */
  yol?: string;
}) {
  const icerik = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-metin-yumusak">{baslik}</p>
        <Ikon size={18} className="text-vurgu-metin" />
      </div>
      <p className="mt-1 text-2xl font-bold text-baslik">{deger}</p>
      {aciklama && (
        <p className="mt-1 text-sm text-metin-yumusak">{aciklama}</p>
      )}
    </>
  );

  const sinif = "rounded-kart border border-cizgi bg-kart p-5";

  return yol ? (
    <Link href={yol} className={`${sinif} block transition hover:border-vurgu`}>
      {icerik}
    </Link>
  ) : (
    <div className={sinif}>{icerik}</div>
  );
}

export default async function PanelSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  const bildirimler = await prisma.bildirim.findMany({
    where: { kullaniciId: kullanici.id, okunduMu: false },
    orderBy: { olusturmaTarihi: "desc" },
    take: 5,
  });

  const kapsamdakiOgrenciSayisi = await prisma.kullanici.count({
    where: ogrenciKapsamFiltresi(kullanici),
  });

  const atama = ogrenciMi(kullanici)
    ? await aktifAtamaGetir(kullanici.id)
    : null;

  const grupSayisi = ogrenciMi(kullanici)
    ? await prisma.ogrenciCalismaGrubu.count({
        where: { ogrenciId: kullanici.id },
      })
    : 0;

  // Öğrencinin geri çekilmemiş başvuruları.
  const basvuruSayisi = ogrenciMi(kullanici)
    ? await prisma.basvuru.count({
        where: { ogrenciId: kullanici.id, durum: { not: "GERI_CEKILDI" } },
      })
    : 0;

  // Kapsamdaki başvuruya açık faaliyetler. Filtre merkezi kapsamdan gelir.
  const simdi = new Date();
  const acikFaaliyetSayisi = await prisma.faaliyet.count({
    where: {
      AND: [
        faaliyetKapsamFiltresi(kullanici),
        {
          basvuruBaslangic: { lte: simdi },
          basvuruBitis: { gte: simdi },
          onayDurumu: { in: ["ONAY_GEREKMEZ", "ONAYLANDI"] },
        },
      ],
    },
  });

  const onayBekleyenSayisi = projeYoneticisiMi(kullanici)
    ? await prisma.faaliyet.count({ where: { onayDurumu: "BEKLIYOR" } })
    : 0;

  const rolsuzMu = kullanici.roller.length === 0;

  return (
    <div className="space-y-8">
      <SayfaBasligi
        baslik={`Hoş geldiniz, ${kullanici.ad}`}
        aciklama={`${kullanici.egitimOgretimYili} eğitim-öğretim yılı`}
      />

      {rolsuzMu && (
        <div className="rounded-kart border border-uyari-cizgi bg-uyari-zemin p-6">
          <h2 className="font-semibold text-uyari-metin">
            GençTek danışman öğretmenliği
          </h2>
          <p className="mt-2 text-uyari-metin">
            Sisteme giriş yaptınız ancak henüz danışman öğretmen görevi
            almadınız. Okulunuzdaki öğrencilerin danışman seçim listesinde
            görünmek için profilinizden bu görevi işaretlemeniz gerekiyor.
          </p>
          <Link href="/panel/profil" className={`${SINIF_BIRINCIL_BUTON} mt-4`}>
            Profilime git
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ogrenciMi(kullanici) && (
          <>
            <OlcumKarti
              baslik="Danışman öğretmenim"
              Ikon={UserCheck}
              deger={
                atama
                  ? `${atama.danisman.ad} ${atama.danisman.soyad}`
                  : "Atanmadı"
              }
            />
            <OlcumKarti
              baslik="Çalışma grubu seçimim"
              Ikon={Layers}
              deger={String(grupSayisi)}
              aciklama="Çalışma Gruplarım ekranından güncelleyebilirsiniz"
            />
            <OlcumKarti
              baslik="Faaliyet başvurularım"
              Ikon={Send}
              deger={String(basvuruSayisi)}
              aciklama="Geri çekilenler hariç"
              yol="/panel/faaliyetler"
            />
          </>
        )}

        {danismanMi(kullanici) && (
          <OlcumKarti
            baslik="Danışmanlığımdaki öğrenciler"
            Ikon={Users}
            deger={String(kapsamdakiOgrenciSayisi)}
            aciklama="Kendi okulunuzdaki öğrenciler"
          />
        )}

        {ilKoordinatoruMu(kullanici) && (
          <OlcumKarti
            baslik="İlimdeki öğrenciler"
            Ikon={MapPin}
            deger={String(kapsamdakiOgrenciSayisi)}
            aciklama={`İl kodu: ${koordinatorIlKodu(kullanici) ?? "—"}`}
          />
        )}

        {projeYoneticisiMi(kullanici) && (
          <>
            <OlcumKarti
              baslik="Kayıtlı öğrenciler"
              Ikon={Users}
              deger={String(kapsamdakiOgrenciSayisi)}
              aciklama="Tüm iller"
            />
            <OlcumKarti
              baslik="Onay bekleyen ulusal faaliyet"
              Ikon={ClipboardCheck}
              deger={String(onayBekleyenSayisi)}
              yol="/panel/faaliyetler?kapsam=ULUSAL"
            />
          </>
        )}

        <OlcumKarti
          baslik="Başvurusu açık faaliyet"
          Ikon={CalendarDays}
          deger={String(acikFaaliyetSayisi)}
          aciklama="Kapsamınızda şu an başvuru alanlar"
          yol="/panel/faaliyetler?acik=1"
        />
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
            <BellRing size={18} className="text-vurgu-metin" aria-hidden />
            Bildirimler
          </h2>
          {bildirimler.length > 0 && (
            <form action={tumBildirimleriOkuEylemi}>
              <button
                type="submit"
                className="text-sm font-medium text-vurgu-metin"
              >
                Tümünü okundu işaretle
              </button>
            </form>
          )}
        </div>
        {bildirimler.length === 0 ? (
          <Kart className="text-metin-yumusak">
            <span className="inline-flex items-center gap-2">
              <CheckSquare size={16} aria-hidden />
              Okunmamış bildiriminiz yok.
            </span>
          </Kart>
        ) : (
          <ul className="space-y-2">
            {bildirimler.map((bildirim) => (
              <li
                key={bildirim.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-kart border border-cizgi bg-kart px-4 py-3"
              >
                <div>
                  <p className="font-medium text-metin">{bildirim.baslik}</p>
                  <p className="mt-1 text-sm whitespace-pre-line text-metin-yumusak">
                    {bildirim.icerik}
                  </p>
                </div>
                <form action={bildirimOkunduEylemi}>
                  <input type="hidden" name="bildirimId" value={bildirim.id} />
                  <button
                    type="submit"
                    aria-label="Okundu işaretle"
                    className="rounded-md border border-cizgi px-2.5 py-1 text-xs font-medium text-metin-yumusak transition hover:bg-zemin"
                  >
                    Okundu
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BilgiKutusu>
        Faaliyete dosya/görsel ekleme, yorumlar ve raporlama ekranları
        geliştirme sırasının sonraki adımlarında açılacak.
      </BilgiKutusu>
    </div>
  );
}
