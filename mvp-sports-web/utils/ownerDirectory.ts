// Cartera de dueños (superadmin): de documento a fila con sus recintos, MRR y deuda real (liquidaciones sin pagar).
import { findPlan, type PlanConfig } from "./invoiceCalc";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface OwnerRow {
  id: string; name: string; company: string; email: string; phone: string; rut: string; billingAddress: string;
  photoURL: string; status: "Activo" | "Suspendido"; createdAt: any; paymentHistory: string[];
  venues: { id: string; name: string; plan: string }[];
  totalMrr: number; debt: number; overdue: boolean; tier: "VIP PLATINO" | "ORO" | "ESTÁNDAR";
}

const UNPAID = ["pendiente", "pending", "vencida", "overdue"];

/** Nivel según lo que paga al mes: ORO desde 2 veces el plan más caro, VIP PLATINO desde 4 veces. */
export function ownerTier(mrr: number, plans: PlanConfig[]): OwnerRow["tier"] {
  const top = Math.max(0, ...plans.map((p) => Number(p.price) || 0));
  if (top > 0 && mrr >= top * 4) return "VIP PLATINO";
  if (top > 0 && mrr >= top * 2) return "ORO";
  return "ESTÁNDAR";
}

export function toOwnerRow(id: string, d: Record<string, any>, tenants: Record<string, any>[], plans: PlanConfig[], invoices: Record<string, any>[]): OwnerRow {
  const mine = tenants.filter((t) => t.ownerId === id || (Array.isArray(t.ownerIds) && t.ownerIds.includes(id)));
  const ids = new Set(mine.map((t) => t.id));
  const unpaid = invoices.filter((inv) => ids.has(inv.tenantId) && UNPAID.includes(String(inv.status || "").toLowerCase()));
  const totalMrr = mine.reduce((s, t) => s + (Number(findPlan(plans, t)?.price) || 0), 0);
  return {
    id, name: d.displayName || d.fullName || "Sin nombre", company: d.companyName || "", email: d.email || "", phone: d.phone || "",
    rut: d.rut || "", billingAddress: d.billingAddress || "", photoURL: d.photoURL || "",
    // Solo "suspended" es suspendido; antes cualquier valor distinto de "active" (o sin estado) se mostraba como suspendido
    status: String(d.status || "").toLowerCase() === "suspended" ? "Suspendido" : "Activo",
    createdAt: d.createdAt, paymentHistory: Array.isArray(d.paymentHistory) ? d.paymentHistory : [],
    venues: mine.map((t) => ({ id: t.id, name: t.name || t.id, plan: findPlan(plans, t)?.name || t.planId || t.plan || "—" })),
    totalMrr, debt: unpaid.reduce((s, inv) => s + (Number(inv.amount) || 0), 0),
    overdue: unpaid.some((inv) => ["vencida", "overdue"].includes(String(inv.status).toLowerCase())),
    tier: ownerTier(totalMrr, plans),
  };
}

export type OwnerFilter = "Todos" | "Morosos" | "Suspendidos" | "Sin recintos";
const fold = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function filterOwners(rows: OwnerRow[], search: string, filter: OwnerFilter) {
  const q = fold(search.trim());
  return rows.filter((o) => {
    if (q && !fold(`${o.name} ${o.email} ${o.company} ${o.rut} ${o.venues.map((v) => v.name).join(" ")}`).includes(q)) return false;
    if (filter === "Morosos") return o.debt > 0;
    if (filter === "Suspendidos") return o.status === "Suspendido";
    if (filter === "Sin recintos") return o.venues.length === 0;
    return true;
  }).sort((a, b) => b.debt - a.debt || b.totalMrr - a.totalMrr || a.name.localeCompare(b.name, "es"));
}

/** Campos editables, sin textos de relleno (antes "+56 9 .... ...." o "---" terminaban guardados como datos reales). */
export function ownerUpdate(form: { name: string; phone: string; company: string; rut: string; billingAddress: string }) {
  const t = (v: string) => v.trim();
  return { displayName: t(form.name), phone: t(form.phone), companyName: t(form.company), rut: t(form.rut), billingAddress: t(form.billingAddress) };
}
