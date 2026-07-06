"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { PlayerProvider, usePlayer } from "@/context/PlayerContext";
import { Home, Calendar, MapPin, User, LogOut, Sun, Moon, Menu, X, Building2, Shield, TrendingUp, GraduationCap, Trophy, CreditCard, ClipboardList, Settings } from "lucide-react";

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

    const isActive = (href: string) => href === '/player' ? pathname === '/player' : pathname.startsWith(href);
    const handleLogout = async () => { await logout(); router.push('/login'); };

    return (
        <div className={`min-h-screen ${isDark ? 'bg-[#020617] text-slate-200' : 'bg-[#F8FAFC] text-slate-900'} transition-colors duration-300`}>
            {mobileOpen && (
                <div className={`lg:hidden fixed inset-0 z-50 ${isDark ? 'bg-[#020617]/95' : 'bg-white/95'} backdrop-blur-md flex flex-col`}>
                    <div className="shrink-0 pt-6 px-4 flex justify-end">
                        <button onClick={() => setMobileOpen(false)} className="p-3"><X size={28} className="text-emerald-500" /></button>
                    </div>
                    <div className="flex-1 px-6 pb-8 overflow-y-auto">
                        {profile && (
                            <div className="flex items-center gap-3 mb-8 p-4 rounded-[14px] bg-emerald-500/5">
                                <div className="w-12 h-12 rounded-[14px] bg-emerald-500/20 flex items-center justify-center overflow-hidden">
                                    {profile.photoURL ? <Image src={profile.photoURL} alt="" width={48} height={48} className="object-cover" /> : <User size={24} className="text-emerald-400" />}
                                </div>
                                <div>
                                    <p className="font-bold text-base">{profile.displayName || 'Jugador'}</p>
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">{profile.tier || 'Bronce'} &bull; {profile.xp || 0} XP</p>
                                </div>
                            </div>
                        )}
                        {tabs.map(tab => (
                            <Link key={tab.href} href={tab.href} onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-4 px-4 py-5 rounded-[14px] mb-3 font-bold text-sm uppercase tracking-wider ${isActive(tab.href) ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
                                <tab.icon size={22} /> {tab.label}
                            </Link>
                        ))}
                        <hr className={`my-4 ${isDark ? 'border-white/5' : 'border-slate-200'}`} />
                        {[
                            { href: '/player/estadisticas', icon: TrendingUp, label: 'Estadisticas' },
                            { href: '/player/clubes', icon: Building2, label: 'Recintos' },
                            { href: '/player/equipos', icon: Shield, label: 'Equipos' },
                            { href: '/player/torneos', icon: Trophy, label: 'Torneos' },
                            { href: '/player/academias', icon: GraduationCap, label: 'Academias' },
                            { href: '/player/billetera', icon: CreditCard, label: 'Pagos' },
                            { href: '/player/reporte', icon: ClipboardList, label: 'Reporte' },
                        ].map(l => (
                            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-4 px-4 py-5 rounded-[14px] mb-2 font-bold text-sm uppercase tracking-wider text-slate-400"><l.icon size={22} /> {l.label}</Link>
                        ))}
                        <hr className={`my-4 ${isDark ? 'border-white/5' : 'border-slate-200'}`} />
                        <Link href="/player/preferencias" onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-4 px-4 py-5 rounded-[14px] mb-3 font-bold text-sm uppercase tracking-wider text-slate-400"><Settings size={22} /> Ajustes</Link>
                        <button onClick={handleLogout}
                            className="flex items-center gap-4 px-4 py-5 rounded-[14px] font-bold text-sm uppercase tracking-wider text-red-400 w-full"><LogOut size={22} /> Cerrar Sesion</button>
                    </div>
                </div>
            )}

            <div className={`hidden lg:flex fixed left-0 top-0 h-full w-72 flex-col ${isDark ? 'bg-[#0F172A] border-r border-white/5' : 'bg-white border-r border-slate-200'} z-30`}>
                <div className="px-6 pt-8 pb-6 border-b border-inherit">
                    <div className="flex items-center justify-between">
                        <div><span className="text-emerald-500 font-bold text-lg tracking-tight">MVP</span><span className="text-slate-400 font-bold text-lg tracking-tight ml-1">PLAYER</span></div>
                        <button onClick={toggleTheme} className={`p-2.5 rounded-[14px] ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                            {isDark ? <Sun size={18} className="text-emerald-400" /> : <Moon size={18} className="text-emerald-500" />}
                        </button>
                    </div>
                    {profile && (
                        <div className="flex items-center gap-3 mt-6">
                            <div className="w-10 h-10 rounded-[14px] bg-emerald-500/20 flex items-center justify-center overflow-hidden">
                                {profile.photoURL ? <Image src={profile.photoURL} alt="" width={40} height={40} className="object-cover" /> : <User size={20} className="text-emerald-400" />}
                            </div>
                            <div>
                                <p className="font-bold text-sm truncate max-w-[160px]">{profile.displayName || 'Jugador'}</p>
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Nivel {profile.tier || 'Bronce'}</p>
                            </div>
                        </div>
                    )}
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {tabs.map(tab => (
                        <Link key={tab.href} href={tab.href}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-[14px] font-bold text-xs uppercase tracking-wider transition-all ${isActive(tab.href) ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100')}`}>
                            <tab.icon size={18} /> {tab.label}
                        </Link>
                    ))}
                    <hr className={`my-3 ${isDark ? 'border-white/5' : 'border-slate-200'}`} />
                    {[
                        { href: '/player/estadisticas', icon: TrendingUp, label: 'Estadisticas' },
                        { href: '/player/clubes', icon: Building2, label: 'Recintos' },
                        { href: '/player/equipos', icon: Shield, label: 'Equipos' },
                        { href: '/player/torneos', icon: Trophy, label: 'Torneos' },
                        { href: '/player/academias', icon: GraduationCap, label: 'Academias' },
                        { href: '/player/billetera', icon: CreditCard, label: 'Pagos' },
                        { href: '/player/reporte', icon: ClipboardList, label: 'Reporte' },
                    ].map(l => {
                        const a = isActive(l.href);
                        return (
                            <Link key={l.href} href={l.href}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-[14px] font-bold text-xs uppercase tracking-wider transition-all ${a ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100')}`}>
                                <l.icon size={18} /> {l.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-inherit">
                    <button onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3.5 rounded-[14px] font-bold text-xs uppercase tracking-wider text-red-400 hover:bg-red-500/5 transition-all"><LogOut size={18} /> Cerrar Sesion</button>
                </div>
            </div>

            <div className="lg:pl-72">
                <main className="pb-4">{children}</main>
            </div>


        </div>
    );
}

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [showSplash, setShowSplash] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    useEffect(() => { setMounted(true); const t = setTimeout(() => setShowSplash(false), 1000); return () => clearTimeout(t); }, []);

    if (loading || showSplash) {
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
                    <p className="text-emerald-400 font-semibold text-[10px] uppercase tracking-[0.4em] mt-8 animate-pulse">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <PlayerProvider>
            <PlayerShell>{children}</PlayerShell>
        </PlayerProvider>
    );
}
