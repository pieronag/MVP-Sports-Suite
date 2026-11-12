"use client";
// Check-in del día (recepción): escanear el QR del ticket, buscar por código o nombre, registrar ingreso o inasistencia.
// Qué puede hacerse con cada reserva lo decide utils/checkinDay con las mismas reglas que el servidor.
import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon, ArrowDown01Icon, Camera01Icon, CheckmarkCircle02Icon, Clock01Icon, IdentityCardIcon, QrCode01Icon, RefreshIcon,
  Search01Icon, Store01Icon, UnavailableIcon, UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import PageTitle, { Accent } from "@/components/dashboard/PageTitle";
import { useFeedback } from "@/components/ui/Feedback";
import { BookingRow, CameraOverlay, ConfirmCheckin, formatCLP } from "@/components/checkin/CheckinViews";
import { useAuth } from "@/context/AuthContext";
import { useNow } from "@/hooks/useNow";
import { useQrScanner } from "@/hooks/useQrScanner";
import { postApi } from "@/services/client/apiClient";
import { auditService } from "@/services/client/auditService";
import { listBookings } from "@/services/client/data/bookings";
import { db } from "@/services/client/firebase";
import { getOwnedTenantsSnap } from "@/services/client/ownedTenants";
import { isReal } from "@/utils/bookingModel";
import { operatingDay } from "@/utils/chileTime";
import {
  canFlagNoShow, checkinBlocker, checkinState, findBookings, matchesFilter, summarizeCheckins, type CheckinBooking, type CheckinFilter,
} from "@/utils/checkinDay";

type IconType = typeof QrCode01Icon;
const Icon = ({ icon, className }: { icon: IconType; className?: string }) => <HugeiconsIcon icon={icon} className={className} strokeWidth={1.6} />;
const chileHHMM = (d: Date) => d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" });
const FILTERS: { id: CheckinFilter; label: string }[] = [
  { id: "pending", label: "Por llegar" }, { id: "in", label: "Ingresaron" }, { id: "noshow", label: "No llegaron" },
  { id: "cancelled", label: "Anuladas" }, { id: "all", label: "Todas" },
];

export default function CheckInPage() {
  const now = new Date(useNow(15_000));
  const { alert, confirm, toast } = useFeedback();
  const { user, role, firestoreUser } = useAuth();

  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [venueId, setVenueId] = useState("");
  const [bookings, setBookings] = useState<CheckinBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CheckinFilter>("pending");
  const [confirming, setConfirming] = useState<CheckinBooking | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Recintos: el personal ve los suyos; el dueño, los que administra
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        let list: { id: string; name: string }[] = [];
        if (role === "manager" || role === "staff") {
          const ids: string[] = firestoreUser?.tenantIds || (firestoreUser?.tenantId ? [firestoreUser.tenantId] : []);
          for (let i = 0; i < ids.length; i += 10) {
            const snap = await getDocs(query(collection(db, "tenants"), where(documentId(), "in", ids.slice(i, i + 10))));
            list.push(...snap.docs.map((d) => ({ id: d.id, name: d.data().name || d.id })));
          }
        } else {
          list = (await getOwnedTenantsSnap(user.uid)).docs.map((d) => ({ id: d.id, name: d.data().name || d.id }));
        }
        setVenues(list);
        setVenueId((v) => v || list[0]?.id || "");
        if (!list.length) setLoading(false);
      } catch (e) {
        console.error("Recintos", e);
        setLoading(false);
      }
    })();
  }, [user?.uid, role, firestoreUser]);

  // Reservas del día operativo (06:00 a 05:59, hora de Chile)
  const load = useCallback(async (silent = false) => {
    if (!venueId) return;
    if (!silent) setLoading(true);
    try {
      const { from, to } = operatingDay();
      const list = (await listBookings([venueId], { from, to })).filter(isReal).map((b): CheckinBooking => {
        const start = b.start || new Date();
        return {
          id: b.id, clientName: b.clientName || "Jugador", courtName: b.courtName || "Cancha", sport: b.sport || b.raw.category || "",
          start, startTimeStr: b.startTime || chileHHMM(start), endTimeStr: b.endTime || null,
          status: String(b.raw.status || ""), paymentStatus: b.isNoShow ? "no-show" : String(b.payment),
          checkIn: !!b.raw.checkIn, noShow: b.isNoShow, cancelledBy: b.raw.cancelledBy, price: b.price || 0,
        };
      }).sort((a, z) => a.start.getTime() - z.start.getTime());
      setBookings(list);
    } catch (e) {
      console.error("Reservas del día", e);
      if (!silent) alert("No se pudieron cargar las reservas", (e as { code?: string })?.code === "permission-denied" ? "Tu cuenta no tiene permisos sobre este recinto." : "Revisa tu conexión e inténtalo nuevamente.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [venueId, alert]);

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- carga de datos al cambiar de recinto
  // Las reservas nuevas del día llegan solas: al volver a la pestaña y cada 2 minutos
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") load(true); };
    const t = setInterval(refresh, 120_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);

  const tryCheckIn = (b: CheckinBooking) => {
    const blocker = checkinBlocker(b, now);
    if (blocker) { alert(b.checkIn ? "Ya ingresó" : "No puede ingresar", blocker); return; }
    setConfirming(b);
  };

  // Lo que traiga el jugador: QR (id), código del ticket o nombre
  const resolve = (input: string, source: "qr" | "manual") => {
    const found = findBookings(bookings, input);
    if (!found.length) {
      alert(source === "qr" ? "QR no reconocido" : "Sin resultados", source === "qr" ? "Ese QR no corresponde a una reserva de hoy en este recinto." : "No hay reservas de hoy con ese código o nombre.");
      return;
    }
    if (found.length > 1) {
      setSearch(input.trim());
      setFilter("all");
      toast(`Hay ${found.length} reservas que coinciden: elige la correcta en la lista`, "info");
      return;
    }
    setSearch("");
    tryCheckIn(found[0]);
  };
  const { isCameraOpen, cameraError, cameraPermission, startCamera, stopCamera, onNativeCapture } = useQrScanner((t) => resolve(t, "qr"), alert);

  const audit = (action: string, details: string, ok: boolean, severity: "LOW" | "MEDIUM" | "HIGH") =>
    auditService.logAuditEvent({ action, module: "Acceso/CheckIn", details, severity, status: ok ? "SUCCESS" : "FAILED" }).catch(() => {});

  const confirmCheckIn = async () => {
    const b = confirming;
    if (!b) return;
    setBusyId(b.id);
    try {
      // El servidor valida recinto, pago y horario, y suma la experiencia del jugador
      await postApi("/api/bookings/checkin", { bookingId: b.id, action: "checkin" });
      setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, checkIn: true, status: "active" } : x)));
      audit("RESERVA_CHECKIN", `Ingreso registrado para la reserva ${b.id} (${b.clientName}) en ${b.courtName}.`, true, "LOW");
      setConfirming(null);
      alert("Ingreso exitoso", `${b.clientName} ya puede pasar a ${b.courtName}.`);
    } catch (e) {
      const msg = (e as Error)?.message || "Hubo un error al registrar el ingreso. Reintenta.";
      audit("RESERVA_CHECKIN", `Falla al registrar el ingreso de la reserva ${b.id} (${b.clientName}): ${msg}`, false, "MEDIUM");
      alert("No se pudo registrar el ingreso", msg);
    } finally {
      setBusyId(null);
    }
  };

  const markNoShow = async (b: CheckinBooking) => {
    const ok = await confirm({
      title: "Registrar inasistencia",
      message: <>La reserva de <strong>{b.clientName}</strong> ({b.startTimeStr}, {b.courtName}) quedará como inasistencia: se anula sin reembolso y el jugador recibe un strike. No se puede deshacer.</>,
      tone: "danger", confirmLabel: "Registrar inasistencia",
    });
    if (!ok) return;
    setBusyId(b.id);
    try {
      // El servidor anula la reserva, suma el strike y recalcula la experiencia
      await postApi("/api/bookings/checkin", { bookingId: b.id, action: "noshow" });
      setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, status: "cancelled", noShow: true, paymentStatus: "no-show" } : x)));
      audit("RESERVA_NOSHOW", `Reserva ${b.id} de ${b.clientName} registrada como inasistencia (strike aplicado).`, true, "MEDIUM");
      toast(`Inasistencia registrada para ${b.clientName}`);
    } catch (e) {
      const msg = (e as Error)?.message || "No se pudo registrar la inasistencia.";
      audit("RESERVA_NOSHOW", `Falla al registrar la inasistencia de la reserva ${b.id} (${b.clientName}): ${msg}`, false, "HIGH");
      alert("No se pudo registrar", msg);
    } finally {
      setBusyId(null);
    }
  };

  const summary = summarizeCheckins(bookings, now);
  // Mientras se escribe, la lista se filtra por código, nombre o cancha
  const q = search.trim().toLowerCase();
  const matches = q ? new Set(findBookings(bookings, search).map((b) => b.id)) : null;
  const visible = bookings.filter((b) => matchesFilter(checkinState(b, now), filter)
    && (!matches || matches.has(b.id) || b.courtName.toLowerCase().includes(q)));

  const kpis = [
    { label: "Reservas del día", value: summary.counts.all, sub: formatCLP(summary.expected), icon: UserGroupIcon, tone: "text-slate-900 dark:text-white" },
    { label: "Ingresaron", value: summary.counts.in, sub: formatCLP(summary.collectedIn), icon: CheckmarkCircle02Icon, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Por llegar", value: summary.counts.pending, sub: "Pagadas, sin ingreso", icon: Clock01Icon, tone: "text-slate-900 dark:text-white" },
    { label: "No llegaron", value: summary.counts.noshow, sub: summary.lateToFlag ? `${summary.lateToFlag} por registrar` : "Al día", icon: Alert02Icon, tone: "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-10 text-slate-600 dark:text-slate-300">
      {isCameraOpen && <CameraOverlay error={cameraError} onRetry={startCamera} onClose={stopCamera} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
        <PageTitle eyebrow="Recepción">Control de <Accent>Acceso</Accent></PageTitle>
        <div className="flex items-center gap-2">
          {venues.length > 1 && (
            <div className="relative flex-1 md:flex-none">
              <Icon icon={Store01Icon} className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select aria-label="Recinto" value={venueId} onChange={(e) => setVenueId(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-md pl-9 pr-8 h-10 text-[11px] font-black outline-hidden text-slate-700 dark:text-white uppercase cursor-pointer focus:border-emerald-500">
                {venues.map((v) => <option key={v.id} value={v.id} className="dark:bg-[#0B0F19]">{v.name}</option>)}
              </select>
              <Icon icon={ArrowDown01Icon} className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
          <button onClick={() => load()} aria-label="Actualizar reservas" className="w-10 h-10 flex items-center justify-center rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-emerald-500 active:scale-90">
            <Icon icon={RefreshIcon} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white dark:bg-[#0B0F19] p-4 rounded-md border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon={k.icon} className="w-4 h-4 text-slate-400" />
              <p className="text-[11px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest">{k.label}</p>
            </div>
            <p className={`text-2xl font-black tracking-tighter tabular-nums ${k.tone}`}>{k.value}</p>
            <p className="text-[11px] font-bold text-slate-400 truncate">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={startCamera} className="w-full sm:w-auto flex items-center justify-center gap-2 h-12 px-6 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 rounded-md active:scale-95 transition-all shrink-0">
          <Icon icon={QrCode01Icon} className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest">Escanear QR</span>
        </button>
        <form onSubmit={(e) => { e.preventDefault(); if (search.trim()) resolve(search, "manual"); }} className="flex-1 relative">
          <Icon icon={Search01Icon} className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type="search" enterKeyHint="go" autoComplete="off" aria-label="Código de reserva o nombre"
            placeholder="Buscar por código de reserva o nombre (ej: #AB12CD)"
            className="w-full h-12 pl-10 pr-24 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-md text-[12px] font-bold outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:font-medium text-slate-800 dark:text-white"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" disabled={!search.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 h-9 rounded-md text-[11px] font-black uppercase active:scale-95 disabled:opacity-40">
            Validar
          </button>
        </form>
      </div>

      <input id="native-camera-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={onNativeCapture} />
      <div id="qr-reader-hidden" className="hidden" />

      {cameraPermission === "denied" && (
        <p role="status" className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-md p-3 text-xs text-amber-700 dark:text-amber-400 font-bold flex items-center gap-2">
          <Icon icon={Camera01Icon} className="w-4 h-4 shrink-0" />
          El permiso de cámara está bloqueado. Habilítalo en el navegador o escribe el código del ticket.
        </p>
      )}

      {summary.lateToFlag > 0 && filter !== "noshow" && (
        <button onClick={() => setFilter("noshow")} className="w-full text-left bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-md p-3 text-xs text-red-700 dark:text-red-400 font-bold flex items-center gap-2">
          <Icon icon={UnavailableIcon} className="w-4 h-4 shrink-0" />
          {summary.lateToFlag === 1 ? "1 reserva pasó la tolerancia sin ingreso" : `${summary.lateToFlag} reservas pasaron la tolerancia sin ingreso`}: revisa y registra la inasistencia.
        </button>
      )}

      <section className="bg-white dark:bg-[#0B0F19] rounded-md border border-slate-100 dark:border-white/5 overflow-hidden" aria-label="Reservas de hoy">
        <div className="p-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Filtrar reservas">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
                className={`px-3 h-9 rounded-md text-[11px] font-black uppercase whitespace-nowrap transition-all border ${filter === f.id ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10"}`}>
                {f.label} <span className="tabular-nums">({summary.counts[f.id]})</span>
              </button>
            ))}
          </div>
        </div>
        {loading && bookings.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-2">
            <Icon icon={RefreshIcon} className="w-6 h-6 animate-spin text-emerald-500/50" />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Cargando reservas de hoy…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-14 flex flex-col items-center justify-center text-slate-400 gap-3 text-center px-6">
            <Icon icon={IdentityCardIcon} className="w-8 h-8 opacity-30" />
            <p className="text-[12px] font-bold">
              {!venues.length ? "No tienes un recinto asignado." : search ? "Ninguna reserva coincide con la búsqueda." : bookings.length ? "No hay reservas en este filtro." : "Hoy no hay reservas en este recinto."}
            </p>
            {(search || filter !== "all") && bookings.length > 0 && (
              <button onClick={() => { setSearch(""); setFilter("all"); }} className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400">Ver todas</button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {visible.map((b) => (
              <BookingRow key={b.id} b={b} state={checkinState(b, now)} busy={busyId === b.id} canNoShow={canFlagNoShow(b, now)}
                onCheckIn={() => tryCheckIn(b)} onNoShow={() => markNoShow(b)} />
            ))}
          </ul>
        )}
      </section>

      {confirming && <ConfirmCheckin b={confirming} busy={busyId === confirming.id} onConfirm={confirmCheckIn} onClose={() => setConfirming(null)} />}
    </div>
  );
}
