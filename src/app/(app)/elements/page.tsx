import Link from "next/link";
import { Camera, Download, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { requireViewer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parseSearchParams, toQueryString, type SearchFilters } from "@/lib/search";
import { searchElements } from "@/server/elements";
import { PageHeader } from "@/components/PageHeader";
import { ElementCard, ElementRow } from "@/components/ElementCard";
import { Flash } from "@/components/Flash";

export const metadata = { title: "Éléments" };

type Params = Record<string, string | string[] | undefined>;

export default async function ElementsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const viewer = await requireViewer();
  const raw = await searchParams;
  const filters = parseSearchParams(raw);
  const view = raw.view === "list" ? "list" : "grid";
  const admin = viewer.role === "ADMIN";

  const [result, clients, carpenters] = await Promise.all([
    searchElements(viewer, filters),
    db.client.findMany({
      where: admin ? { elements: { some: {} } } : { elements: { some: { carpenterId: viewer.carpenterId ?? "" } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    admin ? db.carpenter.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  // Filtres actifs, affichés en pastilles supprimables.
  const base: Record<string, string | number | undefined> = { ...filters, page: undefined, view: view === "list" ? "list" : undefined };
  const chips: { label: string; href: string }[] = [];
  const without = (...keys: (keyof SearchFilters)[]) => {
    const next = { ...base };
    for (const k of keys) delete next[k];
    return `/elements${toQueryString(next)}`;
  };
  if (filters.q) chips.push({ label: `« ${filters.q} »`, href: without("q") });
  if (filters.clientId) chips.push({ label: `Client : ${clients.find((c) => c.id === filters.clientId)?.name ?? "?"}`, href: without("clientId") });
  if (filters.carpenterId) chips.push({ label: `Menuisier : ${carpenters.find((c) => c.id === filters.carpenterId)?.name ?? "?"}`, href: without("carpenterId") });
  if (filters.project) chips.push({ label: `Projet : ${filters.project}`, href: without("project") });
  const rangeChip = (name: string, min?: number, max?: number) =>
    min !== undefined && max !== undefined ? `${name} ${min}–${max} cm` : min !== undefined ? `${name} ≥ ${min} cm` : `${name} ≤ ${max} cm`;
  if (filters.lMin !== undefined || filters.lMax !== undefined) chips.push({ label: rangeChip("L", filters.lMin, filters.lMax), href: without("lMin", "lMax") });
  if (filters.hMin !== undefined || filters.hMax !== undefined) chips.push({ label: rangeChip("H", filters.hMin, filters.hMax), href: without("hMin", "hMax") });
  if (filters.pMin !== undefined || filters.pMax !== undefined) chips.push({ label: rangeChip("P", filters.pMin, filters.pMax), href: without("pMin", "pMax") });

  const exportHref = `/api/elements/export${toQueryString({ ...filters, page: undefined })}`;
  const viewHref = (v: "grid" | "list") => `/elements${toQueryString({ ...base, view: v === "list" ? "list" : undefined, page: filters.page })}`;
  const pageHref = (p: number) => `/elements${toQueryString({ ...base, page: p > 1 ? p : undefined })}`;

  return (
    <>
      <Flash />
      <PageHeader
        eyebrow={admin ? "Stock chez les menuisiers" : "Mon atelier"}
        title={admin ? "Recherche" : "Mes éléments"}
        description={
          <>
            <span data-testid="result-count" className="font-medium text-ink">
              {result.total}
            </span>{" "}
            élément{result.total > 1 ? "s" : ""} {chips.length ? "correspondant à la recherche" : "en stock"}
          </>
        }
        actions={
          <>
            {admin && (
              <a href={exportHref} className="btn btn-outline btn-sm" download>
                <Download className="size-4" aria-hidden /> Exporter CSV
              </a>
            )}
            <Link href="/declarer" className="btn btn-primary btn-sm">
              <Camera className="size-4" aria-hidden /> Déclarer
            </Link>
          </>
        }
      />

      {/* Recherche : simple formulaire GET, fonctionne même avant le chargement du JavaScript. */}
      <form method="get" action="/elements" className="card mb-6 p-4 sm:p-5" role="search">
        {view === "list" && <input type="hidden" name="view" value="list" />}
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={filters.q}
            className="input"
            placeholder={admin ? "Client, projet, menuisier, notes…" : "Client, projet, emplacement…"}
            aria-label="Mots-clés"
            type="search"
          />
          <button className="btn btn-primary shrink-0 px-4 sm:px-6" type="submit" aria-label="Rechercher">
            <Search className="size-5 sm:hidden" aria-hidden />
            <span className="hidden sm:inline">Rechercher</span>
          </button>
        </div>
        <details className="group mt-3" open={chips.length > 0 && !filters.q ? true : undefined}>
          <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-4" aria-hidden /> Filtres avancés
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="label">Client</span>
              <select name="clientId" defaultValue={filters.clientId ?? ""} className="input">
                <option value="">Tous</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {admin && (
              <label className="block">
                <span className="label">Menuisier</span>
                <select name="carpenterId" defaultValue={filters.carpenterId ?? ""} className="input">
                  <option value="">Tous</option>
                  {carpenters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="label">Projet</span>
              <input name="project" defaultValue={filters.project} className="input" />
            </label>
            <label className="block">
              <span className="label">Tri</span>
              <select name="sort" defaultValue={filters.sort ?? "recent"} className="input">
                <option value="recent">Plus récents</option>
                <option value="oldest">Plus anciens</option>
                <option value="client">Client (A→Z)</option>
                <option value="largest">Plus grands</option>
              </select>
            </label>
            {(
              [
                ["l", "Longueur (L)", filters.lMin, filters.lMax],
                ["h", "Hauteur (H)", filters.hMin, filters.hMax],
                ["p", "Profondeur (P)", filters.pMin, filters.pMax],
              ] as const
            ).map(([k, label, min, max]) => (
              <fieldset key={k}>
                <legend className="label">{label} en cm</legend>
                <div className="flex items-center gap-2">
                  <input name={`${k}Min`} defaultValue={min} inputMode="numeric" className="input" placeholder="min" aria-label={`${label} minimum`} />
                  <span className="text-muted">–</span>
                  <input name={`${k}Max`} defaultValue={max} inputMode="numeric" className="input" placeholder="max" aria-label={`${label} maximum`} />
                </div>
              </fieldset>
            ))}
            <div className="flex items-end">
              <button className="btn btn-outline w-full" type="submit">
                Appliquer
              </button>
            </div>
          </div>
        </details>
      </form>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
          {chips.map((c) => (
            <Link key={c.label} href={c.href} className="chip hover:border-ink" aria-label={`Retirer le filtre ${c.label}`}>
              {c.label} <X className="size-3.5" aria-hidden />
            </Link>
          ))}
          {chips.length > 0 && (
            <Link href={`/elements${view === "list" ? "?view=list" : ""}`} className="text-sm font-medium underline underline-offset-4">
              Réinitialiser
            </Link>
          )}
        </div>
        <div className="flex rounded-full border border-line p-1" role="group" aria-label="Affichage">
          <Link href={viewHref("grid")} aria-current={view === "grid" ? "true" : undefined} className="rounded-full p-2 aria-[current=true]:bg-ink aria-[current=true]:text-paper" aria-label="Vue cartes">
            <LayoutGrid className="size-4" aria-hidden />
          </Link>
          <Link href={viewHref("list")} aria-current={view === "list" ? "true" : undefined} className="rounded-full p-2 aria-[current=true]:bg-ink aria-[current=true]:text-paper" aria-label="Vue liste">
            <List className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      {result.items.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <p className="text-lg font-semibold">{chips.length ? "Aucun élément ne correspond" : "Aucun élément pour l'instant"}</p>
          <p className="mt-2 max-w-sm text-muted">
            {chips.length ? "Élargissez les dimensions ou retirez un filtre." : "Les éléments déclarés apparaîtront ici avec leur photo."}
          </p>
          {!chips.length && (
            <Link href="/declarer" className="btn btn-accent mt-6">
              <Camera className="size-5" aria-hidden /> Déclarer un élément
            </Link>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((e) => (
            <ElementCard key={e.id} element={e} showCarpenter={admin} />
          ))}
        </div>
      ) : (
        <div className="card divide-y divide-line px-4 sm:px-2">
          {result.items.map((e) => (
            <ElementRow key={e.id} element={e} showCarpenter={admin} />
          ))}
        </div>
      )}

      {result.pageCount > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
          {result.page > 1 && (
            <Link href={pageHref(result.page - 1)} className="btn btn-outline btn-sm">
              Précédent
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {result.page} / {result.pageCount}
          </span>
          {result.page < result.pageCount && (
            <Link href={pageHref(result.page + 1)} className="btn btn-outline btn-sm">
              Suivant
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
