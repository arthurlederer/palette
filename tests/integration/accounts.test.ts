import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { authenticate, changeOwnPassword, MAX_FAILED_ATTEMPTS } from "@/server/auth";
import { createCarpenter, createUser, deleteCarpenter, getCarpenter, resetUserPassword, setUserActive, updateCarpenter } from "@/server/carpenters";
import { createElement } from "@/server/elements";
import { elementInput, makeAdmin, makeCarpenter, PASSWORD, photo } from "./factories";

const carpenterData = { name: "Atelier Neuf", contactName: "Léa", email: "lea@neuf.fr", phone: "06 11 22 33 44" };

describe("gestion des menuisiers (CRUD)", () => {
  it("crée, modifie et supprime un menuisier", async () => {
    const admin = await makeAdmin();
    const c = await createCarpenter(admin, carpenterData);
    await updateCarpenter(admin, c.id, { ...carpenterData, contactName: "Léa Martin", address: "1 rue X" });
    expect((await getCarpenter(admin, c.id)).contactName).toBe("Léa Martin");
    await deleteCarpenter(admin, c.id);
    expect(await db.carpenter.findUnique({ where: { id: c.id } })).toBeNull();
  });

  it("refuse deux menuisiers du même nom", async () => {
    const admin = await makeAdmin();
    await createCarpenter(admin, carpenterData);
    await expect(createCarpenter(admin, carpenterData)).rejects.toMatchObject({ status: 409, fieldErrors: { name: expect.any(String) } });
  });

  it("empêche de supprimer un menuisier qui stocke encore des éléments", async () => {
    const admin = await makeAdmin();
    const { viewer, carpenterId } = await makeCarpenter();
    await createElement(viewer, elementInput(), await photo());
    await expect(deleteCarpenter(admin, carpenterId)).rejects.toMatchObject({ status: 409 });
  });
});

describe("comptes et connexion", () => {
  it("crée un compte menuisier qui peut se connecter par email ou par téléphone", async () => {
    const admin = await makeAdmin();
    const c = await createCarpenter(admin, carpenterData);
    await createUser(admin, { name: "Léa", email: "Lea@Neuf.fr", phone: "06 99 88 77 66", password: "Atelier2026" }, { role: "CARPENTER", carpenterId: c.id });
    expect((await authenticate("lea@neuf.fr", "Atelier2026")).carpenterId).toBe(c.id);
    expect((await authenticate("06 99 88 77 66", "Atelier2026")).email).toBe("lea@neuf.fr");
    expect((await authenticate("+33699887766", "Atelier2026")).email).toBe("lea@neuf.fr");
  });

  it("refuse un email déjà utilisé", async () => {
    const admin = await makeAdmin();
    await expect(createUser(admin, { name: "X", email: admin.email, password: "Abcdefg1" }, { role: "ADMIN" })).rejects.toMatchObject({
      fieldErrors: { email: expect.any(String) },
    });
  });

  it("refuse un mauvais mot de passe sans révéler si le compte existe", async () => {
    const { viewer } = await makeCarpenter();
    const e1 = await authenticate(viewer.email, "mauvais").catch((e) => e);
    const e2 = await authenticate("inconnu@test.fr", "mauvais").catch((e) => e);
    expect(e1).toBeInstanceOf(AppError);
    expect(e1.message).toBe(e2.message);
  });

  it(`bloque après ${MAX_FAILED_ATTEMPTS} échecs, même avec le bon mot de passe`, async () => {
    const { viewer } = await makeCarpenter();
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) await authenticate(viewer.email, "mauvais").catch(() => {});
    await expect(authenticate(viewer.email, PASSWORD)).rejects.toMatchObject({ status: 429 });
  });

  it("un compte désactivé ne peut plus se connecter", async () => {
    const admin = await makeAdmin();
    const { viewer } = await makeCarpenter();
    await setUserActive(admin, viewer.id, false);
    await expect(authenticate(viewer.email, PASSWORD)).rejects.toThrow(/désactivé/);
  });

  it("garde toujours au moins un super user actif", async () => {
    const admin = await makeAdmin();
    await expect(setUserActive(admin, admin.id, false)).rejects.toThrow(/propre compte/);
    const other = await makeAdmin();
    await setUserActive(admin, other.id, false);
    await setUserActive(admin, other.id, true);
  });

  it("réinitialisation par un super user et changement par l'utilisateur", async () => {
    const admin = await makeAdmin();
    const { viewer } = await makeCarpenter();
    await expect(resetUserPassword(admin, viewer.id, "court")).rejects.toBeInstanceOf(AppError);
    await resetUserPassword(admin, viewer.id, "Nouveau2026");
    await authenticate(viewer.email, "Nouveau2026");
    await expect(changeOwnPassword(viewer, "faux", "Encore2026")).rejects.toMatchObject({ fieldErrors: { current: expect.any(String) } });
    await changeOwnPassword(viewer, "Nouveau2026", "Encore2026");
    await authenticate(viewer.email, "Encore2026");
  });
});
