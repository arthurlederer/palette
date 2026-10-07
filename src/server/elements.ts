import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { newPhotoKeys, processPhoto } from "@/lib/images";
import type { SearchFilters } from "@/lib/search";
import { storage } from "@/lib/storage";
import { elementSchema, parseOrThrow, type ElementInput } from "@/lib/validation";
import { carpenterScope, isAdmin, type Viewer } from "./viewer";

/**
 * Règle d'accès centrale : un menuisier ne voit et ne modifie que les éléments de son atelier,
 * un super user TGE voit tout. Toutes les lectures passent par scopeWhere().
 */
function scopeWhere(viewer: Viewer): Prisma.ElementWhereInput {
  return isAdmin(viewer) ? {} : { carpenterId: carpenterScope(viewer) };
}

const listInclude = {
  client: { select: { id: true, name: true } },
  carpenter: { select: { id: true, name: true } },
} satisfies Prisma.ElementInclude;

export type ElementListItem = Prisma.ElementGetPayload<{ include: typeof listInclude }>;

/** Traduit les filtres de recherche en clause Prisma, toujours combinée au périmètre du viewer. */
export function buildWhere(viewer: Viewer, f: SearchFilters): Prisma.ElementWhereInput {
  const and: Prisma.ElementWhereInput[] = [scopeWhere(viewer)];
  if (f.clientId) and.push({ clientId: f.clientId });
  if (f.carpenterId && isAdmin(viewer)) and.push({ carpenterId: f.carpenterId });
  if (f.project) and.push({ project: { contains: f.project, mode: "insensitive" } });
  const range = (field: "lengthCm" | "heightCm" | "depthCm", min?: number, max?: number) => {
    if (min === undefined && max === undefined) return;
    // Si l'utilisateur inverse min et max, on les remet dans l'ordre plutôt que de ne rien renvoyer.
    const [lo, hi] = min !== undefined && max !== undefined && min > max ? [max, min] : [min, max];
    and.push({ [field]: { ...(lo !== undefined && { gte: lo }), ...(hi !== undefined && { lte: hi }) } });
  };
  range("lengthCm", f.lMin, f.lMax);
  range("heightCm", f.hMin, f.hMax);
  range("depthCm", f.pMin, f.pMax);
  if (f.q) {
    // Chaque mot doit apparaître dans au moins un champ texte (ET entre les mots, OU entre les champs).
    for (const term of f.q.split(/\s+/).filter(Boolean).slice(0, 8)) {
      const c = { contains: term, mode: "insensitive" as const };
      and.push({
        OR: [
          { project: c },
          { notes: c },
          { location: c },
          { client: { name: c } },
          ...(isAdmin(viewer) ? [{ carpenter: { name: c } }] : []),
        ],
      });
    }
  }
  return { AND: and };
}

function orderBy(sort: SearchFilters["sort"]): Prisma.ElementOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }];
    case "client":
      return [{ client: { name: "asc" } }, { createdAt: "desc" }];
    case "largest":
      return [{ lengthCm: "desc" }, { heightCm: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export const PAGE_SIZE = 24;

export async function searchElements(viewer: Viewer, filters: SearchFilters, pageSize = PAGE_SIZE) {
  const where = buildWhere(viewer, filters);
  const total = await db.element.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
  const items = await db.element.findMany({
    where,
    include: listInclude,
    orderBy: orderBy(filters.sort),
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return { items, total, page, pageCount };
}

/** Lignes d'export CSV, limitées au périmètre du viewer. */
export async function exportElements(viewer: Viewer, filters: SearchFilters) {
  const items = await db.element.findMany({
    where: buildWhere(viewer, filters),
    include: { client: true, carpenter: true },
    orderBy: orderBy(filters.sort),
    take: 10_000,
  });
  const headers = ["Référence", "Client", "Projet", "Longueur (cm)", "Hauteur (cm)", "Profondeur (cm)", "Menuisier", "Localisation", "Notes", "Déclaré le"];
  const rows = items.map((e) => [
    e.id,
    e.client.name,
    e.project,
    e.lengthCm,
    e.heightCm,
    e.depthCm,
    e.carpenter.name,
    e.location,
    e.notes ?? "",
    e.createdAt,
  ]);
  return { headers, rows };
}

export async function getElement(viewer: Viewer, id: string) {
  const element = await db.element.findFirst({
    where: { AND: [{ id }, scopeWhere(viewer)] },
    include: {
      client: true,
      carpenter: true,
      createdBy: { select: { name: true } },
      history: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
    },
  });
  // On répond "introuvable" plutôt que "interdit" pour ne pas révéler l'existence d'éléments d'autres ateliers.
  if (!element) throw new NotFoundError();
  return element;
}

/** Suggestions pour l'autocomplétion du formulaire. */
export async function getFormSuggestions(viewer: Viewer) {
  const [clients, projects, locations] = await Promise.all([
    db.client.findMany({ select: { name: true }, orderBy: { name: "asc" }, take: 500 }),
    db.element.findMany({ where: scopeWhere(viewer), distinct: ["project"], select: { project: true }, orderBy: { project: "asc" }, take: 500 }),
    db.element.findMany({ where: scopeWhere(viewer), distinct: ["location"], select: { location: true }, orderBy: { location: "asc" }, take: 200 }),
  ]);
  return {
    clients: clients.map((c) => c.name),
    projects: projects.map((p) => p.project),
    locations: locations.map((l) => l.location),
  };
}

/** Retrouve un client par nom (insensible à la casse) ou le crée. */
async function upsertClient(tx: Prisma.TransactionClient, name: string) {
  const existing = await tx.client.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) return existing;
  return tx.client.create({ data: { name } });
}

/** Menuisier auquel rattacher une nouvelle déclaration : le sien pour un menuisier, au choix pour un admin. */
async function resolveCarpenterForCreate(viewer: Viewer, requested?: string | null): Promise<string> {
  if (!isAdmin(viewer)) return carpenterScope(viewer);
  if (!requested) throw new AppError("Choisissez le menuisier qui stocke l'élément", 422, { carpenterId: "Menuisier obligatoire" });
  const exists = await db.carpenter.findUnique({ where: { id: requested }, select: { id: true } });
  if (!exists) throw new AppError("Menuisier inconnu", 422, { carpenterId: "Menuisier inconnu" });
  return requested;
}

function snapshot(e: { lengthCm: number; heightCm: number; depthCm: number; project: string; location: string; notes: string | null }, clientName: string, carpenterName?: string) {
  return {
    client: clientName,
    lengthCm: e.lengthCm,
    heightCm: e.heightCm,
    depthCm: e.depthCm,
    project: e.project,
    location: e.location,
    notes: e.notes ?? null,
    ...(carpenterName && { carpenter: carpenterName }),
  };
}

export async function createElement(viewer: Viewer, rawInput: unknown, photo: Buffer | null, requestedCarpenterId?: string | null) {
  const input = parseOrThrow(elementSchema, rawInput);
  if (!photo || photo.length === 0) throw new AppError("La photo est obligatoire", 422, { photo: "Ajoutez une photo de l'élément" });
  const carpenterId = await resolveCarpenterForCreate(viewer, requestedCarpenterId);

  const processed = await processPhoto(photo);
  const keys = newPhotoKeys(carpenterId);
  const store = storage();
  await store.put(keys.photoKey, processed.full, processed.contentType);
  await store.put(keys.thumbKey, processed.thumb, processed.contentType);

  try {
    return await db.$transaction(async (tx) => {
      const client = await upsertClient(tx, input.clientName);
      const element = await tx.element.create({
        data: {
          lengthCm: input.lengthCm,
          heightCm: input.heightCm,
          depthCm: input.depthCm,
          project: input.project,
          location: input.location,
          notes: input.notes ?? null,
          photoKey: keys.photoKey,
          thumbKey: keys.thumbKey,
          clientId: client.id,
          carpenterId,
          createdById: viewer.id,
        },
      });
      await tx.elementHistory.create({
        data: {
          elementId: element.id,
          action: "CREATED",
          changes: snapshot(element, client.name),
          summary: "Élément déclaré",
          userId: viewer.id,
        },
      });
      return element;
    });
  } catch (err) {
    // La base a refusé l'enregistrement : on ne laisse pas de photo orpheline.
    await Promise.allSettled([store.delete(keys.photoKey), store.delete(keys.thumbKey)]);
    throw err;
  }
}

export async function updateElement(viewer: Viewer, id: string, rawInput: unknown, photo: Buffer | null) {
  const input: ElementInput = parseOrThrow(elementSchema, rawInput);
  const before = await getElement(viewer, id); // vérifie aussi le périmètre

  let newKeys: { photoKey: string; thumbKey: string } | null = null;
  const store = storage();
  if (photo && photo.length > 0) {
    const processed = await processPhoto(photo);
    newKeys = newPhotoKeys(before.carpenterId);
    await store.put(newKeys.photoKey, processed.full, processed.contentType);
    await store.put(newKeys.thumbKey, processed.thumb, processed.contentType);
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const client = await upsertClient(tx, input.clientName);
      const after = await tx.element.update({
        where: { id },
        data: {
          lengthCm: input.lengthCm,
          heightCm: input.heightCm,
          depthCm: input.depthCm,
          project: input.project,
          location: input.location,
          notes: input.notes ?? null,
          clientId: client.id,
          ...(newKeys ?? {}),
        },
      });
      const prev = snapshot(before, before.client.name);
      const next = snapshot(after, client.name);
      const changes: Record<string, { from: string | number | null; to: string | number | null }> = {};
      for (const k of Object.keys(next) as (keyof typeof next)[]) {
        if (prev[k] !== next[k]) changes[k] = { from: prev[k] ?? null, to: next[k] ?? null };
      }
      if (newKeys) changes.photo = { from: "ancienne photo", to: "nouvelle photo" };
      if (Object.keys(changes).length > 0) {
        await tx.elementHistory.create({
          data: { elementId: id, action: "UPDATED", changes, summary: `${Object.keys(changes).length} champ(s) modifié(s)`, userId: viewer.id },
        });
      }
      return after;
    });
    if (newKeys) await Promise.allSettled([store.delete(before.photoKey), store.delete(before.thumbKey)]);
    return updated;
  } catch (err) {
    if (newKeys) await Promise.allSettled([store.delete(newKeys.photoKey), store.delete(newKeys.thumbKey)]);
    throw err;
  }
}

/** Suppression par le menuisier propriétaire, ou modération par un super user. */
export async function deleteElement(viewer: Viewer, id: string, reason?: string) {
  const element = await getElement(viewer, id);
  const moderated = isAdmin(viewer);
  await db.$transaction(async (tx) => {
    await tx.elementHistory.create({
      data: {
        elementId: id,
        action: "DELETED",
        changes: { ...snapshot(element, element.client.name, element.carpenter.name), ...(reason && { reason }) },
        summary: moderated ? `Supprimé par modération${reason ? ` : ${reason}` : ""}` : "Supprimé par le menuisier",
        userId: viewer.id,
      },
    });
    await tx.element.delete({ where: { id } });
  });
  const store = storage();
  await Promise.allSettled([store.delete(element.photoKey), store.delete(element.thumbKey)]);
}

/**
 * Autorise la lecture d'une photo. Les clés contiennent l'id du menuisier,
 * mais on vérifie en base que la photo appartient bien à un élément visible.
 */
export async function canViewPhoto(viewer: Viewer, key: string): Promise<boolean> {
  const element = await db.element.findFirst({
    where: { AND: [scopeWhere(viewer), { OR: [{ photoKey: key }, { thumbKey: key }] }] },
    select: { id: true },
  });
  return element !== null;
}

