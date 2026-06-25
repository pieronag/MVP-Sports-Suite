import { collection, query, where } from "firebase/firestore";
import { useCollectionRealtime } from "./useFirestoreQuery";

export interface Tenant {
  id: string;
  name: string;
  status: string;
  planId?: string;
  plan?: string;
  ownerId?: string;
  ownerIds?: string[];
  rating?: number;
  address?: string;
  pricing?: Record<string, Record<string, number>>;
  transbankCommerceCode?: string;
  transbankApiKey?: string;
  createdAt?: { seconds: number };
}

export function useTenants() {
  return useCollectionRealtime<Tenant>("tenants", [], { enabled: true });
}

export function useTenantsByOwner(ownerId: string | undefined) {
  return useCollectionRealtime<Tenant>(
    "tenants",
    ownerId ? [where("ownerId", "==", ownerId)] : [],
    { enabled: !!ownerId },
  );
}

export function useTenantsByIds(ids: string[]) {
  return useCollectionRealtime<Tenant>(
    "tenants",
    ids.length > 0 ? [where("__name__", "in", ids.slice(0, 30))] : [],
    { enabled: ids.length > 0 },
  );
}
