"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/auth/session";
import { toActionError } from "@/lib/errors";
import { loginSchema, flattenErrors } from "@/lib/validation";
import { authenticate } from "@/server/auth";

export type LoginState = { error?: string; fieldErrors?: Record<string, string>; identifier?: string };

/** N'accepte que des chemins internes comme destination après connexion (pas de redirection ouverte). */
function safeNext(next: FormDataEntryValue | null, fallback: string): string {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") && s !== "/" ? s : fallback;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ identifier: formData.get("identifier"), password: formData.get("password") });
  const identifier = String(formData.get("identifier") ?? "");
  if (!parsed.success) return { fieldErrors: flattenErrors(parsed.error), identifier };
  let home: string;
  try {
    const user = await authenticate(parsed.data.identifier, parsed.data.password);
    await startSession(user);
    home = user.role === "ADMIN" ? "/tableau-de-bord" : "/declarer";
  } catch (err) {
    return { ...toActionError(err), identifier };
  }
  redirect(safeNext(formData.get("next"), home));
}

export async function logout() {
  await endSession();
  redirect("/connexion");
}
