/**
 * Logo The Good Experience, mis en avant dans l'app.
 * Version texte en attendant le fichier officiel : pour utiliser le logo fourni par TGE,
 * déposer le fichier dans public/brand/ et remplacer le contenu de ce composant par une balise <img>.
 */
export function Logo({ size = "md", inverted = false }: { size?: "sm" | "md" | "lg"; inverted?: boolean }) {
  const text = { sm: "text-[13px]", md: "text-[15px]", lg: "text-2xl" }[size];
  return (
    <span
      className={`inline-flex flex-col leading-[0.95] font-extrabold uppercase tracking-[-0.02em] ${text} ${inverted ? "text-paper" : "text-ink"}`}
      aria-label="The Good Experience"
    >
      <span>The Good</span>
      <span>Experience</span>
    </span>
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
