// Roles y acceso, en un solo lugar (misma idea que las reglas de Firestore).
export type Role = "player" | "manager" | "owner" | "admin" | "superadmin";

// Variantes históricas: 'staff' es personal de recinto (= manager), 'user' es jugador; sin rol = jugador
export function normalizeRole(raw: unknown): Role {
  const r = String(raw ?? "").trim().toLowerCase();
  if (r === "superadmin") return "superadmin";
  if (r === "admin") return "admin";
  if (r === "owner") return "owner";
  if (r === "manager" || r === "staff") return "manager";
  return "player";
}

export const isPlatformAdmin = (r: Role) => r === "admin" || r === "superadmin";
export const isVenueRole = (r: Role) => r === "manager" || r === "owner";

// Pantalla de inicio de cada rol (en cualquier dispositivo)
export const homeFor = (r: Role) => (r === "player" ? "/player" : "/dashboard");

const ADMIN: Role[] = ["admin", "superadmin"];
const OWNER: Role[] = ["owner", "admin", "superadmin"];
const VENUE_STAFF: Role[] = ["manager", "owner", "admin", "superadmin"];
const ANY_DASHBOARD: Role[] = VENUE_STAFF;

// Quién puede abrir cada ruta del panel
export function allowedRolesFor(pathname: string): Role[] {
  if (pathname === "/dashboard/settings") return ADMIN;
  if (pathname.startsWith("/dashboard/settings/complex")) return OWNER;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/checkin") || pathname.startsWith("/dashboard/calendar")) return VENUE_STAFF;
  for (const p of ["metrics", "tenants", "users", "owners", "invoices", "reports", "audit", "gamification"]) {
    if (pathname.startsWith(`/dashboard/${p}`)) return ADMIN;
  }
  if (pathname.startsWith("/dashboard/report-issue") || pathname.startsWith("/dashboard/profile")) return ANY_DASHBOARD;
  // Resto (feedback, courts, tournaments, academy, finance, staff, billing, marketing): del dueño
  return OWNER;
}

export const canOpen = (pathname: string, r: Role) => allowedRolesFor(pathname).includes(r);

// Adónde mandar a alguien que abrió una ruta que no le corresponde (nunca a la misma ruta: evita bucles)
export function redirectFor(pathname: string, r: Role): string | null {
  if (canOpen(pathname, r)) return null;
  const home = homeFor(r);
  return home === pathname ? "/player" : home;
}
