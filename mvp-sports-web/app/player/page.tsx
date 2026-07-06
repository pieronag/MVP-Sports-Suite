"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { gamificationService } from "@/services/player/gamificationService";
import {
  Sun, Moon, MapPin, Trophy, CreditCard, Building2,
  Shield, TrendingUp, User, SlidersHorizontal, CalendarCheck,
  GraduationCap, Zap, ShieldCheck, Sparkles, ArrowRight
} from "lucide-react";

const quickItems = [
  { icon: CalendarCheck, label: "Reservas", color: "#3b82f6", href: "/player/reservas" },
  { icon: MapPin, label: "Mapa", color: "#10b981", href: "/player/mapa" },
  { icon: Trophy, label: "Torneos", color: "#f43f5e", href: "/player/torneos" },
  { icon: GraduationCap, label: "Academias", color: "#8b5cf6", href: "/player/academias" },
  { icon: CreditCard, label: "Pagos", color: "#14b8a6", href: "/player/billetera" },
  { icon: Building2, label: "Recintos", color: "#f59e0b", href: "/player/clubes" },
  { icon: Shield, label: "Equipos", color: "#f97316", href: "/player/equipos" },
  { icon: TrendingUp, label: "Estadísticas", color: "#ec4899", href: "/player/estadisticas" },
  { icon: User, label: "Perfil", color: "#8b5cf6", href: "/player/perfil" },
  { icon: SlidersHorizontal, label: "Ajustes", color: "#64748b", href: "/player/preferencias" },
];

export default function PlayerDashboard() {
  const router = useRouter();
  const { profile, theme, toggleTheme } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const [gamification, setGamification] = useState<any>(null);

  useEffect(() => {
    gamificationService.getSettings().then(setGamification);
  }, []);

  const rawName = profile?.displayName || user?.displayName || "Jugador";
  const userName = rawName
    .split(" ")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  const photoURL = profile?.photoURL || user?.photoURL || "";
  const initials = userName
    .split(" ")
    .map((w: string) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  const xp = profile?.xp || 0;
  const tier = gamification
    ? gamificationService.calculateTier(xp, gamification)
    : { name: "Bronce", index: 0 };
  const ovr = gamification ? gamificationService.calculateOVR(xp, gamification) : 40;

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      <div className="pb-32">
        {/* HEADER */}
        <div className="px-5 pt-12 pb-5">
          <div>
            <h1 className={`text-[22px] font-semibold -tracking-[1.5px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              Bienvenido
            </h1>
            <p className="text-emerald-500 font-semibold text-[10px] tracking-[1.5px] -mt-0.5">
              {userName.toUpperCase()}
            </p>
          </div>
        </div>

        {/* PLAYER ID CARD */}
        <div className="px-5 mb-4">
          <Link
            href="/player/perfil"
            className={`relative block rounded-[14px] overflow-hidden transition-all active:scale-[0.99] ${
              isDark
                ? "bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.06]"
                : "bg-white/80 backdrop-blur-xl border border-slate-200/60"
            } shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"}`}
          >
            <div className={`absolute inset-0 rounded-[14px] pointer-events-none ${isDark ? "bg-gradient-to-br from-emerald-500/[0.02] to-transparent" : ""}`} />
            <div className={`p-6 flex items-center gap-5 bg-gradient-to-br ${
              isDark
                ? "from-[#0F172A] via-[#0F172A] to-[#064e3b]"
                : "from-white via-white to-[#f0fdf4]"
            }`}>
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className={`w-[90px] h-[90px] rounded-[14px] overflow-hidden border-[3px] shadow-xl flex items-center justify-center ${
                    isDark ? "border-[#1E293B]" : "border-white"
                  } ${photoURL ? "" : "bg-emerald-500/10"}`}
                >
                  {photoURL ? (
                    <Image
                      src={photoURL}
                      alt=""
                      width={90}
                      height={90}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-xl font-semibold text-emerald-500">{initials}</span>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-[28px] h-[28px] bg-emerald-500 rounded-[14px] flex items-center justify-center border-[3px] border-[#020617]">
                  <ShieldCheck color="white" size={13} />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-[8px] font-semibold tracking-[1.5px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  JUGADOR
                </p>
                <h2 className={`text-[20px] font-semibold -tracking-[1.5px] mb-2.5 truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {userName}
                </h2>

                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-[9px] px-2.5 py-1 rounded-[14px]">
                    {tier.name.toUpperCase()}
                  </span>
                  <span
                    className={`font-semibold text-[9px] px-2.5 py-1 rounded-[14px] border ${
                      isDark
                        ? "bg-white/5 text-slate-100 border-white/5"
                        : "bg-slate-100 text-slate-900 border-slate-200"
                    }`}
                  >
                    {ovr} VALORACIÓN
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-3">
                  <Zap size={10} color="#10b981" fill="#10b981" />
                  <span className={`text-[9px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {xp.toLocaleString("es-CL")} XP
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* QUICK ACCESS */}
        <div className="px-5 mt-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-[3px] w-6 rounded-full bg-emerald-500/60" />
            <span className="text-emerald-400 font-semibold text-[10px] tracking-[3px] uppercase">Acceso Rápido</span>
            <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
          </div>

          <div className="grid grid-cols-5 gap-3">
            {quickItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-2 group"
              >
                <div
                  className={`w-[58px] h-[58px] rounded-[14px] flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-active:scale-95 ${
                    isDark
                      ? "bg-white/[0.06] hover:bg-white/[0.1]"
                      : "bg-slate-100 hover:bg-slate-200"
                  }`}
                >
                  <item.icon size={26} color={item.color} strokeWidth={1.5} />
                </div>
                <span className={`text-[7px] font-semibold uppercase tracking-[0.5px] text-center leading-tight ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* MVP VALUATION CARD */}
        <div className="px-5 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-[3px] w-6 rounded-full bg-emerald-500/60" />
            <span className="text-emerald-400 font-semibold text-[10px] tracking-[3px] uppercase">Tu Carta MVP</span>
            <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
          </div>

          <Link
            href="/player/perfil"
            className={`relative block rounded-[14px] overflow-hidden transition-all active:scale-[0.99] group ${
              isDark
                ? "bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.06]"
                : "bg-white/80 backdrop-blur-xl border border-slate-200/60"
            } shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"}`}
          >
            <div className={`absolute inset-0 rounded-[14px] pointer-events-none ${isDark ? "bg-gradient-to-br from-emerald-500/[0.02] to-transparent" : "bg-gradient-to-br from-emerald-50/50 to-transparent"}`} />
            <div className={`p-6 bg-gradient-to-br ${
              isDark
                ? "from-[#0F172A] via-[#0F172A] to-[#064e3b]"
                : "from-white via-white to-[#f0fdf4]"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5 flex-1">
                  {/* OVR Badge */}
                  <div className="w-[68px] h-[88px] bg-gradient-to-b from-amber-400 to-amber-600 rounded-[14px] flex flex-col items-center justify-center shadow-xl -rotate-[4deg] shrink-0">
                    <span className="text-black/60 font-medium text-[7px] tracking-[1px]">OVR</span>
                    <span className="text-black font-bold text-[26px] leading-none mt-0.5">{ovr}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-emerald-500" : "bg-emerald-600"}`} />
                      <span className={`font-semibold text-[7px] tracking-[2px] uppercase ${isDark ? "text-emerald-400/80" : "text-emerald-600/80"}`}>VALORACIÓN MVP 2026</span>
                    </div>
                    <p className={`text-[20px] font-semibold -tracking-[0.5px] ${isDark ? "text-white" : "text-slate-900"}`}>
                      {userName}
                    </p>

                    <p className={`text-[10px] font-medium leading-snug mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Genera y comparte tu carta de valoración oficial con <br />tu rendimiento, logros y estadísticas de la temporada.
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className={`w-[42px] h-[42px] rounded-[14px] flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 ${isDark ? "bg-white/[0.06] group-hover:bg-white/[0.1]" : "bg-slate-100 group-hover:bg-slate-200"}`}>
                  <ArrowRight size={18} className="text-emerald-500" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
