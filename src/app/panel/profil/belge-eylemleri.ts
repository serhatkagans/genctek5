"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { belgeKoduGecerliMi, belgeleriOnayla } from "@/lib/kvkk/onay";
import { erisimLogla } from "@/lib/yetki/log";
import { YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Tek bir belgenin onayı — profilin en altındaki KVKK bölümünden.
 *
 * Eylem /panel/kvkk'dan buraya TAŞINDI: belge akışı menüden kaldırılınca o
 * ekran kalıcı yönlendirmeye dönüştü ve onayın verildiği tek yer profil oldu.
 * İlk giriş kapısının (/onay) kendi toplu onay eylemi ayrıdır ve değişmedi.
 *
 * Onay geri alınamaz bir beyandır; kayıt olarak yalnızca tarihi tutulur. Metin
 * sonradan güncellenirse onay kendiliğinden eskir (bkz. lib/kvkk/kurallar.ts →
 * onayiGerekiyorMu), ayrı bir iptal işlemine gerek yoktur.
 *
 * Kullanıcıdan istenmeyen bir belge kodu gelirse belgeleriOnayla onu yazmaz ve
 * boş liste döner; o durumda sessizce başarılı görünmek yerine yetki hatası
 * veriliyor — form kurcalandığında bunu bilmek gerekir.
 */
export async function belgeOnaylaEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const belge = veri.get("belge");
  if (!belgeKoduGecerliMi(belge)) {
    throw new YetkiHatasi("Tanımsız onay belgesi.");
  }

  const onaylananlar = await belgeleriOnayla(kullanici, [belge]);
  if (onaylananlar.length === 0) {
    throw new YetkiHatasi("Bu belge sizden istenmiyor.");
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Onaylandı: ${onaylananlar[0].baslik}`,
  });

  // Şerit panel düzeninde basılıyor; onaydan sonra kaybolması için düzenin
  // kendisi tazelenmeli, tek sayfa değil.
  revalidatePath("/panel", "layout");
  redirect("/panel/profil?durum=belge-onaylandi#kvkk");
}
