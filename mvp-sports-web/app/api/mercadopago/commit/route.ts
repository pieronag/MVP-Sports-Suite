import { NextRequest, NextResponse } from "next/server";
import { adminDb as getAdminDb } from "@/services/firebase-admin";

function toDate(rawDate: any): Date {
  let finalDate = new Date();
  if (!rawDate) return finalDate;
  if (rawDate?.seconds != null) {
    finalDate = new Date(rawDate.seconds * 1000 + (rawDate.nanoseconds || 0) / 1000000);
  } else if (rawDate?._seconds != null) {
    finalDate = new Date(rawDate._seconds * 1000 + (rawDate._nanoseconds || 0) / 1000000);
  } else if (typeof rawDate === "string") {
    finalDate = new Date(rawDate);
  } else if (rawDate instanceof Date) {
    finalDate = rawDate;
  }
  return finalDate;
}

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") || "";
  const externalRef = request.nextUrl.searchParams.get("external_reference") || "";
  const paymentId = request.nextUrl.searchParams.get("payment_id") || "";
  const fallbackUrl = "https://mvpsports.cl/player/billetera";

  try {
    const db = getAdminDb();

    // Buscar el registro de pago por buyOrder (external_reference) o por payment_id
    let paySnap;
    if (externalRef) {
      paySnap = await db
        .collection("payments")
        .where("buyOrder", "==", externalRef)
        .where("method", "==", "mercadopago")
        .limit(1)
        .get();
    }
    if ((!paySnap || paySnap.empty) && paymentId) {
      paySnap = await db
        .collection("payments")
        .where("mercadopagoPaymentId", "==", paymentId)
        .limit(1)
        .get();
    }
    if (!paySnap || paySnap.empty) {
      return NextResponse.redirect(fallbackUrl + "?error=payment_not_found");
    }

    const payDoc = paySnap.docs[0];
    const payData = payDoc.data() || {};
    const returnUrl = payData.returnUrl || fallbackUrl;

    if (payData.status === "approved") {
      return NextResponse.redirect(returnUrl);
    }

    // Verificar el pago en Mercado Pago (si tenemos el payment_id y el token del recinto)
    const tenantId = payData.tenantId;
    let accessToken: string | undefined;
    if (tenantId && tenantId !== "system") {
      const tDoc = await db.collection("tenants").doc(tenantId).get();
      accessToken = tDoc.data()?.mercadopagoAccessToken;
    }
    if (!accessToken) {
      const sSnap = await db.collection("settings").doc("global").get();
      accessToken = sSnap.data()?.mercadopago?.accessToken;
    }

    let approved = status === "approved";
    if (paymentId && accessToken) {
      try {
        const vresp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const vdata = await vresp.json();
        approved = vdata.status === "approved";
        await payDoc.ref.update({ mercadopagoPaymentId: paymentId, status: vdata.status || status, result: vdata });
      } catch (e: any) {
        console.warn("MercadoPago verify failed:", e.message);
        await payDoc.ref.update({ status: approved ? "approved" : status });
      }
    } else {
      await payDoc.ref.update({ status: approved ? "approved" : status });
    }

    if (!approved) {
      return NextResponse.redirect(returnUrl + (returnUrl.includes("?") ? "&" : "?") + "error=rejected");
    }

    const batch = db.batch();
    batch.update(payDoc.ref, { status: "approved" });

    const bookingId = payData.bookingId;
    const pendingBookingData = payData.pendingBookingData;
    if (bookingId) {
      if (pendingBookingData) {
        const finalDate = toDate(pendingBookingData.date);
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
    return NextResponse.redirect(returnUrl);
  } catch (error: any) {
    console.error("MercadoPago Commit Error:", error);
    return NextResponse.redirect(fallbackUrl + "?error=commit_failed");
  }
}