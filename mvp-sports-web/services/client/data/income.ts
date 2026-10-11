// Ingresos de los recintos en un rango: reservas, torneos y academias
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/services/client/firebase";
import { listBookings } from "@/services/client/data/bookings";
import { isReal } from "@/utils/bookingModel";
import { fromBooking, fromEnrollment, fromRegistration, type IncomeItem } from "@/utils/incomeModel";
import type { RawDoc } from "@/types/booking";

const chunks = <T,>(arr: T[], n = 30) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function byTenants(col: string, tenantIds: string[]) {
  const out: { id: string; data: RawDoc }[] = [];
  for (const ids of chunks(tenantIds)) {
    const snap = await getDocs(query(collection(db, col), where("tenantId", "in", ids)));
    snap.docs.forEach((d) => out.push({ id: d.id, data: d.data() as RawDoc }));
  }
  return out;
}

export async function listIncome(tenantIds: string[], from: Date, to: Date): Promise<IncomeItem[]> {
  const ids = [...new Set(tenantIds.filter(Boolean))];
  if (!ids.length) return [];
  const inRange = (i: IncomeItem) => i.date >= from && i.date <= to;

  const [bookings, tournaments, regs, enrolls] = await Promise.all([
    listBookings(ids, { from, to }),
    byTenants("tournaments", ids),
    byTenants("tournament_registrations", ids),
    byTenants("academy_enrollments", ids),
  ]);
  const tName = new Map(tournaments.map((t) => [t.id, String(t.data.name || "Torneo")]));

  return [
    ...bookings.filter(isReal).map(fromBooking),
    ...regs.map((r) => fromRegistration(r.id, r.data, tName.get(r.data.tournamentId) || "Torneo")),
    ...enrolls.map((e) => fromEnrollment(e.id, e.data)),
  ].filter(inRange).sort((a, b) => b.date.getTime() - a.date.getTime());
}
