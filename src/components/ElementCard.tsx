import Link from "next/link";
import { MapPin } from "lucide-react";
import { formatDate, formatDimensions } from "@/lib/format";
import { photoUrl } from "./photoUrl";
import type { ElementListItem } from "@/server/elements";

/** Carte d'un élément : photo, client et dimensions mis en évidence. */
export function ElementCard({ element, showCarpenter }: { element: ElementListItem; showCarpenter: boolean }) {
  return (
    <Link href={`/elements/${element.id}`} className="group card block overflow-hidden transition hover:border-ink" data-testid="element-card">
      <div className="aspect-[4/3] overflow-hidden bg-paper-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl(element.thumbKey)}
          alt={`${element.client.name} · ${element.project}`}
          loading="lazy"
          className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-4">
        <p className="text-lg leading-tight font-semibold">{element.client.name}</p>
        <p className="mt-1 text-[15px] font-medium tabular-nums">{formatDimensions(element)}</p>
        <p className="mt-2 truncate text-sm text-muted">{element.project}</p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{showCarpenter ? element.carpenter.name : element.location}</span>
          </span>
          <span className="shrink-0">{formatDate(element.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

/** Ligne compacte (vue liste). */
export function ElementRow({ element, showCarpenter }: { element: ElementListItem; showCarpenter: boolean }) {
  return (
    <Link href={`/elements/${element.id}`} className="flex items-center gap-4 py-3 hover:bg-paper-soft sm:px-3" data-testid="element-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl(element.thumbKey)} alt="" loading="lazy" className="size-16 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{element.client.name}</p>
        <p className="truncate text-sm text-muted">{element.project}</p>
      </div>
      <p className="hidden w-40 shrink-0 text-sm font-medium tabular-nums sm:block">{formatDimensions(element)}</p>
      <p className="hidden w-44 shrink-0 truncate text-sm text-muted md:block">{showCarpenter ? element.carpenter.name : element.location}</p>
      <p className="hidden w-28 shrink-0 text-right text-sm text-muted lg:block">{formatDate(element.createdAt)}</p>
    </Link>
  );
}
