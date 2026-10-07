export function formatDimensions(e: { lengthCm: number; heightCm: number; depthCm: number }): string {
  return `${e.lengthCm} × ${e.heightCm} × ${e.depthCm} cm`;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
export const formatDateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));

export const FIELD_LABELS: Record<string, string> = {
  client: "Client",
  lengthCm: "Longueur",
  heightCm: "Hauteur",
  depthCm: "Profondeur",
  project: "Projet",
  location: "Localisation",
  notes: "Notes",
  photo: "Photo",
  carpenter: "Menuisier",
};
