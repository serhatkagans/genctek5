import type { RolKodu } from "@/generated/prisma/enums";
import { ROL_ETIKETLERI } from "@/lib/yetki/etiketler";

/**
 * Rol etiketi. Her rol kendi renk kodunda görünür, böylece hangi rolle
 * bakıldığı her ekranda anında okunur. Renkler temaya göre değişir.
 */

const ROL_SINIFLARI: Record<RolKodu, string> = {
  OGRENCI: "bg-rol-ogrenci-zemin text-rol-ogrenci-metin",
  DANISMAN: "bg-rol-danisman-zemin text-rol-danisman-metin",
  IL_KOORDINATOR: "bg-rol-koordinator-zemin text-rol-koordinator-metin",
  PROJE_YONETICISI: "bg-rol-yonetici-zemin text-rol-yonetici-metin",
};

export function RolEtiketi({
  rolKodu,
  ekBilgi,
}: {
  rolKodu: RolKodu;
  ekBilgi?: string | null;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${ROL_SINIFLARI[rolKodu]}`}
    >
      {ROL_ETIKETLERI[rolKodu]}
      {ekBilgi ? ` · ${ekBilgi}` : ""}
    </span>
  );
}

/** Rolsüz kullanıcı (danışmanlık görevi almamış öğretmen) için nötr etiket. */
export function RolsuzEtiketi() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-uyari-zemin px-2.5 py-1 text-xs font-medium text-uyari-metin">
      Öğretmen · görev alınmadı
    </span>
  );
}
