"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, MapPin, Star, Info, ShieldCheck, CheckCircle2, X, Phone, MessageCircle, Navigation, Wifi, Tv, Car, Umbrella, Wind, CircleDot, Zap, Globe, Ban, CreditCard, Images } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { venueService, Tenant, Court } from "@/services/player/venueService";
import { bookingService } from "@/services/player/bookingService";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon, CanchaFutbolIcon, CanchaPadelIcon, CanchaTenisIcon, CanchaBasquetbolIcon, CanchaVoleibolIcon } from "@/components/icons/SportsIcons";

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

const SPORT_ICONS: Record<string, any> = {
  futbol: FutbolIcon, fútbol: FutbolIcon, futbolito: FutbolIcon,
  padel: PadelIcon, pádel: PadelIcon,
  tenis: TenisIcon,
  basquet: BasquetbolIcon, basket: BasquetbolIcon, básquetbol: BasquetbolIcon,
  voley: VoleibolIcon, vóley: VoleibolIcon, voleibol: VoleibolIcon,
};

const COURT_ICONS: Record<string, any> = {
  futbol: CanchaFutbolIcon, fútbol: CanchaFutbolIcon, futbolito: CanchaFutbolIcon,
  padel: CanchaPadelIcon, pádel: CanchaPadelIcon,
  tenis: CanchaTenisIcon,
  basquet: CanchaBasquetbolIcon, basket: CanchaBasquetbolIcon, básquetbol: CanchaBasquetbolIcon,
  voley: CanchaVoleibolIcon, vóley: CanchaVoleibolIcon, voleibol: CanchaVoleibolIcon,
};

const SPORT_COLORS: Record<string, string> = {
  futbol: "#10b981", fútbol: "#10b981", futbolito: "#10b981",
  padel: "#3b82f6", pádel: "#3b82f6",
  tenis: "#f59e0b",
  basquet: "#6366f1", basket: "#6366f1", básquetbol: "#6366f1",
  voley: "#ec4899", vóley: "#ec4899", voleibol: "#ec4899",
};

const getSportKey = (s: string) => { const n = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); return n; };
const getSportInfo = (sport: string) => {
  const k = getSportKey(sport);
  for (const [key, val] of Object.entries(SPORT_COLORS)) { if (getSportKey(key) === k) return { color: val, icon: SPORT_ICONS[key] || SPORT_ICONS.futbol, courtIcon: COURT_ICONS[key] || COURT_ICONS.futbol }; }
  return { color: "#10b981", icon: SPORT_ICONS.futbol, courtIcon: COURT_ICONS.futbol };
};

// Numeric sort for court names (Cancha 1, Cancha 2, ..., Cancha 10, Cancha 11)
const sortCourts = (a: any, b: any) => {
  const numA = parseInt(a.name.replace(/\D/g, "")) || 0;
  const numB = parseInt(b.name.replace(/\D/g, "")) || 0;
  return numA - numB;
};

// Get price from tenant pricing config based on sport + date + time
const getPriceFromConfig = (venue: Tenant | null, sport: string, dateStr: string, timeStr: string): number => {
  try {
    const v = venue as any;
    const pricing = v?.pricing?.[sport];
    if (!pricing) return 0;
    const d = new Date(dateStr + "T12:00:00");
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;
    const schedule = isWeekend ? pricing.weekend : pricing.weekday;
    if (!schedule) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    const timeMinutes = h * 60 + (m || 0);
    let bestPrice = 0;
    let bestDiff = Infinity;
    for (const [slot, price] of Object.entries(schedule)) {
      const [sh, sm] = slot.split(":").map(Number);
      const slotMinutes = sh * 60 + (sm || 0);
      const diff = Math.abs(timeMinutes - slotMinutes);
      if (diff < bestDiff) { bestDiff = diff; bestPrice = price as number; }
    }
    return bestPrice;
  } catch { return 0; }
};

const getLocalISODate = (d: Date) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`;
const getChileNow = () => { const d = new Date(); return new Date(d.toLocaleString("en-US", { timeZone: "America/Santiago" })); };
const getOperationalDate = () => { const d = getChileNow(); if (d.getHours() < 6) d.setDate(d.getDate() - 1); return getLocalISODate(d); };
const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) < 1 ? `${Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*1000)}m` : `${(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))).toFixed(1)}km`;
};

export default function VenueDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { theme } = usePlayer();
  const isDark = theme === "dark";

  const [venue, setVenue] = useState<Tenant | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(getOperationalDate());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => { navigator.geolocation.getCurrentPosition((p) => setUserLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }), () => {}, { enableHighAccuracy: true, timeout: 10000 }); }, []);
  useEffect(() => {
    if (!id) return;
    // Real-time listener for venue
    const unsubVenue = onSnapshot(doc(db, "tenants", id as string), (snap) => {
      if (snap.exists()) {
        const v = { id: snap.id, ...snap.data() } as Tenant;
        setVenue(v);
      }
      setLoading(false);
    });
    // Real-time listener for courts
    const qCourts = query(collection(db, "courts"), where("tenantId", "==", id));
    const unsubCourts = onSnapshot(qCourts, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Court));
      setCourts(list);
    });
    // Load reviews
    venueService.getVenueFeedback(id as string).then(setReviews).catch(() => {});
    return () => { unsubVenue(); unsubCourts(); };
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!id || !selectedCourtId || !selectedDate) return;
      setLoadingSlots(true);
      try { const s = await bookingService.getAvailableTimeSlots(id as string, selectedCourtId, selectedDate); setAvailableSlots(s); } catch {}
      finally { setLoadingSlots(false); }
    })();
  }, [id, selectedCourtId, selectedDate]);

  const handleBack = useCallback(() => { if (bookingStep > 1) setBookingStep(p => p - 1); else router.back(); }, [bookingStep, router]);

  const handleOpenMaps = () => {
    if (!venueCoords) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${venueCoords.latitude},${venueCoords.longitude}`;
    window.open(url, '_blank');
  };

  const availableSports = useMemo(() => {
    const v = venue as any;
    const pricing = v?.pricing;
    if (!pricing) return [];
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const hasPrice = (sport: string) => {
      const p = pricing[sport];
      if (!p) return false;
      const sched = p.weekday || p.weekend;
      if (!sched) return false;
      return Object.values(sched).some((val: any) => Number(val) > 0);
    };
    // Prefer names from pricing keys, fallback to activeSports for display name
    const map = new Map<string, string>();
    Object.keys(pricing).forEach((s) => { if (hasPrice(s)) map.set(normalize(s), s); });
    (v?.activeSports || []).forEach((s: string) => {
      const key = normalize(s);
      if (!map.has(key) && hasPrice(s)) map.set(key, s);
    });
    return Array.from(map.values()).sort();
  }, [venue]);
  const filteredCourts = useMemo(() => {
    if (!selectedSport) return [];
    const sel = getSportKey(selectedSport);
    return courts.filter(c => { const cs = getSportKey(c.sport || ""); return cs.includes(sel) || sel.includes(cs); }).sort(sortCourts);
  }, [courts, selectedSport]);

  const groupedSlots = useMemo(() => {
    const slots: Record<string, string[]> = { mañana: [], tarde: [], noche: [] };
    [...availableSlots].sort((a, b) => { const p = (t: string) => { const [h, m] = t.split(":").map(Number); return h < 6 ? (h+24)*60+m : h*60+m; }; return p(a) - p(b); })
      .forEach(s => { const h = parseInt(s.split(":")[0]); if (h >= 6 && h < 12) slots.mañana.push(s); else if (h >= 12 && h < 18) slots.tarde.push(s); else slots.noche.push(s); });
    return slots;
  }, [availableSlots]);

  const currentDayHours = useMemo(() => {
    if (!venue) return "08:00 - 23:00";
    const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const chileNow = getChileNow();
    const dayName = days[chileNow.getDay()];
    const s = (venue as any).schedule;
    if (s?.[dayName]) { if (s[dayName].isOpen === false) return "Cerrado"; if (s[dayName].open) return `${s[dayName].open} - ${s[dayName].close}`; }
    return `${(venue as any).openTime || "08:00"} - ${(venue as any).closeTime || "23:00"}`;
  }, [venue]);

  const scheduleSummary = useMemo(() => {
    if (!venue) return "Lunes a Domingo: 08:00 - 23:00";
    const s = (venue as any).schedule;
    const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const dayNames = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

    // If no per-day schedule, use openTime/closeTime
    if (!s) return `Lunes a Domingo: ${(venue as any).openTime || "08:00"} - ${(venue as any).closeTime || "23:00"}`;

    const weekdayRanges: string[] = [];
    const weekendRanges: string[] = [];
    let allSame = true;
    let firstRange = "";

    for (let i = 0; i < 7; i++) {
      const day = days[i];
      const entry = s[day];
      if (!entry || entry.isOpen === false) {
        allSame = false;
        if (i < 6) weekdayRanges.push(`${dayNames[i]}: Cerrado`);
        else weekendRanges.push(`${dayNames[i]}: Cerrado`);
        continue;
      }
      const range = `${entry.open || (venue as any).openTime || "08:00"} - ${entry.close || (venue as any).closeTime || "23:00"}`;
      if (firstRange && range !== firstRange) allSame = false;
      if (!firstRange) firstRange = range;
      if (i > 0 && i < 6) weekdayRanges.push(`Lunes a Viernes: ${range}`);
      else if (i === 0 || i === 6) weekendRanges.push(`Sábado y Domingo: ${range}`);
    }

    if (allSame && firstRange) return `Lunes a Domingo: ${firstRange}`;
    const parts: string[] = [];
    if (weekdayRanges.length > 0) parts.push(weekdayRanges[0]);
    if (weekendRanges.length > 0) parts.push(weekendRanges[0]);
    // Add any individual day overrides
    for (let i = 1; i < 7; i++) {
      const day = days[i];
      const entry = s[day];
      if ((entry?.isOpen === false || entry?.open) && i > 0 && i < 6 && !weekdayRanges.includes(`Lunes a Viernes: ${entry.open || (venue as any).openTime || "08:00"} - ${entry.close || (venue as any).closeTime || "23:00"}`) && weekdayRanges.length > 0) {
        // skip - already handled by Lunes a Viernes
      }
    }
    return parts.join(" | ");
  }, [venue]);

  const getCourtPrice = useCallback((courtId: string, sportName?: string, dateStr?: string, timeStr?: string) => {
    const sn = sportName || selectedSport || "";
    const ds = dateStr || selectedDate;
    const ts = timeStr || selectedTime || "12:00";
    return getPriceFromConfig(venue, sn, ds, ts);
  }, [venue, selectedSport, selectedDate, selectedTime]);

  const venueCoords = useMemo(() => {
    const c = (venue as any)?.coordinates || (venue as any)?.location;
    if (!c) return null;
    return { latitude: c.latitude || c._lat || c.lat, longitude: c.longitude || c._long || c.lng };
  }, [venue]);

  const distanceLabel = useMemo(() => {
    if (!userLocation || !venueCoords) return null;
    return formatDistance(userLocation.latitude, userLocation.longitude, venueCoords.latitude, venueCoords.longitude);
  }, [userLocation, venueCoords]);

  const confirmationData = useMemo(() => {
    if (!selectedCourtId || !selectedTime || !selectedSport) return null;
    const court = courts.find(c => c.id === selectedCourtId);
    const price = getPriceFromConfig(venue, selectedSport, selectedDate, selectedTime);
    return { tenantId: id, tenantName: venue?.name, courtId: selectedCourtId, courtName: court?.name, price, date: selectedDate, startTime: selectedTime, sport: selectedSport, sportColor: getSportInfo(selectedSport).color };
  }, [selectedCourtId, selectedTime, selectedSport, courts, venue, id, selectedDate]);

  const handleConfirmBooking = () => {
    if (!confirmationData) return;
    const params = new URLSearchParams(confirmationData as any).toString();
    router.push(`/player/checkout?${params}`);
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-4">
      {[1, 2, 3, 4].map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all shrink-0 ${bookingStep >= s ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30" : isDark ? "bg-white/[0.06] text-slate-500" : "bg-slate-100 text-slate-400"}`}>
            <span>{bookingStep >= s ? "✓" : s}</span>
          </div>
          {i < 3 && <div className={`w-8 h-[2px] mx-0.5 ${bookingStep > s ? "bg-emerald-500" : isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} />}
        </div>
      ))}
    </div>
  );

  const renderSportSelection = () => (
    <GlowCard isDark={isDark}>
      <div className="p-5">
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Elige un deporte</p>
        <div className="flex flex-wrap gap-3">
          {availableSports.map((sport: string) => {
            const info = getSportInfo(sport);
            const SportIcon = info.icon;
            return (
              <button key={sport} onClick={() => { setSelectedSport(sport); setSelectedCourtId(null); setSelectedTime(null); setBookingStep(2); }}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-[14px] text-sm font-semibold transition-all active:scale-95 ${selectedSport === sport ? "text-white" : isDark ? "text-slate-300 bg-white/[0.06] hover:bg-white/[0.1]" : "text-slate-700 bg-slate-100 hover:bg-slate-200"}`}
                style={selectedSport === sport ? { backgroundColor: info.color } : {}}>
                <SportIcon color={selectedSport === sport ? "white" : info.color} size={22} />
                {sport}
              </button>
            );
          })}
        </div>
      </div>
    </GlowCard>
  );

  const renderBackButton = () => (
    <button onClick={() => setBookingStep(p => p - 1)} className={`flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95 ${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
      <ChevronLeft size={14} /> Volver
    </button>
  );

  const renderCourtSelection = () => (
    <GlowCard isDark={isDark}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          {renderBackButton()}
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Cancha y horario</p>
          <div className="w-12" />
        </div>
        {/* Selected date info */}
        <div className={`flex items-center gap-2 mb-4 p-3 rounded-[14px] border ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
          <Clock size={14} className="text-emerald-500" />
          <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            {dateLabel} • {dateDayName} {currentDateInfo.date.toLocaleDateString("es-CL", { day: "numeric", month: "long" })}
          </span>
          <button onClick={() => setBookingStep(2)} className="ml-auto text-emerald-500 text-[9px] font-semibold uppercase">Cambiar</button>
        </div>
        <div className="space-y-3">
          {filteredCourts.length === 0 ? (
            <p className={`text-sm font-medium py-6 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>No hay canchas disponibles para este deporte</p>
          ) : (
            filteredCourts.map((court) => {
              const info = getSportInfo(court.sport || "");
              const CourtIcon = info.courtIcon;
              const courtData = court as any;
              const isUnavailable = courtData?.status === "maintenance" || courtData?.status === "occupied";
              const isSelected = selectedCourtId === court.id;
              return (
                <div key={court.id}>
                  <button onClick={() => { if (!isUnavailable) { setSelectedCourtId(court.id); setSelectedTime(null); } }}
                    className={`w-full flex items-start gap-4 p-4 rounded-[14px] border transition-all active:scale-[0.98] ${isUnavailable ? "opacity-50" : isSelected ? "border-emerald-500 bg-emerald-500/5" : isDark ? "border-white/[0.06] hover:bg-white/[0.02]" : "border-slate-200 hover:bg-slate-50"}`}
                    disabled={isUnavailable}>
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${info.color}20` }}>
                      <CourtIcon color={info.color} size={26} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{court.name}</p>
                        {courtData?.category && <span className={`text-[9px] font-medium px-2 py-0.5 rounded bg-white/[0.06] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{courtData.category}</span>}
                        {isUnavailable && <span className="text-[9px] font-semibold text-red-400 uppercase">No disponible</span>}
                        {courtData?.status === "available" && <CircleDot size={8} className="text-emerald-500" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{court.sport}</span>
                        <span className="text-emerald-500 text-[11px] font-semibold">${Number(getCourtPrice(court.id, selectedSport || court.sport, selectedDate, selectedTime || "12:00")).toLocaleString("es-CL")}</span>
                      </div>
                      {courtData?.surface && <p className={`text-[9px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Superficie: {courtData.surface}</p>}
                      {courtData?.features && courtData.features.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {courtData.features.slice(0, 4).map((f: string) => (
                            <span key={f} className={`text-[7px] font-semibold px-1.5 py-0.5 rounded-[14px] uppercase tracking-wider ${isDark ? "bg-white/[0.06] text-slate-400" : "bg-slate-100 text-slate-500"}`}>{f}</span>
                          ))}
                          {courtData.features.length > 4 && <span className="text-[7px] text-slate-500">+{courtData.features.length - 4}</span>}
                        </div>
                      )}
                    </div>
                    {isSelected && <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-1" />}
                  </button>
                  {/* Time slots for selected court */}
                  {isSelected && (
                    <div className={`mt-3 p-4 rounded-[14px] border ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                      <p className={`text-[9px] font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Horarios disponibles ({currentDayHours})</p>
                      {loadingSlots ? (
                        <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
                      ) : availableSlots.length === 0 ? (
                        <p className={`text-sm font-medium py-4 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>Sin horarios disponibles</p>
                      ) : (
                        <div className="space-y-3">
                          {(["mañana", "tarde", "noche"] as const).map(period => {
                            const slots = groupedSlots[period];
                            if (!slots.length) return null;
                            const labels = { mañana: "Mañana (6-12)", tarde: "Tarde (12-18)", noche: "Noche (18-24)" };
                            return (
                              <div key={period}>
                                <p className={`text-[7px] font-semibold uppercase tracking-wider mb-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{labels[period]}</p>
                                <div className="flex flex-wrap gap-2">
                                  {slots.map(s => {
                                    const [h] = s.split(":").map(Number);
                                    const isPast = isToday && (h < currentHour || (h === currentHour && 0 <= currentMin));
                                    return (
                                      <button key={s} onClick={() => { if (!isPast) { setSelectedTime(selectedTime === s ? null : s); } }}
                                        className={`px-4 py-2.5 rounded-[14px] text-xs font-semibold transition-all active:scale-95 ${isPast ? (isDark ? "text-slate-700 bg-white/[0.02] line-through cursor-not-allowed" : "text-slate-300 bg-slate-50 line-through cursor-not-allowed") : selectedTime === s ? "bg-emerald-500 text-white shadow-sm" : isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                                        disabled={isPast}>
                                        {s}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Continue button when time selected */}
                      {selectedTime && (
                        <div className="mt-4">
                          <button onClick={() => setBookingStep(4)}
                            className="w-full h-12 rounded-[14px] bg-emerald-500 text-white font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25">
                            Continuar <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </GlowCard>
  );

  const [dateOffset, setDateOffset] = useState(0);

  // Get Chile date string
  const getChileDate = (offset: number) => {
    const d = new Date();
    const chile = new Date(d.toLocaleString("en-US", { timeZone: "America/Santiago" }));
    chile.setDate(chile.getDate() + offset);
    const y = chile.getFullYear();
    const m = (chile.getMonth() + 1).toString().padStart(2, "0");
    const day = chile.getDate().toString().padStart(2, "0");
    return { str: `${y}-${m}-${day}`, date: chile };
  };

  const chileNow = getChileNow();
  const currentDateInfo = getChileDate(dateOffset);
  const isToday = dateOffset === 0;
  const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const dateDayName = dayNames[currentDateInfo.date.getDay()];
  const dateLabel = dateOffset === 0 ? "Hoy" : dateOffset === 1 ? "Mañana" : currentDateInfo.date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  const currentHour = chileNow.getHours();
  const currentMin = chileNow.getMinutes();

  // Update selectedDate when dateOffset changes
  useEffect(() => {
    setSelectedDate(currentDateInfo.str);
    setSelectedTime(null);
  }, [dateOffset]);

  const renderDateTimeSelection = () => (
    <GlowCard isDark={isDark}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          {renderBackButton()}
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Elige el día</p>
          <div className="w-12" />
        </div>
        {/* Date selector card */}
        <div className={`p-5 rounded-[14px] border mb-5 ${isDark ? "bg-emerald-500/5 border-emerald-500/10" : "bg-emerald-50 border-emerald-200"}`}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { if (dateOffset > 0) setDateOffset(p => p - 1); }} disabled={dateOffset === 0}
              className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${dateOffset === 0 ? "opacity-30" : isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-white hover:bg-slate-100 shadow-sm"}`}>
              <ChevronLeft size={18} className="text-emerald-500" />
            </button>
            <div className="flex flex-col items-center">
              <span className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{currentDateInfo.date.getDate()}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>{currentDateInfo.date.toLocaleDateString("es-CL", { month: "long" })}</span>
              <span className={`text-[11px] font-bold mt-0.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{dateLabel} • {dateDayName}</span>
            </div>
            <button onClick={() => { setDateOffset(p => p + 1); }}
              className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-white hover:bg-slate-100 shadow-sm"}`}>
              <ChevronRight size={18} className="text-emerald-500" />
            </button>
          </div>
          {/* Quick day buttons */}
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map(offset => {
              const d = new Date(currentDateInfo.date);
              d.setDate(currentDateInfo.date.getDate() - dateOffset + offset);
              const labels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
              const isActive = offset === dateOffset;
              const isPastOffset = offset < dateOffset;
              return (
                <button key={offset} onClick={() => { if (!isPastOffset) setDateOffset(offset); }} disabled={isPastOffset}
                  className={`flex-1 py-2.5 rounded-[14px] flex flex-col items-center transition-all active:scale-95 ${isActive ? "bg-emerald-500 text-white shadow-md" : isPastOffset ? (isDark ? "text-slate-600" : "text-slate-300") : isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}>
                  <span className="text-[7px] font-semibold uppercase">{labels[d.getDay()]}</span>
                  <span className="text-xs font-bold mt-0.5">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className={`text-center mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          <p className="text-xs font-medium">
            {(() => {
              if (!selectedSport) return "Selecciona un deporte primero";
              const v = venue as any;
              // Check if venue is open on selected day
              const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
              const dayName = days[currentDateInfo.date.getDay()];
              const schedule = v?.schedule?.[dayName];
              const isClosed = schedule?.isOpen === false;
              if (isClosed) return "0 canchas disponibles • Recinto cerrado este día";
              const matchingCourts = courts.filter(c => getSportKey(c.sport || "").includes(getSportKey(selectedSport)) && (c as any).status !== "maintenance" && (c as any).status !== "occupied");
              const count = matchingCourts.length;
              if (count === 0) return "0 canchas disponibles para " + selectedSport;
              return `${count} cancha${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""} para ${selectedSport}`;
            })()}
          </p>
        </div>
        <button onClick={() => setBookingStep(3)}
          className="w-full h-12 rounded-[14px] bg-emerald-500 text-white font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25">
          Ver canchas disponibles <ChevronRight size={16} />
        </button>
      </div>
    </GlowCard>
  );

  const renderSummary = () => {
    if (!confirmationData) return null;
    const info = getSportInfo(selectedSport || "");
    const SportIcon = info.icon;
    const CourtIcon = info.courtIcon;
    const selectedCourt = courts.find(c => c.id === selectedCourtId);
    return (
      <GlowCard isDark={isDark}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            {renderBackButton()}
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Reserva</p>
            <div className="w-12" />
          </div>
          <div className="space-y-0 divide-y divide-emerald-500/5">
            {/* Sport */}
            <div className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${info.color}20` }}>
                <SportIcon color={info.color} size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{selectedSport}</p>
                <p className={`text-[9px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Deporte</p>
              </div>
            </div>
            {/* Court */}
            <div className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${info.color}15` }}>
                {CourtIcon ? <CourtIcon color={info.color} size={26} /> : <ShieldCheck size={22} style={{ color: info.color }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{selectedCourt?.name || "Cancha"}</p>
                <p className={`text-[9px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Cancha {(selectedCourt as any)?.surface ? `• ${(selectedCourt as any).surface}` : ""}</p>
              </div>
            </div>
            {/* Date & Time */}
            <div className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 bg-blue-500/10">
                <Clock size={22} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{dateDayName} {new Date(selectedDate).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p className={`text-[9px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{selectedTime} HRS</p>
              </div>
            </div>
            {/* Price */}
            <div className={`p-4 rounded-[14px] mt-4 mb-1 ${isDark ? "bg-emerald-500/10 border border-emerald-500/10" : "bg-emerald-50 border border-emerald-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Valor de la reserva</p>
                  <p className={`text-[9px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Pago único • Sin cargos adicionales</p>
                </div>
                <p className="text-2xl font-bold text-emerald-500">${Number(confirmationData.price).toLocaleString("es-CL")}</p>
              </div>
            </div>
          </div>
          <button onClick={handleConfirmBooking} className="w-full mt-5 h-14 rounded-[14px] bg-emerald-500 text-white font-semibold text-base uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/30">
            <Zap size={20} /> Confirmar y Reservar
          </button>
        </div>
      </GlowCard>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-emerald-400 text-[10px] font-semibold tracking-[3px] uppercase animate-pulse">Cargando</p>
      </div>
    );
  }

  const venueData = venue as any;

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      {/* Hero */}
      <div className="h-[220px] relative overflow-hidden">
        <img src={venueData?.imageURL || venueData?.imageUrl || "https://images.unsplash.com/photo-1574629810360-7efbbe195018"} alt={venue?.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        <button onClick={() => router.back()} className="absolute top-12 left-5 w-10 h-10 rounded-[14px] bg-black/40 border border-white/10 flex items-center justify-center z-10">
          <ChevronLeft size={20} className="text-white" />
        </button>
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-white text-2xl font-bold uppercase">{venue?.name}</h1>
          {venueData?.description && <p className="text-white/60 text-xs font-medium mt-1 line-clamp-2">{venueData.description}</p>}
        </div>
      </div>

      <div className="px-5 pb-8 -mt-4 relative z-10 space-y-4">
        {/* Venue Info Card */}
        <GlowCard isDark={isDark}>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-[14px]">
                  <Star size={13} className="text-emerald-500" fill="currentColor" />
                  <span className="text-emerald-500 font-semibold text-sm">{Number(venue?.rating || 0).toFixed(1)}</span>
                </div>
                {distanceLabel && (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-[14px] bg-emerald-500/5">
                    <Navigation size={11} className="text-emerald-500" />
                    <span className="text-emerald-500 text-xs font-semibold">{distanceLabel}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-emerald-500" />
                <span className={`text-[10px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Hoy: {currentDayHours}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {venueData?.phone && (
                <a href={`tel:${venueData.phone}`} className="flex items-center gap-1.5">
                  <Phone size={12} className="text-emerald-500" />
                  <span className={`text-[10px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>{venueData.phone}</span>
                </a>
              )}
              {venueData?.whatsapp && (
                <a href={`https://wa.me/${venueData.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                  <MessageCircle size={12} className="text-emerald-500" />
                  <span className={`text-[10px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>WhatsApp</span>
                </a>
              )}
              {venueData?.instagram && (
                <a href={`https://instagram.com/${venueData.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                  <Globe size={12} className="text-emerald-500" />
                  <span className={`text-[10px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Instagram</span>
                </a>
              )}
              {venueData?.website && (
                <a href={venueData.website.startsWith("http") ? venueData.website : `https://${venueData.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                  <Globe size={12} className="text-emerald-500" />
                  <span className={`text-[10px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Web</span>
                </a>
              )}
            </div>
            {/* Payment Methods */}
            <div className="flex flex-wrap gap-2">
              {(venueData?.isTransbankActive || venueData?.transbankCommerceCode) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[14px] border" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0", backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC" }}>
                  <CreditCard size={11} className="text-emerald-500" />
                  <span className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-600"}`}>Webpay Plus</span>
                </div>
              )}
              {venueData?.isMercadopagoActive && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[14px] border" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0", backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC" }}>
                  <CreditCard size={11} className="text-emerald-500" />
                  <span className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-600"}`}>Mercado Pago</span>
                </div>
              )}
            </div>
            {/* Action buttons row */}
            <div className="flex gap-2">
              {venueData?.gallery && venueData.gallery.length > 0 && (
                <button onClick={() => setShowGallery(true)}
                  className="flex-1 h-10 rounded-[14px] border text-[10px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                  style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0", backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC" }}>
                  <Images size={13} className="text-emerald-500" />
                  <span className={isDark ? "text-slate-300" : "text-slate-600"}>Galería</span>
                </button>
              )}
              {venueCoords && (
                <button onClick={handleOpenMaps}
                  className="flex-1 h-10 rounded-[14px] border text-[10px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                  style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0", backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC" }}>
                  <Navigation size={13} className="text-emerald-500" />
                  <span className={isDark ? "text-slate-300" : "text-slate-600"}>Cómo llegar</span>
                </button>
              )}
            </div>
            {/* Sports */}
            <div className="flex flex-wrap gap-2">
              {availableSports.map((sport: string) => {
                const info = getSportInfo(sport);
                const Icon = info.icon;
                return (
                  <div key={sport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] border" style={{ backgroundColor: `${info.color}10`, borderColor: `${info.color}20` }}>
                    <Icon color={info.color} size={14} />
                    <span className="text-[10px] font-semibold" style={{ color: info.color }}>{sport}</span>
                  </div>
                );
              })}
            </div>
            {/* Amenities */}
            {venueData?.amenities && venueData.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {venueData.amenities.map((a: string) => (
                  <div key={a} className={`px-3 py-1.5 rounded-[14px] border ${isDark ? "border-white/[0.06] bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
                    <span className={`text-[9px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlowCard>

        {/* Booking Wizard */}
        <SectionPill label="Reservar Cancha" />
        <StepIndicator />
        {bookingStep === 1 && renderSportSelection()}
        {bookingStep === 2 && renderDateTimeSelection()}
        {bookingStep === 3 && renderCourtSelection()}
        {bookingStep === 4 && renderSummary()}

        {/* Reviews */}
        <SectionPill label="Reseñas" />
        {reviews.length > 0 ? (
          <GlowCard isDark={isDark}>
            <div className="divide-y divide-emerald-500/5">
              {reviews.slice(0, 3).map((r: any) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {[1,2,3,4,5].map(s => <Star key={s} size={10} className={s <= (r.rating || 0) ? "text-amber-500" : isDark ? "text-slate-600" : "text-slate-200"} fill={s <= (r.rating || 0) ? "currentColor" : "none"} />)}
                    <span className={`text-[10px] font-medium ml-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{r.userName || "Jugador"}</span>
                  </div>
                  {r.comment && <p className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>{r.comment}</p>}
                </div>
              ))}
            </div>
          </GlowCard>
        ) : (
          <GlowCard isDark={isDark}>
            <div className="py-8 flex flex-col items-center">
              <Star size={28} className={isDark ? "text-slate-600" : "text-slate-300"} />
              <p className={`text-[10px] font-semibold uppercase tracking-wider mt-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Sin reseñas por el momento</p>
            </div>
          </GlowCard>
        )}

        {/* Rules button */}
        {(venueData?.rules?.length > 0 || venueData?.cancellationPolicy) && (
          <button onClick={() => setShowRules(true)}
            className="w-full h-[44px] rounded-[14px] font-semibold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] border"
            style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0", backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC", color: isDark ? "#94A3B8" : "#64748B" }}>
            <Ban size={14} /> Reglas del Recinto
          </button>
        )}

        <p className={`text-center text-[8px] font-medium pt-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>
      </div>

      {feedback && (
        <div className="fixed bottom-8 left-5 right-5 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`max-w-md mx-auto rounded-[14px] p-4 flex items-center gap-3 shadow-2xl backdrop-blur-xl ${feedback.type === "error" ? "bg-red-500/90 text-white" : "bg-emerald-500/90 text-white"}`}>
            <span className="flex-1 text-sm font-medium">{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100"><X size={18} /></button>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => setShowRules(false)}>
          <div className={`w-full max-w-sm rounded-[14px] border shadow-2xl ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[14px] flex items-center justify-center bg-red-500/10">
                  <Ban size={16} className="text-red-400" />
                </div>
                <p className={`font-semibold text-[14px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Reglas del Recinto</p>
              </div>
              <button onClick={() => setShowRules(false)} className="w-8 h-8 rounded-[14px] flex items-center justify-center transition-all active:scale-90" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
                <X size={14} className={isDark ? "text-slate-400" : "text-slate-500"} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {venueData?.rules?.map((rule: string, i: number) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-[14px] border ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
                  <Ban size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <span className={`text-[12px] font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>{rule}</span>
                </div>
              ))}
              {venueData?.cancellationPolicy && (
                <div className={`p-4 rounded-[14px] border ${isDark ? "bg-amber-500/5 border-amber-500/10" : "bg-amber-50 border-amber-200"}`}>
                  <p className={`text-[8px] font-semibold uppercase tracking-wider mb-1 ${isDark ? "text-amber-400" : "text-amber-600"}`}>Política de Cancelación</p>
                  <p className={`text-[11px] font-medium leading-snug ${isDark ? "text-slate-300" : "text-slate-700"}`}>{venueData.cancellationPolicy}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gallery Lightbox */}
      {showGallery && venueData?.gallery && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setShowGallery(false)}>
          <button onClick={() => setShowGallery(false)} className="absolute top-14 right-5 z-10 w-10 h-10 rounded-[14px] bg-white/10 border border-white/20 flex items-center justify-center">
            <X size={20} className="text-white" />
          </button>
          <div className="w-full max-w-lg px-5" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-[14px] overflow-hidden">
              <img src={venueData.gallery[galleryIndex]} alt="" className="w-full h-auto max-h-[70vh] object-contain" />
            </div>
            {venueData.gallery.length > 1 && (
              <div className="flex items-center justify-center gap-4 mt-5">
                <button onClick={() => setGalleryIndex(i => (i - 1 + venueData.gallery.length) % venueData.gallery.length)}
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                  <ChevronLeft size={16} className="text-white" />
                </button>
                <span className="text-white/60 text-[10px] font-medium">{galleryIndex + 1} / {venueData.gallery.length}</span>
                <button onClick={() => setGalleryIndex(i => (i + 1) % venueData.gallery.length)}
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                  <ChevronRight size={16} className="text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
