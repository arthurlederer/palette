"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Field } from "@/components/Field";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email ou téléphone" error={state.fieldErrors?.identifier}>
        {(props) => (
          <input
            {...props}
            name="identifier"
            className="input"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            defaultValue={state.identifier}
            required
            placeholder="vous@atelier.fr ou 06 12 34 56 78"
          />
        )}
      </Field>
      <Field label="Mot de passe" error={state.fieldErrors?.password}>
        {(props) => <input {...props} name="password" type="password" className="input" autoComplete="current-password" required />}
      </Field>
      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
