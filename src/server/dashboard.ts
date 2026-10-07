import { db } from "@/lib/db";
import { assertAdmin, type Viewer } from "./viewer";

/** Indicateurs du tableau de bord TGE. */
export async function getDashboard(viewer: Viewer) {
  assertAdmin(viewer);
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [total, lastWeek, byClientRaw, carpenters, latest, clientCount] = await Promise.all([
    db.element.count(),
    db.element.count({ where: { createdAt: { gte: weekAgo } } }),
    db.element.groupBy({ by: ["clientId"], _count: { _all: true }, orderBy: { _count: { clientId: "desc" } }, take: 10 }),
    db.carpenter.findMany({ select: { id: true, name: true, _count: { select: { elements: true } } }, orderBy: { name: "asc" } }),
    db.element.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { client: { select: { name: true } }, carpenter: { select: { name: true } } },
    }),
    db.client.count({ where: { elements: { some: {} } } }),
  ]);
  const clientNames = new Map(
    (await db.client.findMany({ where: { id: { in: byClientRaw.map((c) => c.clientId) } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]),
  );
  return {
    total,
    lastWeek,
    clientCount,
    carpenterCount: carpenters.length,
    byClient: byClientRaw.map((c) => ({ id: c.clientId, name: clientNames.get(c.clientId) ?? "?", count: c._count._all })),
    byCarpenter: carpenters.map((c) => ({ id: c.id, name: c.name, count: c._count.elements })).sort((a, b) => b.count - a.count),
    latest,
  };
}

/** Résumé pour l'accueil d'un menuisier. */
export async function getCarpenterSummary(carpenterId: string) {
  const [total, carpenter] = await Promise.all([
    db.element.count({ where: { carpenterId } }),
    db.carpenter.findUnique({ where: { id: carpenterId }, select: { name: true } }),
  ]);
  return { total, carpenterName: carpenter?.name ?? "" };
}
