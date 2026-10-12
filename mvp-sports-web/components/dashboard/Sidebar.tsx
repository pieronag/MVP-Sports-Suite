"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, or } from "firebase/firestore";
import { db } from "@/services/client/firebase";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    MoneyBag01Icon,
    Building01Icon,
    UserGroupIcon,
    Flag01Icon,
    FingerPrintIcon,
    Settings01Icon,
    Calendar03Icon,
    TrophyIcon,
    Mortarboard01Icon,
    Briefcase01Icon,
    CreditCardIcon,
    DiscountTag01Icon,
    SparklesIcon,
    Menu01Icon,
    Cancel01Icon,
    SquareLock01Icon,
    DashboardSquare01Icon,
    ChartIncreaseIcon,
    UserStar01Icon,
    AnalyticsUpIcon,
    Invoice01Icon,
    Message02Icon,
    FootballPitchIcon,
    Store01Icon,
    LifebuoyIcon,
    CalendarCheckIn01Icon,
} from '@hugeicons/core-free-icons';
import BrandLogo from "@/components/shared/BrandLogo";

const ICON = "w-[18px] h-[18px]";

export default function Sidebar() {
    const pathname = usePathname();
    const { role, user, firestoreUser } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeTenant, setActiveTenant] = useState<any>(null);

    useEffect(() => {
        if (!user?.uid || role !== 'owner') return;
        const q = query(collection(db, "tenants"), or(where("ownerId", "==", user.uid), where("ownerIds", "array-contains", user.uid)));
        const unsubscribe = onSnapshot(q, (snap) => {
            if (!snap.empty) setActiveTenant(snap.docs[0].data());
        });
        return () => unsubscribe();
    }, [user, role]);

    const finalName = firestoreUser?.fullName || firestoreUser?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Usuario';
    const finalPhoto = firestoreUser?.photoURL || user?.photoURL;

    useEffect(() => { setMobileOpen(false); }, [pathname]);
    // La barra inferior del celular abre este mismo menú
    useEffect(() => {
        const open = () => setMobileOpen(true);
        window.addEventListener("dashboard:open-menu", open);
        return () => window.removeEventListener("dashboard:open-menu", open);
    }, []);

    useEffect(() => {
        if (mobileOpen) document.body.classList.add('overflow-hidden');
        else document.body.classList.remove('overflow-hidden');
        return () => { document.body.classList.remove('overflow-hidden'); };
    }, [mobileOpen]);

    const roleLabel = (() => {
        switch (role) {
            case 'superadmin': return 'SUPERADMIN';
            case 'admin': return 'ADMIN';
            case 'owner': return 'DUEÑO';
            case 'manager': return 'MANAGER';
            default: return 'USUARIO';
        }
    })();

    const sidebarContent = (
        <>
            {/* HEADER */}
            <div className="relative px-4 py-3.5 border-b border-slate-100 dark:border-white/5 shrink-0 overflow-hidden">
                <div aria-hidden="true" className="hidden dark:block absolute -top-8 left-0 w-20 h-20 bg-[#00df82]/15 blur-2xl rounded-full pointer-events-none" />
                <div className="relative flex items-center justify-between gap-2">
                    <Link href="/dashboard" aria-label="Ir al panel" className="flex items-center">
                        <BrandLogo size={36} wordmarkClassName="text-base" appearance="auto" />
                    </Link>
                    <button
                        onClick={() => setMobileOpen(false)}
                        aria-label="Cerrar menú"
                        className="xl:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} />
                    </button>
                </div>
            </div>

            {/* NAV */}
            <nav className="flex-1 overflow-y-auto px-2.5 py-2 custom-scrollbar">
                {(role === 'admin' || role === 'superadmin') && (
                    <>
                        <MenuGroup title="Principal">
                            <NavItem href="/dashboard" active={pathname === "/dashboard"} icon={DashboardSquare01Icon} onClick={() => setMobileOpen(false)}>Panel General</NavItem>
                            <NavItem href="/dashboard/metrics" active={pathname?.includes("/metrics")} icon={ChartIncreaseIcon} onClick={() => setMobileOpen(false)}>Rendimiento Comercial</NavItem>
                        </MenuGroup>
                        <MenuGroup title="Administración">
                            <NavItem href="/dashboard/owners" active={pathname?.includes("/owners")} icon={UserStar01Icon} onClick={() => setMobileOpen(false)}>Dueños de Recinto</NavItem>
                            <NavItem href="/dashboard/tenants" active={pathname?.includes("/tenants")} icon={Building01Icon} onClick={() => setMobileOpen(false)}>Red de Recintos</NavItem>
                            <NavItem href="/dashboard/users" active={pathname === "/dashboard/users"} icon={UserGroupIcon} onClick={() => setMobileOpen(false)}>Comunidad de Jugadores</NavItem>
                            <NavItem href="/dashboard/users/analytics" active={pathname?.includes("/users/analytics")} icon={AnalyticsUpIcon} onClick={() => setMobileOpen(false)}>Analítica de Jugadores</NavItem>
                            <NavItem href="/dashboard/invoices" active={pathname?.includes("/invoices")} icon={Invoice01Icon} onClick={() => setMobileOpen(false)}>Facturación y Cobros</NavItem>
                        </MenuGroup>
                        <MenuGroup title="Control y auditoría">
                            <NavItem href="/dashboard/reports" active={pathname?.includes("/reports")} icon={Flag01Icon} onClick={() => setMobileOpen(false)}>Reportes y Conflictos</NavItem>
                        </MenuGroup>
                        <MenuGroup title="Sistema">
                            <NavItem href="/dashboard/audit" active={pathname?.includes("/audit")} icon={FingerPrintIcon} onClick={() => setMobileOpen(false)}>Auditoría del Sistema</NavItem>
                            <NavItem href="/dashboard/settings" active={pathname === "/dashboard/settings"} icon={Settings01Icon} onClick={() => setMobileOpen(false)}>Configuración Global</NavItem>
                            <NavItem href="/dashboard/gamification" active={pathname?.includes("/gamification")} icon={SparklesIcon} onClick={() => setMobileOpen(false)}>Gamificación y XP</NavItem>
                        </MenuGroup>
                    </>
                )}
                {role === 'owner' && (
                    <>
                        <MenuGroup title="Principal">
                            <NavItem href="/dashboard" active={pathname === "/dashboard"} icon={DashboardSquare01Icon} onClick={() => setMobileOpen(false)}>Panel General</NavItem>
                            <NavItem href="/dashboard/feedback" active={pathname?.includes("/feedback")} icon={Message02Icon} onClick={() => setMobileOpen(false)}>Opiniones de Clientes</NavItem>
                        </MenuGroup>
                        <MenuGroup title="Operación deportiva">
                            <NavItem href="/dashboard/calendar" active={pathname?.includes("/calendar")} icon={Calendar03Icon} onClick={() => setMobileOpen(false)}>Agenda de Canchas</NavItem>
                            <NavItem href="/dashboard/tournaments" active={pathname?.includes("/tournaments")} icon={TrophyIcon} onClick={() => setMobileOpen(false)}>Torneos y Ligas</NavItem>
                            <NavItem href="/dashboard/academy" active={pathname?.includes("/academy")} icon={Mortarboard01Icon} onClick={() => setMobileOpen(false)}>Academias Deportivas</NavItem>
                            <NavItem href="/dashboard/courts" active={pathname?.includes("/courts")} icon={FootballPitchIcon} onClick={() => setMobileOpen(false)}>Canchas e Instalaciones</NavItem>
                        </MenuGroup>
                        <MenuGroup title="Finanzas y equipo">
                            <NavItem href="/dashboard/finance" active={pathname?.includes("/finance")} icon={MoneyBag01Icon} onClick={() => setMobileOpen(false)} locked={activeTenant && activeTenant.features && activeTenant.features.analytics === false}>Control Financiero</NavItem>
                            <NavItem href="/dashboard/staff" active={pathname?.includes("/staff")} icon={Briefcase01Icon} onClick={() => setMobileOpen(false)}>Personal y Staff</NavItem>
                            <NavItem href="/dashboard/billing-subscription" active={pathname?.includes("/billing-subscription")} icon={CreditCardIcon} onClick={() => setMobileOpen(false)}>Mi Suscripción</NavItem>
                            <NavItem href="/dashboard/marketing/coupons" active={pathname?.includes("/marketing/coupons")} icon={DiscountTag01Icon} onClick={() => setMobileOpen(false)} locked={activeTenant && activeTenant.features && activeTenant.features.marketing === false}>Promociones y Cupones</NavItem>
                        </MenuGroup>
                        <MenuGroup title="Configuración">
                            <NavItem href="/dashboard/settings/complex" active={pathname?.includes("/settings/complex")} icon={Store01Icon} onClick={() => setMobileOpen(false)}>Perfil del Recinto</NavItem>
                        </MenuGroup>
                    </>
                )}
                {role === 'manager' && (
                    <MenuGroup title="Operación diaria">
                        <NavItem href="/dashboard" active={pathname === "/dashboard"} icon={DashboardSquare01Icon} onClick={() => setMobileOpen(false)}>Resumen del Día</NavItem>
                        <NavItem href="/dashboard/calendar" active={pathname?.includes("/calendar")} icon={Calendar03Icon} onClick={() => setMobileOpen(false)}>Agenda de Canchas</NavItem>
                        <NavItem href="/dashboard/checkin" active={pathname?.includes("/checkin")} icon={CalendarCheckIn01Icon} onClick={() => setMobileOpen(false)}>Check-in de Accesos</NavItem>
                    </MenuGroup>
                )}

                <MenuGroup title="Soporte">
                    <NavItem href="/dashboard/report-issue" active={pathname === "/dashboard/report-issue"} icon={LifebuoyIcon} onClick={() => setMobileOpen(false)} locked={role === 'owner' && activeTenant && activeTenant.features && activeTenant.features.support === false}>Soporte Técnico</NavItem>
                </MenuGroup>
            </nav>

            {/* FOOTER (PERFIL) */}
            <div className="p-2.5 border-t border-slate-100 dark:border-white/5 shrink-0">
                <Link href="/dashboard/profile" onClick={() => setMobileOpen(false)}>
                    <div className="relative flex items-center gap-2.5 p-2 rounded-md transition-all cursor-pointer group border border-slate-200/70 dark:border-white/5 bg-slate-50 hover:bg-white hover:border-emerald-300 dark:bg-white/3 dark:hover:bg-white/6 dark:hover:border-[#00df82]/30">
                        <div className="relative shrink-0">
                            {finalPhoto ? (
                                <img
                                    src={finalPhoto}
                                    alt="Avatar"
                                    referrerPolicy="no-referrer"
                                    className="h-[38px] w-[38px] rounded-full object-cover border border-slate-300 dark:border-white/10 block bg-slate-100"
                                    style={{ minWidth: '38px', minHeight: '38px' }}
                                />
                            ) : (
                                <div className="h-[38px] w-[38px] rounded-full flex items-center justify-center text-white text-xs font-bold border shadow-inner bg-slate-700 border-slate-600 dark:bg-linear-to-br dark:from-slate-700 dark:to-slate-900 dark:border-white/10">
                                    {finalName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0B0F19] bg-emerald-500 dark:bg-[#00df82] dark:shadow-[0_0_6px_#00df82]" />
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <p className="text-[13px] font-bold truncate transition-colors text-slate-700 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-[#00df82] capitalize font-heading">
                                {finalName.toLowerCase()}
                            </p>
                            <p className="text-xs md:text-[10px] uppercase tracking-[0.15em] font-black text-slate-400 dark:text-slate-500">
                                {roleLabel}
                            </p>
                        </div>

                        <HugeiconsIcon
                            icon={Settings01Icon}
                            className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:text-slate-500 dark:group-hover:text-[#00df82] transition-colors shrink-0"
                            strokeWidth={1.8}
                        />
                    </div>
                </Link>
            </div>
        </>
    );

    return (
        <>
            {/* MOBILE HAMBURGER */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-3.5 left-4 z-50 xl:hidden p-2 rounded-md bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-lg text-slate-600 dark:text-white active:scale-95 transition-transform cursor-pointer"
                aria-label="Abrir menú"
            >
                <HugeiconsIcon icon={Menu01Icon} className="w-5 h-5" strokeWidth={1.8} />
            </button>

            {/* DESKTOP SIDEBAR */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 z-40 hidden xl:flex flex-col font-sans border-r border-slate-200/70 dark:border-white/5 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-2xl">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/50 dark:via-[#00df82]/50 to-transparent" />
                {sidebarContent}
            </aside>

            {/* MOBILE / TABLET DRAWER */}
            {mobileOpen && (
                <div className="fixed inset-0 z-200 xl:hidden animate-fadeIn">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
                    <aside className="absolute left-0 top-0 bottom-0 w-80 flex flex-col font-sans bg-white dark:bg-[#0B0F19] dark:text-slate-300 shadow-2xl border-r border-slate-200 dark:border-white/5 animate-slideInLeft">
                        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/50 dark:via-[#00df82]/50 to-transparent" />
                        {sidebarContent}
                    </aside>
                </div>
            )}
        </>
    );
}

function MenuGroup({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="mb-0.5">
            <div className="px-2.5 mt-4 mb-1 flex items-center gap-2">
                <span className="text-xs md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 font-heading">{title}</span>
                <span className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
            </div>
            <div className="flex flex-col gap-0.5">{children}</div>
        </div>
    )
}

function NavItem({ children, active, href, icon, onClick, locked }: { children: React.ReactNode, active?: boolean, href: string, icon: any, onClick?: () => void, locked?: boolean }) {
    return (
        <Link
            href={locked ? "/dashboard/billing-subscription" : href}
            onClick={onClick}
            className={`group relative flex items-center gap-3 w-full pl-3.5 pr-3 py-2 text-[13px] font-semibold transition-all duration-200 rounded-md ${
                locked
                ? 'text-slate-400 dark:text-slate-600 opacity-60 hover:bg-slate-50 dark:hover:bg-white/2'
                : active
                ? 'text-emerald-700 dark:text-[#00df82] bg-linear-to-r from-emerald-500/10 to-transparent dark:from-[#00df82]/15 dark:to-transparent'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
            }`}
        >
            {active && !locked && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-emerald-500 dark:bg-[#00df82] dark:shadow-[0_0_8px_#00df82]" />
            )}
            <HugeiconsIcon
                icon={icon}
                className={`${ICON} shrink-0 transition-transform duration-200 group-hover:scale-110 ${active && !locked ? 'dark:drop-shadow-[0_0_6px_rgba(0,223,130,0.6)]' : ''}`}
                strokeWidth={1.8}
            />
            <span className="relative z-10 tracking-tight flex-1 text-left truncate">{children}</span>
            {locked && <HugeiconsIcon icon={SquareLock01Icon} className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={2} />}
        </Link>
    );
}
