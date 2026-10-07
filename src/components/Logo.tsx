/**
 * Logo officiel The Good Experience, mis en avant dans toute l'app.
 * Deux déclinaisons générées depuis brand/logo-tge.avif par scripts/brand-assets.mjs :
 * texte noir pour fond clair, texte blanc (original) pour fond sombre.
 */
const HEIGHT = { sm: 32, md: 44, lg: 56 } as const;
const RATIO = 529 / 160;

export function Logo({ size = "md", inverted = false }: { size?: keyof typeof HEIGHT; inverted?: boolean }) {
  const h = HEIGHT[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={inverted ? "/brand/logo-light.png" : "/brand/logo-dark.png"}
      alt="The Good Experience"
      width={Math.round(h * RATIO)}
      height={h}
      className="block max-w-full shrink-0 self-start"
      style={{ height: h, width: "auto" }}
      fetchPriority="high"
    />
  );
}

/** Nom de l'outil, affiché à côté du logo. */
export function AppName({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${inverted ? "text-paper/80" : "text-muted"}`}>
      <span className="inline-block size-2 rounded-full bg-accent" aria-hidden />
      Palette
    </span>
  );
}
