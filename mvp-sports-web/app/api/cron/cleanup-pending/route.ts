import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/services/server/firebase-admin";
import { slotOf, rebuildCourtDay } from "@/services/server/bookingProjections";
import { recomputePlayer } from "@/services/server/gamification";

// Cron de Vercel. La plataforma es 100% online: nada pendiente de pago es una reserva válida.
//  - Pago online iniciado y abandonado (más de 1 h): se borra.
//  - Reservas antiguas (pago en el recinto o manuales del personal) e inscripciones: se cancelan y se libera el cupo.
//  - Recalcula experiencia y logros de quienes jugaron en las últimas 48 h.

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const db = adminDb();
  const staleBefore = Date.now() - 60 * 60 * 1000;
  const cancelled = { reason: "pago_no_realizado", cancelledBy: "sistema", cancelledAt: Timestamp.now() };

  const bookings = await db.collection("bookings").where("paymentStatus", "==", "pending").get();
  const days = new Map<string, { courtId: string; day: string }>();
  let deleted = 0, cancelledBookings = 0;
  for (const d of bookings.docs) {
    const b = d.data();
    if (b.status === "cancelled") continue;
    const created = b.createdAt?.toMillis?.() ?? 0;
    if (b.paymentMethod === "mercadopago") {
      if (created <= 0 || created > staleBefore) continue;
      await d.ref.delete();
      deleted++;
    } else {
      await d.ref.update({ status: "cancelled", ...cancelled });
      cancelledBookings++;
    }
    const s = slotOf(b);
    if (s) days.set(`${s.courtId}_${s.day}`, s);
  }
  await Promise.all([...days.values()].map((s) => rebuildCourtDay(s.courtId, s.day)));

  let cancelledRegs = 0;
  const regs = await db.collection("tournament_registrations").where("paymentStatus", "==", "pending").get();
  for (const r of regs.docs) {
    const reg = r.data();
    if (reg.status === "cancelled" || !(Number(reg.price) > 0)) continue;
    await db.runTransaction(async (tx) => {
      const tRef = db.collection("tournaments").doc(reg.tournamentId);
      const t = await tx.get(tRef);
      tx.update(r.ref, { status: "cancelled", ...cancelled });
      if (t.exists) {
        const teams = (t.data()?.teams || []).filter((x: any) => x.id !== reg.teamId);
        tx.update(tRef, { teams, enrolledTeams: teams.length });
      }
    });
    cancelledRegs++;
  }

  let cancelledEnrollments = 0;
  const enr = await db.collection("academy_enrollments").where("paymentStatus", "==", "pending").get();
  for (const e of enr.docs) {
    const en = e.data();
    if (en.status === "cancelled" || !(Number(en.price) > 0)) continue;
    const batch = db.batch();
    batch.update(e.ref, { status: "cancelled", ...cancelled });
    if (en.classId) batch.update(db.collection("academy_classes").doc(en.classId), { enrolledStudents: FieldValue.increment(-1) });
    await batch.commit();
    cancelledEnrollments++;
  }

  // Experiencia y logros de quienes jugaron en las últimas 48 h
  const recent = await db.collection("bookings").where("date", ">=", Timestamp.fromMillis(Date.now() - 48 * 3_600_000)).get();
  const players = new Set<string>();
  recent.docs.forEach((d) => { const b = d.data(); if (b.userId) players.add(b.userId); (b.participantIds || []).forEach((p: string) => players.add(p)); });
  let recomputed = 0;
  for (const uid of players) if (await recomputePlayer(uid).catch(() => null)) recomputed++;

  return NextResponse.json({ ok: true, deleted, cancelledBookings, cancelledRegs, cancelledEnrollments, recomputed });
}
