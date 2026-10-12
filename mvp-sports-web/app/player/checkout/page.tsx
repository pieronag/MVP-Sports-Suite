"use client";
import { GlowCard, SectionPill } from "@/components/player/ui";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, CreditCard, ShieldCheck, Zap, Calendar, Clock, Trophy, MapPin, Users, CheckCircle2, XCircle, X } from "@/components/player/icons";
import { usePlayer } from "@/context/PlayerContext";
import { Timestamp } from "firebase/firestore";
import { walletService } from "@/services/client/player/walletService";
import { couponService } from "@/services/client/player/couponService";
import { tournamentService } from "@/services/client/player/tournamentService";
import { teamService } from "@/services/client/player/teamService";
import { bookingService } from "@/services/client/player/bookingService";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/services/client/firebase";
import { priceFromTenantConfig } from "@/utils/pricing";
import CardPayment from "@/components/player/CardPayment";



const formatMoney = (n: number) => new Intl.NumberFormat("es-CL").format(n);

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, theme } = usePlayer();
  const isDark = theme === "dark";
  const activeColor = searchParams.get("sportColor") || "#10b981";

  // Solo pago online con Mercado Pago
  const [tenantInfo, setTenantInfo] = useState<{ mpActive: boolean; requireOnline: boolean } | null>(null);
  const [customAlert, setCustomAlert] = useState<{ visible: boolean; title: string; message: string; type: "success" | "error"; onClose?: () => void }>({ visible: false, title: "", message: "", type: "success" });
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const tenantId = searchParams.get("tenantId");
  const tenantName = searchParams.get("tenantName");
  const courtName = searchParams.get("courtName");
  // El precio de la cancha sale de la tarifa del recinto (no de la URL, que se puede editar)
  const [tenantPrice, setTenantPrice] = useState<number | null>(null);
  const price = tenantPrice !== null ? String(tenantPrice) : searchParams.get("price");
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
      setCustomAlert({ visible: true, title: "Cupón aplicado", message: `Descuento del ${coupon.discount}% aplicado.`, type: "success" });
    } catch (error: any) {
      setAppliedCoupon(null);
      setCustomAlert({ visible: true, title: "Cupón inválido", message: error.message, type: "error" });
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
      if (!isTournament && sport && date && startTime) {
        const p = priceFromTenantConfig(t, sport, date, startTime);
        if (p > 0) setTenantPrice(p);
      }
    }).catch(() => setTenantInfo({ mpActive: true, requireOnline: false }));
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const mpAllowed = isTournament || tenantInfo?.mpActive !== false;

  // Pago con tarjeta (Brick): el servidor calcula el monto y confirma la reserva o inscripción
  const payWithCard = async (card: any, saveCard: boolean) => {
    if (isTournament) {
      if (!tournamentId || !teamId) throw new Error("Datos de inscripción incompletos");
      return tournamentService.registerTeam(tournamentId, teamId, true, card, saveCard);
    }
    if (!tenantId || !courtId || !date || !startTime || !sport) throw new Error("Datos de reserva incompletos");
    return walletService.payBookingWithCard({
      tenantId, courtId, sport, date, startTime,
      couponCode: appliedCoupon?.code || undefined,
      teamId: selectedTeamId || undefined,
    }, card, saveCard);
  };
  const onCardApproved = (returnUrl?: string) => {
    if (isTournament) { router.push(`/player/torneos?registered=${encodeURIComponent(tournamentId || "")}`); return; }
    if (returnUrl) { try { const u = new URL(returnUrl); router.replace(u.pathname + u.search); return; } catch { /* sigue */ } }
    router.replace("/player/reservas");
  };

  const discountAmount = appliedCoupon ? (Number(price) * appliedCoupon.discount / 100) : 0;
  const finalPrice = Number(price) - discountAmount;

  // Sin datos de reserva (enlace incompleto o acceso directo): no mostrar un checkout vacío
  const missingData = isTournament ? !tournamentId || !teamId : !tenantId || !courtId || !date || !startTime || !price;
  if (missingData) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center ${isDark ? "bg-[#020611] text-slate-200" : "bg-[#F8FAFC] text-slate-900"}`}>
        <XCircle size={36} className="text-amber-500" />
        <p className="font-bold text-[13px]">Nada que pagar</p>
        <p className="text-[11px] text-slate-400 max-w-xs">Elige un recinto, cancha y horario para iniciar una reserva.</p>
        <button onClick={() => router.replace("/player/clubes")} className="mt-2 px-5 py-3 rounded-md bg-emerald-500 text-white text-[12px] font-semibold">Buscar recintos</button>
      </div>
    );
  }
  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <button aria-label="Volver" onClick={() => router.back()} className={`w-10 h-10 rounded-md flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/6 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-heading font-black text-[18px] tracking-tight flex-1 text-center">{isTournament ? "Inscripción" : "Checkout"}</h1>
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
                  {isTournament ? tournamentName || "" : tenantName || ""}
                </p>
                <p className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {isTournament ? `${sport || ""}` : `${sport || ""} • ${courtName || ""}`}
                </p>
              </div>
            </div>
            <div className={`h-px ${isDark ? "bg-white/6" : "bg-slate-100"}`} />
            {isTournament ? (
              <div className="space-y-3">
                {[{ icon: Users, label: "Equipo", val: teamName || "" }, { icon: Trophy, label: "Modalidad", val: (tournamentType || "LIGA").toUpperCase() }, { icon: MapPin, label: "Recinto", val: (venueName || "Por confirmar").toUpperCase() }].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <r.icon size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                      <span className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>{r.label}</span>
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
                    <span className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Fecha</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{date ? new Date(date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long" }) : ""}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                    <span className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Horario</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{startTime} HRS</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MapPin size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                    <span className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Recinto</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{tenantName || ""}</span>
                </div>
              </div>
            )}
            <div className={`h-px ${isDark ? "bg-white/6" : "bg-slate-100"}`} />
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>{appliedCoupon ? "Subtotal" : "Total"}</p>
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
                <input className="w-full bg-transparent text-[12px] font-medium outline-hidden" style={{ color: appliedCoupon ? "#10b981" : isDark ? "#F8FAFC" : "#0F172A" }}
                  placeholder="Código" autoFocus={!appliedCoupon} value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} disabled={!!appliedCoupon || validatingCoupon} />
              </div>
              {appliedCoupon ? (
                <button aria-label="Cerrar" onClick={() => setAppliedCoupon(null)} className="w-12 h-12 rounded-md bg-red-500 flex items-center justify-center transition-all active:scale-90"><X size={18} className="text-white" /></button>
              ) : (
                <button onClick={handleApplyCoupon} disabled={validatingCoupon || !couponInput.trim()}
                  className="h-12 px-5 rounded-md flex items-center justify-center text-white font-semibold text-[12px] transition-all active:scale-[0.98] disabled:opacity-50"
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
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: "#00B2E31f", color: "#00B2E3" }}>
                <CreditCard size={20} />
              </div>
              <div className="flex-1">
                <p className={`text-[13px] font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>Tarjeta</p>
                <p className="text-[11px] font-medium text-slate-400">Crédito, débito o prepago · sin salir de la app</p>
              </div>
            </div>
            {mpAllowed && (isTournament || tenantId) ? (
              <div className="pt-1">
                <CardPayment tenantId={(tenantId || searchParams.get("tenantId") || "") as string} amount={Math.max(1, Math.round(finalPrice))} isDark={isDark} onPay={payWithCard} onApproved={onCardApproved} />
              </div>
            ) : (
              <p className="text-[11px] text-rose-500">Este recinto aún no tiene pagos online habilitados.</p>
            )}
          </div>
        </GlowCard>

        <div className="flex items-center justify-center gap-2 opacity-60 pt-2">
          <ShieldCheck size={14} style={{ color: activeColor }} />
          <span className={`text-[12px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Transacción protegida PCI-DSS</span>
        </div>
      </div>

      {customAlert.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] px-5 py-6 animate-in fade-in duration-200" onClick={() => { setCustomAlert({ ...customAlert, visible: false }); if (customAlert.onClose) customAlert.onClose(); }}>
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
