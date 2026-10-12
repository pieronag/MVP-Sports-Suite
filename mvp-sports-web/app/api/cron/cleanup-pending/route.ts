import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { notifyUser } from "@/services/server/push";
import { applyAllDuePlanChanges } from "@/services/server/billing";
import { adminDb } from "@/services/server/firebase-admin";
import { slotOf, rebuildCourtDay } from "@/services/server/bookingProjections";
import { recomputePlayer } from "@/services/server/gamification";
import { canMarkNoShow, CHECKIN_GRACE_HOURS } from "@/utils/bookingPolicy";
import { hoursUntilStart } from "@/utils/chileTime";

// Cron de Vercel. La plataforma es 100% online: nada pendiente de pago es una reserva válida.
//  - Pago online iniciado y abandonado (más de 1 h): se borra.
//  - Reservas antiguas (pago en el recinto o manuales del personal) e inscripciones: se cancelan y se libera el cupo.
//  - Registra como inasistencia las reservas pagadas sin check-in pasados 15 min del inicio.
//  - Recalcula experiencia y logros de quienes jugaron en las últimas 48 h.
//  ?dryRun=1: simulación. Lee los datos reales y devuelve lo que haría, sin escribir ni notificar.

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const db = adminDb();
  const dry = new URL(request.url).searchParams.get("dryRun") === "1";
  const sample: { action: string; id: string }[] = [];
  const note = (action: string, id: string) => { if (dry && sample.length < 50) sample.push({ action, id }); };
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
      note("borrar_pago_abandonado", d.id);
      if (!dry) await d.ref.delete();
      deleted++;
    } else {
      note("cancelar_reserva_pendiente", d.id);
      if (!dry) await d.ref.update({ status: "cancelled", ...cancelled });
      cancelledBookings++;
    }
    const s = slotOf(b);
    if (s) days.set(`${s.courtId}_${s.day}`, s);
  }
  if (!dry) await Promise.all([...days.values()].map((s) => rebuildCourtDay(s.courtId, s.day)));

  let cancelledRegs = 0;
  const regs = await db.collection("tournament_registrations").where("paymentStatus", "==", "pending").get();
  for (const r of regs.docs) {
    const reg = r.data();
    if (reg.status === "cancelled" || !(Number(reg.price) > 0)) continue;
    note("cancelar_inscripcion_torneo", r.id);
    if (!dry) await db.runTransaction(async (tx) => {
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
    note("cancelar_matricula_academia", e.id);
    if (!dry) {
      const batch = db.batch();
      batch.update(e.ref, { status: "cancelled", ...cancelled });
      if (en.classId) batch.update(db.collection("academy_classes").doc(en.classId), { enrolledStudents: FieldValue.increment(-1) });
      await batch.commit();
    }
    cancelledEnrollments++;
  }

  // Inasistencias: reservas pagadas que pasaron el margen de 15 min sin check-in
  const recent = await db.collection("bookings").where("date", ">=", Timestamp.fromMillis(Date.now() - 48 * 3_600_000)).get();
  let noShows = 0;
  for (const d of recent.docs) {
    const b = d.data();
    if (b.paymentStatus !== "paid" || b.checkIn || b.status !== "confirmed" || b.isInternalMatch) continue;
    const h = hoursUntilStart(b);
    if (h === null || h >= -CHECKIN_GRACE_HOURS || !canMarkNoShow(b).ok) continue;
    note("marcar_inasistencia", d.id);
    noShows++;
    if (dry) continue;
    await d.ref.update({ status: "cancelled", noShow: true, noShowBy: "sistema", updatedAt: FieldValue.serverTimestamp() });
    if (b.userId) await db.collection("users").doc(b.userId).update({ strikes: FieldValue.increment(1), lastStrikeAt: FieldValue.serverTimestamp() }).catch(() => undefined);
    await notifyUser(b.userId, { kind: "no_show", bookingId: d.id, venue: b.tenantName || "el recinto" });
  }

  // Experiencia y logros de quienes jugaron en las últimas 48 h
  const players = new Set<string>();
  recent.docs.forEach((d) => { const b = d.data(); if (b.userId) players.add(b.userId); (b.participantIds || []).forEach((p: string) => players.add(p)); });
  let recomputed = 0;
  if (dry) recomputed = players.size;
  else for (const uid of players) if (await recomputePlayer(uid).catch(() => null)) recomputed++;

  // Cambios de plan agendados que ya corresponden
  const plansApplied = dry ? 0 : await applyAllDuePlanChanges().catch(() => 0);

  return NextResponse.json({ ok: true, dryRun: dry, deleted, cancelledBookings, cancelledRegs, cancelledEnrollments, noShows, recomputed, plansApplied, ...(dry ? { sample } : {}) });
}
