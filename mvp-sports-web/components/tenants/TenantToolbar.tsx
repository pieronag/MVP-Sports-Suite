"use client";
// Red de recintos: búsqueda, filtros por región, comuna y estado, vista y orden
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, GlobeIcon, MapPinIcon, ArrowDown01Icon, Grid02Icon, ListViewIcon, RefreshIcon } from "@hugeicons/core-free-icons";

export type StatusFilter = "Todos" | "Inactivos";
export type SortBy = "name" | "mrr" | "rating";
export interface TenantFilters { search: string; region: string; commune: string; status: StatusFilter; view: "grid" | "list"; sort: SortBy }

const selectCls = "py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-md text-[12px] font-semibold text-slate-700 dark:text-white outline-hidden transition-all cursor-pointer appearance-none disabled:opacity-50";
const optCls = "bg-white text-slate-900 dark:bg-[#0B0F19] dark:text-white";
const segBtn = (on: boolean) => `transition-all cursor-pointer rounded-md ${on ? "bg-white dark:bg-[#00df82] text-emerald-600 dark:text-slate-950 shadow-xs" : "text-slate-400 hover:text-slate-700 dark:hover:text-white"}`;

export default function TenantToolbar({ f, set, regions, communes, loading, onRefresh }: {
    f: TenantFilters;
    set: (patch: Partial<TenantFilters>) => void;
    regions: string[];
    communes: string[];
    loading: boolean;
    onRefresh: () => void;
}) {
    return (
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center justify-between p-3 rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
            <div className="relative w-full xl:w-72 shrink-0">
                <HugeiconsIcon icon={Search01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                <input
                    type="search" aria-label="Buscar recinto o dueño"
                    placeholder="Buscar recinto o dueño…"
                    value={f.search}
                    onChange={(e) => set({ search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-hidden transition-all"
                />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <HugeiconsIcon icon={GlobeIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" strokeWidth={1.8} />
                    <select value={f.region} onChange={(e) => set({ region: e.target.value, commune: "Todas" })} aria-label="Filtrar por región" className={`${selectCls} pl-9 pr-8 max-w-[200px]`}>
                        <option value="Todas" className={optCls}>Todas las regiones</option>
                        {regions.map((r) => <option key={r} value={r} className={optCls}>{r}</option>)}
                    </select>
                    <HugeiconsIcon icon={ArrowDown01Icon} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" strokeWidth={2} />
                </div>

                <div className="relative">
                    <HugeiconsIcon icon={MapPinIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" strokeWidth={1.8} />
                    <select value={f.commune} onChange={(e) => set({ commune: e.target.value })} aria-label="Filtrar por comuna" disabled={communes.length === 0} className={`${selectCls} pl-9 pr-8 max-w-[180px]`}>
                        <option value="Todas" className={optCls}>Todas las comunas</option>
                        {communes.map((c) => <option key={c} value={c} className={optCls}>{c}</option>)}
                    </select>
                    <HugeiconsIcon icon={ArrowDown01Icon} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" strokeWidth={2} />
                </div>

                <div role="group" aria-label="Estado" className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 p-1 rounded-md border border-slate-100 dark:border-white/10">
                    {(["Todos", "Inactivos"] as const).map((s) => (
                        <button key={s} aria-pressed={f.status === s} onClick={() => set({ status: s })} className={`px-4 py-1.5 text-xs md:text-[10px] font-black uppercase whitespace-nowrap ${segBtn(f.status === s)}`}>{s}</button>
                    ))}
                </div>

                <div role="group" aria-label="Vista" className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 p-1 rounded-md border border-slate-100 dark:border-white/10">
                    <button onClick={() => set({ view: "grid" })} aria-pressed={f.view === "grid"} aria-label="Vista cuadrícula" className={`p-2 ${segBtn(f.view === "grid")}`}>
                        <HugeiconsIcon icon={Grid02Icon} className="w-4 h-4" strokeWidth={1.8} />
                    </button>
                    <button onClick={() => set({ view: "list" })} aria-pressed={f.view === "list"} aria-label="Vista listado" className={`p-2 ${segBtn(f.view === "list")}`}>
                        <HugeiconsIcon icon={ListViewIcon} className="w-4 h-4" strokeWidth={1.8} />
                    </button>
                </div>

                <div className="relative">
                    <select value={f.sort} onChange={(e) => set({ sort: e.target.value as SortBy })} aria-label="Ordenar recintos" className={`${selectCls} pl-3 pr-8`}>
                        <option value="name" className={optCls}>Nombre (A-Z)</option>
                        <option value="mrr" className={optCls}>Mayor MRR</option>
                        <option value="rating" className={optCls}>Mejor rating</option>
                    </select>
                    <HugeiconsIcon icon={ArrowDown01Icon} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" strokeWidth={2} />
                </div>

                <button onClick={onRefresh} aria-label="Refrescar" className="p-2.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer border border-slate-200 dark:border-white/10">
                    <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.8} />
                </button>
            </div>
        </div>
    );
}
