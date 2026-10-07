import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/auth/token";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const SECRET = "un-secret-de-test-suffisamment-long-123";

describe("jeton de session", () => {
  it("signe puis vérifie un jeton", async () => {
    const token = await signSession({ sub: "user1", role: "CARPENTER" }, SECRET);
    expect(await verifySession(token, SECRET)).toEqual({ sub: "user1", role: "CARPENTER" });
  });

  it("refuse un jeton signé avec un autre secret", async () => {
    const token = await signSession({ sub: "user1", role: "ADMIN" }, SECRET);
    expect(await verifySession(token, SECRET + "x")).toBeNull();
  });

  it("refuse un jeton altéré (élévation de rôle)", async () => {
    const token = await signSession({ sub: "user1", role: "CARPENTER" }, SECRET);
    const [h, , s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "user1", role: "ADMIN", exp: 9999999999 })).toString("base64url");
    expect(await verifySession(`${h}.${forged}.${s}`, SECRET)).toBeNull();
  });

  it("refuse l'absence de jeton ou un jeton illisible", async () => {
    expect(await verifySession(undefined, SECRET)).toBeNull();
    expect(await verifySession("n'importe quoi", SECRET)).toBeNull();
  });

  it("exige un secret d'au moins 32 caractères", async () => {
    await expect(signSession({ sub: "u", role: "ADMIN" }, "court")).rejects.toThrow();
  });
});

describe("mots de passe", () => {
  it("hache et vérifie", async () => {
    const hash = await hashPassword("Atelier2026");
    expect(hash).not.toContain("Atelier2026");
    expect(await verifyPassword("Atelier2026", hash)).toBe(true);
    expect(await verifyPassword("atelier2026", hash)).toBe(false);
  });
});
