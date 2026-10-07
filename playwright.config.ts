import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout : l'app de production (next start) tourne contre une base dédiée (E2E_DATABASE_URL),
// remplie par le script de démonstration. Les parcours sont joués sur desktop, iPhone portrait et paysage.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://postgres@localhost:5432/palette_e2e";
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "reports/playwright", open: "never" }], ["junit", { outputFile: "reports/playwright/junit.xml" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile/ },
    { name: "mobile-portrait", use: { ...devices["iPhone 13"], browserName: "chromium" }, testMatch: /mobile|carpenter/ },
    { name: "mobile-landscape", use: { ...devices["iPhone 13 landscape"], browserName: "chromium" }, testMatch: /mobile/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL,
      SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-1234",
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_DIR: "./storage-e2e",
      INSECURE_COOKIES: "true",
    },
  },
});
