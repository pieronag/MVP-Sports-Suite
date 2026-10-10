"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon, BlockedIcon, CheckmarkCircle02Icon, TrophyIcon,
  UserGroupIcon, RefreshIcon, UserCircleIcon,
  SparklesIcon, BarChartIcon, Clock01Icon,
  FireIcon, Mortarboard01Icon, Alert02Icon, Grid02Icon, ListViewIcon,
  Certificate01Icon, UserMultipleIcon,
  ArrowDown01Icon, Medal01Icon, Activity01Icon, CrownIcon,
  Download01Icon, SquareIcon, CheckmarkSquare02Icon, ArrowUpDownIcon, Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { collection, getDocs, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import PlayerModal from '@/components/ui/PlayerModal';
import { TarjetaKpi } from '@/components/ui/DashboardWidgets';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import BadgesConfigModal from '@/components/dashboard/BadgesConfigModal';
import { postApi } from "@/services/client/apiClient";

// --- INTERFACES ---
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  ovr: number;
  xp: number;
  tier: string;
  form: string[];
  stats: { 
    played: number; won: number; lost: number; goals: number;
    assists?: number; clean_sheets?: number; mvp?: number;
    captain_matches?: number; precision_matches?: number;
    clutch_goals?: number; interceptions?: number;
    minutes_played?: number; sports_played?: number;
    comebacks?: number; tournaments_played?: number;
    longest_win_streak?: number; rivalries_won?: number;
    morning_matches?: number; night_matches?: number;
    weekend_matches?: number; invited_players?: number;
  };
  photoURL?: string;
  team: string;
  teamList: string[];
  joined: string;
  rawJoined: Date | null;
  winRate: number;
  goalsPerMatch: number;
  badges: any[];
  strikes?: number;
  mainSport?: string;
  position?: string;
  raw?: any;
}

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

const normalizeBadgeId = (id: string): string => {
  const normMap: Record<string, string> = {
    goals: 'scorer',
    assists: 'playmaker',
    clean_sheets: 'defender',
    won: 'wins',
    played: 'experience',
    sports_played: 'multi_sport',
    loyalty: 'loyal'
  };
  return normMap[id] || id;
};

export default function Page() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [gamificationConfig, setGamificationConfig] = useState<any>(null);

  const [filter, setFilter] = useState('Todos');
  const [sportFilter, setSportFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [playerTab, setPlayerTab] = useState<'perfil' | 'historial' | 'logros'>('perfil');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<'ovr' | 'name' | 'played' | 'winRate' | 'goals' | 'joined'>('ovr');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    msg: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  }>({ isOpen: false, title: '', msg: '', onConfirm: () => { }, type: 'info' });

  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);

  const addToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ msg, type: type === 'info' ? 'success' : type as any });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      let gamification = settingsSnap.exists() ? settingsSnap.data().gamification : { tiers: { legend: 25000 } };
      if (settingsSnap.exists()) {
        const rootBadges = settingsSnap.data().badges;
        if (rootBadges) {
          gamification = { ...gamification, badges: rootBadges };
        }
      }
      setGamificationConfig(gamification);
      const maxXP = gamification?.tiers?.legend || 25000;

      const teamsSnap = await getDocs(collection(db, "teams"));
      const allTeams = teamsSnap.docs.map(d => ({
        id: d.id, name: d.data().name, members: d.data().members || [], ownerId: d.data().ownerId
      }));

      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);

      const loadedUsers: User[] = querySnapshot.docs.reduce((acc: User[], doc) => {
        try {
          const data = doc.data();
          const userId = doc.id;
          const rawRole = (data.role || '').toLowerCase();
          
          // Excluir roles administrativos
          if (['admin', 'owner', 'manager', 'gestor', 'dueño'].includes(rawRole)) return acc;

          const userTeamsRaw = allTeams.filter(t => t.ownerId === userId || (Array.isArray(t.members) && t.members.includes(userId)));
          const userTeams = userTeamsRaw.map(t => t.name);
          const isCaptain = allTeams.some(t => t.ownerId === userId);

          const realOvr = Number(data.ovr || data.elo || 0);
          const xp = Number(data.xp || 0);
          let realTier = String(data.tier || data.level || 'Bronce').toUpperCase();

          const stats = data.stats || { played: 0, won: 0, lost: 0, goals: 0 };
          const played = Number(stats.played || 0);
          const won = Number(stats.won || 0);
          const lost = Number(stats.lost || (played - won > 0 ? played - won : 0));
          const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
          const goalsPerMatch = played > 0 ? Number((Number(stats.goals || 0) / played).toFixed(2)) : 0;

          // Manejo robusto de fechas (sin inventar "hoy" si no existe el dato)
          let rawJoined: Date | null = null;
          const dateCandidates: any[] = [data.createdAt, data.joinedDate, data.created_at, data.registeredAt];
          for (const c of dateCandidates) {
            if (!c) continue;
            let d: Date;
            if (c instanceof Date) d = c;
            else if (typeof c?.toDate === 'function') d = c.toDate();
            else if (typeof c?.seconds === 'number') d = new Date(c.seconds * 1000);
            else d = new Date(c);
            if (!isNaN(d.getTime())) { rawJoined = d; break; }
          }

          const daysActive = rawJoined
            ? Math.max(1, (new Date().getTime() - rawJoined.getTime()) / (1000 * 60 * 60 * 24))
            : 1;

          const earnedBadges: any[] = [];
          const settingsData = settingsSnap.exists() ? settingsSnap.data() || {} : {};
          const gamificationData = settingsData.gamification || {};
          const badgeConfigs = gamificationData.badges || settingsData.badges || {};
          const statsMap: Record<string, number> = {
            scorer: data.stats?.goals || 0,
            goals: data.stats?.goals || 0,
            
            playmaker: data.stats?.assists || 0,
            assists: data.stats?.assists || 0,
            
            defender: data.stats?.clean_sheets || data.stats?.interceptions || 0,
            clean_sheets: data.stats?.clean_sheets || data.stats?.interceptions || 0,
            
            wins: data.stats?.won || 0,
            won: data.stats?.won || 0,
            
            mvp: data.stats?.mvp || data.stats?.mvps || 0,
            mvps: data.stats?.mvp || data.stats?.mvps || 0,
            
            experience: data.stats?.played || 0,
            played: data.stats?.played || 0,
            
            multi_sport: data.stats?.sports_played || 1,
            sports_played: data.stats?.sports_played || 1,
            
            captaincy: data.stats?.captain_matches || 0,
            captain_matches: data.stats?.captain_matches || 0,
            
            comeback: data.stats?.comebacks || 0,
            comebacks: data.stats?.comebacks || 0,
            
            precision: data.stats?.precision_matches || 0,
            precision_matches: data.stats?.precision_matches || 0,
            
            clutch: data.stats?.clutch_goals || 0,
            clutch_goals: data.stats?.clutch_goals || 0,
            
            tournaments: data.stats?.tournaments_played || 0,
            tournaments_played: data.stats?.tournaments_played || 0,
            
            invictus: data.stats?.longest_win_streak || 0,
            longest_win_streak: data.stats?.longest_win_streak || 0,
            
            rivalry: data.stats?.rivalries_won || 0,
            rivalries_won: data.stats?.rivalries_won || 0,
            
            morning_player: data.stats?.morning_matches || 0,
            morning_matches: data.stats?.morning_matches || 0,
            
            night_player: data.stats?.night_matches || 0,
            night_matches: data.stats?.night_matches || 0,
            
            loyal: Math.floor(daysActive / 30),
            loyalty: Math.floor(daysActive / 30),
            
            weekend_warrior: data.stats?.weekend_matches || 0,
            weekend_matches: data.stats?.weekend_matches || 0,
            
            stamina: data.stats?.minutes_played || (data.stats?.played || 0) * 60,
            minutes_played: data.stats?.minutes_played || (data.stats?.played || 0) * 60,
            
            social: data.stats?.invited_players || 0,
            invited_players: data.stats?.invited_players || 0
          };

          Object.keys(badgeConfigs).forEach(badgeId => {
            const config = badgeConfigs[badgeId] || { bronze: 5, silver: 15, gold: 30 };
            const userVal = statsMap[badgeId] || 0;
            let tier = null;

            const goldVal = Number(config.gold || 0);
            const silverVal = Number(config.silver || 0);
            const bronzeVal = Number(config.bronze || 0);

            if (userVal > 0) {
              if (goldVal > 0 && userVal >= goldVal) tier = 'gold';
              else if (silverVal > 0 && userVal >= silverVal) tier = 'silver';
              else if (bronzeVal > 0 && userVal >= bronzeVal) tier = 'bronze';
            }
            if (tier) {
              const normId = normalizeBadgeId(badgeId);
              if (!earnedBadges.some(b => b.id === normId)) {
                earnedBadges.push({ id: normId, tier });
              }
            }
          });

          acc.push({
            id: userId, name: data.displayName || data.name || "Usuario Sin Nombre",
            email: data.email || "",
            role: isCaptain ? 'Capitán' : 'Jugador',
            status: data.status === 'suspended' ? 'Suspendido' : 'Activo',
            ovr: isNaN(realOvr) ? 0 : realOvr,
            xp: isNaN(xp) ? 0 : xp,
            photoURL: data.photoURL || data.imageUrl || "",
            tier: realTier, form: data.form || [], stats,
            team: userTeams.length > 0 ? userTeams.join(', ') : "Sin Equipo",
            teamList: userTeams,
            joined: rawJoined ? rawJoined.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—',
            rawJoined,
            winRate,
            goalsPerMatch,
            badges: earnedBadges,
            strikes: data.strikes || 0,
            mainSport: data.mainSport || "",
            position: data.position && data.position !== 'Jugador' ? data.position : "",
            raw: data
          });
        } catch (innerError) {
          console.error("Error procesando usuario indvidual:", doc.id, innerError);
        }
        return acc;
      }, []);

      setUsers(loadedUsers.sort((a, b) => b.ovr - a.ovr));
    } catch (error) { 
      console.error("Error al cargar jugadores:", error);
      addToast("Error al cargar jugadores. Revisa la consola.", "error"); 
    } finally { 
      setLoading(false); 
    }
  };


  useEffect(() => { fetchUsers(); }, []);

  const toggleUserStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Activo' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, "users", id), { status: newStatus });
      addToast(`Jugador ${newStatus === 'active' ? 'habilitado' : 'suspendido'}`, "success");
      fetchUsers();
    } catch (error) { addToast("Error al cambiar estado", "error"); }
  };

  const handleToggleStatus = async () => {
    if (!userToToggle) return;
    setIsToggling(true);
    await toggleUserStatus(userToToggle.id, userToToggle.status);
    setIsToggling(false);
    setUserToToggle(null);
  };

  const handleBulkRecalculate = async () => {
    setConfirmModal({
      isOpen: true, title: 'Sincronizar ELO', type: 'info',
      msg: '¿Quieres actualizar el nivel y valoración de todos los jugadores según el algoritmo oficial?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsBulkLoading(true);
        try {
          // El servidor recalcula XP, nivel y logros desde las reservas de cada jugador
          const ids = users.map((u) => u.id);
          for (let k = 0; k < ids.length; k += 25) {
            await postApi('/api/players/recompute', { uids: ids.slice(k, k + 25) });
          }
          addToast("Sincronización masiva completada", "success");
          fetchUsers();
        } catch (error) { addToast("Error en sincronización", "error"); } finally { setIsBulkLoading(false); }
      }
    });
  };

  const filteredUsers = useMemo(() => {
    const list = users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === 'Suspendidos' && u.status !== 'Suspendido') return false;
      if (filter === 'Capitanes' && u.role !== 'Capitán') return false;
      if (filter === 'Sin equipo' && u.teamList.length > 0) return false;
      if (sportFilter !== 'Todos' && u.mainSport !== sportFilter) return false;

      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name) * dir;
        case 'played': return ((a.stats.played || 0) - (b.stats.played || 0)) * dir;
        case 'winRate': return (a.winRate - b.winRate) * dir;
        case 'goals': return ((a.stats.goals || 0) - (b.stats.goals || 0)) * dir;
        case 'joined': return ((a.rawJoined?.getTime() || 0) - (b.rawJoined?.getTime() || 0)) * dir;
        default: return (a.ovr - b.ovr) * dir;
      }
    });
  }, [users, searchTerm, filter, sportFilter, sortKey, sortDir]);

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [searchTerm, filter, sportFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = useMemo(
    () => filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredUsers, safePage]
  );

  const openPlayer = (user: any, tab: 'perfil' | 'historial' | 'logros') => {
    setSelectedUser(user);
    setPlayerTab(tab);
    setIsPlayerModalOpen(true);
  };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const handleBulkStatus = async (suspend: boolean) => {
    const targetStatus = suspend ? 'Activo' : 'Suspendido';
    const ids = users.filter(u => selectedIds.has(u.id) && u.status === targetStatus).map(u => u.id);
    if (ids.length === 0) {
      addToast(suspend ? "No hay jugadores activos seleccionados" : "No hay jugadores suspendidos seleccionados", 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: suspend ? 'Suspender seleccionados' : 'Activar seleccionados',
      msg: `Se ${suspend ? 'suspenderán' : 'activarán'} ${ids.length} jugador${ids.length === 1 ? '' : 'es'}.`,
      type: suspend ? 'danger' : 'info',
      onConfirm: async () => {
        setConfirmModal(p => ({ ...p, isOpen: false }));
        setIsBulkLoading(true);
        try {
          await Promise.all(ids.map(id => updateDoc(doc(db, "users", id), { status: suspend ? 'suspended' : 'active' })));
          addToast(`${ids.length} jugador${ids.length === 1 ? '' : 'es'} ${suspend ? 'suspendido(s)' : 'activado(s)'}`, 'success');
          setSelectedIds(new Set());
          fetchUsers();
        } catch { addToast("Error en la acción masiva", 'error'); }
        finally { setIsBulkLoading(false); }
      }
    });
  };

  const exportCSV = () => {
    const rows = filteredUsers;
    if (rows.length === 0) { addToast("No hay datos para exportar", 'error'); return; }
    const header = ['Nombre', 'Email', 'Rol', 'Estado', 'Deporte', 'Posición', 'OVR', 'XP', 'Tier', 'Partidos', 'Ganados', 'Perdidos', '% Victorias', 'Goles', 'Equipos', 'Insignias', 'Miembro desde'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = rows.map(u => [
      u.name, u.email, u.role, u.status, u.mainSport, u.position, u.ovr, u.xp, u.tier,
      u.stats.played || 0, u.stats.won || 0, u.stats.lost || 0, `${u.winRate}%`, u.stats.goals || 0,
      u.teamList.join(' | '), u.badges.length, u.joined
    ].map(esc).join(','));
    const csv = '\uFEFF' + [header.map(esc).join(','), ...body].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jugadores_mvp_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`${rows.length} jugador${rows.length === 1 ? '' : 'es'} exportado(s)`, 'success');
  };

  const uniqueSports = useMemo(() => {
    const sports = new Set<string>();
    users.forEach(u => {
      if (u.mainSport) {
        sports.add(u.mainSport);
      }
    });
    return ['Todos', ...Array.from(sports)];
  }, [users]);

  const getOvrColor = (tier: string) => {
    const t = tier.toUpperCase();
    if (t.includes('ÉLITE')) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/20';
    if (t.includes('LEYENDA')) return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500/20';
    if (t.includes('DIAMANTE')) return 'text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-500/20';
    if (t.includes('ORO')) return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-500/20';
    if (t.includes('PLATA')) return 'text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-500/20';
    return 'text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-500/20';
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
      {notification && (
        <div className={`fixed top-6 right-6 z-420 flex items-center gap-3 px-5 py-3 rounded-md shadow-2xl border animate-slideInRight backdrop-blur-md ${
            notification.type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:text-emerald-400 dark:border-emerald-500/50' : 
            'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:text-red-400 dark:border-red-500/50'
        }`}>
            <HugeiconsIcon icon={notification.type === 'success' ? CheckmarkCircle02Icon : Alert02Icon} className="w-5 h-5" strokeWidth={1.8} />
            <span className="text-[10px] font-black uppercase tracking-wider">{notification.msg}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
          <div>
              <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-[2px] bg-emerald-500 rounded-md"></span>
                  <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Auditoría de jugadores</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                Directorio de <span className="text-emerald-500 dark:text-[#00df82]">Atletas</span>
              </h1>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={() => setIsBadgesModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95 text-amber-600 dark:text-amber-400 text-[11px] font-black uppercase tracking-wider shadow-xs cursor-pointer">
                  <HugeiconsIcon icon={Medal01Icon} className="w-4 h-4" strokeWidth={2} />
                  Configurar insignias
              </button>
              <button onClick={handleBulkRecalculate} disabled={isBulkLoading || loading} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-md shadow-[0_0_25px_-8px_rgba(0,223,130,0.7)] hover:bg-[#3affa0] active:scale-95 transition-all disabled:opacity-50 cursor-pointer">
                  <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${isBulkLoading ? 'animate-spin' : ''}`} strokeWidth={2} />
                  Sincronizar ELO
              </button>
          </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TarjetaKpi titulo="Jugadores" valor={users.length.toString()} sub="Base total" icono={<HugeiconsIcon icon={UserGroupIcon} className="w-6 h-6" strokeWidth={1.6} />} brillo />
          <TarjetaKpi titulo="Capitanes" valor={users.filter(u => u.role === 'Capitán').length.toString()} sub="Líderes de equipo" icono={<HugeiconsIcon icon={Mortarboard01Icon} className="w-6 h-6" strokeWidth={1.6} />} />
          <TarjetaKpi titulo="OVR promedio" valor={(users.length > 0 ? Math.round(users.reduce((a, b) => a + b.ovr, 0) / users.length) : 0).toString()} sub="Nivel global" icono={<HugeiconsIcon icon={BarChartIcon} className="w-6 h-6" strokeWidth={1.6} />} brillo />
          <TarjetaKpi titulo="Agentes libres" valor={users.filter(u => u.teamList.length === 0).length.toString()} sub="Sin equipo" icono={<HugeiconsIcon icon={SparklesIcon} className="w-6 h-6" strokeWidth={1.6} />} />
      </div>

      {/* TOOLS BAR (sticky) */}
      <div className="sticky top-16 z-20 flex flex-col xl:flex-row gap-3 xl:items-center justify-between p-3 rounded-md border border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)]">
          <div className="relative w-full xl:w-72 shrink-0">
              <HugeiconsIcon icon={Search01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
              <input type="text" placeholder="Buscar jugador…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-hidden transition-all" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 p-1 rounded-md border border-slate-100 dark:border-white/10">
                  {["Todos", "Capitanes", "Sin equipo", "Suspendidos"].map((f) => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all whitespace-nowrap cursor-pointer ${filter === f ? "bg-white dark:bg-[#00df82] text-slate-900 dark:text-slate-950 shadow-xs" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}>{f}</button>
                  ))}
              </div>
              <div className="relative">
                  <HugeiconsIcon icon={Activity01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" strokeWidth={1.8} />
                  <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} aria-label="Filtrar por deporte" className="pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-md text-[12px] font-semibold text-slate-700 dark:text-white outline-hidden transition-all cursor-pointer appearance-none">
                      {uniqueSports.map((s) => <option key={s} value={s} className="bg-white text-slate-900 dark:bg-[#0B0F19] dark:text-white">{s}</option>)}
                  </select>
                  <HugeiconsIcon icon={ArrowDown01Icon} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" strokeWidth={2} />
              </div>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 p-1 rounded-md border border-slate-100 dark:border-white/10">
                  <button
                    onClick={() => setViewMode('grid')}
                    aria-label="Vista cuadrícula"
                    className={`p-2 rounded-md transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-[#00df82] text-emerald-600 dark:text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                  >
                    <HugeiconsIcon icon={Grid02Icon} className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    aria-label="Vista listado"
                    className={`p-2 rounded-md transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-[#00df82] text-emerald-600 dark:text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                  >
                    <HugeiconsIcon icon={ListViewIcon} className="w-4 h-4" strokeWidth={1.8} />
                  </button>
              </div>
              <button onClick={exportCSV} aria-label="Exportar CSV" title="Exportar CSV" className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer border border-slate-200 dark:border-white/10">
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={1.8} />
                  <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">CSV</span>
              </button>
              <button onClick={fetchUsers} aria-label="Refrescar" className="p-2.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer border border-slate-200 dark:border-white/10">
                  <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.8} />
              </button>
          </div>
      </div>

      {/* Resultados / selección */}
      {!loading && filteredUsers.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span className="font-mono text-slate-900 dark:text-white">{filteredUsers.length}</span> jugador{filteredUsers.length === 1 ? "" : "es"}
                  {totalPages > 1 && <> · página <span className="text-slate-900 dark:text-white font-mono">{safePage}</span> de <span className="text-slate-900 dark:text-white font-mono">{totalPages}</span></>}
              </p>

              {selectedIds.size > 0 && (() => {
                  const sel = users.filter(u => selectedIds.has(u.id));
                  const activeCount = sel.filter(u => u.status === 'Activo').length;
                  const suspendedCount = sel.filter(u => u.status === 'Suspendido').length;
                  return (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/25">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-[#00df82] font-mono">{selectedIds.size} seleccionado{selectedIds.size === 1 ? '' : 's'}</span>
                      <button
                          onClick={() => handleBulkStatus(true)}
                          disabled={activeCount === 0}
                          title={activeCount === 0 ? 'No hay activos seleccionados' : `Suspender ${activeCount}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                          <HugeiconsIcon icon={BlockedIcon} className="w-3.5 h-3.5" strokeWidth={2} />Suspender{activeCount > 0 ? ` (${activeCount})` : ''}
                      </button>
                      <button
                          onClick={() => handleBulkStatus(false)}
                          disabled={suspendedCount === 0}
                          title={suspendedCount === 0 ? 'No hay suspendidos seleccionados' : `Activar ${suspendedCount}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-[#00df82] hover:bg-emerald-500/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5" strokeWidth={2} />Activar{suspendedCount > 0 ? ` (${suspendedCount})` : ''}
                      </button>
                      <button onClick={() => setSelectedIds(new Set())} aria-label="Limpiar selección" className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer">
                          <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                  </div>
                  );
              })()}
          </div>
      )}
      {/* LISTADO */}
      <div className="relative min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 text-emerald-500 dark:text-[#00df82] animate-spin" strokeWidth={2} />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Analizando base de talento…</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="w-16 h-16 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center">
              <HugeiconsIcon icon={UserMultipleIcon} className="w-8 h-8 text-slate-300 dark:text-white/15" strokeWidth={1.5} />
            </span>
            <div className="text-center">
              <p className="text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">No hay jugadores que coincidan</p>
              <p className="text-[11px] text-slate-400 mt-1">Ajusta la búsqueda o los filtros.</p>
            </div>
          </div>
        ) : (
          viewMode === 'list' ? (
            <div className="overflow-hidden rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/2">
                      <th className="py-4 pl-6 pr-2 w-10">
                        <button onClick={() => toggleSelectAll(pagedUsers.map(u => u.id))} aria-label="Seleccionar página" className="text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] transition-colors cursor-pointer">
                          <HugeiconsIcon icon={pagedUsers.length > 0 && pagedUsers.every(u => selectedIds.has(u.id)) ? CheckmarkSquare02Icon : SquareIcon} className="w-4 h-4" strokeWidth={1.8} />
                        </button>
                      </th>
                      <SortableTh label="Jugador" active={sortKey === 'name'} onClick={() => toggleSort('name')} />
                      <SortableTh label="Valoración" active={sortKey === 'ovr'} onClick={() => toggleSort('ovr')} align="center" />
                      <SortableTh label="Partidos / récord" active={sortKey === 'played'} onClick={() => toggleSort('played')} />
                      <SortableTh label="Goles / MVP" active={sortKey === 'goals'} onClick={() => toggleSort('goals')} />
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Equipos</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estado</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {pagedUsers.map((user) => {
                      const winRate = user.winRate;
                      const isSelected = selectedIds.has(user.id);
                      return (
                        <tr key={user.id} className={`transition-all ${isSelected ? 'bg-emerald-500/4' : 'hover:bg-slate-50/60 dark:hover:bg-white/2'}`}>
                          <td className="py-4 pl-6 pr-2">
                            <button onClick={() => toggleSelect(user.id)} aria-label={`Seleccionar ${user.name}`} className={`transition-colors cursor-pointer ${isSelected ? 'text-emerald-600 dark:text-[#00df82]' : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400'}`}>
                              <HugeiconsIcon icon={isSelected ? CheckmarkSquare02Icon : SquareIcon} className="w-4 h-4" strokeWidth={1.8} />
                            </button>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black text-slate-500 text-sm overflow-hidden border border-slate-100 dark:border-white/10 shrink-0">
                                {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" alt={user.name} /> : user.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-black text-[12px] text-slate-900 dark:text-white uppercase truncate leading-none">{user.name}</span>
                                  {user.role === 'Capitán' && <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 rounded-md text-[8px] font-black uppercase tracking-wider">CAP</span>}
                                  {user.mainSport && <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-md text-[8px] font-black uppercase tracking-wider">{user.mainSport}</span>}
                                  {user.position && <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 rounded-md text-[8px] font-black uppercase tracking-wider">{user.position}</span>}
                                </div>
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate block mt-1">{user.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <div className={`px-2.5 py-1 rounded-md text-[11px] font-black shadow-xs border ${getOvrColor(user.tier)}`}>
                                {user.ovr} OVR
                              </div>
                              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{user.tier}</span>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                                  {user.stats.played} PJ · <span className="text-emerald-500">{user.stats.won}W</span> / <span className="text-red-400">{user.stats.lost}L</span>
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">({winRate}%)</span>
                              </div>
                              <div className="w-32 h-1 bg-slate-100 dark:bg-white/5 rounded-md overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-md" style={{ width: `${winRate}%` }}></div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <HugeiconsIcon icon={FireIcon} className="w-3.5 h-3.5 text-rose-500" strokeWidth={1.8} />
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">{user.stats.goals || 0} <span className="text-[9px] font-bold text-slate-400 uppercase">Goles</span></span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <HugeiconsIcon icon={TrophyIcon} className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.8} />
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">{user.stats.mvp || 0} <span className="text-[9px] font-bold text-slate-400 uppercase">MVP</span></span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex flex-wrap gap-1 max-w-[160px]">
                              {user.teamList.length > 0 ? (
                                user.teamList.map((t, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-md uppercase border border-indigo-500/10 tracking-wide">{t}</span>
                                ))
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Libre</span>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase w-fit border ${user.status === 'Activo' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-[#00df82]' : 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400'}`}>
                                {user.status}
                              </span>
                              {(user.strikes || 0) > 0 && (
                                <span className="px-2 py-0.5 bg-rose-500 text-white rounded-md text-[9px] font-black uppercase flex items-center gap-1 w-fit">
                                  <HugeiconsIcon icon={BlockedIcon} className="w-3 h-3" strokeWidth={2} />
                                  {user.strikes} {user.strikes === 1 ? 'Strike' : 'Strikes'}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-6 text-right">
                            <button onClick={() => openPlayer(user, 'perfil')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-emerald-600 dark:hover:text-[#00df82] hover:border-emerald-300 dark:hover:border-[#00df82]/30 hover:bg-emerald-50 dark:hover:bg-[#00df82]/10 transition-all active:scale-95 cursor-pointer">
                              <HugeiconsIcon icon={UserCircleIcon} className="w-4 h-4" strokeWidth={1.8} />
                              Perfil
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {pagedUsers.map((user) => (
                <div
                  key={user.id}
                  className={`group relative flex flex-col overflow-hidden rounded-md border bg-white dark:bg-slate-900/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-black/40 ${
                    user.status === 'Activo' ? 'border-slate-200 dark:border-white/5 hover:border-emerald-300 dark:hover:border-[#00df82]/30' : 'border-red-200 dark:border-red-500/20'
                  }`}
                >
                  {/* Header con acento */}
                  <div className="relative p-4 pb-3">
                    <div
                      aria-hidden="true"
                      className={`absolute left-0 top-0 bottom-0 w-[3px] ${user.status === 'Activo' ? "bg-linear-to-b from-emerald-400 to-[#00df82]" : "bg-linear-to-b from-red-400 to-red-600"}`}
                    />
                    <div className="flex items-start justify-between gap-3 pl-1.5">
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center font-black text-slate-500 dark:text-slate-400 text-lg overflow-hidden">
                          {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" alt={user.name} /> : user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 min-w-[26px] h-[26px] px-1 rounded-md border-2 border-white dark:border-slate-900 flex items-center justify-center font-black text-[10px] shadow-xs ${getOvrColor(user.tier)}`}>
                          {user.ovr}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 min-w-0">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${user.status === 'Activo' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-[#00df82]' : 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Activo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {user.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border border-transparent ${getOvrColor(user.tier)}`}>{user.tier}</span>
                      </div>
                    </div>

                    <h3 className="mt-3 font-black text-slate-900 dark:text-white text-[15px] uppercase truncate leading-tight group-hover:text-emerald-600 dark:group-hover:text-[#00df82] transition-colors font-heading">
                      {user.name}
                    </h3>
                    {user.email && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {user.role === 'Capitán' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500 text-slate-950 rounded-md text-[8px] font-black uppercase tracking-wider">
                          <HugeiconsIcon icon={CrownIcon} className="w-2.5 h-2.5" strokeWidth={2.5} /> Capitán
                        </span>
                      )}
                      {user.mainSport && <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-md text-[8px] font-black uppercase tracking-wider">{user.mainSport}</span>}
                      {user.position && <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-md text-[8px] font-black uppercase tracking-wider">{user.position}</span>}
                      {(user.strikes || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-500 text-white rounded-md text-[8px] font-black uppercase tracking-wider">
                          <HugeiconsIcon icon={BlockedIcon} className="w-2.5 h-2.5" strokeWidth={2.5} />
                          {user.strikes} {user.strikes === 1 ? 'strike' : 'strikes'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="px-4 pb-3 grid grid-cols-3 gap-1.5">
                    <div className="px-2 py-2.5 rounded-md bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5 text-center">
                      <span className="block text-[15px] font-black text-slate-900 dark:text-white leading-none font-mono">{user.stats.played || 0}</span>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Partidos</span>
                    </div>
                    <div className="px-2 py-2.5 rounded-md bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5 text-center">
                      <span className={`block text-[15px] font-black leading-none font-mono ${user.winRate >= 50 ? 'text-emerald-600 dark:text-[#00df82]' : 'text-slate-900 dark:text-white'}`}>{user.winRate}%</span>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Victorias</span>
                    </div>
                    <div className="px-2 py-2.5 rounded-md bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5 text-center">
                      <span className="block text-[15px] font-black text-slate-900 dark:text-white leading-none font-mono">{user.stats.goals || 0}</span>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Goles</span>
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="px-4 pb-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 min-w-0">
                        <HugeiconsIcon icon={UserGroupIcon} className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                        <span className="truncate">{user.teamList.length > 0 ? user.teamList.join(', ') : 'Agente libre'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 shrink-0">
                        <HugeiconsIcon icon={Certificate01Icon} className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.8} />
                        <span className="font-mono text-slate-900 dark:text-white">{user.badges.length}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                        <HugeiconsIcon icon={FireIcon} className="w-3.5 h-3.5 text-rose-500" strokeWidth={1.8} />
                        {user.goalsPerMatch} goles/partido
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">Desde {user.joined}</span>
                    </div>
                  </div>

                  {/* Acción */}
                  <div className="mt-auto border-t border-slate-100 dark:border-white/5">
                    <button onClick={() => openPlayer(user, 'perfil')} className="w-full px-4 py-3 flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:bg-emerald-50 dark:hover:bg-[#00df82]/10 transition-all cursor-pointer">
                      <HugeiconsIcon icon={UserCircleIcon} className="w-4 h-4" strokeWidth={2} />
                      <span className="text-[10px] font-black uppercase tracking-wider">Ver perfil completo</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* PAGINACIÓN */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="px-3 py-2 rounded-md border border-slate-200 dark:border-white/10 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-40 cursor-pointer">
            Anterior
          </button>
          {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
            const n = i + 1;
            return (
              <button key={n} onClick={() => setPage(n)} className={`w-9 h-9 rounded-md text-[11px] font-black font-mono transition-all cursor-pointer ${safePage === n ? "bg-[#00df82] text-slate-950" : "border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"}`}>
                {n}
              </button>
            );
          })}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-3 py-2 rounded-md border border-slate-200 dark:border-white/10 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-40 cursor-pointer">
            Siguiente
          </button>
        </div>
      )}

      {/* MODALES */}
      <PlayerModal
        user={selectedUser}
        isOpen={isPlayerModalOpen}
        onClose={() => setIsPlayerModalOpen(false)}
        gamification={gamificationConfig}
        initialTab={playerTab}
        onToggleStatus={(u) => setUserToToggle(u)}
      />
      <BadgesConfigModal isOpen={isBadgesModalOpen} onClose={() => setIsBadgesModalOpen(false)} />

      {/* CONFIRM: SUSPENDER / ACTIVAR */}
      <ConfirmDialog
        open={!!userToToggle}
        tone="warning"
        title={userToToggle?.status === 'Activo' ? "¿Suspender jugador?" : "¿Activar jugador?"}
        message={userToToggle?.status === 'Activo'
          ? <><strong>{userToToggle?.name}</strong> no podrá reservar ni acceder a la app hasta que lo reactives.</>
          : <><strong>{userToToggle?.name}</strong> recuperará el acceso completo a la app.</>}
        confirmLabel={userToToggle?.status === 'Activo' ? "Suspender" : "Activar"}
        loading={isToggling}
        onConfirm={handleToggleStatus}
        onCancel={() => setUserToToggle(null)}
      />

      {/* CONFIRM: SINCRONIZAR ELO */}
      <ConfirmDialog
        open={confirmModal.isOpen}
        tone={confirmModal.type === 'danger' ? 'danger' : 'default'}
        title={confirmModal.title}
        message={confirmModal.msg}
        confirmLabel="Confirmar"
        loading={isBulkLoading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(p => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}

function SortableTh({ label, active, onClick, align = 'left' }: { label: string; active: boolean; onClick: () => void; align?: 'left' | 'center' | 'right' }) {
  const alignCls = align === 'center' ? 'justify-center text-center' : align === 'right' ? 'justify-end text-right' : 'text-left';
  return (
    <th className={`py-4 px-6 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${active ? 'text-emerald-600 dark:text-[#00df82]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
      >
        {label}
        {active && <HugeiconsIcon icon={ArrowUpDownIcon} className="w-3 h-3" strokeWidth={2} />}
      </button>
    </th>
  );
}
