"use client";
// Barra inferior del panel en celular: las secciones de uso diario de cada rol al alcance del pulgar.
// El resto sigue en el menú lateral, que se abre desde "Menú".
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    DashboardSquare01Icon,
    Calendar03Icon,
    CalendarCheckIn01Icon,
    MoneyBag01Icon,
    FootballPitchIcon,
    Building01Icon,
    UserGroupIcon,
    Invoice01Icon,
    LifebuoyIcon,
    Menu01Icon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole } from "@/utils/roles";

type Item = { href: string; label: string; icon: typeof Menu01Icon; exact?: boolean };

const ITEMS: Record<"owner" | "manager" | "admin", Item[]> = {
    owner: [
        { href: "/dashboard", label: "Panel", icon: DashboardSquare01Icon, exact: true },
        { href: "/dashboard/calendar", label: "Agenda", icon: Calendar03Icon },
        { href: "/dashboard/finance", label: "Finanzas", icon: MoneyBag01Icon },
        { href: "/dashboard/courts", label: "Canchas", icon: FootballPitchIcon },
    ],
    manager: [
        { href: "/dashboard", label: "Hoy", icon: DashboardSquare01Icon, exact: true },
        { href: "/dashboard/checkin", label: "Check-in", icon: CalendarCheckIn01Icon },
        { href: "/dashboard/calendar", label: "Agenda", icon: Calendar03Icon },
        { href: "/dashboard/report-issue", label: "Soporte", icon: LifebuoyIcon },
    ],
    admin: [
        { href: "/dashboard", label: "Panel", icon: DashboardSquare01Icon, exact: true },
        { href: "/dashboard/tenants", label: "Recintos", icon: Building01Icon },
        { href: "/dashboard/users", label: "Jugadores", icon: UserGroupIcon, exact: true },
        { href: "/dashboard/invoices", label: "Cobros", icon: Invoice01Icon },
    ],
};

export default function MobileTabBar() {
    const pathname = usePathname() || "";
    const { role } = useAuth();
    const r = normalizeRole(role);
    const items = r === "owner" ? ITEMS.owner : r === "manager" ? ITEMS.manager : r === "admin" || r === "superadmin" ? ITEMS.admin : null;
    if (!items) return null;

    const isActive = (it: Item) => (it.exact ? pathname === it.href : pathname.startsWith(it.href));

    return (
        <nav
            aria-label="Navegación principal"
            className="xl:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#050B14]/95 backdrop-blur-md"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
            <ul className="grid grid-cols-5 max-w-lg mx-auto">
                {items.map((it) => {
                    const active = isActive(it);
                    return (
                        <li key={it.href}>
                            <Link
                                href={it.href}
                                aria-current={active ? "page" : undefined}
                                className={`flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-semibold transition-colors ${active ? "text-emerald-600 dark:text-[#00df82]" : "text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white"}`}
                            >
                                <span className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${active ? "bg-emerald-500/12 dark:bg-[#00df82]/12" : ""}`}>
                                    <HugeiconsIcon icon={it.icon} className="w-5 h-5" strokeWidth={active ? 2 : 1.6} />
                                </span>
                                {it.label}
                            </Link>
                        </li>
                    );
                })}
                <li>
                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event("dashboard:open-menu"))}
                        className="w-full flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-semibold text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white"
                    >
                        <span className="flex items-center justify-center w-12 h-7 rounded-full">
                            <HugeiconsIcon icon={Menu01Icon} className="w-5 h-5" strokeWidth={1.6} />
                        </span>
                        Menú
                    </button>
                </li>
            </ul>
        </nav>
    );
}
