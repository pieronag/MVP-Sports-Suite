"use client";
import { useEffect, useState } from "react";
import { matchmakingService, MatchEntry } from "@/services/client/player/matchmakingService";
import { UserGroup, Minus, Plus } from "@/components/player/icons";

// "Completar equipo": publica que a esta reserva le faltan jugadores (se ve en Partidos › Jugadores)
export default function FindPlayers({ booking, profile, isDark }: { booking: any; profile: any; isDark: boolean }) {
  const [entry, setEntry] = useState<MatchEntry | null>(null);
  const [needed, setNeeded] = useState(2);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const uid = profile?.uid;

  useEffect(() => {
    if (!uid || !booking?.id) return;
    matchmakingService.getMyNeed(uid, booking.id).then((e) => { setEntry(e); if (e?.needed) setNeeded(e.needed); }).catch(() => {});
  }, [uid, booking?.id]);

  if (!uid || booking?.userId !== uid) return null;

  const dayOf = () => {
    const r = booking.date;
    const d = r?.toDate ? r.toDate() : r?.seconds ? new Date(r.seconds * 1000) : /^\d{4}-\d{2}-\d{2}$/.test(String(r)) ? new Date(`${r}T12:00:00`) : new Date(r);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  const publish = async () => {
    setBusy(true);
    try {
      await matchmakingService.publishNeed({
        userId: uid, displayName: profile.displayName || "Jugador", photoURL: profile.photoURL || undefined,
        sport: booking.sport || "Fútbol", bookingId: booking.id, tenantName: booking.tenantName || "Recinto",
        courtName: booking.courtName || "Cancha", day: dayOf(), startTime: booking.startTime, needed,
        communes: profile.city ? [profile.city] : undefined,
      });
      setEntry(await matchmakingService.getMyNeed(uid, booking.id));
      setOpen(false);
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!entry) return;
    setBusy(true);
    try { await matchmakingService.closeEntry(entry.id); setEntry(null); } finally { setBusy(false); }
  };

  const card = isDark ? "bg-[#0A101D] border border-white/[0.06]" : "bg-white border border-slate-200";
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  if (entry && !open) {
    return (
      <div className={`rounded-md ${card} p-4 flex items-center gap-3`}>
        <UserGroup size={20} color="#10b981" />
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Buscando {entry.needed} jugador{entry.needed === 1 ? "" : "es"}</p>
          <p className={`text-[12px] ${muted}`}>Visible en Partidos › Jugadores. Te escriben al chat de Partidos.</p>
        </div>
        <button disabled={busy} onClick={() => setOpen(true)} className="text-[12px] font-semibold text-emerald-500">Editar</button>
        <button disabled={busy} onClick={remove} className="text-[12px] font-semibold text-rose-500">Quitar</button>
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={`w-full rounded-md ${card} p-4 flex items-center gap-3 text-left active:opacity-90`}>
        <UserGroup size={20} color="#10b981" />
        <div className="flex-1">
          <p className={`text-[13px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>¿Te faltan jugadores?</p>
          <p className={`text-[12px] ${muted}`}>Publica tu partido y que otros se sumen</p>
        </div>
        <span className="text-[12px] font-semibold text-emerald-500">Buscar</span>
      </button>
    );
  }

  return (
    <div className={`rounded-md ${card} p-4 space-y-3`}>
      <p className={`text-[13px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>¿Cuántos jugadores te faltan?</p>
      <div className="flex items-center justify-center gap-4">
        <button aria-label="Menos" onClick={() => setNeeded((n) => Math.max(1, n - 1))} className={`w-11 h-11 rounded-md flex items-center justify-center ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}><Minus size={16} /></button>
        <span className={`w-10 text-center text-[22px] font-bold tabular-nums ${isDark ? "text-slate-100" : "text-slate-900"}`}>{needed}</span>
        <button aria-label="Más" onClick={() => setNeeded((n) => Math.min(10, n + 1))} className="w-11 h-11 rounded-md flex items-center justify-center bg-emerald-500 text-white"><Plus size={16} /></button>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className={`flex-1 h-11 rounded-md text-[13px] font-semibold ${isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-600"}`}>Cancelar</button>
        <button disabled={busy} onClick={publish} className="flex-[2] h-11 rounded-md text-[13px] font-semibold bg-emerald-500 text-white disabled:opacity-60">{entry ? "Actualizar" : "Publicar"}</button>
      </div>
    </div>
  );
}
