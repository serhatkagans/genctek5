import type {
  GorevRolKodu,
  LogHedefTip,
  LogIslemi,
  RolKodu,
} from "@/generated/prisma/enums";
import type { OturumKullanicisi } from "./tipler";

export const ROL_ETIKETLERI: Record<RolKodu, string> = {
  OGRENCI: "Öğrenci",
  DANISMAN: "Danışman öğretmen",
  IL_KOORDINATOR: "İl koordinatörü",
  PROJE_YONETICISI: "Proje yöneticisi",
};

/**
 * Öğrenci görev rolleri. Bunlar YETKİ VERMEZ (permissions.md Bölüm 5), yalnızca
 * dönem bazlı görev etiketidir.
 */
export const GOREV_ROL_ETIKETLERI: Record<GorevRolKodu, string> = {
  IL_TEMSILCISI: "İl Temsilcisi",
  OKUL_TEMSILCISI: "Okul Temsilcisi",
};

export const LOG_ISLEM_ETIKETLERI: Record<LogIslemi, string> = {
  GORUNTULEME: "Görüntüleme",
  DEGISIKLIK: "Değişiklik",
  SILME: "Silme",
};

export const LOG_HEDEF_ETIKETLERI: Record<LogHedefTip, string> = {
  OGRENCI: "Öğrenci kaydı",
  OGRETMEN: "Öğretmen kaydı",
  FAALIYET: "Faaliyet",
  YORUM: "Yorum",
  FAALIYET_EK: "Dosya/görsel",
  BASVURU: "Başvuru",
  ROL: "Rol ataması",
  DANISMAN_ATAMA: "Danışman ataması",
  PROFIL: "Profil",
  ERISIM_LOGU: "Erişim kayıtları",
  SISTEM_AYARI: "Sistem ayarı",
  CALISMA_GRUBU: "Çalışma grubu",
  ETKINLIK_PROGRAMI: "Etkinlik programı",
};

/**
 * Kullanıcının rol etiketi. Rolsüz öğretmen de sistemde görünür; danışman
 * listesine girmek için kendisi işaretlemek zorundadır.
 */
export function kullaniciRolEtiketi(kullanici: OturumKullanicisi): string {
  if (kullanici.roller.length === 0) {
    return "Öğretmen (danışmanlık görevi alınmadı)";
  }
  return kullanici.roller
    .map((rol) => ROL_ETIKETLERI[rol.rolKodu])
    .join(" · ");
}
