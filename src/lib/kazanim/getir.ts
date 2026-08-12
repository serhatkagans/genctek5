import type { EtkinlikKategorisi, Kapsam } from "@/generated/prisma/enums";
import { prisma } from "../db";
import { type KatilimAdayi, katilimlariSuz } from "./katilim-kurallar";
import {
  type KatilimKaydi,
  katilimOzeti,
  type KazanimGirdisi,
  type OgretmenKatkiGirdisi,
  ogretmenRozetDurumlari,
  type RozetDurumu,
  rozetDurumlari,
  type SeferDurumu,
  type SeferGirdisi,
  seferDurumlari,
} from "./rozetler";

/**
 * Kazanım verisini toplar.
 *
 * Karar kuralları rozetler.ts içindedir; burada yalnızca veritabanı işi var.
 */

/** Kişinin tamamlanmış GençTek katılımları — öğrencide de öğretmende de aynı. */
export interface KatilimGecmisi {
  ozet: ReturnType<typeof katilimOzeti>;
  katilimlar: (KatilimKaydi & { faaliyetId: number; ad: string })[];
}

export interface KazanimSonucu extends KatilimGecmisi {
  rozetler: RozetDurumu[];
  /**
   * Seferler (seviyeler) yalnızca ÖĞRENCİDE hesaplanır; öğretmenin ölçütleri
   * (ürün, akran eğitimi, temsilcilik) ya yok ya bambaşka anlamda. Öğretmende
   * boş dizi döner ve kart hiç basılmaz.
   */
  seferler: SeferDurumu[];
}

/**
 * Tamamlanmış katılımlar.
 *
 * İKİ KAYNAKTAN beslenir (7 Ağustos 2026): adına üretilmiş BELGELER ve —
 * yalnızca geçiş tarihinden önceki etkinlikler için — SEÇİLMİŞ başvurular.
 * Hangisinin sayıldığına `katilim-kurallar.ts` karar verir; buradaki iş
 * yalnızca iki kaynağı toplamak.
 *
 * İki sorgu tek sorguya indirilemez: biri `basvuru`, öbürü `faaliyet_belgesi`
 * tablosundan geliyor ve aynı faaliyet ikisinde birden çıkabiliyor. Birleştirme
 * `faaliyetId` üzerinde yapılır, yoksa hem seçilmiş hem belgesi olan bir
 * etkinlik listede iki kez görünürdü.
 *
 * Sorgular `katilimciId` üzerinden kurulur — katılımcı öğretmen de olabilir ve
 * kazanım kişinin KENDİ katılımından doğar, adına başvuran kişiden değil.
 */
export async function katilimGecmisiGetir(
  kullaniciId: number,
  simdi: Date = new Date(),
): Promise<KatilimGecmisi> {
  /*
   * Gerçekleşmemiş ya da iptal edilmiş etkinlik katılım sayılmaz — bu koşul
   * İKİ kaynakta da geçerli. Belge etkinlikten önce üretilmiş olabilir
   * (yazdırma hazırlığı); tarihi gelmemiş etkinliği "katıldım" diye
   * göstermek yanlış olurdu.
   */
  const faaliyetKosulu = { tarih: { lt: simdi }, durum: "AKTIF" as const };

  const faaliyetAlanlari = {
    id: true,
    ad: true,
    tarih: true,
    kapsam: true,
    etkinlikKategorisi: true,
  } as const;

  const [basvurular, belgeler] = await Promise.all([
    prisma.basvuru.findMany({
      where: {
        katilimciId: kullaniciId,
        durum: "SECILDI",
        faaliyet: faaliyetKosulu,
      },
      /*
       * Yoklama başvuru satırında duruyor (12 Ağustos 2026): "geldi" katılımı
       * doğrular, "gelmedi" belgesi olsa bile siler. Kararı katilimSayilirMi
       * veriyor; buradaki iş yalnızca alanı taşımak.
       */
      select: {
        katildiMi: true,
        faaliyet: { select: faaliyetAlanlari },
      },
    }),
    /*
     * Belge türü AYIRT EDİLMEZ: katılım belgesi de teşekkür belgesi de
     * "bu kişi bu etkinlikte vardı" demektir. Teşekkür belgesi çoğunlukla
     * konuşmacıya ya da destek verene yazılıyor — o da bir katılımdır ve
     * profilde görünmemesi için bir sebep yok.
     */
    prisma.faaliyetBelgesi.findMany({
      where: { katilimciId: kullaniciId, faaliyet: faaliyetKosulu },
      select: { faaliyet: { select: faaliyetAlanlari } },
    }),
  ]);

  const adaylar = new Map<number, KatilimAdayi>();

  function ekle(
    faaliyet: {
      id: number;
      ad: string;
      tarih: Date;
      kapsam: Kapsam;
      etkinlikKategorisi: EtkinlikKategorisi;
    },
    kaynak: "belge" | "secim",
    katildiMi: boolean | null = null,
  ): void {
    const mevcut = adaylar.get(faaliyet.id);
    if (mevcut) {
      // Aynı faaliyet iki kaynaktan geldiyse işaretler BİRLEŞİR; ikinci kayıt
      // birincinin işaretini silmemeli.
      if (kaynak === "belge") mevcut.belgeVarMi = true;
      else {
        mevcut.secildiMi = true;
        // Yoklama YALNIZCA başvuru satırından gelir; belge kaydında böyle bir
        // alan yok ve varsayılan null, belgeden gelen satırın işaretini
        // silmemeli.
        mevcut.katildiMi = katildiMi;
      }
      return;
    }
    adaylar.set(faaliyet.id, {
      faaliyetId: faaliyet.id,
      ad: faaliyet.ad,
      tarih: faaliyet.tarih,
      kapsam: faaliyet.kapsam,
      etkinlikKategorisi: faaliyet.etkinlikKategorisi,
      belgeVarMi: kaynak === "belge",
      secildiMi: kaynak === "secim",
      katildiMi,
    });
  }

  for (const belge of belgeler) ekle(belge.faaliyet, "belge");
  for (const basvuru of basvurular)
    ekle(basvuru.faaliyet, "secim", basvuru.katildiMi);

  /*
   * `belgeVarMi`, `secildiMi` ve `katildiMi` özet ile rozet hesaplarına GİRMEZ:
   * onların sorduğu şey "kaç etkinliğe katıldı", katılımın nereden doğduğu
   * değil. Alanlar burada düşürülüyor ki aşağı katmanlar bu ayrımı taşımak
   * zorunda kalmasın.
   */
  const katilimlar = katilimlariSuz([...adaylar.values()]).map(
    ({ belgeVarMi: _b, secildiMi: _s, katildiMi: _k, ...katilim }) => katilim,
  );

  return { ozet: katilimOzeti(katilimlar), katilimlar };
}

export async function kazanimlariGetir(
  ogrenciId: number,
  simdi: Date = new Date(),
): Promise<KazanimSonucu> {
  const [
    gecmis,
    calismaGrubuSayisi,
    gorevRolSayisi,
    urunSayisi,
    verdigiEgitimSayisi,
    duzenledigiEtkinlikSayisi,
  ] = await Promise.all([
    katilimGecmisiGetir(ogrenciId, simdi),
    prisma.ogrenciCalismaGrubu.count({ where: { ogrenciId } }),
    prisma.ogrenciGorevRolu.count({ where: { ogrenciId } }),
    // Seferler için: ürün ve akran eğitimi kişinin KENDİ beyanıdır.
    prisma.kullaniciKazanim.count({
      where: { kullaniciId: ogrenciId, tip: "URUN" },
    }),
    prisma.kullaniciKazanim.count({
      where: { kullaniciId: ogrenciId, tip: "AKRAN_EGITIMI" },
    }),
    // Onay bekleyen ya da iptal edilmiş öneri sayılmaz.
    prisma.faaliyet.count({
      where: {
        duzenleyenKullaniciId: ogrenciId,
        durum: "AKTIF",
        onayDurumu: "ONAYLANDI",
      },
    }),
  ]);

  const girdi: KazanimGirdisi = {
    katilimlar: gecmis.katilimlar,
    calismaGrubuSayisi,
    gorevRolSayisi,
  };

  const seferGirdisi: SeferGirdisi = {
    katilimlar: gecmis.katilimlar,
    urunSayisi,
    verdigiEgitimSayisi,
    gorevRolSayisi,
    duzenledigiEtkinlikSayisi,
  };

  return {
    ...gecmis,
    rozetler: rozetDurumlari(girdi),
    seferler: seferDurumlari(seferGirdisi),
  };
}

/**
 * Öğretmenin katkı verisi.
 *
 * Öğrencininkiyle aynı fonksiyon KULLANILMAZ: öğretmenin çalışma grubu seçimi
 * ve öğrenci görev rolü yoktur, onun yerine düzenlediği faaliyetler ve
 * danışmanlığı sayılır. Aynı sorguyu ikisine birden uydurmak, iki tarafta da
 * sürekli sıfır dönen sütunlar demek olurdu.
 */
export async function ogretmenKazanimlariGetir(
  ogretmenId: number,
  simdi: Date = new Date(),
): Promise<KazanimSonucu> {
  const [gecmis, duzenledigiFaaliyet, danismanlik, paydasliFaaliyet] =
    await Promise.all([
      katilimGecmisiGetir(ogretmenId, simdi),
      // İptal edilen faaliyet katkı sayılmaz; onay bekleyen de henüz sayılmaz.
      prisma.faaliyet.count({
        where: {
          duzenleyenKullaniciId: ogretmenId,
          durum: "AKTIF",
          onayDurumu: "ONAYLANDI",
        },
      }),
      prisma.danismanAtama.count({
        where: { danismanKullaniciId: ogretmenId, bitisTarihi: null },
      }),
      prisma.faaliyetPaydas.count({
        where: { faaliyet: { duzenleyenKullaniciId: ogretmenId } },
      }),
    ]);

  const girdi: OgretmenKatkiGirdisi = {
    katilimlar: gecmis.katilimlar,
    duzenledigiFaaliyetSayisi: duzenledigiFaaliyet,
    aktifDanismanlikSayisi: danismanlik,
    paydasliFaaliyetSayisi: paydasliFaaliyet,
  };

  // Seferler öğretmende hesaplanmaz (bkz. KazanimSonucu · seferler).
  return { ...gecmis, rozetler: ogretmenRozetDurumlari(girdi), seferler: [] };
}
