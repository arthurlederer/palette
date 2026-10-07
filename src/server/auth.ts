import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { normalizePhone, passwordSchema } from "@/lib/validation";
import type { Viewer } from "./viewer";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

// Hash factice pour que le temps de réponse soit le même que le compte existe ou non.
const DUMMY_HASH = "$2b$11$/wlen4J0wfK1RS3ySXDqQ.1pHtE.TE0MiYwP1TlpQwo.PG2k0jnk6";

/**
 * Vérifie des identifiants (email ou téléphone + mot de passe).
 * Après 5 échecs en 15 minutes sur un même identifiant, les tentatives sont bloquées temporairement.
 */
export async function authenticate(identifierRaw: string, password: string) {
  const identifier = identifierRaw.trim().toLowerCase();
  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60_000);
  const failures = await db.loginAttempt.count({ where: { identifier, createdAt: { gte: since } } });
  if (failures >= MAX_FAILED_ATTEMPTS) {
    throw new AppError(`Trop de tentatives. Réessayez dans ${LOCKOUT_MINUTES} minutes.`, 429);
  }

  const isEmail = identifier.includes("@");
  const user = await db.user.findFirst({
    where: isEmail ? { email: identifier } : { phone: normalizePhone(identifier) },
  });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.active) {
    await db.loginAttempt.create({ data: { identifier } });
    throw new AppError(user && ok && !user.active ? "Ce compte est désactivé. Contactez The Good Experience." : "Identifiants incorrects", 401);
  }
  await db.loginAttempt.deleteMany({ where: { identifier } });
  return user;
}

export async function changeOwnPassword(viewer: Viewer, current: string, next: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: viewer.id } });
  if (!(await verifyPassword(current, user.passwordHash))) {
    throw new AppError("Mot de passe actuel incorrect", 422, { current: "Mot de passe actuel incorrect" });
  }
  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, { next: parsed.error.issues[0].message });
  await db.user.update({ where: { id: viewer.id }, data: { passwordHash: await hashPassword(next) } });
}
