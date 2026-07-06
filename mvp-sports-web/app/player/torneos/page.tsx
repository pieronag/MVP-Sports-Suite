"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trophy, Calendar, Users, Zap, Info, CreditCard, GraduationCap, Sparkles } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { tournamentService } from "@/services/player/tournamentService";

const statusMap: Record<string, string> = {
  upcoming: "PRÓXIMAMENTE", active: "EN CURSO", completed: "FINALIZADO", open: "ABIERTO",
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

function ComingSoonOverlay({ isDark, accent, title, subtitle, icon: Icon, onBack }: { isDark: boolean; accent: string; title: string; subtitle: string; icon: any; onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8" style={{ backgroundColor: isDark ? "rgba(2,6,23,0.98)" : "rgba(248,250,252,0.98)" }}>
      <div className="flex flex-col items-center max-w-sm">
        <div className="w-28 h-28 rounded-[14px] flex items-center justify-center mb-6 border-2" style={{ backgroundColor: accent + "18", borderColor: accent + "30" }}>
          <Icon size={56} strokeWidth={1.5} style={{ color: accent }} />
        </div>
        <h1 className={`text-xl font-semibold text-center uppercase tracking-tight mb-4 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</h1>
        <div className="px-4 py-1.5 rounded-[14px] mb-5" style={{ backgroundColor: accent }}>
          <span className="text-white font-semibold text-[9px] tracking-[3px] uppercase">Próximamente</span>
        </div>
        <p className={`text-sm font-medium text-center leading-relaxed max-w-xs mb-10 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{subtitle}</p>
        <button onClick={onBack} className={`w-full h-14 rounded-[14px] flex items-center justify-center border font-semibold text-sm uppercase tracking-wider transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] border-white/[0.06] text-slate-200 hover:bg-white/[0.1]" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"}`}>
          Volver
        </button>
      </div>
    </div>
  );
}

export default function TorneosPage() {
  const router = useRouter();
  const { theme } = usePlayer();
  const isDark = theme === "dark";
  const accent = "#f43f5e";

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(true);

  useEffect(() => {
    tournamentService.getTournaments().then(setTournaments).catch(console.error).finally(() => setLoading(false));
  }, []);

  const formatDate = (d: any) => {
    if (!d) return "--";
    if (d.seconds) d = new Date(d.seconds * 1000).toISOString().split("T")[0];
    const [y, m, day] = (d || "").split("-");
    if (!y || !m || !day) return d;
    const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    return `${day} ${months[parseInt(m) - 1]}`;
  };

  const getImage = (t: any) => {
    const cat = (t.category || t.sport || "").toLowerCase();
    if (cat.includes("futbol")) return "https://images.unsplash.com/photo-1574629810360-7efbbe195018";
    if (cat.includes("padel")) return "https://images.unsplash.com/photo-1595435064215-68d148332009";
    return "https://images.unsplash.com/photo-1579952975225-451631742911";
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      {showComingSoon && (
        <ComingSoonOverlay isDark={isDark} accent={accent} title="Torneos MVP" subtitle="Estamos preparando las ligas y copas más competitivas con premios exclusivos y seguimiento de estadísticas en tiempo real. ¡Prepárate para la gloria!" icon={Trophy} onBack={() => router.back()} />
      )}

      {/* Header */}
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <button onClick={() => router.back()} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center">Torneos</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-3 pb-8 space-y-5">
        {/* Hero Banner */}
        <div className="p-5 rounded-[14px]" style={{ background: `linear-gradient(135deg, ${accent}, #be123c)` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-[14px] bg-white/20 flex items-center justify-center">
              <Trophy color="white" size={20} />
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-[14px] text-white font-semibold text-[7px] tracking-wider uppercase">Temporada 2026</span>
          </div>
          <h2 className="text-white text-lg font-semibold uppercase">Gloria Máxima</h2>
          <p className="text-white/70 text-xs font-medium mt-1">Compite en la liga más prestigiosa.</p>
        </div>

        {/* Tournaments */}
        <SectionPill label="Torneos Disponibles" />

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="py-16 flex flex-col items-center">
            <Trophy size={32} className={isDark ? "text-slate-600" : "text-slate-300"} />
            <span className={`text-sm font-medium mt-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>No hay torneos disponibles</span>
          </div>
        ) : (
          tournaments.map((t) => {
            const bg = statusMap[t.status] || (t.status || "").toUpperCase();
            return (
              <GlowCard key={t.id} isDark={isDark}>
                <div className="h-[170px] rounded-[14px] overflow-hidden relative">
                  <img src={getImage(t)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                  <div className="absolute top-4 right-4 bg-black/50 px-3 py-1.5 rounded-[14px] flex items-center gap-1.5 border border-white/10">
                    <CreditCard size={11} className="text-amber-400" />
                    <span className="text-white font-semibold text-xs">${Number(t.price || 0).toLocaleString("es-CL")}</span>
                  </div>
                  <div className="absolute bottom-4 left-5 right-5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-1 rounded-[14px] text-white font-semibold text-[7px] uppercase tracking-wider" style={{ backgroundColor: accent }}>{bg}</span>
                      <span className="text-amber-400 font-semibold text-[8px] uppercase tracking-wider">{t.sport || "General"}</span>
                      {t.category && <span className="text-white/50 font-medium text-[8px] uppercase">• {t.category}</span>}
                    </div>
                    <h3 className="text-white text-lg font-semibold uppercase">{t.name}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "#E2E8F0" }}>
                    <div>
                      <span className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Inicio</span>
                      <p className={`text-sm font-medium mt-0.5 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{formatDate(t.tournamentStartDate || t.startDate)}</p>
                    </div>
                    <div className="text-center px-4 border-x" style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "#E2E8F0" }}>
                      <span className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Equipos</span>
                      <p className={`text-sm font-medium mt-0.5 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t.enrolledTeams || 0}/{t.maxTeams || "?"}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Modalidad</span>
                      <p className={`text-xs font-medium mt-0.5 uppercase ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t.type || "LIGA"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 mt-4">
                    <button className={`w-11 h-11 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
                      <Users size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
                    </button>
                    <button className={`w-11 h-11 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
                      <Info size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
                    </button>
                    <button onClick={() => setShowComingSoon(true)} className="flex-1 h-11 rounded-[14px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg" style={{ backgroundColor: accent, boxShadow: `0 4px 15px ${accent}30` }}>
                      <Zap size={16} className="text-white" />
                      <span className="text-white font-semibold text-xs uppercase tracking-wider">Inscribirse</span>
                    </button>
                  </div>
                </div>
              </GlowCard>
            );
          })
        )}

        <p className={`text-center text-[8px] font-medium pt-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>
      </div>
    </div>
  );
}
