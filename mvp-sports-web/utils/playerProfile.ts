import type { User } from "firebase/auth";

// Perfil mínimo de un jugador nuevo. Teléfono, RUT y fecha de nacimiento se piden antes del primer pago.
export function newPlayerDoc(user: Pick<User, "uid" | "email" | "displayName" | "photoURL">, displayName?: string) {
  return {
    uid: user.uid,
    email: user.email || "",
    displayName: displayName || user.displayName || "",
    photoURL: user.photoURL || "",
    role: "player",
    status: "active",
    createdAt: new Date(),
    xp: 0,
    level: 1,
    tier: "BRONCE",
    ovr: 40,
    badges: [],
    stats: { played: 0, won: 0, lost: 0, goals: 0, assists: 0, mvp: 0 },
  };
}

// Datos obligatorios para pagar: Mercado Pago pide RUT y el recinto necesita un teléfono de contacto.
export function missingForPayment(profile: any): string[] {
  const missing: string[] = [];
  if (!String(profile?.displayName || profile?.fullName || "").trim()) missing.push("nombre");
  if (String(profile?.phone || "").replace(/\D/g, "").length < 11) missing.push("teléfono");
  if (String(profile?.rut || "").replace(/[^0-9kK]/g, "").length < 8) missing.push("RUT");
  if (!profile?.birthDate) missing.push("fecha de nacimiento");
  return missing;
}
