import { requireViewer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { ElementForm } from "@/components/ElementForm";
import { getFormSuggestions } from "@/server/elements";
import { createElementAction } from "../elements/actions";

export const metadata = { title: "Déclarer un élément" };

export default async function DeclarePage() {
  const viewer = await requireViewer();
  const [suggestions, carpenters] = await Promise.all([
    getFormSuggestions(viewer),
    viewer.role === "ADMIN" ? db.carpenter.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : undefined,
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Nouvelle déclaration"
        title="Déclarer un élément"
        description="Une photo, le client, les dimensions et l'emplacement : c'est tout."
      />
      <ElementForm action={createElementAction} suggestions={suggestions} carpenters={carpenters} submitLabel="Enregistrer l'élément" />
    </>
  );
}
