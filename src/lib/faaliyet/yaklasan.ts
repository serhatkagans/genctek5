import { prisma } from "../db";

/**
 * "Yaklaşan etkinliğim" — kişinin sıradaki KENDİ etkinliği (13 Ağustos 2026).
 *
 * NİYE TAKVİM YETMİYORDU. Panel'deki "Etkinlik takvimi" bölümü kapsam
 * filtresiyle çalışır (bkz. app/panel/page.tsx · faaliyetKapsamFiltresi):
 * kullanıcının GÖREBİLDİĞİ her etkinliği listeler, katılacağını değil. Öğrenci,
 * "Yaklaşan" sütununda ilindeki on etkinliği görüyor ve kendi gideceği,
 * aralarında hiçbir işareti olmayan bir satır olarak duruyordu. Panelde
 * geçmiş katılım sayılıyordu ("Katıldığım etkinlikler"), ileriye dönük taahhüt
 * ise hiçbir yerde yazmıyordu.
 *
 * ===========================================================================
 * ÖLÇÜT ROL DEĞİL, KİŞİSEL BAĞ
 * ===========================================================================
 * Kart role göre dallanmıyor; "bu kişinin o gün orada olması gerekiyor mu"
 * sorusunu soruyor. İki bağ sayılır:
 *
 *   · SEÇİLMİŞ başvuru — yalnızca `SECILDI`. Bekleyen ya da yedek başvuruya
 *     "yaklaşan etkinliğin" demek, henüz verilmemiş bir kararı verilmiş gibi
 *     göstermek olurdu; bu sistemde en pahalı yanlış budur.
 *   · Etkinliği DÜZENLEYEN olmak — öğretmenin kendi açtığı etkinlik.
 *
 * Böylece il koordinatörü ya da merkez, KENDİSİ bir etkinliğe seçilmiş veya
 * onu düzenliyorsa kartı görür; "ilimdeki yaklaşan etkinlik" diye bir kart
 * BASILMAZ — o zaten takvimin kendisidir ve aynı bilgiyi ikinci kez, daha az
 * ayrıntıyla yazmak olurdu.
 *
 * SIFAT DÖNDÜRÜLÜYOR çünkü kartın değeri bir etkinlik ADI: kişi oraya
 * katılımcı olarak mı gidiyor, etkinliği o mu düzenliyor, ekrandan
 * anlaşılmalı. İkisi birdense düzenleyenlik yazılır — o gün asıl sorumluluk
 * odur.
 */

export interface YaklasanEtkinlik {
  id: number;
  ad: string;
  tarih: Date;
  sifat: "DUZENLEYEN" | "KATILIMCI";
}

export async function yaklasanEtkinligimiGetir(
  kullaniciId: number,
  simdi: Date,
): Promise<YaklasanEtkinlik | null> {
  /*
   * Sınır GÜN BAŞI, "şu an" değil: sabah 09.00'da başlamış bir etkinlik saat
   * 10.00'da listeden düşmemeli — kart tam da o gün en çok işe yarıyor.
   */
  const bugunBasi = new Date(
    simdi.getFullYear(),
    simdi.getMonth(),
    simdi.getDate(),
  );

  const faaliyet = await prisma.faaliyet.findFirst({
    where: {
      durum: "AKTIF",
      /*
       * Onay bekleyen etkinlik BASILMAZ. Düzenleyen kendi kaydını onaydan önce
       * de görüyor ama o tarih henüz kesin değil; kartın vaadi "orada ol"
       * demek, oysa etkinlik reddedilebilir.
       */
      onayDurumu: { in: ["ONAY_GEREKMEZ", "ONAYLANDI"] },
      tarih: { gte: bugunBasi },
      OR: [
        { duzenleyenKullaniciId: kullaniciId },
        { basvurular: { some: { katilimciId: kullaniciId, durum: "SECILDI" } } },
      ],
    },
    orderBy: { tarih: "asc" },
    select: { id: true, ad: true, tarih: true, duzenleyenKullaniciId: true },
  });

  if (!faaliyet) return null;

  return {
    id: faaliyet.id,
    ad: faaliyet.ad,
    tarih: faaliyet.tarih,
    sifat:
      faaliyet.duzenleyenKullaniciId === kullaniciId
        ? "DUZENLEYEN"
        : "KATILIMCI",
  };
}
