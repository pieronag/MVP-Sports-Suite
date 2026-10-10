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
  GraduationCap, ArrowRight, Calendar, Clock, MapPin, ChevronRight,
  Navigation, Ticket, Share2, Flame, Zap, Target, CheckCircle2
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

// Inicio real del partido (los bloques antes de las 06:00 son del día siguiente)
const matchStart = (b: any): Date | null => {
  const d = bookingDay(b);
  if (!d || isNaN(d.getTime())) return null;
  const [h, m] = String(b?.startTime || "00:00").split(":").map(Number);
  const out = new Date(d);
  out.setHours(h || 0, m || 0, 0, 0);
  if ((h || 0) < 6) out.setDate(out.getDate() + 1);
  return out;
};

const countdown = (ms: number) => {
  if (ms <= 0) return ms > -60 * 60_000 ? "¡Es ahora!" : "";
  const min = Math.floor(ms / 60_000), h = Math.floor(min / 60), d = Math.floor(h / 24);
  if (d >= 1) return `Faltan ${d} d ${h % 24} h`;
  if (h >= 1) return `Faltan ${h} h ${min % 60} min`;
  return `En ${Math.max(1, min)} min`;
};

// Lunes 00:00 de la semana de una fecha
const weekStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime(); };

const isPlayed = (b: any, now: number) => {
  if (b.status === "cancelled" || b.status === "no-show" || b.isInternalMatch) return false;
  if (b.status === "completed" || b.status === "past" || b.checkOut) return true;
  const st = matchStart(b);
  return !!st && st.getTime() + 60 * 60_000 < now;
};

export default function PlayerDashboard() {
  const router = useRouter();
  const { profile, theme, toggleTheme } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const [gamification, setGamification] = useState<any>(null);

  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);

  useEffect(() => {
    gamificationService.getSettings().then(setGamification);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    bookingService.getUserBookings(user.uid).then((all) => {
      setAllBookings(all);
      const t = Date.now();
      const upcoming = all
        .filter((b) => !["cancelled", "completed", "past", "no-show"].includes(b.status) && !(b as any).checkOut)
        .map((b) => ({ b, st: matchStart(b) }))
        .filter((x) => x.st && x.st.getTime() > t - 60 * 60_000) // incluye el partido en curso
        .sort((a, b) => a.st!.getTime() - b.st!.getTime());
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
  const nbStart = nb ? matchStart(nb) : null;
  const soon = nbStart ? nbStart.getTime() - now < 3 * 60 * 60_000 : false;
  const prog = gamification ? gamificationService.tierProgress(xp, gamification) : null;
  const xpPerGame = gamification ? (Number(gamification.xpPerMatch) || 0) + (Number(gamification.xpPerCheckin) || 0) : 0;
  const matchesToNext = prog?.next && xpPerGame > 0 ? Math.ceil(prog.xpToNext / xpPerGame) : 0;
  const activity = useMemo(() => {
    const played = allBookings.filter((b) => isPlayed(b, now)).map((b) => matchStart(b)).filter(Boolean) as Date[];
    const weeks = new Set(played.map((d) => weekStart(d)));
    const thisWeek = weeks.has(weekStart(new Date(now)));
    const WEEK = 7 * 24 * 60 * 60_000;
    let cursor = weekStart(new Date(now)) - (thisWeek ? 0 : WEEK), streak = 0;
    while (weeks.has(cursor)) { streak++; cursor -= WEEK; }
    const nd = new Date(now);
    const month = played.filter((d) => d.getMonth() === nd.getMonth() && d.getFullYear() === nd.getFullYear()).length;
    return { streak, month, thisWeek };
  }, [allBookings, now]);
  const isTodayBooking = nbStart ? nbStart.toDateString() === new Date(now).toDateString() : false;
  const card = isDark ? "bg-[#0A101D] border border-white/6" : "bg-white border border-slate-200";
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      <div className="px-5 pt-12 pb-6 space-y-6">
        {/* Saludo + identidad compacta (toca para ir al perfil) */}
        <Link href="/player/perfil" className="flex items-center gap-3 active:opacity-80">
          <div className={`w-12 h-12 rounded-md overflow-hidden shrink-0 flex items-center justify-center ${photoURL ? "" : "bg-emerald-500/10"}`}>
            {photoURL ? <Image src={photoURL} alt="" width={48} height={48} className="object-cover w-full h-full" /> : <span className="text-[15px] font-semibold text-emerald-500">{initials}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={`text-[18px] font-heading font-black tracking-tight truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>Hola, {firstName}</h1>
            <p className={`text-[12px] font-medium ${muted}`}>
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
              <p className="text-white text-[16px] font-heading font-black tracking-tight">Reservar cancha</p>
              <p className="text-white/85 text-[12px] font-medium">Elige recinto, día y hora en segundos</p>
            </div>
            <ArrowRight size={20} color="white" />
          </div>
        </Link>

        {/* Próxima reserva: cuenta regresiva y acciones rápidas */}
        {nb && nbStart && (
          <div className={`rounded-md ${card} overflow-hidden`}>
            <Link href={`/player/ticket?bookingId=${nb.id}`} className="block p-4 active:opacity-90">
              <div className="flex items-center justify-between mb-1.5">
                <p className={`text-[11px] font-semibold ${soon ? "text-emerald-500" : muted}`}>{isTodayBooking ? "Juegas hoy" : "Tu próxima reserva"}</p>
                {nb.paymentStatus !== "paid" && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500">{nb.paymentMethod === "cash" ? "Pagas en el recinto" : "Pago pendiente"}</span>}
              </div>
              <p className={`text-[22px] font-heading font-black tracking-tight ${soon ? "text-emerald-500" : isDark ? "text-slate-100" : "text-slate-900"}`} aria-live="polite">{countdown(nbStart.getTime() - now)}</p>
              <p className={`text-[14px] font-semibold mt-1 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{nb.courtName || "Cancha"}{nb.sport ? ` · ${nb.sport}` : ""}</p>
              <div className={`flex items-center gap-4 mt-1 text-[12px] ${muted}`}>
                <span className="flex items-center gap-1.5"><Calendar size={13} />{nbStart.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}</span>
                <span className="flex items-center gap-1.5"><Clock size={13} />{nb.startTime} hrs</span>
                {nb.tenantName && <span className="flex items-center gap-1.5 truncate"><MapPin size={13} />{nb.tenantName}</span>}
              </div>
            </Link>
            <div className={`grid grid-cols-3 border-t ${isDark ? "border-white/[0.06] divide-white/[0.06]" : "border-slate-200 divide-slate-200"} divide-x`}>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nb.tenantName || "")}`} target="_blank" rel="noopener" className={`h-11 flex items-center justify-center gap-1.5 text-[12px] font-semibold ${muted}`}><Navigation size={14} /> Cómo llegar</a>
              <Link href={`/player/ticket?bookingId=${nb.id}`} className={`h-11 flex items-center justify-center gap-1.5 text-[12px] font-semibold ${muted}`}><Ticket size={14} /> Ticket</Link>
              <button onClick={async () => {
                const text = `¡Tenemos cancha! ⚽\n${nb.tenantName || ""} · ${nb.courtName || ""}\n${nbStart.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })} a las ${nb.startTime} hrs`;
                if ((navigator as any).share) { try { await (navigator as any).share({ title: "Partido MVP Sports", text }); return; } catch { return; } }
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
              }} className="h-11 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-emerald-500"><Share2 size={14} /> Avisar</button>
            </div>
          </div>
        )}

        {/* Progreso de nivel */}
        {prog && (
          <Link href="/player/estadisticas" className={`block rounded-md ${card} p-4 active:opacity-90`}>
            <div className="flex items-center justify-between">
              <p className={`text-[12px] font-semibold ${muted}`}>Tu nivel</p>
              <p className="text-[12px] font-semibold text-emerald-500">{xp.toLocaleString("es-CL")} XP</p>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className={`text-[16px] font-heading font-black ${isDark ? "text-slate-100" : "text-slate-900"}`}>{prog.current}</p>
              {prog.next && <p className={`text-[12px] ${muted}`}>Siguiente: <span className={isDark ? "text-slate-200" : "text-slate-700"}>{prog.next}</span></p>}
            </div>
            <div className={`h-2 rounded-full mt-2 overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} role="progressbar" aria-valuenow={prog.pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${prog.pct}%` }} />
            </div>
            <p className={`text-[12px] mt-2 ${muted}`}>
              {prog.next
                ? <>Te faltan <span className="font-semibold text-emerald-500">{prog.xpToNext.toLocaleString("es-CL")} XP</span>{matchesToNext ? <> · unos {matchesToNext} partido{matchesToNext > 1 ? "s" : ""}</> : null}</>
                : "Alcanzaste el rango máximo. ¡Defiéndelo!"}
            </p>
          </Link>
        )}

        {/* Actividad: racha, mes y meta semanal */}
        <section aria-label="Tu actividad" className="grid grid-cols-3 gap-2.5">
          <div className={`rounded-md ${card} p-3`}>
            <Flame size={18} color={activity.streak > 0 ? "#f97316" : isDark ? "#475569" : "#94a3b8"} />
            <p className={`text-[18px] font-bold mt-1.5 leading-none ${isDark ? "text-slate-100" : "text-slate-900"}`}>{activity.streak}</p>
            <p className={`text-[11px] mt-1 ${muted}`}>{activity.streak === 1 ? "semana seguida" : "semanas seguidas"}</p>
          </div>
          <div className={`rounded-md ${card} p-3`}>
            <Zap size={18} color="#eab308" />
            <p className={`text-[18px] font-bold mt-1.5 leading-none ${isDark ? "text-slate-100" : "text-slate-900"}`}>{activity.month}</p>
            <p className={`text-[11px] mt-1 ${muted}`}>partido{activity.month === 1 ? "" : "s"} este mes</p>
          </div>
          <Link href={activity.thisWeek ? "/player/estadisticas" : "/player/clubes"} className={`rounded-md ${card} p-3 active:opacity-90`}>
            {activity.thisWeek ? <CheckCircle2 size={18} color="#10b981" /> : <Target size={18} color="#3b82f6" />}
            <p className={`text-[13px] font-bold mt-1.5 leading-tight ${activity.thisWeek ? "text-emerald-500" : isDark ? "text-slate-100" : "text-slate-900"}`}>{activity.thisWeek ? "Meta lista" : "1 partido"}</p>
            <p className={`text-[11px] mt-1 ${muted}`}>{activity.thisWeek ? "esta semana" : activity.streak > 0 ? "para no cortar la racha" : "para iniciar tu racha"}</p>
          </Link>
        </section>

        {/* Explorar */}
        <section aria-label="Explorar">
          <h2 className={`text-[12px] font-semibold mb-3 ${muted}`}>Explorar</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {quickItems.map((item) => (
              <Link key={item.href} href={item.href}
                className={`rounded-md ${card} p-3 flex flex-col items-start gap-2.5 active:scale-[0.98] transition-transform`}>
                <item.icon size={22} color={item.color} strokeWidth={1.75} />
                <span className={`text-[12px] font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Carta MVP */}
        <Link href="/player/perfil" className={`flex items-center gap-4 rounded-md ${card} p-4 active:scale-[0.99] transition-transform`}>
          <div className="w-[52px] h-[66px] bg-linear-to-b from-amber-400 to-amber-600 rounded-md flex flex-col items-center justify-center rotate-[-4deg] shrink-0">
            <span className="text-black/60 font-medium text-[10px]">OVR</span>
            <span className="text-black font-bold text-[18px] leading-none">{ovr}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[14px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Tu carta MVP 2026</p>
            <p className={`text-[12px] ${muted}`}>Genérala y compártela con tus stats</p>
          </div>
          <ChevronRight size={18} className={muted} />
        </Link>
      </div>
    </div>
  );
}
