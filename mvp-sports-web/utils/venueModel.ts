// Recinto normalizado: une las variantes históricas de los documentos de `tenants`
import type { RawDoc } from "@/types/booking";

export type VenueState = "active" | "suspended";

export interface VenueModel {
  id: string;
  name: string;
  state: VenueState;
  ownerIds: string[];
  planId: string;
  imageUrl: string;
  gallery: string[];
  sports: string[];
  address: string;
  commune: string;
  region: string;
  location: { lat: number; lng: number } | null;
  phone: string;
  whatsapp: string;
  onlinePayments: boolean;
  rating: number;
  totalFeedbacks: number;
  raw: RawDoc;
}

const num = (v: unknown) => (v === null || v === undefined || v === "" ? NaN : Number(v));

export function normalizeVenue(id: string, d: RawDoc): VenueModel {
  const st = String(d.status || "").toLowerCase();
  const coords = d.coordinates || d.location || d;
  const lat = num(coords?.lat ?? coords?.latitude ?? coords?._lat);
  const lng = num(coords?.lng ?? coords?.longitude ?? coords?._long);
  const sports = [...new Set<string>([...(Array.isArray(d.activeSports) ? d.activeSports : []), ...(Array.isArray(d.sports) ? d.sports : [])].filter(Boolean))];
  return {
    id,
    name: d.name || "Recinto",
    state: st === "suspendido" || st === "suspended" || st === "inactive" || st === "inactivo" ? "suspended" : "active",
    ownerIds: [...new Set<string>([d.ownerId, ...(Array.isArray(d.ownerIds) ? d.ownerIds : [])].filter(Boolean))],
    planId: String(d.planId || d.plan || "").toLowerCase(),
    imageUrl: d.imageUrl || d.imageURL || d.coordinates?.imageUrl || d.coordinates?.imageURL || (Array.isArray(d.gallery) ? d.gallery[0] : "") || "",
    gallery: Array.isArray(d.gallery) ? d.gallery.filter(Boolean) : [],
    sports,
    address: d.coordinates?.fullAddress || d.address || "",
    commune: d.commune || "",
    region: d.region || "",
    location: Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0) ? { lat, lng } : null,
    phone: d.phone || "",
    whatsapp: d.whatsapp || "",
    onlinePayments: d.isMercadopagoActive !== false,
    rating: Number(d.rating) || 0,
    totalFeedbacks: Number(d.totalFeedbacks) || 0,
    raw: d,
  };
}

export const isOwnerOf = (v: VenueModel, uid: string) => v.ownerIds.includes(uid);
