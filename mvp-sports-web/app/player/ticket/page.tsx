"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, MapPin, Share2, Clock, Trophy, AlertCircle, ChevronLeft, Receipt, X, FileText, Calendar } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { usePlayer } from "@/context/PlayerContext";
import { bookingService } from "@/services/player/bookingService";

function GlowCard({ isDark, children, className = "" }: { isDark: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[14px] ${isDark ? "bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.06]" : "bg-white/80 backdrop-blur-xl border border-slate-200/60"} shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"} ${className}`}>
      <div className={`absolute inset-0 rounded-[14px] pointer-events-none ${isDark ? "bg-gradient-to-br from-emerald-500/[0.02] to-transparent" : ""}`} />
      {children}
    </div>
  );
}

function SectionPill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-6 mb-4 mt-6">
      <div className="h-[3px] w-6 rounded-full bg-emerald-500/60" />
      <span className="text-emerald-400 font-semibold text-[10px] tracking-[3px] uppercase">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
    </div>
  );
}

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
      const b = await bookingService.getBooking(bookingId);
      setBooking(b);
      setLoading(false);
    })();
  }, [bookingId]);

  const sportInfo = useMemo(() => getSportInfo(booking?.sport || ""), [booking]);
  const activeColor = sportInfo.color;
  const isRefundFailed = useMemo(() => (booking?.paymentStatus as any) === "refund_failed", [booking]);

  const displayDate = useMemo(() => {
    if (!booking?.date) return "—";
    try { const d = (booking.date as any).toDate ? (booking.date as any).toDate() : new Date(); return d.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }); }
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
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-emerald-400 text-[10px] font-semibold tracking-[3px] uppercase animate-pulse">Cargando</p>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { paid: "#10b981", refunded: "#10b981", refund_failed: "#ef4444", pending: "#f59e0b", "no-show": "#f43f5e" };
    const labels: Record<string, string> = { paid: "Pagado", refunded: "Devuelto", refund_failed: "Dev. Fallida", pending: "Pendiente", "no-show": "No Show" };
    const c = colors[status] || "#94a3b8";
    return <span className="text-[8px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-[14px]" style={{ backgroundColor: `${c}15`, color: c }}>{labels[status] || status}</span>;
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      {/* Hero Banner */}
      <div className="h-56 relative flex items-start justify-center pt-10" style={{ background: `linear-gradient(180deg, ${activeColor}, ${activeColor}70, transparent)` }}>
        <div className="w-20 h-20 rounded-[30px] flex items-center justify-center mt-2" style={{ backgroundColor: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}>
          {isRefundFailed ? <AlertCircle color="white" size={40} /> : <CheckCircle color="white" size={40} />}
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-12">
          <div className="text-center">
            <p className="text-white/90 font-semibold text-sm">{isRefundFailed ? "Reversa de Pago" : "Reserva Exitosa"}</p>
            <p className="text-white/50 text-[9px] font-semibold uppercase tracking-wider mt-1">{isRefundFailed ? "El pago fue revertido" : "Tu reserva está confirmada"}</p>
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
                <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>{r.label}</p>
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
              { label: "Estado", val: statusBadge(booking?.paymentStatus || "") },
              { label: "Método", val: ["card", "webpay", "online"].includes((booking as any)?.paymentMethod || "") ? "Tarjeta Online" : "Pago Recinto" },
              { label: "Código", val: `#${(bookingId || "").slice(-6).toUpperCase()}` },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>{r.label}</p>
                {typeof r.val === "string" ? (
                  <p className={`text-xs font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{r.val}</p>
                ) : (
                  <div>{r.val}</div>
                )}
              </div>
            ))}
            <div className={`h-px ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} />
            <div className="flex items-center justify-between pt-1">
              <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Total</p>
              <p className="text-lg font-semibold" style={{ color: activeColor }}>${new Intl.NumberFormat("es-CL").format(Number(booking?.totalPrice || 0))}</p>
            </div>
          </div>
        </GlowCard>

        {/* Pending notice */}
        {booking?.paymentStatus === "pending" && (
          <div className="flex items-center gap-3 p-4 rounded-[14px] bg-amber-500/10 border border-amber-500/20">
            <AlertCircle size={18} className="text-amber-400 shrink-0" />
            <p className="text-amber-400 text-[10px] font-semibold uppercase">Paga en el recinto antes del partido.</p>
          </div>
        )}

        {/* Refund failed */}
        {isRefundFailed && (
          <div className="flex items-center gap-3 p-4 rounded-[14px] bg-red-500/10 border border-red-500/20">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-[10px] font-semibold uppercase leading-tight">Reversa fallida. Solicita devolución al recinto.</p>
          </div>
        )}

        {/* QR Code */}
        <div className="flex flex-col items-center py-3">
          <GlowCard isDark={isDark}>
            <div className="p-6 flex flex-col items-center">
              <div className="bg-white p-4 rounded-[14px] shadow-sm">
                {bookingId && <QRCodeSVG value={bookingId} size={140} fgColor="#0F172A" bgColor="#ffffff" />}
              </div>
              <p className={`text-[8px] font-semibold uppercase tracking-[3px] mt-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>ID: {(bookingId || "").slice(-8).toUpperCase()}</p>
            </div>
          </GlowCard>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {isRefundFailed && (
            <button onClick={() => setShowClaimModal(true)}
              className="w-full h-14 rounded-[14px] bg-red-500 text-white font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg shadow-red-500/25">
              <Receipt size={18} /> Comprobante Devolución
            </button>
          )}
          <button onClick={() => router.replace("/player")}
            className={`w-full h-14 rounded-[14px] flex items-center justify-center gap-2.5 font-semibold text-sm uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg ${isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            <ChevronLeft size={18} /> Volver a Inicio
          </button>
        </div>

        <p className={`text-center text-[8px] font-medium pt-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>
      </div>

      {/* Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5" onClick={() => setShowClaimModal(false)}>
          <div className={`w-full max-w-sm rounded-[14px] overflow-hidden ${isDark ? "bg-[#0F172A] border border-white/[0.06]" : "bg-white border border-slate-200"} shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="p-5 flex items-center justify-between" style={{ backgroundColor: "#ef4444" }}>
              <div className="flex items-center gap-3">
                <Receipt size={20} className="text-white" />
                <div>
                  <p className="text-white text-xs font-semibold uppercase tracking-wider">MVP Sports Chile</p>
                  <p className="text-white/70 text-[8px] font-medium uppercase tracking-wider">Solicitud de Reembolso</p>
                </div>
              </div>
              <button onClick={() => setShowClaimModal(false)} className="w-8 h-8 rounded-[14px] bg-white/20 flex items-center justify-center">
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="text-center">
                <span className="inline-block px-3 py-1 rounded-[14px] text-[8px] font-semibold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">Reversa Rechazada</span>
                <p className={`text-xl font-bold mt-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>${new Intl.NumberFormat("es-CL").format(Number(booking?.totalPrice || 0))}</p>
                <p className={`text-[8px] font-semibold uppercase tracking-wider mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Monto Pendiente de Reintegro Manual</p>
              </div>
              <div className={`p-4 rounded-[14px] border space-y-2.5 ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                {[
                  { label: "Jugador", val: booking?.clientName },
                  { label: "Recinto", val: booking?.tenantName },
                  { label: "Cancha / Deporte", val: `${booking?.courtName} • ${booking?.sport}` },
                  { label: "Fecha / Hora", val: `${displayDate} • ${booking?.startTime} HRS` },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>{r.label}</span>
                    <span className={`text-[10px] font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{r.val || "—"}</span>
                  </div>
                ))}
                <div className={`h-px ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} />
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>ID Reserva</span>
                  <span className={`text-[10px] font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{bookingId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-red-500">Código Validación</span>
                  <span className="text-[9px] font-semibold tracking-wider text-red-500">MVP-REFUND-{(bookingId || "").toUpperCase()}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <FileText size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Instrucciones</p>
                </div>
                <p className={`text-[8px] font-medium leading-relaxed ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Comprobante oficial de cancelación. La reversa automática de Transbank falló. El administrador del recinto debe realizar la transferencia manual usando el ID de Reserva.
                </p>
              </div>
            </div>
            <div className={`p-5 flex gap-3 border-t ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
              <button onClick={handleShare} className="flex-1 h-12 rounded-[14px] bg-emerald-500 text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25">
                <Share2 size={16} /> Compartir
              </button>
              <button onClick={() => setShowClaimModal(false)} className={`h-12 px-5 rounded-[14px] font-semibold text-xs uppercase tracking-wider transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
