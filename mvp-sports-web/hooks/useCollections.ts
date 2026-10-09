import { collection, query, orderBy, limit, where } from "firebase/firestore";
import { useCollectionRealtime, useCollection, useDocument } from "./useFirestoreQuery";

export interface AuditEntry {
  id: string;
  action: string;
  module: string;
  details?: string;
  severity: string;
  status: string;
  actor?: string;
  role?: string;
  timestamp?: { seconds: number };
}

export interface Setting {
  id: string;
  commissionRate?: number;
  platformName?: string;
  maintenanceMode?: boolean;
  [key: string]: unknown;
}

export function useAuditLog(limitCount = 10) {
  return useCollectionRealtime<AuditEntry>(
    "audit",
    [orderBy("timestamp", "desc"), limit(limitCount)],
  );
}

export function useInvoices() {
  return useCollectionRealtime(
    "invoices",
    [orderBy("issueDate", "desc")],
  );
}

export function useUsers() {
  return useCollection("users", [limit(1000)], { refetchInterval: 60_000 });
}

export function useSetting(docId: string) {
  return useDocument<Setting>("settings", docId, { refetchInterval: 120_000 });
}

export function useCourtsByTenant(tenantId: string | undefined) {
  return useCollectionRealtime<{ id: string; name: string; sport?: string; tenantId?: string }>(
    "courts",
    tenantId ? [where("tenantId", "==", tenantId)] : [],
    { enabled: !!tenantId },
  );
}
