"use client";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "../context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun01Icon, Moon01Icon, Logout01Icon } from "@hugeicons/core-free-icons";

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Panel General",
  metrics: "Rendimiento Comercial",
  tenants: "Red de Recintos",
  users: "Comunidad de Jugadores",
  analytics: "Analítica de Jugadores",
  owners: "Dueños de Recinto",
  invoices: "Facturación y Cobros",
  reports: "Reportes y Conflictos",
  audit: "Auditoría del Sistema",
  settings: "Configuración Global",
  gamification: "Gamificación y XP",
  calendar: "Agenda de Canchas",
  tournaments: "Torneos y Ligas",
  academy: "Academias Deportivas",
  courts: "Canchas e Instalaciones",
  finance: "Control Financiero",
  staff: "Personal y Staff",
  "billing-subscription": "Mi Suscripción",
  coupons: "Promociones y Cupones",
  complex: "Perfil del Recinto",
  feedback: "Opiniones de Clientes",
  checkin: "Check-in de Accesos",
  profile: "Mi Perfil",
  "report-issue": "Soporte Técnico",
};

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const segment = pathname === "/dashboard" ? "dashboard" : (pathname.split("/").filter(Boolean).pop() || "dashboard");
  const pageTitle = PAGE_LABELS[segment] || segment.replace(/-/g, " ");

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <header className="h-16 w-full sticky top-0 z-30 flex items-center justify-between gap-4 px-4 md:px-8
                       backdrop-blur-xl border-b
                       bg-white/80 border-slate-200
                       dark:bg-[#0B0F19]/80 dark:border-white/5">
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-emerald-500/40 dark:via-[#00df82]/40 to-transparent" />

      {/* LEFT — página actual */}
      <div className="flex items-center gap-3 pl-12 xl:pl-0 min-w-0">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
            MVP Sports Suite
          </p>
          <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate capitalize">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* RIGHT — acciones */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Estado del sistema */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 dark:bg-[#00df82]" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 dark:bg-[#00df82] dark:shadow-[0_0_8px_#00df82]" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-300">
            Sistema online
          </span>
        </div>

        {/* Toggle tema */}
        <button
          onClick={toggleTheme}
          aria-label="Cambiar tema"
          className="p-2.5 rounded-md transition-all active:scale-95 border border-transparent
                     text-slate-500 hover:bg-slate-100 hover:text-amber-500
                     dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-yellow-400 dark:hover:border-white/5 cursor-pointer"
        >
          <HugeiconsIcon icon={theme === "dark" ? Sun01Icon : Moon01Icon} className="w-5 h-5" strokeWidth={1.8} />
        </button>

        {/* Separador */}
        <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-all active:scale-95
                     bg-red-50 text-red-600 hover:bg-red-100 border border-red-100
                     dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 dark:border-red-500/20 cursor-pointer"
        >
          <HugeiconsIcon icon={Logout01Icon} className="w-4 h-4" strokeWidth={1.8} />
          <span className="text-[10px] font-black uppercase tracking-[0.15em] hidden sm:inline">
            Salir
          </span>
        </button>
      </div>
    </header>
  );
}
