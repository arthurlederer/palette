/** Graphique en barres horizontales, léger (pas de librairie), lisible sur mobile. */
export function BarList({ data, emptyLabel, hrefFor }: { data: { id: string; name: string; count: number }[]; emptyLabel: string; hrefFor?: (id: string) => string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.length === 0) return <p className="text-sm text-muted">{emptyLabel}</p>;
  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const content = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{d.name}</span>
              <span className="font-semibold tabular-nums">{d.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-paper-soft" aria-hidden>
              <div className="h-full rounded-full bg-ink transition-[width] group-hover:bg-accent" style={{ width: `${(d.count / max) * 100}%` }} />
            </div>
          </>
        );
        return (
          <li key={d.id}>
            {hrefFor ? (
              <a href={hrefFor(d.id)} className="group block">
                {content}
              </a>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
