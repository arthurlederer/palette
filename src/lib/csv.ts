/** Échappe une valeur pour un CSV (séparateur ; pour Excel en français). */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = value instanceof Date ? value.toISOString() : String(value);
  // Protection contre l'injection de formules dans Excel / Sheets.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[";\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(";"));
  // BOM UTF-8 pour qu'Excel affiche correctement les accents.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
