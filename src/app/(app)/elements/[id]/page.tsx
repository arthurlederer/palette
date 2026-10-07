import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Pencil, Phone } from "lucide-react";
import { requireViewer } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { FIELD_LABELS, formatDateTime, formatDimensions } from "@/lib/format";
import { getElement } from "@/server/elements";
import { Lightbox } from "@/components/Lightbox";
import { DeleteElement } from "@/components/DeleteElement";
import { Flash } from "@/components/Flash";
import { photoUrl } from "@/components/photoUrl";
import { deleteElementAction } from "../actions";

export const metadata = { title: "Élément" };

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-4">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-[17px]">{children}</dd>
    </div>
  );
}

function describeChange(field: string, change: unknown) {
  const c = change as { from?: unknown; to?: unknown };
  const fmt = (v: unknown) => (v === null || v === undefined || v === "" ? "vide" : String(v));
  return `${FIELD_LABELS[field] ?? field} : ${fmt(c.from)} → ${fmt(c.to)}`;
}

export default async function ElementPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  let element;
  try {
    element = await getElement(viewer, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const admin = viewer.role === "ADMIN";
  const del = deleteElementAction.bind(null, element.id);

  return (
    <>
      <Flash />
      <Link href="/elements" className="mb-6 inline-flex min-h-10 items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {admin ? "Retour à la recherche" : "Mes éléments"}
      </Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        <div>
          <Lightbox src={photoUrl(element.photoKey)} thumb={photoUrl(element.thumbKey)} alt={`${element.client.name} · ${element.project}`} />
        </div>
        <div>
          <p className="eyebrow">{element.project}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{element.client.name}</h1>
          <p className="mt-3 text-2xl font-medium tabular-nums" data-testid="dimensions">
            {formatDimensions(element)}
          </p>
          <p className="mt-1 text-sm text-muted">Longueur × Hauteur × Profondeur</p>

          <dl className="mt-8">
            <Info label="Localisation">
              {element.location}
              {admin && <span className="text-muted"> · chez {element.carpenter.name}</span>}
            </Info>
            {element.notes && <Info label="Notes">{element.notes}</Info>}
            <Info label="Ajouté le">
              {formatDateTime(element.createdAt)}
              {element.createdBy && <span className="text-muted"> par {element.createdBy.name}</span>}
            </Info>
            {admin && (
              <Info label="Menuisier">
                <p className="font-medium">{element.carpenter.name}</p>
                <p className="text-muted">{element.carpenter.contactName}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`tel:${element.carpenter.phone.replace(/\s/g, "")}`} className="btn btn-outline btn-sm">
                    <Phone className="size-4" aria-hidden /> {element.carpenter.phone}
                  </a>
                  <a href={`mailto:${element.carpenter.email}`} className="btn btn-outline btn-sm">
                    <Mail className="size-4" aria-hidden /> {element.carpenter.email}
                  </a>
                </div>
              </Info>
            )}
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/elements/${element.id}/modifier`} className="btn btn-primary btn-sm">
              <Pencil className="size-4" aria-hidden /> Modifier
            </Link>
            <DeleteElement action={del} moderation={admin} />
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="text-xl font-semibold">Historique des modifications</h2>
        <ol className="mt-4 border-l border-line pl-6" data-testid="history">
          {element.history.map((h) => (
            <li key={h.id} className="relative pb-6">
              <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-ink" aria-hidden />
              <p className="font-medium">{h.summary}</p>
              <p className="text-sm text-muted">
                {formatDateTime(h.createdAt)}
                {h.user && ` · ${h.user.name}`}
              </p>
              {h.action === "UPDATED" && (
                <ul className="mt-2 space-y-0.5 text-sm text-ink-soft">
                  {Object.entries(h.changes as Record<string, unknown>).map(([field, change]) => (
                    <li key={field}>{describeChange(field, change)}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
