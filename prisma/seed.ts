/**
 * Réinitialise la base de développement avec les données de démonstration.
 * Usage : npm run db:seed (EFFACE les données existantes : à ne jamais lancer en production).
 */
import { PrismaClient } from "@prisma/client";
import { insertDemoData } from "./demo-data";

const db = new PrismaClient();

async function main() {
  console.log("Nettoyage…");
  await db.elementHistory.deleteMany();
  await db.element.deleteMany();
  await db.client.deleteMany();
  await db.user.deleteMany();
  await db.carpenter.deleteMany();
  await db.loginAttempt.deleteMany();
  await insertDemoData(db);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
