import sharp from "sharp";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import type { Viewer } from "@/server/viewer";

export const PASSWORD = "Secret123";

/** Petite image JPEG valide pour simuler une photo d'élément. */
export async function photo(color = "#c08040") {
  return sharp({ create: { width: 64, height: 48, channels: 3, background: color } }).jpeg().toBuffer();
}

let seq = 0;

export async function makeAdmin(): Promise<Viewer> {
  seq++;
  const u = await db.user.create({
    data: { name: `Admin ${seq}`, email: `admin${seq}@tge.test`, passwordHash: await hashPassword(PASSWORD), role: "ADMIN" },
  });
  return { id: u.id, name: u.name, email: u.email, role: "ADMIN", carpenterId: null };
}

export async function makeCarpenter(name?: string): Promise<{ carpenterId: string; viewer: Viewer }> {
  seq++;
  const c = await db.carpenter.create({
    data: { name: name ?? `Atelier ${seq}`, contactName: `Contact ${seq}`, email: `atelier${seq}@test.fr`, phone: "+33600000000" },
  });
  const u = await db.user.create({
    data: {
      name: `Menuisier ${seq}`,
      email: `menuisier${seq}@test.fr`,
      phone: `+3361000000${seq % 10}${Math.floor(seq / 10)}`,
      passwordHash: await hashPassword(PASSWORD),
      role: "CARPENTER",
      carpenterId: c.id,
    },
  });
  return { carpenterId: c.id, viewer: { id: u.id, name: u.name, email: u.email, role: "CARPENTER", carpenterId: c.id } };
}

export const elementInput = (over: Partial<Record<string, unknown>> = {}) => ({
  clientName: "Abbott",
  lengthCm: "200",
  heightCm: "250",
  depthCm: "60",
  project: "VivaTech 2025",
  location: "Zone A - Étagère 3",
  notes: "",
  ...over,
});
