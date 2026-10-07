import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("CSV", () => {
  it("échappe séparateurs, guillemets et retours à la ligne", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('dit "bonjour"')).toBe('"dit ""bonjour"""');
    expect(csvCell("ligne1\nligne2")).toBe('"ligne1\nligne2"');
  });

  it("neutralise les formules (injection CSV)", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+33612345678")).toBe("'+33612345678");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });

  it("formate dates et valeurs nulles", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(new Date("2026-01-02T03:04:05Z"))).toBe("2026-01-02T03:04:05.000Z");
    expect(csvCell(42)).toBe("42");
  });

  it("produit un fichier lisible par Excel (BOM + ;)", () => {
    const csv = toCsv(["Client", "L"], [["Abbott", 200]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Client;L\r\nAbbott;200\r\n");
  });
});
