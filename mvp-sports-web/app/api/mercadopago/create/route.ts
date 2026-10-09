import { NextResponse } from "next/server";
import { adminDb as getAdminDb } from "@/services/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, tenantId, amount, buyOrder, bookingData, returnUrl } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    const db = getAdminDb();

    // 1. Resolver el Access Token de Mercado Pago (del recinto, o global de la plataforma)
    let accessToken: string | undefined;
    if (tenantId && tenantId !== "system") {
      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      accessToken = tenantDoc.data()?.mercadopagoAccessToken;
    }
    if (!accessToken) {
      const settingsSnap = await db.collection("settings").doc("global").get();
      accessToken = settingsSnap.data()?.mercadopago?.accessToken;
    }
    if (!accessToken) {
      return NextResponse.json(
        { error: "Mercado Pago no está configurado para este recinto." },
        { status: 400 }
      );
    }

    const safeAmount = Math.round(Number(amount));
    const safeBuyOrder = buyOrder || `ORD-${Date.now()}`;

    const preference = {
      items: [
        {
          id: bookingId || `bk-${Date.now()}`,
          title: "Reserva MVP Sports",
          quantity: 1,
          unit_price: safeAmount,
          currency_id: "CLP",
        },
      ],
      back_urls: {
        success: `https://mvpsports.cl/api/mercadopago/commit?status=success&external_reference=${encodeURIComponent(safeBuyOrder)}`,
        pending: `https://mvpsports.cl/api/mercadopago/commit?status=pending&external_reference=${encodeURIComponent(safeBuyOrder)}`,
        failure: `https://mvpsports.cl/api/mercadopago/commit?status=failure&external_reference=${encodeURIComponent(safeBuyOrder)}`,
      },
      auto_return: "approved",
      notification_url: "https://mvpsports.cl/api/mercadopago/webhook",
      external_reference: safeBuyOrder,
      metadata: {
        bookingId: bookingId || null,
        tenantId: tenantId || null,
      },
    };

    const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });
    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { error: data.message || "Error al crear la preferencia de pago" },
        { status: resp.status }
      );
    }

    try {
      await db.collection("payments").add({
        bookingId: bookingId || null,
        tenantId: tenantId || null,
        amount: safeAmount,
        buyOrder: safeBuyOrder,
        preferenceId: data.id,
        status: "pending",
        method: "mercadopago",
        pendingBookingData: bookingData || null,
        returnUrl: returnUrl || null,
        createdAt: new Date(),
      });
    } catch (dbErr: any) {
      console.warn("Payment record save failed:", dbErr.message);
    }

    return NextResponse.json({
      url: data.init_point || data.sandbox_init_point,
      preferenceId: data.id,
    });
  } catch (error: any) {
    console.error("MercadoPago Create Error:", error);
    return NextResponse.json(
      { error: error.message || "Error al iniciar pago" },
      { status: 500 }
    );
  }
}