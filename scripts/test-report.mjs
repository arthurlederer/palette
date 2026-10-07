#!/usr/bin/env node
/**
 * Lance toutes les suites de tests et produit un rapport consolidé :
 *   reports/RAPPORT-TESTS.md        synthèse lisible (résultats par suite + couverture)
 *   reports/vitest/index.html       détail des tests unitaires et d'intégration
 *   reports/coverage/index.html     couverture de code
 *   reports/playwright/index.html   détail des tests de bout en bout (captures en cas d'échec)
 * Prérequis : base de test et base E2E accessibles, `npm run build` effectué.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

mkdirSync("reports", { recursive: true });

function run(label, cmd, args, env = {}) {
  console.log(`\n▶ ${label}`);
  const started = Date.now();
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env }, shell: process.platform === "win32" });
  return { label, ok: r.status === 0, seconds: Math.round((Date.now() - started) / 1000) };
}

/** Lit un fichier JUnit et compte les tests par suite (attribut name des testsuite). */
function junit(path) {
  if (!existsSync(path)) return null;
  const xml = readFileSync(path, "utf8");
  const cases = [...xml.matchAll(/<testcase\b[^>]*?classname="([^"]*)"[^>]*?(\/>|>([\s\S]*?)<\/testcase>)/g)];
  const out = { total: 0, failed: 0, skipped: 0, byFile: {} };
  for (const [, classname, , body = ""] of cases) {
    const failed = /<failure|<error/.test(body);
    const skipped = /<skipped/.test(body);
    out.total++;
    if (failed) out.failed++;
    if (skipped) out.skipped++;
    const f = (out.byFile[classname] ??= { total: 0, failed: 0 });
    f.total++;
    if (failed) f.failed++;
  }
  return out;
}

const results = [
  run("Tests unitaires + intégration (Vitest, avec couverture)", "npx", ["vitest", "run", "--coverage"], { CI_REPORT: "1" }),
  run("Tests de bout en bout (Playwright)", "npx", ["playwright", "test"]),
];

const vitest = junit("reports/vitest/junit.xml");
const pw = junit("reports/playwright/junit.xml");
const cov = existsSync("reports/coverage/coverage-summary.json") ? JSON.parse(readFileSync("reports/coverage/coverage-summary.json", "utf8")).total : null;

const line = (s) => (s ? `${s.total - s.failed - s.skipped} / ${s.total} réussis${s.failed ? ` · **${s.failed} en échec**` : ""}` : "non exécuté");
const table = (s) =>
  s ? Object.entries(s.byFile).map(([f, v]) => `| ${f} | ${v.total} | ${v.failed ? `❌ ${v.failed}` : "✅"} |`).join("\n") : "";

const md = `# Rapport de tests · Palette

Généré le ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}.

| Suite | Résultat | Durée |
|---|---|---|
| Unitaires + intégration (Vitest) | ${line(vitest)} | ${results[0].seconds} s |
| Bout en bout (Playwright : desktop, mobile portrait, mobile paysage) | ${line(pw)} | ${results[1].seconds} s |

${cov ? `**Couverture du code métier** (src/lib, src/server) : lignes ${cov.lines.pct} %, fonctions ${cov.functions.pct} %, branches ${cov.branches.pct} %.` : ""}

## Détail Vitest

| Fichier / groupe | Tests | Statut |
|---|---|---|
${table(vitest)}

## Détail Playwright

| Parcours | Tests | Statut |
|---|---|---|
${table(pw)}

Rapports détaillés : \`reports/vitest/index.html\`, \`reports/coverage/index.html\`, \`reports/playwright/index.html\`.
`;

writeFileSync("reports/RAPPORT-TESTS.md", md);
console.log("\nRapport écrit dans reports/RAPPORT-TESTS.md");
process.exit(results.every((r) => r.ok) ? 0 : 1);
