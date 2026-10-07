import { describe, expect, it } from "vitest";
import { carpenterSchema, elementSchema, normalizePhone, parseOrThrow, passwordSchema, userSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";

const valid = { clientName: "Abbott", lengthCm: "200", heightCm: "250", depthCm: "60", project: "VivaTech", location: "Zone A" };

describe("elementSchema", () => {
  it("accepte une déclaration complète et convertit les dimensions en nombres", () => {
    const r = elementSchema.parse(valid);
    expect(r).toMatchObject({ lengthCm: 200, heightCm: 250, depthCm: 60 });
    expect(r.notes).toBeUndefined();
  });

  it("supprime les espaces superflus", () => {
    expect(elementSchema.parse({ ...valid, clientName: "  Abbott  " }).clientName).toBe("Abbott");
  });

  it.each([
    ["clientName", ""],
    ["project", "   "],
    ["location", ""],
    ["lengthCm", "0"],
    ["heightCm", "-5"],
    ["depthCm", "12.5"],
    ["lengthCm", "abc"],
    ["heightCm", "6000"],
  ])("refuse %s = %j", (field, value) => {
    const r = elementSchema.safeParse({ ...valid, [field]: value });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path[0]).toBe(field);
  });

  it("limite la longueur des notes", () => {
    expect(elementSchema.safeParse({ ...valid, notes: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("parseOrThrow", () => {
  it("lève une AppError 422 avec les erreurs par champ", () => {
    try {
      parseOrThrow(elementSchema, { ...valid, clientName: "", lengthCm: "0" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).status).toBe(422);
      expect(Object.keys((e as AppError).fieldErrors!)).toEqual(expect.arrayContaining(["clientName", "lengthCm"]));
    }
  });
});

describe("normalizePhone", () => {
  it.each([
    ["06 12 34 56 78", "+33612345678"],
    ["06.12.34.56.78", "+33612345678"],
    ["0033612345678", "+33612345678"],
    ["+33 6 12 34 56 78", "+33612345678"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("%s -> %s", (raw, expected) => expect(normalizePhone(raw)).toBe(expected));
});

describe("mots de passe et comptes", () => {
  it("exige 8 caractères avec lettres et chiffres", () => {
    expect(passwordSchema.safeParse("court1").success).toBe(false);
    expect(passwordSchema.safeParse("sanschiffre").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("Atelier2026").success).toBe(true);
  });

  it("normalise email et téléphone d'un compte", () => {
    const u = userSchema.parse({ name: "Julien", email: " Julien@Atelier.FR ", phone: "06 12 34 56 78", password: "Atelier2026" });
    expect(u.email).toBe("julien@atelier.fr");
    expect(u.phone).toBe("+33612345678");
  });

  it("valide les coordonnées d'un menuisier", () => {
    expect(carpenterSchema.safeParse({ name: "A", contactName: "B", email: "pas-un-email", phone: "0612345678" }).success).toBe(false);
    expect(carpenterSchema.safeParse({ name: "A", contactName: "B", email: "a@b.fr", phone: "abc" }).success).toBe(false);
    expect(carpenterSchema.safeParse({ name: "A", contactName: "B", email: "a@b.fr", phone: "06 12 34 56 78" }).success).toBe(true);
  });
});
