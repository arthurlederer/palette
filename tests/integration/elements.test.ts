import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { storage } from "@/lib/storage";
import { createElement, deleteElement, exportElements, getElement, getFormSuggestions, searchElements, updateElement } from "@/server/elements";
import { getDashboard } from "@/server/dashboard";
import { elementInput, makeAdmin, makeCarpenter, photo } from "./factories";

describe("déclaration d'un élément", () => {
  it("enregistre l'élément, la photo, la miniature et l'historique", async () => {
    const { viewer, carpenterId } = await makeCarpenter();
    const el = await createElement(viewer, elementInput({ notes: "Bon état" }), await photo());
    expect(el).toMatchObject({ lengthCm: 200, heightCm: 250, depthCm: 60, carpenterId, notes: "Bon état" });
    expect(await storage().get(el.photoKey)).not.toBeNull();
    expect(await storage().get(el.thumbKey)).not.toBeNull();
    const full = await getElement(viewer, el.id);
    expect(full.history).toHaveLength(1);
    expect(full.history[0].action).toBe("CREATED");
  });

  it("refuse une déclaration sans photo", async () => {
    const { viewer } = await makeCarpenter();
    await expect(createElement(viewer, elementInput(), null)).rejects.toMatchObject({ fieldErrors: { photo: expect.any(String) } });
  });

  it("refuse des dimensions invalides avec un message par champ", async () => {
    const { viewer } = await makeCarpenter();
    await expect(createElement(viewer, elementInput({ heightCm: "0" }), await photo())).rejects.toMatchObject({
      status: 422,
      fieldErrors: { heightCm: expect.any(String) },
    });
  });

  it("refuse un fichier qui n'est pas une image et ne laisse rien en base", async () => {
    const { viewer } = await makeCarpenter();
    await expect(createElement(viewer, elementInput(), Buffer.from("pas une image"))).rejects.toBeInstanceOf(AppError);
    expect(await db.element.count()).toBe(0);
  });

  it("réutilise un client existant sans tenir compte de la casse", async () => {
    const { viewer } = await makeCarpenter();
    await createElement(viewer, elementInput({ clientName: "L'Oréal" }), await photo());
    await createElement(viewer, elementInput({ clientName: "l'oréal" }), await photo());
    expect(await db.client.count()).toBe(1);
  });

  it("un super user déclare pour le compte d'un menuisier, qu'il doit choisir", async () => {
    const admin = await makeAdmin();
    const { carpenterId } = await makeCarpenter();
    await expect(createElement(admin, elementInput(), await photo())).rejects.toMatchObject({ fieldErrors: { carpenterId: expect.any(String) } });
    const el = await createElement(admin, elementInput(), await photo(), carpenterId);
    expect(el.carpenterId).toBe(carpenterId);
  });
});

describe("modification et suppression", () => {
  it("trace chaque champ modifié dans l'historique", async () => {
    const { viewer } = await makeCarpenter();
    const el = await createElement(viewer, elementInput(), await photo());
    await updateElement(viewer, el.id, elementInput({ location: "Zone B", heightCm: "260" }), null);
    const full = await getElement(viewer, el.id);
    expect(full.location).toBe("Zone B");
    const update = full.history.find((h) => h.action === "UPDATED")!;
    expect(update.changes).toEqual({ location: { from: "Zone A - Étagère 3", to: "Zone B" }, heightCm: { from: 250, to: 260 } });
  });

  it("n'ajoute pas d'historique si rien ne change", async () => {
    const { viewer } = await makeCarpenter();
    const el = await createElement(viewer, elementInput(), await photo());
    await updateElement(viewer, el.id, elementInput(), null);
    expect((await getElement(viewer, el.id)).history).toHaveLength(1);
  });

  it("remplace la photo et supprime l'ancienne du stockage", async () => {
    const { viewer } = await makeCarpenter();
    const el = await createElement(viewer, elementInput(), await photo());
    const updated = await updateElement(viewer, el.id, elementInput(), await photo("#2244aa"));
    expect(updated.photoKey).not.toBe(el.photoKey);
    expect(await storage().get(el.photoKey)).toBeNull();
    expect(await storage().get(updated.photoKey)).not.toBeNull();
  });

  it("le menuisier supprime sa déclaration ; la trace reste dans le journal", async () => {
    const { viewer } = await makeCarpenter();
    const el = await createElement(viewer, elementInput(), await photo());
    await deleteElement(viewer, el.id);
    expect(await db.element.findUnique({ where: { id: el.id } })).toBeNull();
    expect(await storage().get(el.photoKey)).toBeNull();
    const log = await db.elementHistory.findFirst({ where: { action: "DELETED" } });
    expect(log?.summary).toBe("Supprimé par le menuisier");
  });

  it("un super user modère une déclaration avec un motif", async () => {
    const { viewer } = await makeCarpenter();
    const admin = await makeAdmin();
    const el = await createElement(viewer, elementInput(), await photo());
    await deleteElement(admin, el.id, "Doublon");
    const log = await db.elementHistory.findFirst({ where: { action: "DELETED" } });
    expect(log?.summary).toBe("Supprimé par modération : Doublon");
    expect(log?.userId).toBe(admin.id);
  });
});

describe("recherche multi-critères", () => {
  async function stock() {
    const admin = await makeAdmin();
    const a = await makeCarpenter("Menuiserie Lefèvre");
    const b = await makeCarpenter("Atelier Bois");
    await createElement(a.viewer, elementInput({ clientName: "Abbott", lengthCm: "350", heightCm: "180", depthCm: "10", project: "Medica 2025", notes: "Cloison rétroéclairée" }), await photo());
    await createElement(a.viewer, elementInput({ clientName: "Sanofi", lengthCm: "120", heightCm: "110", depthCm: "60", project: "VivaTech 2025" }), await photo());
    await createElement(b.viewer, elementInput({ clientName: "Abbott", lengthCm: "320", heightCm: "250", depthCm: "12", project: "Medica 2024" }), await photo());
    await createElement(b.viewer, elementInput({ clientName: "Renault", lengthCm: "500", heightCm: "15", depthCm: "300", project: "Mondial Auto", location: "Hangar 2" }), await photo());
    return { admin, a, b };
  }

  it("filtre par client", async () => {
    const { admin } = await stock();
    const abbott = await db.client.findFirstOrThrow({ where: { name: "Abbott" } });
    expect((await searchElements(admin, { clientId: abbott.id })).total).toBe(2);
  });

  it("filtre par plage de dimensions (H 150-200, L 300-400)", async () => {
    const { admin } = await stock();
    const res = await searchElements(admin, { hMin: 150, hMax: 200, lMin: 300, lMax: 400 });
    expect(res.items.map((e) => e.client.name)).toEqual(["Abbott"]);
    expect(res.items[0].heightCm).toBe(180);
  });

  it("accepte des bornes ouvertes ou inversées", async () => {
    const { admin } = await stock();
    expect((await searchElements(admin, { lMin: 300 })).total).toBe(3);
    expect((await searchElements(admin, { hMin: 200, hMax: 100 })).total).toBe(2); // ramené à 100-200
  });

  it("filtre par projet (partiel, insensible à la casse) et par menuisier", async () => {
    const { admin, b } = await stock();
    expect((await searchElements(admin, { project: "medica" })).total).toBe(2);
    expect((await searchElements(admin, { carpenterId: b.carpenterId })).total).toBe(2);
  });

  it("recherche par mots-clés sur client, notes, emplacement et menuisier (tous les mots requis)", async () => {
    const { admin } = await stock();
    expect((await searchElements(admin, { q: "rétroéclairée" })).total).toBe(1);
    expect((await searchElements(admin, { q: "hangar" })).total).toBe(1);
    expect((await searchElements(admin, { q: "lefèvre" })).total).toBe(2);
    expect((await searchElements(admin, { q: "abbott 2024" })).total).toBe(1);
  });

  it("combine les critères et pagine", async () => {
    const { admin } = await stock();
    const page1 = await searchElements(admin, { sort: "largest" }, 3);
    expect(page1).toMatchObject({ total: 4, pageCount: 2, page: 1 });
    expect(page1.items[0].client.name).toBe("Renault");
    const page2 = await searchElements(admin, { sort: "largest", page: 2 }, 3);
    expect(page2.items).toHaveLength(1);
    const beyond = await searchElements(admin, { page: 99 }, 3);
    expect(beyond.page).toBe(2);
  });

  it("exporte les résultats filtrés en lignes CSV", async () => {
    const { admin } = await stock();
    const { headers, rows } = await exportElements(admin, { project: "medica" });
    expect(headers).toContain("Menuisier");
    expect(rows).toHaveLength(2);
  });

  it("alimente le tableau de bord", async () => {
    const { admin } = await stock();
    const d = await getDashboard(admin);
    expect(d.total).toBe(4);
    expect(d.byClient[0]).toMatchObject({ name: "Abbott", count: 2 });
    expect(d.byCarpenter.map((c) => c.count)).toEqual([2, 2]);
    expect(d.latest).toHaveLength(4);
  });

  it("propose des suggestions de saisie limitées au stock du menuisier", async () => {
    const { a } = await stock();
    const s = await getFormSuggestions(a.viewer);
    expect(s.projects).toEqual(["Medica 2025", "VivaTech 2025"]);
    expect(s.clients).toEqual(expect.arrayContaining(["Abbott", "Renault", "Sanofi"]));
  });
});
