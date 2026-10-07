import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { getElement, getFormSuggestions } from "@/server/elements";
import { PageHeader } from "@/components/PageHeader";
import { ElementForm } from "@/components/ElementForm";
import { photoUrl } from "@/components/photoUrl";
import { updateElementAction } from "../../actions";

export const metadata = { title: "Modifier l'élément" };

export default async function EditElementPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  let element;
  try {
    element = await getElement(viewer, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const suggestions = await getFormSuggestions(viewer);
  return (
    <>
      <PageHeader eyebrow="Modification" title={element.client.name} description={element.project} />
      <ElementForm
        action={updateElementAction.bind(null, element.id)}
        suggestions={suggestions}
        initialPhotoUrl={photoUrl(element.photoKey)}
        initial={{
          clientName: element.client.name,
          lengthCm: String(element.lengthCm),
          heightCm: String(element.heightCm),
          depthCm: String(element.depthCm),
          project: element.project,
          location: element.location,
          notes: element.notes ?? "",
        }}
        submitLabel="Enregistrer les modifications"
        cancelHref={`/elements/${element.id}`}
      />
    </>
  );
}
