import next from "eslint-config-next";

const yapilandirma = [
  {
    ignores: [
      "src/generated/**",
      ".next/**",
      "node_modules/**",
      "prisma/migrations/**",
      // Arayüz tasarım prototipi: uygulamaya dahil değil, lint kapsamı dışında.
      "genctek-demo.jsx",
    ],
  },
  ...next,
];

export default yapilandirma;
