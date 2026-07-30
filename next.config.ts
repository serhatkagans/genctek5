import type { NextConfig } from "next";

/**
 * Güvenlik başlıkları uygulamada tutulur, ters vekilde (nginx) değil.
 *
 * Vekil yapılandırması sunucu taşındığında geride kalır; başlıklar burada
 * olursa korumalar derlemeyle birlikte taşınır.
 */
const guvenlikBasliklari = [
  // Panel hiçbir yerde çerçeve içine alınmamalı: oturum çerezi SameSite=Lax
  // olduğu için tıklama hırsızlığı (clickjacking) tek gerçek risk.
  { key: "X-Frame-Options", value: "DENY" },
  // Yüklenen ek indirilirken tarayıcı MIME tipini tahmin etmeye kalkmasın.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Öğrenci kimliği içeren adresler dış sitelere referrer olarak sızmasın.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

/*
 * Uygulamanın kök dizini. Kendi alan adına kurulduğunda boş, bir alt dizine
 * kurulduğunda "/genctek" gibi bir değer alır.
 *
 * DERLEME ZAMANINDA sabitlenir: bağlantılar, varlık adresleri ve yönlendirmeler
 * bu öneke göre üretilir. Değeri değiştirdikten sonra YENİDEN DERLEMEK şart —
 * yalnızca ortam değişkenini değiştirmek işe yaramaz, sayfalar eski kökten
 * varlık istemeye devam eder.
 *
 * src/lib/ortam.ts aynı değeri çalışma zamanında okur ve çerez yolunu ona göre
 * daraltır; ikisi ayrı düşerse oturum açılır ama hiçbir sayfada görünmez.
 */
const temelYol = process.env.TEMEL_YOL ?? "";

const nextConfig: NextConfig = {
  output: "standalone",
  ...(temelYol ? { basePath: temelYol } : {}),
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  experimental: {
    // Yüklenen dosyalar depolama soyutlamasına gider; istek gövdesi sınırı
    // en büyük izin verilen belge boyutunun biraz üstünde tutulur.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [{ source: "/:yol*", headers: guvenlikBasliklari }];
  },
};

export default nextConfig;
