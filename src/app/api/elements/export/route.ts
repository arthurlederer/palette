import { getViewer } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { parseSearchParams } from "@/lib/search";
import { exportElements } from "@/server/elements";

// Export CSV des résultats de recherche (mêmes filtres que la page), réservé aux équipes TGE.
export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return new Response("Non authentifié", { status: 401 });
  if (viewer.role !== "ADMIN") return new Response("Accès refusé", { status: 403 });
  const filters = parseSearchParams(Object.fromEntries(new URL(req.url).searchParams));
  const { headers, rows } = await exportElements(viewer, filters);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="palette-elements-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
