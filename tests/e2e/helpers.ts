import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: "admin@thegoodexperience.com", password: "Palette2026" };
export const CARPENTER_A = { email: "julien@boisandco.fr", phone: "06 12 34 56 01", password: "Atelier2026", name: "Atelier Bois & Co" };
export const CARPENTER_B = { email: "claire@lefevre-menuiserie.fr", password: "Atelier2026", name: "Menuiserie Lefèvre" };

export async function login(page: Page, identifier: string, password: string) {
  await page.context().clearCookies(); // repart d'une session vierge (changement d'utilisateur dans un même test)
  await page.goto("/connexion");
  await page.getByLabel("Email ou téléphone").fill(identifier);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/);
}

/** Identifiant court et unique, pour retrouver les données créées par un test. */
export const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

/** Déclare un élément via le formulaire et renvoie l'URL de sa fiche. */
export async function declare(page: Page, d: { client: string; l: string; h: string; p: string; project: string; location: string; notes?: string }) {
  await page.goto("/declarer");
  await page.getByTestId("photo-input").setInputFiles("tests/fixtures/element.jpg");
  await expect(page.getByAltText("Aperçu de la photo")).toBeVisible();
  await page.getByLabel("Client").fill(d.client);
  await page.getByLabel("Longueur en cm").fill(d.l);
  await page.getByLabel("Hauteur en cm").fill(d.h);
  await page.getByLabel("Profondeur en cm").fill(d.p);
  await page.getByLabel("Projet d'origine").fill(d.project);
  await page.getByLabel("Localisation dans l'atelier").fill(d.location);
  if (d.notes) await page.getByLabel(/Notes/).fill(d.notes);
  await page.getByRole("button", { name: "Enregistrer l'élément" }).click();
  await expect(page).toHaveURL(/\/elements\/[a-z0-9]+/);
  await expect(page.getByRole("heading", { name: d.client })).toBeVisible();
  return page.url().split("?")[0];
}
