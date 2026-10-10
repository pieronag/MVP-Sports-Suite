import { NextResponse } from "next/server";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { recomputePlayer } from "@/services/server/gamification";

// Recalcula XP, nivel y logros desde las reservas. Es idempotente: solo lee datos del servidor.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!(await allowRequest(`recompute_${caller.uid}`, 20, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const uids = [...new Set<string>((Array.isArray(body?.uids) ? body.uids : [caller.uid]).filter((u: unknown) => typeof u === "string" && /^[A-Za-z0-9_-]{6,128}$/.test(u)))].slice(0, 25);
  const results = await Promise.all(uids.map((u) => recomputePlayer(u).catch(() => null)));
  return NextResponse.json({ ok: true, updated: results.filter(Boolean).length });
}
