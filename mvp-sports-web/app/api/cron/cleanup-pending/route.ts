import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/services/firebase-admin";
import { slotOf, rebuildCourtDay } from "@/services/bookingProjections";

// Cron de Vercel: borra reservas con pago online iniciado y nunca completado.
// Las de "pago en el recinto" quedan pendientes a propósito y no se tocan.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const db = adminDb();
  const limit = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
  const snap = await db.collection("bookings").where("paymentStatus", "==", "pending").get();
  const stale = snap.docs.filter((d) => {
    const b = d.data();
    const created = b.createdAt?.toMillis?.() ?? 0;
    return b.paymentMethod === "mercadopago" && created > 0 && created <= limit.toMillis();
  });
  const days = new Map<string, { courtId: string; day: string }>();
  for (const d of stale) {
    const s = slotOf(d.data());
    if (s) days.set(`${s.courtId}_${s.day}`, s);
    await d.ref.delete();
  }
  await Promise.all([...days.values()].map((s) => rebuildCourtDay(s.courtId, s.day)));
  return NextResponse.json({ ok: true, deleted: stale.length });
}
