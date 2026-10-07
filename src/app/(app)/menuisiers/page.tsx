import Link from "next/link";
import { Mail, Phone, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listCarpenters } from "@/server/carpenters";
import { PageHeader } from "@/components/PageHeader";
import { Flash } from "@/components/Flash";

export const metadata = { title: "Menuisiers" };

export default async function CarpentersPage() {
  const viewer = await requireAdmin();
  const carpenters = await listCarpenters(viewer);
  return (
    <>
      <Flash />
      <PageHeader
        eyebrow="Partenaires"
        title="Menuisiers"
        description="Les ateliers qui stockent nos éléments, et leurs comptes d'accès à Palette."
        actions={
          <Link href="/menuisiers/nouveau" className="btn btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Ajouter un menuisier
          </Link>
        }
      />
      {carpenters.length === 0 ? (
        <p className="text-muted">Aucun menuisier enregistré.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {carpenters.map((c) => (
            <div key={c.id} className="card flex flex-col p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link href={`/menuisiers/${c.id}`} className="text-lg font-semibold hover:underline">
                    {c.name}
                  </Link>
                  <p className="text-sm text-muted">{c.contactName}</p>
                </div>
                <Link href={`/elements?carpenterId=${c.id}`} className="shrink-0 text-right" title="Voir ses éléments">
                  <span className="block text-3xl font-semibold tabular-nums">{c._count.elements}</span>
                  <span className="text-xs text-muted">éléments</span>
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="chip hover:border-ink">
                  <Phone className="size-3.5" aria-hidden /> {c.phone}
                </a>
                <a href={`mailto:${c.email}`} className="chip hover:border-ink">
                  <Mail className="size-3.5" aria-hidden /> {c.email}
                </a>
              </div>
              <div className="mt-auto flex items-center justify-between pt-5 text-sm">
                <span className="text-muted">
                  {c.users.filter((u) => u.active).length} compte{c.users.filter((u) => u.active).length > 1 ? "s" : ""} actif
                  {c.users.filter((u) => u.active).length > 1 ? "s" : ""}
                </span>
                <Link href={`/menuisiers/${c.id}`} className="font-medium underline underline-offset-4">
                  Gérer
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
