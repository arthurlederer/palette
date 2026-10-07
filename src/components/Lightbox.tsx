"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";

/** Photo en grand, cliquable pour l'afficher en plein écran. */
export function Lightbox({ src, thumb, alt }: { src: string; thumb?: string; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-2xl bg-paper-soft"
        aria-label="Agrandir la photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="aspect-[4/3] w-full object-cover" style={thumb ? { backgroundImage: `url(${thumb})`, backgroundSize: "cover" } : undefined} />
        <span className="absolute right-3 bottom-3 rounded-full bg-ink/80 p-2 text-paper opacity-90 transition group-hover:opacity-100">
          <Maximize2 className="size-5" aria-hidden />
        </span>
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4" onClick={() => setOpen(false)}>
          <button type="button" className="absolute top-4 right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Fermer" autoFocus>
            <X className="size-6" aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </>
  );
}
