"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

const ADMIN_ROLES = ["admin", "superadmin"];
const OWNER_ROLES = ["owner", "admin", "superadmin"];
const MANAGER_ROLES = ["manager", "owner", "admin", "superadmin"];
const ALL_ROLES = ["player", "staff", "manager", "owner", "admin", "superadmin"];

function getAllowedRoles(pathname: string): string[] | null {
  if (pathname === "/dashboard/settings") return ADMIN_ROLES;
  if (pathname.startsWith("/dashboard/settings/complex")) return OWNER_ROLES;

  if (pathname === "/dashboard" ) return MANAGER_ROLES;
  if (pathname.startsWith("/dashboard/checkin")) return MANAGER_ROLES;
  if (pathname.startsWith("/dashboard/calendar")) return MANAGER_ROLES;

  if (pathname.startsWith("/dashboard/metrics")) return ADMIN_ROLES;
  if (pathname.startsWith("/dashboard/tenants")) return ADMIN_ROLES;
  if (pathname.startsWith("/dashboard/users")) return ADMIN_ROLES;
  if (pathname.startsWith("/dashboard/owners")) return ADMIN_ROLES;
  if (pathname.startsWith("/dashboard/invoices")) return ADMIN_ROLES;
  if (pathname.startsWith("/dashboard/reports")) return ADMIN_ROLES;
  if (pathname.startsWith("/dashboard/audit")) return ADMIN_ROLES;
  if (pathname.startsWith("/dashboard/gamification")) return ADMIN_ROLES;

  if (pathname.startsWith("/dashboard/report-issue")) return ALL_ROLES;
  if (pathname.startsWith("/dashboard/profile")) return ALL_ROLES;

  // Resto del dashboard (páginas de owner: feedback, courts, tournaments,
  // academy, finance, staff, billing-subscription, marketing, manual-booking)
  if (pathname.startsWith("/dashboard")) return OWNER_ROLES;

  return null;
}

export default function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    // Sin rol administrativo asignado: enviar a la experiencia de jugador.
    if (!role) {
      router.replace("/player");
      return;
    }
    const allowed = getAllowedRoles(pathname);
    if (allowed && !allowed.includes(role)) {
      router.replace("/dashboard");
    }
  }, [user, role, loading, pathname, router]);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-2">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <span className="text-xs font-bold uppercase tracking-widest">CARGANDO MVP SPORTS SUITE...</span>
      </div>
    );
  }

  if (!user) return null;

  if (!role) return null;

  const allowed = getAllowedRoles(pathname);
  if (allowed && !allowed.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
