"use client";
// Directorio de jugadores: tabla (escritorio), tarjetas y paginación.
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpDownIcon, BlockedIcon, Certificate01Icon, CheckmarkSquare02Icon, CrownIcon, FireIcon, SquareIcon, TrophyIcon, UserCircleIcon, UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { hideBrokenImg } from "@/utils/img";
import { pageWindow, type PlayerRow, type SortKey } from "@/utils/playerDirectory";

/* eslint-disable @next/next/no-img-element */
type IconType = typeof SquareIcon;
const Icon = ({ icon, className, w = 1.8 }: { icon: IconType; className?: string; w?: number }) => <HugeiconsIcon icon={icon} className={className} strokeWidth={w} />;

export function tierClass(tier: string) {
  const t = tier.toUpperCase();
  if (t.includes("ÉLITE") || t.includes("ELITE")) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/20";
  if (t.includes("LEYENDA")) return "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500/20";
  if (t.includes("DIAMANTE")) return "text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-500/20";
  if (t.includes("ORO")) return "text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-500/20";
  if (t.includes("PLATA")) return "text-slate-600 bg-slate-50 dark:bg-slate-500/10 border-slate-500/20";
  return "text-orange-600 bg-orange-50 dark:bg-orange-500/10 border-orange-500/20";
}

function Avatar({ u, size }: { u: PlayerRow; size: string }) {
  return (
    <div className={`${size} rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black text-slate-500 overflow-hidden border border-slate-100 dark:border-white/10 shrink-0`}>
      {u.photoURL ? <img src={u.photoURL} referrerPolicy="no-referrer" onError={hideBrokenImg} className="w-full h-full object-cover" alt="" /> : u.name.charAt(0).toUpperCase()}
    </div>
  );
}

const chip = "px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider";
function Tags({ u }: { u: PlayerRow }) {
  return (
    <>
      {u.captain && <span className={`${chip} bg-amber-500 text-slate-950 inline-flex items-center gap-1`}><Icon icon={CrownIcon} className="w-2.5 h-2.5" w={2.5} />Capitán</span>}
      {u.mainSport && <span className={`${chip} bg-indigo-500/10 text-indigo-600 dark:text-indigo-400`}>{u.mainSport}</span>}
      {u.position && <span className={`${chip} bg-cyan-500/10 text-cyan-700 dark:text-cyan-400`}>{u.position}</span>}
      {u.strikes > 0 && <span className={`${chip} bg-rose-500 text-white inline-flex items-center gap-1`}><Icon icon={BlockedIcon} className="w-2.5 h-2.5" w={2.5} />{u.strikes} {u.strikes === 1 ? "strike" : "strikes"}</span>}
    </>
  );
}

function Status({ u }: { u: PlayerRow }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border w-fit ${u.suspended ? "bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400" : "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-[#00df82]"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${u.suspended ? "bg-red-500" : "bg-emerald-500"}`} />{u.suspended ? "Suspendido" : "Activo"}
    </span>
  );
}

function SortableTh({ label, k, sort, onSort, align = "left" }: { label: string; k: SortKey; sort: { key: SortKey; dir: "asc" | "desc" }; onSort: (k: SortKey) => void; align?: "left" | "center" }) {
  const active = sort.key === k;
  return (
    <th className={`py-4 px-5 ${align === "center" ? "text-center" : "text-left"}`} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button onClick={() => onSort(k)} className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${active ? "text-emerald-600 dark:text-[#00df82]" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"}`}>
        {label}{active && <Icon icon={ArrowUpDownIcon} className="w-3 h-3" w={2} />}
      </button>
    </th>
  );
}

export function PlayerTable({ rows, selected, onToggle, onToggleAll, sort, onSort, onOpen }: {
  rows: PlayerRow[]; selected: Set<string>; onToggle: (id: string) => void; onToggleAll: () => void;
  sort: { key: SortKey; dir: "asc" | "desc" }; onSort: (k: SortKey) => void; onOpen: (u: PlayerRow) => void;
}) {
  const all = rows.length > 0 && rows.every((u) => selected.has(u.id));
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/2">
              <th className="py-4 pl-5 pr-2 w-10">
                <button onClick={onToggleAll} aria-label={all ? "Quitar selección de la página" : "Seleccionar la página"} className="text-slate-400 hover:text-emerald-600">
                  <Icon icon={all ? CheckmarkSquare02Icon : SquareIcon} className="w-4 h-4" />
                </button>
              </th>
              <SortableTh label="Jugador" k="name" sort={sort} onSort={onSort} />
              <SortableTh label="Valoración" k="ovr" sort={sort} onSort={onSort} align="center" />
              <SortableTh label="Partidos" k="played" sort={sort} onSort={onSort} />
              <SortableTh label="Goles / MVP" k="goals" sort={sort} onSort={onSort} />
              <th className="py-4 px-5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Equipos</th>
              <th className="py-4 px-5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="py-4 px-5"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((u) => {
              const on = selected.has(u.id);
              return (
                <tr key={u.id} data-player={u.id} className={on ? "bg-emerald-500/4" : "hover:bg-slate-50/60 dark:hover:bg-white/2"}>
                  <td className="py-4 pl-5 pr-2">
                    <button onClick={() => onToggle(u.id)} aria-label={`Seleccionar ${u.name}`} aria-pressed={on} className={on ? "text-emerald-600 dark:text-[#00df82]" : "text-slate-300 dark:text-slate-600 hover:text-slate-500"}>
                      <Icon icon={on ? CheckmarkSquare02Icon : SquareIcon} className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <Avatar u={u} size="w-10 h-10 text-sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-[12px] text-slate-900 dark:text-white uppercase truncate">{u.name}</span>
                          <Tags u={u} />
                        </div>
                        <span className="text-[11px] text-slate-500 truncate block mt-0.5">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <div className="inline-flex flex-col items-center gap-1">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-black border tabular-nums ${tierClass(u.tier)}`}>{u.ovr} OVR</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{u.tier}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      {u.stats.played} PJ · <span className="text-emerald-600">{u.stats.won} G</span> / <span className="text-red-500">{u.stats.lost} P</span> <span className="text-slate-500">({u.winRate}%)</span>
                    </p>
                    <div className="w-32 h-1 bg-slate-100 dark:bg-white/5 rounded-md overflow-hidden mt-1.5" aria-hidden>
                      <div className="h-full bg-emerald-500" style={{ width: `${u.winRate}%` }} />
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-4 text-[11px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      <span className="flex items-center gap-1.5"><Icon icon={FireIcon} className="w-3.5 h-3.5 text-rose-500" />{u.stats.goals}</span>
                      <span className="flex items-center gap-1.5"><Icon icon={TrophyIcon} className="w-3.5 h-3.5 text-amber-500" />{u.stats.mvp || 0}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {u.teams.length ? u.teams.map((t) => <span key={t} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[10px] font-black rounded-md uppercase">{t}</span>)
                        : <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Libre</span>}
                    </div>
                  </td>
                  <td className="py-4 px-5"><Status u={u} /></td>
                  <td className="py-4 px-5 text-right">
                    <button onClick={() => onOpen(u)} aria-label={`Ver perfil de ${u.name}`} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:text-emerald-600 hover:border-emerald-300 active:scale-95">
                      <Icon icon={UserCircleIcon} className="w-4 h-4" />Perfil
                    </button>
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

export function PlayerCards({ rows, selected, onToggle, onOpen }: { rows: PlayerRow[]; selected: Set<string>; onToggle: (id: string) => void; onOpen: (u: PlayerRow) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((u) => {
        const on = selected.has(u.id);
        return (
          <div key={u.id} data-player={u.id} className={`relative flex flex-col overflow-hidden rounded-md border bg-white dark:bg-slate-900/50 ${on ? "border-emerald-500" : u.suspended ? "border-red-200 dark:border-red-500/20" : "border-slate-200 dark:border-white/5"}`}>
            <div className="p-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="relative shrink-0">
                  <Avatar u={u} size="w-14 h-14 text-lg" />
                  <span className={`absolute -bottom-1 -right-1 min-w-[26px] h-[26px] px-1 rounded-md border-2 border-white dark:border-slate-900 flex items-center justify-center font-black text-[10px] tabular-nums ${tierClass(u.tier)}`}>{u.ovr}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button onClick={() => onToggle(u.id)} aria-label={`Seleccionar ${u.name}`} aria-pressed={on} className={`w-9 h-9 flex items-center justify-center rounded-md ${on ? "text-emerald-600" : "text-slate-300 dark:text-slate-600"}`}>
                    <Icon icon={on ? CheckmarkSquare02Icon : SquareIcon} className="w-5 h-5" />
                  </button>
                  <Status u={u} />
                </div>
              </div>
              <h3 className="mt-3 font-black text-slate-900 dark:text-white text-[15px] uppercase truncate font-heading">{u.name}</h3>
              {u.email && <p className="text-[11px] text-slate-500 truncate">{u.email}</p>}
              <div className="flex flex-wrap items-center gap-1.5 mt-2"><Tags u={u} /></div>
            </div>
            <div className="px-4 pb-3 grid grid-cols-3 gap-1.5">
              {[[u.stats.played, "Partidos"], [`${u.winRate}%`, "Victorias"], [u.stats.goals, "Goles"]].map(([v, l]) => (
                <div key={l} className="px-2 py-2.5 rounded-md bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5 text-center">
                  <span className="block text-[15px] font-black text-slate-900 dark:text-white leading-none tabular-nums">{v}</span>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{l}</span>
                </div>
              ))}
            </div>
            <div className="px-4 pb-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5 min-w-0"><Icon icon={UserGroupIcon} className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{u.teams.length ? u.teams.join(", ") : "Agente libre"}</span></span>
              <span className="inline-flex items-center gap-1 shrink-0"><Icon icon={Certificate01Icon} className="w-3.5 h-3.5 text-amber-500" /><span className="tabular-nums">{u.badges.length}</span></span>
            </div>
            <button onClick={() => onOpen(u)} className="mt-auto border-t border-slate-100 dark:border-white/5 w-full h-12 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-[#00df82]/10">
              <Icon icon={UserCircleIcon} className="w-4 h-4" w={2} /><span className="text-[10px] font-black uppercase tracking-wider">Ver perfil</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  if (total <= 1) return null;
  const btn = "h-10 rounded-md text-[11px] font-black transition-all disabled:opacity-40";
  return (
    <nav aria-label="Páginas" className="flex items-center justify-center gap-1.5 flex-wrap">
      <button onClick={() => onPage(page - 1)} disabled={page === 1} className={`${btn} px-3 border border-slate-200 dark:border-white/10 uppercase tracking-wider text-slate-600 dark:text-slate-300`}>Anterior</button>
      {pageWindow(page, total).map((n, i) => n === null
        ? <span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden>…</span>
        : <button key={n} onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined}
            className={`${btn} w-10 tabular-nums ${n === page ? "bg-[#00df82] text-slate-950" : "border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"}`}>{n}</button>)}
      <button onClick={() => onPage(page + 1)} disabled={page === total} className={`${btn} px-3 border border-slate-200 dark:border-white/10 uppercase tracking-wider text-slate-600 dark:text-slate-300`}>Siguiente</button>
    </nav>
  );
}
