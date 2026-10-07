"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { AppError, toActionError, type ActionResult } from "@/lib/errors";
import { createElement, deleteElement, updateElement } from "@/server/elements";

function readElementForm(formData: FormData) {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    clientName: str("clientName"),
    lengthCm: str("lengthCm"),
    heightCm: str("heightCm"),
    depthCm: str("depthCm"),
    project: str("project"),
    location: str("location"),
    notes: str("notes"),
  };
}

async function readPhoto(formData: FormData): Promise<Buffer | null> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > env().MAX_UPLOAD_MB * 1024 * 1024) {
    throw new AppError(`Photo trop lourde (${env().MAX_UPLOAD_MB} Mo maximum)`, 413, { photo: "Photo trop lourde" });
  }
  return Buffer.from(await file.arrayBuffer());
}

export async function createElementAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const viewer = await requireViewer();
  let id: string;
  try {
    const carpenterId = formData.get("carpenterId");
    const element = await createElement(viewer, readElementForm(formData), await readPhoto(formData), typeof carpenterId === "string" ? carpenterId : null);
    id = element.id;
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/elements");
  revalidatePath("/tableau-de-bord");
  return { ok: true, data: { id } };
}

export async function updateElementAction(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const viewer = await requireViewer();
  try {
    await updateElement(viewer, id, readElementForm(formData), await readPhoto(formData));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/elements");
  revalidatePath(`/elements/${id}`);
  return { ok: true, data: { id } };
}

export async function deleteElementAction(id: string, formData: FormData): Promise<ActionResult> {
  const viewer = await requireViewer();
  try {
    const reason = formData.get("reason");
    await deleteElement(viewer, id, typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 300) : undefined);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/elements");
  revalidatePath("/tableau-de-bord");
  redirect("/elements?deleted=1");
}
