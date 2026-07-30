import { ayarSayi } from "../ayar";
import { prisma } from "../db";
import {
  AYAR_BILDIRIM_SAKLAMA_AYI,
  AYAR_ERISIM_LOGU_SAKLAMA_AYI,
  saklamaSonTarihi,
  VARSAYILAN_BILDIRIM_SAKLAMA_AYI,
  VARSAYILAN_ERISIM_LOGU_SAKLAMA_AYI,
} from "./kurallar";

/**
 * Saklama süresi dolan kayıtların temizliği — KVKK'nın "süresiz saklama yok"
 * kuralının uygulanması (references/domain-rules.md Bölüm 10).
 *
 * Silinen şey yalnızca DENETİM ve BİLDİRİM kayıtlarıdır. Öğrenci, başvuru ve
 * faaliyet verisine dokunulmaz: onlar öğrencinin geçmişidir ve ekosistemin
 * raporlaması buna dayanır. Süreler sistem ayarlarından değiştirilebilir.
 */

export interface TemizlikSonucu {
  silinenErisimLogu: number;
  silinenBildirim: number;
  erisimLoguSiniri: Date;
  bildirimSiniri: Date;
}

export async function saklamaSuresiTemizligi(
  simdi: Date = new Date(),
): Promise<TemizlikSonucu> {
  const [erisimAyi, bildirimAyi] = await Promise.all([
    ayarSayi(AYAR_ERISIM_LOGU_SAKLAMA_AYI, VARSAYILAN_ERISIM_LOGU_SAKLAMA_AYI),
    ayarSayi(AYAR_BILDIRIM_SAKLAMA_AYI, VARSAYILAN_BILDIRIM_SAKLAMA_AYI),
  ]);

  const erisimLoguSiniri = saklamaSonTarihi(simdi, erisimAyi);
  const bildirimSiniri = saklamaSonTarihi(simdi, bildirimAyi);

  const silinenErisimLogu = await prisma.erisimlogu.deleteMany({
    where: { tarih: { lt: erisimLoguSiniri } },
  });

  /*
   * Okunmamış bildirim silinmez: kullanıcı görmediği bir haberi süre doldu
   * diye kaybetmemeli. Süresi dolan okunmamış bildirim, işleyişte bir aksaklık
   * olduğunun işaretidir; sessizce silmek onu gizlerdi.
   */
  const silinenBildirim = await prisma.bildirim.deleteMany({
    where: { olusturmaTarihi: { lt: bildirimSiniri }, okunduMu: true },
  });

  return {
    silinenErisimLogu: silinenErisimLogu.count,
    silinenBildirim: silinenBildirim.count,
    erisimLoguSiniri,
    bildirimSiniri,
  };
}
