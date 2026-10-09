import { NextResponse } from "next/server";
import { adminDb as getAdminDb } from "@/services/firebase-admin";
import { WebpayPlus, Options, IntegrationCommerceCodes, IntegrationApiKeys, Environment } from "transbank-sdk";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, tenantId, amount, buyOrder, bookingData, returnUrl } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    let commerceCode: string | undefined;
    let apiKey: string | undefined;

    try {
      const db = getAdminDb();
      if (tenantId && tenantId !== "system") {
        const tenantDoc = await db.collection("tenants").doc(tenantId).get();
        commerceCode = tenantDoc.data()?.transbankCommerceCode;
        apiKey = tenantDoc.data()?.transbankApiKey;
      }
    } catch (dbErr: any) {
      console.warn("Firestore lookup failed, using default credentials:", dbErr.message);
    }

    let options: Options;
    if (commerceCode && apiKey) {
      const env = commerceCode.startsWith("5970")
        ? Environment.Integration
        : Environment.Production;
      options = new Options(commerceCode, apiKey, env);
    } else {
      options = new Options(
        IntegrationCommerceCodes.WEBPAY_PLUS,
        IntegrationApiKeys.WEBPAY,
        Environment.Integration
      );
    }

    const tx = new WebpayPlus.Transaction(options);

    const safeAmount = Math.round(Number(amount));
    const safeBuyOrder = buyOrder || `ORD-${Date.now()}`;
    const sessionId = `s-${Date.now()}`;

    const response = await tx.create(
      safeBuyOrder,
      sessionId,
      safeAmount,
      "https://mvpsports.cl/api/webpay/commit"
    );

    try {
      const db = getAdminDb();
      await db.collection("payments").add({
        bookingId: bookingId || null,
        tenantId: tenantId || null,
        amount: safeAmount,
        buyOrder: safeBuyOrder,
        token: response.token,
        status: "pending",
        method: "webpay_plus",
        pendingBookingData: bookingData || null,
        returnUrl: returnUrl || null,
        createdAt: new Date(),
      });
    } catch (dbErr: any) {
      console.warn("Payment record save failed:", dbErr.message);
    }

    return NextResponse.json({
      url: response.url,
      token: response.token,
    });
  } catch (error: any) {
    console.error("Webpay Create Error:", error);
    return NextResponse.json(
      { error: error.message || "Error al iniciar pago" },
      { status: 500 }
    );
  }
}
