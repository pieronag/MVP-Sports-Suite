"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Users, Trophy, Shield, MessageCircle, Crown, Copy, CheckCircle2, AlertCircle, X, User, Camera, MoreHorizontal, Edit, Trash2, LogOut, Star, Zap, Image as ImageIcon } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { teamService, Team } from "@/services/player/teamService";

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

export default function EquipoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { profile, theme } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Modals
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSport, setEditSport] = useState("");

  const uid = user?.uid || "";
  const isMember = team?.members?.includes(uid) || team?.ownerId === uid;
  const isOwner = team?.ownerId === uid;
  const hasPendingRequest = team?.joinRequests?.includes(uid);

  const fetchTeam = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await teamService.getTeamById(id);
      setTeam(data);
      if (data?.members) {
        const p = await teamService.getMemberProfiles(data.members);
        setProfiles(p);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleJoin = async () => {
    if (!user || !team) return;
    setActionLoading(true);
    try {
      await teamService.joinTeam(team.id, user.uid);
      setFeedback({ type: "success", msg: "Solicitud enviada. El capitán debe aceptarla." });
      fetchTeam();
    } catch (e: any) {
      setFeedback({ type: "error", msg: e.message || "Error al enviar solicitud." });
    } finally { setActionLoading(false); }
  };

  const handleAcceptRequest = async (requesterUid: string) => {
    if (!team) return;
    setActionLoading(true);
    try {
      await teamService.acceptJoinRequest(team.id, requesterUid, uid);
      setFeedback({ type: "success", msg: "¡Solicitud aceptada!" });
      fetchTeam();
    } catch { setFeedback({ type: "error", msg: "Error al aceptar solicitud." }); }
    finally { setActionLoading(false); }
  };

  const handleRejectRequest = async (requesterUid: string) => {
    if (!team) return;
    setActionLoading(true);
    try {
      await teamService.rejectJoinRequest(team.id, requesterUid, uid);
      setFeedback({ type: "success", msg: "Solicitud rechazada." });
      fetchTeam();
    } catch { setFeedback({ type: "error", msg: "Error al rechazar solicitud." }); }
    finally { setActionLoading(false); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team) return;
    setActionLoading(true);
    try {
      await teamService.removeMember(team.id, memberId, uid);
      setFeedback({ type: "success", msg: "Miembro eliminado del equipo." });
      setShowRemoveModal(null);
      fetchTeam();
    } catch (e: any) { setFeedback({ type: "error", msg: e.message || "Error al eliminar miembro." }); }
    finally { setActionLoading(false); }
  };

  const handleLeave = async () => {
    if (!team) return;
    setActionLoading(true);
    try {
      await teamService.leaveTeam(team.id, uid);
      setFeedback({ type: "success", msg: "Has abandonado el equipo." });
      setShowLeaveModal(false);
      setTimeout(() => router.push("/player/equipos"), 1000);
    } catch (e: any) { setFeedback({ type: "error", msg: e.message || "Error al abandonar." }); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!team) return;
    setActionLoading(true);
    try {
      await teamService.deleteTeam(team.id);
      setFeedback({ type: "success", msg: "Equipo eliminado." });
      setShowDeleteModal(false);
      setTimeout(() => router.push("/player/equipos"), 1000);
    } catch { setFeedback({ type: "error", msg: "Error al eliminar equipo." }); }
    finally { setActionLoading(false); }
  };

  const handleEditSave = async () => {
    if (!team) return;
    setActionLoading(true);
    try {
      await teamService.updateTeam(team.id, { name: editName, description: editDescription, sport: editSport });
      setFeedback({ type: "success", msg: "Equipo actualizado." });
      setShowEditModal(false);
      fetchTeam();
    } catch { setFeedback({ type: "error", msg: "Error al actualizar." }); }
    finally { setActionLoading(false); }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !team) return;
    setActionLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        await teamService.updateTeam(team.id, { imageUrl: reader.result as string });
        fetchTeam();
        setFeedback({ type: "success", msg: "Foto actualizada." });
      };
      reader.readAsDataURL(file);
    } catch { setFeedback({ type: "error", msg: "Error al subir foto." }); }
    finally { setActionLoading(false); }
  };

  const openEdit = () => {
    if (!team) return;
    setEditName(team.name || "");
    setEditDescription((team as any).description || "");
    setEditSport(team.sport || "");
    setShowEditModal(true);
  };

  const getProfile = (uid: string) => profiles[uid] || { uid, displayName: uid.slice(0, 8), photoURL: null, tier: "Bronce", ovr: 40 };

  const SPORTS = ["Fútbol", "Pádel", "Tenis", "Básquetbol", "Voleibol", "Futbolito"];

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-emerald-400 text-[10px] font-semibold tracking-[3px] uppercase animate-pulse">Cargando</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <p className={`text-sm font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Equipo no encontrado</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      {/* Hero with optional photo */}
      <div className="h-[200px] relative overflow-hidden" style={{ background: (team as any).imageUrl ? `url(${(team as any).imageUrl}) center/cover` : undefined }}>
        {!((team as any).imageUrl) && <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/60 to-slate-900" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-black/30 to-transparent" />
        <div className="absolute top-0 left-0 right-0 px-5 pt-12 flex justify-between">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-[14px] bg-black/30 border border-white/10 flex items-center justify-center">
            <ChevronLeft color="white" size={20} />
          </button>
          {isMember && (
            <button onClick={() => setShowMenu(true)} className="w-10 h-10 rounded-[14px] bg-black/30 border border-white/10 flex items-center justify-center">
              <MoreHorizontal color="white" size={20} />
            </button>
          )}
        </div>
        {isOwner && (
          <>
            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-16 right-6 w-10 h-10 rounded-[14px] bg-black/40 border border-white/10 flex items-center justify-center z-10">
              <Camera color="white" size={18} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </>
        )}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-emerald-500 px-3 py-1 rounded-[14px] text-white font-semibold text-[8px] uppercase tracking-wider border border-white/10">{team.sport?.toUpperCase() || "GENERAL"}</span>
          </div>
          <h1 className="text-white text-xl font-semibold uppercase">{team.name}</h1>
        </div>
      </div>

      <div className="px-5 pb-8 -mt-6 relative z-10 space-y-4">
        {/* Stats */}
        <div className="flex gap-3">
          <GlowCard isDark={isDark} className="flex-1">
            <div className="p-4 flex flex-col items-center text-center">
              <Users size={20} className="text-emerald-500" />
              <p className={`text-lg font-semibold mt-1.5 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{team.members?.length || 1}</p>
              <p className={`text-[7px] font-semibold uppercase tracking-wider mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>MIEMBROS</p>
            </div>
          </GlowCard>
          <GlowCard isDark={isDark} className="flex-1">
            <div className="p-4 flex flex-col items-center text-center">
              <Trophy size={20} className="text-amber-500" />
              <p className={`text-sm font-semibold mt-2 uppercase ${isDark ? "text-slate-100" : "text-slate-900"}`}>{(((team as any).trophies || 0)).toString()}</p>
              <p className={`text-[7px] font-semibold uppercase tracking-wider mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>TROFEOS</p>
            </div>
          </GlowCard>
          <button onClick={() => { if (team.inviteCode) { navigator.clipboard.writeText(team.inviteCode); setFeedback({ type: "success", msg: "¡Código copiado!" }); } }} className="flex-1">
            <GlowCard isDark={isDark}>
              <div className="p-4 flex flex-col items-center text-center">
                <Copy size={18} className="text-emerald-500" />
                <p className="text-emerald-500 text-sm font-semibold mt-1.5 tracking-wide">{team.inviteCode || "----"}</p>
                <p className={`text-[7px] font-semibold uppercase tracking-wider mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>CÓDIGO</p>
              </div>
            </GlowCard>
          </button>
        </div>

        {/* Action Button */}
        {isMember ? (
          <button onClick={() => router.push(`/player/equipos/chat?teamId=${team.id}&teamName=${encodeURIComponent(team.name || "")}`)}
            className="w-full h-12 rounded-[14px] bg-emerald-500 text-white font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25">
            <MessageCircle size={18} /> Chat del Equipo
          </button>
        ) : hasPendingRequest ? (
          <div className="w-full h-12 rounded-[14px] flex items-center justify-center gap-2.5 border font-semibold text-sm uppercase tracking-wider"
            style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0", color: isDark ? "#94A3B8" : "#64748B" }}>
            <AlertCircle size={16} /> Solicitud Pendiente
          </div>
        ) : (
          <button onClick={handleJoin} disabled={actionLoading}
            className="w-full h-12 rounded-[14px] bg-emerald-500 text-white font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25 disabled:opacity-50">
            {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Shield size={18} /> Solicitar Ingreso</>}
          </button>
        )}

        {/* Pending Requests (captain only) */}
        {isOwner && team.joinRequests && team.joinRequests.length > 0 && (
          <>
            <SectionPill label="Solicitudes Pendientes" />
            <GlowCard isDark={isDark}>
              <div className="divide-y divide-emerald-500/5">
                {(team.joinRequests || []).map((reqUid: string) => {
                  const reqProfile = getProfile(reqUid);
                  return (
                    <div key={reqUid} className="flex items-center gap-3 px-5 py-4">
                      <div className="w-10 h-10 rounded-[14px] overflow-hidden flex items-center justify-center shrink-0" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
                        {reqProfile.photoURL ? <img src={reqProfile.photoURL} alt="" className="w-full h-full object-cover" /> : <User size={18} className={isDark ? "text-slate-400" : "text-slate-500"} />}
                      </div>
                      <span className={`text-sm font-medium flex-1 ${isDark ? "text-slate-200" : "text-slate-800"}`}>{reqProfile.displayName}</span>
                      <button onClick={() => handleAcceptRequest(reqUid)} disabled={actionLoading} className="w-9 h-9 rounded-[14px] bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      </button>
                      <button onClick={() => handleRejectRequest(reqUid)} disabled={actionLoading} className="w-9 h-9 rounded-[14px] bg-red-500/10 flex items-center justify-center">
                        <X size={16} className="text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </GlowCard>
          </>
        )}

        {/* Members roster */}
        <SectionPill label="Plantilla" />
        <GlowCard isDark={isDark}>
          <div className="divide-y divide-emerald-500/5">
            {(team.members || []).map((memberId: string) => {
              const p = getProfile(memberId);
              const isMemberOwner = memberId === team.ownerId;
              return (
                <div key={memberId} className="flex items-center gap-3 px-5 py-4">
                  <div className="w-11 h-11 rounded-[14px] overflow-hidden shrink-0 relative" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
                    {p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User size={20} className={isDark ? "text-slate-400" : "text-slate-500"} /></div>}
                    {isMemberOwner && <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border-2" style={{ borderColor: isDark ? "#0F172A" : "white" }}><Crown color="white" size={8} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{p.displayName || memberId.slice(0, 8)}</p>
                      {isMemberOwner && <span className="text-[7px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-[14px] bg-amber-500/15 text-amber-500">Capitán</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-[14px] ${isDark ? "bg-white/[0.06] text-slate-400" : "bg-slate-100 text-slate-500"}`}>{p.tier || "Bronce"}</span>
                      <span className="text-emerald-500 text-[8px] font-semibold">OVR {p.ovr || 40}</span>
                    </div>
                  </div>
                  {isOwner && !isMemberOwner && (
                    <button onClick={() => setShowRemoveModal(memberId)} className="w-8 h-8 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F1F5F9" }}>
                      <X size={14} className="text-red-400" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </GlowCard>

        <p className={`text-center text-[8px] font-medium pt-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>
      </div>

      {/* Options Menu Modal */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[14px] overflow-hidden" style={{ backgroundColor: isDark ? "#0F172A" : "white" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0" }}>
              <p className={`font-semibold text-center ${isDark ? "text-slate-100" : "text-slate-900"}`}>Opciones del Equipo</p>
            </div>
            {isOwner && (
              <button onClick={() => { setShowMenu(false); openEdit(); }} className="flex items-center gap-4 w-full px-6 py-4 transition-all hover:bg-white/[0.02]">
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-blue-500/10"><Edit size={20} className="text-blue-400" /></div>
                <span className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>Editar Equipo</span>
              </button>
            )}
            {!isOwner && (
              <button onClick={() => { setShowMenu(false); setShowLeaveModal(true); }} className="flex items-center gap-4 w-full px-6 py-4 transition-all hover:bg-white/[0.02]">
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-red-500/10"><LogOut size={20} className="text-red-400" /></div>
                <span className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>Salir del Equipo</span>
              </button>
            )}
            {isOwner && (
              <button onClick={() => { setShowMenu(false); setShowDeleteModal(true); }} className="flex items-center gap-4 w-full px-6 py-4 transition-all hover:bg-white/[0.02]">
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-red-500/10"><Trash2 size={20} className="text-red-400" /></div>
                <span className="text-sm font-medium text-red-400">Eliminar Equipo</span>
              </button>
            )}
            <button onClick={() => setShowMenu(false)} className="w-full py-4 text-center text-sm font-semibold border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0", color: isDark ? "#94A3B8" : "#64748B" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => setShowEditModal(false)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <p className={`font-semibold text-base ${isDark ? "text-slate-100" : "text-slate-900"}`}>Editar Equipo</p>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}><X size={16} className={isDark ? "text-slate-400" : "text-slate-500"} /></button>
            </div>
            <div className="mb-4">
              <label className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Nombre</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} className={`w-full p-3.5 text-sm font-medium rounded-[14px] border outline-none ${isDark ? "bg-[#0F172A] text-slate-100 border-white/[0.06]" : "bg-white text-slate-900 border-slate-200"}`} />
            </div>
            <div className="mb-4">
              <label className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Descripción</label>
              <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} className={`w-full p-3.5 text-sm font-medium rounded-[14px] border outline-none resize-none ${isDark ? "bg-[#0F172A] text-slate-100 border-white/[0.06]" : "bg-white text-slate-900 border-slate-200"}`} />
            </div>
            <div className="mb-6">
              <label className={`text-[10px] font-semibold uppercase tracking-wider mb-2 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Deporte</label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map(s => (
                  <button key={s} onClick={() => setEditSport(s)} className={`px-4 py-2 rounded-[14px] text-xs font-semibold transition-all ${editSport === s ? "bg-emerald-500 text-white" : isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-600"}`}>{s}</button>
                ))}
              </div>
            </div>
            <button onClick={handleEditSave} disabled={actionLoading || !editName.trim()} className="w-full py-3.5 rounded-[14px] bg-emerald-500 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-500/25">
              {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : "Guardar Cambios"}
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6" onClick={() => setShowDeleteModal(false)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border text-center ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-[14px] bg-red-500/10 flex items-center justify-center mx-auto mb-4"><Trash2 size={32} className="text-red-500" /></div>
            <p className={`text-base font-semibold mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>¿Eliminar Equipo?</p>
            <p className={`text-sm font-medium mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Esta acción es irreversible. Se perderán todos los datos del equipo.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className={`flex-1 py-3.5 rounded-[14px] font-semibold text-sm ${isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-700"}`}>Cancelar</button>
              <button onClick={handleDelete} disabled={actionLoading} className="flex-1 py-3.5 rounded-[14px] bg-red-500 text-white font-semibold text-sm disabled:opacity-50">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : "SI, ELIMINAR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6" onClick={() => setShowLeaveModal(false)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border text-center ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-[14px] bg-red-500/10 flex items-center justify-center mx-auto mb-4"><LogOut size={32} className="text-red-500" /></div>
            <p className={`text-base font-semibold mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>¿Abandonar Equipo?</p>
            <p className={`text-sm font-medium mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Si abandonas, necesitarás que el capitán te acepte de nuevo.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLeaveModal(false)} className={`flex-1 py-3.5 rounded-[14px] font-semibold text-sm ${isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-700"}`}>Cancelar</button>
              <button onClick={handleLeave} disabled={actionLoading} className="flex-1 py-3.5 rounded-[14px] bg-red-500 text-white font-semibold text-sm disabled:opacity-50">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : "SI, ABANDONAR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6" onClick={() => setShowRemoveModal(null)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border text-center ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-[14px] bg-red-500/10 flex items-center justify-center mx-auto mb-4"><X size={32} className="text-red-500" /></div>
            <p className={`text-base font-semibold mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>¿Eliminar miembro?</p>
            <p className={`text-sm font-medium mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowRemoveModal(null)} className={`flex-1 py-3.5 rounded-[14px] font-semibold text-sm ${isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-700"}`}>Cancelar</button>
              <button onClick={() => handleRemoveMember(showRemoveModal)} disabled={actionLoading} className="flex-1 py-3.5 rounded-[14px] bg-red-500 text-white font-semibold text-sm disabled:opacity-50">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : "SI, ELIMINAR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6" onClick={() => setFeedback(null)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border text-center ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`w-16 h-16 rounded-[14px] flex items-center justify-center mx-auto mb-4 ${feedback.type === "success" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              {feedback.type === "success" ? <CheckCircle2 size={32} className="text-emerald-500" /> : <AlertCircle size={32} className="text-red-500" />}
            </div>
            <p className={`text-base font-semibold mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{feedback.type === "success" ? "¡Hecho!" : "Error"}</p>
            <p className={`text-sm font-medium mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{feedback.msg}</p>
            <button onClick={() => setFeedback(null)} className={`w-full py-3.5 rounded-[14px] font-semibold text-sm ${feedback.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}
