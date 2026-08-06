import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { havuzSiniriniCoz } from "./db-havuz";
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
    }),
  });
}

export const prisma = globalNesne.prismaIstemci ?? istemciOlustur();

if (process.env.NODE_ENV !== "production") {
  globalNesne.prismaIstemci = prisma;
}
