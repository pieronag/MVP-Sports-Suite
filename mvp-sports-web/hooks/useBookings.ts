import { collection, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { useCollectionRealtime } from "./useFirestoreQuery";

export interface Booking {
  id: string;
  tenantId: string;
  tenantName?: string;
  courtId: string;
  courtName: string;
  clientName: string;
  date: Timestamp;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: string;
  paymentStatus: string;
  price: number;
  totalPrice?: number;
  deposit?: number;
  sport?: string;
  notes?: string;
  userId?: string;
  playerId?: string;
  createdBy?: string;
  source?: string;
  checkIn?: boolean;
  paymentMethod?: string;
}

export function useBookingsByTenant(tenantId: string | undefined) {
  return useCollectionRealtime<Booking>(
    "bookings",
    tenantId ? [where("tenantId", "==", tenantId), orderBy("date", "desc"), limit(100)] : [],
    { enabled: !!tenantId },
  );
}

export function useBookingsByRange(tenantIds: string[], start: Date, end: Date) {
  const limitedIds = tenantIds.slice(0, 30);
  return useCollectionRealtime<Booking>(
    "bookings",
    limitedIds.length > 0
      ? [
          where("tenantId", "in", limitedIds),
          where("date", ">=", Timestamp.fromDate(start)),
          where("date", "<=", Timestamp.fromDate(end)),
        ]
      : [],
    { enabled: limitedIds.length > 0 },
  );
}

export function useRecentBookings(limitCount = 100) {
  return useCollectionRealtime<Booking>(
    "bookings",
    [orderBy("date", "desc"), limit(limitCount)],
  );
}
