import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import sharp from "sharp";

/** Prépare la base E2E (migrations + données de démonstration) et une photo de test. */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? "postgresql://postgres@localhost:5432/palette_e2e";
  if (!/e2e|test/i.test(new URL(url).pathname)) throw new Error(`E2E_DATABASE_URL doit pointer vers une base de test, reçu : ${url}`);
  const env = { ...process.env, DATABASE_URL: url, LOCAL_STORAGE_DIR: "./storage-e2e", STORAGE_DRIVER: "local", SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-1234" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
  mkdirSync("tests/fixtures", { recursive: true });
  await sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#000", noise: { type: "gaussian", mean: 128, sigma: 40 } } }).jpeg({ quality: 95 }).toFile("tests/fixtures/element.jpg");
}
