"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { gamificationService } from "@/services/player/gamificationService";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { toPng } from "html-to-image";
import {
  ChevronLeft, Sun, Moon, Camera, Trophy, Target, Handshake, Star,
  Medal, Sparkles, Download, Activity, User as UserIcon, MapPin, Zap,
  Shield, ShieldAlert, Award, Swords, Flame, Heart, Crosshair, CircleDot,
  Sunrise, GraduationCap, Cpu, TrendingUp, Users, Sword, Play, CalendarDays, X
} from "lucide-react";

const BADGE_DEFS: { id: string; name: string; icon: any; svg?: string; color: string; stat: string }[] = [
  { id: "scorer",  name: "Artillero",     icon: Target,       svg: "/icons/logros/artillero.svg", color: "#ef4444", stat: "goals" },
  { id: "playmaker", name: "Maestro",     icon: GraduationCap, svg: "/icons/logros/maestro.svg", color: "#8b5cf6", stat: "assists" },
  { id: "defender", name: "Muralla",      icon: ShieldAlert,  svg: "/icons/logros/muralla.svg", color: "#14b8a6", stat: "clean_sheets" },
  { id: "wins",    name: "Ganador",       icon: Trophy,       svg: "/icons/logros/ganador.svg", color: "#f59e0b", stat: "won" },
  { id: "mvp",     name: "Estrella",      icon: Award,        svg: "/icons/logros/estrella.svg", color: "#10b981", stat: "mvps" },
  { id: "experience", name: "Leyenda",    icon: Play,         svg: "/icons/logros/legend.svg", color: "#3b82f6", stat: "played" },
  { id: "multi_sport", name: "Atleta Total", icon: Activity,  svg: "/icons/logros/atleta.svg", color: "#ec4899", stat: "sports_played" },
  { id: "captaincy", name: "Capitán",     icon: Shield,       svg: "/icons/logros/capitan.svg", color: "#f97316", stat: "captain_matches" },
  { id: "comeback", name: "Ave Fénix",    icon: Flame,        svg: "/icons/logros/fenix.svg", color: "#f43f5e", stat: "comebacks" },
  { id: "precision", name: "Francotirador", icon: Crosshair,  svg: "/icons/logros/francotirador.svg", color: "#06b6d4", stat: "precision_matches" },
  { id: "clutch",  name: "Clutch",        icon: Zap,          svg: "/icons/logros/clutch.svg", color: "#f59e0b", stat: "clutch_goals" },
  { id: "tournaments", name: "Competidor", icon: Swords,      svg: "/icons/logros/competidor.svg", color: "#8b5cf6", stat: "tournaments_played" },
  { id: "invictus", name: "Invicto",      icon: Flame,        svg: "/icons/logros/invicto.svg", color: "#10b981", stat: "longest_win_streak" },
  { id: "rivalry", name: "Verdugo",       icon: Sword,        svg: "/icons/logros/verdugo.svg", color: "#ef4444", stat: "rivalries_won" },
  { id: "morning_player", name: "Madrugador", icon: Sunrise,  svg: "/icons/logros/madrugador.svg", color: "#f59e0b", stat: "morning_matches" },
  { id: "night_player", name: "Nocturno", icon: Moon,         svg: "/icons/logros/nocturno.svg", color: "#3b82f6", stat: "night_matches" },
  { id: "loyal",   name: "Fiel",          icon: Heart,        color: "#ec4899", stat: "loyalty" },
  { id: "weekend_warrior", name: "Guerrero FDS", icon: CalendarDays, color: "#14b8a6", stat: "weekend_matches" },
  { id: "stamina", name: "Motor",         icon: Cpu,          svg: "/icons/logros/motor.svg", color: "#f97316", stat: "minutes_played" },
  { id: "social",  name: "Sociable",      icon: Users,        svg: "/icons/logros/sociable.svg", color: "#3b82f6", stat: "invited_players" },
];

const BADGE_GLOSSARY_DATA = [
  { id: "scorer", icon: Target, svg: "/icons/logros/artillero.svg", name: "Artillero", desc: "Anota puntos o goles en tus partidos", unit: "Goles", dbKey: "goals" },
  { id: "playmaker", icon: GraduationCap, svg: "/icons/logros/maestro.svg", name: "Maestro", desc: "Suma asistencias y pases clave", unit: "Asistencias", dbKey: "assists" },
  { id: "defender", icon: ShieldAlert, svg: "/icons/logros/muralla.svg", name: "Muralla", desc: "Logra defensas o vallas invictas", unit: "Defensas", dbKey: "clean_sheets" },
  { id: "wins", icon: Trophy, svg: "/icons/logros/ganador.svg", name: "Ganador", desc: "Acumula partidos ganados", unit: "Victorias", dbKey: "won" },
  { id: "mvp", icon: Award, svg: "/icons/logros/estrella.svg", name: "Estrella", desc: "Sé elegido Mejor Jugador del partido", unit: "MVPs", dbKey: "mvps" },
  { id: "experience", icon: Play, svg: "/icons/logros/legend.svg", name: "Leyenda", desc: "Disputa la mayor cantidad de partidos", unit: "Partidos", dbKey: "played" },
  { id: "multi_sport", icon: Activity, svg: "/icons/logros/atleta.svg", name: "Atleta Total", desc: "Juega partidos en diferentes deportes", unit: "Deportes", dbKey: "sports_played" },
  { id: "captaincy", icon: Shield, svg: "/icons/logros/capitan.svg", name: "Capitán", desc: "Lidera a tu equipo como capitán", unit: "Partidos", dbKey: "captain_matches" },
  { id: "comeback", icon: Flame, svg: "/icons/logros/fenix.svg", name: "Ave Fénix", desc: "Gana partidos remontando marcador", unit: "Remontadas", dbKey: "comebacks" },
  { id: "precision", icon: Crosshair, svg: "/icons/logros/francotirador.svg", name: "Francotirador", desc: "Mantén alta efectividad o precisión", unit: "Partidos", dbKey: "precision_matches" },
  { id: "clutch", icon: Zap, svg: "/icons/logros/clutch.svg", name: "Clutch", desc: "Anota puntos decisivos al final", unit: "Puntos", dbKey: "clutch_goals" },
  { id: "tournaments", icon: Swords, svg: "/icons/logros/competidor.svg", name: "Competidor", desc: "Participa en torneos y ligas", unit: "Torneos", dbKey: "tournaments_played" },
  { id: "invictus", icon: Flame, svg: "/icons/logros/invicto.svg", name: "Invicto", desc: "Logra rachas de victorias consecutivas", unit: "Racha", dbKey: "longest_win_streak" },
  { id: "rivalry", icon: Sword, svg: "/icons/logros/verdugo.svg", name: "Verdugo", desc: "Gana clásicos o revanchas", unit: "Partidos", dbKey: "rivalries_won" },
  { id: "morning_player", icon: Sunrise, svg: "/icons/logros/madrugador.svg", name: "Madrugador", desc: "Juega partidos en horario matutino", unit: "Partidos", dbKey: "morning_matches" },
  { id: "night_player", icon: Moon, svg: "/icons/logros/nocturno.svg", name: "Nocturno", desc: "Juega partidos en horario nocturno", unit: "Partidos", dbKey: "night_matches" },
  { id: "loyal", icon: Heart, name: "Fiel", desc: "Mantente activo mes a mes", unit: "Meses", dbKey: "loyalty" },
  { id: "weekend_warrior", icon: CalendarDays, name: "Guerrero FDS", desc: "Juega partidos los fines de semana", unit: "Partidos", dbKey: "weekend_matches" },
  { id: "stamina", icon: Cpu, svg: "/icons/logros/motor.svg", name: "Motor", desc: "Acumula minutos jugados en cancha", unit: "Minutos", dbKey: "minutes_played" },
  { id: "social", icon: Users, svg: "/icons/logros/sociable.svg", name: "Sociable", desc: "Invita amigos a jugar contigo", unit: "Invitados", dbKey: "invited_players" },
];

const TIERS = ["bronce", "plata", "oro", "platino", "diamante", "elite", "leyenda"];

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
    <div className="flex items-center gap-3 px-6 mb-4 mt-8">
      <div className="h-[3px] w-6 rounded-full bg-emerald-500/60" />
      <span className="text-emerald-400 font-semibold text-[10px] tracking-[3px] uppercase">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
    </div>
  );
}

export default function PerfilPage() {
  const router = useRouter();
  const { profile, theme, toggleTheme, reloadProfile } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [gamification, setGamification] = useState<any>(null);
  const [badgeConfigs, setBadgeConfigs] = useState<Record<string, any>>({});
  const [generatingCard, setGeneratingCard] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);

  useEffect(() => {
    Promise.all([
      gamificationService.getSettings(),
      getDoc(doc(db, "settings", "global")),
    ]).then(([gami, settingsSnap]) => {
      setGamification(gami);
      if (settingsSnap.exists()) {
        const bg = settingsSnap.data()?.gamification?.badges || settingsSnap.data()?.badges || {};
        setBadgeConfigs(bg);
      }
    });
  }, []);

  const xp = profile?.xp || 0;
  const tierInfo = gamification
    ? gamificationService.calculateTier(xp, gamification)
    : { name: "Bronce", index: 0 };
  const ovr = gamification ? gamificationService.calculateOVR(xp, gamification) : 40;
  const displayName = profile?.displayName || profile?.fullName || user?.displayName || "Jugador";
  const userEmail = profile?.email || user?.email || "";
  const photoURL = profile?.photoURL || user?.photoURL || "";
  const city = (profile as any)?.city || "";
  const sRaw = profile?.stats || {};
  const stats = {
    matchesPlayed: (sRaw as any).played ?? (sRaw as any).matchesPlayed ?? 0,
    matchesWon: (sRaw as any).won ?? (sRaw as any).matchesWon ?? 0,
    goals: (sRaw as any).goals ?? 0,
    assists: (sRaw as any).assists ?? 0,
    mvps: (sRaw as any).mvp ?? (sRaw as any).mvps ?? 0,
  };

  const handlePickImage = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await updateDoc(doc(db, "users", user.uid), { photoURL: base64 });
        await reloadProfile();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateCard = useCallback(async () => {
    if (!cardRef.current) return;
    setGeneratingCard(true);
    try {
      // Wait a frame for rendering to settle (font loading, image rasterization)
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#020617",
      });
      setPreviewUri(dataUrl);
      setShowPreview(true);
    } catch (err) {
      console.error("Error generating card:", err);
    } finally {
      setGeneratingCard(false);
    }
  }, []);

  const handleDownloadCard = useCallback(async () => {
    if (!previewUri) return;
    // Try Web Share API first (saves to gallery on iOS)
    if (navigator.share) {
      try {
        const blob = await (await fetch(previewUri)).blob();
        const file = new File([blob], `MVP-CARD-${displayName.replace(/\s+/g, "-").toUpperCase()}.png`, { type: "image/png" });
        await navigator.share({ files: [file], title: "MVP Card", text: "Mi carta MVP 2026" });
        return;
      } catch {
        // User cancelled or share failed, fall through to download
      }
    }
    // Fallback: download as PNG
    const link = document.createElement("a");
    link.download = `MVP-CARD-${displayName.replace(/\s+/g, "-").toUpperCase()}.png`;
    link.href = previewUri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [previewUri, displayName]);

  const statRows = [
    { src: "/icons/partidos.svg", color: "#3b82f6", label: "Partidos Jugados", value: stats.matchesPlayed ?? 0 },
    { src: "/icons/victoria.svg", color: "#f59e0b", label: "Victorias Totales", value: stats.matchesWon ?? 0 },
    { src: "/icons/gol.svg", color: "#ef4444", label: "Goles", value: stats.goals ?? 0 },
    { src: "/icons/asistencia.svg", color: "#10b981", label: "Asistencias", value: stats.assists ?? 0 },
    { src: "/icons/mvp.svg", color: "#8b5cf6", label: "Premios MVP", value: stats.mvps ?? 0 },
  ];

  const statMap: Record<string, number> = {
    goals: stats.goals, assists: stats.assists, won: stats.matchesWon, mvps: stats.mvps, played: stats.matchesPlayed,
    clean_sheets: (sRaw as any).clean_sheets ?? 0, captain_matches: (sRaw as any).captain_matches ?? 0,
    loyalty: (sRaw as any).loyal ?? (sRaw as any).loyalty ?? 0, clutch_goals: (sRaw as any).clutch_goals ?? 0,
    sports_played: (sRaw as any).sports_played ?? 1, comebacks: (sRaw as any).comebacks ?? 0,
    precision_matches: (sRaw as any).precision_matches ?? 0, tournaments_played: (sRaw as any).tournaments_played ?? 0,
    longest_win_streak: (sRaw as any).longest_win_streak ?? (sRaw as any).win_streak ?? 0,
    rivalries_won: (sRaw as any).rivalries_won ?? 0, morning_matches: (sRaw as any).morning_matches ?? 0,
    night_matches: (sRaw as any).night_matches ?? 0, weekend_matches: (sRaw as any).weekend_matches ?? 0,
    minutes_played: (sRaw as any).minutes_played ?? ((sRaw as any).played ?? 0) * 60,
    invited_players: (sRaw as any).invited_players ?? 0,
  };

  const position = (profile as any)?.position || "Jugador";
  const mainSport = (profile as any)?.mainSport || "";
  const initials = displayName.split(" ").map((w: string) => w.charAt(0).toUpperCase()).slice(0, 2).join("");

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <button onClick={() => router.back()} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center">Perfil</h1>
        <button onClick={toggleTheme} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
          {isDark ? <Moon size={18} className="text-amber-400" /> : <Sun size={18} className="text-slate-600" />}
        </button>
      </div>



      {/* Avatar Section */}
      <div className="flex flex-col items-center py-2 mb-4">
        <div className="relative mb-4">
          <div className={`w-28 h-28 rounded-[14px] overflow-hidden border-[3px] ${isDark ? "border-white/[0.08]" : "border-white"} shadow-xl ${isDark ? "shadow-black/30" : "shadow-slate-200"}`}>
            {photoURL ? (
              <Image src={photoURL} alt={displayName} width={112} height={112} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-emerald-500/10">
                <span className="text-3xl font-bold text-emerald-500">{initials}</span>
              </div>
            )}
          </div>
          <button onClick={handlePickImage} className="absolute -bottom-0.5 -right-0.5 w-10 h-10 rounded-[14px] bg-emerald-500 flex items-center justify-center border-[4px] border-[#020617] hover:bg-emerald-600 transition-colors shadow-lg">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={16} className="text-white" />
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
        <h2 className={`text-xl font-semibold uppercase ${isDark ? "text-slate-100" : "text-slate-900"}`}>{displayName}</h2>
        <p className={`text-[10px] font-medium tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>{userEmail}</p>
        {city && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={10} className="text-emerald-500" />
            <span className={`text-[9px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{city}</span>
          </div>
        )}
      </div>

      {/* Season Level */}
      <SectionPill label="Nivel de Temporada" />
      <div className="px-5 mb-6">
        <GlowCard isDark={isDark}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Rango Actual</p>
                <p className="text-emerald-500 text-lg font-semibold">{tierInfo.name}</p>
              </div>
              <div className="text-right">
                <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Próximo Rango</p>
                <p className={`text-base font-medium opacity-50 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {tierInfo.index < TIERS.length - 1 ? TIERS[tierInfo.index + 1].toUpperCase() : "LÍMITE"}
                </p>
              </div>
            </div>
            <div className="relative h-4">
              <div className={`absolute top-1/2 -translate-y-1/2 w-full h-[3px] rounded ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} />
              <div className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded bg-emerald-500 transition-all" style={{ width: `${(tierInfo.index / (TIERS.length - 1)) * 100}%` }} />
              <div className="flex justify-between absolute w-full top-0">
                {TIERS.map((t, i) => (
                  <div key={t} className={`w-3.5 h-3.5 rounded-full border-[3px] ${i <= tierInfo.index ? "bg-emerald-500 border-[#020617]" : isDark ? "bg-[#1e293b] border-[#020617]" : "bg-slate-200 border-white"}`} />
                ))}
              </div>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Stats */}
      <SectionPill label="Rendimiento" />
      <div className="px-5 mb-6">
        <GlowCard isDark={isDark}>
          <div className="divide-y divide-emerald-500/5">
            {/* OVR */}
            <div className="flex items-center justify-between px-5 py-5">
              <div>
                <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Nivel General</p>
                <p className={`text-2xl font-bold -tracking-[1px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>{ovr}</p>
              </div>
              <div className="w-10 h-10 rounded-[14px] bg-emerald-500/15 flex items-center justify-center">
                <Medal size={22} className="text-emerald-500" />
              </div>
            </div>
            {statRows.map((row, i) => (
              <div key={row.label} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${row.color}20` }}>
                  <div style={{
                    width: 18, height: 18,
                    backgroundColor: row.color,
                    mask: `url(${row.src}) center/contain no-repeat`,
                    WebkitMask: `url(${row.src}) center/contain no-repeat`,
                  }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>{row.label}</p>
                  <p className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{row.value}</p>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>
      </div>

      {/* Badges */}
      <SectionPill label="Insignias" />
      <div className="px-5 mb-8">
        <GlowCard isDark={isDark}>
          <div className="p-5">
            {(() => {
              const tierScores: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };
              const tierColors: Record<string, string> = { gold: "#fbbf24", silver: "#94a3b8", bronze: "#b45309" };
              const tierNames: Record<string, string> = { gold: "ORO", silver: "PLATA", bronze: "BRONCE" };

              const earned = BADGE_DEFS.map((badge) => {
                const config = badgeConfigs[badge.id] || { bronze: 5, silver: 15, gold: 30 };
                const val = statMap[badge.stat] ?? 0;
                let tier: string | null = null;
                if (val > 0) {
                  if (val >= (config.gold || 30)) tier = "gold";
                  else if (val >= (config.silver || 15)) tier = "silver";
                  else if (val >= (config.bronze || 5)) tier = "bronze";
                }
                return { ...badge, tier, val };
              });

              const earnedBadges = earned.filter((b) => b.tier !== null).sort((a, b) => (tierScores[b.tier!] || 0) - (tierScores[a.tier!] || 0));

              if (earnedBadges.length === 0) {
                return (
                  <div className="py-8 flex flex-col items-center">
                    <Medal size={36} className={isDark ? "text-slate-600" : "text-slate-300"} />
                    <p className={`text-[10px] font-semibold uppercase tracking-wider mt-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Juega más para desbloquear insignias</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-3 gap-3">
                  {earnedBadges.map((badge) => {
                    const c = tierColors[badge.tier!];
                    return (
                      <div key={badge.id} className="p-3.5 rounded-[14px] flex flex-col items-center border-2 transition-all"
                        style={{ backgroundColor: `${c}18`, borderColor: `${c}35` }}>
                        <div className="mb-2.5 w-9 h-9 rounded-[12px] flex items-center justify-center">
                          {badge.svg ? (
                            <div style={{ width: 24, height: 24, backgroundColor: c, mask: `url(${badge.svg}) center/contain no-repeat`, WebkitMask: `url(${badge.svg}) center/contain no-repeat` }} />
                          ) : (
                            <badge.icon size={24} style={{ color: c }} strokeWidth={1.5} />
                          )}
                        </div>
                        <p className={`text-[8px] font-semibold uppercase text-center mb-1.5 leading-tight ${isDark ? "text-slate-200" : "text-slate-800"}`}>{badge.name}</p>
                        <span className="text-[6px] font-semibold tracking-[1px] px-2 py-0.5 rounded-[14px]" style={{ backgroundColor: `${c}25`, color: c }}>{tierNames[badge.tier!]}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </GlowCard>
        <button onClick={() => setShowGlossary(true)}
          className="w-full mt-3 h-[44px] rounded-[14px] font-semibold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] border"
          style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0", backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC", color: isDark ? "#94A3B8" : "#64748B" }}>
          <Medal size={14} /> Ver Logros Disponibles
        </button>
      </div>

      {/* Tu Carta MVP */}
      <div className="flex items-center gap-3 px-6 mb-4 mt-2">
        <div className="h-[3px] w-6 rounded-full bg-emerald-500/60" />
        <span className="text-emerald-400 font-semibold text-[10px] tracking-[3px] uppercase">Tu Carta MVP</span>
        <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
      </div>

      <div className="px-5 mb-8">
        <div className={`relative rounded-[14px] overflow-hidden transition-all active:scale-[0.99] ${
          isDark
            ? "bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.06]"
            : "bg-white/80 backdrop-blur-xl border border-slate-200/60"
        } shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"}`}>
          <div className={`absolute inset-0 rounded-[14px] pointer-events-none ${isDark ? "bg-gradient-to-br from-emerald-500/[0.02] to-transparent" : "bg-gradient-to-br from-emerald-50/50 to-transparent"}`} />
          <div className={`p-5 bg-gradient-to-br ${
            isDark
              ? "from-[#0F172A] via-[#0F172A] to-[#064e3b]"
              : "from-white via-white to-[#f0fdf4]"
          }`}>
            {/* Top row: OVR + Info */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-[58px] h-[76px] bg-gradient-to-b from-amber-400 to-amber-600 rounded-[14px] flex flex-col items-center justify-center shadow-xl -rotate-[4deg] shrink-0">
                <span className="text-black/60 font-medium text-[7px] tracking-[1px]">OVR</span>
                <span className="text-black font-bold text-[22px] leading-none mt-0.5">{ovr}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-emerald-500" : "bg-emerald-600"}`} />
                  <span className={`font-semibold text-[7px] tracking-[2px] uppercase ${isDark ? "text-emerald-400/80" : "text-emerald-600/80"}`}>Valoración MVP 2026</span>
                </div>
                <p className={`font-semibold text-[16px] ${isDark ? "text-white" : "text-slate-900"}`}>{displayName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] font-medium px-2 py-0.5 rounded-[14px] bg-emerald-500/20 text-emerald-500">{tierInfo.name.toUpperCase()}</span>
                  <span className={`text-[8px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{xp.toLocaleString("es-CL")} XP</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className={`grid grid-cols-4 gap-2 pt-4 border-t ${isDark ? "border-white/[0.06]" : "border-slate-200/60"}`}>
              {[
                { label: "PARTIDOS", value: stats.matchesPlayed },
                { label: "VICTORIAS", value: stats.matchesWon },
                { label: "GOLES", value: stats.goals },
                { label: "MVP", value: stats.mvps },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`font-semibold text-[13px] ${isDark ? "text-white" : "text-slate-900"}`}>{s.value}</p>
                  <p className={`font-medium text-[6px] tracking-[1px] uppercase mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Generate CTA */}
            <button onClick={handleGenerateCard} disabled={generatingCard}
              className="w-full mt-4 h-[46px] rounded-[14px] bg-emerald-500 text-white font-semibold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-emerald-600 disabled:opacity-60 shadow-lg shadow-emerald-500/25">
              {generatingCard ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Download size={15} /> Generar Carta MVP</>
              )}
            </button>
          </div>
        </div>
      </div>

      <p className={`text-center text-[9px] font-medium mb-8 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>

      {/* Hidden MVP Card for Capture */}
      <div style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0, overflow: "hidden", zIndex: -999 }}>
        <div ref={cardRef} style={{ width: 750, height: 1250, backgroundColor: "#020617", overflow: "hidden", position: "relative" }}>
          {/* Player Image Background */}
          {photoURL ? (
            <img src={photoURL} alt="" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a2e] via-[#0f0f3d] to-[#064e3b]" />
          )}
          {/* Cinematic Overlay */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(2,6,23,0.5) 0%, transparent 40%, rgba(2,6,23,0.9) 100%)" }} />

          {/* Top Left: MVP Logo (Zoomed & Aligned) */}
          <div className="absolute" style={{ top: 60, left: 25, width: 180, height: 120, overflow: "hidden" }}>
            <img src="/Logo.png" alt="" style={{ width: "130%", height: "130%", position: "absolute", top: "-15%", left: "-15%", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          </div>

          {/* Top Right: OVR Rating (Refined Style) */}
          <div className="absolute" style={{ top: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ color: "white", fontSize: 140, fontWeight: 900, lineHeight: "140px", textShadow: "0 0 20px rgba(0,0,0,0.6)" }}>{ovr}</span>
            <div style={{ height: 5, width: 140, backgroundColor: "#06b6d4", marginTop: -5, marginBottom: 10 }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ color: "#06b6d4", fontSize: 11, fontWeight: 900, letterSpacing: 4 }}>VALORACIÓN</span>
              <span style={{ color: "#06b6d4", fontSize: 11, fontWeight: 900, letterSpacing: 4 }}>GENERAL</span>
            </div>
          </div>

          {/* Player Position Vertical */}
          <div className="absolute" style={{ left: -500, top: "42%", width: 1200, display: "flex", justifyContent: "center", transform: "rotate(-90deg)", transformOrigin: "center center" }}>
            <span style={{ color: "white", fontSize: 110, fontWeight: 900, opacity: 0.4, letterSpacing: 3, textAlign: "center", textTransform: "uppercase" }}>{position}</span>
          </div>

          {/* Bottom Section: TOPPS NOW STYLE NAMEPLATE */}
          <div className="absolute bottom-0 w-full" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Name White Box (Adaptive) */}
            <div style={{
              backgroundColor: "white",
              padding: "22px 0",
              transform: "skewX(-10deg)",
              zIndex: 20,
              boxShadow: "0 15px 40px rgba(0,0,0,0.4)",
              border: "3px solid #f1f5f9",
              width: "auto",
              minWidth: "60%",
              maxWidth: "90%",
              display: "flex",
              justifyContent: "center"
            }}>
              <span style={{
                color: "#000",
                fontSize: 44,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: -1,
                transform: "skewX(10deg)",
                textAlign: "center",
                padding: "0 60px",
                whiteSpace: "nowrap"
              }}>{displayName}</span>
            </div>

            {/* Dark Info Bar (Full Width Banner) */}
            <div style={{
              backgroundColor: "#020617",
              width: "100%",
              height: 90,
              marginTop: -20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderTop: "5px solid #06b6d4",
              zIndex: 10
            }}>
              <span style={{ color: "white", fontSize: 22, fontWeight: 900, textTransform: "uppercase", letterSpacing: 4 }}>
                {mainSport ? `${mainSport} • ` : ""}NIVEL {tierInfo.name.toUpperCase()} • 2026
              </span>
            </div>

            {/* Geometric Pattern Bar (Brand Colors: Cyan, Emerald, Blue) */}
            <div style={{ display: "flex", flexDirection: "row", width: "100%", height: 50 }}>
              {["#06b6d4", "#10b981", "#3b82f6", "#0891b2", "#059669", "#2563eb", "#06b6d4", "#10b981", "#3b82f6", "#0891b2"].map((c, i) => (
                <div key={i} style={{ flex: 1, backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Bottom Branding */}
          <div className="absolute" style={{ bottom: 65, width: "100%", display: "flex", justifyContent: "center", zIndex: 30 }}>
            <span style={{ color: "white", fontSize: 12, fontWeight: 900, opacity: 0.5, letterSpacing: 2 }}>TODOS LOS DERECHOS RESERVADOS</span>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewUri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6" onClick={() => setShowPreview(false)}>
          <div className="w-full max-w-[340px]" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden border-2 border-emerald-500/40 shadow-2xl" style={{ borderRadius: 14, aspectRatio: "3/5", maxHeight: "76vh" }}>
              <img src={previewUri} alt="MVP Card" className="w-full h-full object-contain" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPreview(false)}
                className={`flex-1 h-[54px] rounded-[14px] font-semibold text-[11px] uppercase tracking-wider transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.08] text-slate-300 hover:bg-white/[0.12]" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}>
                Cerrar
              </button>
              <button onClick={handleDownloadCard}
                className="flex-[2] h-[54px] rounded-[14px] bg-emerald-500 text-white font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-emerald-600 shadow-lg shadow-emerald-500/25">
                <Download size={16} /> Descargar Carta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glossary Modal */}
      {showGlossary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-5" onClick={() => setShowGlossary(false)}>
          <div className={`w-full max-w-md max-h-[85vh] flex flex-col rounded-[14px] border shadow-2xl ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: "#10b98115" }}>
                  <Medal size={18} className="text-emerald-500" />
                </div>
                <div>
                  <p className={`font-semibold text-[14px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Galería de Insignias</p>
                  <p className={`text-[7px] font-medium uppercase tracking-wider mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Cómo ganar cada insignia</p>
                </div>
              </div>
              <button onClick={() => setShowGlossary(false)} className="w-8 h-8 rounded-[14px] flex items-center justify-center transition-all active:scale-90" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
                <X size={14} className={isDark ? "text-slate-400" : "text-slate-500"} />
              </button>
            </div>

            {/* Badge List (scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {BADGE_GLOSSARY_DATA.map((b) => {
                const config = badgeConfigs[b.id] || badgeConfigs[b.dbKey] || { bronze: 5, silver: 15, gold: 30 };
                const val = statMap[b.dbKey] ?? 0;
                let hybridTier: string | null = null;
                if (val > 0) {
                  if (val >= (config.gold || 30)) hybridTier = "gold";
                  else if (val >= (config.silver || 15)) hybridTier = "silver";
                  else if (val >= (config.bronze || 5)) hybridTier = "bronze";
                }

                let nextThreshold = Number(config.bronze || 5);
                let currentTierLabel = "BLOQUEADA";
                let progressColor = "#10b981";
                if (hybridTier === "gold") {
                  nextThreshold = Number(config.gold || 30);
                  currentTierLabel = "ORO";
                  progressColor = "#fbbf24";
                } else if (hybridTier === "silver") {
                  nextThreshold = Number(config.gold || 30);
                  currentTierLabel = "PLATA";
                  progressColor = "#94a3b8";
                } else if (hybridTier === "bronze") {
                  nextThreshold = Number(config.silver || 15);
                  currentTierLabel = "BRONCE";
                  progressColor = "#b45309";
                }

                const progress = nextThreshold > 0 ? Math.min(1, val / nextThreshold) : 0;

                return (
                  <div key={b.id} className={`rounded-[14px] overflow-hidden border ${isDark ? "bg-[#0F172A]/90 border-white/[0.06]" : "bg-white border-slate-200"} shadow-sm`}>
                    <div className="p-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-[50px] h-[50px] rounded-[14px] flex items-center justify-center shrink-0 border ${isDark ? "border-white/[0.06]" : "border-slate-200"}`} style={{ backgroundColor: `${progressColor}12` }}>
                          {b.svg ? (
                            <div style={{ width: 24, height: 24, backgroundColor: progressColor, mask: `url(${b.svg}) center/contain no-repeat`, WebkitMask: `url(${b.svg}) center/contain no-repeat` }} />
                          ) : (
                            <b.icon size={24} style={{ color: progressColor }} strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`text-[13px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{b.name}</p>
                              <p className={`text-[8px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{b.desc}</p>
                            </div>
                            <span className="text-[7px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-[14px] text-white shrink-0 leading-none" style={{ backgroundColor: progressColor }}>
                              {currentTierLabel}
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className={`h-[5px] rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress * 100}%`, backgroundColor: progressColor }} />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className={`text-[8px] font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{val} {b.unit}</span>
                              <span className={`text-[7px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{Math.floor(progress * 100)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.05)" : "#E2E8F0" }}>
                        {(["bronze", "silver", "gold"] as const).map((t) => {
                          const milestoneColors: Record<string, string> = { bronze: "#b45309", silver: "#94a3b8", gold: "#fbbf24" };
                          const milestoneNames: Record<string, string> = { bronze: "BRONCE", silver: "PLATA", gold: "ORO" };
                          const isActive = val >= (config[t] || 0);
                          return (
                            <div key={t} className="flex items-center gap-1.5" style={{ opacity: isActive ? 1 : 0.2 }}>
                              <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: milestoneColors[t] }} />
                              <div>
                                <p className={`text-[7px] font-semibold leading-tight ${isDark ? "text-slate-200" : "text-slate-700"}`}>{milestoneNames[t]}</p>
                                <p className={`text-[6px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{config[t]} {b.unit}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
