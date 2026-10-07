import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";

// Accueil : le tableau de bord pour TGE, le formulaire de déclaration pour un menuisier.
export default async function Home() {
  const viewer = await requireViewer();
  redirect(viewer.role === "ADMIN" ? "/tableau-de-bord" : "/declarer");
}
