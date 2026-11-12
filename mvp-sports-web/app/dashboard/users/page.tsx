"use client";
// Directorio de jugadores (superadmin): buscar, filtrar, ver perfil, suspender o activar (uno o varios), exportar y recalcular niveles.
// Filas, filtros, orden y CSV en utils/playerDirectory; tabla y tarjetas en components/users.
import { useCallback, useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon, BarChartIcon, BlockedIcon, Cancel01Icon, CheckmarkCircle02Icon, Download01Icon, Grid02Icon, ListViewIcon,
  Medal01Icon, Mortarboard01Icon, RefreshIcon, Search01Icon, SparklesIcon, UserGroupIcon, Activity01Icon,
} from "@hugeicons/core-free-icons";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import PageTitle, { Accent } from "@/components/dashboard/PageTitle";
import { useFeedback } from "@/components/ui/Feedback";
import PlayerModal from "@/components/ui/PlayerModal";
import BadgesConfigModal from "@/components/dashboard/BadgesConfigModal";
import { TarjetaKpi } from "@/components/ui/DashboardWidgets";
import { Pagination, PlayerCards, PlayerTable } from "@/components/users/PlayerViews";
import { postApi } from "@/services/client/apiClient";
import { db } from "@/services/client/firebase";
import {
  filterPlayers, playersCsv, sortPlayers, sportsOf, toPlayerRow, type PlayerFilter, type PlayerRow, type SortKey, type TeamRef,
} from "@/utils/playerDirectory";

/* eslint-disable @typescript-eslint/no-explicit-any */
type IconType = typeof Search01Icon;
const Icon = ({ icon, className, w = 1.8 }: { icon: IconType; className?: string; w?: number }) => <HugeiconsIcon icon={icon} className={className} strokeWidth={w} />;
const PAGE_SIZE = 25;
const FILTERS: PlayerFilter[] = ["Todos", "Capitanes", "Sin equipo", "Con strikes", "Suspendidos"];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// PlayerModal espera la forma antigua de la fila
const forModal = (u: PlayerRow) => ({
  ...u, status: u.suspended ? "Suspendido" : "Activo", role: u.captain ? "Capitán" : "Jugador", teamList: u.teams,
  team: u.teams.join(", ") || "Sin equipo", rawJoined: u.joinedAt,
  joined: u.joinedAt ? u.joinedAt.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—",
});

export default function UsersPage() {
  const { toast, confirm } = useFeedback();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [gamification, setGamification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"bulk" | "recompute" | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PlayerFilter>("Todos");
  const [sport, setSport] = useState("Todos");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "ovr", dir: "desc" });
  const [view, setView] = useState<"grid" | "list">("list");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<PlayerRow | null>(null);
  const [badgesOpen, setBadgesOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, teamsSnap, usersSnap] = await Promise.all([getDoc(doc(db, "settings", "global")), getDocs(collection(db, "teams")), getDocs(collection(db, "users"))]);
      const s = settings.data() || {};
      setGamification({ ...(s.gamification || { tiers: { legend: 25000 } }), ...(s.badges ? { badges: s.badges } : {}) });
      const teams: TeamRef[] = teamsSnap.docs.map((d) => ({ name: d.data().name, members: d.data().members || [], ownerId: d.data().ownerId }));
      setPlayers(usersSnap.docs.map((d) => toPlayerRow(d.id, d.data(), teams)).filter((u): u is PlayerRow => !!u));
    } catch (e) {
      console.error("Jugadores", e);
      toast("No se pudieron cargar los jugadores", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- carga inicial

  const filtered = useMemo(() => sortPlayers(filterPlayers(players, { search, filter, sport }), sort.key, sort.dir), [players, search, filter, sport, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const paged = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  // Cambiar búsqueda, filtro u orden vuelve a la primera página
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected((prev) => {
    const ids = paged.map((u) => u.id), all = ids.every((id) => prev.has(id)), n = new Set(prev);
    ids.forEach((id) => (all ? n.delete(id) : n.add(id)));
    return n;
  });
  const onSort = (key: SortKey) => { setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" })); setPage(1); };

  const sel = players.filter((u) => selected.has(u.id));
  const activeSel = sel.filter((u) => !u.suspended), suspendedSel = sel.filter((u) => u.suspended);

  const setStatus = async (targets: PlayerRow[], suspend: boolean) => {
    if (!targets.length) return;
    const one = targets.length === 1 ? targets[0] : null;
    const ok = await confirm({
      title: suspend ? (one ? "¿Suspender jugador?" : `¿Suspender ${targets.length} jugadores?`) : (one ? "¿Activar jugador?" : `¿Activar ${targets.length} jugadores?`),
      message: suspend
        ? (one ? <><strong>{one.name}</strong> no podrá reservar ni entrar a la app hasta que lo reactives.</> : "No podrán reservar ni entrar a la app hasta que los reactives.")
        : (one ? <><strong>{one.name}</strong> recupera el acceso completo a la app.</> : "Recuperan el acceso completo a la app."),
      tone: suspend ? "danger" : "default", confirmLabel: suspend ? "Suspender" : "Activar",
    });
    if (!ok) return;
    setBusy("bulk");
    try {
      const r = await postApi<{ updated?: number; failed?: { error?: string }[] }>("/api/admin/user-status", one ? { uid: one.id, status: suspend ? "suspended" : "active" } : { uids: targets.map((u) => u.id), status: suspend ? "suspended" : "active" });
      const failed = r.failed?.length || 0;
      const done = one ? (failed ? 0 : 1) : (r.updated ?? targets.length - failed);
      if (done) toast(`${plural(done, "jugador", "jugadores")} ${suspend ? (done === 1 ? "suspendido" : "suspendidos") : (done === 1 ? "activado" : "activados")}`);
      if (failed) toast(`${plural(failed, "no se pudo cambiar", "no se pudieron cambiar")}: ${r.failed?.[0]?.error || "error"}`, "error");
      setSelected(new Set());
      setProfile(null);
      await load();
    } catch (e) {
      toast((e as Error)?.message || "No se pudo cambiar el estado", "error");
    } finally {
      setBusy(null);
    }
  };

  const recompute = async () => {
    const ok = await confirm({
      title: "Recalcular niveles",
      message: "Se recalcula la experiencia, el nivel y los logros de todas las cuentas con las reglas vigentes. Solo cuentan los partidos con ingreso registrado por un recinto, así que algunos niveles pueden bajar.",
      confirmLabel: "Recalcular",
    });
    if (!ok) return;
    setBusy("recompute");
    try {
      // Todas las cuentas (dueños y personal también juegan), de a 25
      const ids = (await getDocs(collection(db, "users"))).docs.map((d) => d.id);
      let updated = 0;
      for (let k = 0; k < ids.length; k += 25) updated += (await postApi<{ updated: number }>("/api/players/recompute", { uids: ids.slice(k, k + 25) })).updated || 0;
      toast(`${plural(updated, "cuenta actualizada", "cuentas actualizadas")}`);
      await load();
    } catch (e) {
      toast((e as Error)?.message || "No se pudo recalcular", "error");
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () => {
    if (!filtered.length) { toast("No hay jugadores para exportar", "error"); return; }
    const url = URL.createObjectURL(new Blob([playersCsv(filtered)], { type: "text/csv;charset=utf-8;" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `jugadores_mvp_${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
    toast(`${plural(filtered.length, "jugador exportado", "jugadores exportados")}`);
  };

  const avgOvr = players.length ? Math.round(players.reduce((a, u) => a + u.ovr, 0) / players.length) : 0;
  const seg = "flex items-center gap-1 bg-slate-50 dark:bg-white/5 p-1 rounded-md border border-slate-100 dark:border-white/10";
  const toolBtn = "inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-md text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10";

  return (
    <div className="w-full space-y-6 pb-12 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
        <PageTitle eyebrow="Auditoría de jugadores">Directorio de <Accent>Atletas</Accent></PageTitle>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setBadgesOpen(true)} className="inline-flex items-center gap-2 px-4 h-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-amber-700 dark:text-amber-400 text-[11px] font-black uppercase tracking-wider active:scale-95">
            <Icon icon={Medal01Icon} className="w-4 h-4" w={2} />Configurar insignias
          </button>
          <button onClick={recompute} disabled={!!busy || loading} className="inline-flex items-center gap-2 px-5 h-10 bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-md active:scale-95 disabled:opacity-50">
            <Icon icon={RefreshIcon} className={`w-4 h-4 ${busy === "recompute" ? "animate-spin" : ""}`} w={2} />{busy === "recompute" ? "Recalculando…" : "Recalcular niveles"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <TarjetaKpi titulo="Jugadores" valor={String(players.length)} sub={`${players.filter((u) => u.suspended).length} suspendidos`} icono={<Icon icon={UserGroupIcon} className="w-6 h-6" />} brillo />
        <TarjetaKpi titulo="Capitanes" valor={String(players.filter((u) => u.captain).length)} sub="Líderes de equipo" icono={<Icon icon={Mortarboard01Icon} className="w-6 h-6" />} />
        <TarjetaKpi titulo="OVR promedio" valor={String(avgOvr)} sub="Nivel global" icono={<Icon icon={BarChartIcon} className="w-6 h-6" />} brillo />
        <TarjetaKpi titulo="Agentes libres" valor={String(players.filter((u) => !u.teams.length).length)} sub="Sin equipo" icono={<Icon icon={SparklesIcon} className="w-6 h-6" />} />
      </div>

      <div className="sticky top-16 z-20 flex flex-col xl:flex-row gap-3 xl:items-center justify-between p-3 rounded-md border border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl">
        <div className="relative w-full xl:w-72 shrink-0">
          <Icon icon={Search01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="search" placeholder="Buscar jugador, email o equipo…" aria-label="Buscar jugador" value={search} onChange={(e) => reset(setSearch)(e.target.value)}
            className="w-full pl-10 pr-4 h-10 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-hidden" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`${seg} overflow-x-auto no-scrollbar max-w-full`} role="group" aria-label="Filtro">
            {FILTERS.map((f) => (
              <button key={f} aria-pressed={filter === f} onClick={() => reset(setFilter)(f)}
                className={`px-3 h-8 text-[10px] font-black uppercase rounded-md whitespace-nowrap ${filter === f ? "bg-white dark:bg-[#00df82] text-slate-900 dark:text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}>{f}</button>
            ))}
          </div>
          <div className="relative">
            <Icon icon={Activity01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select value={sport} onChange={(e) => reset(setSport)(e.target.value)} aria-label="Filtrar por deporte"
              className="pl-9 pr-8 h-10 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[12px] font-semibold text-slate-700 dark:text-white outline-hidden appearance-none cursor-pointer">
              {sportsOf(players).map((s) => <option key={s} value={s} className="dark:bg-[#0B0F19]">{s}</option>)}
            </select>
            <Icon icon={ArrowDown01Icon} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" w={2} />
          </div>
          <div className={`${seg} hidden md:flex`}>
            {([["grid", Grid02Icon, "Vista tarjetas"], ["list", ListViewIcon, "Vista tabla"]] as const).map(([v, ic, label]) => (
              <button key={v} onClick={() => setView(v)} aria-label={label} aria-pressed={view === v}
                className={`w-8 h-8 flex items-center justify-center rounded-md ${view === v ? "bg-white dark:bg-[#00df82] text-emerald-600 dark:text-slate-950 shadow-xs" : "text-slate-400"}`}><Icon icon={ic} className="w-4 h-4" /></button>
            ))}
          </div>
          <button onClick={exportCsv} className={toolBtn}><Icon icon={Download01Icon} className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-wider">CSV</span></button>
          <button onClick={load} aria-label="Actualizar" className={`${toolBtn} w-10 px-0`}><Icon icon={RefreshIcon} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {!loading && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-bold text-slate-500">
            <span className="text-slate-900 dark:text-white tabular-nums">{filtered.length}</span> {filtered.length === 1 ? "jugador" : "jugadores"}
            {totalPages > 1 && <> · página {current} de {totalPages}</>}
          </p>
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/25" role="region" aria-label="Acciones con la selección">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-[#00df82]">{plural(selected.size, "seleccionado", "seleccionados")}</span>
              <button onClick={() => setStatus(activeSel, true)} disabled={!activeSel.length || !!busy} className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 disabled:opacity-40">
                <Icon icon={BlockedIcon} className="w-3.5 h-3.5" w={2} />Suspender{activeSel.length ? ` (${activeSel.length})` : ""}
              </button>
              <button onClick={() => setStatus(suspendedSel, false)} disabled={!suspendedSel.length || !!busy} className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-[#00df82] hover:bg-emerald-500/10 disabled:opacity-40">
                <Icon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5" w={2} />Activar{suspendedSel.length ? ` (${suspendedSel.length})` : ""}
              </button>
              <button onClick={() => setSelected(new Set())} aria-label="Limpiar selección" className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white">
                <Icon icon={Cancel01Icon} className="w-3.5 h-3.5" w={2} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="min-h-[300px]">
        {loading && !players.length ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4" role="status">
            <Icon icon={RefreshIcon} className="w-8 h-8 text-emerald-500 animate-spin" w={2} />
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Cargando jugadores…</p>
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Icon icon={UserGroupIcon} className="w-10 h-10 text-slate-300 dark:text-white/15" w={1.5} />
            <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.15em]">{players.length ? "Ningún jugador coincide" : "Aún no hay jugadores"}</p>
            {(search || filter !== "Todos" || sport !== "Todos") && (
              <button onClick={() => { setSearch(""); setFilter("Todos"); setSport("Todos"); setPage(1); }} className="text-[11px] font-black uppercase text-emerald-600 dark:text-[#00df82]">Quitar filtros</button>
            )}
          </div>
        ) : view === "list" ? (
          <>
            <div className="hidden md:block"><PlayerTable rows={paged} selected={selected} onToggle={toggle} onToggleAll={toggleAll} sort={sort} onSort={onSort} onOpen={setProfile} /></div>
            <div className="md:hidden"><PlayerCards rows={paged} selected={selected} onToggle={toggle} onOpen={setProfile} /></div>
          </>
        ) : (
          <PlayerCards rows={paged} selected={selected} onToggle={toggle} onOpen={setProfile} />
        )}
      </div>

      {!loading && <Pagination page={current} total={totalPages} onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}

      <PlayerModal user={profile ? forModal(profile) : null} isOpen={!!profile} onClose={() => setProfile(null)} gamification={gamification}
        initialTab="perfil" onToggleStatus={() => profile && setStatus([profile], !profile.suspended)} />
      <BadgesConfigModal isOpen={badgesOpen} onClose={() => setBadgesOpen(false)} />
    </div>
  );
}
