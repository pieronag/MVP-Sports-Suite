import { NextResponse } from "next/server";
import { adminDb as getAdminDb } from "@/services/firebase-admin";
import { WebpayPlus, Options, IntegrationCommerceCodes, IntegrationApiKeys, Environment } from "transbank-sdk";

function isTestCommerceCode(code: string): boolean {
  return code.startsWith("5970");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, tenantId, amount, buyOrder, bookingData, returnUrl } = body;

    if (!tenantId || !amount) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const db = getAdminDb();

    let commerceCode: string | undefined;
    let apiKey: string | undefined;

    if (tenantId && tenantId !== "system") {
      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      commerceCode = tenantDoc.data()?.transbankCommerceCode;
      apiKey = tenantDoc.data()?.transbankApiKey;
    }

    let options: Options;
    if (commerceCode && apiKey) {
      const env = isTestCommerceCode(commerceCode)
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
    const response = await tx.create(
      buyOrder || `ORD-${Date.now()}`,
      `session-${Date.now()}`,
      amount,
      `https://mvpsports.cl/api/webpay/commit`
    );

    await db.collection("payments").add({
      bookingId,
      tenantId,
      amount,
      buyOrder: buyOrder || `ORD-${Date.now()}`,
      token: response.token,
      status: "pending",
      method: "webpay_plus",
      pendingBookingData: bookingData || null,
      returnUrl: returnUrl || null,
      createdAt: new Date(),
    });

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
