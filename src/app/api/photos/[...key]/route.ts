import { getViewer } from "@/lib/auth/session";
import { storage } from "@/lib/storage";
import { canViewPhoto } from "@/server/elements";

// Sert une photo après vérification que l'utilisateur a le droit de voir l'élément correspondant.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const viewer = await getViewer();
  if (!viewer) return new Response("Non authentifié", { status: 401 });
  const key = (await params).key.join("/");
  if (!(await canViewPhoto(viewer, key))) return new Response("Introuvable", { status: 404 });
  const data = await storage().get(key);
  if (!data) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      // Les clés sont uniques et immuables (une nouvelle photo = une nouvelle clé) : cache long côté navigateur, privé.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
