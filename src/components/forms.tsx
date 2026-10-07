"use client";

import { useActionState, useState, useTransition } from "react";
import type { FormState } from "@/app/(app)/admin-actions";
import { Field } from "./Field";

type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "password" | "textarea";
  optional?: boolean;
  hint?: string;
  autoComplete?: string;
};

/** Formulaire générique branché sur une server action (création de menuisier, de compte, mot de passe…). */
export function ActionForm({
  action,
  fields,
  defaults,
  submitLabel,
  className,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  fields: FieldDef[];
  defaults?: Record<string, string | null | undefined>;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // React vide le formulaire après chaque envoi : on réaffiche la saisie (sauf mots de passe) via defaultValue.
  const values = state.values ?? defaults ?? {};
  return (
    <form action={formAction} className={className ?? "space-y-5"} noValidate>
      {fields.map((f) => (
        <Field key={f.name} label={f.label} optional={f.optional} hint={f.hint} error={state.fieldErrors?.[f.name]}>
          {(p) =>
            f.type === "textarea" ? (
              <textarea {...p} name={f.name} rows={3} className="input py-3" defaultValue={values[f.name] ?? ""} />
            ) : (
              <input
                {...p}
                name={f.name}
                type={f.type ?? "text"}
                className="input"
                defaultValue={f.type === "password" ? undefined : (values[f.name] ?? "")}
                autoComplete={f.autoComplete}
              />
            )
          }
        </Field>
      ))}
      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-success">
          {state.message}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Enregistrement…" : submitLabel}
      </button>
    </form>
  );
}

/** Bouton déclenchant une action simple, avec confirmation optionnelle et affichage d'erreur. */
export function ActionButton({
  action,
  label,
  confirm,
  className = "btn btn-outline btn-sm",
}: {
  action: () => Promise<FormState>;
  label: string;
  confirm?: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          startTransition(async () => {
            const res = await action();
            setError(res?.error);
          });
        }}
      >
        {pending ? "…" : label}
      </button>
      {error && <span className="mt-1 max-w-xs text-sm text-danger">{error}</span>}
    </span>
  );
}
