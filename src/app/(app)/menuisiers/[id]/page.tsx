import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { getCarpenter } from "@/server/carpenters";
import { PageHeader } from "@/components/PageHeader";
import { ActionButton, ActionForm } from "@/components/forms";
import { UserList } from "@/components/UserList";
import { Flash } from "@/components/Flash";
import { createUserAction, deleteCarpenterAction, saveCarpenterAction } from "../../admin-actions";
import { CARPENTER_FIELDS, USER_FIELDS } from "../fields";

export const metadata = { title: "Menuisier" };

export default async function CarpenterPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireAdmin();
  const { id } = await params;
  let carpenter;
  try {
    carpenter = await getCarpenter(viewer, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  return (
    <>
      <Flash />
      <Link href="/menuisiers" className="mb-6 inline-flex min-h-10 items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Menuisiers
      </Link>
      <PageHeader
        eyebrow="Menuisier"
        title={carpenter.name}
        description={
          <Link href={`/elements?carpenterId=${carpenter.id}`} className="underline underline-offset-4">
            {carpenter._count.elements} élément{carpenter._count.elements > 1 ? "s" : ""} en stock
          </Link>
        }
      />
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section>
          <h2 className="mb-5 text-xl font-semibold">Coordonnées</h2>
          <ActionForm action={saveCarpenterAction.bind(null, carpenter.id)} fields={CARPENTER_FIELDS} defaults={{ name: carpenter.name, contactName: carpenter.contactName, phone: carpenter.phone, email: carpenter.email, address: carpenter.address, notes: carpenter.notes }} submitLabel="Enregistrer" />
          <div className="mt-10 border-t border-line pt-6">
            <h3 className="font-semibold">Supprimer ce menuisier</h3>
            <p className="mt-1 mb-4 text-sm text-muted">Possible uniquement s&apos;il ne stocke plus aucun élément. Ses comptes seront supprimés.</p>
            <ActionButton
              action={deleteCarpenterAction.bind(null, carpenter.id)}
              label="Supprimer le menuisier"
              confirm={`Supprimer définitivement ${carpenter.name} et ses comptes ?`}
              className="btn btn-danger btn-sm"
            />
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">Comptes de connexion</h2>
          <p className="mb-4 text-sm text-muted">Chaque compte ne voit que les éléments de cet atelier.</p>
          <div className="card px-5">
            <UserList users={carpenter.users} path={`/menuisiers/${carpenter.id}`} />
          </div>
          <div className="mt-8 card p-5 sm:p-6">
            <h3 className="mb-5 font-semibold">Créer un compte</h3>
            <ActionForm action={createUserAction.bind(null, "CARPENTER", carpenter.id)} fields={USER_FIELDS} submitLabel="Créer le compte" />
          </div>
        </section>
      </div>
    </>
  );
}
