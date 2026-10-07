import sharp, { type Metadata } from "sharp";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";

// Le navigateur compresse déjà la photo avant envoi ; le serveur la normalise quand même
// (orientation EXIF, taille max, suppression des métadonnées GPS) et génère une miniature.

const FULL_MAX = 1600;
const THUMB_MAX = 480;
const ACCEPTED = new Set(["jpeg", "png", "webp", "heic", "heif", "avif"]);

export type ProcessedPhoto = { full: Buffer; thumb: Buffer; contentType: "image/webp" };

export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new AppError("Le fichier envoyé n'est pas une image lisible", 422, { photo: "Image illisible" });
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) {
    throw new AppError("Format d'image non supporté (JPEG, PNG, WebP, HEIC)", 422, { photo: "Format non supporté" });
  }
  const base = sharp(input).rotate(); // applique l'orientation EXIF puis supprime les métadonnées
  const [full, thumb] = await Promise.all([
    base.clone().resize(FULL_MAX, FULL_MAX, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    base.clone().resize(THUMB_MAX, THUMB_MAX, { fit: "cover" }).webp({ quality: 72 }).toBuffer(),
  ]);
  return { full, thumb, contentType: "image/webp" };
}

export function newPhotoKeys(carpenterId: string) {
  const id = randomUUID();
  return { photoKey: `photos/${carpenterId}/${id}.webp`, thumbKey: `thumbs/${carpenterId}/${id}.webp` };
}
