import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { BOSTA_KALMA_SURESI_MS, havuzSiniriniCoz } from "./db-havuz";
import { ortam } from "./ortam";

// Geliştirme sırasında Next.js modülleri sık yeniden yüklediği için bağlantı
// havuzunu global nesnede saklıyoruz; aksi halde her yenilemede yeni havuz açılır.
const globalNesne = globalThis as unknown as { prismaIstemci?: PrismaClient };

function istemciOlustur(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: ortam.DATABASE_URL,
      /*
       * Havuz sınırı AÇIKÇA veriliyor: `DATABASE_URL` içindeki
       * `connection_limit` Prisma'ya özgüdür ve bu adaptör onu okumaz
       * (bkz. db-havuz.ts). Verilmezse adrese yazılan sınır sessizce düşer.
       */
      max: havuzSiniriniCoz(ortam.DATABASE_URL),
      /*
       * Boşta kalan bağlantı, sunucu onu kapatmadan ÖNCE bırakılır. Ayar
       * olmadan havuz ölü bağlantıyı sıradaki isteğe veriyor ve sayfa "Server
       * has closed the connection" ile 500 dönüyordu
       * (bkz. db-havuz.ts · BOSTA_KALMA_SURESI_MS).
       */
      idleTimeoutMillis: BOSTA_KALMA_SURESI_MS,
    }),
  });
}

export const prisma = globalNesne.prismaIstemci ?? istemciOlustur();

if (process.env.NODE_ENV !== "production") {
  globalNesne.prismaIstemci = prisma;
}
