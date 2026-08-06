import type { Prisma } from "@/generated/prisma/client";
import type { EtkinlikKategorisi, Kapsam } from "@/generated/prisma/enums";
import {
  ETKINLIK_KATEGORILERI,
  KAPSAMLAR,
} from "@/lib/faaliyet/kurallar";
import { faaliyetKapsamFiltresi } from "@/lib/yetki/kapsam";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";
import {
  type SorguParametreleri,
  tekil,
} from "../ogrenciler/filtreler";

/**
 * Faaliyet listesi filtrelerinin adres çubuğundan okunması ve sorguya
 * çevrilmesi.
 *
 * Ekran ve CSV dışa aktarma aynı fonksiyonu kullanır; indirilen dosyanın
 * ekranda görünenden farklı bir küme olması ancak bu iki yol ayrı yazılırsa
 * mümkün olur.
 */

export interface FaaliyetFiltreleri {
  kapsam: Kapsam | null;
  kategori: EtkinlikKategorisi | null;
  calismaGrubuId: number | null;
  yalnizcaAcik: boolean;
  yalnizcaBenim: boolean;
  /**
   * Biten ama raporu yazılmamış etkinlikler.
   *
   * Raporlar sekmesi menüden kalktı (J3 · 6 Ağustos 2026) ve o ekranın asıl
   * değeri "hangi raporlar eksik" TOPLU görünümüydü. Görünüm kaybolmasın diye
   * buraya filtre olarak taşındı; etkinlik detayından tek tek bakmak
   * koordinatörün ilindeki eksikleri görmesini imkânsız kılardı.
   */
  yalnizcaRaporsuz: boolean;
}

export function faaliyetFiltreleriniCoz(
  parametreler: SorguParametreleri,
): FaaliyetFiltreleri {
  const kapsam = tekil(parametreler.kapsam);
  const kategori = tekil(parametreler.kategori);
  const grup = Number.parseInt(tekil(parametreler.grup) ?? "", 10);

  return {
    // Tanınmayan değer sessizce düşer; filtre yalnızca daralttığı için
    // geçersiz bir değeri reddetmek yerine yok saymak yeterli.
    kapsam: KAPSAMLAR.includes(kapsam as Kapsam) ? (kapsam as Kapsam) : null,
    kategori: ETKINLIK_KATEGORILERI.includes(kategori as EtkinlikKategorisi)
      ? (kategori as EtkinlikKategorisi)
      : null,
    calismaGrubuId: Number.isFinite(grup) ? grup : null,
    yalnizcaAcik: tekil(parametreler.acik) === "1",
    yalnizcaBenim: tekil(parametreler.benim) === "1",
    yalnizcaRaporsuz: tekil(parametreler.raporsuz) === "1",
  };
}

export function faaliyetFiltresiVarMi(filtreler: FaaliyetFiltreleri): boolean {
  return Object.values(filtreler).some(
    (deger) => deger !== null && deger !== false,
  );
}

export function faaliyetListeFiltresi(
  kullanici: OturumKullanicisi,
  filtreler: FaaliyetFiltreleri,
  simdi: Date,
): Prisma.FaaliyetWhereInput {
  const kosullar: Prisma.FaaliyetWhereInput[] = [
    faaliyetKapsamFiltresi(kullanici),
  ];

  if (filtreler.kapsam) kosullar.push({ kapsam: filtreler.kapsam });
  // Kapsam ve kategori bağımsız filtrelerdir; birlikte de kullanılabilirler.
  if (filtreler.kategori) {
    kosullar.push({ etkinlikKategorisi: filtreler.kategori });
  }
  if (filtreler.calismaGrubuId !== null) {
    kosullar.push({
      calismaGruplari: { some: { calismaGrubuId: filtreler.calismaGrubuId } },
    });
  }
  if (filtreler.yalnizcaAcik) {
    kosullar.push({
      basvuruBaslangic: { lte: simdi },
      basvuruBitis: { gte: simdi },
      onayDurumu: { in: ["ONAY_GEREKMEZ", "ONAYLANDI"] },
    });
  }
  if (filtreler.yalnizcaBenim) {
    kosullar.push({ duzenleyenKullaniciId: kullanici.id });
  }
  if (filtreler.yalnizcaRaporsuz) {
    /*
     * "Bitmiş" ölçütü BİTİŞ tarihidir, varsa; yoksa etkinliğin kendi tarihi.
     * Çok günlü bir etkinlik başlangıç tarihi geçtiği anda "bitti" sayılsaydı,
     * daha sürerken rapor beklenir görünürdü.
     *
     * İptal edilen etkinliğin raporu yazılmaz (bkz. rapor-kurallar.ts), o
     * yüzden listede de yer almaz — yoksa kapanmayan bir görev gibi dururdu.
     */
    kosullar.push({
      durum: "AKTIF",
      rapor: { is: null },
      OR: [
        { bitisTarihi: { lt: simdi } },
        { bitisTarihi: null, tarih: { lt: simdi } },
      ],
    });
  }

  return { AND: kosullar };
}
