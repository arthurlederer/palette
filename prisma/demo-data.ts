/**
 * Données de démonstration : 1 super user, 5 menuisiers avec un compte chacun, ~40 éléments avec photos.
 * Utilisé par prisma/seed.ts (dev, efface tout) et prisma/demo-on-empty.ts (instance de test, base vide uniquement).
 */
import sharp from "sharp";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { createElement } from "../src/server/elements";
import type { Viewer } from "../src/server/viewer";

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Palette2026";
const CARPENTER_PASSWORD = process.env.SEED_CARPENTER_PASSWORD ?? "Atelier2026";

const CARPENTERS = [
  { name: "Atelier Bois & Co", contactName: "Julien Moreau", email: "contact@boisandco.fr", phone: "+33612345601", address: "12 rue des Artisans, 93100 Montreuil", login: "julien@boisandco.fr" },
  { name: "Menuiserie Lefèvre", contactName: "Claire Lefèvre", email: "atelier@lefevre-menuiserie.fr", phone: "+33612345602", address: "ZA du Moulin, 91300 Massy", login: "claire@lefevre-menuiserie.fr" },
  { name: "Agencement Durand", contactName: "Marc Durand", email: "marc@durand-agencement.fr", phone: "+33612345603", address: "4 allée des Chênes, 77400 Lagny", login: "marc@durand-agencement.fr" },
  { name: "Les Ateliers du Stand", contactName: "Sofia Benali", email: "sofia@ateliersdustand.fr", phone: "+33612345604", address: "88 bd Industriel, 95100 Argenteuil", login: "sofia@ateliersdustand.fr" },
  { name: "Ébénisterie Martin", contactName: "Paul Martin", email: "paul@ebenisterie-martin.fr", phone: "+33612345605", address: "3 chemin Vert, 78000 Versailles", login: "paul@ebenisterie-martin.fr" },
];

const CLIENTS = ["Abbott", "L'Oréal", "Schneider Electric", "Dassault Systèmes", "Decathlon", "Sanofi", "Renault", "Hermès"];
const PROJECTS = ["VivaTech 2025", "Salon de l'Agriculture 2026", "Maison&Objet Janvier", "Medica Düsseldorf", "Mondial de l'Auto 2024", "Pollutec Lyon", "SIAL Paris", "CES Las Vegas"];
const TYPES = [
  { label: "Comptoir d'accueil", l: [180, 260], h: [100, 115], p: [60, 80] },
  { label: "Cloison", l: [200, 400], h: [250, 300], p: [8, 12] },
  { label: "Totem lumineux", l: [60, 100], h: [220, 300], p: [40, 60] },
  { label: "Vitrine", l: [80, 150], h: [150, 200], p: [40, 60] },
  { label: "Estrade", l: [300, 600], h: [10, 20], p: [200, 400] },
  { label: "Mobilier bar", l: [120, 220], h: [105, 110], p: [50, 70] },
];
const NOTES = [undefined, "Bon état, quelques rayures sur la face avant", "Manque 2 vis de fixation", "Peinture à reprendre", "Prêt à repartir", undefined, "Éclairage LED à tester"];

const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/** Image de démonstration : silhouette de l'élément aux bonnes proportions. */
async function demoPhoto(label: string, l: number, h: number, hue: number) {
  const scale = Math.min(700 / l, 420 / h);
  const w = Math.max(20, l * scale);
  const hh = Math.max(14, h * scale);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
    <rect width="1200" height="900" fill="hsl(${hue},12%,92%)"/>
    <rect x="${600 - w / 2}" y="${620 - hh}" width="${w}" height="${hh}" rx="6" fill="hsl(${hue},35%,55%)" stroke="#111" stroke-width="4"/>
    <line x1="120" y1="620" x2="1080" y2="620" stroke="#111" stroke-width="3"/>
    <text x="600" y="740" font-family="Helvetica, Arial" font-size="44" font-weight="700" text-anchor="middle" fill="#111">${label}</text>
    <text x="600" y="800" font-family="Helvetica, Arial" font-size="32" text-anchor="middle" fill="#555">${l} × ${h} cm</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
}

/** Insère les données de démonstration (n'efface rien). */
export async function insertDemoData(db: PrismaClient) {
  const admin = await db.user.create({
    data: { name: "Arthur Lederer", email: "admin@thegoodexperience.com", passwordHash: await hashPassword(ADMIN_PASSWORD), role: "ADMIN" },
  });
  console.log(`Super user : admin@thegoodexperience.com / ${ADMIN_PASSWORD}`);

  for (const [i, c] of CARPENTERS.entries()) {
    const { login, ...data } = c;
    const carpenter = await db.carpenter.create({ data });
    const user = await db.user.create({
      data: {
        name: c.contactName,
        email: login,
        phone: c.phone,
        passwordHash: await hashPassword(CARPENTER_PASSWORD),
        role: "CARPENTER",
        carpenterId: carpenter.id,
      },
    });
    const viewer: Viewer = { id: user.id, name: user.name, email: user.email, role: "CARPENTER", carpenterId: carpenter.id };
    const count = 6 + (i % 3) * 2;
    for (let n = 0; n < count; n++) {
      const t = pick(TYPES);
      const input = {
        clientName: pick(CLIENTS),
        lengthCm: rand(t.l[0], t.l[1]),
        heightCm: rand(t.h[0], t.h[1]),
        depthCm: rand(t.p[0], t.p[1]),
        project: pick(PROJECTS),
        location: `Zone ${"ABCD"[n % 4]} - Étagère ${rand(1, 8)}`,
        notes: [t.label, pick(NOTES)].filter(Boolean).join(". "),
      };
      const el = await createElement(viewer, input, await demoPhoto(t.label, input.lengthCm, input.heightCm, (i * 70 + n * 13) % 360));
      // Étale les dates de déclaration sur les 60 derniers jours pour un tableau de bord réaliste.
      const createdAt = new Date(Date.now() - rand(0, 60) * 86400_000);
      await db.element.update({ where: { id: el.id }, data: { createdAt } });
      await db.elementHistory.updateMany({ where: { elementId: el.id }, data: { createdAt } });
    }
    console.log(`${c.name} : ${login} / ${CARPENTER_PASSWORD} (${count} éléments)`);
  }
  void admin;
}
