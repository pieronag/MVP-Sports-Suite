"use client";
import { GlowCard, SectionPill } from "@/components/player/ui";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Users, X, ArrowRight, LogIn, Swords } from "@/components/player/icons";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { teamService } from "@/services/client/player/teamService";
import { FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon } from "@/components/icons/SportsIcons";

const SPORTS_CONFIG = [
  { key: "futbol", label: "Fútbol", icon: FutbolIcon },
  { key: "futbolito", label: "Futbolito", icon: FutbolIcon },
  { key: "padel", label: "Pádel", icon: PadelIcon },
  { key: "tenis", label: "Tenis", icon: TenisIcon },
  { key: "basquetbol", label: "Básquetbol", icon: BasquetbolIcon },
  { key: "voleibol", label: "Vóleibol", icon: VoleibolIcon },
];



function Modal({ isOpen, onClose, children, isDark }: { isOpen: boolean; onClose: () => void; children: React.ReactNode; isDark: boolean }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] px-5 py-6 animate-in fade-in duration-200" onClick={onClose}>
      <div className={`w-full max-w-md rounded-md p-6 ${isDark ? "bg-[#0A101D] border border-white/6" : "bg-white border border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function EquiposExplorePage() {
  const router = useRouter();
  const { profile, theme } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamSport, setNewTeamSport] = useState("futbol");
  const [joinCode, setJoinCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchTeams = async () => {
    if (!user) return;
    setLoading(true);
    try { const data = await teamService.getUserTeams(user.uid); setTeams(data); }
    catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, [user]);

  const handleCreateTeam = async () => {
    if (!user || !newTeamName.trim()) return;
    setActionLoading(true);
    try {
      await teamService.createTeam({ name: newTeamName.trim(), sport: newTeamSport, ownerId: user.uid });
      setShowCreateModal(false); setNewTeamName(""); fetchTeams();
    } catch { }
    finally { setActionLoading(false); }
  };

  const handleJoinByCode = async () => {
    if (!user || !joinCode.trim()) return;
    setActionLoading(true);
    try {
      const team = await teamService.getTeamByInviteCode(joinCode.trim());
      if (!team) { setFeedback({ type: "error", msg: "Código inválido. Verifica e intenta de nuevo." }); return; }
      await teamService.joinTeam(team.id, user.uid);
      setShowJoinModal(false); setJoinCode(""); fetchTeams();
      setFeedback({ type: "success", msg: `Solicitud enviada a ${team.name}. El capitán debe aceptarte.` });
    } catch (e: any) { setFeedback({ type: "error", msg: e?.message || "No pudimos procesar la solicitud." }); }
    finally { setActionLoading(false); }
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <button aria-label="Volver" onClick={() => router.push("/player")} className={`w-10 h-10 rounded-md flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/6 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-heading font-black text-[18px] tracking-tight flex-1 text-center">Equipos</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-3 pb-8 space-y-2">
        {/* Action Buttons */}
        <button onClick={() => setShowCreateModal(true)} className="w-full group">
          <div className={`rounded-md overflow-hidden transition-all duration-200 group-hover:scale-[1.01] active:scale-[0.99] ${isDark ? "bg-[#0A101D] border border-white/6" : "bg-white border border-slate-200"} ${isDark ? "shadow-black/20" : "shadow-slate-200/50"}`}>
            <div className="p-4 flex items-center gap-4">
              <div className="w-[46px] h-[46px] rounded-md bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                <Plus color="white" size={22} strokeWidth={2.5} />
              </div>
              <div className="text-left flex-1">
                <p className={`font-semibold text-[12px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Crear equipo</p>
                <p className={`text-[11px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Funda tu escuadrón</p>
              </div>
              <ArrowRight size={16} className="text-emerald-500 shrink-0" />
            </div>
          </div>
        </button>
        <button onClick={() => setShowJoinModal(true)} className="w-full group">
          <div className={`rounded-md overflow-hidden transition-all duration-200 group-hover:scale-[1.01] active:scale-[0.99] ${isDark ? "bg-[#0A101D] border border-white/6" : "bg-white border border-slate-200"} ${isDark ? "shadow-black/20" : "shadow-slate-200/50"}`}>
            <div className="p-4 flex items-center gap-4">
              <div className="w-[46px] h-[46px] rounded-md bg-blue-600 flex items-center justify-center shrink-0">
                <LogIn color="white" size={22} strokeWidth={2.5} />
              </div>
              <div className="text-left flex-1">
                  <p className={`font-semibold text-[12px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Unirse a equipo</p>
                <p className={`text-[11px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Con código</p>
              </div>
              <ArrowRight size={16} className="text-emerald-500 shrink-0" />
            </div>
          </div>
        </button>

        {/* Partidos Button */}
        <button onClick={() => router.push("/player/equipos/partidos")} className="w-full group">
          <div className={`rounded-md overflow-hidden transition-all duration-200 group-hover:scale-[1.01] active:scale-[0.99] ${isDark ? "bg-[#0A101D] border border-white/6" : "bg-white border border-slate-200"} ${isDark ? "shadow-black/20" : "shadow-slate-200/50"}`}>
            <div className="p-4 flex items-center gap-4">
              <div className="w-[46px] h-[46px] rounded-md bg-linear-to-br from-amber-500 to-rose-500 flex items-center justify-center shrink-0">
                <Swords color="white" size={22} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <p className={`font-semibold text-[12px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Partidos</p>
                <p className={`text-[11px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Busca rival o jugadores disponibles</p>
              </div>
              <ArrowRight size={16} className="text-emerald-500 ml-auto shrink-0" />
            </div>
          </div>
        </button>

        <SectionPill label="Mis escuadrones" />

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : teams.length === 0 ? (
          <div className="py-16 flex flex-col items-center">
            <Users size={40} className={isDark ? "text-slate-600" : "text-slate-300"} strokeWidth={1} />
            <p className={`text-[13px] font-medium mt-3 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>Aún no perteneces a ningún equipo</p>
          </div>
        ) : (
          teams.map((team) => {
            const memberCount = team.members?.length || 1;
            return (
              <Link key={team.id} href={`/player/equipos/${team.id}`} className="block">
                <GlowCard isDark={isDark}>
                  <div className="h-[140px] rounded-md overflow-hidden relative" style={{ background: (team as any).imageUrl ? `url(${(team as any).imageUrl}) center/cover` : undefined }}>
                    {!(team as any).imageUrl && <div className="absolute inset-0 bg-linear-to-br from-emerald-900/40 to-slate-900" />}
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-5 right-5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="bg-emerald-500 px-2.5 py-1 rounded-md text-white font-semibold text-[11px]">{team.sport || "Polideportivo"}</span>
                        {team.ownerId === user?.uid && <span className="bg-white/20 px-2.5 py-1 rounded-md text-white font-semibold text-[12px] border border-white/20">Capitán</span>}
                      </div>
                      <h3 className="text-white text-[16px] font-semibold">{team.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Users size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                      <span className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>{memberCount} JUGADORES</span>
                    </div>
                    <ArrowRight size={16} className="text-emerald-500" />
                  </div>
                </GlowCard>
              </Link>
            );
          })
        )}

        <p className={`text-center text-[11px] font-medium pt-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>
      </div>

      {/* Create Team Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} isDark={isDark}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-black text-[16px]">Nuevo equipo</h2>
          <button aria-label="Cerrar" onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/6 transition-colors">
            <X size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
          </button>
        </div>
        <p className={`text-[13px] font-medium mb-5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Funda tu propio escuadrón y comienza a reclutar.</p>
        <input placeholder="Nombre del equipo" maxLength={40} value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
          className={`w-full h-12 rounded-md px-4 text-[15px] font-medium outline-hidden border mb-5 ${isDark ? "bg-white/4 text-slate-100 placeholder-slate-600 border-white/6" : "bg-slate-50 text-slate-900 placeholder-slate-400 border-slate-200"}`}
        />
        <p className={`text-[12px] font-semibold mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Deporte</p>
        <div className="flex gap-2.5 mb-6 flex-wrap">
          {SPORTS_CONFIG.map((s) => {
            const SportIcon = s.icon;
            return (
              <button key={s.key} onClick={() => setNewTeamSport(s.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-[11px] font-semibold transition-all active:scale-95 ${newTeamSport === s.key ? "bg-emerald-500 text-white" : isDark ? "bg-white/6 text-slate-400 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                <SportIcon color={newTeamSport === s.key ? "white" : isDark ? "#94a3b8" : "#64748b"} size={16} />
                {s.label}
              </button>
            );
          })}
        </div>
        <button onClick={handleCreateTeam} disabled={actionLoading || !newTeamName.trim()}
          className="w-full h-12 rounded-md bg-emerald-500 text-white font-semibold text-[13px] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center">
          {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Crear equipo"}
        </button>
      </Modal>

      {/* Join by Code Modal */}
      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} isDark={isDark}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-black text-[16px]">Unirse a equipo</h2>
          <button aria-label="Cerrar" onClick={() => setShowJoinModal(false)} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/6 transition-colors">
            <X size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
          </button>
        </div>
        <p className={`text-[13px] font-medium mb-5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Ingresa el código de invitación de tu equipo.</p>
        <input placeholder="Ej: ABC123" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6}
          className={`w-full h-12 rounded-md px-4 text-[16px] font-semibold text-center outline-hidden border mb-5 ${isDark ? "bg-white/4 text-slate-100 placeholder-slate-600 border-white/6" : "bg-slate-50 text-slate-900 placeholder-slate-400 border-slate-200"}`}
        />
        <button onClick={handleJoinByCode} disabled={actionLoading || joinCode.trim().length < 4}
          className="w-full h-12 rounded-md bg-indigo-500 text-white font-semibold text-[13px] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center">
          {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Unirme"}
        </button>
      </Modal>

      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed bottom-8 left-5 right-5 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`max-w-md mx-auto rounded-md p-4 flex items-center gap-3 ${feedback.type === "error" ? "bg-red-500/90 text-white" : "bg-emerald-500/90 text-white"}`}>
            <span className="flex-1 text-[13px] font-medium">{feedback.msg}</span>
            <button aria-label="Cerrar" onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100"><X size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
