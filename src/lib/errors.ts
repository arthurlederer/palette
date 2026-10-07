/**
 * Erreurs métier. Elles portent un message affichable à l'utilisateur ;
 * toute autre erreur est considérée comme inattendue et masquée.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Élément introuvable") {
    super(message, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Accès refusé") {
    super(message, 403);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Veuillez vous connecter") {
    super(message, 401);
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Convertit une erreur en résultat d'action sérialisable, en journalisant les erreurs inattendues. */
export function toActionError(err: unknown): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  if (err instanceof AppError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
  console.error("[palette] erreur inattendue", err);
  return { ok: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
}
