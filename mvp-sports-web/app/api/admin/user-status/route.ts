import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/services/server/firebase-admin";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { normalizeRole, isPlatformAdmin } from "@/utils/roles";

const STATUSES = ["active", "suspended", "disabled"] as const;

// Administración: suspender o reactivar cuentas (jugadores, dueños, administradores).
// Además del estado, deshabilita la cuenta de acceso y cierra sus sesiones (antes solo cambiaba un campo).
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!(await allowRequest(`user_status_${caller.uid}`, 60, 60_000))) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const uids: string[] = (Array.isArray(body?.uids) ? body.uids : [body?.uid]).filter((u: unknown) => typeof u === "string" && /^[A-Za-z0-9_-]{6,128}$/.test(u)).slice(0, 100);
  const status = body?.status as (typeof STATUSES)[number];
  if (!uids.length) return NextResponse.json({ error: "Indica la cuenta." }, { status: 400 });
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "Estado no válido." }, { status: 400 });

  const db = adminDb();
  const callerRole = normalizeRole((await db.collection("users").doc(caller.uid).get()).data()?.role);
  if (!isPlatformAdmin(callerRole)) return NextResponse.json({ error: "Solo la administración puede suspender cuentas." }, { status: 403 });
  if (uids.includes(caller.uid)) return NextResponse.json({ error: "No puedes suspender tu propia cuenta." }, { status: 409 });

  const results: { uid: string; ok: boolean; error?: string }[] = [];
  for (const uid of uids) {
    try {
      const target = (await db.collection("users").doc(uid).get()).data() || {};
      if (normalizeRole(target.role) === "superadmin" && callerRole !== "superadmin") throw new Error("Solo un superadmin puede suspender a otro superadmin.");
      await db.collection("users").doc(uid).set({ status, statusUpdatedAt: FieldValue.serverTimestamp(), statusUpdatedBy: caller.uid }, { merge: true });
      await adminAuth().updateUser(uid, { disabled: status !== "active" }).catch((e: any) => { if (e?.code !== "auth/user-not-found") throw e; });
      if (status !== "active") await adminAuth().revokeRefreshTokens(uid).catch(() => undefined);
      results.push({ uid, ok: true });
    } catch (e) {
      results.push({ uid, ok: false, error: e instanceof Error ? e.message : "Error" });
    }
  }
  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({ ok: failed.length === 0, updated: results.length - failed.length, failed });
}
