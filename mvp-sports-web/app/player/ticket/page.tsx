"use client";
import { GlowCard, SectionPill } from "@/components/player/ui";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, MapPin, Share2, Clock, Trophy, AlertCircle, ChevronLeft, Receipt, X, FileText, Calendar } from "@/components/player/icons";
import { QRCodeSVG } from "qrcode.react";
import { usePlayer } from "@/context/PlayerContext";
import { bookingService } from "@/services/player/bookingService";



const SPORT_CONFIG: Record<string, { color: string }> = {
  futbol: { color: "#10b981" }, padel: { color: "#3b82f6" }, tenis: { color: "#f59e0b" },
  basquet: { color: "#6366f1" }, voley: { color: "#ec4899" }, default: { color: "#10b981" },
};
const getSportInfo = (sportName: string) => {
  const s = (sportName || "").toLowerCase();
  if (s.includes("futbol") || s.includes("fútbol")) return SPORT_CONFIG.futbol;
  if (s.includes("padel") || s.includes("pádel")) return SPORT_CONFIG.padel;
  if (s.includes("tenis")) return SPORT_CONFIG.tenis;
  if (s.includes("basquet") || s.includes("basket")) return SPORT_CONFIG.basquet;
  if (s.includes("voley")) return SPORT_CONFIG.voley;
  return SPORT_CONFIG.default;
};

export default function TicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = usePlayer();
  const isDark = theme === "dark";

  const bookingId = searchParams.get("bookingId");
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      if (!bookingId) { setLoading(false); return; }
      // Reserva ajena o inexistente: getBooking lanza por permisos → "no encontrada"
      const b = await bookingService.getBooking(bookingId).catch(() => null);
      setBooking(b);
      setLoading(false);
    })();
  }, [bookingId]);

  const sportInfo = useMemo(() => getSportInfo(booking?.sport || ""), [booking]);
  const activeColor = sportInfo.color;
  const isRefundFailed = useMemo(() => (booking?.paymentStatus as any) === "refund_failed", [booking]);

  const displayDate = useMemo(() => {
    if (!booking?.date) return "—";
    try { const raw: any = booking.date; const d = raw?.toDate ? raw.toDate() : raw?.seconds ? new Date(raw.seconds * 1000) : /^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? new Date(`${raw}T12:00:00`) : new Date(raw); return d.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }); }
    catch { return "—"; }
  }, [booking?.date]);

  const handleShare = async () => {
    if (!booking) return;
    setSharing(true);
    try {
      const text = `*MVP SPORTS - TICKET*\n\n• Recinto: ${booking.tenantName}\n• Cancha: ${booking.courtName}\n• Fecha: ${displayDate}\n• Horario: ${booking.startTime} HRS\n• ID: ${bookingId}`;
      await navigator.clipboard.writeText(text);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {} finally { setSharing(false); }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-emerald-400 text-[12px] font-semibold tracking-[0.06em] uppercase animate-pulse">Cargando</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center ${isDark ? "bg-[#020611] text-slate-200" : "bg-[#F8FAFC] text-slate-900"}`}>
        <AlertCircle size={36} className="text-amber-500" />
        <p className="font-bold uppercase tracking-wide text-sm">Reserva no encontrada</p>
        <p className="text-xs text-slate-400 max-w-xs">El enlace no corresponde a una reserva de tu cuenta. Revisa tus reservas activas.</p>
        <button onClick={() => router.replace("/player/reservas")} className="mt-2 px-5 py-3 rounded-md bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wide">Ver mis reservas</button>
      </div>
    );
  }

  const isCancelled = booking.status === "cancelled";

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { paid: "#10b981", refunded: "#10b981", refund_failed: "#ef4444", pending: "#f59e0b", "no-show": "#f43f5e", cancelled: "#f43f5e" };
    const labels: Record<string, string> = { paid: "Pagado", refunded: "Devuelto", refund_failed: "Dev. Fallida", pending: "Pendiente", "no-show": "No asististe", cancelled: "Cancelada" };
    const c = colors[status] || "#94a3b8";
    return <span className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md" style={{ backgroundColor: `${c}15`, color: c }}>{labels[status] || status}</span>;
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      {/* Hero Banner */}
      <div className="h-56 relative flex items-start justify-center pt-10" style={{ background: `linear-gradient(180deg, ${isCancelled ? "#475569" : activeColor}, ${isCancelled ? "#475569" : activeColor}70, transparent)` }}>
        <div className="w-20 h-20 rounded-md flex items-center justify-center mt-2" style={{ backgroundColor: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}>
          {isRefundFailed ? <AlertCircle color="white" size={40} /> : isCancelled ? <X color="white" size={40} /> : <CheckCircle color="white" size={40} />}
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-12">
          <div className="text-center">
            <p className="text-white/90 font-semibold text-sm">{isRefundFailed ? "Reversa de Pago" : isCancelled ? "Reserva Cancelada" : booking.paymentStatus === "paid" ? "Reserva Exitosa" : "Reserva Registrada"}</p>
            <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide mt-1">{isRefundFailed ? "El pago fue revertido" : isCancelled ? "Esta reserva fue cancelada" : booking.paymentStatus === "paid" ? "Tu reserva está confirmada" : "Pago pendiente en el recinto"}</p>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-10 pb-8 space-y-5">
        {/* Resumen de Reserva */}
        <SectionPill label="Resumen de Reserva" />

        {/* Ticket Info */}
        <GlowCard isDark={isDark}>
          <div className="p-5 space-y-3">
            {[
              { label: "Recinto", val: booking?.tenantName },
              { label: "Cancha", val: booking?.courtName },
              { label: "Fecha", val: displayDate },
              { label: "Horario", val: `${booking?.startTime || ""} HRS` },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>{r.label}</p>
                <p className={`text-xs font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{r.val || "—"}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        {/* Transaction */}
        <SectionPill label="Transacción" />
        <GlowCard isDark={isDark}>
          <div className="p-5 space-y-3">
            {[
              { label: "ID Reserva", val: bookingId || "—" },
              { label: "Estado", val: statusBadge(isCancelled && booking?.paymentStatus === "pending" ? "cancelled" : booking?.paymentStatus || "") },
              { label: "Método", val: ["card", "webpay", "online", "mercadopago"].includes((booking as any)?.paymentMethod || "") ? "Tarjeta Online" : "Pago Recinto" },
              { label: "Código", val: `#${(bookingId || "").slice(-6).toUpperCase()}` },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>{r.label}</p>
                {typeof r.val === "string" ? (
                  <p className={`text-xs font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{r.val}</p>
                ) : (
                  <div>{r.val}</div>
                )}
              </div>
            ))}
            <div className={`h-px ${isDark ? "bg-white/6" : "bg-slate-100"}`} />
            <div className="flex items-center justify-between pt-1">
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>Total</p>
              <p className="text-lg font-semibold" style={{ color: activeColor }}>${new Intl.NumberFormat("es-CL").format(Number(booking?.totalPrice || 0))}</p>
            </div>
          </div>
        </GlowCard>

        {/* Pending notice */}
        {booking?.paymentStatus === "pending" && !isCancelled && (
          <div className="flex items-center gap-3 p-4 rounded-md bg-amber-500/10 border border-amber-500/20">
            <AlertCircle size={18} className="text-amber-400 shrink-0" />
            <p className="text-amber-400 text-[12px] font-semibold uppercase">Paga en el recinto antes del partido.</p>
          </div>
        )}

        {/* Refund failed */}
        {isRefundFailed && (
          <div className="flex items-center gap-3 p-4 rounded-md bg-red-500/10 border border-red-500/20">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-[12px] font-semibold uppercase leading-tight">Reversa fallida. Solicita devolución al recinto.</p>
          </div>
        )}

        {/* QR Code (solo sirve para ingresar: no en reservas canceladas) */}
        {!isCancelled && (
        <div className="flex flex-col items-center py-3">
          <GlowCard isDark={isDark}>
            <div className="p-6 flex flex-col items-center">
              <div className="bg-white p-4 rounded-md shadow-xs">
                {bookingId && <QRCodeSVG value={bookingId} size={140} fgColor="#0F172A" bgColor="#ffffff" />}
              </div>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.06em] mt-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>ID: {(bookingId || "").slice(-8).toUpperCase()}</p>
            </div>
          </GlowCard>
        </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {isRefundFailed && (
            <button onClick={() => setShowClaimModal(true)}
              className="w-full h-14 rounded-md bg-red-500 text-white font-semibold text-sm uppercase tracking-wide flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]">
              <Receipt size={18} /> Comprobante Devolución
            </button>
          )}
          <button onClick={() => router.replace("/player")}
            className={`w-full h-14 rounded-md flex items-center justify-center gap-2.5 font-semibold text-sm uppercase tracking-wide transition-all active:scale-[0.98] ${isDark ? "bg-white/6 text-slate-300 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            <ChevronLeft size={18} /> Volver a Inicio
          </button>
        </div>

        <p className={`text-center text-[11px] font-medium pt-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>
      </div>

      {/* Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5" onClick={() => setShowClaimModal(false)}>
          <div className={`w-full max-w-sm rounded-md overflow-hidden ${isDark ? "bg-[#0A101D] border border-white/6" : "bg-white border border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="p-5 flex items-center justify-between" style={{ backgroundColor: "#ef4444" }}>
              <div className="flex items-center gap-3">
                <Receipt size={20} className="text-white" />
                <div>
                  <p className="text-white text-xs font-semibold uppercase tracking-wide">MVP Sports Chile</p>
                  <p className="text-white/70 text-[11px] font-medium uppercase tracking-wide">Solicitud de Reembolso</p>
                </div>
              </div>
              <button aria-label="Cerrar" onClick={() => setShowClaimModal(false)} className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center">
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="text-center">
                <span className="inline-block px-3 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-red-500/10 text-red-500 border border-red-500/20">Reversa Rechazada</span>
                <p className={`text-xl font-bold mt-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>${new Intl.NumberFormat("es-CL").format(Number(booking?.totalPrice || 0))}</p>
                <p className={`text-[11px] font-semibold uppercase tracking-wide mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Monto Pendiente de Reintegro Manual</p>
              </div>
              <div className={`p-4 rounded-md border space-y-2.5 ${isDark ? "bg-white/2 border-white/6" : "bg-slate-50 border-slate-200"}`}>
                {[
                  { label: "Jugador", val: booking?.clientName },
                  { label: "Recinto", val: booking?.tenantName },
                  { label: "Cancha / Deporte", val: `${booking?.courtName} • ${booking?.sport}` },
                  { label: "Fecha / Hora", val: `${displayDate} • ${booking?.startTime} HRS` },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>{r.label}</span>
                    <span className={`text-[12px] font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{r.val || "—"}</span>
                  </div>
                ))}
                <div className={`h-px ${isDark ? "bg-white/6" : "bg-slate-100"}`} />
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>ID Reserva</span>
                  <span className={`text-[12px] font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{bookingId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-red-500">Código Validación</span>
                  <span className="text-[11px] font-semibold tracking-wide text-red-500">MVP-REFUND-{(bookingId || "").toUpperCase()}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <FileText size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`}>Instrucciones</p>
                </div>
                <p className={`text-[11px] font-medium leading-relaxed ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Comprobante oficial de cancelación. La reversa automática de la pasarela de pagos falló. El administrador del recinto debe realizar la transferencia manual usando el ID de Reserva.
                </p>
              </div>
            </div>
            <div className={`p-5 flex gap-3 border-t ${isDark ? "border-white/6" : "border-slate-200"}`}>
              <button onClick={handleShare} className="flex-1 h-12 rounded-md bg-emerald-500 text-white font-semibold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                <Share2 size={16} /> Compartir
              </button>
              <button onClick={() => setShowClaimModal(false)} className={`h-12 px-5 rounded-md font-semibold text-xs uppercase tracking-wide transition-all active:scale-[0.98] ${isDark ? "bg-white/6 text-slate-300 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
