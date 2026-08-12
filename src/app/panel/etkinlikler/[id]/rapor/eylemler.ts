"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { ekKaydet, ekSinirlariniGetir } from "@/lib/faaliyet/ek-kaydet";
import { faaliyetKapsamiCikar, gorunurFaaliyetGetir } from "@/lib/faaliyet/erisim";
import {
  raporMetniniCoz,
  raporYazilabilirMi,
} from "@/lib/faaliyet/rapor-kurallar";
import { faaliyetRaporuYazabilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Faaliyet raporunun yazılması ve güncellenmesi.
 *
 * Rapor SİLİNMEZ: yazıldıktan sonra düzeltilebilir ama kaldırılamaz. Biten bir
 * etkinliğin değerlendirmesinin ortadan kaybolması, raporlamanın anlamını
 * yitirmesi olurdu.
 */

function hataylaDon(yol: string, mesaj: string): never {
  redirect(`${yol}?hata=${encodeURIComponent(mesaj)}`);
}

export async function raporKaydetEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const faaliyetId = Number.parseInt(String(veri.get("faaliyetId") ?? ""), 10);
  if (!Number.isFinite(faaliyetId)) throw new BulunamadiHatasi();

  const yol = `/panel/etkinlikler/${faaliyetId}/rapor`;

  // Kapsam dışındaki faaliyet burada da 404 verir; varlığı sızmaz.
  const faaliyet = await gorunurFaaliyetGetir(kullanici, faaliyetId);
  if (!faaliyet) throw new BulunamadiHatasi();

  if (
    !faaliyetRaporuYazabilirMi(kullanici, faaliyetKapsamiCikar(faaliyet))
  ) {
    throw new YetkiHatasi("Bu etkinliğin raporunu yazma yetkiniz yok.");
  }

  const hazir = raporYazilabilirMi({
    tarih: faaliyet.tarih,
    bitisTarihi: faaliyet.bitisTarihi,
    durum: faaliyet.durum,
    simdi: new Date(),
  });
  if (!hazir.olurMu) hataylaDon(yol, hazir.neden ?? "Rapor yazılamaz.");

  const karar = raporMetniniCoz({
    degerlendirme: String(veri.get("degerlendirme") ?? ""),
    kazanimlar: String(veri.get("kazanimlar") ?? ""),
  });
  if (!karar.olurMu) hataylaDon(yol, karar.neden);

  const vardiOnce = await prisma.faaliyetRaporu.findUnique({
    where: { faaliyetId },
    select: { faaliyetId: true },
  });

  await prisma.faaliyetRaporu.upsert({
    where: { faaliyetId },
    update: {
      degerlendirme: karar.degerlendirme,
      kazanimlar: karar.kazanimlar,
      // Yazan GÜNCELLENİR: raporu en son kim düzenlediyse odur.
      yazanKullaniciId: kullanici.id,
    },
    create: {
      faaliyetId,
      degerlendirme: karar.degerlendirme,
      kazanimlar: karar.kazanimlar,
      yazanKullaniciId: kullanici.id,
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "FAALIYET",
    hedefId: faaliyetId,
    detay: `Etkinlik raporu ${vardiOnce ? "güncellendi" : "yazıldı"}: ${faaliyet.ad}`,
  });

  /*
   * GÖRSELLER AYNI GÖNDERİMDE (12 Ağustos 2026 · istek: "rapor ekranında
   * görsel ekle deyince etkinlik sayfasına gidiyor ve burada yazdığım alanlar
   * siliniyor").
   *
   * Eskiden bu kart yalnızca etkinliğin ek yükleme bölümüne BAĞLANIYORDU;
   * bağlantıya basan kişi yazdığı raporu kaydetmeden sayfadan çıkıyor ve metni
   * kaybediyordu. Ayrı bir yükleme formu koymak da aynı sonucu verirdi: form
   * gönderimi sayfayı yeniler ve doldurulmuş metin alanları sıfırlanır.
   *
   * Bu yüzden dosyalar rapor formunun İÇİNDE: tek gönderimde önce metin
   * kaydedilir, sonra görseller yüklenir. Rapor kaydedilmeden hiçbir şey
   * sayfadan çıkmıyor, dolayısıyla kaybolacak metin de yok.
   *
   * Yükleme rapor kaydından SONRA yapılıyor: bir görsel reddedilirse (tip ya da
   * boyut) rapor metni yine de kaydedilmiş olur. Tersi sırada, kabul edilmeyen
   * tek bir dosya yüzünden yazılan rapor da kaybolurdu.
   */
  const gorseller = veri
    .getAll("gorseller")
    .filter((deger): deger is File => deger instanceof File && deger.size > 0);

  const yuklemeHatalari: string[] = [];

  if (gorseller.length > 0) {
    const sinirlar = await ekSinirlariniGetir();

    for (const dosya of gorseller) {
      const sonuc = await ekKaydet({
        faaliyetId,
        yukleyenKullaniciId: kullanici.id,
        dosya,
        sinirlar,
        // İlk görsel etkinliğin kapağı olur; kapak zaten varsa dokunulmaz.
        kapakYap: faaliyet.kapakEkId === null,
      });

      if (!sonuc.olurMu) {
        yuklemeHatalari.push(`${dosya.name}: ${sonuc.neden ?? "kabul edilmedi"}`);
        continue;
      }

      await erisimLogla({
        kullaniciId: kullanici.id,
        islem: "DEGISIKLIK",
        hedefTip: "FAALIYET_EK",
        hedefId: sonuc.ekId!,
        detay: `Rapor ekranından görsel yüklendi: ${dosya.name} (${faaliyet.ad})`,
      });
    }
  }

  revalidatePath(yol);
  revalidatePath(`/panel/etkinlikler/${faaliyetId}`);

  /*
   * Reddedilen dosya varsa mesaj HATA olarak dönüyor ama rapor kaydedilmiş
   * durumda; metin "rapor kaydedildi, şu dosyalar alınmadı" diyor. Sessiz
   * geçilseydi kullanıcı görselin yüklendiğini sanırdı.
   */
  if (yuklemeHatalari.length > 0) {
    hataylaDon(
      yol,
      `Rapor kaydedildi ancak bazı görseller alınmadı — ${yuklemeHatalari.join(" · ")}`,
    );
  }

  redirect(`${yol}?durum=${vardiOnce ? "guncellendi" : "yazildi"}`);
}
