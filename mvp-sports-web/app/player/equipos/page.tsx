"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Users, X, ArrowRight, LogIn, Swords } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { teamService } from "@/services/player/teamService";
import { FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon } from "@/components/icons/SportsIcons";

const SPORTS_CONFIG = [
  { key: "futbol", label: "Fútbol", icon: FutbolIcon },
  { key: "futbolito", label: "Futbolito", icon: FutbolIcon },
  { key: "padel", label: "Pádel", icon: PadelIcon },
  { key: "tenis", label: "Tenis", icon: TenisIcon },
  { key: "basquetbol", label: "Básquetbol", icon: BasquetbolIcon },
  { key: "voleibol", label: "Voleibol", icon: VoleibolIcon },
];

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

function Modal({ isOpen, onClose, children, isDark }: { isOpen: boolean; onClose: () => void; children: React.ReactNode; isDark: boolean }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6" onClick={onClose}>
      <div className={`w-full max-w-md rounded-[14px] p-6 ${isDark ? "bg-[#0F172A] border border-white/[0.06]" : "bg-white border border-slate-200"} shadow-2xl`} onClick={(e) => e.stopPropagation()}>
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
      setFeedback({ type: "success", msg: `¡Te has unido a ${team.name}!` });
    } catch { setFeedback({ type: "error", msg: "No pudimos procesar la solicitud." }); }
    finally { setActionLoading(false); }
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <button onClick={() => router.push("/player")} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center">Equipos</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-3 pb-8 space-y-2">
        {/* Action Buttons */}
        <button onClick={() => setShowCreateModal(true)} className="w-full group">
          <div className={`rounded-[14px] overflow-hidden transition-all duration-200 group-hover:scale-[1.01] active:scale-[0.99] ${isDark ? "bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.06]" : "bg-white/80 backdrop-blur-xl border border-slate-200/60"} shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"}`}>
            <div className="p-4 flex items-center gap-4">
              <div className="w-[46px] h-[46px] rounded-[14px] bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
                <Plus color="white" size={22} strokeWidth={2.5} />
              </div>
              <div className="text-left flex-1">
                <p className={`font-semibold text-[13px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Crear Equipo</p>
                <p className={`text-[8px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Funda tu escuadrón</p>
              </div>
              <ArrowRight size={16} className="text-emerald-500 shrink-0" />
            </div>
          </div>
        </button>
        <button onClick={() => setShowJoinModal(true)} className="w-full group">
          <div className={`rounded-[14px] overflow-hidden transition-all duration-200 group-hover:scale-[1.01] active:scale-[0.99] ${isDark ? "bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.06]" : "bg-white/80 backdrop-blur-xl border border-slate-200/60"} shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"}`}>
            <div className="p-4 flex items-center gap-4">
              <div className="w-[46px] h-[46px] rounded-[14px] bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
                <LogIn color="white" size={22} strokeWidth={2.5} />
              </div>
              <div className="text-left flex-1">
                  <p className={`font-semibold text-[13px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Unirse a Equipo</p>
                <p className={`text-[8px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Con código</p>
              </div>
              <ArrowRight size={16} className="text-emerald-500 shrink-0" />
            </div>
          </div>
        </button>

        {/* Partidos Button */}
        <button onClick={() => router.push("/player/equipos/partidos")} className="w-full group">
          <div className={`rounded-[14px] overflow-hidden transition-all duration-200 group-hover:scale-[1.01] active:scale-[0.99] ${isDark ? "bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.06]" : "bg-white/80 backdrop-blur-xl border border-slate-200/60"} shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"}`}>
            <div className="p-4 flex items-center gap-4">
              <div className="w-[46px] h-[46px] rounded-[14px] bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
                <Swords color="white" size={22} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <p className={`font-semibold text-[13px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Partidos</p>
                <p className={`text-[8px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Busca rival o jugadores disponibles</p>
              </div>
              <ArrowRight size={16} className="text-emerald-500 ml-auto shrink-0" />
            </div>
          </div>
        </button>

        <SectionPill label="Mis Escuadrones" />

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : teams.length === 0 ? (
          <div className="py-16 flex flex-col items-center">
            <Users size={40} className={isDark ? "text-slate-600" : "text-slate-300"} strokeWidth={1} />
            <p className={`text-sm font-medium mt-3 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>Aún no perteneces a ningún equipo</p>
          </div>
        ) : (
          teams.map((team) => {
            const memberCount = team.members?.length || 1;
            return (
              <Link key={team.id} href={`/player/equipos/${team.id}`} className="block">
                <GlowCard isDark={isDark}>
                  <div className="h-[140px] rounded-[14px] overflow-hidden relative" style={{ background: (team as any).imageUrl ? `url(${(team as any).imageUrl}) center/cover` : undefined }}>
                    {!(team as any).imageUrl && <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-slate-900" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-5 right-5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="bg-emerald-500 px-2.5 py-1 rounded-[14px] text-white font-semibold text-[7px] tracking-wider">{(team.sport || "POLIDEPORTIVO").toUpperCase()}</span>
                        {team.ownerId === user?.uid && <span className="bg-white/20 px-2.5 py-1 rounded-[14px] text-white font-semibold text-[7px] uppercase border border-white/20">CAPITÁN</span>}
                      </div>
                      <h3 className="text-white text-lg font-semibold">{team.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Users size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                      <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>{memberCount} JUGADORES</span>
                    </div>
                    <ArrowRight size={16} className="text-emerald-500" />
                  </div>
                </GlowCard>
              </Link>
            );
          })
        )}

        <p className={`text-center text-[8px] font-medium pt-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>
      </div>

      {/* Create Team Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} isDark={isDark}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg uppercase">Nuevo Equipo</h2>
          <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-[14px] flex items-center justify-center hover:bg-white/[0.06] transition-colors">
            <X size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
          </button>
        </div>
        <p className={`text-sm font-medium mb-5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Funda tu propio escuadrón y comienza a reclutar.</p>
        <input placeholder="Nombre del equipo" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
          className={`w-full h-12 rounded-[14px] px-4 text-base font-medium outline-none border mb-5 ${isDark ? "bg-white/[0.04] text-slate-100 placeholder-slate-600 border-white/[0.06]" : "bg-slate-50 text-slate-900 placeholder-slate-400 border-slate-200"}`}
        />
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Deporte</p>
        <div className="flex gap-2.5 mb-6 flex-wrap">
          {SPORTS_CONFIG.map((s) => {
            const SportIcon = s.icon;
            return (
              <button key={s.key} onClick={() => setNewTeamSport(s.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-semibold transition-all active:scale-95 ${newTeamSport === s.key ? "bg-emerald-500 text-white" : isDark ? "bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                <SportIcon color={newTeamSport === s.key ? "white" : isDark ? "#94a3b8" : "#64748b"} size={16} />
                {s.label}
              </button>
            );
          })}
        </div>
        <button onClick={handleCreateTeam} disabled={actionLoading || !newTeamName.trim()}
          className="w-full h-12 rounded-[14px] bg-emerald-500 text-white font-semibold text-sm uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center">
          {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Crear Equipo"}
        </button>
      </Modal>

      {/* Join by Code Modal */}
      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} isDark={isDark}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg uppercase">Unirse a Equipo</h2>
          <button onClick={() => setShowJoinModal(false)} className="w-8 h-8 rounded-[14px] flex items-center justify-center hover:bg-white/[0.06] transition-colors">
            <X size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
          </button>
        </div>
        <p className={`text-sm font-medium mb-5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Ingresa el código de invitación de tu equipo.</p>
        <input placeholder="Ej: ABC123" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6}
          className={`w-full h-12 rounded-[14px] px-4 text-lg font-semibold tracking-widest text-center uppercase outline-none border mb-5 ${isDark ? "bg-white/[0.04] text-slate-100 placeholder-slate-600 border-white/[0.06]" : "bg-slate-50 text-slate-900 placeholder-slate-400 border-slate-200"}`}
        />
        <button onClick={handleJoinByCode} disabled={actionLoading || joinCode.trim().length < 4}
          className="w-full h-12 rounded-[14px] bg-indigo-500 text-white font-semibold text-sm uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center justify-center">
          {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Unirme"}
        </button>
      </Modal>

      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed bottom-8 left-5 right-5 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`max-w-md mx-auto rounded-[14px] p-4 flex items-center gap-3 shadow-2xl backdrop-blur-xl ${feedback.type === "error" ? "bg-red-500/90 text-white" : "bg-emerald-500/90 text-white"}`}>
            <span className="flex-1 text-sm font-medium">{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100"><X size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
