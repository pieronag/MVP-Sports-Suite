import { NextRequest, NextResponse } from "next/server";
import { adminDb as getAdminDb } from "@/services/firebase-admin";

// Webhook de Mercado Pago: recibe notificaciones de pago y marca la reserva como pagada.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const paymentId = body?.data?.id;
    const type = body?.type || body?.action;

    if (type !== "payment" || !paymentId) {
      return NextResponse.json({ ok: true });
    }

    const db = getAdminDb();

    // Buscar el recinto que tiene el token de Mercado Pago y verificar el pago.
    // El pago se identifica por external_reference (buyOrder) devuelto por la API.
    const tenantsSnap = await db
      .collection("tenants")
      .where("mercadopagoAccessToken", "!=", "")
      .limit(20)
      .get();

    for (const tDoc of tenantsSnap.docs) {
      const accessToken = tDoc.data()?.mercadopagoAccessToken;
      if (!accessToken) continue;

      let vdata: any;
      try {
        const vresp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        vdata = await vresp.json();
      } catch (e: any) {
        console.warn("MP webhook fetch failed:", e.message);
        continue;
      }

      const externalRef = vdata?.external_reference || "";
      if (!externalRef || vdata.status !== "approved") continue;

      const paySnap = await db
        .collection("payments")
        .where("buyOrder", "==", externalRef)
        .where("method", "==", "mercadopago")
        .limit(1)
        .get();
      if (paySnap.empty) continue;

      const payDoc = paySnap.docs[0];
      const payData = payDoc.data() || {};
      if (payData.status === "approved") break;

      const batch = db.batch();
      batch.update(payDoc.ref, { status: "approved", mercadopagoPaymentId: String(paymentId), result: vdata });

      const bookingId = payData.bookingId;
      const pendingBookingData = payData.pendingBookingData;
      if (bookingId) {
        if (pendingBookingData) {
          const rawDate = pendingBookingData.date;
          let finalDate = new Date();
          if (rawDate?.seconds != null) finalDate = new Date(rawDate.seconds * 1000 + (rawDate.nanoseconds || 0) / 1000000);
          else if (rawDate?._seconds != null) finalDate = new Date(rawDate._seconds * 1000 + (rawDate._nanoseconds || 0) / 1000000);
          else if (typeof rawDate === "string") finalDate = new Date(rawDate);

          batch.set(db.collection("bookings").doc(bookingId), {
            ...pendingBookingData,
            paymentMethod: "mercadopago",
            date: finalDate,
            paymentStatus: "paid",
            status: "confirmed",
            updatedAt: new Date(),
          });
        } else {
          batch.update(db.collection("bookings").doc(bookingId), {
            paymentMethod: "mercadopago",
            paymentStatus: "paid",
            status: "confirmed",
            updatedAt: new Date(),
          });
        }
      }

      await batch.commit();
      break;
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("MercadoPago Webhook Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}