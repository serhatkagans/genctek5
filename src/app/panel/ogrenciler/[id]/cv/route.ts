import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { depolama } from "@/lib/depolama";
import { ogrenciKapsamFiltresi } from "@/lib/yetki/kapsam";
import { erisimLogla } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * Öğrencinin CV'sini indirir.
 *
 * Dosya public bir dizinden servis EDİLMEZ: her istek önce oturumdan, sonra
 * merkezi öğrenci kapsam filtresinden geçer. Aksi halde adresi bilen herkes
 * herhangi bir öğrencinin özgeçmişini indirebilirdi.
 *
 * Kapsam dışı öğrencide 403 değil 404 döner — kaydın varlığı sızmasın
 * (references/permissions.md Bölüm 4). Öğrencinin kendi CV'si de bu yoldan
 * iner: kapsam filtresi öğrenci için "yalnızca kendisi" filtresi üretiyor,
 * ayrı bir dal gerekmiyor.
 */
export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const ogrenciId = Number.parseInt(id, 10);
  if (!Number.isInteger(ogrenciId)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const ogrenci = await prisma.kullanici.findFirst({
    where: { AND: [{ id: ogrenciId }, ogrenciKapsamFiltresi(kullanici)] },
    select: {
      id: true,
      ogrenciProfil: {
        select: {
          cvDosyaAdi: true,
          cvDepolamaYolu: true,
          cvMimeTipi: true,
        },
      },
    },
  });

  const cv = ogrenci?.ogrenciProfil;
  if (!cv?.cvDepolamaYolu || !cv.cvDosyaAdi || !cv.cvMimeTipi) {
    return new Response("Bulunamadı", { status: 404 });
  }

  let icerik: Buffer;
  try {
    icerik = await depolama().oku(cv.cvDepolamaYolu);
  } catch {
    // Kayıt var ama dosya yok: 500 yerine 404 daha dürüst bir cevap.
    return new Response("Bulunamadı", { status: 404 });
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "OGRENCI",
    hedefId: ogrenciId,
    detay: `Öğrenci CV'si indirildi: ${cv.cvDosyaAdi}`,
  });

  return new Response(new Uint8Array(icerik), {
    headers: {
      "Content-Type": cv.cvMimeTipi,
      /*
       * `attachment`: pdf tarayıcıda açılabilir ama doc/docx açılamaz ve
       * "inline" başlığıyla gelen bir Word belgesi bazı tarayıcılarda adsız
       * indirilir. Dosya adı ASCII dışı karakter içerebildiği için RFC 5987
       * biçimi kullanılır.
       */
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(cv.cvDosyaAdi)}`,
      "Content-Length": String(icerik.byteLength),
      // Kapsam kontrolünden geçen içerik ara belleklerde tutulmamalı.
      "Cache-Control": "private, no-store",
    },
  });
}
