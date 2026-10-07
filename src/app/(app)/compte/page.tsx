import Link from "next/link";
import { LogOut, Users } from "lucide-react";
import { requireViewer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/forms";
import { changePasswordAction } from "../admin-actions";
import { logout } from "../../connexion/actions";

export const metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const viewer = await requireViewer();
  const carpenter = viewer.carpenterId ? await db.carpenter.findUnique({ where: { id: viewer.carpenterId } }) : null;
  return (
    <>
      <PageHeader eyebrow={viewer.role === "ADMIN" ? "Super user TGE" : carpenter?.name} title={viewer.name} description={viewer.email} />
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section className="card p-5 sm:p-6">
          <h2 className="mb-5 font-semibold">Changer de mot de passe</h2>
          <ActionForm
            action={changePasswordAction}
            fields={[
              { name: "current", label: "Mot de passe actuel", type: "password", autoComplete: "current-password" },
              { name: "next", label: "Nouveau mot de passe", type: "password", hint: "8 caractères minimum, avec lettres et chiffres.", autoComplete: "new-password" },
            ]}
            submitLabel="Modifier"
          />
        </section>
        <section className="space-y-3">
          {viewer.role === "ADMIN" && (
            <Link href="/equipe" className="btn btn-outline w-full lg:hidden">
              <Users className="size-5" aria-hidden /> Équipe TGE
            </Link>
          )}
          {carpenter && (
            <div className="card p-5 text-sm text-muted">
              Une question sur Palette ? Contactez votre interlocuteur chez The Good Experience.
            </div>
          )}
          <form action={logout}>
            <button className="btn btn-outline w-full" type="submit">
              <LogOut className="size-5" aria-hidden /> Se déconnecter
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
