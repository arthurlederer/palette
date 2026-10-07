import type { NextConfig } from "next";

// Domaines supplémentaires autorisés à appeler les Server Actions (liste séparée par des virgules, joker « * » accepté).
// Nécessaire derrière un relais qui réécrit l'en-tête Host, comme le partage de port de GitHub Codespaces :
// sans cela, Next.js refuse les formulaires (« x-forwarded-host … does not match origin »).
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
