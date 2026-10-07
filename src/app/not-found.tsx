import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="mt-3 text-3xl font-semibold">Introuvable</h1>
      <p className="mt-2 max-w-sm text-muted">Cet élément n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
      <Link href="/" className="btn btn-primary mt-8">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
