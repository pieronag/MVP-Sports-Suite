import { NextRequest, NextResponse } from "next/server";
import { adminDb as getAdminDb } from "@/services/firebase-admin";
import { WebpayPlus, Options, IntegrationCommerceCodes, IntegrationApiKeys, Environment } from "transbank-sdk";

function isTestCommerceCode(code: string): boolean {
  return code.startsWith("5970");
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token_ws") || "";
  const fallbackUrl = request.nextUrl.searchParams.get("fallbackUrl") || "https://mvpsports.cl/player/billetera?error=no_token";

  if (!token) {
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    const db = getAdminDb();

    const paySnap = await db
      .collection("payments")
      .where("token", "==", token)
      .limit(1)
      .get();

    if (paySnap.empty) {
      return NextResponse.redirect("https://mvpsports.cl/player/billetera?error=payment_not_found");
    }

    const payDoc = paySnap.docs[0];
    const payData = payDoc.data() || {};
    const returnUrl = payData.returnUrl || "https://mvpsports.cl/player/billetera";

    if (payData.status === "approved") {
      return NextResponse.redirect(returnUrl);
    }

    const tenantId = payData.tenantId;
    let commerceCode: string | undefined;
    let apiKey: string | undefined;

    if (tenantId && tenantId !== "system") {
      const tDoc = await db.collection("tenants").doc(tenantId).get();
      commerceCode = tDoc.data()?.transbankCommerceCode;
      apiKey = tDoc.data()?.transbankApiKey;
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
    const result = await tx.commit(token);

    if (result.vci === "TSY" || result.response_code === 0) {
      const batch = db.batch();
      batch.update(payDoc.ref, { status: "approved", result });

      const bookingId = payData.bookingId;
      const pendingBookingData = payData.pendingBookingData;

      if (bookingId) {
        if (pendingBookingData) {
          const rawDate = pendingBookingData.date;
          let finalDate = new Date();
          if (rawDate) {
            if (rawDate?.seconds != null) {
              finalDate = new Date(rawDate.seconds * 1000 + (rawDate.nanoseconds || 0) / 1000000);
            } else if (rawDate?._seconds != null) {
              finalDate = new Date(rawDate._seconds * 1000 + (rawDate._nanoseconds || 0) / 1000000);
            } else if (typeof rawDate === "string") {
              finalDate = new Date(rawDate);
            }
          }
          batch.set(db.collection("bookings").doc(bookingId), {
            ...pendingBookingData,
            paymentMethod: "webpay_plus",
            date: finalDate,
            paymentStatus: "paid",
            status: "confirmed",
            updatedAt: new Date(),
          });
        } else {
          batch.update(db.collection("bookings").doc(bookingId), {
            paymentMethod: "webpay_plus",
            paymentStatus: "paid",
            status: "confirmed",
            updatedAt: new Date(),
          });
        }
      }

      await batch.commit();
      return NextResponse.redirect(returnUrl);
    } else {
      return NextResponse.redirect(
        `https://mvpsports.cl/player/billetera?error=rejected&code=${result.response_code}`
      );
    }
  } catch (error: any) {
    console.error("Webpay Commit Error:", error);
    return NextResponse.redirect(
      `https://mvpsports.cl/player/billetera?error=commit_failed`
    );
  }
}
