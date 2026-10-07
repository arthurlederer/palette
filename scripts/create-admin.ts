/**
 * Crée un super user TGE (premier compte d'une base vide, ou compte de secours).
 * Usage : npx tsx scripts/create-admin.ts "Prénom Nom" email@thegoodexperience.com
 * Le mot de passe est demandé de façon interactive (il n'apparaît pas dans l'historique du terminal).
 */
import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { passwordSchema, userSchema } from "../src/lib/validation";

async function main() {
  const [name, email] = process.argv.slice(2);
  if (!name || !email) {
    console.error('Usage : npx tsx scripts/create-admin.ts "Prénom Nom" email@exemple.com');
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question("Mot de passe (8 caractères min., lettres et chiffres) : ");
  rl.close();
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) throw new Error(pw.error.issues[0].message);
  const input = userSchema.parse({ name, email, password });

  const db = new PrismaClient();
  try {
    const user = await db.user.create({
      data: { name: input.name, email: input.email, passwordHash: await hashPassword(password), role: "ADMIN" },
    });
    console.log(`Super user créé : ${user.email}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
