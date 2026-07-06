"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Calendar, Clock, MapPin, CheckCircle2, AlertCircle,
  XCircle, ArrowRight, Navigation, Ticket, X, Share2, Stars, Timer,
  ShieldCheck, CalendarDays, Trophy, Medal, Star, Trash2, Loader, Receipt
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { usePlayer } from "@/context/PlayerContext";
import { bookingService } from "@/services/player/bookingService";
import { venueService } from "@/services/player/venueService";
import { getFunctions, httpsCallable } from "firebase/functions";
import { FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon } from "@/components/icons/SportsIcons";

const SPORT_CONFIG: Record<string, { color: string; icon: any }> = {
  futbol: { color: "#10b981", icon: FutbolIcon },
  padel: { color: "#3b82f6", icon: PadelIcon },
  tenis: { color: "#f59e0b", icon: TenisIcon },
  basquet: { color: "#6366f1", icon: BasquetbolIcon },
  voley: { color: "#ec4899", icon: VoleibolIcon },
  default: { color: "#10b981", icon: FutbolIcon },
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

const getSantiagoDateTime = (date: Date) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santiago",
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric", hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
    return new Date(getPart("year"), getPart("month") - 1, getPart("day"), getPart("hour"), getPart("minute"), 0, 0);
  } catch {
    return new Date();
  }
};

const getBookingDateTimeChile = (bookingDate: Date, startTime: string) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santiago",
      year: "numeric", month: "numeric", day: "numeric", hour12: false,
    });
    const parts = formatter.formatToParts(bookingDate);
    const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
    const [hours, minutes] = (startTime || "00:00").split(":").map(Number);
    return new Date(getPart("year"), getPart("month") - 1, getPart("day"), hours, minutes, 0, 0);
  } catch {
    return new Date();
  }
};

const getFormattedDate = (date: any) => {
  try {
    if (!date) return { day: "--", month: "---", full: "-- --- ----" };
    const d = date.toDate ? date.toDate() : date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return {
      day: d.getDate().toString().padStart(2, "0"),
      month: d.toLocaleDateString("es-CL", { month: "short" }).toUpperCase().replace(".", ""),
      full: d.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }),
      raw: d,
    };
  } catch {
    return { day: "--", month: "---", full: "-- --- ----" };
  }
};

const getStatusInfo = (booking: any, C: any) => {
  if (!booking) return { label: "DESCONOCIDO", color: C.sub };
  const isNoShow = booking.status === "no-show" || booking.paymentStatus === "no-show" || booking.noShow === true;
  if (isNoShow) return { label: "CANCELADO POR INASISTENCIA", color: "#f43f5e" };
  if (booking.status === "cancelled") {
    if (booking.paymentStatus === "refund_failed") return { label: "DEVOLUCIÓN FALLIDA", color: "#f43f5e" };
    if (booking.paymentStatus === "refunded") return { label: "DEVOLUCIÓN", color: "#10b981" };
    if (booking.cancelledBy) return { label: "CANCELADO POR JUGADOR", color: "#f43f5e" };
    return { label: "ANULADO", color: "#f43f5e" };
  }
  if ((booking.status === "active" || booking.checkIn) && !booking.checkOut) return { label: "EN JUEGO", color: "#3b82f6" };
  if (booking.status === "completed" || booking.status === "past" || booking.checkOut === true) return { label: "FINALIZADO", color: C.sub };
  if (booking.paymentStatus === "pending") return { label: "PAGO PENDIENTE", color: "#f59e0b" };
  if (booking.status === "confirmed") return { label: "CONFIRMADO", color: "#10b981" };
  return { label: "PENDIENTE", color: "#f59e0b" };
};

function GlowCard({ isDark, children, className = "" }: { isDark: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[14px] ${isDark ? "bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.06]" : "bg-white/80 backdrop-blur-xl border border-slate-200/60"} shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"} ${className}`}>
      <div className={`absolute inset-0 rounded-[14px] pointer-events-none ${isDark ? "bg-gradient-to-br from-emerald-500/[0.02] to-transparent" : ""}`} />
      {children}
    </div>
  );
}

function SectionPill({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3 px-6 mb-4 mt-6 ${className}`}>
      <div className="h-[3px] w-6 rounded-full bg-emerald-500/60" />
      <span className="text-emerald-400 font-semibold text-[10px] tracking-[3px] uppercase">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
    </div>
  );
}

export default function ReservasPage() {
  const { profile, theme } = usePlayer();
  const router = useRouter();
  const isDark = theme === "dark";

  const [bookings, setBookings] = useState<any[]>([]);
  const [venues, setVenues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"activas" | "historial">("activas");
  const [historyLimit, setHistoryLimit] = useState(10);

  const [showTicket, setShowTicket] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [fbVisible, setFbVisible] = useState(false);
  const [fbType, setFbType] = useState<"success" | "error">("success");
  const [fbMsg, setFbMsg] = useState("");

  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyBooking, setSurveyBooking] = useState<any>(null);
  const [surveyRating, setSurveyRating] = useState(5);
  const [surveyFeedback, setSurveyFeedback] = useState("");

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);

  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [bookingForCheckIn, setBookingForCheckIn] = useState<any>(null);

  useEffect(() => {
    setHistoryLimit(10);
  }, [activeTab]);

  const baseBg = isDark ? "bg-[#020617]" : "bg-[#F8FAFC]";
  const cardBg = isDark ? "bg-[#0F172A]" : "bg-white";
  const borderClr = isDark ? "border-white/5" : "border-slate-200";
  const textClr = isDark ? "text-[#F8FAFC]" : "text-[#0F172A]";
  const subClr = isDark ? "text-[#94A3B8]" : "text-[#64748B]";

  const loadData = async (isRefreshing = false) => {
    if (!(profile as any)?.uid) return;
    if (!isRefreshing) setLoading(true);
    try {
      const all = await bookingService.getUserBookings((profile as any).uid);
      const tenantIds = Array.from(new Set(all.map((b) => b.tenantId)));
      const venueList = await venueService.getVenuesByIds(tenantIds);
      const venueMap: Record<string, any> = {};
      venueList.forEach((v) => { venueMap[v.id] = v; });
      setVenues(venueMap);
      setBookings(all.sort((a, b) => ((b.date as any)?.seconds || 0) - ((a.date as any)?.seconds || 0)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const handleCheckIn = (booking: any) => {
    if (booking.paymentStatus !== "paid") {
      setFbType("error");
      setFbMsg("Para iniciar el partido debes completar el pago en la recepción del recinto.");
      setFbVisible(true);
      return;
    }
    setBookingForCheckIn(booking);
    setShowCheckInModal(true);
  };

  const confirmCheckIn = async () => {
    if (!bookingForCheckIn?.id) return;
    try {
      await bookingService.checkIn(bookingForCheckIn.id);
      loadData();
      setShowCheckInModal(false);
      setFbType("success");
      setFbMsg("¡Check-in exitoso! Ya puedes ingresar a la cancha.");
      setFbVisible(true);
    } catch {
      setFbType("error");
      setFbMsg("No pudimos procesar tu llegada. Inténtalo de nuevo.");
      setFbVisible(true);
    }
  };

  const handleCheckOut = (booking: any) => {
    if (!booking.id) return;
    setSurveyBooking(booking);
    setSurveyRating(5);
    setSurveyFeedback("");
    setShowSurveyModal(true);
  };

  const handleSaveSurvey = async (rating: number, feedback: string) => {
    if (!surveyBooking?.id) return;
    try {
      await bookingService.checkOut(surveyBooking.id, { rating, feedback });
      await venueService.submitVenueFeedback(
        surveyBooking.tenantId,
        surveyBooking.id,
        rating,
        feedback,
        (profile as any)?.displayName || "Jugador MVP",
        { sport: surveyBooking.sport, bookingDate: surveyBooking.date, bookingTime: surveyBooking.startTime }
      );
      loadData();
      setShowSurveyModal(false);
      setFbType("success");
      setFbMsg("¡Gracias por tu valoración! Partido finalizado con éxito.");
      setFbVisible(true);
    } catch {
      setFbType("error");
      setFbMsg("Ocurrió un error al procesar el cierre. Intenta de nuevo.");
      setFbVisible(true);
    }
  };

  const handleCancel = (bookingId: string) => {
    setBookingToCancel(bookingId);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!bookingToCancel) return;
    const targetBooking = bookings.find((b) => b.id === bookingToCancel);
    const isPaid = targetBooking?.paymentStatus === "paid" || targetBooking?.paymentStatus === "partial";
    let isLessThan4Hours = false;
    if (targetBooking?.date && targetBooking?.startTime) {
      const nowChile = getSantiagoDateTime(new Date());
      const bookingDate = (targetBooking.date as any).toDate ? (targetBooking.date as any).toDate() : new Date(targetBooking.date as any);
      const startDateTime = getBookingDateTimeChile(bookingDate, targetBooking.startTime);
      const diffMs = startDateTime.getTime() - nowChile.getTime();
      isLessThan4Hours = diffMs / (1000 * 60 * 60) < 4;
    }
    try {
      if (isPaid && !isLessThan4Hours) {
        const functions = getFunctions(undefined, "southamerica-west1");
        const refundFn = httpsCallable(functions, "refundBookingPayment");
        const res = await refundFn({ bookingId: bookingToCancel });
        const resultData = res.data as { success: boolean; refundAmount: number; fee: number; error?: string };
        loadData();
        setShowCancelModal(false);
        setFbType("success");
        if (resultData.success) {
          setFbMsg(`¡Cancelado y Reembolsado! Se procesó un reembolso parcial de $${new Intl.NumberFormat("es-CL").format(resultData.refundAmount)} (comisión del 3% retenida: $${new Intl.NumberFormat("es-CL").format(resultData.fee)}).`);
        } else {
          setFbMsg("Reserva cancelada con éxito. Sin embargo, hubo un error al procesar el reembolso automático. Contacta al dueño del recinto.");
        }
        setFbVisible(true);
      } else {
        await bookingService.cancelBooking({ bookingId: bookingToCancel, cancelledBy: (profile as any)?.displayName || (profile as any)?.email || "User" });
        loadData();
        setShowCancelModal(false);
        setFbType("success");
        setFbMsg(isPaid ? "Reserva cancelada de última hora. De acuerdo con las políticas, el monto pagado no admite devolución." : "Tu reserva ha sido cancelada correctamente.");
        setFbVisible(true);
      }
    } catch {
      setFbType("error");
      setFbMsg("Hubo un problema al cancelar. Contacta al soporte.");
      setFbVisible(true);
    }
  };

  const cancelModalInfo = useMemo(() => {
    if (!bookingToCancel) return { title: "¿Cancelar Reserva?", message: "Esta acción no se puede deshacer. ¿Estás seguro?", danger: true };
    const targetBooking = bookings.find((b) => b.id === bookingToCancel);
    if (!targetBooking) return { title: "¿Cancelar Reserva?", message: "Esta acción no se puede deshacer. ¿Estás seguro?", danger: true };
    const nowChile = getSantiagoDateTime(new Date());
    const bookingDate = (targetBooking.date as any).toDate ? (targetBooking.date as any).toDate() : new Date(targetBooking.date as any);
    const startDateTime = getBookingDateTimeChile(bookingDate, targetBooking.startTime);
    const diffMs = startDateTime.getTime() - nowChile.getTime();
    const isLessThan4Hours = diffMs / (1000 * 60 * 60) < 4;
    const isPaid = targetBooking.paymentStatus === "paid" || targetBooking.paymentStatus === "partial";
    if (isLessThan4Hours) {
      if (isPaid) return { title: "Penalización por Cancelación", message: "¡ATENCIÓN! Estás cancelando con menos de 4 horas de anticipación. El monto pagado online NO será devuelto. ¿Deseas continuar?", danger: true };
      return { title: "Cancelación de Última Hora", message: "Estás cancelando con menos de 4 horas de anticipación. Tu cupo podría quedar vacío. ¿Estás seguro?", danger: true };
    } else {
      if (isPaid) return { title: "Confirmar Devolución", message: "Tu reserva está en período de cancelación permitido (+4h). Se gestionará la devolución de tu dinero. ¿Confirmas?", danger: false };
      return { title: "¿Confirmar Cancelación?", message: "Esta acción no se puede deshacer. ¿Estás seguro?", danger: true };
    }
  }, [bookingToCancel, bookings]);

  const displayList = useMemo(() => {
    const filtered = bookings.filter((b) => {
      const isActive = ["confirmed", "active", "pending"].includes(b.status as string) && !b.checkOut;
      return activeTab === "activas" ? isActive : !isActive;
    });
    return filtered.sort((a, b) => {
      const timeA = (a.date as any)?.seconds || 0;
      const timeB = (b.date as any)?.seconds || 0;
      if (activeTab === "activas") {
        if (timeA !== timeB) return timeA - timeB;
        return (a.startTime || "").localeCompare(b.startTime || "");
      } else {
        if (timeA !== timeB) return timeB - timeA;
        return (b.startTime || "").localeCompare(a.startTime || "");
      }
    });
  }, [bookings, activeTab]);

  const paginatedList = useMemo(() => {
    if (activeTab === "activas") return displayList;
    return displayList.slice(0, historyLimit);
  }, [displayList, activeTab, historyLimit]);

  const handleOpenMaps = (booking: any) => {
    const venue = venues[booking.tenantId];
    const coords = venue?.coordinates || (venue as any)?.location;
    if (!coords) return;
    const lat = coords.lat || coords._lat || coords.latitude;
    const lng = coords.lng || coords._long || coords.longitude;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  if (loading && !refreshing) {
    return (
      <div className={`min-h-screen ${baseBg} flex items-center justify-center`}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const modalSportInfo = getSportInfo(selectedBooking?.sport || "");
  const modalStatus = getStatusInfo(selectedBooking, { sub: subClr });

  return (
    <div className={`min-h-screen ${baseBg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <button onClick={() => router.push("/player")} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center">Mis Reservas</h1>
        <div className="w-10" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2.5 px-5 pt-3">
        <button onClick={() => setActiveTab("activas")} className={`flex-1 h-12 rounded-[14px] font-semibold text-[10px] uppercase tracking-[1px] transition-all active:scale-[0.98] ${activeTab === "activas" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" : isDark ? "bg-white/[0.06] text-[#94A3B8] hover:bg-white/[0.1]" : "bg-slate-100 text-[#64748B] hover:bg-slate-200"}`}>
          ACTIVAS
        </button>
        <button onClick={() => setActiveTab("historial")} className={`flex-1 h-12 rounded-[14px] font-semibold text-[10px] uppercase tracking-[1px] transition-all active:scale-[0.98] ${activeTab === "historial" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" : isDark ? "bg-white/[0.06] text-[#94A3B8] hover:bg-white/[0.1]" : "bg-slate-100 text-[#64748B] hover:bg-slate-200"}`}>
          HISTORIAL
        </button>
      </div>

      {/* List */}
      <div className="px-0.5 pb-28">
        <SectionPill label={activeTab === "activas" ? "Próximos Partidos" : "Partidos Finalizados"} />

        {paginatedList.length === 0 && (
          <div className="px-5 mt-6">
            <GlowCard isDark={isDark}>
              <div className="py-12 flex flex-col items-center justify-center">
                <CalendarDays size={48} strokeWidth={1} className={subClr} />
                <p className={`text-xs font-semibold mt-5 text-center ${subClr}`}>No hay partidos para mostrar</p>
              </div>
            </GlowCard>
          </div>
        )}

        {paginatedList.map((b) => {
          const sportInfo = getSportInfo(b.sport || "");
          const status = getStatusInfo(b, { sub: subClr });
          const dateInfo = getFormattedDate(b.date);
          const venueName = venues[b.tenantId]?.name || b.tenantName;
          const isConfirmed = b.status === "confirmed" && !b.checkOut;
          const isActive = (b.status === "active" || b.checkIn) && !b.checkOut;
          const isCompleted = b.status === "completed" || b.status === "past" || b.checkOut === true;
          const isCancelled = b.status === "cancelled";
          const showMapsAndTicket = (!isCompleted && !isCancelled) || b.paymentStatus === "refund_failed";

          return (
            <div key={b.id} className="mx-5 mb-6 last:mb-0">
              <GlowCard isDark={isDark}>
                <div className="p-5">
                  {/* Header Row */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: sportInfo.color + "15" }}>
                      <sportInfo.icon size={24} color={sportInfo.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-semibold leading-tight truncate ${textClr}`}>{venueName || b.tenantName}</p>
                      <span className={`inline-block text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[14px] mt-1.5`} style={{ backgroundColor: sportInfo.color + "15", color: sportInfo.color }}>
                        {(b.sport || "").toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin size={8} className={subClr} />
                        <span className={`text-[9px] font-medium ${subClr}`}>{b.courtName}</span>
                      </div>
                    </div>
                    <span className="text-[7px] font-semibold tracking-[0.5px] px-2.5 py-1.5 rounded-[14px] text-center leading-tight shrink-0" style={{ backgroundColor: status.color + "15", border: `1px solid ${status.color}20`, color: status.color }}>
                      {status.label}
                    </span>
                  </div>

                  {/* Detail Grid */}
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    <div className={`p-3 rounded-[14px] border ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                      <span className={`text-[7px] font-semibold uppercase tracking-[1px] ${subClr}`}>FECHA</span>
                      <p className={`text-[11px] font-semibold mt-0.5 ${textClr}`}>{dateInfo.full}</p>
                    </div>
                    <div className={`p-3 rounded-[14px] border ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                      <span className={`text-[7px] font-semibold uppercase tracking-[1px] ${subClr}`}>HORARIO</span>
                      <p className={`text-[11px] font-semibold mt-0.5 ${textClr}`}>{b.startTime} HRS</p>
                    </div>
                    <div className={`p-3 rounded-[14px] border ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                      <span className={`text-[7px] font-semibold uppercase tracking-[1px] ${subClr}`}>VALOR</span>
                      <p className={`text-[13px] font-semibold mt-0.5 ${textClr}`}>${new Intl.NumberFormat("es-CL").format(b.totalPrice || b.price || 0)}</p>
                    </div>
                    <div className={`p-3 rounded-[14px] border ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                      <span className={`text-[7px] font-semibold uppercase tracking-[1px] ${subClr}`}>PAGO</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: b.paymentStatus === "paid" ? "#10b981" : b.paymentStatus === "refunded" ? "#10b981" : b.paymentStatus === "refund_failed" ? "#ef4444" : "#f59e0b" }} />
                        <span className="text-[10px] font-semibold" style={{ color: b.paymentStatus === "paid" ? "#10b981" : b.paymentStatus === "refunded" ? "#10b981" : b.paymentStatus === "refund_failed" ? "#ef4444" : "#f59e0b" }}>
                          {b.paymentStatus === "paid" ? "PAGADO" : b.paymentStatus === "refunded" ? "REEMBOLSADO" : b.paymentStatus === "refund_failed" ? "ERROR REEMBOLSO" : "PENDIENTE"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3.5" style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0"}` }}>
                    {isConfirmed && !b.checkIn && (
                      <button onClick={() => handleCheckIn(b)} className="flex-1 h-[46px] rounded-[14px] bg-emerald-500 flex items-center justify-center gap-2 text-white font-semibold text-[10px] uppercase shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]">
                        <ShieldCheck size={15} /> INGRESAR
                      </button>
                    )}
                    {isActive && !b.checkOut && (
                      <button onClick={() => handleCheckOut(b)} className="flex-1 h-[46px] rounded-[14px] flex items-center justify-center gap-2 text-white font-semibold text-[10px] uppercase shadow-lg transition-all active:scale-[0.98]" style={{ backgroundColor: "#f59e0b" }}>
                        <CheckCircle2 size={15} /> CHECK-OUT
                      </button>
                    )}
                    {showMapsAndTicket && !isActive && (
                      <button onClick={() => handleOpenMaps(b)} className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center transition-all active:scale-[0.98]" style={{ backgroundColor: "#3b82f610" }}>
                        <Navigation size={18} color="#3b82f6" />
                      </button>
                    )}
                    {!isCompleted && !isCancelled && !isActive && !b.checkIn && (
                      <button onClick={() => b.id && handleCancel(b.id)} className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center transition-all active:scale-[0.98]" style={{ backgroundColor: "#ef444410" }}>
                        <XCircle size={18} color="#ef4444" />
                      </button>
                    )}
                    {showMapsAndTicket && !isActive && (!isConfirmed || b.checkIn || b.paymentStatus === "refund_failed") && (
                      <button
                        onClick={() => { setSelectedBooking(b); setShowTicket(true); }}
                        className={b.paymentStatus === "refund_failed" ? "flex-1 h-[46px] rounded-[14px] bg-red-500 flex items-center justify-center gap-2 text-white font-semibold text-[9px] uppercase shadow-lg transition-all active:scale-[0.98]" : "w-[46px] h-[46px] rounded-[14px] flex items-center justify-center transition-all active:scale-[0.98]"}
                        style={{ backgroundColor: b.paymentStatus === "refund_failed" ? undefined : isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }}
                      >
                        {b.paymentStatus === "refund_failed" ? (
                          <><Receipt size={15} /> Devolución</>
                        ) : (
                          <Ticket size={18} className={subClr} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </GlowCard>
            </div>
          );
        })}

        {activeTab === "historial" && displayList.length > historyLimit && (
          <button
            onClick={() => setHistoryLimit((prev) => prev + 10)}
            className={`mx-6 mt-4 mb-6 h-[55px] rounded-[14px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] border border-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 border border-slate-200 hover:bg-slate-200"}`}
          >
            <span className="text-emerald-500 font-semibold text-[11px] uppercase tracking-[0.5px]">Cargar más reservas</span>
          </button>
        )}
      </div>

      {/* Ticket Modal */}
      {showTicket && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-5" onClick={() => setShowTicket(false)}>
          {selectedBooking.paymentStatus === "refund_failed" ? (
            <div className={`w-full max-w-sm rounded-[14px] border overflow-hidden ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-5 border-b flex justify-between items-center ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
                <span className={`text-base font-semibold uppercase tracking-tight ${textClr}`}>Devolución Pendiente</span>
                <button onClick={() => setShowTicket(false)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }}>
                  <X size={18} className={textClr} />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="text-center">
                  <p className="text-red-500 text-[10px] font-semibold tracking-[1.5px] uppercase mb-1.5">Reversa Automática Fallida</p>
                  <p className={`text-xl font-semibold tracking-tight ${textClr}`}>${new Intl.NumberFormat("es-CL").format(Number(selectedBooking.totalPrice || selectedBooking.price || 0))}</p>
                  <p className={`text-[10px] font-semibold ${subClr}`}>Monto Pendiente de Devolución</p>
                </div>
                <div className="space-y-3 pt-5 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0" }}>
                  <DetailRow label="Jugador" value={selectedBooking.clientName || "—"} subClr={subClr} textClr={textClr} />
                  <DetailRow label="Recinto" value={selectedBooking.tenantName || "—"} subClr={subClr} textClr={textClr} />
                  <DetailRow label="Cancha" value={selectedBooking.courtName || "—"} subClr={subClr} textClr={textClr} />
                  <DetailRow label="Deporte" value={(selectedBooking.sport || "—").toUpperCase()} subClr={subClr} textClr={textClr} />
                  <DetailRow label="Fecha Partido" value={getFormattedDate(selectedBooking.date).full} subClr={subClr} textClr={textClr} />
                  <DetailRow label="Horario" value={`${selectedBooking.startTime} HRS`} subClr={subClr} textClr={textClr} />
                  <DetailRow label="Método Pago" value="Online (Webpay Plus)" subClr={subClr} textClr={textClr} />
                  <div className="flex justify-between items-center py-0.5">
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.5px] ${subClr}`}>Estado Reclamación</span>
                    <span className="text-red-500 text-[11px] font-semibold">Manual Pendiente</span>
                  </div>
                  <div className="h-px border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0" }} />
                  <DetailRow label="ID Reserva" value={selectedBooking.id || "—"} subClr={subClr} textClr={textClr} />
                  <div className="flex justify-between items-center py-0.5">
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.5px] ${subClr}`}>Código Validación</span>
                    <span className="text-red-500 text-[11px] font-semibold">MVP-REFUND-{(selectedBooking.id || "").substring(0, 8).toUpperCase()}</span>
                  </div>
                </div>
                <div className={`p-5 rounded-[14px] border space-y-2 ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                  <p className="text-red-500 text-[10px] font-semibold tracking-[0.5px] uppercase">Instrucciones para Devolución</p>
                  <p className={`text-[10px] font-semibold leading-[14px] ${subClr}`}>
                    Debido a una desconexión temporal con la pasarela de pagos de Transbank, el sistema automático no pudo reversar tu dinero. Presenta este comprobante de validación digital directamente al administrador o dueño del recinto deportivo para solicitar tu transferencia manual por el monto total indicado arriba.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!selectedBooking) return;
                    const displayD = getFormattedDate(selectedBooking.date).full;
                    const shareText = `*COMPROBANTE DE DEVOLUCIÓN DE PAGO - MVP SPORTS*\n\n` +
                      `Estimado Administrador de *${selectedBooking.tenantName}*,\n\n` +
                      `Presento el ticket oficial de solicitud de reembolso debido a una reversa automática fallida de Transbank. A continuación se detallan los datos de la transacción para su validación manual:\n\n` +
                      `• *Código de Validación:* MVP-REFUND-${(selectedBooking.id || "").substring(0, 8).toUpperCase()}\n` +
                      `• *ID de Reserva:* ${selectedBooking.id}\n` +
                      `• *Jugador:* ${selectedBooking.clientName}\n` +
                      `• *Cancha:* ${selectedBooking.courtName}\n` +
                      `• *Fecha/Hora Reserva:* ${displayD} a las ${selectedBooking.startTime} HRS\n` +
                      `• *Monto a Reembolsar:* $${new Intl.NumberFormat("es-CL").format(Number(selectedBooking.totalPrice || selectedBooking.price || 0))} CLP\n` +
                      `• *Estado:* Devolución Pendiente por Transferencia Manual\n\n` +
                      `Por favor, procese la devolución de forma manual a la brevedad. ¡Muchas gracias!`;
                    try {
                      await navigator.clipboard.writeText(shareText);
                      alert("¡Texto copiado al portapapeles!");
                    } catch {
                      alert("No se pudo copiar el texto.");
                    }
                  }}
                  className="w-full h-[55px] rounded-[14px] flex items-center justify-center gap-2 text-white font-semibold text-xs uppercase shadow-lg"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <Share2 size={16} /> COMPARTIR COMPROBANTE
                </button>
              </div>
            </div>
          ) : (
            <div className={`w-full max-w-sm rounded-[14px] overflow-hidden border ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-7 border-b-2 border-dashed ${isDark ? "border-white/10" : "border-slate-200"}`}>
                <div className="flex justify-between items-center mb-5">
                  <div className="w-12 h-12 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: modalSportInfo.color + "15" }}>
                    <Trophy size={24} color={modalSportInfo.color} />
                  </div>
                  <button onClick={() => setShowTicket(false)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F1F5F9" }}>
                    <X size={20} className={textClr} />
                  </button>
                </div>
                <p className={`text-[10px] font-semibold uppercase tracking-[1.5px] mb-1 ${subClr}`}>RECINTO</p>
                <p className={`text-xl font-semibold mb-5 ${textClr}`}>{selectedBooking.tenantName}</p>
                <div className="flex gap-8">
                  <div>
                    <p className={`text-[9px] font-semibold uppercase tracking-[1px] mb-1 ${subClr}`}>CANCHA</p>
                    <p className={`text-sm font-semibold ${textClr}`}>{selectedBooking.courtName}</p>
                  </div>
                  <div>
                    <p className={`text-[9px] font-semibold uppercase tracking-[1px] mb-1 ${subClr}`}>ESTADO</p>
                    <p className="text-sm font-semibold" style={{ color: modalStatus.color }}>{modalStatus.label}</p>
                  </div>
                </div>
              </div>
              <div className={`p-10 flex flex-col items-center ${isDark ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                <div className="bg-white p-5 rounded-[14px] shadow-sm">
                  {selectedBooking.id && <QRCodeSVG value={selectedBooking.id} size={150} fgColor="#0F172A" bgColor="white" />}
                </div>
                <p className={`text-[9px] font-semibold uppercase tracking-[4px] mt-6 ${subClr}`}>ID: {(selectedBooking.id as string)?.slice(-8).toUpperCase()}</p>
              </div>
              <div className="p-7">
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} color={modalSportInfo.color} />
                    <span className={`text-sm font-semibold ${textClr}`}>{getFormattedDate(selectedBooking.date).full}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} color={modalSportInfo.color} />
                    <span className={`text-sm font-semibold ${textClr}`}>{selectedBooking.startTime} HRS</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Modal */}
      {fbVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-10" onClick={() => setFbVisible(false)}>
          <div className={`w-full max-w-sm rounded-[14px] p-7 border flex flex-col items-center ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="w-[70px] h-[70px] rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: fbType === "error" ? "#ef444422" : "#10b98122" }}>
              {fbType === "error" ? <XCircle color="#ef4444" size={35} /> : <CheckCircle2 color="#10b981" size={35} />}
            </div>
            <p className={`text-lg font-semibold text-center mb-2.5 ${textClr}`}>{fbType === "error" ? "Oops" : "¡Éxito!"}</p>
            <p className={`text-sm font-semibold text-center mb-6 leading-5 ${subClr}`}>{fbMsg}</p>
            <button onClick={() => setFbVisible(false)} className="w-full h-[50px] rounded-[14px] flex items-center justify-center text-white font-semibold text-sm transition-all active:scale-[0.98]" style={{ backgroundColor: fbType === "error" ? "#ef4444" : "#10b981" }}>
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {/* Survey Modal */}
      {showSurveyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => setShowSurveyModal(false)}>
          <div className={`w-full max-w-sm rounded-[14px] p-7 border ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center mb-6">
              <div className="w-[60px] h-[60px] rounded-[14px] flex items-center justify-center mb-4" style={{ backgroundColor: "#10b98115" }}>
                <Star color="#10b981" size={30} fill="#10b981" />
              </div>
              <p className={`text-xl font-semibold uppercase ${textClr}`}>Tu Experiencia</p>
              <p className={`text-xs font-semibold text-center mt-1 ${subClr}`}>¿Qué te pareció el recinto y el servicio hoy?</p>
            </div>
            <div className="flex justify-center gap-2.5 mb-7">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setSurveyRating(s)}>
                  <Star size={32} color={surveyRating >= s ? "#f59e0b" : subClr} fill={surveyRating >= s ? "#f59e0b" : "transparent"} strokeWidth={2} />
                </button>
              ))}
            </div>
            <textarea
              className={`w-full min-h-[100px] rounded-[14px] p-5 text-sm border mb-6 resize-none outline-none ${isDark ? "bg-[#0F172A] text-[#F8FAFC] border-white/[0.06]" : "bg-white text-[#0F172A] border-slate-200"}`}
              placeholder="Comentarios adicionales (opcional)..."
              value={surveyFeedback}
              onChange={(e) => setSurveyFeedback(e.target.value)}
            />
            <div className="flex gap-2.5">
              <button onClick={() => setShowSurveyModal(false)} className={`flex-1 h-[60px] rounded-[14px] font-semibold text-sm border transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] text-[#94A3B8] border-white/[0.06]" : "bg-slate-100 text-[#64748B] border-slate-200"}`}>
                CANCELAR
              </button>
              <button
                onClick={() => handleSaveSurvey(surveyRating, surveyFeedback)}
                className="flex-[2] h-[60px] rounded-[14px] bg-emerald-500 text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25"
              >
                FINALIZAR PARTIDO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-10" onClick={() => setShowCancelModal(false)}>
          <div className={`w-full max-w-sm rounded-[14px] p-7 border flex flex-col items-center ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: (cancelModalInfo.danger ? "#ef4444" : "#10b981") + "15" }}>
              <Trash2 size={40} color={cancelModalInfo.danger ? "#ef4444" : "#f59e0b"} />
            </div>
            <p className={`text-lg font-semibold text-center mb-2.5 ${textClr}`}>{cancelModalInfo.title}</p>
            <p className={`text-sm font-semibold text-center mb-7 leading-5 ${subClr}`}>{cancelModalInfo.message}</p>
            <div className="flex gap-2.5 w-full">
              <button onClick={() => setShowCancelModal(false)} className={`flex-1 h-[55px] rounded-[14px] font-semibold text-xs border transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] text-[#94A3B8] border-white/[0.06]" : "bg-slate-100 text-[#64748B] border-slate-200"}`}>
                VOLVER
              </button>
              <button onClick={confirmCancel} className="flex-1 h-[55px] rounded-[14px] font-semibold text-xs text-white transition-all active:scale-[0.98]" style={{ backgroundColor: cancelModalInfo.danger ? "#ef4444" : "#10b981" }}>
                SÍ, CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CheckIn Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-10" onClick={() => setShowCheckInModal(false)}>
          <div className={`w-full max-w-sm rounded-[14px] p-7 border flex flex-col items-center ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: "#10b98115" }}>
              <ShieldCheck color="#10b981" size={40} />
            </div>
            <p className={`text-lg font-semibold text-center mb-2.5 ${textClr}`}>Confirmar Llegada</p>
            <p className={`text-sm font-semibold text-center mb-7 leading-5 ${subClr}`}>¿Confirmas que ya te encuentras en el recinto para iniciar tu partido?</p>
            <div className="flex gap-2.5 w-full">
              <button onClick={() => setShowCheckInModal(false)} className={`flex-1 h-[55px] rounded-[14px] font-semibold text-xs border transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] text-[#94A3B8] border-white/[0.06]" : "bg-slate-100 text-[#64748B] border-slate-200"}`}>
                VOLVER
              </button>
              <button onClick={confirmCheckIn} className="flex-1 h-[55px] rounded-[14px] font-semibold text-xs text-white bg-emerald-500 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25">
                SÍ, INGRESAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DetailRow = ({ label, value, subClr, textClr }: any) => (
  <div className="flex justify-between items-center py-0.5">
    <span className={`text-[10px] font-semibold uppercase tracking-[0.5px] ${subClr}`}>{label}</span>
    <span className={`text-[11px] font-semibold ${textClr}`}>{value}</span>
  </div>
);
