"use client";
import { GlowCard, SectionPill } from "@/components/player/ui";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Trophy, Users, CalendarDays, CreditCard, CheckCircle2, X, Shield, Award, Info } from "@/components/player/icons";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { tournamentService } from "@/services/client/player/tournamentService";
import { venueService } from "@/services/client/player/venueService";
import CardPayment from "@/components/player/CardPayment";
import { teamService } from "@/services/client/player/teamService";

const ACCENT = "#f43f5e";
const STATUS: Record<string, string> = { upcoming: "Inscripciones abiertas", open: "Inscripciones abiertas", active: "En curso", completed: "Finalizado", finished: "Finalizado" };
const TYPE: Record<string, string> = { liga: "Liga", eliminacion: "Eliminación directa", fase_grupos: "Fase de grupos" };
const fmtCLP = (n?: number) => `$${Number(n || 0).toLocaleString("es-CL")}`;
const norm = (s = "") => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const fmtDate = (d: any) => {
  if (!d) return "Por definir";
  const iso = d?.seconds ? new Date(d.seconds * 1000).toISOString().slice(0, 10) : String(d);
  const [y, m, day] = iso.split("-");
  if (!y || !m || !day) return iso;
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(day)} ${months[Number(m) - 1]} ${y}`;
};

export default function TorneosPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { theme } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [teamId, setTeamId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [payingCard, setPayingCard] = useState(false);
  useEffect(() => { setPayingCard(false); }, [selected]);
  useEffect(() => { venueService.getVenues().then(setVenues).catch(() => {}); }, []);
  // Mercado Pago solo si el recinto del torneo lo tiene activo
  const venueOf = (t: any) => venues.find((x: any) => x.id === t.tenantId || x.id === t.venueId);
  const mpActiveFor = (t: any) => {
    const v = venueOf(t);
    return !!v && v.isMercadopagoActive !== false && !!(v.isMercadopagoActive || v.mercadopagoPublicKey);
  };
  const [toast, setToast] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [ts, teams] = await Promise.all([tournamentService.getTournaments(), user ? teamService.getUserTeams(user.uid) : Promise.resolve([])]);
      setTournaments(ts.filter((t: any) => t.isVisibleInApp !== false));
      setMyTeams(teams);
    } catch (e) {
      console.error(e);
      setToast({ type: "error", msg: "No pudimos cargar los torneos. Intenta nuevamente." });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Regreso desde Mercado Pago
  useEffect(() => {
    if (params.get("registered")) setToast({ type: "ok", msg: "¡Pago aprobado! Tu equipo quedó inscrito." });
  }, [params]);

  const myTeamIds = useMemo(() => new Set(myTeams.map(t => t.id)), [myTeams]);
  const myRegistered = (t: any) => (t.teams || []).find((x: any) => myTeamIds.has(x.id));
  const isClosed = (t: any) => t.status === "finished" || t.status === "completed" || (t.registrationEndDate && new Date(`${t.registrationEndDate}T23:59:59`) < new Date());
  const isFull = (t: any) => !!t.maxTeams && (t.teams?.length || t.enrolledTeams || 0) >= Number(t.maxTeams);
  // Equipos del capitán que coinciden con el deporte del torneo
  const eligibleTeams = (t: any) => myTeams.filter(team => team.ownerId === user?.uid && (!t.sport || norm(team.sport).includes(norm(t.sport).slice(0, 5)) || norm(t.sport).includes(norm(team.sport).slice(0, 5))));

  const open = (t: any) => { setSelected(t); setTeamId(eligibleTeams(t)[0]?.id || ""); };

  const register = async (payOnline: boolean) => {
    if (!selected || !teamId) return;
    setBusy(true);
    try {
      const res = await tournamentService.registerTeam(selected.id, teamId, payOnline);
      if (res.url) { window.location.href = res.url; return; }
      setSelected(null); setPayingCard(false);
      setToast({ type: "ok", msg: selected.price ? "¡Equipo inscrito! Paga la inscripción en el recinto." : "¡Equipo inscrito!" });
      await load();
    } catch (e: any) {
      setToast({ type: "error", msg: e.message || "No se pudo completar la inscripción." });
    } finally {
      setBusy(false);
    }
  };

  const txt = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-400" : "text-slate-500";
  const active = tournaments.filter(t => !isClosed(t));
  const past = tournaments.filter(t => isClosed(t));

  const Card = ({ t }: { t: any }) => {
    const reg = myRegistered(t);
    const count = t.teams?.length || t.enrolledTeams || 0;
    return (
      <GlowCard isDark={isDark}>
        <button onClick={() => open(t)} className="w-full text-left p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${ACCENT}18` }}>
              <Trophy size={20} style={{ color: ACCENT }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>{t.sport || "Torneo"}</span>
                <span className={`text-[11px] ${sub}`}>· {TYPE[t.type] || t.type || "Liga"}</span>
              </div>
              <p className={`text-[14px] font-semibold leading-snug ${txt}`}>{t.name}</p>
              <p className={`text-[11px] mt-0.5 ${sub}`}>{STATUS[t.status] || "Inscripciones abiertas"}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-[13px] font-semibold ${txt}`}>{t.price ? fmtCLP(t.price) : "Gratis"}</p>
              <p className={`text-[11px] ${sub}`}>por equipo</p>
            </div>
          </div>
          <div className={`mt-3 pt-3 border-t flex items-center justify-between gap-2 text-[11px] ${isDark ? "border-white/5" : "border-slate-100"}`}>
            <span className={`flex items-center gap-1.5 ${sub}`}><CalendarDays size={14} /> {fmtDate(t.tournamentStartDate || t.startDate)}</span>
            <span className={`flex items-center gap-1.5 ${sub}`}><Users size={14} /> {count}/{t.maxTeams || "∞"}</span>
            {reg ? <span className="flex items-center gap-1 font-semibold text-emerald-500"><CheckCircle2 size={14} /> Inscrito</span>
              : isClosed(t) ? <span className={`font-semibold ${sub}`}>Cerrado</span>
              : isFull(t) ? <span className="font-semibold text-rose-500">Sin cupos</span>
              : <span className="font-semibold" style={{ color: ACCENT }}>Inscribirse</span>}
          </div>
        </button>
      </GlowCard>
    );
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <button aria-label="Volver" onClick={() => router.back()} className={`w-10 h-10 rounded-md flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/6" : "bg-slate-100"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-heading font-black text-[15px] tracking-tight uppercase flex-1 text-center">Torneos</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-1 pb-4 space-y-4">
        <SectionPill label="Torneos abiertos" className="px-0! mt-2!" />
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : active.length === 0 ? (
          <div className="py-14 flex flex-col items-center text-center">
            <Trophy size={32} className={isDark ? "text-slate-600" : "text-slate-300"} />
            <p className={`text-[13px] font-medium mt-3 ${sub}`}>No hay torneos con inscripciones abiertas</p>
            <p className={`text-[12px] mt-1 ${sub}`}>Mientras tanto, arma un partido con otro equipo.</p>
            <a href="/player/equipos/partidos" className="mt-4 px-5 h-10 inline-flex items-center rounded-md text-[12px] font-semibold bg-emerald-500 text-white">Buscar rival</a>
          </div>
        ) : active.map(t => <Card key={t.id} t={t} />)}

        {past.length > 0 && (
          <>
            <SectionPill label="Finalizados o cerrados" className="px-0! mt-4!" />
            {past.map(t => <Card key={t.id} t={t} />)}
          </>
        )}
      </div>

      {selected && (() => {
        const t = selected;
        const reg = myRegistered(t);
        const eligible = eligibleTeams(t);
        const closed = isClosed(t), full = isFull(t);
        const prizes = [t.prize1, t.prize2, t.prize3].filter(Boolean);
        return (
          <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => !busy && setSelected(null)}>
            <div className={`w-full rounded-t-md p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[88vh] overflow-y-auto ${isDark ? "bg-[#0A101D]" : "bg-white"}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>{t.sport || "Torneo"} · {TYPE[t.type] || t.type || "Liga"}</p>
                  <h2 className={`text-[16px] font-heading font-black ${txt}`}>{t.name}</h2>
                </div>
                <button aria-label="Cerrar" onClick={() => setSelected(null)} className={`w-9 h-9 rounded-md flex items-center justify-center ${isDark ? "bg-white/6" : "bg-slate-100"}`}><X size={18} /></button>
              </div>
              {t.description && <p className={`text-[13px] mb-4 ${sub}`}>{t.description}</p>}

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                {[
                  { icon: CalendarDays, label: "Inicio", value: fmtDate(t.tournamentStartDate || t.startDate) },
                  { icon: CalendarDays, label: "Cierre inscripción", value: fmtDate(t.registrationEndDate) },
                  { icon: Users, label: "Equipos", value: `${t.teams?.length || t.enrolledTeams || 0} de ${t.maxTeams || "∞"}` },
                  { icon: Shield, label: "Jugadores por equipo", value: t.teamSize ? String(t.teamSize) : "Libre" },
                  { icon: CreditCard, label: "Inscripción", value: t.price ? fmtCLP(t.price) : "Gratis" },
                  { icon: Info, label: "Categoría", value: t.category || "Libre" },
                ].map(r => (
                  <div key={r.label} className={`p-3 rounded-md border ${isDark ? "border-white/5 bg-white/2" : "border-slate-200 bg-slate-50"}`}>
                    <p className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${sub}`}><r.icon size={13} /> {r.label}</p>
                    <p className={`mt-1 text-[13px] font-semibold capitalize ${txt}`}>{r.value}</p>
                  </div>
                ))}
              </div>

              {prizes.length > 0 && (
                <div className={`p-3 rounded-md border mb-4 ${isDark ? "border-white/5" : "border-slate-200"}`}>
                  <p className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide mb-2 ${sub}`}><Award size={13} /> Premios</p>
                  {prizes.map((p: string, i: number) => <p key={i} className={`text-[13px] ${txt}`}>{i + 1}° · {p}</p>)}
                </div>
              )}
              {t.rules && (
                <div className={`p-3 rounded-md border mb-4 ${isDark ? "border-white/5" : "border-slate-200"}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${sub}`}>Bases</p>
                  <p className={`text-[13px] whitespace-pre-line ${sub}`}>{t.rules}</p>
                </div>
              )}
              {(t.teams?.length || 0) > 0 && (
                <div className={`p-3 rounded-md border mb-4 ${isDark ? "border-white/5" : "border-slate-200"}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${sub}`}>Equipos inscritos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.teams.map((x: any) => <span key={x.id} className={`px-2.5 py-1 rounded-md text-[11px] ${myTeamIds.has(x.id) ? "bg-emerald-500/15 text-emerald-500 font-semibold" : isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{x.name}</span>)}
                  </div>
                </div>
              )}

              {reg ? (
                <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-500 text-[13px] font-semibold flex items-center gap-2"><CheckCircle2 size={18} /> {reg.name} ya está inscrito</div>
              ) : closed ? (
                <div className={`p-3 rounded-md text-[13px] font-semibold ${isDark ? "bg-white/4 text-slate-400" : "bg-slate-100 text-slate-500"}`}>Las inscripciones están cerradas</div>
              ) : full ? (
                <div className="p-3 rounded-md bg-rose-500/10 text-rose-500 text-[13px] font-semibold">No quedan cupos</div>
              ) : eligible.length === 0 ? (
                <div className="space-y-2.5">
                  <p className={`text-[13px] ${sub}`}>Para inscribirte necesitas ser capitán de un equipo de {t.sport || "este deporte"}.</p>
                  <button onClick={() => router.push("/player/equipos")} className="w-full h-12 rounded-md text-white text-[13px] font-semibold" style={{ backgroundColor: ACCENT }}>Crear o gestionar equipos</button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <label className={`block text-[11px] font-semibold uppercase tracking-wide ${sub}`}>Equipo</label>
                  <select value={teamId} onChange={e => setTeamId(e.target.value)} className={`w-full h-12 px-3 rounded-md border outline-hidden ${isDark ? "bg-white/4 border-white/10 text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}>
                    {eligible.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                  {!!t.price && mpActiveFor(t) && (payingCard ? (
                    <CardPayment tenantId={venueOf(t)?.id || ""} amount={Number(t.price)} isDark={isDark}
                      onPay={(card, save) => tournamentService.registerTeam(t.id, teamId, true, card, save)}
                      onApproved={async () => { setPayingCard(false); setSelected(null); setPayingCard(false); setToast({ type: "ok", msg: "¡Pago aprobado! Tu equipo quedó inscrito." }); await load(); }} />
                  ) : (
                    <button disabled={busy || !teamId} onClick={() => setPayingCard(true)} className="w-full h-12 rounded-md text-white text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: ACCENT }}>
                      <CreditCard size={18} /> Pagar {fmtCLP(t.price)} con tarjeta
                    </button>
                  ))}
                  {!t.price ? (<button disabled={busy || !teamId} onClick={() => register(false)} className={`w-full h-12 rounded-md text-[13px] font-semibold border disabled:opacity-60 ${t.price && mpActiveFor(t) ? (isDark ? "border-white/10 text-slate-200" : "border-slate-200 text-slate-700") : "text-white border-transparent"}`} style={!(t.price && mpActiveFor(t)) ? { backgroundColor: ACCENT } : undefined}>
                    {busy ? "Procesando…" : "Inscribir equipo"}
                  </button>) : !mpActiveFor(t) && (<p className="text-[12px] text-rose-500">Este recinto aún no tiene pagos online habilitados.</p>)}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {toast && (
        <div className="fixed inset-x-4 top-4 z-60" role="status" onClick={() => setToast(null)}>
          <div className={`p-3.5 rounded-md text-[13px] font-semibold text-white ${toast.type === "ok" ? "bg-emerald-600" : "bg-rose-600"}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
