"use client";
// Pestaña Staff: equipo con acceso al panel central; elevar a superadmin, degradar o quitar acceso
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, ShieldCheckIcon, ArrowUpRight01Icon, UserCircleIcon, BoltIcon, Delete02Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HeaderSeccion, type AdminUser } from "./ui";

export default function StaffTab({ team, selfUid, busy, onPromote, onDemote, onRemove }: {
    team: AdminUser[];
    selfUid?: string;
    busy: boolean;
    onPromote: (email: string) => Promise<boolean>;
    onDemote: (m: AdminUser) => void;
    onRemove: (m: AdminUser) => void;
}) {
    const [search, setSearch] = useState('');
    const [email, setEmail] = useState('');
    const q = search.trim().toLowerCase();
    const visible = team.filter(a => !q || a.email.toLowerCase().includes(q) || (a.fullName || '').toLowerCase().includes(q));
    const isSelf = (uid: string) => uid === selfUid;

    const promote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (await onPromote(email.trim().toLowerCase())) setEmail('');
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            <HeaderSeccion titulo="Staff directivo" desc="Jerarquía y privilegios de acceso al núcleo administrativo." />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-[10px] font-black uppercase tracking-wider">
                    <span className="text-slate-500 dark:text-slate-300">Total: <span className="text-slate-900 dark:text-white">{team.length}</span></span>
                    <span className="text-slate-500 dark:text-slate-300">Superadmins: <span className="text-indigo-500">{team.filter(a => a.role === 'superadmin').length}</span></span>
                    <span className="text-slate-500 dark:text-slate-300">Admins: <span className="text-emerald-600 dark:text-[#00df82]">{team.filter(a => a.role !== 'superadmin').length}</span></span>
                </div>
                <div className="relative w-full sm:w-64">
                    <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                    <input
                        type="search" aria-label="Buscar en el staff"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nombre o correo..."
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/40 rounded-md text-xs md:text-[10px] font-black outline-hidden text-slate-700 dark:text-white placeholder:text-slate-400"
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form onSubmit={promote} className="rounded-md bg-indigo-600 shadow-xl shadow-indigo-500/10 p-6 h-fit">
                    <div className="flex items-center gap-3 mb-4">
                        <HugeiconsIcon icon={ShieldCheckIcon} className="w-5 h-5 text-white" strokeWidth={1.8} />
                        <h4 className="text-[11px] font-black text-indigo-100 uppercase tracking-widest leading-none font-heading">Elevar privilegios</h4>
                    </div>
                    <div className="space-y-3">
                        <input type="email" required aria-label="Correo del usuario a elevar" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/10 border-none rounded-md px-4 py-3 text-[11px] font-black placeholder-indigo-300 text-white outline-hidden focus:ring-2 ring-white/20" placeholder="email@mvp.cl" />
                        <button type="submit" disabled={busy || !email.trim()} className="w-full py-3 bg-white text-indigo-600 rounded-md text-xs md:text-[10px] font-black uppercase active:scale-95 shadow-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                            Asignar rango <HugeiconsIcon icon={ArrowUpRight01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                    </div>
                </form>
                <div className="lg:col-span-2 space-y-3">
                    {visible.map(a => (
                        <div key={a.uid} className="flex items-center justify-between gap-3 p-4 sm:p-5 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 transition-all">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 shrink-0"><HugeiconsIcon icon={UserCircleIcon} className="w-6 h-6" strokeWidth={1.6} /></div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none mb-1 truncate">{a.fullName || 'Administrador'}{isSelf(a.uid) ? ' (tú)' : ''}</p>
                                    <p className="text-[11px] md:text-[9px] font-bold text-slate-400 font-mono truncate">{a.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                <span className={`px-2.5 py-1 rounded-md text-[11px] md:text-[8px] font-black uppercase tracking-widest ${a.role === 'superadmin' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>{a.role === 'superadmin' ? 'Superadmin' : 'Admin'}</span>
                                {a.role === 'superadmin' && (
                                    <button
                                        onClick={() => onDemote(a)}
                                        disabled={isSelf(a.uid)}
                                        aria-label={`Degradar a ${a.email}`}
                                        title={isSelf(a.uid) ? 'No puedes degradar tu propia cuenta' : 'Degradar a administrador'}
                                        className="p-2 text-slate-400 hover:text-amber-500 transition-colors rounded-md hover:bg-amber-50 dark:hover:bg-amber-500/10 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                                    >
                                        <HugeiconsIcon icon={BoltIcon} className="w-4 h-4" strokeWidth={1.8} />
                                    </button>
                                )}
                                <button
                                    onClick={() => onRemove(a)}
                                    disabled={isSelf(a.uid)}
                                    aria-label={`Quitar acceso a ${a.email}`}
                                    title={isSelf(a.uid) ? 'No puedes quitarte tu propio acceso' : 'Quitar acceso'}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                                >
                                    <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" strokeWidth={1.8} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {visible.length === 0 && (
                        <div className="py-16 text-center">
                            <HugeiconsIcon icon={UserGroupIcon} className="w-10 h-10 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{team.length ? 'Nadie coincide con la búsqueda' : 'Sin staff registrado'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
