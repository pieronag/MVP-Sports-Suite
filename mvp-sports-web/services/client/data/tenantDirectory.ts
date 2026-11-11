"use client";
// Red de recintos (superadmin): una fila por recinto con canchas, staff, horario y valoración.
// Carga las colecciones relacionadas una sola vez y agrupa en memoria (sin N+1).
// El MRR y la deuda NO se calculan aquí: dependen de los planes vigentes y la pantalla los resuelve al dibujar.
import { collection, getDocs, doc, updateDoc, query, orderBy, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/services/client/firebase";
import { normalizeVenue } from "@/utils/venueModel";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface StaffMember { id: string; fullName?: string; jobTitle: string }

export interface TenantRow {
    id: string; name: string;
    ownerIds: string[]; owners: string[]; ownerEmails: string[];
    address: string; commune: string; region: string; city: string;
    coordinates: { lat: number; lng: number };
    imageUrl: string; imageURL: string;
    plan: string;
    status: string;
    overdue: boolean;
    infra: { courts: number; staff: number; sports: string[]; scheduleSummary: string };
    staffMembers: StaffMember[];
    rating: number; totalFeedbacks: number;
}

/** "Activo"/"active" cuentan como activo; cualquier otro estado, no */
export const isTenantActive = (status?: string) => ["activo", "active"].includes((status || "").toLowerCase());

const scheduleSummary = (schedule: Record<string, any> | undefined): string => {
    const day = Object.values(schedule || {})[0] as any;
    return day?.isOpen ? `${day.open} - ${day.close}` : "No definido";
};

// Promedio de valoraciones: reseñas + reservas calificadas, sin contar dos veces la misma
const ratingOf = (tenantId: string, reviews: any[], rated: any[]) => {
    const key = (item: any) => {
        const comment = (item.comment || item.feedback || "").trim().toLowerCase().substring(0, 30);
        const time = item.date?.seconds || item.date?.toString() || "";
        return `${item.userId || item.createdBy || "anon"}_${tenantId}_${item.rating}_${comment}_${time}`;
    };
    const all = new Map<string, any>();
    reviews.forEach((r) => all.set(r.bookingId || key(r), r));
    rated.forEach((b) => { if (!all.has(b.id) && !all.has(key(b))) all.set(b.id, b); });
    const evals = Array.from(all.values());
    const avg = evals.length ? evals.reduce((acc, e) => acc + (e.rating || 0), 0) / evals.length : 0;
    return { rating: Math.round(avg * 10) / 10, total: evals.length };
};

const groupBy = <T,>(items: T[], keyOf: (x: T) => string | undefined) => {
    const m = new Map<string, T[]>();
    for (const it of items) { const k = keyOf(it); if (k) m.set(k, [...(m.get(k) || []), it]); }
    return m;
};

export async function loadTenantDirectory(): Promise<TenantRow[]> {
    const [snap, courtsSnap, staffSnap, reviewsSnap, ratedSnap] = await Promise.all([
        getDocs(query(collection(db, "tenants"), orderBy("name"))),
        getDocs(collection(db, "courts")),
        getDocs(collection(db, "staff")),
        getDocs(collection(db, "reviews")),
        getDocs(query(collection(db, "bookings"), where("rating", ">", 0))),
    ]);

    const courtsByTenant = groupBy(courtsSnap.docs.map((d) => d.data()), (c) => c.tenantId);
    const reviewsByTenant = groupBy(reviewsSnap.docs.map((d) => d.data()), (r) => r.venueId);
    const ratedByTenant = groupBy(ratedSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any)), (b) => b.tenantId);
    const staffByTenant = new Map<string, Map<string, StaffMember>>();
    staffSnap.docs.forEach((s) => {
        const sd = s.data();
        const ids: string[] = sd.tenantIds || (sd.tenantId ? [sd.tenantId] : []);
        ids.forEach((tid) => {
            if (!staffByTenant.has(tid)) staffByTenant.set(tid, new Map());
            staffByTenant.get(tid)!.set(s.id, { id: s.id, fullName: sd.fullName, jobTitle: sd.jobTitle || "Staff" });
        });
    });

    return snap.docs.map((d) => {
        const data = d.data();
        const id = d.id;
        const staffMembers = Array.from((staffByTenant.get(id) || new Map()).values());
        const { rating, total } = ratingOf(id, reviewsByTenant.get(id) || [], ratedByTenant.get(id) || []);

        // El listado deja guardada la valoración vigente (una escritura solo si cambió)
        if (data.rating !== rating || data.totalFeedbacks !== total) {
            updateDoc(doc(db, "tenants", id), { rating, totalFeedbacks: total }).catch((e) => console.error(e));
        }

        const image = data.imageURL || data.imageUrl || "";
        return {
            id, name: data.name || "Sin nombre",
            ownerIds: data.ownerIds || (data.ownerId ? [data.ownerId] : []),
            owners: data.ownerNames || (data.ownerName ? [data.ownerName] : (data.owner ? [data.owner] : [])),
            ownerEmails: data.ownerEmails || (data.ownerEmail ? [data.ownerEmail] : []),
            address: data.address || "", commune: data.commune || "", region: data.region || "",
            city: data.commune || data.city || "---",
            coordinates: data.coordinates || { lat: 0, lng: 0 },
            imageUrl: image, imageURL: image,
            plan: data.planId || data.plan || "",
            status: data.status || "Sin estado",
            overdue: data.debtStatus === "Vencido",
            infra: { courts: (courtsByTenant.get(id) || []).length, staff: staffMembers.length, sports: normalizeVenue(id, data).sports, scheduleSummary: scheduleSummary(data.schedule) },
            staffMembers,
            rating, totalFeedbacks: total,
        };
    });
}

/** Reservas registradas de un recinto (para no borrar uno con historia) */
export const countTenantBookings = (tenantId: string) =>
    getCountFromServer(query(collection(db, "bookings"), where("tenantId", "==", tenantId))).then((r) => r.data().count);
