import { expect, test } from "@playwright/test";
import { CARPENTER_A, CARPENTER_B, declare, login, uid } from "./helpers";

test.describe("parcours menuisier", () => {
  test("arrive directement sur le formulaire de déclaration", async ({ page }) => {
    await login(page, CARPENTER_A.email, CARPENTER_A.password);
    await expect(page).toHaveURL(/\/declarer/);
    await expect(page.getByRole("heading", { name: "Déclarer un élément" })).toBeVisible();
  });

  test("peut se connecter avec son numéro de téléphone", async ({ page }) => {
    await login(page, CARPENTER_A.phone, CARPENTER_A.password);
    await expect(page).toHaveURL(/\/declarer/);
  });

  test("valide le formulaire en temps réel", async ({ page }) => {
    await login(page, CARPENTER_A.email, CARPENTER_A.password);
    await page.getByLabel("Hauteur en cm").fill("0");
    await page.getByLabel("Hauteur en cm").blur();
    await expect(page.getByText("Hauteur : au moins 1 cm")).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer l'élément" }).click();
    await expect(page.getByText("Ajoutez une photo de l'élément")).toBeVisible();
    await expect(page.getByText("Le client est obligatoire")).toBeVisible();
    await expect(page).toHaveURL(/\/declarer/);
  });

  test("déclare, retrouve, modifie puis supprime un élément", async ({ page }) => {
    const ref = uid();
    await login(page, CARPENTER_A.email, CARPENTER_A.password);
    const url = await declare(page, { client: `Client ${ref}`, l: "240", h: "180", p: "45", project: `Salon ${ref}`, location: "Zone A - Étagère 3", notes: "Bon état" });
    await expect(page.getByTestId("dimensions")).toHaveText("240 × 180 × 45 cm");
    await expect(page.getByText("Élément enregistré.")).toBeVisible();

    // Historique de ses déclarations
    await page.goto("/elements");
    await page.getByLabel("Mots-clés").fill(ref);
    await page.getByLabel("Mots-clés").press("Enter");
    await expect(page.getByTestId("result-count")).toHaveText("1");
    await expect(page.getByTestId("element-card")).toContainText(`Client ${ref}`);

    // Modification, tracée dans l'historique
    await page.goto(url + "/modifier");
    await page.getByLabel("Localisation dans l'atelier").fill("Zone C - Étagère 1");
    await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
    await expect(page.getByText("Zone C - Étagère 1").first()).toBeVisible();
    await expect(page.getByTestId("history")).toContainText("Localisation : Zone A - Étagère 3 → Zone C - Étagère 1");

    // Suppression
    await page.getByRole("button", { name: "Supprimer" }).click();
    await page.getByRole("button", { name: "Confirmer la suppression" }).click();
    await expect(page).toHaveURL(/\/elements/);
    const res = await page.goto(url);
    expect(res?.status()).toBe(404);
  });

  test("ne voit pas les déclarations d'un autre menuisier, même par URL directe", async ({ browser }) => {
    const ref = uid();
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await login(pageA, CARPENTER_A.email, CARPENTER_A.password);
    const url = await declare(pageA, { client: `Secret ${ref}`, l: "100", h: "100", p: "100", project: "Privé", location: "Zone A" });
    const photoSrc = await pageA.locator("img[src^='/api/photos/']").first().getAttribute("src");
    await ctxA.close();

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await login(pageB, CARPENTER_B.email, CARPENTER_B.password);
    expect((await pageB.goto(url))?.status()).toBe(404);
    expect((await pageB.request.get(photoSrc!)).status()).toBe(404);
    await pageB.goto(`/elements?q=${ref}`);
    await expect(pageB.getByTestId("result-count")).toHaveText("0");
    await ctxB.close();
  });

  test("n'a pas accès aux pages d'administration ni à l'export", async ({ page }) => {
    await login(page, CARPENTER_A.email, CARPENTER_A.password);
    for (const path of ["/tableau-de-bord", "/menuisiers", "/equipe"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/declarer/);
    }
    expect((await page.request.get("/api/elements/export")).status()).toBe(403);
    await expect(page.getByRole("link", { name: "Menuisiers" })).toHaveCount(0);
  });
});
