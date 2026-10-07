import { db } from "@/lib/db";

// Sonde de santé pour l'hébergeur : vérifie que la base répond.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
