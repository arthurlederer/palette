import { z } from "zod";

/**
 * Filtres de recherche des éléments, lus depuis les paramètres d'URL
 * (?client=...&hMin=150&hMax=200). Les valeurs invalides sont ignorées plutôt que bloquantes.
 */
const optInt = z
  .string()
  .optional()
  .transform((v) => {
    if (v === undefined || v.trim() === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
  });
const optStr = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

export const searchSchema = z.object({
  q: optStr,
  clientId: optStr,
  carpenterId: optStr,
  project: optStr,
  lMin: optInt,
  lMax: optInt,
  hMin: optInt,
  hMax: optInt,
  pMin: optInt,
  pMax: optInt,
  sort: z
    .enum(["recent", "oldest", "client", "largest"])
    .optional()
    .catch(undefined),
  page: optInt,
});

export type SearchFilters = z.infer<typeof searchSchema>;

export const FILTER_KEYS = ["q", "clientId", "carpenterId", "project", "lMin", "lMax", "hMin", "hMax", "pMin", "pMax"] as const;

export function parseSearchParams(params: Record<string, string | string[] | undefined>): SearchFilters {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value !== undefined) flat[k] = value;
  }
  return searchSchema.parse(flat);
}

/** Reconstruit une query string à partir de filtres (pour les liens d'export ou de pagination). */
export function toQueryString(filters: Partial<Record<string, string | number | undefined>>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
