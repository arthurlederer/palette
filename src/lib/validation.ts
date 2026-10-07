import { z } from "zod";
import { AppError } from "./errors";

// Schémas partagés entre le navigateur (validation en temps réel) et le serveur (validation de référence).

const dimension = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} : nombre attendu` })
    .int(`${label} : nombre entier de centimètres`)
    .min(1, `${label} : au moins 1 cm`)
    .max(5000, `${label} : 5000 cm maximum`);

const trimmed = (max: number) => z.string().trim().max(max, `${max} caractères maximum`);

export const elementSchema = z.object({
  clientName: trimmed(120).min(1, "Le client est obligatoire"),
  lengthCm: dimension("Longueur"),
  heightCm: dimension("Hauteur"),
  depthCm: dimension("Profondeur"),
  project: trimmed(160).min(1, "Le projet d'origine est obligatoire"),
  location: trimmed(120).min(1, "La localisation est obligatoire"),
  notes: trimmed(2000).optional().transform((v) => (v ? v : undefined)),
});
export type ElementInput = z.infer<typeof elementSchema>;

const phoneRegex = /^\+?[0-9 .-]{8,20}$/;

export const carpenterSchema = z.object({
  name: trimmed(120).min(1, "Le nom de l'atelier est obligatoire"),
  contactName: trimmed(120).min(1, "Le nom du contact est obligatoire"),
  email: z.string().trim().toLowerCase().email("Email invalide"),
  phone: z.string().trim().regex(phoneRegex, "Téléphone invalide"),
  address: trimmed(300).optional().transform((v) => (v ? v : undefined)),
  notes: trimmed(2000).optional().transform((v) => (v ? v : undefined)),
});
export type CarpenterInput = z.infer<typeof carpenterSchema>;

export const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum")
  .max(200, "200 caractères maximum")
  .regex(/[A-Za-z]/, "Au moins une lettre")
  .regex(/[0-9]/, "Au moins un chiffre");

export const userSchema = z.object({
  name: trimmed(120).min(1, "Le nom est obligatoire"),
  email: z.string().trim().toLowerCase().email("Email invalide"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? normalizePhone(v) : undefined))
    .refine((v) => !v || phoneRegex.test(v), "Téléphone invalide"),
  password: passwordSchema,
});
export type UserInput = z.infer<typeof userSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email ou téléphone requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

/** Normalise un numéro de téléphone français pour la comparaison (06 12 34 56 78 -> +33612345678). */
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s.-]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (/^0[1-9][0-9]{8}$/.test(p)) p = "+33" + p.slice(1);
  return p;
}

/** Valide des données avec un schéma zod et lève une AppError avec les erreurs par champ. */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError("Certains champs sont invalides", 422, flattenErrors(result.error));
  }
  return result.data;
}

export function flattenErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
