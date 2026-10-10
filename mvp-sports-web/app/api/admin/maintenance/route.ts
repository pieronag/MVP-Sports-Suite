import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/services/server/firebase-admin";
import { isSuperAdminCaller } from "@/services/server/server-auth";
import { slotOf, blocksSlot, rebuildCourtDay, syncBooking } from "@/services/server/bookingProjections";

// Tareas de mantenimiento de una sola vez (solo superadmin), ejecutadas en el servidor
// para no depender de la cuenta de servicio en un equipo local.
//  - rebuild-slots: llena court_slots y booking_reviews desde las reservas existentes
//  - migrate-secrets: mueve credenciales de documentos públicos a colecciones privadas
// Sin "apply": true solo informa lo que haría.
export async function POST(request: Request) {
  const caller = await isSuperAdminCaller(request);
  if (!caller) return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  const { task, apply } = await request.json().catch(() => ({}));
  const db = adminDb();

  if (task === "rebuild-slots") {
    const since = Date.now() - 2 * 24 * 3600 * 1000;
    const snap = await db.collection("bookings").get();
    const days = new Map<string, { courtId: string; day: string }>();
    const rated: string[] = [];
    for (const d of snap.docs) {
      const b = d.data();
      const s = slotOf(b);
      const when = s ? new Date(`${s.day}T12:00:00-03:00`).getTime() : 0;
      if (s && when >= since && blocksSlot(b)) days.set(`${s.courtId}_${s.day}`, s);
      if (Number(b.rating) > 0 && b.tenantId) rated.push(d.id);
    }
    if (apply) {
      for (const s of days.values()) await rebuildCourtDay(s.courtId, s.day);
      for (const id of rated) await syncBooking(id);
    }
    return NextResponse.json({ ok: true, applied: !!apply, bookings: snap.size, courtDays: days.size, reviews: rated.length });
  }

  if (task === "migrate-secrets") {
    const del = FieldValue.delete();
    const SECRET = ["mercadopagoAccessToken", "siiApiKey"];
    const LEGACY = [...SECRET, "transbankApiKey"];
    const report: string[] = [];
    for (const t of (await db.collection("tenants").get()).docs) {
      const d = t.data();
      const found = LEGACY.filter((f) => d[f]);
      if (!found.length) continue;
      report.push(`${t.id} (${d.name || "sin nombre"}): ${found.join(", ")}`);
      if (!apply) continue;
      const secrets = Object.fromEntries(SECRET.filter((f) => d[f]).map((f) => [f, d[f]]));
      if (Object.keys(secrets).length) await db.collection("tenant_secrets").doc(t.id).set({ ...secrets, migratedAt: new Date() }, { merge: true });
      await t.ref.update(Object.fromEntries(LEGACY.map((f) => [f, del])));
    }
    const g = (await db.collection("settings").doc("global").get()).data();
    if (g?.mercadopago?.accessToken) {
      report.push("settings/global: mercadopago.accessToken");
      if (apply) {
        await db.collection("settings_private").doc("global").set({ mercadopagoAccessToken: g.mercadopago.accessToken }, { merge: true });
        await db.collection("settings").doc("global").update({ "mercadopago.accessToken": del });
      }
    }
    const em = await db.collection("settings").doc("email").get();
    if (em.exists && em.data()?.resendApiKey) {
      report.push("settings/email: resendApiKey");
      if (apply) {
        await db.collection("settings_private").doc("email").set(em.data()!, { merge: true });
        await em.ref.update({ resendApiKey: del });
      }
    }
    const tbm = await db.collection("settings").doc("transbank_master").get();
    if (tbm.exists) {
      report.push("settings/transbank_master (se elimina)");
      if (apply) await tbm.ref.delete();
    }
    return NextResponse.json({ ok: true, applied: !!apply, report });
  }

  return NextResponse.json({ error: "Tarea desconocida" }, { status: 400 });
}
