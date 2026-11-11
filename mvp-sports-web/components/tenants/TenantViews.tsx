"use client";
// Red de recintos: tarjeta (vista cuadrícula) y tabla (vista listado)
import { HugeiconsIcon } from "@hugeicons/react";
import { MapPinIcon, StarIcon, UserGroupIcon, Clock01Icon, CheckmarkCircle02Icon, Alert02Icon, PencilEdit02Icon, BlockedIcon, Delete02Icon, Building01Icon, UserCircleIcon } from "@hugeicons/core-free-icons";
import { hideBrokenImg } from "@/utils/img";
import { isTenantActive, type TenantRow } from "@/services/client/data/tenantDirectory";

export const formatCLP = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n || 0);

/** Lo que la pantalla resuelve con los planes vigentes */
export interface TenantMoney { mrr: number; debt: number; planStyle: string }

function StatusBadge({ status }: { status: string }) {
    const on = isTenantActive(status);
    return (
        <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] md:text-[9px] font-black uppercase tracking-wider border ${on ? "bg-emerald-500/10 text-emerald-700 dark:text-[#00df82] border-emerald-500/25" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-red-500"}`} />
            {on ? "Activo" : status === "Suspendido" ? "Suspendido" : "Inactivo"}
        </span>
    );
}

export function TenantCard({ t, money, onEdit, onToggle, onDelete, onOpen }: {
    t: TenantRow; money: TenantMoney;
    onEdit: () => void; onToggle: () => void; onDelete: () => void; onOpen: () => void;
}) {
    const active = isTenantActive(t.status);
    const owed = money.debt > 0;
    return (
        <div data-tenant={t.id} className={`group relative flex overflow-hidden rounded-md border bg-white dark:bg-slate-900/50 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-black/40 ${active ? "border-slate-200 dark:border-white/5 hover:border-emerald-300 dark:hover:border-[#00df82]/30" : "border-red-200 dark:border-red-500/20"}`}>
            <button onClick={onOpen} aria-label={`Ver perfil de ${t.name}`} className="relative w-28 sm:w-36 shrink-0 overflow-hidden bg-slate-800 cursor-pointer">
                {t.imageUrl && <img src={t.imageUrl} referrerPolicy="no-referrer" onError={hideBrokenImg} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />}
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-black/40" />
                <span className={`absolute top-2.5 left-2.5 max-w-[calc(100%-1.25rem)] truncate px-2 py-0.5 rounded-md text-[11px] md:text-[9px] font-black uppercase tracking-wider border backdrop-blur-sm shadow-xs ${money.planStyle}`}>{t.plan || "Sin plan"}</span>
                {t.rating > 0 && (
                    <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-sm border border-white/15">
                        <HugeiconsIcon icon={StarIcon} className="w-3 h-3 text-amber-400" strokeWidth={2} />
                        <span className="text-xs md:text-[10px] font-black text-white font-mono">{t.rating.toFixed(1)}</span>
                    </span>
                )}
            </button>

            <div className="flex-1 min-w-0 flex flex-col">
                <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="font-black text-slate-900 dark:text-white text-[15px] uppercase leading-tight truncate font-heading">{t.name}</h3>
                            <p className="text-xs md:text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mt-1 truncate">
                                <HugeiconsIcon icon={MapPinIcon} className="w-3 h-3 text-emerald-500 shrink-0" strokeWidth={2} />
                                {t.commune || "—"}, {t.region || "—"}
                            </p>
                        </div>
                        <StatusBadge status={t.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-3 min-w-0">
                        <div className="flex -space-x-1.5 shrink-0">
                            {t.owners.slice(0, 3).map((on, idx) => (
                                <span key={idx} className="w-6 h-6 rounded-full bg-emerald-500/15 border-2 border-white dark:border-slate-900 text-emerald-700 dark:text-[#00df82] flex items-center justify-center text-[11px] md:text-[9px] font-black uppercase">{on.charAt(0)}</span>
                            ))}
                            {t.owners.length === 0 && (
                                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/5 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                    <HugeiconsIcon icon={UserGroupIcon} className="w-3 h-3 text-slate-400" strokeWidth={1.8} />
                                </span>
                            )}
                        </div>
                        <span className="text-xs md:text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {t.owners.length ? (t.owners.length > 1 ? `${t.owners[0]} +${t.owners.length - 1}` : t.owners[0]) : "Sin dueños"}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 px-4 pb-3">
                    {[["Canchas", t.infra.courts], ["Staff", t.infra.staff]].map(([label, v]) => (
                        <div key={label} className="px-2 py-2 bg-slate-50 dark:bg-white/5 rounded-md border border-slate-100 dark:border-white/10 text-center">
                            <span className="block text-sm font-black text-slate-900 dark:text-white leading-none font-mono">{v}</span>
                            <span className="block text-[11px] md:text-[8px] font-bold text-slate-400 uppercase mt-1">{label}</span>
                        </div>
                    ))}
                    <div className={`px-2 py-2 rounded-md border text-center min-w-0 ${owed ? "bg-amber-500/10 border-amber-500/25" : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10"}`}>
                        <span className={`block text-sm font-black leading-none font-mono truncate ${owed ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>{formatCLP(money.debt)}</span>
                        <span className={`block text-[11px] md:text-[8px] font-bold uppercase mt-1 ${owed ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>Deuda</span>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-4 pb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs md:text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                        <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.8} />
                        {t.infra.scheduleSummary}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] md:text-[9px] font-black uppercase tracking-wider shrink-0 ${t.coordinates.lat ? "text-emerald-600 dark:text-[#00df82]" : "text-amber-500"}`}>
                        <HugeiconsIcon icon={t.coordinates.lat ? CheckmarkCircle02Icon : Alert02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                        {t.coordinates.lat ? "Geo" : "Sin geo"}
                    </span>
                </div>

                <div className="mt-auto p-2.5 bg-slate-50 dark:bg-white/2 border-t border-slate-100 dark:border-white/5 flex gap-1.5">
                    <button onClick={onEdit} aria-label={`Editar ${t.name}`} className="flex-1 py-2 px-2 flex items-center justify-center gap-1.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 dark:hover:text-[#00df82] dark:hover:border-[#00df82]/30 transition-all active:scale-95 cursor-pointer">
                        <HugeiconsIcon icon={PencilEdit02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                        <span className="text-[11px] md:text-[9px] font-black uppercase tracking-wider hidden sm:inline">Editar</span>
                    </button>
                    <button onClick={onToggle} aria-label={active ? `Suspender ${t.name}` : `Activar ${t.name}`} className={`flex-1 py-2 px-2 flex items-center justify-center gap-1.5 rounded-md border bg-white dark:bg-white/5 transition-all active:scale-95 cursor-pointer ${active ? "border-amber-200 dark:border-amber-500/20 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10" : "border-emerald-200 dark:border-emerald-500/20 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"}`}>
                        <HugeiconsIcon icon={active ? BlockedIcon : CheckmarkCircle02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                        <span className="text-[11px] md:text-[9px] font-black uppercase tracking-wider hidden sm:inline">{active ? "Suspender" : "Activar"}</span>
                    </button>
                    <button onClick={onDelete} aria-label={`Eliminar ${t.name}`} className="py-2 px-3 flex items-center justify-center rounded-md border border-red-200 dark:border-red-500/20 bg-white dark:bg-white/5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer">
                        <HugeiconsIcon icon={Delete02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                </div>
            </div>
        </div>
    );
}

const th = "py-4 px-6 text-xs md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider";

export function TenantTable({ rows, moneyOf, onOpen }: { rows: TenantRow[]; moneyOf: (t: TenantRow) => TenantMoney; onOpen: (t: TenantRow) => void }) {
    return (
        <div className="overflow-hidden rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[820px]">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/2">
                            <th className={th}>Recinto</th>
                            <th className={th}>Plan</th>
                            <th className={`${th} text-center`}>Canchas</th>
                            <th className={`${th} text-center`}>Staff</th>
                            <th className={`${th} text-center`}>Rating</th>
                            <th className={`${th} text-right`}>MRR</th>
                            <th className={`${th} text-right`}>Por cobrar</th>
                            <th className={th}>Estado</th>
                            <th className={`${th} text-right`}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {rows.map((t) => {
                            const m = moneyOf(t);
                            return (
                                <tr key={t.id} data-tenant={t.id} className="hover:bg-slate-50/60 dark:hover:bg-white/2 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-100 dark:border-white/10 shrink-0 flex items-center justify-center">
                                                {t.imageUrl ? <img src={t.imageUrl} referrerPolicy="no-referrer" onError={hideBrokenImg} alt="" className="w-full h-full object-cover" /> : <HugeiconsIcon icon={Building01Icon} className="w-5 h-5 text-slate-300 dark:text-white/15" strokeWidth={1.6} />}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="font-black text-[13px] text-slate-900 dark:text-white uppercase truncate block font-heading">{t.name}</span>
                                                <span className="text-xs md:text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                                                    <HugeiconsIcon icon={MapPinIcon} className="w-3 h-3 shrink-0" strokeWidth={2} />
                                                    {t.commune || "—"}, {t.region || "—"}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2.5 py-1 rounded-md text-xs md:text-[10px] font-black uppercase tracking-wider ${m.planStyle.replace(/border-\S+/g, "").trim()}`}>{t.plan || "Sin plan"}</span>
                                    </td>
                                    <td className="py-4 px-6 text-center font-mono text-[12px] font-black text-slate-900 dark:text-white">{t.infra.courts}</td>
                                    <td className="py-4 px-6 text-center font-mono text-[12px] font-black text-slate-900 dark:text-white">{t.infra.staff}</td>
                                    <td className="py-4 px-6 text-center">
                                        {t.rating > 0 ? (
                                            <span className="inline-flex items-center gap-1">
                                                <HugeiconsIcon icon={StarIcon} className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
                                                <span className="font-mono text-[12px] font-black text-slate-900 dark:text-white">{t.rating.toFixed(1)}</span>
                                            </span>
                                        ) : <span className="text-[11px] text-slate-400">—</span>}
                                    </td>
                                    <td className="py-4 px-6 text-right font-mono text-[12px] font-black text-slate-900 dark:text-white">{formatCLP(m.mrr)}</td>
                                    <td className="py-4 px-6 text-right">
                                        {m.debt > 0 ? <span className="font-mono text-[12px] font-black text-amber-600 dark:text-amber-400">{formatCLP(m.debt)}</span> : <span className="text-[11px] text-slate-400">—</span>}
                                    </td>
                                    <td className="py-4 px-6"><StatusBadge status={t.status} /></td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end">
                                            <button onClick={() => onOpen(t)} aria-label={`Ver perfil de ${t.name}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs md:text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-emerald-600 dark:hover:text-[#00df82] hover:border-emerald-300 dark:hover:border-[#00df82]/30 hover:bg-emerald-50 dark:hover:bg-[#00df82]/10 transition-all active:scale-95 cursor-pointer">
                                                <HugeiconsIcon icon={UserCircleIcon} className="w-3.5 h-3.5" strokeWidth={1.8} />
                                                Perfil
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
