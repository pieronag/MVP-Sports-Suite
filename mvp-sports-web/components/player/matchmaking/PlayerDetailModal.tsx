"use client";
// Ficha de un jugador disponible en Partidos: foto, posición, OVR, deportes, zona y descripción; desde aquí se le escribe
import { MessageCircle, X, MapPin } from "@/components/player/icons";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function PlayerDetailModal({ entry, isDark, actionLoading, onContact, onClose }: {
  entry: any; isDark: boolean; actionLoading: boolean; onContact: (entry: any) => void; onClose: () => void;
}) {
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] px-5 py-6 animate-in fade-in duration-200" onClick={() => onClose()}>
          <div className={`w-full max-w-sm rounded-md overflow-hidden border ${isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            {/* Photo 1:1 */}
            <div className="relative w-full" style={{ aspectRatio: "1/1", background: entry.photoURL ? `url(${entry.photoURL}) center/cover` : `linear-gradient(135deg, #059669, #047857)` }}>
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
              <button aria-label="Cerrar" onClick={() => onClose()} className="absolute top-4 right-4 w-8 h-8 rounded-md bg-black/40 border border-white/10 flex items-center justify-center"><X size={14} className="text-white" /></button>
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-white text-[18px] font-semibold">{entry.displayName}</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Position & OVR row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>{entry.position || "Jugador"}</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${isDark ? "bg-white/6 text-slate-400" : "bg-slate-100 text-slate-500"}`}>{entry.tier}</span>
                </div>
                <span className="text-emerald-500 text-[17px] font-bold">OVR {entry.ovr}</span>
              </div>
              {/* Detail rows */}
              {entry.sports && entry.sports.length > 0 && (
                <div className="space-y-1.5">
                  <p className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Deportes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.sports.map((s: string) => <span key={s} className={`text-[11px] font-medium px-2.5 py-1 rounded-md ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>{s}</span>)}
                  </div>
                </div>
              )}
              {((entry.communes && entry.communes.length > 0) || entry.region) && (
                <div className="space-y-1.5">
                  <p className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Ubicación</p>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-emerald-500 shrink-0" />
                    <span className={`text-[11px] font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>{entry.communes?.slice(0, 2).join(", ")} · {entry.region}</span>
                  </div>
                </div>
              )}
              {entry.description && (
                <div className="space-y-1.5">
                  <p className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Comentario</p>
                  <p className={`text-[11px] font-medium leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>{entry.description}</p>
                </div>
              )}
              <button onClick={() => { const e = entry; onClose(); onContact(e); }} disabled={actionLoading}
                className="w-full h-12 rounded-md bg-emerald-500 text-white font-semibold text-[12px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><MessageCircle size={16} /> Contactar Jugador</>}
              </button>
            </div>
          </div>
        </div>
      
  );
}
