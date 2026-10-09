import { NextResponse } from "next/server";
import { WebpayPlus, Options, IntegrationCommerceCodes, IntegrationApiKeys, Environment } from "transbank-sdk";

export async function GET() {
  try {
    const options = new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    );
    const tx = new WebpayPlus.Transaction(options);
    const response = await tx.create(
      `ORD-${Date.now()}`,
      `session-test`,
      10000,
      "https://mvpsports.cl/api/webpay/commit"
    );
    return NextResponse.json({ success: true, url: response.url, token: response.token });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack?.slice(0, 500) }, { status: 500 });
  }
}
