"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { cvKaydet, cvSil, cvSinirlariniGetir } from "@/lib/ogrenci/cv";
import {
  kazanimKabulEdilirMi,
  kazanimTipiTanimi,
} from "@/lib/kazanim/kurallar";
import { gunBasi } from "@/lib/tarih";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import {
  BulunamadiHatasi,
  type OturumKullanicisi,
  YetkiHatasi,
} from "@/lib/yetki/tipler";

/**
 * Kişinin kendi kazanım kayıtları ve öğrencinin CV'si —
 * references/domain-rules.md Bölüm 14.
 *
 * Hepsi oturumdaki kişinin KENDİ verisi üzerinde çalışır: `kullaniciId` hiçbir
 * yerde form girdisinden okunmaz, her zaman `kullanici.id`'dir. Danışman ya da
 * koordinatör bir öğrencinin kazanımını giremez/silemez — bunlar beyandır ve
 * sahibi dışında kimse dokunmaz (çalışma grubu eklemeden farkı budur).
 *
 * Kazanım kaydı ÖĞRETMENE DE AÇIKTIR; CV yalnızca öğrencide kalır (dosya
 * alanları `ogrenci_profil` tablosunda). İkisi bu yüzden ayrı kapılardan geçer.
 */

const YOL = "/panel/profil";

function hataylaDon(mesaj: string): never {
  redirect(`${YOL}?hata=${encodeURIComponent(mesaj)}`);
}

async function ogrenciZorunlu() {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!ogrenciMi(kullanici)) {
    throw new YetkiHatasi("CV yalnızca öğrenci profilinde tutulur.");
  }
  return kullanici;
}

/**
 * Kayıt sonrası tazelenecek ekranlar.
 *
 * Kazanım aynı anda üç yerde görünüyor: profil, katkı ekranı ve kişinin
 * envanterdeki detay sayfası. Detay sayfasının yolu role göre değişir
 * (`ogrenciler` / `ogretmenler`); tazelenmezse yetkili, öğrencinin az önce
 * girdiği kaydı eski önbellekten göremezdi.
 */
function kazanimYollariniTazele(kullanici: OturumKullanicisi): void {
  revalidatePath(YOL);
  revalidatePath("/panel/kazanimlarim");
  revalidatePath(
    ogrenciMi(kullanici)
      ? `/panel/ogrenciler/${kullanici.id}`
      : `/panel/ogretmenler/${kullanici.id}`,
  );
}

export async function kazanimEkleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  /*
   * Programın ADI form girdisinden okunmaz, id'siyle veritabanından çekilir:
   * ad da gönderilseydi listede olmayan bir metni "GençTek programı" diye
   * kaydettirmek mümkün olurdu. Pasife alınmış program yeni kayıtta seçilemez,
   * eski kayıtların bağlantısı korunur.
   */
  const programId = Number.parseInt(
    String(veri.get("temelEtkinlikProgramiId") ?? ""),
    10,
  );
  const program = Number.isFinite(programId)
    ? await prisma.temelEtkinlikProgrami.findFirst({
        where: { id: programId, aktif: true },
        select: { id: true, ad: true },
      })
    : null;
  if (Number.isFinite(programId) && !program) {
    hataylaDon("Seçilen GençTek etkinliği bulunamadı.");
  }

  const karar = kazanimKabulEdilirMi({
    tip: String(veri.get("tip") ?? ""),
    baslik: String(veri.get("baslik") ?? ""),
    aciklama: String(veri.get("aciklama") ?? ""),
    // Gün başına alınır: kazanımlarda saat bilgisi sorulmuyor.
    tarih: gunBasi(String(veri.get("tarih") ?? "") || null),
    baglantiUrl: String(veri.get("baglantiUrl") ?? ""),
    derece: String(veri.get("derece") ?? ""),
    duzenleyen: String(veri.get("duzenleyen") ?? ""),
    katilimBicimi: String(veri.get("katilimBicimi") ?? ""),
    hedefKitle: String(veri.get("hedefKitle") ?? ""),
    program,
  });
  if (!karar.olurMu) hataylaDon(karar.neden);

  await prisma.kullaniciKazanim.create({
    data: { kullaniciId: kullanici.id, ...karar.kayit },
  });

  const sahip = ogrenciMi(kullanici) ? "OGRENCI" : "OGRETMEN";
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Kazanım eklendi (${kazanimTipiTanimi(karar.kayit.tip, sahip).baslik}): ${karar.kayit.baslik}`,
  });

  kazanimYollariniTazele(kullanici);
  // Tür adreste taşınır: art arda üç ürün girecek kişi her seferinde sekmeyi
  // yeniden seçmek zorunda kalmasın.
  redirect(`${YOL}?tur=${karar.kayit.tip}&durum=kazanim-eklendi`);
}

export async function kazanimSilEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const kazanimId = Number.parseInt(String(veri.get("kazanimId") ?? ""), 10);
  if (!Number.isFinite(kazanimId)) throw new BulunamadiHatasi();

  /*
   * Silme `deleteMany` ile ve kullaniciId koşuluyla yapılır: `delete` ile id'ye
   * göre silinseydi forma başkasının kazanım id'sini yazan kullanıcı o kaydı
   * silebilirdi. Sahiplik kontrolü ve silme tek sorguda birleşiyor.
   */
  const kazanim = await prisma.kullaniciKazanim.findFirst({
    where: { id: kazanimId, kullaniciId: kullanici.id },
    select: { baslik: true },
  });
  if (!kazanim) throw new BulunamadiHatasi();

  await prisma.kullaniciKazanim.deleteMany({
    where: { id: kazanimId, kullaniciId: kullanici.id },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Kazanım silindi: ${kazanim.baslik}`,
  });

  kazanimYollariniTazele(kullanici);
  redirect(`${YOL}?durum=kazanim-silindi`);
}

export async function cvYukleEylemi(veri: FormData): Promise<void> {
  const kullanici = await ogrenciZorunlu();

  const dosya = veri.get("cv");
  if (!(dosya instanceof File) || dosya.size === 0) {
    hataylaDon("CV dosyası seçilmedi.");
  }

  const sonuc = await cvKaydet({
    ogrenciId: kullanici.id,
    dosya,
    sinirlar: await cvSinirlariniGetir(),
  });
  if (!sonuc.olurMu) hataylaDon(sonuc.neden ?? "CV yüklenemedi.");

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `CV yüklendi: ${dosya.name}`,
  });

  revalidatePath(YOL);
  revalidatePath(`/panel/ogrenciler/${kullanici.id}`);
  redirect(`${YOL}?durum=cv-yuklendi`);
}

export async function cvSilEylemi(): Promise<void> {
  const kullanici = await ogrenciZorunlu();

  const silindi = await cvSil(kullanici.id);
  if (!silindi) hataylaDon("Kaldırılacak bir CV bulunamadı.");

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "CV kaldırıldı",
  });

  revalidatePath(YOL);
  revalidatePath(`/panel/ogrenciler/${kullanici.id}`);
  redirect(`${YOL}?durum=cv-silindi`);
}
