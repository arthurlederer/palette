"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, LayoutDashboard, Search, Hammer, Users, UserRound, Boxes } from "lucide-react";
import { AppName, Logo } from "./Logo";

type Item = { href: string; label: string; icon: typeof Camera; mobile?: boolean };

const ADMIN: Item[] = [
  { href: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard, mobile: true },
  { href: "/elements", label: "Recherche", icon: Search, mobile: true },
  { href: "/declarer", label: "Déclarer", icon: Camera },
  { href: "/menuisiers", label: "Menuisiers", icon: Hammer, mobile: true },
  { href: "/equipe", label: "Équipe TGE", icon: Users },
  { href: "/compte", label: "Compte", icon: UserRound, mobile: true },
];

const CARPENTER: Item[] = [
  { href: "/declarer", label: "Déclarer", icon: Camera, mobile: true },
  { href: "/elements", label: "Mes éléments", icon: Boxes, mobile: true },
  { href: "/compte", label: "Compte", icon: UserRound, mobile: true },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(href + "/");
}

/** Barre latérale (desktop) : navigation claire pour les super users comme pour les menuisiers. */
export function Sidebar({ role, name, subtitle }: { role: "ADMIN" | "CARPENTER"; name: string; subtitle: string }) {
  const isActive = useActive();
  const items = role === "ADMIN" ? ADMIN : CARPENTER;
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line px-5 py-8 lg:flex">
      <Link href="/" className="mb-2 block">
        <Logo />
      </Link>
      <AppName />
      <nav className="mt-10 flex flex-col gap-1" aria-label="Navigation principale">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] text-ink-soft hover:bg-paper-soft aria-[current=page]:bg-ink aria-[current=page]:text-paper"
          >
            <Icon className="size-5" aria-hidden strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t border-line pt-5 text-sm">
        <p className="font-medium">{name}</p>
        <p className="text-muted">{subtitle}</p>
      </div>
    </aside>
  );
}

/** Barre d'onglets en bas d'écran (mobile) : gros boutons accessibles au pouce. */
export function TabBar({ role }: { role: "ADMIN" | "CARPENTER" }) {
  const isActive = useActive();
  const items = (role === "ADMIN" ? ADMIN : CARPENTER).filter((i) => i.mobile);
  return (
    <nav
      aria-label="Navigation principale"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-xl">
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-muted aria-[current=page]:font-semibold aria-[current=page]:text-ink"
            >
              <Icon className="size-6" aria-hidden strokeWidth={1.75} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** En-tête mobile avec le logo. */
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/95 px-5 py-3 backdrop-blur lg:hidden">
      <Link href="/" aria-label="Accueil">
        <Logo size="sm" />
      </Link>
      <AppName />
    </header>
  );
}
