"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { PlayerProvider, usePlayer } from "@/context/PlayerContext";
import PwaSupport from "@/components/player/PwaSupport";
import BrandLogo from "@/components/BrandLogo";
import VerifyEmailGate, { needsEmailVerification } from "@/components/player/VerifyEmailGate";
import { Home, Calendar, MapPin, User, LogOut, Sun, Moon, Menu, X, Building2, Shield, TrendingUp, GraduationCap, Trophy, CreditCard, ClipboardList, Settings } from "@/components/player/icons";

// Ítem de menú con el estilo del dashboard (barra verde a la izquierda cuando está activo)
function PlayerNavItem({ href, icon: Icon, active, isDark, children }: { href: string; icon: any; active: boolean; isDark: boolean; children: React.ReactNode }) {
    return (
        <Link href={href} aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-3.5 w-full min-h-[48px] pl-4 pr-3 py-3 text-[15px] font-semibold rounded-md transition-all ${active
                ? (isDark ? 'text-[#00df82] bg-gradient-to-r from-[#00df82]/15 to-transparent' : 'text-emerald-700 bg-gradient-to-r from-emerald-500/10 to-transparent')
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')}`}>
            {active && <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full ${isDark ? 'bg-[#00df82]' : 'bg-emerald-500'}`} />}
            <Icon size={22} />
            <span className="tracking-tight truncate">{children}</span>
        </Link>
    );
}

function PlayerShell({ children }: { children: React.ReactNode }) {
    const { profile, theme, toggleTheme } = usePlayer();
    const { logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);
    const isDark = theme === 'dark';

    const tabs = [
        { href: '/player', label: 'Inicio', icon: Home },
        { href: '/player/reservas', label: 'Reservas', icon: Calendar },
        { href: '/player/mapa', label: 'Mapa', icon: MapPin },
        { href: '/player/perfil', label: 'Perfil', icon: User },
    ];

    // Pantallas con acción fija abajo (pagar, escribir): sin barra inferior
    const hideBottomNav = ['/player/checkout', '/player/equipos/chat', '/player/equipos/partidos/chat'].some(p => pathname.startsWith(p));
    const secondaryLinks = [
        { href: '/player/estadisticas', icon: TrendingUp, label: 'Estadísticas' },
        { href: '/player/clubes', icon: Building2, label: 'Recintos' },
        { href: '/player/equipos', icon: Shield, label: 'Equipos' },
        { href: '/player/torneos', icon: Trophy, label: 'Torneos' },
        { href: '/player/academias', icon: GraduationCap, label: 'Academias' },
        { href: '/player/billetera', icon: CreditCard, label: 'Pagos' },
        { href: '/player/reporte', icon: ClipboardList, label: 'Soporte' },
    ];

    const isActive = (href: string) => href === '/player' ? pathname === '/player' : pathname.startsWith(href);
    const handleLogout = async () => { await logout(); router.push('/login'); };

    return (
        // PWA siempre en formato celular: ancho estándar de móvil (430 px) centrado y alto completo.
        // El marco exterior no hace scroll y su transform contiene los elementos 'fixed'
        // (barra inferior, modales, botón de pago), que así quedan pegados a sus bordes.
        <div className={`min-h-[100dvh] ${isDark ? 'bg-[#01040A]' : 'bg-slate-200'}`}>
        <div className={`player-shell relative mx-auto w-full max-w-[430px] h-[100dvh] overflow-hidden [transform:translateZ(0)] ${isDark ? 'bg-[#020611] text-slate-200' : 'bg-[#F8FAFC] text-slate-900'} transition-colors duration-300`}>
        <div className="h-full overflow-y-auto overflow-x-hidden no-scrollbar">
            {mobileOpen && (
                <div className={` fixed inset-0 z-50 flex flex-col ${isDark ? 'bg-[#0A101D] text-slate-300' : 'bg-white text-slate-700'}`}>
                    <div className={`shrink-0 px-4 py-3.5 border-b flex items-center justify-between ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                        <BrandLogo size={34} wordmarkClassName="text-base" appearance={isDark ? "onDark" : "onLight"} />
                        <div className="flex items-center gap-1">
                            <button aria-label="Cambiar tema" onClick={toggleTheme} className="p-2.5 rounded-md text-slate-400">{isDark ? <Sun size={22} /> : <Moon size={22} />}</button>
                            <button aria-label="Cerrar" onClick={() => setMobileOpen(false)} className="p-2.5 rounded-md text-slate-400"><X size={24} /></button>
                        </div>
                    </div>
                    <nav className="flex-1 overflow-y-auto px-2.5 py-3" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setMobileOpen(false); }}>
                        {profile && (
                            <Link href="/player/perfil" className={`flex items-center gap-3 p-3 mb-3 rounded-md border ${isDark ? 'border-white/5 bg-white/[0.03]' : 'border-slate-200/70 bg-slate-50'}`}>
                                <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center overflow-hidden shrink-0">
                                    {profile.photoURL ? <Image src={profile.photoURL} alt="" width={48} height={48} className="object-cover w-full h-full" /> : <User size={18} className="text-emerald-500" />}
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-base font-bold truncate font-heading ${isDark ? 'text-white' : 'text-slate-700'}`}>{profile.displayName || (profile as any).fullName || 'Jugador'}</p>
                                    <p className="text-xs uppercase tracking-[0.12em] font-black text-slate-400">{profile.tier || 'Bronce'} · {profile.xp || 0} XP</p>
                                </div>
                            </Link>
                        )}
                        <p className="px-4 pt-2 pb-2 text-xs font-black uppercase tracking-[0.15em] text-slate-400">Jugar</p>
                        {tabs.map(tab => <PlayerNavItem key={tab.href} href={tab.href} icon={tab.icon} active={isActive(tab.href)} isDark={isDark}>{tab.label}</PlayerNavItem>)}
                        <p className="px-4 pt-5 pb-2 text-xs font-black uppercase tracking-[0.15em] text-slate-400">Comunidad</p>
                        {secondaryLinks.map(l => <PlayerNavItem key={l.href} href={l.href} icon={l.icon} active={isActive(l.href)} isDark={isDark}>{l.label}</PlayerNavItem>)}
                        <PlayerNavItem href="/player/preferencias" icon={Settings} active={isActive('/player/preferencias')} isDark={isDark}>Ajustes</PlayerNavItem>
                    </nav>
                    <div className={`p-2.5 border-t pb-[calc(0.625rem+env(safe-area-inset-bottom))] ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                        <button onClick={handleLogout} className="flex items-center gap-3.5 w-full min-h-[48px] pl-4 pr-3 py-3 rounded-md text-[15px] font-semibold text-red-500 hover:bg-red-500/5"><LogOut size={22} /> Cerrar sesión</button>
                    </div>
                </div>
            )}

            <div>
                <main className={hideBottomNav ? "pb-4" : "pb-[calc(84px+env(safe-area-inset-bottom))]"}>{children}</main>
            </div>

        </div>
            {/* Barra inferior móvil (navegación tipo app instalada) */}
            {!hideBottomNav && <nav className={` fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-md pb-[env(safe-area-inset-bottom)] ${isDark ? 'bg-[#020611]/95 border-white/5' : 'bg-white/95 border-slate-200'}`}>
                <div className="grid grid-cols-5 h-16">
                    {tabs.map(tab => {
                        const a = isActive(tab.href);
                        return (
                            <Link key={tab.href} href={tab.href} aria-current={a ? 'page' : undefined}
                                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider ${a ? (isDark ? 'text-[#00df82]' : 'text-emerald-600') : 'text-slate-400'}`}>
                                <tab.icon size={20} /> {tab.label}
                            </Link>
                        );
                    })}
                    <button onClick={() => setMobileOpen(true)} aria-label="Abrir menú"
                        className="flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <Menu size={20} /> Más
                    </button>
                </div>
            </nav>}

            <PwaSupport />
        </div>
        </div>
    );
}

export default function PlayerLayoutClient({ children }: { children: React.ReactNode }) {
    const { user, loading, role } = useAuth();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [, setVerifiedTick] = useState(0);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    // Sin espera artificial: el splash solo cubre la carga real de la sesión
    useEffect(() => { setMounted(true); }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center overflow-hidden relative">
                {/* Glow Mesh */}
                <div className="absolute inset-0 glow-mesh opacity-30" />
                {/* Floating Particles */}
                <div className="absolute inset-0 pointer-events-none">
                    {mounted && [...Array(10)].map((_, i) => (
                        <div key={i} className={`particle animate-particle-${(i % 5) + 1}`}
                            style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 10}s`, opacity: Math.random() * 0.5 }}
                        />
                    ))}
                </div>
                {/* Logo + Rings */}
                <div className="relative flex flex-col items-center">
                    <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/30 to-blue-500/10 rounded-full blur-[80px] animate-pulse" />
                        <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-[spin_8s_linear_infinite]" />
                        <div className="absolute inset-4 border border-emerald-500/10 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
                        <div className="absolute inset-[30%] bg-emerald-500/30 rounded-full blur-2xl animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-900/80 backdrop-blur-3xl border border-white/20 flex items-center justify-center overflow-hidden">
                                <Image src="/Logo.png" alt="MVP" width={80} height={80} className="w-full h-full object-cover object-center scale-[1.1] animate-pulse" />
                            </div>
                        </div>
                    </div>
                    <p className="text-emerald-400 font-semibold text-[12px] uppercase tracking-[0.4em] mt-8 animate-pulse">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    // Jugadores con contraseña deben verificar su correo antes de usar la app
    if (needsEmailVerification(user, role)) {
        return <VerifyEmailGate user={user} onVerified={() => setVerifiedTick((t) => t + 1)} />;
    }

    return (
        <PlayerProvider>
            <PlayerShell>{children}</PlayerShell>
        </PlayerProvider>
    );
}
