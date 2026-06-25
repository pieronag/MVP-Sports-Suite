export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  fullName?: string;
  role: "superadmin" | "admin" | "owner" | "manager" | "staff" | "player";
  phone?: string;
  status: "active" | "suspended";
  tenantId?: string;
  tenantIds?: string[];
  xp?: number;
  ovr?: number;
  tier?: string;
  createdAt?: Date | { seconds: number };
}

export interface Tenant {
  id: string;
  name: string;
  address?: string;
  status: "Activo" | "Suspendido";
  planId?: string;
  plan?: string;
  ownerId?: string;
  ownerIds?: string[];
  pricing?: Record<string, Record<string, number>>;
  rating?: number;
  transbankCommerceCode?: string;
  transbankApiKey?: string;
  coordinates?: { latitude: number; longitude: number };
}

export interface Court {
  id: string;
  tenantId: string;
  name: string;
  sport: string;
  category?: string;
  status?: "available" | "maintenance" | "occupied";
}

export interface Booking {
  id: string;
  tenantId: string;
  tenantName?: string;
  courtId: string;
  courtName: string;
  clientName: string;
  clientPhone?: string;
  userId?: string;
  playerId?: string;
  date: Date | { seconds: number };
  startTime: string;
  endTime?: string;
  duration: number;
  price: number;
  totalPrice?: number;
  deposit?: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no-show";
  paymentStatus: "pending" | "paid" | "partial" | "refunded" | "no-show";
  paymentMethod?: "cash" | "transfer" | "card" | "webpay" | "oneclick";
  source?: string;
  checkIn?: boolean;
  notes?: string;
  sport?: string;
  refundAmount?: number;
  refundFee?: number;
}

export interface Payment {
  id: string;
  userId: string;
  bookingId?: string;
  tenantId?: string;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected" | "refunded" | "refund_failed";
  method: "webpay_plus" | "oneclick";
  token?: string;
  buyOrder?: string;
  createdAt: Date | { seconds: number };
}

export interface Subscription {
  id: string;
  ownerId: string;
  tenantId: string;
  plan: "free" | "basico" | "pro" | "elite";
  status: "active" | "cancelled" | "suspended";
  startDate: Date | { seconds: number };
  endDate?: Date | { seconds: number };
  price: number;
}

export interface Invoice {
  id: string;
  userId?: string;
  tenantId?: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  issueDate: Date | { seconds: number };
  dueDate?: Date | { seconds: number };
  description?: string;
}

export interface GamificationSettings {
  xpPerCheckin: number;
  xpPerMatch: number;
  xpPerWin: number;
  xpPerMvp: number;
  tiers: {
    bronze: number;
    silver: number;
    gold: number;
    elite: number;
  };
}

export interface AuditEntry {
  id: string;
  traceId: string;
  action: string;
  module: string;
  details: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "SUCCESS" | "WARNING" | "FAILED";
  actor: string;
  role: string;
  email: string;
  ip: string;
  location: string;
  timestamp: Date | { seconds: number };
}

export interface Team {
  id: string;
  name: string;
  sport: string;
  ownerId: string;
  members: string[];
  createdAt: Date | { seconds: number };
}

export interface Tournament {
  id: string;
  name: string;
  sport: string;
  tenantId: string;
  status: "active" | "finished" | "cancelled";
  maxTeams: number;
  price?: number;
  teams?: string[];
  startDate: Date | { seconds: number };
  endDate?: Date | { seconds: number };
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: "percentage" | "fixed";
  usageLimit?: number;
  usedCount: number;
  expiresAt: Date | { seconds: number };
  tenantId?: string;
}

export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: string;
};
