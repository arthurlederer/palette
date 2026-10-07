/**
 * Instance de test : charge les données de démonstration au démarrage si SEED_DEMO=true
 * ET que la base ne contient encore aucun compte. Ne modifie jamais une base déjà utilisée.
 * Lancé par le Dockerfile avant le serveur (compilé en dist/demo-on-empty.cjs).
 */
import { PrismaClient } from "@prisma/client";
import { insertDemoData } from "./demo-data";

async function main() {
  if (process.env.SEED_DEMO !== "true") return;
  const db = new PrismaClient();
  try {
    const users = await db.user.count();
    if (users > 0) {
      console.log("SEED_DEMO : la base contient déjà des comptes, aucune donnée de démonstration ajoutée.");
      return;
    }
    console.log("SEED_DEMO : base vide, chargement des données de démonstration…");
    await insertDemoData(db);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  // Une erreur de démo ne doit pas empêcher l'app de démarrer.
  console.error("SEED_DEMO : échec du chargement des données de démonstration", e);
});
