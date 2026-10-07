import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, formatDimensions } from "@/lib/format";
import { getDashboard } from "@/server/dashboard";
import { PageHeader } from "@/components/PageHeader";
import { BarList } from "@/components/BarList";
import { photoUrl } from "@/components/photoUrl";

export const metadata = { title: "Tableau de bord" };

function Stat({ label, value, testId }: { label: string; value: number; testId?: string }) {
  return (
    <div className="card p-5 sm:p-6">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  const viewer = await requireAdmin();
  const d = await getDashboard(viewer);
  return (
    <>
      <PageHeader
        eyebrow="The Good Experience"
        title={`Bonjour ${viewer.name.split(" ")[0]}`}
        description="Vue d'ensemble du stock conservé chez les menuisiers partenaires."
        actions={
          <Link href="/elements" className="btn btn-primary btn-sm">
            <Search className="size-4" aria-hidden /> Rechercher un élément
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Éléments en stock" value={d.total} testId="stat-total" />
        <Stat label="Ajoutés cette semaine" value={d.lastWeek} />
        <Stat label="Clients" value={d.clientCount} />
        <Stat label="Menuisiers" value={d.carpenterCount} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="mb-5 font-semibold">Éléments par client</h2>
          <BarList data={d.byClient} emptyLabel="Aucun élément déclaré." hrefFor={(id) => `/elements?clientId=${id}`} />
        </section>
        <section className="card p-5 sm:p-6">
          <h2 className="mb-5 font-semibold">Éléments par menuisier</h2>
          <BarList data={d.byCarpenter} emptyLabel="Aucun menuisier enregistré." hrefFor={(id) => `/elements?carpenterId=${id}`} />
        </section>
      </div>

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-semibold">Dernières déclarations</h2>
          <Link href="/elements" className="inline-flex items-center gap-1 text-sm font-medium">
            Tout voir <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {d.latest.length === 0 ? (
          <p className="text-muted">Rien pour l&apos;instant.</p>
        ) : (
          <ul className="card divide-y divide-line px-4 sm:px-2">
            {d.latest.map((e) => (
              <li key={e.id}>
                <Link href={`/elements/${e.id}`} className="flex items-center gap-4 py-3 hover:bg-paper-soft sm:px-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(e.thumbKey)} alt="" className="size-14 shrink-0 rounded-xl object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{e.client.name}</p>
                    <p className="truncate text-sm text-muted">
                      {e.carpenter.name} · {formatDimensions(e)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-muted">{formatDate(e.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
