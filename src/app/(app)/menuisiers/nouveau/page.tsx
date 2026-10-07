import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/forms";
import { saveCarpenterAction } from "../../admin-actions";
import { CARPENTER_FIELDS } from "../fields";

export const metadata = { title: "Nouveau menuisier" };

export default async function NewCarpenterPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader eyebrow="Partenaires" title="Nouveau menuisier" description="Vous pourrez ensuite lui créer un ou plusieurs comptes de connexion." />
      <div className="max-w-xl">
        <ActionForm action={saveCarpenterAction.bind(null, null)} fields={CARPENTER_FIELDS} submitLabel="Créer le menuisier" />
      </div>
    </>
  );
}
