"use client";
import { GlowCard, SectionPill } from "@/components/player/ui";
import TierBadge from "@/components/player/TierBadge";
import { uploadImage } from "@/services/client/imageUpload";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { gamificationService } from "@/services/client/player/gamificationService";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/services/client/firebase";
import {
  ChevronLeft, Sun, Moon, Camera, Trophy, Target, Handshake, Star,
  Medal, Sparkles, Download, Share2, Activity, User as UserIcon, MapPin, Zap,
  Shield, ShieldAlert, Award, Swords, Flame, Heart, Crosshair, CircleDot,
  Sunrise, GraduationCap, TrendingUp, Users, Sword, CalendarDays, X, Crown, Timer, CalendarCheck
} from "@/components/player/icons";
import { BADGE_ICONS } from "@/components/player/badgeIcons";

const BADGE_DEFS: { id: string; name: string; icon: any; color: string; stat: string }[] = [
  { id: "scorer",  name: "Artillero",     icon: BADGE_ICONS.scorer, color: "#ef4444", stat: "goals" },
  { id: "playmaker", name: "Maestro",     icon: BADGE_ICONS.playmaker, color: "#8b5cf6", stat: "assists" },
  { id: "defender", name: "Muralla",      icon: BADGE_ICONS.defender, color: "#14b8a6", stat: "clean_sheets" },
  { id: "wins",    name: "Ganador",       icon: BADGE_ICONS.wins, color: "#f59e0b", stat: "won" },
  { id: "mvp",     name: "Estrella",      icon: BADGE_ICONS.mvp, color: "#10b981", stat: "mvps" },
  { id: "experience", name: "Leyenda",    icon: BADGE_ICONS.experience, color: "#3b82f6", stat: "played" },
  { id: "multi_sport", name: "Atleta Total", icon: BADGE_ICONS.multi_sport, color: "#ec4899", stat: "sports_played" },
  { id: "captaincy", name: "Capitán",     icon: BADGE_ICONS.captaincy, color: "#f97316", stat: "captain_matches" },
  { id: "comeback", name: "Ave Fénix",    icon: BADGE_ICONS.comeback, color: "#f43f5e", stat: "comebacks" },
  { id: "precision", name: "Francotirador", icon: BADGE_ICONS.precision, color: "#06b6d4", stat: "precision_matches" },
  { id: "clutch",  name: "Clutch",        icon: BADGE_ICONS.clutch, color: "#f59e0b", stat: "clutch_goals" },
  { id: "tournaments", name: "Competidor", icon: BADGE_ICONS.tournaments, color: "#8b5cf6", stat: "tournaments_played" },
  { id: "invictus", name: "Invicto",      icon: BADGE_ICONS.invictus, color: "#10b981", stat: "longest_win_streak" },
  { id: "rivalry", name: "Verdugo",       icon: BADGE_ICONS.rivalry, color: "#ef4444", stat: "rivalries_won" },
  { id: "morning_player", name: "Madrugador", icon: BADGE_ICONS.morning_player, color: "#f59e0b", stat: "morning_matches" },
  { id: "night_player", name: "Nocturno", icon: BADGE_ICONS.night_player, color: "#3b82f6", stat: "night_matches" },
  { id: "loyal",   name: "Fiel",          icon: BADGE_ICONS.loyal,        color: "#ec4899", stat: "loyalty" },
  { id: "weekend_warrior", name: "Guerrero FDS", icon: BADGE_ICONS.weekend_warrior, color: "#14b8a6", stat: "weekend_matches" },
  { id: "stamina", name: "Motor",         icon: BADGE_ICONS.stamina, color: "#f97316", stat: "minutes_played" },
  { id: "social",  name: "Sociable",      icon: BADGE_ICONS.social, color: "#3b82f6", stat: "invited_players" },
];

const BADGE_GLOSSARY_DATA = [
  { id: "scorer", icon: BADGE_ICONS.scorer, name: "Artillero", desc: "Anota puntos o goles en tus partidos", unit: "Goles", dbKey: "goals" },
  { id: "playmaker", icon: BADGE_ICONS.playmaker, name: "Maestro", desc: "Suma asistencias y pases clave", unit: "Asistencias", dbKey: "assists" },
  { id: "defender", icon: BADGE_ICONS.defender, name: "Muralla", desc: "Logra defensas o vallas invictas", unit: "Defensas", dbKey: "clean_sheets" },
  { id: "wins", icon: BADGE_ICONS.wins, name: "Ganador", desc: "Acumula partidos ganados", unit: "Victorias", dbKey: "won" },
  { id: "mvp", icon: BADGE_ICONS.mvp, name: "Estrella", desc: "Sé elegido Mejor Jugador del partido", unit: "MVPs", dbKey: "mvps" },
  { id: "experience", icon: BADGE_ICONS.experience, name: "Leyenda", desc: "Disputa la mayor cantidad de partidos", unit: "Partidos", dbKey: "played" },
  { id: "multi_sport", icon: BADGE_ICONS.multi_sport, name: "Atleta Total", desc: "Juega partidos en diferentes deportes", unit: "Deportes", dbKey: "sports_played" },
  { id: "captaincy", icon: BADGE_ICONS.captaincy, name: "Capitán", desc: "Lidera a tu equipo como capitán", unit: "Partidos", dbKey: "captain_matches" },
  { id: "comeback", icon: BADGE_ICONS.comeback, name: "Ave Fénix", desc: "Gana partidos remontando marcador", unit: "Remontadas", dbKey: "comebacks" },
  { id: "precision", icon: BADGE_ICONS.precision, name: "Francotirador", desc: "Mantén alta efectividad o precisión", unit: "Partidos", dbKey: "precision_matches" },
  { id: "clutch", icon: BADGE_ICONS.clutch, name: "Clutch", desc: "Anota puntos decisivos al final", unit: "Puntos", dbKey: "clutch_goals" },
  { id: "tournaments", icon: BADGE_ICONS.tournaments, name: "Competidor", desc: "Participa en torneos y ligas", unit: "Torneos", dbKey: "tournaments_played" },
  { id: "invictus", icon: BADGE_ICONS.invictus, name: "Invicto", desc: "Logra rachas de victorias consecutivas", unit: "Racha", dbKey: "longest_win_streak" },
  { id: "rivalry", icon: BADGE_ICONS.rivalry, name: "Verdugo", desc: "Gana clásicos o revanchas", unit: "Partidos", dbKey: "rivalries_won" },
  { id: "morning_player", icon: BADGE_ICONS.morning_player, name: "Madrugador", desc: "Juega partidos en horario matutino", unit: "Partidos", dbKey: "morning_matches" },
  { id: "night_player", icon: BADGE_ICONS.night_player, name: "Nocturno", desc: "Juega partidos en horario nocturno", unit: "Partidos", dbKey: "night_matches" },
  { id: "loyal", icon: BADGE_ICONS.loyal, name: "Fiel", desc: "Mantente activo mes a mes", unit: "Meses", dbKey: "loyalty" },
  { id: "weekend_warrior", icon: BADGE_ICONS.weekend_warrior, name: "Guerrero FDS", desc: "Juega partidos los fines de semana", unit: "Partidos", dbKey: "weekend_matches" },
  { id: "stamina", icon: BADGE_ICONS.stamina, name: "Motor", desc: "Acumula minutos jugados en cancha", unit: "Minutos", dbKey: "minutes_played" },
  { id: "social", icon: BADGE_ICONS.social, name: "Sociable", desc: "Invita amigos a jugar contigo", unit: "Invitados", dbKey: "invited_players" },
];

const TIERS = ["bronce", "plata", "oro", "platino", "diamante", "elite", "leyenda"];



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
      const url = await uploadImage(file, { folder: "avatars", maxSize: 1440, quality: 0.86 }) // nítida también a tamaño de carta MVP;
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      await reloadProfile();
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
      // Calidad: fuentes cargadas y fotos decodificadas antes de capturar
      await document.fonts?.ready;
      await Promise.all(Array.from(cardRef.current.querySelectorAll("img")).map((im) => im.decode().catch(() => undefined)));
      const { toPng } = await import("html-to-image");
      // Hojas de otros dominios (p. ej. las fuentes que carga Google Maps) no se pueden leer: se apartan durante la captura
      const foreign = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).filter((l) => { try { return new URL(l.href).origin !== location.origin; } catch { return false; } });
      const spots = foreign.map((l) => { const mark = document.createComment(""); l.replaceWith(mark); return { l, mark }; });
      let dataUrl: string;
      try {
        dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 3, cacheBust: true, backgroundColor: "#020611" });
      } finally {
        spots.forEach(({ l, mark }) => mark.replaceWith(l));
      }
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
    { icon: CalendarCheck, color: "#3b82f6", label: "Partidos", value: stats.matchesPlayed ?? 0 },
    { icon: Trophy, color: "#f59e0b", label: "Victorias", value: stats.matchesWon ?? 0 },
    { icon: Target, color: "#ef4444", label: "Goles", value: stats.goals ?? 0 },
    { icon: Handshake, color: "#10b981", label: "Asistencias", value: stats.assists ?? 0 },
    { icon: Star, color: "#8b5cf6", label: "MVP", value: stats.mvps ?? 0 },
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
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <div className="w-10" aria-hidden />
        <h1 className="font-heading font-black text-[18px] tracking-tight flex-1 text-center">Perfil</h1>
        <button onClick={toggleTheme} className={`w-10 h-10 rounded-md flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/6 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
          {isDark ? <Moon size={18} className="text-amber-400" /> : <Sun size={18} className="text-slate-600" />}
        </button>
      </div>



      {/* Avatar Section */}
      <div className="flex flex-col items-center py-2 mb-4">
        <div className="relative mb-4">
          <div className={`w-28 h-28 rounded-md overflow-hidden border-[3px] ${isDark ? "border-white/8" : "border-white"} ${isDark ? "shadow-black/30" : "shadow-slate-200"}`}>
            {photoURL ? (
              <Image src={photoURL} alt={displayName} width={112} height={112} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-emerald-500/10">
                <span className="text-3xl font-bold text-emerald-500">{initials}</span>
              </div>
            )}
          </div>
          <button onClick={handlePickImage} className="absolute -bottom-0.5 -right-0.5 w-10 h-10 rounded-md bg-emerald-500 flex items-center justify-center border-4 border-[#020611] hover:bg-emerald-600 transition-colors">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={16} className="text-white" />
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
        <h2 className={`text-[18px] font-heading font-black ${isDark ? "text-slate-100" : "text-slate-900"}`}>{displayName}</h2>
        <p className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{userEmail}</p>
        {city && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={10} className="text-emerald-500" />
            <span className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{city}</span>
          </div>
        )}
      </div>

      {/* Season Level */}
      <SectionPill label="Nivel de temporada" />
      <div className="px-5 mb-6">
        <GlowCard isDark={isDark}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Rango actual</p>
                <p className="text-emerald-500 text-[16px] font-semibold">{tierInfo.name}</p>
              </div>
              <div className="text-right">
                <p className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>{tierInfo.index < TIERS.length - 1 ? "Próximo rango" : "Rango máximo"}</p>
                <p className={`text-[15px] font-medium ${tierInfo.index < TIERS.length - 1 ? "opacity-50" : "text-emerald-500"} ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {tierInfo.index < TIERS.length - 1 ? TIERS[tierInfo.index + 1] : "Alcanzado"}
                </p>
              </div>
            </div>
            <div className="relative h-4">
              <div className={`absolute top-1/2 -translate-y-1/2 w-full h-[3px] rounded ${isDark ? "bg-white/6" : "bg-slate-100"}`} />
              <div className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded bg-emerald-500 transition-all" style={{ width: `${(tierInfo.index / (TIERS.length - 1)) * 100}%` }} />
              <div className="flex justify-between absolute w-full top-0">
                {TIERS.map((t, i) => (
                  <div key={t} className={`w-3.5 h-3.5 rounded-full border-[3px] ${i <= tierInfo.index ? "bg-emerald-500 border-[#020611]" : isDark ? "bg-[#1e293b] border-[#020611]" : "bg-slate-200 border-white"}`} />
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
                <p className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Nivel general</p>
                <p className={`text-[22px] font-bold tracking-[-0.06em] ${isDark ? "text-slate-100" : "text-slate-900"}`}>{ovr}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-emerald-500/15 flex items-center justify-center">
                <Medal size={22} className="text-emerald-500" />
              </div>
            </div>
            <div className="grid grid-cols-2">
              {statRows.map((row, i) => (
                <div key={row.label} className={`flex items-center gap-3 px-4 py-4 ${i % 2 === 0 ? (isDark ? "border-r border-emerald-500/5" : "border-r border-slate-100") : ""} ${i > 1 ? (isDark ? "border-t border-emerald-500/5" : "border-t border-slate-100") : ""}`}>
                  <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${row.color}20` }}>
                    <row.icon size={18} style={{ color: row.color }} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[16px] font-semibold leading-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}>{row.value}</p>
                    <p className={`text-[11px] font-medium truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>{row.label}</p>
                  </div>
                </div>
              ))}
            </div>
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
                    <p className={`text-[12px] font-semibold mt-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Juega más para desbloquear insignias</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-3 gap-3">
                  {earnedBadges.map((badge) => {
                    const c = tierColors[badge.tier!];
                    return (
                      <div key={badge.id} className="p-3.5 rounded-md flex flex-col items-center border-2 transition-all"
                        style={{ backgroundColor: `${c}18`, borderColor: `${c}35` }}>
                        <div className="mb-2.5 w-9 h-9 rounded-md flex items-center justify-center">
                          <badge.icon size={24} style={{ color: c }} strokeWidth={1.5} />
                        </div>
                        <p className={`text-[12px] font-semibold text-center mb-1.5 leading-tight ${isDark ? "text-slate-200" : "text-slate-800"}`}>{badge.name}</p>
                        <span className="text-[11px] font-semibold tracking-[0.06em] px-2 py-0.5 rounded-md" style={{ backgroundColor: `${c}25`, color: c }}>{tierNames[badge.tier!]}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </GlowCard>
        <button onClick={() => setShowGlossary(true)}
          className="w-full mt-3 h-[44px] rounded-md font-semibold text-[12px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] border"
          style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0", backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC", color: isDark ? "#94A3B8" : "#64748B" }}>
          <Medal size={14} /> Ver Logros Disponibles
        </button>
      </div>

      {/* Perfil público para compartir */}
      <div className="px-5 mb-4">
        <button onClick={async () => {
          const url = `${window.location.origin}/jugador/${(profile as any)?.uid}`;
          const text = `Mira mi perfil en MVP Sports: ${ovr} OVR`;
          if ((navigator as any).share) { try { await (navigator as any).share({ title: "Mi perfil MVP", text, url }); return; } catch { return; } }
          await navigator.clipboard?.writeText(url).catch(() => {});
          window.open(url, "_blank", "noopener");
        }} className={`w-full h-11 rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 border ${isDark ? "border-white/[0.08] text-slate-200" : "border-slate-200 text-slate-700"}`}>
          <Share2 size={16} /> Compartir mi perfil
        </button>
      </div>

      {/* Tu Carta MVP */}
      <div className="flex items-center gap-3 px-6 mb-4 mt-2">
        <div className="h-[3px] w-6 rounded-full bg-emerald-500/60" />
        <span className="text-emerald-400 font-semibold text-[12px]">Tu carta MVP</span>
        <div className="flex-1 h-px bg-linear-to-r from-emerald-500/20 to-transparent" />
      </div>

      <div className="px-5 mb-8">
        <div className="relative rounded-md overflow-hidden bg-[#020611] border border-white/6">
          {/* Mini carta: foto con degradado, isotipo, valoración y rango */}
          <div className="relative h-[260px]">
            {photoURL ? (
              <img src={photoURL} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "radial-gradient(80% 70% at 50% 40%, rgba(0,223,130,0.18), #0A101D 70%)" }}>
                <span className="text-white/15 text-[96px] font-heading font-black">{initials}</span>
              </div>
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(2,6,17,0.5) 0%, rgba(2,6,17,0) 30%, rgba(2,6,17,0) 50%, rgba(2,6,17,0.9) 85%, #020611 100%)" }} />
            <img src="/icons/logo-mark.png" alt="" className="absolute top-4 left-4 w-12 h-12 object-contain brightness-0 invert" />
            <div className="absolute top-3 right-4 text-right">
              <p className="text-white text-[52px] font-heading font-black leading-none tracking-tight">{ovr}</p>
              <p className="text-[#00df82] text-[12px] font-semibold">Valoración</p>
            </div>
            <div className="absolute left-4 right-4 bottom-3">
              <TierBadge name={tierInfo.name} />
              <p className="text-white text-[26px] font-heading font-black leading-tight tracking-tight mt-2 truncate">{displayName}</p>
              <p className="text-[#00df82] text-[13px] font-semibold">{[mainSport, position].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-4 rounded-md bg-[#0A101D] border border-white/6">
              {[
                { label: "Partidos", value: stats.matchesPlayed ?? 0 },
                { label: "Victorias", value: stats.matchesWon ?? 0 },
                { label: "Goles", value: stats.goals ?? 0 },
                { label: "XP", value: xp.toLocaleString("es-CL") },
              ].map((st, i) => (
                <div key={st.label} className={`py-3 text-center ${i ? "border-l border-white/6" : ""}`}>
                  <p className="text-white text-[18px] font-heading font-black leading-none tabular-nums">{st.value}</p>
                  <p className="text-slate-400 text-[11px] font-medium mt-1">{st.label}</p>
                </div>
              ))}
            </div>
            {/* Generate CTA */}
            <button onClick={() => handleGenerateCard()} disabled={generatingCard}
              className="w-full mt-4 h-[46px] rounded-md bg-emerald-500 text-white font-semibold text-[12px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-emerald-600 disabled:opacity-60">
              {generatingCard ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Download size={15} /> Generar carta MVP</>
              )}
            </button>
          </div>
        </div>
      </div>

      <p className={`text-center text-[11px] font-medium mb-8 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>

      {/* Hidden MVP Card for Capture */}
      <div style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0, overflow: "hidden", zIndex: -999 }}>
        <div ref={cardRef} className="font-heading" style={{ width: 750, height: 1250, background: "#020611", position: "relative", overflow: "hidden" }}>
          {/* Foto en un marco redondeado, como las cards de la app */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0A101D" }}>
            {photoURL ? (
              <img src={photoURL} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(80% 70% at 50% 40%, rgba(0,223,130,0.18), #0A101D 70%)" }}>
                <span style={{ color: "rgba(255,255,255,0.14)", fontSize: 280, fontWeight: 900, letterSpacing: -10 }}>{initials}</span>
              </div>
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,6,17,0.5) 0%, rgba(2,6,17,0) 20%, rgba(2,6,17,0) 56%, rgba(2,6,17,0.85) 68%, #020611 80%)" }} />
            {/* Isotipo y valoración, del mismo porte */}
            <img src="/icons/logo-mark.png" alt="" style={{ position: "absolute", top: 60, left: 60, width: 130, height: 130, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
            <div style={{ position: "absolute", top: 52, right: 60, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ color: "#fff", fontSize: 150, fontWeight: 900, lineHeight: 1, letterSpacing: -6 }}>{ovr}</span>
              <span style={{ color: "#00df82", fontSize: 24, fontWeight: 800, marginTop: 4 }}>Valoración</span>
            </div>
            {/* Rango sobre la foto */}
            <div style={{ position: "absolute", left: 60, top: 742 }}>
              <TierBadge name={tierInfo.name} scale={2.1} />
            </div>
          </div>

          {/* Nombre y posición */}
          <div style={{ position: "absolute", top: 830, left: 60, right: 60 }}>
            <span style={{ display: "block", color: "#fff", fontSize: displayName.length > 18 ? 62 : 76, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</span>
            <span style={{ display: "block", color: "#00df82", fontSize: 28, fontWeight: 700, marginTop: 10 }}>{[mainSport, position].filter(Boolean).join(" · ")}</span>
          </div>

          {/* Estadísticas en una card, como en el perfil */}
          <div style={{ position: "absolute", top: 1000, left: 36, right: 36, height: 150, background: "#0A101D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, display: "flex" }}>
            {[
              { k: "Partidos", v: stats.matchesPlayed ?? 0 },
              { k: "Victorias", v: stats.matchesWon ?? 0 },
              { k: "Goles", v: stats.goals ?? 0 },
              { k: "XP", v: xp.toLocaleString("es-CL") },
            ].map((st, i) => (
              <div key={st.k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: i ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <span style={{ color: "#fff", fontSize: 52, fontWeight: 900, lineHeight: 1 }}>{st.v}</span>
                <span style={{ color: "#94a3b8", fontSize: 22, fontWeight: 600, marginTop: 10 }}>{st.k}</span>
              </div>
            ))}
          </div>

          {/* Pie */}
          <div style={{ position: "absolute", left: 60, right: 60, bottom: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#64748b", fontSize: 22, fontWeight: 700 }}>Temporada {new Date().getFullYear()}</span>
            <span style={{ color: "#64748b", fontSize: 22, fontWeight: 700 }}>mvpsports.cl</span>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewUri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6" onClick={() => setShowPreview(false)}>
          <div className="w-full max-w-[340px]" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden border-2 border-emerald-500/40" style={{ borderRadius: 5, aspectRatio: "3/5", maxHeight: "76vh" }}>
              <img src={previewUri} alt="MVP Card" className="w-full h-full object-contain" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPreview(false)}
                className={`flex-1 h-[54px] rounded-md font-semibold text-[12px] transition-all active:scale-[0.98] ${isDark ? "bg-white/8 text-slate-300 hover:bg-white/12" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}>
                Cerrar
              </button>
              <button onClick={handleDownloadCard}
                className="flex-2 h-[54px] rounded-md bg-emerald-500 text-white font-semibold text-[12px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-emerald-600">
                <Share2 size={16} /> Guardar o compartir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glossary Modal */}
      {showGlossary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] px-5 py-6 animate-in fade-in duration-200" onClick={() => setShowGlossary(false)}>
          <div className={`w-full max-w-md max-h-[85vh] flex flex-col rounded-md border ${isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${isDark ? "border-white/6" : "border-slate-200"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ backgroundColor: "#10b98115" }}>
                  <Medal size={18} className="text-emerald-500" />
                </div>
                <div>
                  <p className={`font-semibold text-[13px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Galería de insignias</p>
                  <p className={`text-[12px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Cómo ganar cada insignia</p>
                </div>
              </div>
              <button aria-label="Cerrar" onClick={() => setShowGlossary(false)} className="w-8 h-8 rounded-md flex items-center justify-center transition-all active:scale-90" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
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
                  <div key={b.id} className={`rounded-md overflow-hidden border ${isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200"} shadow-xs`}>
                    <div className="p-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-[50px] h-[50px] rounded-md flex items-center justify-center shrink-0 border ${isDark ? "border-white/6" : "border-slate-200"}`} style={{ backgroundColor: `${progressColor}12` }}>
                          <b.icon size={24} style={{ color: progressColor }} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`text-[12px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{b.name}</p>
                              <p className={`text-[11px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{b.desc}</p>
                            </div>
                            <span className="text-[12px] font-semibold px-2.5 py-1 rounded-md text-white shrink-0 leading-none" style={{ backgroundColor: progressColor }}>
                              {currentTierLabel}
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className={`h-[5px] rounded-full overflow-hidden ${isDark ? "bg-white/6" : "bg-slate-100"}`}>
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress * 100}%`, backgroundColor: progressColor }} />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className={`text-[11px] font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{val} {b.unit}</span>
                              <span className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{Math.floor(progress * 100)}%</span>
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
                                <p className={`text-[11px] font-semibold leading-tight ${isDark ? "text-slate-200" : "text-slate-700"}`}>{milestoneNames[t]}</p>
                                <p className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{config[t]} {b.unit}</p>
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
