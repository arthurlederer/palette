import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth/password";
import { carpenterSchema, parseOrThrow, passwordSchema, userSchema } from "@/lib/validation";
import { assertAdmin, type Viewer } from "./viewer";

// Gestion des menuisiers et de leurs comptes : réservé aux super users TGE.

export async function listCarpenters(viewer: Viewer) {
  assertAdmin(viewer);
  return db.carpenter.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { elements: true } },
      users: { select: { id: true, name: true, email: true, phone: true, active: true }, orderBy: { name: "asc" } },
    },
  });
}

export async function getCarpenter(viewer: Viewer, id: string) {
  assertAdmin(viewer);
  const carpenter = await db.carpenter.findUnique({
    where: { id },
    include: {
      _count: { select: { elements: true } },
      users: { select: { id: true, name: true, email: true, phone: true, active: true, createdAt: true }, orderBy: { name: "asc" } },
    },
  });
  if (!carpenter) throw new NotFoundError("Menuisier introuvable");
  return carpenter;
}

/** Traduit les violations d'unicité Prisma en erreurs de champ lisibles. */
export function uniqueViolation(err: unknown, messages: Record<string, string>): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = String((err.meta?.target as string[] | string | undefined) ?? "");
    for (const [field, message] of Object.entries(messages)) {
      if (target.includes(field)) throw new AppError(message, 409, { [field]: message });
    }
    throw new AppError("Cette valeur est déjà utilisée", 409);
  }
  throw err;
}

export async function createCarpenter(viewer: Viewer, raw: unknown) {
  assertAdmin(viewer);
  const data = parseOrThrow(carpenterSchema, raw);
  try {
    return await db.carpenter.create({ data });
  } catch (err) {
    uniqueViolation(err, { name: "Un menuisier porte déjà ce nom" });
  }
}

export async function updateCarpenter(viewer: Viewer, id: string, raw: unknown) {
  assertAdmin(viewer);
  const data = parseOrThrow(carpenterSchema, raw);
  await getCarpenter(viewer, id);
  try {
    return await db.carpenter.update({ where: { id }, data: { ...data, address: data.address ?? null, notes: data.notes ?? null } });
  } catch (err) {
    uniqueViolation(err, { name: "Un menuisier porte déjà ce nom" });
  }
}

/**
 * Un menuisier qui stocke encore des éléments ne peut pas être supprimé :
 * on perdrait la trace de ce stock, ce que l'outil cherche justement à éviter.
 */
export async function deleteCarpenter(viewer: Viewer, id: string) {
  const carpenter = await getCarpenter(viewer, id);
  if (carpenter._count.elements > 0) {
    throw new AppError(
      `Ce menuisier stocke encore ${carpenter._count.elements} élément(s). Supprimez-les ou désactivez ses comptes plutôt.`,
      409,
    );
  }
  await db.carpenter.delete({ where: { id } }); // supprime aussi ses comptes (cascade)
}

const UNIQUE_USER = { email: "Cet email est déjà utilisé", phone: "Ce téléphone est déjà utilisé" };

export async function createUser(viewer: Viewer, raw: unknown, opts: { role: "ADMIN" | "CARPENTER"; carpenterId?: string }) {
  assertAdmin(viewer);
  const input = parseOrThrow(userSchema, raw);
  if (opts.role === "CARPENTER") {
    if (!opts.carpenterId) throw new AppError("Menuisier requis pour un compte menuisier");
    await getCarpenter(viewer, opts.carpenterId);
  }
  try {
    return await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        passwordHash: await hashPassword(input.password),
        role: opts.role,
        carpenterId: opts.role === "CARPENTER" ? opts.carpenterId : null,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  } catch (err) {
    uniqueViolation(err, UNIQUE_USER);
  }
}

export async function listAdmins(viewer: Viewer) {
  assertAdmin(viewer);
  return db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true, phone: true, active: true, createdAt: true },
    orderBy: { name: "asc" },
  });
}

export async function setUserActive(viewer: Viewer, userId: string, active: boolean) {
  assertAdmin(viewer);
  if (userId === viewer.id && !active) throw new AppError("Vous ne pouvez pas désactiver votre propre compte");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("Compte introuvable");
  if (!active && user.role === "ADMIN") {
    const otherAdmins = await db.user.count({ where: { role: "ADMIN", active: true, id: { not: userId } } });
    if (otherAdmins === 0) throw new AppError("Il doit rester au moins un super user actif");
  }
  await db.user.update({ where: { id: userId }, data: { active } });
}

export async function resetUserPassword(viewer: Viewer, userId: string, newPassword: string) {
  assertAdmin(viewer);
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, { password: parsed.error.issues[0].message });
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("Compte introuvable");
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
}
