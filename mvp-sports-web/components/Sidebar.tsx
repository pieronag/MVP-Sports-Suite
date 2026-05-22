"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { LockClosedIcon } from "@heroicons/react/24/solid";
// --- ICONOS HEROICONS ---
import {
    ChartPieIcon,
    CurrencyDollarIcon,
    BuildingOfficeIcon,
    UserGroupIcon,
    UsersIcon,
    FlagIcon,
    FingerPrintIcon,
    Cog6ToothIcon,
    HomeModernIcon,
    MegaphoneIcon,
    CalendarDaysIcon,
    TrophyIcon,
    AcademicCapIcon,
    MapIcon,
    BriefcaseIcon,
    CreditCardIcon,
    TagIcon,
    AdjustmentsVerticalIcon,
    ClipboardDocumentCheckIcon,
    DocumentTextIcon,
    SparklesIcon,
    Bars3Icon,
    XMarkIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export default function Sidebar() {
    const pathname = usePathname();
    const { role, user, firestoreUser } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeTenant, setActiveTenant] = useState<any>(null);

    // Cargar recintos para validar plan y características
    useEffect(() => {
        if (!user?.uid || role !== 'owner') return;
        const q = query(collection(db, "tenants"), where("ownerId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snap) => {
            if (!snap.empty) {
                setActiveTenant(snap.docs[0].data());
            }
        });
        return () => unsubscribe();
    }, [user, role]);

    const finalName = firestoreUser?.fullName || firestoreUser?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Usuario';
    const finalPhoto = firestoreUser?.photoURL || user?.photoURL;

    // Close on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const getRoleLabel = () => {
        switch (role) {
            case 'superadmin': return 'SUPERADMIN';
            case 'admin': return 'SUPERADMIN';
            case 'owner': return 'DUEÑO';
            case 'manager': return 'MANAGER';
            default: return 'USUARIO';
        }
    };

    const sidebarContent = (
        <>
            {/* 1. HEADER - Más compacto */}
            <div className="w-full h-16 flex items-center justify-between px-6 border-b transition-colors duration-0 border-slate-100 dark:border-white/5 shrink-0">
                <div className="flex items-center">
                    <div className="hidden dark:block absolute top-1/2 left-8 -translate-y-1/2 w-12 h-12 bg-green-500/10 blur-[24px] rounded-full pointer-events-none"></div>
                    <div className="relative w-12 h-12 mr-3 flex-shrink-0">
                        <Image
                            src="/Logo.png"
                            alt="Logo"
                            fill
                            sizes="48px"
                            className="object-contain filter brightness-0 opacity-80 dark:filter-none dark:opacity-100"
                        />
                    </div>
                    <div>
                        <h2 className="text-lg font-black tracking-wide leading-none text-slate-900 dark:text-white uppercase">
                            MVP <span className="text-emerald-600 dark:text-[#4ADE80]">Sports</span>
                        </h2>
                    </div>
                </div>
                {/* Close button on mobile/iPad */}
                <button
                    onClick={() => setMobileOpen(false)}
                    className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>

            {/* 2. NAVEGACIÓN - Espaciado compacto */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5 custom-scrollbar">
                {(role === 'admin' || role === 'superadmin') && (
                    <>
                        <MenuGroup title="General">
                            <NavItem href="/dashboard" active={pathname === "/dashboard"} icon={<ChartPieIcon />} onClick={() => setMobileOpen(false)}>Panel de Control</NavItem>
                            <NavItem href="/dashboard/metrics" active={pathname?.includes("/metrics")} icon={<CurrencyDollarIcon />} onClick={() => setMobileOpen(false)}>Rendimiento Comercial</NavItem>
                        </MenuGroup>
                        <MenuGroup title="Administración Central">
                            <NavItem href="/dashboard/tenants" active={pathname?.includes("/tenants")} icon={<BuildingOfficeIcon />} onClick={() => setMobileOpen(false)}>Red de Recintos</NavItem>
                            <NavItem href="/dashboard/users" active={pathname === "/dashboard/users"} icon={<UserGroupIcon />} onClick={() => setMobileOpen(false)}>Ecosistema Jugadores</NavItem>
                            <NavItem href="/dashboard/users/analytics" active={pathname?.includes("/users/analytics")} icon={<ChartPieIcon />} onClick={() => setMobileOpen(false)}>Analítica de Desempeño</NavItem>
                            <NavItem href="/dashboard/owners" active={pathname?.includes("/owners")} icon={<UsersIcon />} onClick={() => setMobileOpen(false)}>Directores de Recinto</NavItem>
                            <NavItem href="/dashboard/invoices" active={pathname?.includes("/invoices")} icon={<DocumentTextIcon />} onClick={() => setMobileOpen(false)}>Facturación y Cobranza</NavItem>
                        </MenuGroup>
                        <MenuGroup title="Auditoría & Servicio">
                            <NavItem href="/dashboard/reports" active={pathname?.includes("/reports")} icon={<FlagIcon />} onClick={() => setMobileOpen(false)}>
                                Resolución de Conflictos
                            </NavItem>
                        </MenuGroup>
                        <MenuGroup title="Núcleo Tecnológico">
                            <NavItem href="/dashboard/audit" active={pathname?.includes("/audit")} icon={<FingerPrintIcon />} onClick={() => setMobileOpen(false)}>Bitácora de Sistema</NavItem>
                            <NavItem href="/dashboard/settings" active={pathname === "/dashboard/settings"} icon={<Cog6ToothIcon />} onClick={() => setMobileOpen(false)}>Parámetros Globales</NavItem>
                            <NavItem href="/dashboard/gamification" active={pathname?.includes("/gamification")} icon={<SparklesIcon />} onClick={() => setMobileOpen(false)}>Economía del Jugador</NavItem>
                        </MenuGroup>
                    </>
                )}
                {role === 'owner' && (
                    <>
                        <MenuGroup title="Centro de Operaciones">
                            <NavItem href="/dashboard" active={pathname === "/dashboard"} icon={<HomeModernIcon />} onClick={() => setMobileOpen(false)}>Panel Ejecutivo</NavItem>
                            <NavItem href="/dashboard/feedback" active={pathname?.includes("/feedback")} icon={<MegaphoneIcon />} onClick={() => setMobileOpen(false)}>Feedback de Clientes</NavItem>
                        </MenuGroup>
                        <MenuGroup title="Gestión Deportiva">
                            <NavItem href="/dashboard/calendar" active={pathname?.includes("/calendar")} icon={<CalendarDaysIcon />} onClick={() => setMobileOpen(false)}>Agenda Inteligente</NavItem>
                            <NavItem href="/dashboard/championships" active={pathname?.includes("/championships")} icon={<TrophyIcon />} onClick={() => setMobileOpen(false)}>Ligas y Torneos</NavItem>
                            <NavItem href="/dashboard/academy" active={pathname?.includes("/academy")} icon={<AcademicCapIcon />} onClick={() => setMobileOpen(false)}>Academias Deportivas</NavItem>
                            <NavItem href="/dashboard/courts" active={pathname?.includes("/courts")} icon={<MapIcon />} onClick={() => setMobileOpen(false)}>Infraestructura</NavItem>
                        </MenuGroup>
                        <MenuGroup title="Recursos y Finanzas">
                            <NavItem href="/dashboard/finance" active={pathname?.includes("/finance")} icon={<CurrencyDollarIcon />} onClick={() => setMobileOpen(false)}>Control Financiero</NavItem>
                            <NavItem href="/dashboard/staff" active={pathname?.includes("/staff")} icon={<BriefcaseIcon />} onClick={() => setMobileOpen(false)}>Operadores de Staff</NavItem>
                            <NavItem href="/dashboard/billing-subscription" active={pathname?.includes("/billing-subscription")} icon={<CreditCardIcon />} onClick={() => setMobileOpen(false)}>Licencia MVP Sports</NavItem>
                            <NavItem href="/dashboard/marketing/coupons" active={pathname?.includes("/marketing/coupons")} icon={<TagIcon />} onClick={() => setMobileOpen(false)} locked={activeTenant && activeTenant.features && activeTenant.features.marketing === false}>Marketing y Cupones</NavItem>
                        </MenuGroup>
                        <MenuGroup title="Configuración de Sede">
                            <NavItem href="/dashboard/settings/complex" active={pathname?.includes("/settings/complex")} icon={<AdjustmentsVerticalIcon />} onClick={() => setMobileOpen(false)}>Perfil Comercial</NavItem>
                            <NavItem href="/dashboard/audit" active={pathname?.includes("/audit")} icon={<FingerPrintIcon />} onClick={() => setMobileOpen(false)}>Bitácora de Sistema</NavItem>
                        </MenuGroup>

                    </>
                )}
                {role === 'manager' && (
                    <>
                        <MenuGroup title="Ejecución Diaria">
                            <NavItem href="/dashboard" active={pathname === "/dashboard"} icon={<HomeModernIcon />} onClick={() => setMobileOpen(false)}>Resumen de Reserva</NavItem>
                            <NavItem href="/dashboard/calendar" active={pathname?.includes("/calendar")} icon={<CalendarDaysIcon />} onClick={() => setMobileOpen(false)}>Control de Canchas</NavItem>
                            <NavItem href="/dashboard/checkin" active={pathname?.includes("/checkin")} icon={<ClipboardDocumentCheckIcon />} onClick={() => setMobileOpen(false)}>Validación de Accesos</NavItem>
                        </MenuGroup>
                        <MenuGroup title="Seguridad">
                            <NavItem href="/dashboard/audit" active={pathname?.includes("/audit")} icon={<FingerPrintIcon />} onClick={() => setMobileOpen(false)}>Bitácora de Sistema</NavItem>
                        </MenuGroup>
                    </>
                )}

                <MenuGroup title="Soporte">
                    <NavItem href="/dashboard/report-issue" active={pathname === "/dashboard/report-issue"} icon={<ExclamationCircleIcon />} onClick={() => setMobileOpen(false)}>
                        Reportar un Problema
                    </NavItem>
                </MenuGroup>

            </nav>

            {/* 3. FOOTER (PERFIL) */}
            <div className="p-4 border-t transition-colors duration-0 border-slate-200 dark:border-white/5 shrink-0">
                <Link href="/dashboard/profile" onClick={() => setMobileOpen(false)}>
                    <div className="flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer group border bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10">
                        {/* AVATAR */}
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
                                <div className="h-[38px] w-[38px] rounded-full flex items-center justify-center text-white text-xs font-bold border shadow-inner bg-slate-700 border-slate-600 dark:bg-gradient-to-br dark:from-slate-700 dark:to-slate-900 dark:border-white/10">
                                    {finalName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0B0F19] bg-emerald-500 dark:bg-[#4ADE80] dark:shadow-[0_0_6px_#4ADE80]"></span>
                        </div>

                        {/* INFO USUARIO */}
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold truncate transition-colors text-slate-700 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-[#4ADE80] capitalize">
                                {finalName.toLowerCase()}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                                {getRoleLabel()}
                            </p>
                        </div>

                        <Cog6ToothIcon className="w-5 h-5 transition-colors text-slate-400 group-hover:text-emerald-600 dark:text-slate-500 dark:group-hover:text-white" />
                    </div>
                </Link>
            </div>
        </>
    );

    return (
        <>
            {/* MOBILE HAMBURGER BUTTON — visible up to XL (Mobile & Tablet) */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-3.5 left-4 z-50 xl:hidden p-2.5 rounded-xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 shadow-lg text-slate-600 dark:text-white active:scale-95 transition-transform"
                aria-label="Abrir menú"
            >
                <Bars3Icon className="w-6 h-6" />
            </button>

            {/* DESKTOP SIDEBAR — permanent only on xl+ */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 z-40 hidden xl:flex flex-col border-r font-sans shadow-2xl transition-colors duration-0 bg-white border-slate-200 text-slate-600 dark:bg-[#0B0F19] dark:border-white/5 dark:text-slate-300">
                {sidebarContent}
            </aside>

            {/* MOBILE/IPAD SIDEBAR OVERLAY — drawer from left (XL hidden) */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[200] xl:hidden animate-fadeIn">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    {/* Drawer */}
                    <aside className="absolute left-0 top-0 bottom-0 w-80 flex flex-col font-sans bg-white dark:bg-[#0B0F19] dark:text-slate-300 shadow-2xl border-r border-slate-200 dark:border-white/5 animate-slideInLeft">
                        {sidebarContent}
                    </aside>
                </div>
            )}
        </>
    );
}

function MenuGroup({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="mb-2">
            <h3 className="px-3 text-[10px] font-semibold uppercase tracking-widest mb-1 text-slate-400 dark:text-slate-600">{title}</h3>
            <div className="flex flex-col space-y-1">{children}</div>
        </div>
    )
}

function NavItem({ children, active, href, icon, onClick, locked }: { children: React.ReactNode, active?: boolean, href: string, icon: React.ReactNode, onClick?: () => void, locked?: boolean }) {
    return (
        <Link 
            href={locked ? "/dashboard/billing-subscription" : href} 
            onClick={onClick} 
            className={`relative flex items-center gap-2.5 w-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 group rounded-xl ${
                locked 
                ? 'text-slate-400 dark:text-slate-600 opacity-60 hover:bg-slate-50 dark:hover:bg-white/[0.02]' 
                : active 
                ? 'text-emerald-700 bg-emerald-50 dark:bg-transparent dark:text-[#4ADE80]' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
            }`}
        >
            {active && !locked && <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-emerald-600 dark:bg-[#4ADE80] dark:shadow-[0_0_10px_#4ADE80]" />}
            {active && !locked && <div className="hidden dark:block absolute inset-0 bg-gradient-to-r from-[#4ADE80]/10 to-transparent pointer-events-none rounded-xl" />}
            <span className={`w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${active && !locked ? 'dark:drop-shadow-[0_0_6px_rgba(74,222,128,0.6)]' : ''}`}>{icon}</span>
            <span className="relative z-10 tracking-tight flex-1 text-left">{children}</span>
            {locked && <span className="text-amber-500 shrink-0"><LockClosedIcon className="w-3.5 h-3.5" /></span>}
        </Link>
    );
}
