import type { Metadata } from "next";
import { aktifTema } from "@/lib/tema";
import "./globals.css";

export const metadata: Metadata = {
  title: "GençTek Bilgi Sistemi",
  description:
    "GençTek Ekosistemi öğrenci ve danışman öğretmen envanteri, çalışma grupları ve etkinlik başvuru sistemi",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Tema sunucuda okunur; böylece ilk boyamada renk atlaması olmaz.
  const tema = await aktifTema();

  return (
    <html lang="tr" data-tema={tema}>
      <body>{children}</body>
    </html>
  );
}
