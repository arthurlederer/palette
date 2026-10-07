import type { NextConfig } from "next";

// Domaines supplémentaires autorisés à appeler les Server Actions (liste séparée par des virgules).
// Nécessaire derrière un relais qui réécrit les en-têtes Origin ou Host, comme le partage de port de GitHub
// Codespaces (Origin y devient http://localhost:3000) : sans cela, Next.js refuse les formulaires
// (« x-forwarded-host … does not match origin »). Lu au lancement de `next start`, mais figé à la compilation
// pour le serveur autonome de l'image Docker.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // Les photos sont compressées dans le navigateur, mais on garde une marge pour les cas où la compression échoue.
    serverActions: { bodySizeLimit: "10mb", allowedOrigins },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
