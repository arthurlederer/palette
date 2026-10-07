import { expect, test } from "@playwright/test";
import { ADMIN, CARPENTER_A, declare, login, uid } from "./helpers";

test.describe("authentification", () => {
  test("redirige vers la connexion sans session", async ({ page }) => {
    await page.goto("/elements");
    await expect(page).toHaveURL(/\/connexion\?next=%2Felements/);
    expect((await page.request.get("/api/elements/export")).status()).toBe(401);
  });

  test("affiche une erreur avec de mauvais identifiants", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Email ou téléphone").fill(ADMIN.email);
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Identifiants incorrects")).toBeVisible();
  });

  test("met en avant le logo The Good Experience", async ({ page }) => {
    await page.goto("/connexion");
    await expect(page.getByRole("img", { name: "The Good Experience" }).first()).toBeVisible();
    const logoLoaded = await page.getByRole("img", { name: "The Good Experience" }).first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
    expect(logoLoaded).toBe(true);
  });
});

test.describe("parcours super user", () => {
  test.beforeEach(async ({ page }) => login(page, ADMIN.email, ADMIN.password));

  test("voit le tableau de bord complet", async ({ page }) => {
    await expect(page).toHaveURL(/tableau-de-bord/);
    await expect(page.getByTestId("stat-total")).toHaveText(/^\d+$/);
    await expect(page.getByRole("heading", { name: "Éléments par client" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Éléments par menuisier" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dernières déclarations" })).toBeVisible();
  });

  test("recherche par dimensions, voit les filtres actifs et les réinitialise", async ({ page }) => {
    const ref = uid();
    await login(page, CARPENTER_A.email, CARPENTER_A.password);
    await declare(page, { client: `Dim ${ref}`, l: "350", h: "175", p: "20", project: `Proj ${ref}`, location: "Zone D" });
    await login(page, ADMIN.email, ADMIN.password);

    await page.goto(`/elements?q=${ref}&hMin=150&hMax=200&lMin=300&lMax=400`);
    await expect(page.getByTestId("result-count")).toHaveText("1");
    await expect(page.getByTestId("element-card")).toContainText("350 × 175 × 20 cm");
    await expect(page.getByTestId("element-card")).toContainText(CARPENTER_A.name);
    await expect(page.getByRole("link", { name: /Retirer le filtre H 150–200 cm/ })).toBeVisible();

    await page.goto(`/elements?q=${ref}&hMin=180`);
    await expect(page.getByTestId("result-count")).toHaveText("0");
    await page.getByRole("link", { name: "Réinitialiser" }).click();
    await expect(page).toHaveURL(/\/elements$/);
  });

  test("ouvre la fiche avec la photo en grand et le contact du menuisier", async ({ page }) => {
    await page.goto("/elements");
    await page.getByTestId("element-card").first().click();
    await expect(page.getByRole("heading", { name: "Historique des modifications" })).toBeVisible();
    await expect(page.locator("a[href^='tel:']")).toBeVisible();
    await expect(page.locator("a[href^='mailto:']")).toBeVisible();
    await page.getByRole("button", { name: "Agrandir la photo" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("exporte les résultats en CSV", async ({ page }) => {
    await page.goto("/elements");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Exporter CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^palette-elements-\d{4}-\d{2}-\d{2}\.csv$/);
    const body = await (await download.createReadStream()).toArray();
    const text = Buffer.concat(body).toString("utf8");
    expect(text).toContain("Client;Projet;Longueur (cm)");
  });

  test("crée un menuisier et son compte, qui peut ensuite se connecter", async ({ page, browser }) => {
    const ref = uid();
    await page.goto("/menuisiers/nouveau");
    await page.getByLabel("Nom de l'atelier").fill(`Atelier ${ref}`);
    await page.getByLabel("Nom du contact").fill("Nina Test");
    await page.getByLabel("Téléphone").fill("06 00 00 00 00");
    await page.getByLabel("Email").fill(`contact-${ref}@test.fr`);
    await page.getByRole("button", { name: "Créer le menuisier" }).click();
    await expect(page.getByRole("heading", { name: `Atelier ${ref}` })).toBeVisible();

    await page.getByLabel("Nom et prénom").fill("Nina Test");
    await page.getByLabel("Email de connexion").fill(`nina-${ref}@test.fr`);
    await page.getByLabel("Mot de passe initial").fill("Atelier2026");
    await page.getByRole("button", { name: "Créer le compte" }).click();
    await expect(page.getByText("Compte créé.")).toBeVisible();

    const ctx = await browser.newContext();
    const p2 = await ctx.newPage();
    await login(p2, `nina-${ref}@test.fr`, "Atelier2026");
    await expect(p2).toHaveURL(/\/declarer/);
    await p2.goto("/elements");
    await expect(p2.getByTestId("result-count")).toHaveText("0");
    await ctx.close();
  });

  test("modère une déclaration avec un motif", async ({ page }) => {
    const ref = uid();
    await login(page, CARPENTER_A.email, CARPENTER_A.password);
    const url = await declare(page, { client: `Mod ${ref}`, l: "10", h: "10", p: "10", project: "Test", location: "Zone A" });
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto(url);
    await page.getByRole("button", { name: "Supprimer" }).click();
    await page.getByLabel("Motif de la suppression").fill("Doublon");
    await page.getByRole("button", { name: "Confirmer la suppression" }).click();
    await expect(page).toHaveURL(/\/elements/);
    expect((await page.goto(url))?.status()).toBe(404);
  });
});
