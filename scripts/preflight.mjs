/**
 * Contrôle de démarrage (image Docker) : vérifie la configuration avant de lancer migrations et serveur,
 * pour qu'une variable manquante sur l'hébergeur donne un message clair dans les logs plutôt qu'un crash obscur.
 * Volontairement sans dépendance : il doit tourner même si le reste de l'image est mal configuré.
 */
import { accessSync, constants, mkdirSync } from "node:fs";
import path from "node:path";

const problems = [];
const env = process.env;

if (!env.DATABASE_URL) {
  problems.push("DATABASE_URL est absente. Sur Railway : Variables → DATABASE_URL = ${{Postgres.DATABASE_URL}} (le nom avant le point doit être celui du service PostgreSQL).");
} else if (!/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) {
  problems.push(`DATABASE_URL ne ressemble pas à une URL PostgreSQL (elle commence par « ${env.DATABASE_URL.slice(0, 12)}… »). Vérifiez la référence à la base.`);
}

if (!env.SESSION_SECRET) {
  problems.push("SESSION_SECRET est absente : ajoutez une chaîne aléatoire d'au moins 32 caractères.");
} else if (env.SESSION_SECRET.length < 32) {
  problems.push(`SESSION_SECRET est trop courte (${env.SESSION_SECRET.length} caractères, 32 minimum).`);
}

const driver = env.STORAGE_DRIVER ?? "local";
if (driver === "s3") {
  for (const key of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) {
    if (!env[key]) problems.push(`${key} est requise avec STORAGE_DRIVER=s3.`);
  }
} else if (driver === "local") {
  const dir = path.resolve(env.LOCAL_STORAGE_DIR ?? "./storage");
  try {
    mkdirSync(dir, { recursive: true });
    accessSync(dir, constants.W_OK);
  } catch {
    problems.push(`Le dossier des photos ${dir} n'est pas accessible en écriture (volume mal monté ?).`);
  }
} else {
  problems.push(`STORAGE_DRIVER doit valoir « local » ou « s3 » (reçu : « ${driver} »).`);
}

if (problems.length) {
  console.error("[Palette] Démarrage impossible, configuration à corriger :");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`[Palette] Configuration OK (stockage des photos : ${driver}).`);
