"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { gamificationService } from "@/services/client/player/gamificationService";
import { bookingService, Booking } from "@/services/client/player/bookingService";
import {
  Trophy, CreditCard, Shield, TrendingUp, Swords,
  GraduationCap, ArrowRight, Calendar, Clock, MapPin, ChevronRight,
  Navigation, Ticket, Share2, Flame, Zap, Target, CheckCircle2,
  Sun, Cloud, CloudRain, CloudStorm, Repeat, Star, Lock, Trophy as TrophyIcon
} from "@/components/player/icons";
import { venueService } from "@/services/client/player/venueService";
import { getMatchWeather, MatchWeather } from "@/services/client/player/weather";
import Onboarding from "@/components/player/Onboarding";

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

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const WEATHER_ICON: Record<string, any> = { sun: Sun, cloud: Cloud, rain: CloudRain, storm: CloudStorm, fog: Cloud, snow: Cloud };

const coordsOf = (v: any) => {
  const t = v?.location || v?.coordinates || v?.coords || v || {};
  return { lat: parseFloat(t.latitude ?? t.lat ?? t._lat), lng: parseFloat(t.longitude ?? t.lng ?? t._long) };
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
  const [onboarded, setOnboarded] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [weather, setWeather] = useState<MatchWeather | null>(null);
  useEffect(() => { venueService.getVenues().then(setVenues).catch(() => {}); }, []);
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
  // Clima a la hora del partido (solo canchas con coordenadas y hasta 15 días)
  useEffect(() => {
    setWeather(null);
    if (!nb || !nbStart) return;
    const v = venues.find((x) => x.id === nb.tenantId);
    if (!v) return;
    const { lat, lng } = coordsOf(v);
    getMatchWeather(lat, lng, nbStart).then(setWeather).catch(() => {});
  }, [nb?.id, venues.length]);

  // "Tu cancha de siempre": recinto + día + hora que más se repite (al menos 2 veces)
  const usual = useMemo(() => {
    const counts = new Map<string, { n: number; b: any; day: number }>();
    for (const b of allBookings as any[]) {
      if (b.status === "cancelled" || b.isInternalMatch || !b.tenantId) continue;
      const st = matchStart(b);
      if (!st) continue;
      const k = `${b.tenantId}|${st.getDay()}|${b.startTime}`;
      const c = counts.get(k) || { n: 0, b, day: st.getDay() };
      c.n++; counts.set(k, c);
    }
    const top = [...counts.values()].sort((a, b) => b.n - a.n)[0];
    return top && top.n >= 2 ? top : null;
  }, [allBookings]);

  // Último partido jugado en los últimos 7 días sin evaluación
  const toRate = useMemo(() => {
    const week = now - 7 * 24 * 60 * 60_000;
    return (allBookings as any[])
      .filter((b) => isPlayed(b, now) && !(Number(b.rating) > 0))
      .map((b) => ({ b, st: matchStart(b) }))
      .filter((x) => x.st && x.st.getTime() > week)
      .sort((a, b) => b.st!.getTime() - a.st!.getTime())[0]?.b || null;
  }, [allBookings, now]);

  // Desafíos del mes y logros secretos (todo calculado con los partidos jugados)
  const goals = useMemo(() => {
    const played = (allBookings as any[]).filter((b) => isPlayed(b, now)).map((b) => ({ b, st: matchStart(b)! })).filter((x) => x.st);
    const nd = new Date(now);
    const month = played.filter((x) => x.st.getMonth() === nd.getMonth() && x.st.getFullYear() === nd.getFullYear());
    const venuesMonth = new Set(month.map((x) => x.b.tenantId)).size;
    const morningMonth = month.some((x) => x.st.getHours() >= 6 && x.st.getHours() < 12);
    const challenges = [
      { label: "Juega 4 partidos", value: Math.min(4, month.length), total: 4 },
      { label: "Juega en 2 recintos distintos", value: Math.min(2, venuesMonth), total: 2 },
      { label: "Juega un partido de mañana", value: morningMonth ? 1 : 0, total: 1 },
    ];
    const perVenue = new Map<string, number>();
    played.forEach((x) => perVenue.set(x.b.tenantId, (perVenue.get(x.b.tenantId) || 0) + 1));
    const sports = new Set(played.map((x) => String(x.b.sport || "").toLowerCase()).filter(Boolean));
    const secrets = [
      { name: "Madrugador", hint: "Juega antes de las 9:00", ok: played.some((x) => x.st.getHours() >= 6 && x.st.getHours() < 9) },
      { name: "Nocturno", hint: "Juega desde las 22:00", ok: played.some((x) => x.st.getHours() >= 22 || x.st.getHours() < 6) },
      { name: "Trotamundos", hint: "Juega en 3 recintos", ok: perVenue.size >= 3 },
      { name: "Multideporte", hint: "Juega 2 deportes distintos", ok: sports.size >= 2 },
      { name: "Fiel", hint: "10 partidos en el mismo recinto", ok: [...perVenue.values()].some((n) => n >= 10) },
      { name: "Imparable", hint: "Racha de 4 semanas", ok: false },
    ];
    return { challenges, secrets };
  }, [allBookings, now]);

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

        {/* Onboarding: solo si faltan deporte o comuna */}
        {user?.uid && profile && (!(profile as any).mainSport || !(profile as any).city) && !onboarded && (
          <Onboarding uid={user.uid} isDark={isDark} initial={{ mainSport: (profile as any).mainSport, city: (profile as any).city }} onDone={() => setOnboarded(true)} />
        )}

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
              {weather && (() => { const W = WEATHER_ICON[weather.icon] || Cloud; return (
                <p className={`mt-2 flex items-center gap-1.5 text-[12px] ${weather.rainChance >= 50 ? "text-sky-400" : muted}`}>
                  <W size={14} /> {weather.temp}° · {weather.label}{weather.rainChance >= 20 ? ` · ${weather.rainChance}% lluvia` : ""}
                </p>
              ); })()}
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

        {/* Evaluar el último partido */}
        {toRate && (
          <Link href={`/player/estadisticas?registrar=${toRate.id}`} className={`flex items-center gap-3 rounded-md ${card} p-4 active:opacity-90`}>
            <div className="w-10 h-10 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0"><Star size={20} color="#f59e0b" /></div>
            <div className="flex-1 min-w-0">
              <p className={`text-[14px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>¿Cómo te fue?</p>
              <p className={`text-[12px] truncate ${muted}`}>Registra tu partido en {toRate.tenantName || "la cancha"} y suma a tus estadísticas</p>
            </div>
            <ChevronRight size={18} className={muted} />
          </Link>
        )}

        {/* Tu cancha de siempre: reserva en un toque */}
        {usual && (!nb || nb.tenantId !== usual.b.tenantId || nb.startTime !== usual.b.startTime) && (
          <Link href={`/player/clubes/${usual.b.tenantId}?sport=${encodeURIComponent(usual.b.sport || "")}`} className={`flex items-center gap-3 rounded-md ${card} p-4 active:opacity-90`}>
            <div className="w-10 h-10 rounded-md bg-emerald-500/15 flex items-center justify-center shrink-0"><Repeat size={20} color="#10b981" /></div>
            <div className="flex-1 min-w-0">
              <p className={`text-[12px] font-semibold ${muted}`}>Tu cancha de siempre</p>
              <p className={`text-[14px] font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{usual.b.tenantName || "Tu recinto"} · {DAY_NAMES[usual.day]} {usual.b.startTime}</p>
            </div>
            <span className="text-[12px] font-semibold text-emerald-500 shrink-0">Reservar</span>
          </Link>
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
        {prog && (
          <Link href="/player/ranking" className="-mt-3 block text-right text-[12px] font-semibold text-emerald-500">Ver ranking de jugadores →</Link>
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

        {/* Desafíos del mes */}
        <section aria-label="Desafíos del mes" className={`rounded-md ${card} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-[13px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Desafíos de {new Date(now).toLocaleDateString("es-CL", { month: "long" })}</p>
            <p className={`text-[12px] ${muted}`}>{goals.challenges.filter((c) => c.value >= c.total).length}/{goals.challenges.length} listos</p>
          </div>
          <ul className="space-y-3">
            {goals.challenges.map((c) => {
              const done = c.value >= c.total;
              return (
                <li key={c.label}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className={`flex items-center gap-1.5 ${done ? "text-emerald-500 font-semibold" : isDark ? "text-slate-300" : "text-slate-700"}`}>{done && <CheckCircle2 size={13} />}{c.label}</span>
                    <span className={`tabular-nums ${muted}`}>{c.value}/{c.total}</span>
                  </div>
                  <div className={`h-1.5 rounded-full mt-1.5 overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(c.value / c.total) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Logros secretos: se descubren jugando */}
        <section aria-label="Logros secretos">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className={`text-[12px] font-semibold ${muted}`}>Logros secretos</h2>
            <p className={`text-[12px] ${muted}`}>{goals.secrets.filter((x) => x.ok || (x.name === "Imparable" && activity.streak >= 4)).length}/{goals.secrets.length}</p>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {goals.secrets.map((x) => {
              const ok = x.ok || (x.name === "Imparable" && activity.streak >= 4);
              return (
                <div key={x.name} title={ok ? x.name : x.hint} className={`shrink-0 w-[104px] rounded-md p-3 border ${ok ? "border-amber-500/30 bg-amber-500/10" : isDark ? "border-white/[0.06] bg-[#0A101D]" : "border-slate-200 bg-white"}`}>
                  {ok ? <TrophyIcon size={18} color="#f59e0b" /> : <Lock size={18} color={isDark ? "#475569" : "#94a3b8"} />}
                  <p className={`text-[12px] font-semibold mt-1.5 ${ok ? "text-amber-500" : isDark ? "text-slate-400" : "text-slate-500"}`}>{ok ? x.name : "???"}</p>
                  <p className={`text-[11px] leading-tight mt-0.5 ${muted}`}>{x.hint}</p>
                </div>
              );
            })}
          </div>
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
