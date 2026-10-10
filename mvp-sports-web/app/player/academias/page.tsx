"use client";
import { GlowCard, SectionPill } from "@/components/player/ui";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, GraduationCap, Users, Clock, CalendarDays, CreditCard, CheckCircle2, X, User as UserIcon } from "@/components/player/icons";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { academyService, type AcademyClass } from "@/services/player/academyService";

const ACCENT = "#8b5cf6";
const AGE: Record<string, string> = { libre: "Libre", infantil: "Infantil", juvenil: "Juvenil", adultos: "Adultos", senior: "Senior", todos: "Todas las edades" };
const fmtCLP = (n?: number) => `$${Number(n || 0).toLocaleString("es-CL")}`;

export default function AcademiasPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { theme } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [classes, setClasses] = useState<AcademyClass[]>([]);
  const [mine, setMine] = useState<Record<string, { paymentStatus: string }>>({});
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState("Todas");
  const [selected, setSelected] = useState<AcademyClass | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Las inscripciones no deben impedir ver las clases (p. ej. si las reglas aún no están publicadas)
      const [cls, enr] = await Promise.all([
        academyService.getClasses(),
        user ? academyService.getMyEnrollments(user.uid).catch((e) => { console.warn('Inscripciones no disponibles:', e); return {}; }) : Promise.resolve({}),
      ]);
      setClasses(cls);
      setMine(enr);
    } catch (e) {
      console.error(e);
      setToast({ type: "error", msg: "No pudimos cargar las academias. Intenta nuevamente." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Regreso desde Mercado Pago
  useEffect(() => {
    if (params.get("enrolled")) setToast({ type: "ok", msg: "¡Pago aprobado! Ya estás inscrito en la clase." });
  }, [params]);

  const sports = useMemo(() => ["Todas", ...Array.from(new Set(classes.map(c => c.sport).filter(Boolean) as string[]))], [classes]);
  const visible = classes.filter(c => sport === "Todas" || c.sport === sport);
  const myClasses = classes.filter(c => mine[c.id]);

  const enroll = async (c: AcademyClass, payOnline: boolean) => {
    setBusy(true);
    try {
      const res = await academyService.enroll(c.id, payOnline);
      if (res.url) { window.location.href = res.url; return; }
      setSelected(null);
      setToast({ type: "ok", msg: c.price ? "¡Inscrito! Paga la mensualidad en el recinto." : "¡Inscrito en la clase!" });
      await load();
    } catch (e: any) {
      setToast({ type: "error", msg: e.message || "No se pudo completar la inscripción." });
    } finally {
      setBusy(false);
    }
  };

  const txt = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-400" : "text-slate-500";

  const ClassCard = ({ c }: { c: AcademyClass }) => {
    const free = Math.max(0, Number(c.maxStudents || 0) - Number(c.enrolledStudents || 0));
    const full = !!c.maxStudents && free === 0;
    const enrolled = !!mine[c.id];
    return (
      <GlowCard isDark={isDark}>
        <button onClick={() => setSelected(c)} className="w-full text-left p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${ACCENT}18` }}>
              <GraduationCap size={20} style={{ color: ACCENT }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>{c.sport || "Academia"}</span>
                {c.ageGroup && <span className={`text-[11px] ${sub}`}>· {AGE[c.ageGroup] || c.ageGroup}</span>}
              </div>
              <p className={`text-[15px] font-semibold leading-snug ${txt}`}>{c.name}</p>
              {c.instructor && <p className={`text-xs mt-0.5 ${sub}`}>{c.instructor}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-semibold ${txt}`}>{c.price ? fmtCLP(c.price) : "Gratis"}</p>
              {!!c.price && <p className={`text-[11px] ${sub}`}>mensual</p>}
            </div>
          </div>
          <div className={`mt-3 pt-3 border-t flex items-center justify-between gap-2 text-xs ${isDark ? "border-white/5" : "border-slate-100"}`}>
            <span className={`flex items-center gap-1.5 ${sub}`}><CalendarDays size={14} /> {(c.daysOfWeek || []).map(d => d.slice(0, 3)).join(" · ") || "Por definir"}</span>
            <span className={`flex items-center gap-1.5 ${sub}`}><Clock size={14} /> {c.startTime || "--"}{c.endTime ? `–${c.endTime}` : ""}</span>
            {enrolled ? (
              <span className="flex items-center gap-1 font-semibold text-emerald-500"><CheckCircle2 size={14} /> Inscrito</span>
            ) : full ? (
              <span className="font-semibold text-rose-500">Sin cupos</span>
            ) : (
              <span className="font-semibold" style={{ color: ACCENT }}>{c.maxStudents ? `${free} cupos` : "Cupos libres"}</span>
            )}
          </div>
        </button>
      </GlowCard>
    );
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <button aria-label="Volver" onClick={() => router.back()} className={`w-10 h-10 rounded-md flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/6" : "bg-slate-100"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-heading font-black text-base tracking-tight uppercase flex-1 text-center">Academias</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-1 pb-4 space-y-4">
        {/* Filtro por deporte */}
        {sports.length > 2 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {sports.map(s => (
              <button key={s} onClick={() => setSport(s)}
                className={`h-9 px-4 rounded-md text-xs font-semibold whitespace-nowrap border transition-all ${sport === s ? "text-white border-transparent" : isDark ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-600"}`}
                style={sport === s ? { backgroundColor: ACCENT } : undefined}>{s}</button>
            ))}
          </div>
        )}

        {myClasses.length > 0 && (
          <>
            <SectionPill label="Mis clases" className="px-0! mt-2!" />
            {myClasses.map(c => <ClassCard key={c.id} c={c} />)}
          </>
        )}

        <SectionPill label="Clases disponibles" className="px-0! mt-2!" />
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : visible.length === 0 ? (
          <div className="py-14 flex flex-col items-center text-center">
            <GraduationCap size={32} className={isDark ? "text-slate-600" : "text-slate-300"} />
            <p className={`text-sm font-medium mt-3 ${sub}`}>No hay clases publicadas por ahora</p>
            <p className={`text-[13px] mt-1 ${sub}`}>Vuelve pronto o reserva una cancha para entrenar.</p>
            <a href="/player/clubes" className="mt-4 px-5 h-10 inline-flex items-center rounded-md text-[13px] font-semibold bg-emerald-500 text-white">Reservar cancha</a>
          </div>
        ) : (
          visible.map(c => <ClassCard key={c.id} c={c} />)
        )}
      </div>

      {/* Detalle e inscripción */}
      {selected && (() => {
        const c = selected;
        const free = Math.max(0, Number(c.maxStudents || 0) - Number(c.enrolledStudents || 0));
        const full = !!c.maxStudents && free === 0;
        const enrolled = mine[c.id];
        return (
          <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => !busy && setSelected(null)}>
            <div className={`w-full rounded-t-md p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto ${isDark ? "bg-[#0A101D]" : "bg-white"}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>{c.sport || "Academia"}</p>
                  <h2 className={`text-lg font-heading font-black ${txt}`}>{c.name}</h2>
                </div>
                <button aria-label="Cerrar" onClick={() => setSelected(null)} className={`w-9 h-9 rounded-md flex items-center justify-center ${isDark ? "bg-white/6" : "bg-slate-100"}`}><X size={18} /></button>
              </div>
              {c.description && <p className={`text-sm mb-4 ${sub}`}>{c.description}</p>}
              <div className={`grid grid-cols-2 gap-2.5 mb-4 text-sm`}>
                {[
                  { icon: UserIcon, label: "Profesor", value: c.instructor || "Por confirmar" },
                  { icon: Users, label: "Edad", value: AGE[c.ageGroup || ""] || c.ageGroup || "Todas" },
                  { icon: CalendarDays, label: "Días", value: (c.daysOfWeek || []).join(", ") || "Por definir" },
                  { icon: Clock, label: "Horario", value: `${c.startTime || "--"}${c.endTime ? ` – ${c.endTime}` : ""}` },
                  { icon: CreditCard, label: "Mensualidad", value: c.price ? fmtCLP(c.price) : "Gratis" },
                  { icon: GraduationCap, label: "Cupos", value: c.maxStudents ? `${free} de ${c.maxStudents}` : "Libres" },
                ].map(r => (
                  <div key={r.label} className={`p-3 rounded-md border ${isDark ? "border-white/5 bg-white/2" : "border-slate-200 bg-slate-50"}`}>
                    <p className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${sub}`}><r.icon size={13} /> {r.label}</p>
                    <p className={`mt-1 text-sm font-semibold ${txt}`}>{r.value}</p>
                  </div>
                ))}
              </div>
              {enrolled ? (
                <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-500 text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 size={18} /> Ya estás inscrito{enrolled.paymentStatus === "pending" ? " · pago pendiente en el recinto" : ""}
                </div>
              ) : full ? (
                <div className="p-3 rounded-md bg-rose-500/10 text-rose-500 text-sm font-semibold">No quedan cupos en esta clase</div>
              ) : (
                <div className="space-y-2.5">
                  {!!c.price && (
                    <button disabled={busy} onClick={() => enroll(c, true)} className="w-full h-12 rounded-md text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: ACCENT }}>
                      <CreditCard size={18} /> Pagar {fmtCLP(c.price)} con Mercado Pago
                    </button>
                  )}
                  <button disabled={busy} onClick={() => enroll(c, false)} className={`w-full h-12 rounded-md text-sm font-semibold border disabled:opacity-60 ${c.price ? (isDark ? "border-white/10 text-slate-200" : "border-slate-200 text-slate-700") : "text-white border-transparent"}`} style={!c.price ? { backgroundColor: ACCENT } : undefined}>
                    {busy ? "Procesando…" : c.price ? "Inscribirme y pagar en el recinto" : "Inscribirme"}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {toast && (
        <div className="fixed inset-x-4 top-4 z-60" role="status" onClick={() => setToast(null)}>
          <div className={`p-3.5 rounded-md text-sm font-semibold text-white ${toast.type === "ok" ? "bg-emerald-600" : "bg-rose-600"}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
