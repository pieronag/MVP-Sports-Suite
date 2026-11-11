// Canchas: estado de mantenimiento y tarifas por deporte (lógica pura, compartida por la pantalla y la flota)
import { courtBlockedAt } from "@/utils/courtAvailability";
import { chileDateTime } from "@/utils/chileTime";
import { canonicalSport } from "@/utils/sports";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Mantenimiento: "En pausa" solo dentro de la ventana; antes de ella queda "Programada"
export const pausedNow = (c: any) => c.status === 'maintenance' && courtBlockedAt(c, Date.now(), Date.now() + 1);
const toDateAny = (v: any) => (v?.seconds ? new Date(v.seconds * 1000) : v ? new Date(v) : null);
export const maintenanceWindow = (c: any) => {
    const a = toDateAny(c.maintenanceStart), b = toDateAny(c.maintenanceUntil);
    const day = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    const hour = (d: Date) => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (!b) return 'Sin fecha de término';
    if (a && day(a) === day(b)) return `${day(a)} · ${hour(a)} – ${hour(b)}`;
    return `${a ? day(a) + ' – ' : 'Hasta '}${day(b)}`;
};

// Ventana del formulario de mantenimiento en hora de Chile
export const maintenanceRange = (f: { type: string; date: string; startTime: string; endTime: string; endDate: string }) => {
    const hm = (t: string) => t.split(':').map(Number) as [number, number];
    if (f.type === 'hours') {
        const [sh, sm] = hm(f.startTime); const [eh, em] = hm(f.endTime);
        return { start: chileDateTime(f.date, sh, sm || 0), end: chileDateTime(f.date, eh, em || 0) };
    }
    return { start: chileDateTime(f.date, 0, 0), end: new Date(chileDateTime(f.endDate, 0, 0, 1).getTime() - 1) };
};

// Une las tarifas por nombre oficial del deporte; si hay "Pádel" y "Padel", gana la que ya tenía el nombre oficial
export const mergePricing = (matrix: Record<string, any>, sports: string[]) => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(matrix)) {
        const c = canonicalSport(k);
        if (!sports.some(x => canonicalSport(x) === c)) continue;
        if (!(c in out) || k === c) out[c] = v;
    }
    return out;
};

// ---- Horario y tarifas por tramo horario ----
export type DayType = 'weekday' | 'weekend';
export interface DaySchedule { isOpen: boolean; open: string; close: string }
export type WeeklySchedule = Record<string, DaySchedule>;
export type SportPricing = Record<string, Partial<Record<DayType, Record<string, number>>>>;

/** Tramos de una hora que cubren todos los días abiertos (un cierre después de medianoche cuenta como el día siguiente) */
export const timeSlotsFor = (schedule: WeeklySchedule): string[] => {
    let minOpen = 24, maxClose = 0;
    Object.values(schedule).forEach((day) => {
        if (!day?.isOpen) return;
        const openH = parseInt(day.open.split(':')[0]);
        let closeH = parseInt(day.close.split(':')[0]);
        if (closeH < openH) closeH += 24;
        if (closeH === 0 && day.close !== '00:00') closeH = 24;
        minOpen = Math.min(minOpen, openH);
        maxClose = Math.max(maxClose, closeH);
    });
    if (minOpen === 24) return [];
    const out = new Set<string>();
    for (let i = minOpen; i < maxClose; i++) out.add(`${String(i % 24).padStart(2, '0')}:00`);
    return Array.from(out);
};

/** Precio de referencia: el primer tramo con precio del mismo tipo de día; si no hay, cualquiera del deporte */
export const referencePrice = (pricing: SportPricing, sport: string, dayType: DayType, slots: string[]): number => {
    const day = pricing[sport]?.[dayType] || {};
    const first = slots.find((t) => (day[t] ?? 0) > 0);
    if (first !== undefined) return day[first];
    const all = { ...(pricing[sport]?.weekday || {}), ...(pricing[sport]?.weekend || {}) };
    const any = slots.find((t) => (all[t] ?? 0) > 0);
    return any !== undefined ? all[any] : 0;
};

/** Pone `price` en los tramos indicados (todos, o solo los que no tienen precio) sin tocar los demás */
export const setSlotPrices = (pricing: SportPricing, sport: string, dayType: DayType, slots: string[], price: number, onlyMissing = false): SportPricing => {
    const current = pricing[sport] || { weekday: {}, weekend: {} };
    const day = { ...(current[dayType] || {}) };
    slots.forEach((t) => { if (!onlyMissing || !(day[t] > 0)) day[t] = price; });
    return { ...pricing, [sport]: { ...current, [dayType]: day } };
};
