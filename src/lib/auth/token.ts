import { SignJWT, jwtVerify } from "jose";

// Jeton de session signé (HS256), stocké dans un cookie httpOnly.
// Ce module ne dépend pas de Node : il est utilisable dans le middleware (runtime edge).

export const SESSION_COOKIE = "palette_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours : les menuisiers ne se reconnectent pas à chaque visite

export type SessionPayload = { sub: string; role: "ADMIN" | "CARPENTER" };

function key(secret = process.env.SESSION_SECRET) {
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET manquant ou trop court");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload, secret?: string): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key(secret));
}

export async function verifySession(token: string | undefined, secret?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    if (payload.role !== "ADMIN" && payload.role !== "CARPENTER") return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
