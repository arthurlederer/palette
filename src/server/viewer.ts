import { ForbiddenError } from "@/lib/errors";

/** Utilisateur au nom duquel une opération est faite. Toutes les fonctions métier le reçoivent explicitement. */
export type Viewer = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CARPENTER";
  carpenterId: string | null;
};

export const isAdmin = (v: Viewer) => v.role === "ADMIN";

export function assertAdmin(v: Viewer) {
  if (!isAdmin(v)) throw new ForbiddenError("Réservé aux équipes The Good Experience");
}

/** Identifiant du menuisier d'un compte menuisier. Un compte menuisier sans atelier n'a accès à rien. */
export function carpenterScope(v: Viewer): string {
  if (!v.carpenterId) throw new ForbiddenError("Ce compte n'est rattaché à aucun menuisier");
  return v.carpenterId;
}
