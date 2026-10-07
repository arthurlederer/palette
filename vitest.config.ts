import path from "node:path";
import { defineConfig } from "vitest/config";

// Deux suites :
// - unit : logique pure (validation, CSV, filtres, jetons), sans base de données ;
// - integration : services métier contre une vraie base PostgreSQL de test (TEST_DATABASE_URL).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    // Les tests d'intégration partagent une base : les fichiers sont exécutés l'un après l'autre.
    fileParallelism: false,
    reporters: process.env.CI_REPORT ? ["default", "junit", "html"] : ["default"],
    outputFile: { junit: "reports/vitest/junit.xml", html: "reports/vitest/index.html" },
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/server/**"],
      exclude: ["src/lib/auth/session.ts", "src/lib/db.ts"],
      reporter: ["text-summary", "html", "json-summary"],
      reportsDirectory: "reports/coverage",
    },
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/integration/global-setup.ts"],
          setupFiles: ["tests/integration/setup.ts"],
        },
      },
    ],
  },
});
