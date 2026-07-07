"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Swords, Users, MessageCircle, CheckCircle2, X, Send, User, MapPin } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { matchmakingService, MatchEntry, Challenge } from "@/services/player/matchmakingService";
import { teamService } from "@/services/player/teamService";

const SPORTS = ["Fútbol", "Pádel", "Tenis", "Básquetbol", "Voleibol", "Futbolito"];
const POSITIONS_BY_SPORT: Record<string, string[]> = {
  "Fútbol": ["Arquero", "Defensa", "Lateral", "Volante", "Delantero"],
  "Futbolito": ["Arquero", "Defensa", "Lateral", "Volante", "Delantero"],
  "Pádel": ["Lado Derecho", "Lado Izquierdo"],
  "Tenis": ["Individual", "Dobles"],
  "Básquetbol": ["Base", "Escolta", "Alero", "Ala-Pívot", "Pívot"],
  "Voleibol": ["Armador", "Atacante", "Central", "Líbero"],
};
const REGIONS: Record<string, string[]> = {
  "Arica y Parinacota": ["Arica", "Putre"],
  "Tarapacá": ["Iquique", "Alto Hospicio", "Pozo Almonte", "Huara", "Pica"],
  "Antofagasta": ["Antofagasta", "Calama", "Mejillones", "Tocopilla", "Taltal", "San Pedro de Atacama"],
  "Atacama": ["Copiapó", "Vallenar", "Huasco", "Caldera", "Chañaral", "Diego de Almagro", "Tierra Amarilla"],
  "Coquimbo": ["La Serena", "Coquimbo", "Ovalle", "Illapel", "Los Vilos", "Salamanca", "Vicuña", "Andacollo", "Combarbalá", "Monte Patria"],
  "Valparaíso": ["Valparaíso", "Viña del Mar", "Concón", "Quilpué", "Villa Alemana", "Limache", "Quillota", "San Antonio", "Los Andes", "San Felipe", "La Ligua", "Cartagena", "Santo Domingo", "Zapallar", "Papudo"],
  "Metropolitana": ["Santiago", "Providencia", "Las Condes", "Vitacura", "Ñuñoa", "La Florida", "Maipú", "Puente Alto", "San Bernardo", "Colina", "Pudahuel", "Quilicura", "Peñalolén", "La Reina", "Lo Barnechea", "San Miguel", "Macul", "Estación Central", "Independencia", "Recoleta", "Cerrillos", "Cerro Navia", "Conchalí", "El Bosque", "Huechuraba", "La Granja", "La Pintana", "Lo Espejo", "Lo Prado", "Pedro Aguirre Cerda", "Quinta Normal", "Renca", "San Joaquín", "San Ramón", "Buin", "Paine", "Talagante", "Peñaflor", "Melipilla", "Curacaví"],
  "O'Higgins": ["Rancagua", "San Fernando", "Rengo", "Santa Cruz", "Machalí", "Graneros", "Pichilemu", "San Vicente", "Mostazal", "Codegua", "Doñihue", "Coltauco", "Las Cabras", "Peumo"],
  "Maule": ["Talca", "Curicó", "Linares", "Constitución", "Molina", "San Javier", "Cauquenes", "Parral", "Teno", "Romeral", "Sagrada Familia", "San Clemente"],
  "Biobío": ["Concepción", "Talcahuano", "Chiguayante", "San Pedro de la Paz", "Coronel", "Los Ángeles", "Lota", "Penco", "Tomé", "Hualpén", "Arauco", "Laja", "Nacimiento", "Cabrero", "Lebu"],
  "Araucanía": ["Temuco", "Padre Las Casas", "Villarrica", "Pucón", "Angol", "Lautaro", "Victoria", "Nueva Imperial", "Collipulli", "Curacautín"],
  "Los Ríos": ["Valdivia", "La Unión", "Río Bueno", "Panguipulli", "Lanco", "Paillaco"],
  "Los Lagos": ["Puerto Montt", "Puerto Varas", "Castro", "Ancud", "Osorno", "Llanquihue", "Frutillar", "Calbuco", "Quellón", "Dalcahue", "Chaitén"],
  "Aysén": ["Coyhaique", "Puerto Aysén", "Chile Chico", "Cochrane"],
  "Magallanes": ["Punta Arenas", "Puerto Natales", "Porvenir", "Puerto Williams"],
};

function GlowCard({ isDark, children, className = "" }: { isDark: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[14px] ${isDark ? "bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.06]" : "bg-white/80 backdrop-blur-xl border border-slate-200/60"} shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"} ${className}`}>
      <div className={`absolute inset-0 rounded-[14px] pointer-events-none ${isDark ? "bg-gradient-to-br from-emerald-500/[0.02] to-transparent" : ""}`} />
      {children}
    </div>
  );
}

function SectionPill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-6 mb-4 mt-6">
      <div className="h-[3px] w-6 rounded-full bg-emerald-500/60" />
      <span className="text-emerald-400 font-semibold text-[10px] tracking-[3px] uppercase">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
    </div>
  );
}

export default function PartidosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, theme } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<"rival" | "jugadores" | "mis">(
    (searchParams.get("tab") as any) || "rival"
  );
  const [sportFilter, setSportFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [communeFilters, setCommuneFilters] = useState<string[]>([]);

  // Publish modals
  const [showPublishTeam, setShowPublishTeam] = useState(false);
  const [showPublishPlayer, setShowPublishPlayer] = useState(false);
  const [publishSport, setPublishSport] = useState("Fútbol");
  const [publishSports, setPublishSports] = useState<string[]>(["Fútbol"]);
  const [publishDesc, setPublishDesc] = useState("");
  const [publishRegion, setPublishRegion] = useState("");
  const [publishCommunes, setPublishCommunes] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [teams, setTeams] = useState<MatchEntry[]>([]);
  const [players, setPlayers] = useState<MatchEntry[]>([]);
  const [myEntries, setMyEntries] = useState<MatchEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [editEntry, setEditEntry] = useState<MatchEntry | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editSport, setEditSport] = useState("");
  const [editSports, setEditSports] = useState<string[]>([]);
  const [showTeamDetail, setShowTeamDetail] = useState<MatchEntry | null>(null);
  const [teamDetailData, setTeamDetailData] = useState<{ team: any; profiles: Record<string, any> } | null>(null);
  const [showPlayerDetail, setShowPlayerDetail] = useState<MatchEntry | null>(null);
  const [showTeamSelector, setShowTeamSelector] = useState<MatchEntry | null>(null);
  const [showChallengeDetail, setShowChallengeDetail] = useState<Challenge | null>(null);
  const [challengeTeamData, setChallengeTeamData] = useState<{ team: any; profiles: Record<string, any> } | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState<MatchEntry | null>(null);
  const [confirmChallenge, setConfirmChallenge] = useState<{ entry: MatchEntry; team: any } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ challengeId: string; action: "accept" | "decline" } | null>(null);

  const uid = user?.uid || "";
  const playerName = (profile as any)?.displayName || "Jugador";
  const playerPhoto = (profile as any)?.photoURL || "";
  const playerPosition = (profile as any)?.position || "";
  const playerOvr = (profile as any)?.ovr || 40;
  const playerTier = (profile as any)?.tier || "Bronce";

  // Real-time subscriptions
  useEffect(() => {
    if (!uid) return;
    const unsubs: (() => void)[] = [];

    unsubs.push(matchmakingService.subscribeToTeamsLooking(sportFilter || undefined, (entries) => {
      setTeams(entries.filter(e => e.userId !== uid)
        .filter(e => !regionFilter || (e.region || "").includes(regionFilter))
        .filter(e => communeFilters.length === 0 || (e.communes || []).some(c => communeFilters.includes(c))));
    }));

    const sportForPlayers = activeTab === "jugadores" ? sportFilter || undefined : undefined;
    unsubs.push(matchmakingService.subscribeToPlayersAvailable(sportForPlayers, (entries) => {
      let filtered = entries.filter(e => e.userId !== uid);
      if (positionFilter) filtered = filtered.filter(e => e.position === positionFilter);
      filtered = filtered.filter(e => !regionFilter || (e.region || "").includes(regionFilter));
      filtered = filtered.filter(e => communeFilters.length === 0 || (e.communes || []).some(c => communeFilters.includes(c)));
      setPlayers(filtered);
    }));

    unsubs.push(matchmakingService.subscribeToMyEntries(uid, (entries) => {
      setMyEntries(entries);
    }));

    unsubs.push(matchmakingService.subscribeToMyChallenges(uid, (challenges) => {
      setChallenges(challenges);
    }));

    // Fetch user teams once (they rarely change)
    teamService.getUserTeams(uid).then(setUserTeams).catch(() => {});
    setLoading(false);

    return () => unsubs.forEach(u => u());
  }, [uid, sportFilter, positionFilter, regionFilter, communeFilters, activeTab]);

  const handlePublishTeam = async () => {
    if (!selectedTeam) return;
    setActionLoading(true);
    try {
      const team = userTeams.find(t => t.id === selectedTeam);
      if (!team) return;
      await matchmakingService.publishTeam({
        teamId: team.id, teamName: team.name, teamImageUrl: (team as any).imageUrl,
        sport: publishSport, memberCount: team.members?.length || 1,
        description: publishDesc, region: publishRegion, communes: publishCommunes,
      }, uid);
      setFeedback({ type: "success", msg: "¡Equipo publicado! Ahora otros capitanes pueden retarte." });
      setShowPublishTeam(false);
    } catch (e: any) { setFeedback({ type: "error", msg: e?.message || "Error al publicar el equipo." }); }
    finally { setActionLoading(false); }
  };

  const handlePublishPlayer = async () => {
    setActionLoading(true);
    try {
      const data: any = {
        userId: uid, displayName: playerName,
        position: playerPosition || "Jugador", ovr: playerOvr || 40, tier: playerTier || "Bronce",
        sports: publishSports.length > 0 ? publishSports : ["Fútbol"],
        description: publishDesc, region: publishRegion, communes: publishCommunes,
      };
      if (playerPhoto) data.photoURL = playerPhoto;
      await matchmakingService.publishPlayer(data);
      setFeedback({ type: "success", msg: "¡Disponibilidad publicada! Los capitanes podrán contactarte." });
      setShowPublishPlayer(false);
    } catch (e: any) {
      setFeedback({ type: "error", msg: e?.message || "Error al publicar disponibilidad." });
    }
    finally { setActionLoading(false); }
  };

  const handleChallenge = async (entry: MatchEntry) => {
    if (!entry.teamId) return;
    if (userCaptainTeams.length > 1) {
      setShowTeamSelector(entry);
      return;
    }
    if (userCaptainTeams.length === 1) {
      setConfirmChallenge({ entry, team: userCaptainTeams[0] });
      return;
    }
    setFeedback({ type: "error", msg: "Debes ser capitán de un equipo para retar." });
  };

  const executeChallenge = async (entry: MatchEntry, myTeam: any) => {
    if (!entry.teamId || !myTeam) return;
    setActionLoading(true);
    try {
      await matchmakingService.createChallenge({
        type: "team_vs_team",
        challengerTeamId: myTeam.id, challengerTeamName: myTeam.name,
        challengedTeamId: entry.teamId, challengedTeamName: entry.teamName || "",
        sport: entry.sport,
        senderId: uid, receiverId: entry.userId || "",
      });
      setConfirmChallenge(null);
      setFeedback({ type: "success", msg: `¡Has retado a ${entry.teamName}!` });
    } catch { setFeedback({ type: "error", msg: "Error al retar." }); }
    finally { setActionLoading(false); }
  };

  const handleContact = async (entry: MatchEntry) => {
    if (!entry.userId) return;
    setActionLoading(true);
    try {
      const challengeId = await matchmakingService.createChallenge({
        type: "captain_to_player",
        captainId: uid, captainName: playerName,
        playerId: entry.userId, playerName: entry.displayName || "",
        sport: sportFilter || entry.sports?.[0] || "Fútbol",
        senderId: uid, receiverId: entry.userId,
      });
      setFeedback({ type: "success", msg: "Chat abierto con el jugador." });
      router.push(`/player/equipos/partidos/chat?id=${challengeId}`);
    } catch { setFeedback({ type: "error", msg: "Error al contactar." }); }
    finally { setActionLoading(false); }
  };

  const handleAcceptChallenge = async (challengeId: string) => {
    try {
      await matchmakingService.acceptChallenge(challengeId);
    } catch {}
  };

  const handleEditSave = async () => {
    if (!editEntry) return;
    setActionLoading(true);
    try {
      const data: any = { description: editDesc };
      if (editEntry.type === "team" && editSport) data.sport = editSport;
      if (editEntry.type === "player") data.sports = editSports;
      await matchmakingService.updateEntry(editEntry.id, data);
      setFeedback({ type: "success", msg: "Publicación actualizada." });
      setEditEntry(null);
    } catch { setFeedback({ type: "error", msg: "Error al actualizar." }); }
    finally { setActionLoading(false); }
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    try {
      await matchmakingService.declineChallenge(challengeId);
    } catch {}
  };

  const isSportToggled = (s: string) => publishSports.includes(s);
  const toggleSport = (s: string) => {
    setPublishSports(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const userCaptainTeams = userTeams.filter(t => t.ownerId === uid);
  const publishedTeamIds = new Set(myEntries.filter(e => e.type === "team" && e.status === "active").map(e => e.teamId));
  const availableTeams = userCaptainTeams.filter(t => !publishedTeamIds.has(t.id));

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <button onClick={() => router.push("/player/equipos")} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center">Partidos</h1>
        <div className="w-10" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-5 pt-3">
        {[
          { id: "rival" as const, label: "Buscar Rival", icon: Swords },
          { id: "jugadores" as const, label: "Jugadores", icon: Users },
          { id: "mis" as const, label: "Mis Chats", icon: MessageCircle },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 h-10 rounded-[14px] text-[9px] font-semibold uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${activeTab === tab.id ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25" : isDark ? "bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="px-5 pt-4 pb-8 space-y-4">
        {/* Filters */}
        {(activeTab === "rival" || activeTab === "jugadores") && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className={`flex-1 relative`}>
                <select value={sportFilter} onChange={e => { setSportFilter(e.target.value); if (activeTab === "jugadores") setPositionFilter(""); }}
                  className={`w-full h-11 rounded-[14px] px-4 text-[11px] font-semibold outline-none appearance-none cursor-pointer border ${isDark ? "bg-[#0F172A]/90 text-slate-200 border-white/[0.06]" : "bg-white/80 text-slate-700 border-slate-200/60"} backdrop-blur-xl shadow-sm`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px' }}>
                  <option value="">Todos los deportes</option>
                  {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {activeTab === "jugadores" && sportFilter && (
                <div className={`flex-1 relative`}>
                  <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)}
                    className={`w-full h-11 rounded-[14px] px-4 text-[11px] font-semibold outline-none appearance-none cursor-pointer border ${isDark ? "bg-[#0F172A]/90 text-slate-200 border-white/[0.06]" : "bg-white/80 text-slate-700 border-slate-200/60"} backdrop-blur-xl shadow-sm`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px' }}>
                    <option value="">Todas las posiciones</option>
                    {(POSITIONS_BY_SPORT[sportFilter] || []).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
              {activeTab === "jugadores" && !sportFilter && (
                <div className={`flex-1 h-11 rounded-[14px] flex items-center justify-center px-4 text-[10px] font-medium border ${isDark ? "bg-[#0F172A]/50 text-slate-500 border-white/[0.04]" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                  Primero elige un deporte
                </div>
              )}
            </div>
            <div className="space-y-2">
              <select value={regionFilter} onChange={e => { setRegionFilter(e.target.value); setCommuneFilters([]); }}
                className={`w-full h-11 rounded-[14px] px-4 text-[11px] font-semibold outline-none appearance-none cursor-pointer border ${isDark ? "bg-[#0F172A]/90 text-slate-200 border-white/[0.06]" : "bg-white/80 text-slate-700 border-slate-200/60"} backdrop-blur-xl shadow-sm`}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px' }}>
                <option value="">Todas las regiones</option>
                {Object.keys(REGIONS).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {regionFilter && (
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    {(REGIONS[regionFilter] || []).map(c => {
                      const selected = communeFilters.includes(c);
                      return (
                        <button key={c} onClick={() => setCommuneFilters(prev => selected ? prev.filter(x => x !== c) : [...prev, c])}
                          className={`px-2.5 py-1 rounded-[14px] text-[9px] font-medium transition-all ${selected ? "bg-emerald-500 text-white" : isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{c}</button>
                      );
                    })}
                  </div>
                  {communeFilters.length > 0 && (
                    <button onClick={() => setCommuneFilters([])} className={`text-[8px] font-medium mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Limpiar filtro ({communeFilters.length})</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Buscar Rival */}
        {activeTab === "rival" && (
          <>
            <div className="flex gap-2">
              <button onClick={() => setShowPublishTeam(true)}
                className="flex-1 h-[52px] rounded-[14px] font-semibold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25"
                style={{ backgroundColor: "#10b981", color: "white" }}>
                <Swords size={16} /> Publicar mi Equipo
              </button>
              <button onClick={() => {}} className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center transition-all active:scale-90" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? "#94A3B8" : "#64748B"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : teams.filter(e => e.userId !== uid).length === 0 ? (
              <div className="py-16 flex flex-col items-center">
                <Swords size={40} className={isDark ? "text-slate-600" : "text-slate-300"} strokeWidth={1} />
                <p className={`text-sm font-medium mt-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>No hay equipos buscando rival por ahora</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.filter(e => e.userId !== uid).map(entry => {
                  const alreadyChallenged = challenges.some(c => c.status !== "declined" && ((c.challengedTeamId === entry.teamId && c.senderId === uid) || (c.challengerTeamId === entry.teamId && c.receiverId === uid)));
                  return (
                    <GlowCard key={entry.id} isDark={isDark}>
                      <div className="overflow-hidden">
                        {/* Hero image */}
                        <div className="h-[90px] relative" style={{ background: entry.teamImageUrl ? `url(${entry.teamImageUrl}) center/cover` : `linear-gradient(135deg, #059669, #047857)` }}>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                          <div className="absolute bottom-3 left-4 right-4">
                            <div className="flex items-center gap-2">
                              <span className="bg-emerald-500 px-2 py-0.5 rounded-[14px] text-white font-semibold text-[7px] uppercase tracking-wider">{entry.sport.toUpperCase()}</span>
                              <span className="bg-black/40 px-2 py-0.5 rounded-[14px] text-white/80 text-[7px] font-medium">{entry.memberCount} jugadores</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-[15px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>{entry.teamName}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {entry.communes && entry.communes.length > 0 ? (
                                  <span className={`text-[8px] font-medium flex items-center gap-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}><MapPin size={9} />{entry.communes.slice(0, 2).join(", ")}{entry.communes.length > 2 ? ` +${entry.communes.length - 2}` : ""} · {entry.region}</span>
                                ) : entry.commune ? (
                                  <span className={`text-[8px] font-medium flex items-center gap-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}><MapPin size={9} />{entry.commune}</span>
                                ) : null}
                              </div>
                            </div>
                            <button onClick={async () => { setShowTeamDetail(entry); setTeamDetailData(null); try { const team = await teamService.getTeamById(entry.teamId!); if (team) { const p = await teamService.getMemberProfiles(team.members); setTeamDetailData({ team, profiles: p }); } } catch {} }}
                              className={`px-4 h-9 rounded-[14px] text-[9px] font-semibold uppercase tracking-wider transition-all active:scale-[0.98] shrink-0 ml-2 ${alreadyChallenged ? (isDark ? "bg-white/[0.06] text-slate-500" : "bg-slate-100 text-slate-400") : "bg-emerald-500 text-white"}`}>
                              {alreadyChallenged ? "Retado" : "Ver"}
                            </button>
                          </div>
                          {entry.description && <p className={`text-[10px] font-medium mt-2 leading-snug ${isDark ? "text-slate-500" : "text-slate-400"}`}>{entry.description}</p>}
                        </div>
                      </div>
                    </GlowCard>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab: Jugadores */}
        {activeTab === "jugadores" && (
          <>
            <button onClick={() => setShowPublishPlayer(true)}
              className="w-full h-[52px] rounded-[14px] bg-emerald-500 text-white font-semibold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25">
              <User size={16} /> Estoy Disponible
            </button>

            {loading ? (
              <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : players.filter(e => e.userId !== uid).length === 0 ? (
              <div className="py-16 flex flex-col items-center">
                <Users size={40} className={isDark ? "text-slate-600" : "text-slate-300"} strokeWidth={1} />
                <p className={`text-sm font-medium mt-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>No hay jugadores disponibles por ahora</p>
              </div>
            ) : (
              <div className="space-y-3">
                {players.filter(e => e.userId !== uid).map(entry => {
                  const alreadyContacted = challenges.some(c => c.status !== "closed" && c.playerId === entry.userId && c.senderId === uid);
                  return (
                    <GlowCard key={entry.id} isDark={isDark}>
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-[14px] overflow-hidden shrink-0 border-2" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0" }}>
                            {entry.photoURL ? <img src={entry.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}><User size={24} className={isDark ? "text-slate-400" : "text-slate-500"} /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`font-semibold text-[15px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>{entry.displayName}</p>
                              <span className="text-emerald-500 text-[13px] font-bold shrink-0 ml-2">OVR {entry.ovr}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-[14px] ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>{entry.position || "Jugador"}</span>
                              <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-[14px] ${isDark ? "bg-white/[0.06] text-slate-400" : "bg-slate-100 text-slate-500"}`}>{entry.tier}</span>
                              {entry.communes && entry.communes.length > 0 ? (
                                <span className={`text-[8px] font-medium flex items-center gap-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}><MapPin size={9} />{entry.communes[0]}</span>
                              ) : entry.commune ? (
                                <span className={`text-[8px] font-medium flex items-center gap-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}><MapPin size={9} />{entry.commune}</span>
                              ) : null}
                            </div>
                            {entry.sports && entry.sports.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {entry.sports.map(s => <span key={s} className={`text-[7px] font-medium px-2 py-0.5 rounded-[14px] ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>{s}</span>)}
                              </div>
                            )}
                            {entry.description && <p className={`text-[9px] font-medium mt-1.5 leading-snug ${isDark ? "text-slate-500" : "text-slate-400"}`}>{entry.description}</p>}
                          </div>
                        </div>
                        <button onClick={() => setShowPlayerDetail(entry)} disabled={alreadyContacted}
                          className={`w-full mt-3 h-10 rounded-[14px] text-[9px] font-semibold uppercase tracking-wider transition-all active:scale-[0.98] ${alreadyContacted ? (isDark ? "bg-white/[0.06] text-slate-500 border border-white/[0.06]" : "bg-slate-100 text-slate-400 border border-slate-200") : "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"}`}>
                          {alreadyContacted ? "Contactado" : "Ver"}
                        </button>
                      </div>
                    </GlowCard>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab: Mis Actividades */}
        {activeTab === "mis" && (
          <>
            {loading ? (
              <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-4">
                {/* My published entries */}
                {myEntries.filter(e => e.status === "active").length > 0 && (
                  <>
                    <SectionPill label="Mis Publicaciones" />
                    {myEntries.filter(e => e.status === "active").map(entry => (
                      <GlowCard key={entry.id} isDark={isDark}>
                        <div className="p-4 flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                            {entry.type === "team" ? <Swords size={20} className="text-emerald-500" /> : <User size={20} className="text-emerald-500" />}
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold text-[13px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>{entry.type === "team" ? entry.teamName : "Disponible como jugador"}</p>
                            <p className={`text-[9px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{entry.sport || entry.sports?.join(", ")}</p>
                          </div>
                          <button onClick={() => { setEditEntry(entry); setEditDesc(entry.description || ""); setEditSport(entry.sport || ""); setEditSports(entry.sports || []); }}
                            className={`px-2.5 h-7 rounded-[14px] text-[8px] font-semibold uppercase ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-500"}`}>Editar</button>
                          <button onClick={() => setShowCloseConfirm(entry)}
                            className={`px-2.5 h-7 rounded-[14px] text-[8px] font-semibold uppercase ml-1.5 ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-500"}`}>Cancelar</button>
                        </div>
                      </GlowCard>
                    ))}
                  </>
                )}

                {/* Challenges */}
                {challenges.length > 0 && (
                  <>
                    <SectionPill label="Mis Challenges" />
                    {challenges.map(c => {
                      const isReceiver = c.receiverId === uid;
                      const otherName = c.type === "team_vs_team"
                        ? (isReceiver ? c.challengerTeamName : c.challengedTeamName)
                        : (isReceiver ? c.captainName : c.playerName);
                      const otherId = c.type === "team_vs_team"
                        ? (c.senderId === uid ? c.receiverId : c.senderId)
                        : (c.senderId === uid ? c.receiverId || "" : c.senderId);
                      return (
                        <GlowCard key={c.id} isDark={isDark}>
                          <div className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                                <MessageCircle size={20} className={c.status === "active" ? "text-emerald-500" : c.status === "pending" ? "text-amber-500" : "text-slate-400"} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-[13px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                                  {c.type === "team_vs_team" ? `vs ${otherName}` : `Chat con ${otherName}`}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-[14px] ${
                                    c.status === "active" ? (isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600") :
                                    c.status === "pending" ? (isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600") :
                                    (isDark ? "bg-slate-500/10 text-slate-400" : "bg-slate-100 text-slate-500")
                                  }`}>
                                    {c.status === "active" ? "Activo" : c.status === "pending" ? "Pendiente" : c.status === "declined" ? "Rechazado" : "Cerrado"}
                                  </span>
                                  <span className={`text-[8px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{c.sport}</span>
                                </div>
                              </div>
                              {(c.status === "pending" || c.status === "active") && c.type === "team_vs_team" && (
                                <button onClick={async () => { setShowChallengeDetail(c); setChallengeTeamData(null); try { const teamId = c.senderId === uid ? c.challengedTeamId : c.challengerTeamId; const team = teamId ? await teamService.getTeamById(teamId) : null; if (team) { const p = await teamService.getMemberProfiles(team.members); setChallengeTeamData({ team, profiles: p }); } } catch {} }}
                                  className={`px-3 h-9 rounded-[14px] text-[8px] font-semibold uppercase tracking-wider transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                                  Ver equipo
                                </button>
                              )}
                              {c.status === "active" && (
                                <button onClick={() => router.push(`/player/equipos/partidos/chat?id=${c.id}`)}
                                  className="px-4 h-9 rounded-[14px] bg-emerald-500 text-white text-[9px] font-semibold uppercase tracking-wider transition-all active:scale-[0.98]">
                                  Chat
                                </button>
                              )}
                            </div>
                          </div>
                        </GlowCard>
                      );
                    })}
                  </>
                )}

                {myEntries.filter(e => e.status === "active").length === 0 && challenges.length === 0 && (
                  <div className="py-16 flex flex-col items-center">
                    <MessageCircle size={40} className={isDark ? "text-slate-600" : "text-slate-300"} strokeWidth={1} />
                    <p className={`text-sm font-medium mt-3 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>No tienes actividades aún.<br />Publica tu equipo o disponibilidad.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Publish Team Modal */}
      {showPublishTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => setShowPublishTeam(false)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <p className={`font-semibold text-[15px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Publicar mi Equipo</p>
              <button onClick={() => setShowPublishTeam(false)} className="w-8 h-8 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}><X size={14} /></button>
            </div>
            <div className="mb-4">
              <label className={`text-[9px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Equipo</label>
              {availableTeams.length === 0 ? (
                <div className={`w-full h-11 rounded-[14px] flex items-center px-4 text-sm font-medium border ${isDark ? "bg-white/[0.04] text-slate-500 border-white/[0.06]" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                  {userTeams.length === 0 ? "No tienes equipos. Crea uno primero." : "Todos tus equipos ya están publicados"}
                </div>
              ) : (
                <div className="relative">
                  <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}
                    className={`w-full h-11 rounded-[14px] px-4 text-sm font-semibold outline-none appearance-none cursor-pointer border ${isDark ? "bg-[#0F172A]/90 text-slate-200 border-white/[0.06]" : "bg-white/80 text-slate-900 border-slate-200/60"} backdrop-blur-xl`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px' }}>
                    <option value="">Seleccionar equipo</option>
                    {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className={`text-[9px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Deporte</label>
              <div className="relative">
                <select value={publishSport} onChange={e => setPublishSport(e.target.value)}
                  className={`w-full h-11 rounded-[14px] px-4 text-sm font-semibold outline-none appearance-none cursor-pointer border ${isDark ? "bg-[#0F172A]/90 text-slate-200 border-white/[0.06]" : "bg-white/80 text-slate-900 border-slate-200/60"} backdrop-blur-xl`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px' }}>
                  {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className={`text-[9px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Descripción (opcional)</label>
              <input value={publishDesc} onChange={e => setPublishDesc(e.target.value)} placeholder="Ej: Buscamos rival para este sábado"
                className={`w-full h-11 rounded-[14px] px-3 text-sm font-medium outline-none border ${isDark ? "bg-white/[0.06] text-slate-200 border-white/[0.06] placeholder-slate-500" : "bg-slate-50 text-slate-900 border-slate-200 placeholder-slate-400"}`} />
            </div>
            <div className="mb-4">
              <label className={`text-[9px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Región</label>
              <div className="relative">
                <select value={publishRegion} onChange={e => { setPublishRegion(e.target.value); setPublishCommunes([]); }}
                  className={`w-full h-11 rounded-[14px] px-4 text-sm font-semibold outline-none appearance-none cursor-pointer border ${isDark ? "bg-[#0F172A]/90 text-slate-200 border-white/[0.06]" : "bg-white/80 text-slate-900 border-slate-200/60"} backdrop-blur-xl`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px' }}>
                  <option value="">Seleccionar región</option>
                  {Object.keys(REGIONS).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            {publishRegion && (
              <div className="mb-4">
                <label className={`text-[9px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Comunas donde juegan</label>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                  {(REGIONS[publishRegion] || []).map(c => {
                    const selected = publishCommunes.includes(c);
                    return (
                      <button key={c} type="button" onClick={() => setPublishCommunes(prev => selected ? prev.filter(x => x !== c) : [...prev, c])}
                        className={`px-2.5 py-1 hover:scale-[1.02] active:scale-95 rounded-[14px] text-[10px] font-medium transition-all ${selected ? "bg-emerald-500 text-white" : isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{c}</button>
                    );
                  })}
                </div>
                {publishCommunes.length > 0 && <p className={`text-[8px] font-medium mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{publishCommunes.length} seleccionadas</p>}
              </div>
            )}
            <button onClick={handlePublishTeam} disabled={actionLoading || !selectedTeam}
              className="w-full h-12 rounded-[14px] bg-emerald-500 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-500/25 flex items-center justify-center">
              {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Publicar Equipo"}
            </button>
          </div>
        </div>
      )}

      {/* Publish Player Modal */}
      {showPublishPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => setShowPublishPlayer(false)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <p className={`font-semibold text-[15px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Estoy Disponible</p>
              <button onClick={() => setShowPublishPlayer(false)} className="w-8 h-8 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}><X size={14} /></button>
            </div>
            <div className={`p-4 rounded-[14px] mb-4 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] overflow-hidden" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
                  {playerPhoto ? <img src={playerPhoto} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User size={18} className={isDark ? "text-slate-400" : "text-slate-500"} /></div>}
                </div>
                <div>
                  <p className={`font-semibold text-sm ${isDark ? "text-slate-100" : "text-slate-900"}`}>{playerName}</p>
                  <p className={`text-[9px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{playerPosition} · OVR {playerOvr} · {playerTier}</p>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className={`text-[9px] font-semibold uppercase tracking-wider mb-2 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Deportes</label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map(s => (
                  <button key={s} onClick={() => toggleSport(s)}
                    className={`px-3 py-1.5 rounded-[14px] text-[10px] font-semibold transition-all ${isSportToggled(s) ? "bg-emerald-500 text-white" : isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-600"}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className={`text-[9px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Región</label>
              <div className="relative">
                <select value={publishRegion} onChange={e => { setPublishRegion(e.target.value); setPublishCommunes([]); }}
                  className={`w-full h-11 rounded-[14px] px-4 text-sm font-semibold outline-none appearance-none cursor-pointer border ${isDark ? "bg-[#0F172A]/90 text-slate-200 border-white/[0.06]" : "bg-white/80 text-slate-900 border-slate-200/60"} backdrop-blur-xl`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px' }}>
                  <option value="">Seleccionar región</option>
                  {Object.keys(REGIONS).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            {publishRegion && (
              <div className="mb-4">
                <label className={`text-[9px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Comunas donde juegan</label>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                  {(REGIONS[publishRegion] || []).map(c => {
                    const selected = publishCommunes.includes(c);
                    return (
                      <button key={c} type="button" onClick={() => setPublishCommunes(prev => selected ? prev.filter(x => x !== c) : [...prev, c])}
                        className={`px-2.5 py-1 hover:scale-[1.02] active:scale-95 rounded-[14px] text-[10px] font-medium transition-all ${selected ? "bg-emerald-500 text-white" : isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{c}</button>
                    );
                  })}
                </div>
                {publishCommunes.length > 0 && <p className={`text-[8px] font-medium mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{publishCommunes.length} seleccionadas</p>}
              </div>
            )}
            <div className="mb-4">
              <label className={`text-[9px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Comentario (opcional)</label>
              <input value={publishDesc} onChange={e => setPublishDesc(e.target.value)} placeholder="Ej: Busco partidos los fines de semana"
                className={`w-full h-11 rounded-[14px] px-3 text-sm font-medium outline-none border ${isDark ? "bg-white/[0.06] text-slate-200 border-white/[0.06] placeholder-slate-500" : "bg-slate-50 text-slate-900 border-slate-200 placeholder-slate-400"}`} />
            </div>
            <button onClick={handlePublishPlayer} disabled={actionLoading || publishSports.length === 0}
              className="w-full h-12 rounded-[14px] bg-emerald-500 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-500/25 flex items-center justify-center">
              {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Publicar Disponibilidad"}
            </button>
          </div>
        </div>
      )}

      {/* Team Selector Modal */}
      {showTeamSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => setShowTeamSelector(null)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border shadow-2xl ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className={`font-semibold text-[15px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Retar a {showTeamSelector.teamName}</p>
              <button onClick={() => setShowTeamSelector(null)} className="w-8 h-8 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}><X size={14} /></button>
            </div>
            <p className={`text-[10px] font-medium mb-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Selecciona con qué equipo quieres retar:</p>
            <div className="space-y-2 mb-5">
              {userCaptainTeams.map(t => (
                <button key={t.id} onClick={async () => { setShowTeamSelector(null); setConfirmChallenge({ entry: showTeamSelector, team: t }); }}
                  className={`w-full p-4 rounded-[14px] border text-left transition-all active:scale-[0.98] ${isDark ? "bg-[#0F172A]/90 border-white/[0.06] hover:bg-white/[0.04]" : "bg-white/80 border-slate-200/60 hover:bg-slate-50"}`}>
                  <p className={`font-semibold text-[13px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t.name}</p>
                  <p className={`text-[9px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{(t.sport || "").charAt(0).toUpperCase() + (t.sport || "").slice(1)} · {t.members?.length || 1} jugadores</p>
                </button>
              ))}
            </div>
            <button onClick={() => setShowTeamSelector(null)} className={`w-full py-3 rounded-[14px] font-semibold text-xs ${isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-700"}`}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Confirm Challenge Modal */}
      {confirmChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => setConfirmChallenge(null)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border shadow-2xl text-center ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-[14px] bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Swords size={28} className="text-emerald-500" />
            </div>
            <p className={`font-semibold text-[15px] mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>¿Retar a {confirmChallenge.entry.teamName}?</p>
            <p className={`text-[11px] font-medium mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Con tu equipo:</p>
            <p className={`font-semibold text-[13px] mb-5 ${isDark ? "text-slate-200" : "text-slate-700"}`}>{confirmChallenge.team.name} · {confirmChallenge.entry.sport.toUpperCase()}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmChallenge(null)} className={`flex-1 py-3.5 rounded-[14px] font-semibold text-sm ${isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-700"}`}>Cancelar</button>
              <button onClick={() => executeChallenge(confirmChallenge.entry, confirmChallenge.team)} disabled={actionLoading}
                className="flex-1 py-3.5 rounded-[14px] bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50 shadow-lg shadow-emerald-500/25 flex items-center justify-center">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Confirmar Reto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Challenge Detail Modal */}
      {showChallengeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => { setShowChallengeDetail(null); setChallengeTeamData(null); }}>
          <div className={`w-full max-w-sm rounded-[14px] overflow-hidden border shadow-2xl ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="h-[100px] relative bg-gradient-to-br from-emerald-800 to-slate-900">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <button onClick={() => { setShowChallengeDetail(null); setChallengeTeamData(null); }} className="absolute top-4 right-4 w-8 h-8 rounded-[14px] bg-black/40 border border-white/10 flex items-center justify-center"><X size={14} className="text-white" /></button>
              <div className="absolute bottom-4 left-5 right-5">
                <p className="text-white text-base font-semibold">{showChallengeDetail.type === "team_vs_team" ? (showChallengeDetail.senderId === uid ? showChallengeDetail.challengedTeamName : showChallengeDetail.challengerTeamName) : ""}</p>
                <p className="text-white/70 text-[10px] font-medium mt-0.5">{showChallengeDetail.sport} · {showChallengeDetail.status === "pending" ? "Challenge pendiente" : showChallengeDetail.status === "active" ? "Challenge activo" : "Challenge cerrado"}</p>
              </div>
            </div>
            <div className="p-5 space-y-4 max-h-[55vh] overflow-y-auto">
              {challengeTeamData ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-[14px]" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC" }}>
                    <p className={`text-[10px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>MIEMBROS</p>
                    <span className={`text-[13px] font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{challengeTeamData.team.members.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    <p className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>JUGADORES</p>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {challengeTeamData.team.members.map((mid: string) => {
                        const p = challengeTeamData.profiles[mid] || {};
                        return (
                          <div key={mid} className="flex items-center gap-2.5 p-2 rounded-[14px]" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "transparent" }}>
                            <div className="w-8 h-8 rounded-[14px] overflow-hidden shrink-0" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
                              {p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" /> : <User size={14} className={isDark ? "text-slate-400" : "text-slate-500"} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-medium truncate ${isDark ? "text-slate-200" : "text-slate-700"}`}>{p.displayName || mid.slice(0, 8)}{mid === challengeTeamData.team.ownerId ? " (C)" : ""}</p>
                            </div>
                            <span className="text-emerald-500 text-[11px] font-semibold shrink-0">OVR {p.ovr || 40}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
              )}
              {showChallengeDetail.status === "pending" && showChallengeDetail.receiverId === uid && (
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setConfirmAction({ challengeId: showChallengeDetail.id, action: "accept" })}
                    className="flex-1 h-11 rounded-[14px] bg-emerald-500 text-white font-semibold text-[10px] uppercase tracking-wider transition-all active:scale-[0.98] shadow-sm shadow-emerald-500/25">Aceptar</button>
                  <button onClick={() => setConfirmAction({ challengeId: showChallengeDetail.id, action: "decline" })}
                    className="flex-1 h-11 rounded-[14px] bg-red-500 text-white font-semibold text-[10px] uppercase tracking-wider transition-all active:scale-[0.98]">Rechazar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal (accept/decline challenge) */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => setConfirmAction(null)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border shadow-2xl text-center ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`w-16 h-16 rounded-[14px] flex items-center justify-center mx-auto mb-4 ${confirmAction.action === "accept" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              {confirmAction.action === "accept" ? <CheckCircle2 size={28} className="text-emerald-500" /> : <X size={28} className="text-red-500" />}
            </div>
            <p className={`font-semibold text-[15px] mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {confirmAction.action === "accept" ? "¿Aceptar challenge?" : "¿Rechazar challenge?"}
            </p>
            <p className={`text-[11px] font-medium mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {confirmAction.action === "accept" ? "Se abrirá un chat con el capitán del equipo rival." : "El equipo rival será notificado de tu decisión."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className={`flex-1 py-3.5 rounded-[14px] font-semibold text-sm ${isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-700"}`}>Cancelar</button>
              <button onClick={async () => {
                const c = confirmAction; setConfirmAction(null); setShowChallengeDetail(null); setChallengeTeamData(null);
                if (c.action === "accept") await handleAcceptChallenge(c.challengeId);
                else await handleDeclineChallenge(c.challengeId);
              }} disabled={actionLoading}
                className="flex-1 py-3.5 rounded-[14px] font-semibold text-sm text-white disabled:opacity-50 flex items-center justify-center"
                style={{ backgroundColor: confirmAction.action === "accept" ? "#10b981" : "#ef4444" }}>
                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (confirmAction.action === "accept" ? "Aceptar" : "Rechazar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Detail Modal */}
      {showTeamDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => { setShowTeamDetail(null); setTeamDetailData(null); }}>
          <div className={`w-full max-w-sm rounded-[14px] overflow-hidden border shadow-2xl ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="h-[130px] relative" style={{ background: showTeamDetail.teamImageUrl ? `url(${showTeamDetail.teamImageUrl}) center/cover` : `linear-gradient(135deg, #059669, #047857)` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <button onClick={() => { setShowTeamDetail(null); setTeamDetailData(null); }} className="absolute top-4 right-4 w-8 h-8 rounded-[14px] bg-black/40 border border-white/10 flex items-center justify-center"><X size={14} className="text-white" /></button>
              <div className="absolute bottom-4 left-5 right-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-emerald-500 px-2.5 py-1 rounded-[14px] text-white font-semibold text-[8px] uppercase">{showTeamDetail.sport.toUpperCase()}</span>
                  <span className="bg-black/40 px-2.5 py-1 rounded-[14px] text-white/80 text-[8px] font-medium">{showTeamDetail.memberCount} jugadores</span>
                </div>
                <p className="text-white text-lg font-semibold">{showTeamDetail.teamName}</p>
              </div>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {((showTeamDetail.communes && showTeamDetail.communes.length > 0) || showTeamDetail.region) && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-emerald-500 shrink-0" />
                  <span className={`text-[12px] font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    {showTeamDetail.communes?.slice(0, 3).join(", ")}{showTeamDetail.communes && showTeamDetail.communes.length > 3 ? ` +${showTeamDetail.communes.length - 3}` : ""} · {showTeamDetail.region}
                  </span>
                </div>
              )}
              {showTeamDetail.description && (
                <p className={`text-[12px] font-medium leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>{showTeamDetail.description}</p>
              )}
              {/* Team Stats */}
              {teamDetailData && (
                <div className="space-y-3">
                  {/* Captain */}
                  {(() => {
                    const ownerProfile = teamDetailData.profiles[teamDetailData.team.ownerId];
                    const ownerName = ownerProfile?.displayName || teamDetailData.team.ownerId.slice(0, 8);
                    return (
                      <div className="space-y-1.5">
                        <p className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>CAPITÁN</p>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-[14px] overflow-hidden shrink-0" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
                            {ownerProfile?.photoURL ? <img src={ownerProfile.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User size={14} className={isDark ? "text-slate-400" : "text-slate-500"} /></div>}
                          </div>
                          <span className={`text-[13px] font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{ownerName}</span>
                        </div>
                      </div>
                    );
                  })()}
                  {/* Average OVR */}
                  {(() => {
                    const ovrs = teamDetailData.team.members.map((mid: string) => teamDetailData.profiles[mid]?.ovr || 40);
                    const avg = Math.round(ovrs.reduce((a: number, b: number) => a + b, 0) / ovrs.length);
                    return (
                      <div className="flex items-center justify-between p-3 rounded-[14px]" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC" }}>
                        <p className={`text-[10px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>OVR PROMEDIO</p>
                        <span className="text-emerald-500 text-[16px] font-bold">{avg}</span>
                      </div>
                    );
                  })()}
                  {/* Member list */}
                  <div className="space-y-1.5">
                    <p className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>JUGADORES ({teamDetailData.team.members.length})</p>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                      {teamDetailData.team.members.map((mid: string) => {
                        const p = teamDetailData.profiles[mid] || {};
                        const isOwner = mid === teamDetailData.team.ownerId;
                        return (
                          <div key={mid} className="flex items-center gap-2.5 p-2 rounded-[14px]" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "transparent" }}>
                            <div className="w-8 h-8 rounded-[14px] overflow-hidden shrink-0" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
                              {p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" /> : <User size={14} className={isDark ? "text-slate-400" : "text-slate-500"} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-medium truncate ${isDark ? "text-slate-200" : "text-slate-700"}`}>{p.displayName || mid.slice(0, 8)}{isOwner ? " (C)" : ""}</p>
                            </div>
                            <span className="text-emerald-500 text-[11px] font-semibold shrink-0">OVR {p.ovr || 40}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {!teamDetailData && (
                <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
              )}
              <button onClick={() => { if (!teamDetailData) return; const e = showTeamDetail; setShowTeamDetail(null); setTeamDetailData(null); handleChallenge(e); }} disabled={actionLoading || !teamDetailData}
                className="w-full h-12 rounded-[14px] bg-emerald-500 text-white font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-500/25">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Swords size={16} /> Retar a este equipo</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Detail Modal */}
      {showPlayerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => setShowPlayerDetail(null)}>
          <div className={`w-full max-w-sm rounded-[14px] overflow-hidden border shadow-2xl ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            {/* Photo 1:1 */}
            <div className="relative w-full" style={{ aspectRatio: "1/1", background: showPlayerDetail.photoURL ? `url(${showPlayerDetail.photoURL}) center/cover` : `linear-gradient(135deg, #059669, #047857)` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <button onClick={() => setShowPlayerDetail(null)} className="absolute top-4 right-4 w-8 h-8 rounded-[14px] bg-black/40 border border-white/10 flex items-center justify-center"><X size={14} className="text-white" /></button>
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-white text-xl font-semibold">{showPlayerDetail.displayName}</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Position & OVR row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-[14px] ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>{showPlayerDetail.position || "Jugador"}</span>
                  <span className={`text-[9px] font-medium px-2 py-0.5 rounded-[14px] ${isDark ? "bg-white/[0.06] text-slate-400" : "bg-slate-100 text-slate-500"}`}>{showPlayerDetail.tier}</span>
                </div>
                <span className="text-emerald-500 text-[17px] font-bold">OVR {showPlayerDetail.ovr}</span>
              </div>
              {/* Detail rows */}
              {showPlayerDetail.sports && showPlayerDetail.sports.length > 0 && (
                <div className="space-y-1.5">
                  <p className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>DEPORTES</p>
                  <div className="flex flex-wrap gap-1.5">
                    {showPlayerDetail.sports.map(s => <span key={s} className={`text-[11px] font-medium px-2.5 py-1 rounded-[14px] ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>{s}</span>)}
                  </div>
                </div>
              )}
              {((showPlayerDetail.communes && showPlayerDetail.communes.length > 0) || showPlayerDetail.region) && (
                <div className="space-y-1.5">
                  <p className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>UBICACIÓN</p>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-emerald-500 shrink-0" />
                    <span className={`text-[12px] font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>{showPlayerDetail.communes?.slice(0, 2).join(", ")} · {showPlayerDetail.region}</span>
                  </div>
                </div>
              )}
              {showPlayerDetail.description && (
                <div className="space-y-1.5">
                  <p className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>COMENTARIO</p>
                  <p className={`text-[12px] font-medium leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>{showPlayerDetail.description}</p>
                </div>
              )}
              <button onClick={() => { const e = showPlayerDetail; setShowPlayerDetail(null); handleContact(e); }} disabled={actionLoading}
                className="w-full h-12 rounded-[14px] bg-emerald-500 text-white font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-500/25">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><MessageCircle size={16} /> Contactar Jugador</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => setEditEntry(null)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <p className={`font-semibold text-[15px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Editar Publicación</p>
              <button onClick={() => setEditEntry(null)} className="w-8 h-8 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}><X size={14} /></button>
            </div>
            <div className={`p-4 rounded-[14px] mb-4 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
              <p className={`font-semibold text-sm ${isDark ? "text-slate-100" : "text-slate-900"}`}>{editEntry.type === "team" ? editEntry.teamName : "Disponible como jugador"}</p>
              <p className={`text-[9px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{editEntry.sport || editEntry.sports?.join(", ")}</p>
            </div>
            {/* Edit Sport for team */}
            {editEntry.type === "team" && (
              <div className="mb-4">
                <label className={`text-[9px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Deporte</label>
                <div className="relative">
                  <select value={editSport} onChange={e => setEditSport(e.target.value)}
                    className={`w-full h-11 rounded-[14px] px-4 text-sm font-semibold outline-none appearance-none cursor-pointer border ${isDark ? "bg-[#0F172A]/90 text-slate-200 border-white/[0.06]" : "bg-white/80 text-slate-900 border-slate-200/60"} backdrop-blur-xl`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px' }}>
                    {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}
            {/* Edit Sports for player */}
            {editEntry.type === "player" && (
              <div className="mb-4">
                <label className={`text-[9px] font-semibold uppercase tracking-wider mb-2 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Deportes</label>
                <div className="flex flex-wrap gap-2">
                  {SPORTS.map(s => (
                    <button key={s} onClick={() => setEditSports(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                      className={`px-3 py-1.5 rounded-[14px] text-[10px] font-semibold transition-all ${editSports.includes(s) ? "bg-emerald-500 text-white" : isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-600"}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="mb-5">
              <label className={`text-[9px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Descripción</label>
              <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descripción de tu publicación"
                className={`w-full h-11 rounded-[14px] px-4 text-sm font-semibold outline-none border ${isDark ? "bg-[#0F172A]/90 text-slate-200 border-white/[0.06] placeholder-slate-500" : "bg-white/80 text-slate-900 border-slate-200/60 placeholder-slate-400"} backdrop-blur-xl`} />
            </div>
            <button onClick={handleEditSave} disabled={actionLoading}
              className="w-full h-12 rounded-[14px] bg-emerald-500 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-500/25 flex items-center justify-center">
              {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Guardar Cambios"}
            </button>
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6" onClick={() => setFeedback(null)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border text-center ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`w-14 h-14 rounded-[14px] flex items-center justify-center mx-auto mb-4 ${feedback.type === "success" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              {feedback.type === "success" ? <CheckCircle2 size={28} className="text-emerald-500" /> : <X size={28} className="text-red-500" />}
            </div>
            <p className={`text-sm font-semibold mb-4 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{feedback.msg}</p>
            <button onClick={() => setFeedback(null)} className={`w-full py-3 rounded-[14px] font-semibold text-sm ${feedback.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}
