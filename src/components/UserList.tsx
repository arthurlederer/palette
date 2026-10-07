"use client";

import { useState } from "react";
import { ActionButton, ActionForm } from "./forms";
import { resetPasswordAction, setUserActiveAction } from "@/app/(app)/admin-actions";

type U = { id: string; name: string; email: string; phone: string | null; active: boolean };

/** Liste de comptes avec activation / désactivation et réinitialisation du mot de passe. */
export function UserList({ users, path, selfId }: { users: U[]; path: string; selfId?: string }) {
  const [resetting, setResetting] = useState<string | null>(null);
  if (users.length === 0) return <p className="text-sm text-muted">Aucun compte pour l&apos;instant.</p>;
  return (
    <ul className="divide-y divide-line">
      {users.map((u) => (
        <li key={u.id} className="py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">
                {u.name} {!u.active && <span className="chip ml-1 text-xs text-danger">désactivé</span>}
              </p>
              <p className="truncate text-sm text-muted">
                {u.email}
                {u.phone && ` · ${u.phone}`}
              </p>
            </div>
            {u.id !== selfId && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResetting(resetting === u.id ? null : u.id)}>
                  Mot de passe
                </button>
                <ActionButton
                  action={setUserActiveAction.bind(null, u.id, !u.active, path)}
                  label={u.active ? "Désactiver" : "Réactiver"}
                  confirm={u.active ? `Désactiver le compte de ${u.name} ? La personne ne pourra plus se connecter.` : undefined}
                />
              </div>
            )}
          </div>
          {resetting === u.id && (
            <div className="mt-4 rounded-2xl bg-paper-soft p-4">
              <ActionForm
                action={resetPasswordAction.bind(null, u.id)}
                fields={[{ name: "password", label: "Nouveau mot de passe", type: "password", hint: "8 caractères minimum, avec lettres et chiffres.", autoComplete: "new-password" }]}
                submitLabel="Définir le mot de passe"
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
