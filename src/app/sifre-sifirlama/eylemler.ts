"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sifirlamayiTamamla, sifirlamaIste } from "@/lib/dis-kimlik/sifirlama";
import { uygulamaYolu } from "@/lib/ortam";

/**
 * Parola sıfırlama eylemleri (yalnızca dış kullanıcılar).
 *
 * SIFIRLAMA BAĞLANTISININ ADRESİ İSTEKTEN ÜRETİLİR, ortam değişkeninden değil.
 * Ayrı bir "uygulama adresi" ayarı, alt dizin kurulumunda (TEMEL_YOL) ikinci
 * bir yanlış yapılandırma kaynağı olurdu: biri güncellenip diğeri unutulunca
 * e-postadaki bağlantı sessizce 404'e giderdi. Uygulama ters vekil arkasında
 * çalıştığı için şema `x-forwarded-proto`dan okunur.
 */
async function istekKoku(): Promise<string> {
  const basliklar = await headers();
  const host = basliklar.get("x-forwarded-host") ?? basliklar.get("host") ?? "";
  const sema = basliklar.get("x-forwarded-proto") ?? "https";
  return `${sema}://${host}`;
}

export async function sifirlamaIsteEylemi(veri: FormData): Promise<void> {
  const eposta = String(veri.get("eposta") ?? "");
  const kok = await istekKoku();

  await sifirlamaIste(eposta, (adres, jeton) => {
    const sorgu = `?e=${encodeURIComponent(adres)}&jeton=${encodeURIComponent(jeton)}`;
    return `${kok}${uygulamaYolu("/sifre-sifirlama")}${sorgu}`;
  });

  /*
   * SONUÇ HER DURUMDA AYNI. E-posta kayıtlı değilse de "gönderildi" denir;
   * aksi hâlde bu ekran "hangi adres bu sistemde kayıtlı" sorusunu cevaplayan
   * bir araca dönerdi.
   */
  redirect("/sifre-sifirlama?durum=gonderildi");
}

export async function sifirlamaTamamlaEylemi(veri: FormData): Promise<void> {
  const eposta = String(veri.get("eposta") ?? "");
  const jeton = String(veri.get("jeton") ?? "");
  const sifre = String(veri.get("sifre") ?? "");
  const sifreTekrar = String(veri.get("sifreTekrar") ?? "");

  const sonuc = await sifirlamayiTamamla(eposta, jeton, sifre, sifreTekrar);

  if (!sonuc.olduMu) {
    // Jeton geri taşınır ki kişi bağlantıyı e-postadan yeniden açmak zorunda
    // kalmasın; şifre alanları taşınmaz.
    redirect(
      `/sifre-sifirlama?e=${encodeURIComponent(eposta)}&jeton=${encodeURIComponent(jeton)}&hata=${encodeURIComponent(sonuc.neden)}`,
    );
  }

  redirect(
    `/dis-giris?bilgi=${encodeURIComponent("Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.")}`,
  );
}
