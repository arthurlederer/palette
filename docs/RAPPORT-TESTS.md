# Rapport de tests · Palette

Généré le 07/10/2026 14:48:03.

| Suite | Résultat | Durée |
|---|---|---|
| Unitaires + intégration (Vitest) | 79 / 79 réussis | 37 s |
| Bout en bout (Playwright : desktop, mobile portrait, mobile paysage) | 27 / 27 réussis | 80 s |

**Couverture du code métier** (src/lib, src/server) : lignes 87.96 %, fonctions 85.07 %, branches 89.09 %.

## Détail Vitest

| Fichier / groupe | Tests | Statut |
|---|---|---|
| tests/unit/csv.test.ts | 4 | ✅ |
| tests/unit/search.test.ts | 4 | ✅ |
| tests/unit/storage-images.test.ts | 5 | ✅ |
| tests/unit/token.test.ts | 6 | ✅ |
| tests/unit/validation.test.ts | 20 | ✅ |
| tests/integration/accounts.test.ts | 10 | ✅ |
| tests/integration/elements.test.ts | 20 | ✅ |
| tests/integration/permissions.test.ts | 10 | ✅ |

## Détail Playwright

| Parcours | Tests | Statut |
|---|---|---|
| admin.spec.ts | 9 | ✅ |
| carpenter.spec.ts | 12 | ✅ |
| mobile.spec.ts | 6 | ✅ |

Rapports détaillés générés localement par `npm run test:all` : `reports/vitest/index.html`, `reports/coverage/index.html`, `reports/playwright/index.html`. La CI GitHub Actions les publie en artefact à chaque modification.
