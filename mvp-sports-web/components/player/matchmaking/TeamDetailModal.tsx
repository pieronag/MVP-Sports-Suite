"use client";
// Ficha de un equipo publicado en Partidos: zona, descripción, capitán, OVR promedio y plantel; desde aquí se desafía
import { Swords, X, User, MapPin } from "@/components/player/icons";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function TeamDetailModal({ entry, data, isDark, actionLoading, onChallenge, onClose }: {
  entry: any; data: any; isDark: boolean; actionLoading: boolean; onChallenge: (entry: any) => void; onClose: () => void;
}) {
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] px-5 py-6 animate-in fade-in duration-200" onClick={() => onClose()}>
          <div className={`w-full max-w-sm rounded-md overflow-hidden border ${isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="h-[130px] relative" style={{ background: entry.teamImageUrl ? `url(${entry.teamImageUrl}) center/cover` : `linear-gradient(135deg, #059669, #047857)` }}>
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
              <button aria-label="Cerrar" onClick={() => onClose()} className="absolute top-4 right-4 w-8 h-8 rounded-md bg-black/40 border border-white/10 flex items-center justify-center"><X size={14} className="text-white" /></button>
              <div className="absolute bottom-4 left-5 right-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-emerald-500 px-2.5 py-1 rounded-md text-white font-semibold text-[12px]">{entry.sport}</span>
                  <span className="bg-black/40 px-2.5 py-1 rounded-md text-white/80 text-[11px] font-medium">{entry.memberCount} jugadores</span>
                </div>
                <p className="text-white text-[16px] font-semibold">{entry.teamName}</p>
              </div>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {((entry.communes && entry.communes.length > 0) || entry.region) && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-emerald-500 shrink-0" />
                  <span className={`text-[11px] font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    {entry.communes?.slice(0, 3).join(", ")}{entry.communes && entry.communes.length > 3 ? ` +${entry.communes.length - 3}` : ""} · {entry.region}
                  </span>
                </div>
              )}
              {entry.description && (
                <p className={`text-[11px] font-medium leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>{entry.description}</p>
              )}
              {/* Team Stats */}
              {data && (
                <div className="space-y-3">
                  {/* Captain */}
                  {(() => {
                    const ownerProfile = data.profiles[data.team.ownerId];
                    const ownerName = ownerProfile?.displayName || "Capitán";
                    return (
                      <div className="space-y-1.5">
                        <p className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Capitán</p>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md overflow-hidden shrink-0" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
                            {ownerProfile?.photoURL ? <img src={ownerProfile.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User size={14} className={isDark ? "text-slate-400" : "text-slate-500"} /></div>}
                          </div>
                          <span className={`text-[12px] font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{ownerName}</span>
                        </div>
                      </div>
                    );
                  })()}
                  {/* Average OVR */}
                  {(() => {
                    const ovrs = data.team.members.map((mid: string) => data.profiles[mid]?.ovr || 40);
                    const avg = Math.round(ovrs.reduce((a: number, b: number) => a + b, 0) / ovrs.length);
                    return (
                      <div className="flex items-center justify-between p-3 rounded-md" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC" }}>
                        <p className={`text-[11px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>OVR PROMEDIO</p>
                        <span className="text-emerald-500 text-[15px] font-bold">{avg}</span>
                      </div>
                    );
                  })()}
                  {/* Member list */}
                  <div className="space-y-1.5">
                    <p className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>JUGADORES ({data.team.members.length})</p>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                      {data.team.members.map((mid: string) => {
                        const p = data.profiles[mid] || {};
                        const isOwner = mid === data.team.ownerId;
                        return (
                          <div key={mid} className="flex items-center gap-2.5 p-2 rounded-md" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "transparent" }}>
                            <div className="w-8 h-8 rounded-md overflow-hidden shrink-0" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
                              {p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" /> : <User size={14} className={isDark ? "text-slate-400" : "text-slate-500"} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-medium truncate ${isDark ? "text-slate-200" : "text-slate-700"}`}>{p.displayName || "Jugador MVP"}{isOwner ? " (C)" : ""}</p>
                            </div>
                            <span className="text-emerald-500 text-[11px] font-semibold shrink-0">OVR {p.ovr || 40}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {!data && (
                <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
              )}
              <button onClick={() => { if (!data) return; const e = entry; onClose(); onChallenge(e); }} disabled={actionLoading || !data}
                className="w-full h-12 rounded-md bg-emerald-500 text-white font-semibold text-[12px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Swords size={16} /> Retar a este equipo</>}
              </button>
            </div>
          </div>
        </div>
      
  );
}
