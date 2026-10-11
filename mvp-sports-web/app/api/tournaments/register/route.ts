import { NextResponse } from "next/server";
import { adminDb } from "@/services/server/firebase-admin";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { chargeCard, rejectionMessage, PaymentError } from "@/services/server/mercadopago";
import { buildRegistration, commitRegistration } from "@/services/server/tournaments";

// Inscribe un equipo a un torneo.
//  - payOnline: crea la preferencia de Mercado Pago; la inscripción se confirma al aprobarse el pago.
//  - gratis: inscribe de inmediato. Si tiene precio, solo se acepta pago online.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión para inscribirte" }, { status: 401 });
  try {
    const body = await request.json();
    const draft = await buildRegistration(caller.uid, String(body?.tournamentId || ""), String(body?.teamId || ""));

    if (draft.price > 0 && !body?.payOnline) throw new PaymentError("La inscripción a este torneo se paga online.");
    if (body?.payOnline && draft.price > 0) {
      const { title, returnUrl, ...pendingRegistration } = draft;
      const pay = await chargeCard({
        uid: caller.uid,
        tenantId: draft.tenantId || "system",
        bookingId: draft.regId,
        amount: draft.price,
        title,
        returnUrl,
        pendingRegistration,
        card: body.card,
        payerEmail: caller.email,
        saveCard: !!body.saveCard,
      });
      if (pay.result !== "approved" && !pay.challenge) {
        return NextResponse.json({ ok: false, status: pay.status, error: rejectionMessage(pay.statusDetail) }, { status: 402 });
      }
      return NextResponse.json({ ok: pay.result === "approved", status: pay.status, challenge: pay.challenge, paymentRecordId: pay.paymentRecordId, returnUrl: pay.returnUrl, registrationId: draft.regId });
    }

    await adminDb().runTransaction((tx) =>
      commitRegistration(tx, draft, { paymentStatus: "paid", method: "free" }) // solo torneos gratis llegan aquí,
    );
    return NextResponse.json({ ok: true, registrationId: draft.regId });
  } catch (error: any) {
    if (error instanceof PaymentError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Tournament register error:", error);
    return NextResponse.json({ error: "No se pudo completar la inscripción" }, { status: 500 });
  }
}
