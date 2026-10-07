"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";
import { toActionError } from "@/lib/errors";
import { changeOwnPassword } from "@/server/auth";
import { createCarpenter, createUser, deleteCarpenter, resetUserPassword, setUserActive, updateCarpenter } from "@/server/carpenters";

/** État renvoyé aux formulaires (useActionState). `values` permet de réafficher la saisie après une erreur. */
export type FormState = { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> };

const formValues = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$") && !k.toLowerCase().includes("password")).map(([k, v]) => [k, v as string]));

export async function saveCarpenterAction(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  let savedId: string;
  try {
    const data = formValues(fd);
    const carpenter = id ? await updateCarpenter(viewer, id, data) : await createCarpenter(viewer, data);
    savedId = carpenter.id;
  } catch (err) {
    return { ...toActionError(err), values: formValues(fd) };
  }
  revalidatePath("/menuisiers");
  redirect(`/menuisiers/${savedId}?saved=1`);
}

export async function deleteCarpenterAction(id: string): Promise<FormState> {
  const viewer = await requireViewer();
  try {
    await deleteCarpenter(viewer, id);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/menuisiers");
  redirect("/menuisiers?deleted=1");
}

export async function createUserAction(role: "ADMIN" | "CARPENTER", carpenterId: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  try {
    await createUser(viewer, Object.fromEntries(fd), { role, carpenterId: carpenterId ?? undefined });
  } catch (err) {
    return { ...toActionError(err), values: formValues(fd) };
  }
  revalidatePath(role === "ADMIN" ? "/equipe" : `/menuisiers/${carpenterId}`);
  return { ok: true, message: "Compte créé. Transmettez l'identifiant et le mot de passe à la personne." };
}

export async function setUserActiveAction(userId: string, active: boolean, path: string): Promise<FormState> {
  const viewer = await requireViewer();
  try {
    await setUserActive(viewer, userId, active);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(path);
  return { ok: true };
}

export async function resetPasswordAction(userId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  try {
    await resetUserPassword(viewer, userId, String(fd.get("password") ?? ""));
  } catch (err) {
    return toActionError(err);
  }
  return { ok: true, message: "Mot de passe réinitialisé." };
}

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  try {
    await changeOwnPassword(viewer, String(fd.get("current") ?? ""), String(fd.get("next") ?? ""));
  } catch (err) {
    return toActionError(err);
  }
  return { ok: true, message: "Mot de passe modifié." };
}
