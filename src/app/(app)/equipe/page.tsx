import { requireAdmin } from "@/lib/auth/session";
import { listAdmins } from "@/server/carpenters";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/forms";
import { UserList } from "@/components/UserList";
import { createUserAction } from "../admin-actions";
import { USER_FIELDS } from "../menuisiers/fields";

export const metadata = { title: "Équipe TGE" };

export default async function TeamPage() {
  const viewer = await requireAdmin();
  const admins = await listAdmins(viewer);
  return (
    <>
      <PageHeader eyebrow="The Good Experience" title="Équipe TGE" description="Les super users voient tout le stock et gèrent les menuisiers." />
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section className="card px-5">
          <UserList users={admins} path="/equipe" selfId={viewer.id} />
        </section>
        <section className="card p-5 sm:p-6">
          <h2 className="mb-5 font-semibold">Ajouter un super user</h2>
          <ActionForm action={createUserAction.bind(null, "ADMIN", null)} fields={USER_FIELDS} submitLabel="Créer le compte" />
        </section>
      </div>
    </>
  );
}
