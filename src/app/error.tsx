"use client";

import { useEffect } from "react";

// Filet de sécurité : toute erreur inattendue affiche un message clair plutôt qu'une page blanche.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">Oups</p>
      <h1 className="mt-3 text-3xl font-semibold">Quelque chose s&apos;est mal passé</h1>
      <p className="mt-2 max-w-sm text-muted">Vérifiez votre connexion puis réessayez.{error.digest && ` (réf. ${error.digest})`}</p>
      <button onClick={reset} className="btn btn-primary mt-8">
        Réessayer
      </button>
    </main>
  );
}
