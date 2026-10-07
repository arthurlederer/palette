import { describe, expect, it } from "vitest";
import { parseSearchParams, toQueryString } from "@/lib/search";

describe("parseSearchParams", () => {
  it("lit les filtres de dimensions en entiers", () => {
    const f = parseSearchParams({ hMin: "150", hMax: "200", lMin: "300", lMax: "400" });
    expect(f).toMatchObject({ hMin: 150, hMax: 200, lMin: 300, lMax: 400 });
  });

  it("ignore les valeurs vides ou invalides au lieu d'échouer", () => {
    const f = parseSearchParams({ q: "  ", hMin: "abc", hMax: "", lMin: "-3", sort: "n'importe quoi", page: "x" });
    expect(f.q).toBeUndefined();
    expect(f.hMin).toBeUndefined();
    expect(f.hMax).toBeUndefined();
    expect(f.lMin).toBeUndefined();
    expect(f.sort).toBeUndefined();
    expect(f.page).toBeUndefined();
  });

  it("prend la première valeur quand un paramètre est répété", () => {
    expect(parseSearchParams({ clientId: ["a", "b"] }).clientId).toBe("a");
  });
});

describe("toQueryString", () => {
  it("omet les valeurs vides", () => {
    expect(toQueryString({ q: "totem", hMin: 150, clientId: undefined, project: "" })).toBe("?q=totem&hMin=150");
    expect(toQueryString({})).toBe("");
  });
});
