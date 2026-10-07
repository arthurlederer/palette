import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

// Première barrière : toute page hors connexion exige un jeton de session valide.
// Les droits fins (rôle, périmètre menuisier) sont vérifiés côté serveur dans chaque page et action.
const PUBLIC_PATHS = ["/connexion", "/api/health", "/manifest.webmanifest", "/icon.svg", "/apple-icon.png"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/connexion";
  url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname + req.nextUrl.search)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
