import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { depolama } from "@/lib/depolama";
import { talepPanosuGorebilirMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * ONAYLI BİR MENTÖRÜN profil fotoğrafını servis eder.
 *
 * NİYE AYRI BİR ROTA: `/panel/profil/foto` yalnızca oturumdaki kişinin KENDİ
 * fotoğrafını verir ve adreste kimlik taşımaz — o rotanın başlığındaki not bunu
 * açıkça söylüyor: "Başka ekranlarda avatar gösterilmek istenirse bu rota
 * YETMEZ; kimlik alan ve kapsam filtresinden geçen ayrı bir rota gerekir."
 * Mentör havuzu ilk böyle ekran olduğu için o rota burada yazıldı.
 *
 * ERİŞİM KURALI İKİ KOŞULLU ve ikisi de dar:
 *
 *   1. İSTEYEN panoyu görebilmeli (`talepPanosuGorebilirMi`). Havuz panonun
 *      parçası; panoyu göremeyen birinin oradaki kişilerin yüzünü görmesi için
 *      bir sebep yok. Bu koşul 13 Ağustos 2026'da GEVŞEDİ — pano artık merkez
 *      personeline de açık, yani koşul pratikte "oturumu olan" demek. Kapı yine
 *      de buradan geçiyor: pano ekosistem dışına açılırsa (S21) fotoğrafın
 *      kimlere gittiği de aynı yerden değişmeli.
 *   2. HEDEF, durumu ONAYLANDI olan bir mentör olmalı. Onay bekleyen,
 *      reddedilmiş ya da mentörlüğü bırakmış kişinin fotoğrafı verilmez —
 *      kimlik bilinerek adres denenirse bile. Bu, rotayı "her kullanıcının
 *      fotoğrafını veren" genel bir kapıya dönüşmekten alıkoyan asıl kısıt.
 *
 * Kimlik doğrulanamayan ya da koşulları sağlamayan her istek 404 alır, 403
 * değil: 403 "böyle biri var ama göremezsin" der ve kaydın varlığını sızdırır
 * (references/permissions.md · Bölüm 4).
 */
export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !talepPanosuGorebilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const { id } = await params;
  const mentorId = Number.parseInt(id, 10);
  if (!Number.isFinite(mentorId)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  /*
   * Fotoğraf MENTÖRLÜK kaydı üzerinden aranıyor, kullanıcı üzerinden değil:
   * böylece "onaylı mentör mü" koşulu sorgunun kendisinde duruyor ve ayrı bir
   * `if` ile atlanması mümkün değil.
   */
  const kayit = await prisma.mentorluk.findFirst({
    where: { kullaniciId: mentorId, durum: "ONAYLANDI" },
    select: {
      kullanici: {
        select: { fotoDepolamaYolu: true, fotoMimeTipi: true },
      },
    },
  });

  const foto = kayit?.kullanici;
  if (!foto?.fotoDepolamaYolu || !foto.fotoMimeTipi) {
    return new Response("Bulunamadı", { status: 404 });
  }

  let icerik: Buffer;
  try {
    icerik = await depolama().oku(foto.fotoDepolamaYolu);
  } catch {
    // Kayıt var ama dosya yok: 500 yerine 404 daha dürüst bir cevap.
    return new Response("Bulunamadı", { status: 404 });
  }

  /*
   * ERİŞİM LOGU YAZILMIYOR ve bu bilinçli bir sınır. Erişim kaydı, birinin
   * BAŞKASININ kişisel verisine bakmasını izlemek için var (CV indirme gibi).
   * Mentör havuzu ise kişinin kendi rızasıyla girdiği bir vitrindir: mentörlük
   * başvurusu yapmak, "beni arayanlar görsün" demektir. Havuzun her açılışında
   * listedeki her mentör için bir satır yazmak, logu asıl izlemesi gereken
   * olayların görünmez olduğu bir gürültüye çevirirdi.
   */
  return new Response(new Uint8Array(icerik), {
    headers: {
      "Content-Type": foto.fotoMimeTipi,
      "Content-Disposition": "inline",
      "Content-Length": String(icerik.byteLength),
      // private: paylaşımlı ara belleklerde tutulmamalı; fotoğraf kişisel veri.
      "Cache-Control": "private, max-age=300",
    },
  });
}
