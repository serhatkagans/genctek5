import type { FaaliyetKapsami, OturumKullanicisi } from "@/lib/yetki/tipler";

/** Testlerde kullanılan kullanıcı ve faaliyet üreticileri. */

const TEMEL: OturumKullanicisi = {
  id: 1,
  authProviderId: "test-1",
  ad: "Test",
  soyad: "Kullanıcı",
  kurumKodu: null,
  ilKodu: null,
  ilceKodu: null,
  sinif: null,
  brans: null,
  egitimOgretimYili: "2025-2026",
  roller: [],
};

export function ogrenciYap(
  ozellikler: Partial<OturumKullanicisi> = {},
): OturumKullanicisi {
  return {
    ...TEMEL,
    id: 100,
    authProviderId: "ogrenci-test",
    kurumKodu: 750001,
    ilKodu: "34",
    ilceKodu: "3401",
    sinif: "11-A",
    roller: [{ rolKodu: "OGRENCI", ilKodu: null, kurumKodu: null }],
    ...ozellikler,
  };
}

export function danismanYap(
  ozellikler: Partial<OturumKullanicisi> = {},
): OturumKullanicisi {
  const kurumKodu = ozellikler.kurumKodu ?? 750001;
  return {
    ...TEMEL,
    id: 200,
    authProviderId: "ogretmen-test",
    kurumKodu,
    ilKodu: "34",
    ilceKodu: "3401",
    brans: "Bilişim Teknolojileri",
    roller: [{ rolKodu: "DANISMAN", ilKodu: null, kurumKodu }],
    ...ozellikler,
  };
}

export function rolsuzOgretmenYap(
  ozellikler: Partial<OturumKullanicisi> = {},
): OturumKullanicisi {
  return {
    ...TEMEL,
    id: 250,
    authProviderId: "ogretmen-rolsuz",
    kurumKodu: 750001,
    ilKodu: "34",
    brans: "Fizik",
    roller: [],
    ...ozellikler,
  };
}

export function koordinatorYap(
  ozellikler: Partial<OturumKullanicisi> = {},
): OturumKullanicisi {
  const ilKodu = ozellikler.ilKodu ?? "34";
  return {
    ...TEMEL,
    id: 300,
    authProviderId: "koordinator-test",
    kurumKodu: null,
    ilKodu,
    roller: [{ rolKodu: "IL_KOORDINATOR", ilKodu, kurumKodu: null }],
    ...ozellikler,
  };
}

export function projeYoneticisiYap(
  ozellikler: Partial<OturumKullanicisi> = {},
): OturumKullanicisi {
  return {
    ...TEMEL,
    id: 400,
    authProviderId: "proje-yoneticisi-test",
    roller: [{ rolKodu: "PROJE_YONETICISI", ilKodu: null, kurumKodu: null }],
    ...ozellikler,
  };
}

export function faaliyetYap(
  ozellikler: Partial<FaaliyetKapsami> = {},
): FaaliyetKapsami {
  return {
    id: 900,
    kapsam: "OKUL",
    kurumKodu: 750001,
    ilKodu: null,
    duzenleyenKullaniciId: 200,
    onayliMi: true,
    ...ozellikler,
  };
}
