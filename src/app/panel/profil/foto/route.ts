import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { depolama } from "@/lib/depolama";

export const dynamic = "force-dynamic";

/**
 * Oturumdaki kişinin KENDİ profil fotoğrafını servis eder.
 *
 * Adreste kullanıcı kimliği YOKTUR ve bilerek yoktur: kimlik parametresi
 * alsaydı "başkasının fotoğrafını kim görebilir" sorusunu cevaplamak ve her
 * istekte kapsam filtresinden geçirmek gerekirdi (bkz. ogrenciler/[id]/cv).
 * Gereksinim yalnızca kişinin kendi profilinde kendi fotoğrafını görmesi
 * olduğu için kapsam sorusu hiç doğmuyor.
 *
 * Başka ekranlarda (öğrenci listesi, öğretmen envanteri) avatar gösterilmek
 * istenirse bu rota YETMEZ; kimlik alan ve `ogrenciKapsamFiltresi` benzeri bir
 * filtreden geçen ayrı bir rota gerekir.
 *
 * Dosya public bir dizine konmaz: depolama anahtarını bilen birinin dosyaya
 * doğrudan ulaşamaması gerekir.
 */
export async function GET() {
  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const kayit = await prisma.kullanici.findUnique({
    where: { id: kullanici.id },
    select: { fotoDepolamaYolu: true, fotoMimeTipi: true },
  });

  if (!kayit?.fotoDepolamaYolu || !kayit.fotoMimeTipi) {
    return new Response("Bulunamadı", { status: 404 });
  }

  let icerik: Buffer;
  try {
    icerik = await depolama().oku(kayit.fotoDepolamaYolu);
  } catch {
    // Kayıt var ama dosya yok: 500 yerine 404 daha dürüst bir cevap.
    return new Response("Bulunamadı", { status: 404 });
  }

  /*
   * Erişim logu YAZILMAZ. Kişinin kendi fotoğrafını görmesi bir "erişim olayı"
   * değildir ve profil sayfasının her açılışında bir satır üretirdi; erişim
   * kaydı, başkasının kişisel verisine bakılmasını izlemek için var
   * (references/permissions.md Bölüm 4). CV rotasından farkı budur — orada
   * danışman ve koordinatör başkasının belgesini indirebiliyor.
   */
  return new Response(new Uint8Array(icerik), {
    headers: {
      "Content-Type": kayit.fotoMimeTipi,
      // inline: fotoğraf <img> ile gösteriliyor, indirilmiyor.
      "Content-Disposition": "inline",
      "Content-Length": String(icerik.byteLength),
      /*
       * private: paylaşımlı ara belleklerde tutulmamalı. Kısa ömürlü bir
       * tarayıcı ön belleği bırakılıyor çünkü fotoğraf her sayfa yenilemesinde
       * yeniden inmemeli; yükleme sonrası tazeliği adresin sonundaki sürüm
       * parametresi sağlıyor (bkz. profil sayfası).
       */
      "Cache-Control": "private, max-age=300, must-revalidate",
    },
  });
}
