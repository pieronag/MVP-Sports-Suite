"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { gamificationService } from "@/services/player/gamificationService";
import { bookingService, Booking } from "@/services/player/bookingService";
import {
  Trophy, CreditCard, Shield, TrendingUp, Swords,
  GraduationCap, ArrowRight, Calendar, Clock, MapPin, ChevronRight
} from "@/components/player/icons";

// Solo destinos que no están en la barra inferior (Inicio, Reservas, Mapa, Perfil, Más)
const quickItems = [
  { icon: Swords, label: "Partidos", color: "#f97316", href: "/player/equipos/partidos" },
  { icon: Shield, label: "Equipos", color: "#3b82f6", href: "/player/equipos" },
  { icon: Trophy, label: "Torneos", color: "#f43f5e", href: "/player/torneos" },
  { icon: GraduationCap, label: "Academias", color: "#eab308", href: "/player/academias" },
  { icon: TrendingUp, label: "Estadísticas", color: "#ec4899", href: "/player/estadisticas" },
  { icon: CreditCard, label: "Pagos", color: "#14b8a6", href: "/player/billetera" },
];

// Fecha de la reserva como Date local (acepta Timestamp o "YYYY-MM-DD")
const bookingDay = (b: any): Date | null => {
  const d = b?.date;
  if (!d) return null;
  if (d.toDate) return d.toDate();
  if (d.seconds) return new Date(d.seconds * 1000);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return new Date(`${d}T12:00:00`);
  return new Date(d);
};


export default function PlayerDashboard() {
  const router = useRouter();
  const { profile, theme, toggleTheme } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const [gamification, setGamification] = useState<any>(null);

  const [nextBooking, setNextBooking] = useState<Booking | null>(null);

  useEffect(() => {
    gamificationService.getSettings().then(setGamification);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    bookingService.getUserBookings(user.uid).then((all) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const upcoming = all
        .filter((b) => !["cancelled", "completed", "past", "no-show"].includes(b.status))
        .map((b) => ({ b, d: bookingDay(b) }))
        .filter((x) => x.d && x.d >= today)
        .sort((a, b) => (a.d!.getTime() - b.d!.getTime()) || String(a.b.startTime).localeCompare(String(b.b.startTime)));
      setNextBooking(upcoming[0]?.b || null);
    }).catch(() => {});
  }, [user?.uid]);

  const rawName = profile?.displayName || (profile as any)?.fullName || user?.displayName || "Jugador";
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

  const firstName = userName.split(" ")[0];
  const nb = nextBooking as any;
  const nbDay = nb ? bookingDay(nb) : null;
  const isTodayBooking = nbDay ? nbDay.toDateString() === new Date().toDateString() : false;
  const card = isDark ? "bg-[#0A101D] border border-white/[0.06]" : "bg-white border border-slate-200";
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      <div className="px-5 pt-12 pb-6 space-y-6">
        {/* Saludo + identidad compacta (toca para ir al perfil) */}
        <Link href="/player/perfil" className="flex items-center gap-3 active:opacity-80">
          <div className={`w-12 h-12 rounded-md overflow-hidden shrink-0 flex items-center justify-center ${photoURL ? "" : "bg-emerald-500/10"}`}>
            {photoURL ? <Image src={photoURL} alt="" width={48} height={48} className="object-cover w-full h-full" /> : <span className="text-base font-semibold text-emerald-500">{initials}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={`text-[22px] font-heading font-black tracking-tight truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>Hola, {firstName}</h1>
            <p className={`text-[13px] font-medium ${muted}`}>
              <span className="text-emerald-500 font-semibold">{tier.name}</span> · {ovr} OVR · {xp.toLocaleString("es-CL")} XP
            </p>
          </div>
          <ChevronRight size={18} className={muted} />
        </Link>

        {/* Acción principal */}
        <Link href="/player/clubes" className="block rounded-md bg-emerald-500 active:scale-[0.99] transition-transform">
          <div className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-white/15 flex items-center justify-center shrink-0">
              <Calendar size={24} color="white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[18px] font-heading font-black tracking-tight">Reservar cancha</p>
              <p className="text-white/85 text-[13px] font-medium">Elige recinto, día y hora en segundos</p>
            </div>
            <ArrowRight size={20} color="white" />
          </div>
        </Link>

        {/* Próxima reserva */}
        {nb && nbDay && (
          <Link href={`/player/ticket?bookingId=${nb.id}`} className={`block rounded-md ${card} active:scale-[0.99] transition-transform`}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-[12px] font-semibold ${isTodayBooking ? "text-emerald-500" : muted}`}>{isTodayBooking ? "Juegas hoy" : "Tu próxima reserva"}</p>
                {nb.paymentStatus !== "paid" && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500">Pago pendiente</span>}
              </div>
              <p className={`text-[16px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{nb.courtName || "Cancha"}{nb.sport ? ` · ${nb.sport}` : ""}</p>
              <div className={`flex items-center gap-4 mt-1.5 text-[13px] ${muted}`}>
                <span className="flex items-center gap-1.5"><Calendar size={14} />{nbDay.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} />{nb.startTime} hrs</span>
              </div>
              {nb.tenantName && <p className={`flex items-center gap-1.5 mt-1 text-[13px] ${muted}`}><MapPin size={14} />{nb.tenantName}</p>}
            </div>
          </Link>
        )}

        {/* Explorar */}
        <section aria-label="Explorar">
          <h2 className={`text-[13px] font-semibold mb-3 ${muted}`}>Explorar</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {quickItems.map((item) => (
              <Link key={item.href} href={item.href}
                className={`rounded-md ${card} p-3 flex flex-col items-start gap-2.5 active:scale-[0.98] transition-transform`}>
                <item.icon size={22} color={item.color} strokeWidth={1.75} />
                <span className={`text-[13px] font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Carta MVP */}
        <Link href="/player/perfil" className={`flex items-center gap-4 rounded-md ${card} p-4 active:scale-[0.99] transition-transform`}>
          <div className="w-[52px] h-[66px] bg-gradient-to-b from-amber-400 to-amber-600 rounded-md flex flex-col items-center justify-center -rotate-[4deg] shrink-0">
            <span className="text-black/60 font-medium text-[10px]">OVR</span>
            <span className="text-black font-bold text-[20px] leading-none">{ovr}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[15px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Tu carta MVP 2026</p>
            <p className={`text-[13px] ${muted}`}>Genérala y compártela con tus stats</p>
          </div>
          <ChevronRight size={18} className={muted} />
        </Link>
      </div>
    </div>
  );
}
