import { expect, test } from "@playwright/test";
import { CARPENTER_A, declare, login, uid } from "./helpers";

// Joué en portrait et en paysage (projets mobile-portrait / mobile-landscape).
test.describe("ergonomie mobile", () => {
  test("le formulaire tient sur un seul écran défilant, sans débordement horizontal", async ({ page }) => {
    await login(page, CARPENTER_A.email, CARPENTER_A.password);
    await expect(page.getByRole("button", { name: "Galerie", exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // Tous les champs sont sur la même page
    for (const label of ["Client", "Longueur en cm", "Hauteur en cm", "Profondeur en cm", "Projet d'origine", "Localisation dans l'atelier"]) {
      await expect(page.getByLabel(label)).toBeAttached();
    }
  });

  test("les boutons sont assez grands pour le pouce (≥ 44 px)", async ({ page }) => {
    await login(page, CARPENTER_A.email, CARPENTER_A.password);
    for (const name of ["Photo", "Galerie", "Enregistrer l'élément"]) {
      const box = await page.getByRole("button", { name, exact: true }).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const tab = await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Mes éléments" }).boundingBox();
    expect(tab!.height).toBeGreaterThanOrEqual(44);
  });

  test("compresse la photo avant l'envoi et déclare depuis le téléphone", async ({ page }) => {
    await login(page, CARPENTER_A.email, CARPENTER_A.password);
    const requests: number[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().includes("/declarer")) requests.push(r.postDataBuffer()?.length ?? 0);
    });
    await declare(page, { client: `Mobile ${uid()}`, l: "120", h: "90", p: "60", project: "Test mobile", location: "Zone B" });
    // La photo de test fait ~2400x1800 px ; après compression, l'envoi reste sous 1 Mo.
    expect(Math.max(...requests)).toBeLessThan(1_000_000);
  });
});
