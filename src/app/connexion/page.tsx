import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { AppName, Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getViewer()) redirect("/");
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-ink p-12 text-paper lg:flex">
        <Logo size="lg" inverted />
        <div>
          <p className="eyebrow !text-paper/60">Make it unforgettable</p>
          <h1 className="mt-4 max-w-md text-5xl leading-[1.05] font-semibold tracking-tight">
            Chaque élément de stand, retrouvé en quelques secondes.
          </h1>
          <p className="mt-6 max-w-md text-paper/70">
            Palette centralise le stock conservé chez nos menuisiers partenaires : ce qui existe, où, et chez qui.
          </p>
        </div>
        <AppName inverted />
      </section>
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-12 flex items-end justify-between lg:hidden">
            <Logo size="lg" />
            <AppName />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Connexion</h2>
          <p className="mt-2 mb-8 text-muted">Accès réservé aux équipes TGE et aux menuisiers partenaires.</p>
          <LoginForm next={next} />
        </div>
      </section>
    </main>
  );
}
