import { z } from "zod";

/**
 * Configuration lue depuis les variables d'environnement, validée au démarrage.
 * Toute valeur manquante ou invalide fait échouer le serveur avec un message explicite
 * plutôt qu'une erreur obscure au premier appel.
 */
const schema = z
  .object({
    DATABASE_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET doit faire au moins 32 caractères"),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    LOCAL_STORAGE_DIR: z.string().default("./storage"),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    S3_ENDPOINT: z.string().url().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
    MAX_UPLOAD_MB: z.coerce.number().positive().default(8),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === "s3") {
      for (const key of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const) {
        if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} est requis avec STORAGE_DRIVER=s3` });
      }
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuration invalide :\n${details}`);
  }
  cached = parsed.data;
  return cached;
}
