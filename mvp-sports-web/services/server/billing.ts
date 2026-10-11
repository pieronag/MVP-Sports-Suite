import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { chileDateTime, chileToday } from "@/utils/chileTime";

export class BillingError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

type Plan = { id: string; name?: string; price?: number; commission?: number; priorityScore?: number; features?: Record<string, boolean> };

async function plans(): Promise<Plan[]> {
  const s = (await adminDb().collection("settings").doc("global").get()).data() || {};
  return Array.isArray(s.plans) ? s.plans : [];
}

// El cambio de plan rige desde el 1 del mes siguiente (mensual) o el 1 de enero (anual), hora de Chile
export function scheduledDateFor(cycle: "monthly" | "annual", now = new Date()) {
  const [y, m] = chileToday(now).split("-").map(Number);
  const day = cycle === "annual" ? `${y + 1}-01-01` : m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return chileDateTime(day, 0, 0);
}

export async function schedulePlanChange(tenantId: string, planId: string, cycle: "monthly" | "annual") {
  const plan = (await plans()).find((p) => p.id === planId);
  if (!plan) throw new BillingError("Ese plan no existe.");
  const price = Math.round(Number(plan.price || 0) * (cycle === "annual" ? 0.8 : 1));
  const when = scheduledDateFor(cycle);
  await adminDb().collection("tenants").doc(tenantId).update({
    pendingPlanId: plan.id, pendingPlanName: plan.name || plan.id, pendingPlanPrice: price,
    pendingBillingCycle: cycle, scheduledChangeDate: Timestamp.fromDate(when),
  });
  return { scheduledChangeDate: when.toISOString(), price };
}

export async function cancelPlanChange(tenantId: string) {
  await adminDb().collection("tenants").doc(tenantId).update({
    pendingPlanId: null, pendingPlanName: null, pendingPlanPrice: null, pendingBillingCycle: null, scheduledChangeDate: null,
  });
}

// Aplica el cambio agendado si ya corresponde (lo usa el cron diario y la pantalla de suscripción)
export async function applyDuePlanChange(tenantId: string, now = new Date()) {
  const ref = adminDb().collection("tenants").doc(tenantId);
  const t = (await ref.get()).data();
  if (!t?.pendingPlanId || !t.scheduledChangeDate?.toDate || t.scheduledChangeDate.toDate() > now) return false;
  const plan = (await plans()).find((p) => p.id === t.pendingPlanId);
  if (!plan) { await cancelPlanChange(tenantId); return false; }
  await ref.update({
    planId: plan.id, plan: plan.name || plan.id, billingCycle: t.pendingBillingCycle || "monthly",
    commission: plan.commission ?? FieldValue.delete(), priorityScore: plan.priorityScore ?? FieldValue.delete(),
    features: plan.features ?? FieldValue.delete(), lastPlanChange: FieldValue.serverTimestamp(),
    pendingPlanId: null, pendingPlanName: null, pendingPlanPrice: null, pendingBillingCycle: null, scheduledChangeDate: null,
  });
  return true;
}

export async function applyAllDuePlanChanges(now = new Date()) {
  const snap = await adminDb().collection("tenants").where("scheduledChangeDate", "<=", Timestamp.fromDate(now)).get();
  let applied = 0;
  for (const d of snap.docs) if (await applyDuePlanChange(d.id, now)) applied++;
  return applied;
}
