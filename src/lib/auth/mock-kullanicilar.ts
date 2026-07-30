import type { AuthKimlik } from "./tipler";

/**
 * EBA SSO gelene kadar kullanılan test kullanıcı kataloğu.
 *
 * Set, references/data-model.md Bölüm 10'daki öneriye göre kurgulandı: farklı
 * okullardan öğrenciler, aynı okulda iki danışman adayı öğretmen (seçim
 * ekranını test etmek için), danışmanı olmayan bir okul, il koordinatörü
 * bulunmayan bir il ve bir proje yöneticisi.
 *
 * Bu kullanıcılar veritabanına önceden yazılmaz; ilk girişte kullanıcı sağlama
 * (provisioning) akışıyla oluşurlar. Tek istisna, seed'in oluşturduğu proje
 * yöneticisi ve il koordinatörleridir — bu roller elle atandığı için sistemde
 * bir başlangıç yöneticisi bulunmak zorundadır.
 */

export const EGITIM_OGRETIM_YILI = "2025-2026";

export const MOCK_KIMLIKLER: AuthKimlik[] = [
  // --- Kadıköy Anadolu Lisesi (750001): iki danışman adayı öğretmen var ---
  {
    authProviderId: "ogrenci-001",
    tip: "OGRENCI",
    ad: "Elif",
    soyad: "Yılmaz",
    cinsiyet: "K",
    kurumKodu: 750001,
    ilKodu: "34",
    ilceKodu: "3401",
    sinif: "11-A",
    brans: null,
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },
  {
    authProviderId: "ogrenci-002",
    tip: "OGRENCI",
    ad: "Yusuf",
    soyad: "Demir",
    cinsiyet: "E",
    kurumKodu: 750001,
    ilKodu: "34",
    ilceKodu: "3401",
    sinif: "10-B",
    brans: null,
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },
  {
    authProviderId: "ogretmen-001",
    tip: "OGRETMEN",
    ad: "Ahmet",
    soyad: "Öztürk",
    cinsiyet: "E",
    kurumKodu: 750001,
    ilKodu: "34",
    ilceKodu: "3401",
    sinif: null,
    brans: "Bilişim Teknolojileri",
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },
  {
    authProviderId: "ogretmen-002",
    tip: "OGRETMEN",
    ad: "Fatma",
    soyad: "Çelik",
    cinsiyet: "K",
    kurumKodu: 750001,
    ilKodu: "34",
    ilceKodu: "3401",
    sinif: null,
    brans: "Matematik",
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },

  // --- Üsküdar Fen Lisesi (750002): danışman adayı yok, öğrenci il
  //     koordinatörüne bağlanmalı ---
  {
    authProviderId: "ogrenci-003",
    tip: "OGRENCI",
    ad: "Zeynep",
    soyad: "Kaya",
    cinsiyet: "K",
    kurumKodu: 750002,
    ilKodu: "34",
    ilceKodu: "3402",
    sinif: "12-C",
    brans: null,
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },
  {
    authProviderId: "ogretmen-003",
    tip: "OGRETMEN",
    ad: "Hasan",
    soyad: "Yıldız",
    cinsiyet: "E",
    kurumKodu: 750002,
    ilKodu: "34",
    ilceKodu: "3402",
    sinif: null,
    brans: "Fizik",
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },

  // --- Çankaya Bilim ve Sanat Merkezi (750003, Ankara): tek danışman adayı,
  //     otomatik atama senaryosu ---
  {
    authProviderId: "ogrenci-004",
    tip: "OGRENCI",
    ad: "Mert",
    soyad: "Aydın",
    cinsiyet: "E",
    kurumKodu: 750003,
    ilKodu: "06",
    ilceKodu: "0601",
    sinif: "9-A",
    brans: null,
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },
  {
    authProviderId: "ogretmen-004",
    tip: "OGRETMEN",
    ad: "Merve",
    soyad: "Arslan",
    cinsiyet: "K",
    kurumKodu: 750003,
    ilKodu: "06",
    ilceKodu: "0601",
    sinif: null,
    brans: "Bilişim Teknolojileri",
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },

  // --- İpekyolu Anadolu Lisesi (750004, Van): ilin koordinatörü YOK.
  //     Kenar durum: öğrenci atanamaz, proje yöneticisine uyarı düşer ---
  {
    authProviderId: "ogrenci-005",
    tip: "OGRENCI",
    ad: "Ayşe",
    soyad: "Şahin",
    cinsiyet: "K",
    kurumKodu: 750004,
    ilKodu: "65",
    ilceKodu: "6501",
    sinif: "11-B",
    brans: null,
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },

  // --- İl koordinatörleri (rolleri seed tarafından atanır) ---
  {
    authProviderId: "koordinator-34",
    tip: "OGRETMEN",
    ad: "Selim",
    soyad: "Koç",
    cinsiyet: "E",
    kurumKodu: null,
    ilKodu: "34",
    ilceKodu: null,
    sinif: null,
    brans: "Bilişim Teknolojileri",
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },
  {
    authProviderId: "koordinator-06",
    tip: "OGRETMEN",
    ad: "Nalan",
    soyad: "Kurt",
    cinsiyet: "K",
    kurumKodu: null,
    ilKodu: "06",
    ilceKodu: null,
    sinif: null,
    brans: "Fen Bilimleri",
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },

  // --- Proje yöneticileri (YEĞİTEK) ---
  // Üç kişi: proje yöneticiliği tek kişilik bir görev değil, ekip işidir.
  // Onay bekleyen ulusal faaliyet ve "öğrenci atanamadı" gibi uyarılar
  // üçüne birden düşer (bkz. projeYoneticilerineBildir).
  {
    authProviderId: "proje-yoneticisi-burcu-yilmaz",
    tip: "PERSONEL",
    ad: "Burcu",
    soyad: "Yılmaz",
    cinsiyet: "K",
    kurumKodu: null,
    ilKodu: null,
    ilceKodu: null,
    sinif: null,
    brans: null,
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },
  {
    authProviderId: "proje-yoneticisi-cansu-sultan-yetkin",
    tip: "PERSONEL",
    ad: "Cansu Sultan",
    soyad: "Yetkin",
    cinsiyet: "K",
    kurumKodu: null,
    ilKodu: null,
    ilceKodu: null,
    sinif: null,
    brans: null,
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },
  {
    authProviderId: "proje-yoneticisi-canan-altun-akyol",
    tip: "PERSONEL",
    ad: "Canan",
    soyad: "Altun Akyol",
    cinsiyet: "K",
    kurumKodu: null,
    ilKodu: null,
    ilceKodu: null,
    sinif: null,
    brans: null,
    egitimOgretimYili: EGITIM_OGRETIM_YILI,
  },
];

export const MOCK_KOORDINATOR_KIMLIKLERI = [
  { authProviderId: "koordinator-34", ilKodu: "34" },
  { authProviderId: "koordinator-06", ilKodu: "06" },
] as const;

/**
 * Proje yöneticisi rolü verilecek kimlikler.
 *
 * Bu listeden ÇIKARILAN bir kişinin rolü seed tarafından kapatılır ve kaydı
 * pasife alınır; silinmez, çünkü açtığı faaliyetler ve erişim logları ona
 * bağlıdır (bkz. prisma/seed.ts · baslangicYoneticileriniOlustur).
 */
export const MOCK_PROJE_YONETICISI_KIMLIKLERI = [
  "proje-yoneticisi-burcu-yilmaz",
  "proje-yoneticisi-cansu-sultan-yetkin",
  "proje-yoneticisi-canan-altun-akyol",
] as const;

export function mockKimlikBul(authProviderId: string): AuthKimlik | null {
  return (
    MOCK_KIMLIKLER.find(
      (kimlik) => kimlik.authProviderId === authProviderId,
    ) ?? null
  );
}
