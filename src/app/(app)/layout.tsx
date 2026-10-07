import { requireViewer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { MobileHeader, Sidebar, TabBar } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const subtitle =
    viewer.role === "ADMIN"
      ? "Super user TGE"
      : ((await db.carpenter.findUnique({ where: { id: viewer.carpenterId ?? "" }, select: { name: true } }))?.name ?? "Menuisier");
  return (
    <div className="flex min-h-dvh">
      <Sidebar role={viewer.role} name={viewer.name} subtitle={subtitle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-6 pb-28 sm:px-8 lg:px-12 lg:pt-12 lg:pb-16">{children}</main>
      </div>
      <TabBar role={viewer.role} />
    </div>
  );
}
