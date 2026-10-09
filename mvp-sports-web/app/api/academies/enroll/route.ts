import { NextResponse } from "next/server";
import { adminDb } from "@/services/firebase-admin";
import { verifyAuthedCaller } from "@/services/server-auth";
import { createPreference, PaymentError } from "@/services/mercadopago";
import { buildEnrollment, commitEnrollment } from "@/services/academies";

// Inscribe al jugador en una clase de academia.
//  - payOnline: preferencia de Mercado Pago; la inscripción se confirma al aprobarse el pago.
//  - pago en recinto (o clase gratis): inscribe de inmediato con pago pendiente.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión para inscribirte" }, { status: 401 });
  try {
    const body = await request.json();
    const draft = await buildEnrollment(caller.uid, String(body?.classId || ""));

    if (body?.payOnline && draft.price > 0) {
      if (!draft.tenantId) throw new PaymentError("Esta clase no tiene un recinto con pagos online configurado");
      const { title, returnUrl, ...pendingEnrollment } = draft;
      const pref = await createPreference({
        uid: caller.uid,
        tenantId: draft.tenantId,
        bookingId: draft.enrollmentId,
        amount: draft.price,
        title,
        returnUrl,
        pendingEnrollment,
      });
      return NextResponse.json({ url: pref.url, enrollmentId: draft.enrollmentId, amount: draft.price });
    }

    await adminDb().runTransaction((tx) =>
      commitEnrollment(tx, draft, { paymentStatus: draft.price > 0 ? "pending" : "paid", method: "venue" }),
    );
    return NextResponse.json({ ok: true, enrollmentId: draft.enrollmentId });
  } catch (error: any) {
    if (error instanceof PaymentError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Academy enroll error:", error);
    return NextResponse.json({ error: "No se pudo completar la inscripción" }, { status: 500 });
  }
}
