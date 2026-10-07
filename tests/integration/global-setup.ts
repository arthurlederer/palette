import { execSync } from "node:child_process";

/**
 * Applique les migrations sur la base de test (non destructif) avant la suite d'intégration.
 * Les données sont vidées avant chaque test par setup.ts : utilisez toujours une base dédiée aux tests.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5432/palette_test";
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error(`TEST_DATABASE_URL doit pointer vers une base de test (nom contenant "test"), reçu : ${url}`);
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
