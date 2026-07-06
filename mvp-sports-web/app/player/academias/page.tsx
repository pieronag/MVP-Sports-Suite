"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, GraduationCap, Sparkles, BookOpen, Award, Users } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

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

function ComingSoonOverlay({ isDark, onBack }: { isDark: boolean; onBack: () => void }) {
  const accent = "#8b5cf6";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8" style={{ backgroundColor: isDark ? "rgba(2,6,23,0.98)" : "rgba(248,250,252,0.98)" }}>
      <div className="flex flex-col items-center max-w-sm">
        <div className="w-28 h-28 rounded-[14px] flex items-center justify-center mb-6 border-2" style={{ backgroundColor: accent + "18", borderColor: accent + "30" }}>
          <GraduationCap size={56} strokeWidth={1.5} style={{ color: accent }} />
        </div>
        <h1 className={`text-xl font-semibold text-center uppercase tracking-tight mb-4 ${isDark ? "text-slate-100" : "text-slate-900"}`}>Academias MVP</h1>
        <div className="px-4 py-1.5 rounded-[14px] mb-5" style={{ backgroundColor: accent }}>
          <span className="text-white font-semibold text-[9px] tracking-[3px] uppercase">Próximamente</span>
        </div>
        <p className={`text-sm font-medium text-center leading-relaxed max-w-xs mb-10 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Entrena como un profesional con los mejores instructores. Clases grupales, seguimiento personalizado y mucho más está por llegar.
        </p>
        <button onClick={onBack} className={`w-full h-14 rounded-[14px] flex items-center justify-center border font-semibold text-sm uppercase tracking-wider transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] border-white/[0.06] text-slate-200 hover:bg-white/[0.1]" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"}`}>
          Volver
        </button>
      </div>
    </div>
  );
}

export default function AcademiasPage() {
  const router = useRouter();
  const { theme } = usePlayer();
  const isDark = theme === "dark";
  const accent = "#8b5cf6";
  const [showComingSoon, setShowComingSoon] = useState(true);

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      {showComingSoon && <ComingSoonOverlay isDark={isDark} onBack={() => router.back()} />}

      {/* Header */}
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <button onClick={() => router.back()} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center">Academias</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-3 pb-8 space-y-5">
        {/* Hero */}
        <div className="p-5 rounded-[14px]" style={{ background: `linear-gradient(135deg, ${accent}, #6d28d9)` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-[14px] bg-white/20 flex items-center justify-center">
              <GraduationCap color="white" size={20} />
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-[14px] text-white font-semibold text-[7px] tracking-wider uppercase">Próximamente</span>
          </div>
          <h2 className="text-white text-lg font-semibold uppercase">Academias MVP</h2>
          <p className="text-white/70 text-xs font-medium mt-1">Entrena como un profesional.</p>
        </div>

        {/* Features preview */}
        <SectionPill label="Lo que se viene" />
        <GlowCard isDark={isDark}>
          <div className="p-5 space-y-4">
            {[
              { icon: BookOpen, label: "Clases grupales e individuales", sub: "Instructores certificados" },
              { icon: Award, label: "Seguimiento personalizado", sub: "Estadísticas y progreso" },
              { icon: Users, label: "Comunidad exclusiva", sub: "Compite y mejora" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}18` }}>
                  <f.icon size={18} style={{ color: accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{f.label}</p>
                  <p className={`text-[10px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        {/* Coming soon card */}
        <button onClick={() => setShowComingSoon(true)} className="w-full">
          <GlowCard isDark={isDark}>
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-[14px] flex items-center justify-center mb-4" style={{ backgroundColor: `${accent}15` }}>
                <Sparkles size={28} style={{ color: accent }} />
              </div>
              <p className={`text-sm font-medium mb-1 ${isDark ? "text-slate-100" : "text-slate-900"}`}>Pronto disponibles</p>
              <p className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Toca para más información
              </p>
            </div>
          </GlowCard>
        </button>

        <p className={`text-center text-[8px] font-medium pt-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>
      </div>
    </div>
  );
}
