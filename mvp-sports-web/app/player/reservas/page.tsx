"use client";
import { GlowCard, SectionPill, SegmentedTabs } from "@/components/player/ui";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Calendar, Clock, MapPin, CheckCircle2, AlertCircle,
  XCircle, ArrowRight, Navigation, Ticket, X, Share2, Stars, Timer,
  ShieldCheck, CalendarDays, Trophy, Medal, Star, Trash2, Loader, Receipt
, Repeat } from "@/components/player/icons";
import { QRCodeSVG } from "qrcode.react";
import { usePlayer } from "@/context/PlayerContext";
import { bookingService } from "@/services/client/player/bookingService";
import { venueService } from "@/services/client/player/venueService";
import { postApi } from "@/services/client/apiClient";
import { invalidate } from "@/services/client/player/cache";
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
    const d = date.toDate ? date.toDate() : date.seconds ? new Date(date.seconds * 1000) : /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? new Date(`${date}T12:00:00`) : new Date(date);
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
  if (!booking) return { label: "Sin estado", color: C.sub };
  const isNoShow = booking.status === "no-show" || booking.paymentStatus === "no-show" || booking.noShow === true;
  if (isNoShow) return { label: "No asististe", color: "#f43f5e" };
  if (booking.status === "cancelled") {
    if (booking.paymentStatus === "refund_failed") return { label: "Devolución fallida", color: "#f43f5e" };
    if (booking.paymentStatus === "refunded") return { label: "Reembolsada", color: "#10b981" };
    if (booking.cancelledBy === "staff") return { label: "Anulada por el recinto", color: "#f43f5e" };
    if (booking.cancelledBy) return { label: "Cancelada", color: "#f43f5e" };
    return { label: "Anulada", color: "#f43f5e" };
  }
  if ((booking.status === "active" || booking.checkIn) && !booking.checkOut) return { label: "En juego", color: "#3b82f6" };
  if (booking.status === "completed" || booking.status === "past" || booking.checkOut === true) return { label: "Jugada", color: C.sub };
  if (booking.paymentStatus === "pending") return { label: "Reservada", color: "#f59e0b" };
  if (booking.status === "confirmed") return { label: "Confirmada", color: "#10b981" };
  return { label: "PENDIENTE", color: "#f59e0b" };
};



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


  useEffect(() => {
    setHistoryLimit(10);
  }, [activeTab]);

  const baseBg = isDark ? "bg-[#020611]" : "bg-[#F8FAFC]";
  const cardBg = isDark ? "bg-[#0A101D]" : "bg-white";
  const borderClr = isDark ? "border-white/5" : "border-slate-200";
  const textClr = isDark ? "text-[#F8FAFC]" : "text-[#0F172A]";
  const subClr = isDark ? "text-[#94A3B8]" : "text-[#64748B]";

  const loadData = async (isRefreshing = false) => {
    if (!(profile as any)?.uid) return;
    if (!isRefreshing) setLoading(true);
    try {
      invalidate('bookings:'); // Mis reservas siempre lee lo último (pagos/reembolsos del servidor)
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
      await bookingService.checkOut(surveyBooking.id);
    } catch {
      setFbType("error");
      setFbMsg("No pudimos registrar tu salida. Intenta de nuevo.");
      setFbVisible(true);
      return;
    }
    // La salida ya quedó registrada; la reseña se valida en el servidor
    try {
      await venueService.submitVenueFeedback(surveyBooking.tenantId, surveyBooking.id, rating, feedback);
      setFbType("success");
      setFbMsg("¡Gracias por tu valoración! Partido finalizado con éxito.");
    } catch (e: any) {
      setFbType("error");
      setFbMsg(`Partido finalizado, pero no se guardó tu reseña: ${e?.message || "intenta más tarde"}`);
    }
    loadData();
    setShowSurveyModal(false);
    setFbVisible(true);
  };

  const handleCancel = (bookingId: string) => {
    const h = hoursUntil(bookings.find((b) => b.id === bookingId));
    if (h !== null && h < 24) {
      setFbType("error");
      setFbMsg("Las reservas solo se pueden cancelar hasta 24 horas antes del partido.");
      setFbVisible(true);
      return;
    }
    setBookingToCancel(bookingId);
    setShowCancelModal(true);
  };

  const hoursUntil = (b?: (typeof bookings)[number]) => {
    if (!b?.date || !b?.startTime) return null;
    const bookingDate = (b.date as any).toDate ? (b.date as any).toDate() : new Date(b.date as any);
    return (getBookingDateTimeChile(bookingDate, b.startTime).getTime() - getSantiagoDateTime(new Date()).getTime()) / 3_600_000;
  };

  const confirmCancel = async () => {
    if (!bookingToCancel) return;
    try {
      const res = await postApi<{ success: boolean; refundAmount: number; fee: number; error?: string }>("/api/bookings/refund", { bookingId: bookingToCancel });
      bookingService.closeMatchmakingFor(bookingToCancel).catch(() => undefined);
      loadData();
      setShowCancelModal(false);
      setFbType("success");
      setFbMsg(
        res.refundAmount > 0
          ? `Reserva cancelada. Te devolveremos $${new Intl.NumberFormat("es-CL").format(res.refundAmount)} (se descuenta un 3% por costos de procesamiento: $${new Intl.NumberFormat("es-CL").format(res.fee)}).`
          : res.success
            ? "Tu reserva fue cancelada."
            : "Reserva cancelada, pero el reembolso automático falló. Usa el código de reclamo de tu ticket con el recinto."
      );
      setFbVisible(true);
    } catch (e: any) {
      setShowCancelModal(false);
      setFbType("error");
      setFbMsg(e?.message || "No se pudo cancelar la reserva. Intenta de nuevo.");
      setFbVisible(true);
    }
  };

  const cancelModalInfo = useMemo(() => {
    const b = bookings.find((x) => x.id === bookingToCancel);
    const isPaid = b?.paymentStatus === "paid" || b?.paymentStatus === "partial";
    return isPaid
      ? { title: "¿Cancelar reserva?", message: "Faltan más de 24 horas: te devolveremos lo pagado menos un 3% por costos de procesamiento. Esta acción no se puede deshacer.", danger: false }
      : { title: "¿Cancelar reserva?", message: "Esta acción no se puede deshacer. ¿Estás seguro?", danger: true };
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
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <div className="w-10" aria-hidden />
        <h1 className="font-heading font-black text-[18px] tracking-tight flex-1 text-center">Mis Reservas</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-3">
        <SegmentedTabs isDark={isDark} value={activeTab} onChange={setActiveTab} options={[{ id: "activas", label: "Activas" }, { id: "historial", label: "Historial" }]} />
      </div>

      {/* List */}
      <div className="px-0.5 pb-4">
        <SectionPill label={activeTab === "activas" ? "Próximos partidos" : "Historial"} />

        {paginatedList.length === 0 && (
          <div className="px-5 mt-6">
            <GlowCard isDark={isDark}>
              <div className="py-12 flex flex-col items-center justify-center">
                <CalendarDays size={48} strokeWidth={1} className={subClr} />
                <p className={`text-[12px] font-semibold mt-5 text-center ${subClr}`}>{activeTab === "activas" ? "No tienes partidos próximos" : "Aún no hay partidos en tu historial"}</p>
                {activeTab === "activas" && (
                  <button onClick={() => router.push("/player/clubes")} className="mt-4 px-5 h-10 rounded-md text-[12px] font-semibold bg-emerald-500 text-white">Reservar cancha</button>
                )}
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
          // Ventana de ingreso: desde 30 min antes hasta el fin del bloque de 1 h
          const st = (() => { const d = getFormattedDate(b.date).raw as Date | undefined; if (!d) return null; const [h, m] = String(b.startTime || "00:00").split(":").map(Number); const o = new Date(d); o.setHours(h || 0, m || 0, 0, 0); if ((h || 0) < 6) o.setDate(o.getDate() + 1); return o; })();
          const inWindow = !!st && Date.now() >= st.getTime() - 30 * 60_000 && Date.now() <= st.getTime() + 60 * 60_000;
          const isActive = (b.status === "active" || b.checkIn) && !b.checkOut;
          const isCompleted = b.status === "completed" || b.status === "past" || b.checkOut === true;
          const isCancelled = b.status === "cancelled";
          const showMapsAndTicket = (!isCompleted && !isCancelled) || b.paymentStatus === "refund_failed";

          return (
            <div key={b.id} className="mx-5 mb-3 last:mb-0">
              <GlowCard isDark={isDark}>
                <div className="p-4">
                  {/* Resumen compacto: fecha · recinto/cancha · hora y valor · estado */}
                  <div className="flex items-start gap-3.5">
                    <div className={`w-[54px] shrink-0 rounded-md text-center py-2 ${isDark ? "bg-white/[0.05]" : "bg-slate-100"}`}>
                      <p className={`text-[18px] font-bold leading-none ${textClr}`}>{dateInfo.day}</p>
                      <p className={`text-[11px] font-semibold mt-1 ${subClr}`}>{dateInfo.month}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-[14px] font-semibold leading-tight truncate ${textClr}`}>{venueName || b.tenantName}</p>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0" style={{ backgroundColor: status.color + "18", color: status.color }}>{status.label}</span>
                      </div>
                      <p className={`text-[12px] mt-0.5 truncate ${subClr}`}>
                        <span style={{ color: sportInfo.color }} className="font-semibold capitalize">{b.sport}</span> · {b.courtName}
                      </p>
                      <p className={`text-[12px] font-semibold mt-1.5 ${textClr}`}>
                        {b.startTime} hrs · ${new Intl.NumberFormat("es-CL").format(b.totalPrice || b.price || 0)}
                      </p>
                      {!isCancelled && b.paymentStatus !== "paid" && (
                        <p className="text-[11px] font-semibold mt-1" style={{ color: b.paymentStatus === "refunded" ? "#10b981" : b.paymentStatus === "refund_failed" ? "#ef4444" : "#f59e0b" }}>
                          {b.paymentStatus === "refunded" ? "Reembolsado" : b.paymentStatus === "refund_failed" ? "Error en el reembolso" : "Pago pendiente"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {(showMapsAndTicket || isConfirmed || isActive || ((isCompleted || isCancelled) && b.tenantId)) && (
                  <div className="flex gap-2 pt-3.5 mt-4" style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0"}` }}>
                    {(isCompleted || isCancelled) && b.tenantId && b.paymentStatus !== "refund_failed" && (
                      <button onClick={() => router.push(`/player/clubes/${b.tenantId}?sport=${encodeURIComponent(b.sport || "")}`)}
                        className={`flex-1 h-[44px] rounded-md flex items-center justify-center gap-2 font-semibold text-[12px] transition-all active:scale-[0.98] ${isDark ? "bg-white/6 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                        <Repeat size={15} /> Reservar de nuevo
                      </button>
                    )}
                    {/* El ingreso lo registra el recinto escaneando el código (no el jugador) */}
                    {isConfirmed && !b.checkIn && inWindow && b.paymentStatus === "paid" && (
                      <button onClick={() => { setSelectedBooking(b); setShowTicket(true); }} className="flex-1 h-[46px] rounded-md bg-emerald-500 flex items-center justify-center gap-2 text-white font-semibold text-[12px] transition-all active:scale-[0.98]">
                        <ShieldCheck size={15} /> Mostrar código en recepción
                      </button>
                    )}
                    {isActive && !b.checkOut && (
                      <button onClick={() => handleCheckOut(b)} className="flex-1 h-[46px] rounded-md flex items-center justify-center gap-2 text-white font-semibold text-[12px] transition-all active:scale-[0.98]" style={{ backgroundColor: "#f59e0b" }}>
                        <CheckCircle2 size={15} /> CHECK-OUT
                      </button>
                    )}
                    {showMapsAndTicket && !isActive && (
                      <button aria-label="Cómo llegar" onClick={() => handleOpenMaps(b)} className="w-[46px] h-[46px] rounded-md flex items-center justify-center transition-all active:scale-[0.98]" style={{ backgroundColor: "#3b82f610" }}>
                        <Navigation size={18} color="#3b82f6" />
                      </button>
                    )}
                    {!isCompleted && !isCancelled && !isActive && !b.checkIn && (
                      <button aria-label="Cancelar reserva" onClick={() => b.id && handleCancel(b.id)} className="w-[46px] h-[46px] rounded-md flex items-center justify-center transition-all active:scale-[0.98]" style={{ backgroundColor: "#ef444410" }}>
                        <XCircle size={18} color="#ef4444" />
                      </button>
                    )}
                    {showMapsAndTicket && !isActive && (!isConfirmed || !inWindow || b.checkIn || b.paymentStatus === "refund_failed") && (
                      <button
                        aria-label={b.paymentStatus === "refund_failed" ? "Ver devolución" : "Ver ticket"}
                        onClick={() => { setSelectedBooking(b); setShowTicket(true); }}
                        className={b.paymentStatus === "refund_failed" ? "flex-1 h-[46px] rounded-md bg-red-500 flex items-center justify-center gap-2 text-white font-semibold text-[12px] transition-all active:scale-[0.98]" : "w-[46px] h-[46px] rounded-md flex items-center justify-center transition-all active:scale-[0.98]"}
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
                  )}
                </div>
              </GlowCard>
            </div>
          );
        })}

        {activeTab === "historial" && displayList.length > historyLimit && (
          <button
            onClick={() => setHistoryLimit((prev) => prev + 10)}
            className={`mx-6 mt-4 mb-6 h-[55px] rounded-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isDark ? "bg-white/6 border border-white/6 hover:bg-white/10" : "bg-slate-100 border border-slate-200 hover:bg-slate-200"}`}
          >
            <span className="text-emerald-500 font-semibold text-[12px]">Cargar más reservas</span>
          </button>
        )}
      </div>

      {/* Ticket Modal */}
      {showTicket && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5" onClick={() => setShowTicket(false)}>
          {selectedBooking.paymentStatus === "refund_failed" ? (
            <div className={`w-full max-w-sm rounded-md border overflow-hidden ${isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-5 border-b flex justify-between items-center ${isDark ? "border-white/6" : "border-slate-200"}`}>
                <span className={`text-[15px] font-semibold tracking-tight ${textClr}`}>Devolución Pendiente</span>
                <button aria-label="Cerrar" onClick={() => setShowTicket(false)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }}>
                  <X size={18} className={textClr} />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="text-center">
                  <p className="text-red-500 text-[12px] font-semibold mb-1.5">Reversa Automática Fallida</p>
                  <p className={`text-[18px] font-semibold tracking-tight ${textClr}`}>${new Intl.NumberFormat("es-CL").format(Number(selectedBooking.totalPrice || selectedBooking.price || 0))}</p>
                  <p className={`text-[11px] font-semibold ${subClr}`}>Monto Pendiente de Devolución</p>
                </div>
                <div className="space-y-3 pt-5 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0" }}>
                  <DetailRow label="Jugador" value={selectedBooking.clientName || "—"} subClr={subClr} textClr={textClr} />
                  <DetailRow label="Recinto" value={selectedBooking.tenantName || "—"} subClr={subClr} textClr={textClr} />
                  <DetailRow label="Cancha" value={selectedBooking.courtName || "—"} subClr={subClr} textClr={textClr} />
                  <DetailRow label="Deporte" value={selectedBooking.sport || "—"} subClr={subClr} textClr={textClr} />
                  <DetailRow label="Fecha Partido" value={getFormattedDate(selectedBooking.date).full} subClr={subClr} textClr={textClr} />
                  <DetailRow label="Horario" value={`${selectedBooking.startTime} HRS`} subClr={subClr} textClr={textClr} />
                  <DetailRow label="Método Pago" value="Online (Mercado Pago)" subClr={subClr} textClr={textClr} />
                  <div className="flex justify-between items-center py-0.5">
                    <span className={`text-[12px] font-semibold ${subClr}`}>Estado Reclamación</span>
                    <span className="text-red-500 text-[11px] font-semibold">Manual Pendiente</span>
                  </div>
                  <div className="h-px border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0" }} />
                  <DetailRow label="ID Reserva" value={selectedBooking.id || "—"} subClr={subClr} textClr={textClr} />
                  <div className="flex justify-between items-center py-0.5">
                    <span className={`text-[12px] font-semibold ${subClr}`}>Código Validación</span>
                    <span className="text-red-500 text-[11px] font-semibold">MVP-REFUND-{(selectedBooking.id || "").substring(0, 8).toUpperCase()}</span>
                  </div>
                </div>
                <div className={`p-5 rounded-md border space-y-2 ${isDark ? "bg-white/3 border-white/6" : "bg-slate-50 border-slate-200"}`}>
                  <p className="text-red-500 text-[12px] font-semibold">Instrucciones para Devolución</p>
                  <p className={`text-[11px] font-semibold leading-[14px] ${subClr}`}>
                    Debido a una desconexión temporal con la pasarela de pagos, el sistema automático no pudo reversar tu dinero. Presenta este comprobante de validación digital directamente al administrador o dueño del recinto deportivo para solicitar tu transferencia manual por el monto total indicado arriba.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!selectedBooking) return;
                    const displayD = getFormattedDate(selectedBooking.date).full;
                    const shareText = `*COMPROBANTE DE DEVOLUCIÓN DE PAGO - MVP SPORTS*\n\n` +
                      `Estimado Administrador de *${selectedBooking.tenantName}*,\n\n` +
                      `Presento el ticket oficial de solicitud de reembolso debido a una reversa automática fallida de la pasarela de pagos. A continuación se detallan los datos de la transacción para su validación manual:\n\n` +
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
                  className="w-full h-[55px] rounded-md flex items-center justify-center gap-2 text-white font-semibold text-[12px]"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <Share2 size={16} /> COMPARTIR COMPROBANTE
                </button>
              </div>
            </div>
          ) : (
            <div className={`w-full max-w-sm rounded-md overflow-hidden border ${isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-7 border-b-2 border-dashed ${isDark ? "border-white/10" : "border-slate-200"}`}>
                <div className="flex justify-between items-center mb-5">
                  <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ backgroundColor: modalSportInfo.color + "15" }}>
                    <Trophy size={24} color={modalSportInfo.color} />
                  </div>
                  <button aria-label="Cerrar" onClick={() => setShowTicket(false)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F1F5F9" }}>
                    <X size={20} className={textClr} />
                  </button>
                </div>
                <p className={`text-[12px] font-semibold mb-1 ${subClr}`}>RECINTO</p>
                <p className={`text-[18px] font-semibold mb-5 ${textClr}`}>{selectedBooking.tenantName}</p>
                <div className="flex gap-8">
                  <div>
                    <p className={`text-[12px] font-semibold mb-1 ${subClr}`}>CANCHA</p>
                    <p className={`text-[13px] font-semibold ${textClr}`}>{selectedBooking.courtName}</p>
                  </div>
                  <div>
                    <p className={`text-[12px] font-semibold mb-1 ${subClr}`}>ESTADO</p>
                    <p className="text-[13px] font-semibold" style={{ color: modalStatus.color }}>{modalStatus.label}</p>
                  </div>
                </div>
              </div>
              <div className={`p-10 flex flex-col items-center ${isDark ? "bg-white/3" : "bg-slate-50"}`}>
                <div className="bg-white p-5 rounded-md shadow-xs">
                  {selectedBooking.id && <QRCodeSVG value={selectedBooking.id} size={150} fgColor="#0F172A" bgColor="white" />}
                </div>
                <p className={`text-[12px] font-semibold mt-6 ${subClr}`}>ID: {(selectedBooking.id as string)?.slice(-8).toUpperCase()}</p>
              </div>
              <div className="p-7">
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} color={modalSportInfo.color} />
                    <span className={`text-[13px] font-semibold ${textClr}`}>{getFormattedDate(selectedBooking.date).full}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} color={modalSportInfo.color} />
                    <span className={`text-[13px] font-semibold ${textClr}`}>{selectedBooking.startTime} HRS</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Modal */}
      {fbVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-10" onClick={() => setFbVisible(false)}>
          <div className={`w-full max-w-sm rounded-md p-7 border flex flex-col items-center ${isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="w-[70px] h-[70px] rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: fbType === "error" ? "#ef444422" : "#10b98122" }}>
              {fbType === "error" ? <XCircle color="#ef4444" size={35} /> : <CheckCircle2 color="#10b981" size={35} />}
            </div>
            <p className={`text-[16px] font-semibold text-center mb-2.5 ${textClr}`}>{fbType === "error" ? "No se pudo completar" : "¡Listo!"}</p>
            <p className={`text-[13px] font-semibold text-center mb-6 leading-5 ${subClr}`}>{fbMsg}</p>
            <button onClick={() => setFbVisible(false)} className="w-full h-[50px] rounded-md flex items-center justify-center text-white font-semibold text-[13px] transition-all active:scale-[0.98]" style={{ backgroundColor: fbType === "error" ? "#ef4444" : "#10b981" }}>
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {/* Survey Modal */}
      {showSurveyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={() => setShowSurveyModal(false)}>
          <div className={`w-full max-w-sm rounded-md p-7 border ${isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center mb-6">
              <div className="w-[60px] h-[60px] rounded-md flex items-center justify-center mb-4" style={{ backgroundColor: "#10b98115" }}>
                <Star color="#10b981" size={30} fill="#10b981" />
              </div>
              <p className={`text-[18px] font-semibold ${textClr}`}>Tu Experiencia</p>
              <p className={`text-[11px] font-semibold text-center mt-1 ${subClr}`}>¿Qué te pareció el recinto y el servicio hoy?</p>
            </div>
            <div className="flex justify-center gap-2.5 mb-7">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setSurveyRating(s)}>
                  <Star size={32} color={surveyRating >= s ? "#f59e0b" : subClr} fill={surveyRating >= s ? "#f59e0b" : "transparent"} strokeWidth={2} />
                </button>
              ))}
            </div>
            <textarea
              className={`w-full min-h-[100px] rounded-md p-5 text-[13px] border mb-6 resize-none outline-hidden ${isDark ? "bg-[#0A101D] text-[#F8FAFC] border-white/6" : "bg-white text-[#0F172A] border-slate-200"}`}
              placeholder="Comentarios adicionales (opcional)..."
              value={surveyFeedback}
              onChange={(e) => setSurveyFeedback(e.target.value)}
            />
            <div className="flex gap-2.5">
              <button onClick={() => setShowSurveyModal(false)} className={`flex-1 h-[60px] rounded-md font-semibold text-[13px] border transition-all active:scale-[0.98] ${isDark ? "bg-white/6 text-[#94A3B8] border-white/6" : "bg-slate-100 text-[#64748B] border-slate-200"}`}>
                CANCELAR
              </button>
              <button
                onClick={() => handleSaveSurvey(surveyRating, surveyFeedback)}
                className="flex-2 h-[60px] rounded-md bg-emerald-500 text-white font-semibold text-[13px] transition-all active:scale-[0.98]"
              >
                FINALIZAR PARTIDO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-10" onClick={() => setShowCancelModal(false)}>
          <div className={`w-full max-w-sm rounded-md p-7 border flex flex-col items-center ${isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: (cancelModalInfo.danger ? "#ef4444" : "#10b981") + "15" }}>
              <Trash2 size={40} color={cancelModalInfo.danger ? "#ef4444" : "#f59e0b"} />
            </div>
            <p className={`text-[16px] font-semibold text-center mb-2.5 ${textClr}`}>{cancelModalInfo.title}</p>
            <p className={`text-[13px] font-semibold text-center mb-7 leading-5 ${subClr}`}>{cancelModalInfo.message}</p>
            <div className="flex gap-2.5 w-full">
              <button onClick={() => setShowCancelModal(false)} className={`flex-1 h-[55px] rounded-md font-semibold text-[11px] border transition-all active:scale-[0.98] ${isDark ? "bg-white/6 text-[#94A3B8] border-white/6" : "bg-slate-100 text-[#64748B] border-slate-200"}`}>
                VOLVER
              </button>
              <button onClick={confirmCancel} className="flex-1 h-[55px] rounded-md font-semibold text-[11px] text-white transition-all active:scale-[0.98]" style={{ backgroundColor: cancelModalInfo.danger ? "#ef4444" : "#10b981" }}>
                SÍ, CANCELAR
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
    <span className={`text-[12px] font-semibold ${subClr}`}>{label}</span>
    <span className={`text-[11px] font-semibold ${textClr}`}>{value}</span>
  </div>
);
