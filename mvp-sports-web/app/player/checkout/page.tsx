"use client";
import { GlowCard, SectionPill } from "@/components/player/ui";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, CreditCard, ShieldCheck, Zap, Calendar, Clock, Trophy, MapPin, Users, CheckCircle2, XCircle, X } from "@/components/player/icons";
import { usePlayer } from "@/context/PlayerContext";
import { Timestamp } from "firebase/firestore";
import { walletService } from "@/services/player/walletService";
import { couponService } from "@/services/player/couponService";
import { tournamentService } from "@/services/player/tournamentService";
import { teamService } from "@/services/player/teamService";
import { bookingService } from "@/services/player/bookingService";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/services/firebase";



const formatMoney = (n: number) => new Intl.NumberFormat("es-CL").format(n);

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, theme } = usePlayer();
  const isDark = theme === "dark";
  const activeColor = searchParams.get("sportColor") || "#10b981";

  const [processing, setProcessing] = useState(false);
  // Métodos de pago: Mercado Pago (si el recinto lo tiene activo) o en el recinto
  // (salvo inasistencia previa con pago en efectivo, o si el recinto exige pago online)
  const [method, setMethod] = useState<"mercadopago" | "venue">("mercadopago");
  const [tenantInfo, setTenantInfo] = useState<{ mpActive: boolean; requireOnline: boolean } | null>(null);
  const [hasCashNoShow, setHasCashNoShow] = useState(false);
  const [customAlert, setCustomAlert] = useState<{ visible: boolean; title: string; message: string; type: "success" | "error"; onClose?: () => void }>({ visible: false, title: "", message: "", type: "success" });
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showCoupon, setShowCoupon] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState<1 | 2 | 4>(1);
  const [couponInput, setCouponInput] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const tenantId = searchParams.get("tenantId");
  const tenantName = searchParams.get("tenantName");
  const courtName = searchParams.get("courtName");
  const price = searchParams.get("price");
  const date = searchParams.get("date");
  const startTime = searchParams.get("startTime");
  const sport = searchParams.get("sport");
  const sportColor = searchParams.get("sportColor");
  const bookingId = searchParams.get("bookingId");
  const courtId = searchParams.get("courtId");
  const type = searchParams.get("type");
  const tournamentId = searchParams.get("tournamentId");
  const teamId = searchParams.get("teamId");
  const teamName = searchParams.get("teamName");
  const tournamentName = searchParams.get("tournamentName");
  const venueName = searchParams.get("venueName");
  const tournamentType = searchParams.get("tournamentType");

  const isTournament = type === "tournament";

  useEffect(() => {
    if (profile && (profile as any).uid) {
      const uid = (profile as any).uid;
      teamService.getUserTeams(uid).then((teams) => {
        const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        setUserTeams(teams.filter((t: any) => t.ownerId === uid && norm(t.sport) === norm(sport || "")));
      });
    }
  }, [profile, sport]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    try {
      const coupon = await couponService.validateCoupon(couponInput, tenantId || "", Number(price));
      setAppliedCoupon(coupon);
      setCustomAlert({ visible: true, title: "Cupón Aplicado", message: `Descuento del ${coupon.discount}% aplicado.`, type: "success" });
    } catch (error: any) {
      setAppliedCoupon(null);
      setCustomAlert({ visible: true, title: "Cupón Inválido", message: error.message, type: "error" });
    } finally { setValidatingCoupon(false); }
  };

  // Único método de pago: Mercado Pago. El monto lo calcula el servidor.
  useEffect(() => {
    if (!tenantId) return;
    getDoc(doc(db, "tenants", tenantId)).then(snap => {
      const t: any = snap.data() || {};
      const mpActive = t.isMercadopagoActive !== false && !!(t.isMercadopagoActive || t.mercadopagoPublicKey);
      const requireOnline = t.requireOnlinePayment === true || searchParams.get("requireOnlinePayment") === "true";
      setTenantInfo({ mpActive, requireOnline });
      setMethod(mpActive ? "mercadopago" : "venue");
    }).catch(() => setTenantInfo({ mpActive: true, requireOnline: false }));
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const uid = (profile as any)?.uid;
    if (!uid) return;
    getDocs(query(collection(db, "bookings"), where("userId", "==", uid))).then(snap => {
      setHasCashNoShow(snap.docs.some(d => {
        const b: any = d.data();
        const noShow = b.status === "no-show" || b.paymentStatus === "no-show" || b.noShow === true;
        return noShow && (b.paymentMethod === "cash" || b.paymentMethod === "venue");
      }));
    }).catch(() => undefined);
  }, [profile]);

  const venueAllowed = !isTournament && !hasCashNoShow && !tenantInfo?.requireOnline;
  const mpAllowed = isTournament || tenantInfo?.mpActive !== false;

  // Reserva con pago en el recinto: queda pendiente y se cobra al llegar
  const confirmVenueBooking = async () => {
    const userProfile = profile as any;
    // El horario puede haberse tomado mientras el jugador elegía
    const slot = await getDoc(doc(db, "court_slots", `${courtId}_${date}`)).catch(() => null);
    if ((slot?.data() as any)?.taken?.[startTime as string]) throw new Error("Ese horario acaba de ser reservado. Elige otro.");
    const [sh, sm] = String(startTime).split(":").map(Number);
    const when = new Date(`${date}T00:00:00`);
    when.setHours(sh, sm || 0, 0, 0);
    if (sh < 6) when.setDate(when.getDate() + 1);
    const total = Math.max(0, Math.round(finalPrice));
    const id = await bookingService.createBooking({
      userId: userProfile.uid, tenantId: tenantId as string, tenantName: tenantName || "Recinto",
      courtId: courtId as string, courtName: courtName || "Cancha", sport: sport || "futbol",
      clientName: userProfile.displayName || userProfile.fullName || "Jugador MVP", clientPhone: userProfile.phone || "",
      date: Timestamp.fromDate(when), startTime: startTime as string,
      endTime: `${String((sh + 1) % 24).padStart(2, "0")}:${String(sm || 0).padStart(2, "0")}`,
      price: total, totalPrice: total, originalPrice: Number(price), couponCode: appliedCoupon?.code || null,
      discountApplied: appliedCoupon?.discount || 0, status: "confirmed", paymentStatus: "pending", paymentMethod: "cash",
      createdBy: userProfile.email || userProfile.uid, ...(selectedTeamId ? { teamId: selectedTeamId } : {}),
    } as any);

    // Reserva recurrente: misma cancha, día y hora las semanas siguientes (sin cupón; se saltan las ocupadas)
    let created = 1;
    const skipped: string[] = [];
    for (let k = 1; k < repeatWeeks; k++) {
      const d = new Date(`${date}T12:00:00`);
      d.setDate(d.getDate() + 7 * k);
      const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const s2 = await getDoc(doc(db, "court_slots", `${courtId}_${dayStr}`)).catch(() => null);
      if ((s2?.data() as any)?.taken?.[startTime as string]) { skipped.push(dayStr); continue; }
      const w2 = new Date(`${dayStr}T00:00:00`);
      w2.setHours(sh, sm || 0, 0, 0);
      if (sh < 6) w2.setDate(w2.getDate() + 1);
      const base = Math.max(0, Math.round(Number(price)));
      await bookingService.createBooking({
        userId: userProfile.uid, tenantId: tenantId as string, tenantName: tenantName || "Recinto",
        courtId: courtId as string, courtName: courtName || "Cancha", sport: sport || "futbol",
        clientName: userProfile.displayName || userProfile.fullName || "Jugador MVP", clientPhone: userProfile.phone || "",
        date: Timestamp.fromDate(w2), startTime: startTime as string,
        endTime: `${String((sh + 1) % 24).padStart(2, "0")}:${String(sm || 0).padStart(2, "0")}`,
        price: base, totalPrice: base, originalPrice: base, status: "confirmed", paymentStatus: "pending", paymentMethod: "cash",
        createdBy: userProfile.email || userProfile.uid, seriesOf: id, ...(selectedTeamId ? { teamId: selectedTeamId } : {}),
      } as any).then(() => { created++; }).catch(() => { skipped.push(dayStr); });
    }
    const q = repeatWeeks > 1 ? `&serie=${created}&de=${repeatWeeks}${skipped.length ? `&saltadas=${encodeURIComponent(skipped.join(","))}` : ""}` : "";
    router.replace(`/player/ticket?bookingId=${id}${q}`);
  };

  const handleConfirm = async () => {
    if (!profile) return;
    setProcessing(true);
    try {
      if (isTournament) {
        if (!tournamentId || !teamId) throw new Error("Datos de inscripción incompletos");
        const reg = await tournamentService.registerTeam(tournamentId, teamId, true);
        if (reg.url) { window.location.href = reg.url; return; }
        router.push(`/player/torneos?registered=${encodeURIComponent(tournamentId)}`);
        return;
      }
      if (!tenantId || !courtId || !date || !startTime || !sport) throw new Error("Datos de reserva incompletos");
      if (method === "venue") { await confirmVenueBooking(); return; }
      const res = await walletService.createMercadoPagoBooking({
        tenantId, courtId, sport, date, startTime,
        couponCode: appliedCoupon?.code || undefined,
        teamId: selectedTeamId || undefined,
      });
      if (!res?.url) throw new Error("No se recibió URL de pago");
      window.location.href = res.url;
    } catch (error: any) {
      setCustomAlert({ visible: true, title: "Error de Pago", message: error.message || "Error al procesar.", type: "error" });
      setProcessing(false);
    }
  };

  const discountAmount = appliedCoupon ? (Number(price) * appliedCoupon.discount / 100) : 0;
  const finalPrice = Number(price) - discountAmount;

  // Sin datos de reserva (enlace incompleto o acceso directo): no mostrar un checkout vacío
  const missingData = isTournament ? !tournamentId || !teamId : !tenantId || !courtId || !date || !startTime || !price;
  if (missingData) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center ${isDark ? "bg-[#020611] text-slate-200" : "bg-[#F8FAFC] text-slate-900"}`}>
        <XCircle size={36} className="text-amber-500" />
        <p className="font-bold uppercase tracking-wide text-[13px]">Nada que pagar</p>
        <p className="text-[11px] text-slate-400 max-w-xs">Elige un recinto, cancha y horario para iniciar una reserva.</p>
        <button onClick={() => router.replace("/player/clubes")} className="mt-2 px-5 py-3 rounded-md bg-emerald-500 text-white text-[11px] font-semibold uppercase tracking-wide">Buscar recintos</button>
      </div>
    );
  }
  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <button aria-label="Volver" onClick={() => router.back()} className={`w-10 h-10 rounded-md flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/6 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-heading font-black text-[15px] tracking-tight uppercase flex-1 text-center">{isTournament ? "Inscripción" : "Checkout"}</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-3 pb-32 space-y-4">
        <SectionPill label={isTournament ? "Torneo" : "Reserva"} />
        <GlowCard isDark={isDark}>
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${activeColor}18` }}>
                {isTournament ? <Trophy size={22} style={{ color: activeColor }} /> : <Calendar size={22} style={{ color: activeColor }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {isTournament ? (tournamentName || "").toUpperCase() : (tenantName || "").toUpperCase()}
                </p>
                <p className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {isTournament ? `${sport || ""}` : `${sport || ""} • ${(courtName || "").toUpperCase()}`}
                </p>
              </div>
            </div>
            <div className={`h-px ${isDark ? "bg-white/6" : "bg-slate-100"}`} />
            {isTournament ? (
              <div className="space-y-3">
                {[{ icon: Users, label: "Equipo", val: (teamName || "").toUpperCase() }, { icon: Trophy, label: "Modalidad", val: (tournamentType || "LIGA").toUpperCase() }, { icon: MapPin, label: "Recinto", val: (venueName || "POR CONFIRMAR").toUpperCase() }].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <r.icon size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>{r.label}</span>
                    </div>
                    <span className={`text-[11px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{r.val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>Fecha</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{date ? new Date(date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long" }) : ""}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>Horario</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{startTime} HRS</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MapPin size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>Recinto</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{tenantName || ""}</span>
                </div>
              </div>
            )}
            <div className={`h-px ${isDark ? "bg-white/6" : "bg-slate-100"}`} />
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>{appliedCoupon ? "Subtotal" : "Total"}</p>
                {appliedCoupon ? (
                  <>
                    <p className={`text-[13px] font-semibold line-through ${isDark ? "text-slate-500" : "text-slate-400"}`}>${formatMoney(Number(price))}</p>
                    <p className="text-[16px] font-bold" style={{ color: activeColor }}>${formatMoney(finalPrice)}</p>
                  </>
                ) : (
                  <p className={`text-[16px] font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>${formatMoney(Number(price))}</p>
                )}
              </div>
              {appliedCoupon && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md" style={{ backgroundColor: `${activeColor}15`, color: activeColor }}>-{appliedCoupon.discount}%</span>}
            </div>
          </div>
        </GlowCard>

        {!showCoupon && !appliedCoupon ? (
          <button onClick={() => setShowCoupon(true)} className="mt-4 mx-1 text-[12px] font-semibold text-emerald-500">¿Tienes un cupón?</button>
        ) : (
          <>
        <SectionPill label="Cupón" />
        <GlowCard isDark={isDark}>
          <div className="p-5">
            <div className="flex items-center gap-2.5">
              <div className={`flex-1 h-12 rounded-md border flex items-center px-4 ${isDark ? "bg-white/4 border-white/6" : "bg-slate-50 border-slate-200"}`}>
                <input className="w-full bg-transparent text-[11px] font-medium tracking-wide uppercase outline-hidden" style={{ color: appliedCoupon ? "#10b981" : isDark ? "#F8FAFC" : "#0F172A" }}
                  placeholder="Código" autoFocus={!appliedCoupon} value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} disabled={!!appliedCoupon || validatingCoupon} />
              </div>
              {appliedCoupon ? (
                <button aria-label="Cerrar" onClick={() => setAppliedCoupon(null)} className="w-12 h-12 rounded-md bg-red-500 flex items-center justify-center transition-all active:scale-90"><X size={18} className="text-white" /></button>
              ) : (
                <button onClick={handleApplyCoupon} disabled={validatingCoupon || !couponInput.trim()}
                  className="h-12 px-5 rounded-md flex items-center justify-center text-white font-semibold text-[11px] uppercase tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: validatingCoupon || !couponInput.trim() ? (isDark ? "#1E293B" : "#CBD5E1") : activeColor }}>
                  {validatingCoupon ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Aplicar"}
                </button>
              )}
            </div>
          </div>
        </GlowCard>
          </>
        )}

        {!isTournament && (
          <>
            <SectionPill label="Equipo" />
            <GlowCard isDark={isDark}>
              <div className="p-5 space-y-2.5">
                {[{ id: null, label: "Sin equipo", icon: Users }, ...userTeams.map((t: any) => ({ id: t.id, label: t.name, icon: Trophy }))].map((opt) => (
                  <button key={opt.id || "none"} onClick={() => setSelectedTeamId(opt.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-md border transition-all active:scale-[0.98] ${selectedTeamId === opt.id ? "border-emerald-500 bg-emerald-500/5" : isDark ? "border-white/6 hover:bg-white/2" : "border-slate-200 hover:bg-slate-50"}`}>
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center ${selectedTeamId === opt.id ? "" : isDark ? "bg-white/4" : "bg-slate-100"}`}>
                      <opt.icon size={18} color={selectedTeamId === opt.id ? activeColor : isDark ? "#94A3B8" : "#64748B"} />
                    </div>
                    <span className={`flex-1 text-left text-[13px] font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{opt.label}</span>
                    {selectedTeamId === opt.id && <CheckCircle2 size={18} style={{ color: activeColor }} />}
                  </button>
                ))}
              </div>
            </GlowCard>
          </>
        )}

        <SectionPill label="Pago" />
        <GlowCard isDark={isDark}>
          <div className="p-5 space-y-3">
            {[
              ...(mpAllowed ? [{ id: "mercadopago" as const, name: "Mercado Pago", sub: "Tarjeta de crédito, débito o saldo Mercado Pago", color: "#00B2E3" }] : []),
              ...(venueAllowed ? [{ id: "venue" as const, name: "Pagar en el recinto", sub: "Reserva ahora y paga al llegar a la cancha", color: "#10b981" }] : []),
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-md border transition-all text-left ${
                  method === m.id
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "border-slate-200 dark:border-white/10 hover:border-emerald-500/40"
                }`}
              >
                <div className="w-10 h-10 rounded-md flex items-center justify-center bg-white/10 shrink-0" style={{ backgroundColor: m.color + "1f", color: m.color }}>
                  <CreditCard size={20} />
                </div>
                <div className="flex-1">
                  <p className={`text-[13px] font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{m.name}</p>
                  <p className="text-[11px] font-medium text-slate-400">{m.sub}</p>
                </div>
                <span
                  className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${method === m.id ? "border-emerald-500" : "border-slate-300 dark:border-white/20"}`}
                >
                  {method === m.id && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                </span>
              </button>
            ))}
            {method === "venue" && !isTournament && (
              <div className="pt-1">
                <p className={`text-[12px] font-semibold mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Repetir este horario</p>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 2, 4] as const).map((n) => (
                    <button key={n} type="button" aria-pressed={repeatWeeks === n} onClick={() => setRepeatWeeks(n)}
                      className={`h-10 rounded-md text-[12px] font-semibold transition-all ${repeatWeeks === n ? "bg-emerald-500 text-white" : isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                      {n === 1 ? "Solo esta vez" : `${n} semanas`}
                    </button>
                  ))}
                </div>
                {repeatWeeks > 1 && <p className="text-[11px] text-slate-400 mt-2">Misma cancha, día y hora durante {repeatWeeks} semanas. Las que estén ocupadas se saltan y pagas cada partido en el recinto.</p>}
              </div>
            )}
            {hasCashNoShow && !isTournament && (
              <p className="text-[11px] text-amber-500">Por una inasistencia anterior, este recinto requiere pagar online para reservar.</p>
            )}
            {!mpAllowed && !venueAllowed && (
              <p className="text-[11px] text-rose-500">Este recinto no tiene métodos de pago disponibles para tu cuenta.</p>
            )}
          </div>
        </GlowCard>

        <div className="flex items-center justify-center gap-2 opacity-60 pt-2">
          <ShieldCheck size={14} style={{ color: activeColor }} />
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>Transacción Protegida PCI-DSS</span>
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 p-5 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <button onClick={handleConfirm} disabled={processing || (!isTournament && !mpAllowed && !venueAllowed)}
          className="w-full h-14 rounded-md flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          style={{ backgroundColor: activeColor, boxShadow: `0 4px 20px ${activeColor}40` }}>
          {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CreditCard size={20} className="text-white" /><span className="text-white font-semibold text-[13px] uppercase tracking-wide">{isTournament ? "Pagar Inscripción" : method === "venue" ? "Reservar y pagar en el recinto" : `Pagar $${formatMoney(finalPrice)}`}</span></>}
        </button>
      </div>

      {customAlert.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={() => { setCustomAlert({ ...customAlert, visible: false }); if (customAlert.onClose) customAlert.onClose(); }}>
          <div className={`w-full max-w-sm rounded-md p-6 ${isDark ? "bg-[#0A101D] border border-white/6" : "bg-white border border-slate-200"} text-center`} onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-md flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: (customAlert.type === "success" ? "#10b981" : "#ef4444") + "15" }}>
              {customAlert.type === "success" ? <CheckCircle2 size={32} className="text-emerald-500" /> : <XCircle size={32} className="text-red-500" />}
            </div>
            <p className={`text-[15px] font-semibold mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{customAlert.title}</p>
            <p className={`text-[13px] font-medium mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{customAlert.message}</p>
            <button onClick={() => { setCustomAlert({ ...customAlert, visible: false }); if (customAlert.onClose) customAlert.onClose(); }}
              className="w-full py-3.5 rounded-md font-semibold text-[13px] text-white" style={{ backgroundColor: customAlert.type === "success" ? "#10b981" : "#ef4444" }}>
              {customAlert.type === "success" ? "Entendido" : "Reintentar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
