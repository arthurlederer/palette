"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

/** Suppression avec confirmation ; un super user doit indiquer un motif de modération (facultatif). */
export function DeleteElement({ action, moderation }: { action: (fd: FormData) => Promise<{ ok: boolean; error?: string } | void>; moderation: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" aria-hidden /> Supprimer
      </button>
    );
  }
  return (
    <form
      className="card w-full space-y-3 border-danger p-4"
      action={(fd) =>
        startTransition(async () => {
          const res = await action(fd);
          if (res && !res.ok) setError(res.error);
        })
      }
    >
      <p className="font-medium">Supprimer définitivement cet élément ?</p>
      <p className="text-sm text-muted">La photo sera effacée. La suppression reste tracée dans l&apos;historique.</p>
      {moderation && <input name="reason" className="input" placeholder="Motif (ex. élément jeté, doublon)" aria-label="Motif de la suppression" maxLength={300} />}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
          Annuler
        </button>
        <button type="submit" className="btn btn-sm bg-danger text-white" disabled={pending}>
          {pending ? "Suppression…" : "Confirmer la suppression"}
        </button>
      </div>
    </form>
  );
}
