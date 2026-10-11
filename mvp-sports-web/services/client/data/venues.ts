// Recintos y canchas del dueño, en vivo
import { collection, onSnapshot, or, query, where } from "firebase/firestore";
import { db } from "@/services/client/firebase";
import { courtBlockedAt } from "@/utils/courtAvailability";

export interface VenueSummary { id: string; name: string; address: string; status: string; raw: Record<string, any> }
export interface CourtMaintenance { id: string; tenantId: string; name: string; from: Date | null; until: Date | null; activeNow: boolean }

const toDate = (v: any): Date | null => (v?.toDate ? v.toDate() : v?.seconds ? new Date(v.seconds * 1000) : v ? new Date(v) : null);

export function watchOwnedVenues(uid: string, onData: (v: VenueSummary[]) => void, onError?: (e: Error) => void) {
  const q = query(collection(db, "tenants"), or(where("ownerId", "==", uid), where("ownerIds", "array-contains", uid)));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, name: x.name || "Recinto", address: x.address || "", status: x.status || "", raw: x };
  }).sort((a, b) => a.name.localeCompare(b.name))), onError);
}

// Canchas con mantenimiento vigente o programado (la ventana vive en el documento de la cancha)
export function watchCourtsInMaintenance(tenantIds: string[], onData: (c: CourtMaintenance[]) => void, onError?: (e: Error) => void) {
  const ids = [...new Set(tenantIds)].slice(0, 30);
  if (!ids.length) { onData([]); return () => {}; }
  const q = query(collection(db, "courts"), where("tenantId", "in", ids), where("status", "==", "maintenance"));
  return onSnapshot(q, (snap) => {
    const now = Date.now();
    onData(snap.docs.map((d) => {
      const x = d.data();
      return { id: d.id, tenantId: x.tenantId, name: x.name || "Cancha", from: toDate(x.maintenanceStart), until: toDate(x.maintenanceUntil), activeNow: courtBlockedAt(x, now, now + 1) };
    }).filter((c) => !c.until || c.until.getTime() > now));
  }, onError);
}
