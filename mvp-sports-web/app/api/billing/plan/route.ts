import { NextResponse } from "next/server";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { assertManagesVenues, StaffError } from "@/services/server/staff";
import { schedulePlanChange, cancelPlanChange, applyDuePlanChange, BillingError } from "@/services/server/billing";

// Cambio de plan del recinto: el dueño lo agenda o cancela; el servidor valida el plan, fija la fecha y lo aplica
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!(await allowRequest(`billing_plan_${caller.uid}`, 20, 60_000))) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, { status: 429 });
  const { action, tenantId, planId, cycle } = await request.json().catch(() => ({}));
  if (typeof tenantId !== "string" || !tenantId) return NextResponse.json({ error: "Indica el recinto." }, { status: 400 });
  try {
    await assertManagesVenues(caller.uid, [tenantId]);
    if (action === "schedule") {
      if (typeof planId !== "string" || !planId) throw new BillingError("Indica el plan.");
      return NextResponse.json({ ok: true, ...(await schedulePlanChange(tenantId, planId, cycle === "annual" ? "annual" : "monthly")) });
    }
    if (action === "cancel") { await cancelPlanChange(tenantId); return NextResponse.json({ ok: true }); }
    if (action === "apply") return NextResponse.json({ ok: true, applied: await applyDuePlanChange(tenantId) });
    throw new BillingError("Acción no válida.");
  } catch (e) {
    if (e instanceof StaffError || e instanceof BillingError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("billing plan", e);
    return NextResponse.json({ error: "No se pudo procesar el cambio de plan." }, { status: 500 });
  }
}
