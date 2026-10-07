import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { canViewPhoto, createElement, deleteElement, getElement, searchElements, updateElement, exportElements } from "@/server/elements";
import { createCarpenter, createUser, listCarpenters } from "@/server/carpenters";
import { getDashboard } from "@/server/dashboard";
import { elementInput, makeAdmin, makeCarpenter, photo } from "./factories";

/**
 * Exigence clé du cahier des charges : un menuisier ne voit JAMAIS les déclarations des autres menuisiers.
 */
describe("cloisonnement entre menuisiers", () => {
  async function twoCarpenters() {
    const a = await makeCarpenter("Atelier A");
    const b = await makeCarpenter("Atelier B");
    const elA = await createElement(a.viewer, elementInput({ clientName: "Client A" }), await photo());
    const elB = await createElement(b.viewer, elementInput({ clientName: "Client B" }), await photo());
    return { a, b, elA, elB };
  }

  it("la recherche d'un menuisier ne renvoie que ses éléments", async () => {
    const { a, elA } = await twoCarpenters();
    const res = await searchElements(a.viewer, {});
    expect(res.items.map((e) => e.id)).toEqual([elA.id]);
  });

  it("un menuisier ne peut pas forcer le filtre menuisier pour voir un autre atelier", async () => {
    const { a, b } = await twoCarpenters();
    const res = await searchElements(a.viewer, { carpenterId: b.carpenterId });
    expect(res.items.every((e) => e.carpenterId === a.carpenterId)).toBe(true);
  });

  it("un menuisier ne peut ni lire, ni modifier, ni supprimer l'élément d'un autre", async () => {
    const { a, elB } = await twoCarpenters();
    await expect(getElement(a.viewer, elB.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(updateElement(a.viewer, elB.id, elementInput({ project: "Piraté" }), null)).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteElement(a.viewer, elB.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await db.element.findUnique({ where: { id: elB.id } }))?.project).toBe("VivaTech 2025");
  });

  it("un menuisier ne peut pas afficher la photo d'un autre atelier", async () => {
    const { a, elA, elB } = await twoCarpenters();
    expect(await canViewPhoto(a.viewer, elA.thumbKey)).toBe(true);
    expect(await canViewPhoto(a.viewer, elB.thumbKey)).toBe(false);
    expect(await canViewPhoto(a.viewer, elB.photoKey)).toBe(false);
  });

  it("une déclaration d'un menuisier est toujours rattachée à son propre atelier", async () => {
    const { a, b } = await twoCarpenters();
    const el = await createElement(a.viewer, elementInput(), await photo(), b.carpenterId);
    expect(el.carpenterId).toBe(a.carpenterId);
  });

  it("les mots-clés d'un menuisier ne fouillent que son stock", async () => {
    const { a } = await twoCarpenters();
    expect((await searchElements(a.viewer, { q: "Client B" })).total).toBe(0);
  });

  it("un super user voit tous les éléments et toutes les photos", async () => {
    const { elA, elB } = await twoCarpenters();
    const admin = await makeAdmin();
    expect((await searchElements(admin, {})).total).toBe(2);
    expect(await canViewPhoto(admin, elB.photoKey)).toBe(true);
    expect((await getElement(admin, elA.id)).carpenter.name).toBe("Atelier A");
  });
});

describe("fonctions réservées aux super users", () => {
  it("un menuisier ne peut pas gérer les menuisiers, les comptes ni voir le tableau de bord", async () => {
    const { viewer } = await makeCarpenter();
    await expect(listCarpenters(viewer)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createCarpenter(viewer, { name: "X", contactName: "Y", email: "x@y.fr", phone: "0612345678" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createUser(viewer, { name: "X", email: "x@y.fr", password: "Abcdefg1" }, { role: "ADMIN" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getDashboard(viewer)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("l'export CSV d'un menuisier reste limité à son stock", async () => {
    const a = await makeCarpenter();
    const b = await makeCarpenter();
    await createElement(a.viewer, elementInput(), await photo());
    await createElement(b.viewer, elementInput(), await photo());
    expect((await exportElements(a.viewer, {})).rows).toHaveLength(1);
  });

  it("un compte menuisier sans atelier n'a accès à rien", async () => {
    const orphan = { id: "x", name: "x", email: "x@x.fr", role: "CARPENTER" as const, carpenterId: null };
    await expect(searchElements(orphan, {})).rejects.toBeInstanceOf(ForbiddenError);
  });
});
