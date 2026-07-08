"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, CreditCard, ShieldCheck, Zap, Calendar, Clock, Trophy, MapPin, Users, CheckCircle2, XCircle, X } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Timestamp } from "firebase/firestore";
import { walletService } from "@/services/player/walletService";
import { couponService } from "@/services/player/couponService";
import { teamService } from "@/services/player/teamService";

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

const formatMoney = (n: number) => new Intl.NumberFormat("es-CL").format(n);

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, theme } = usePlayer();
  const isDark = theme === "dark";
  const activeColor = searchParams.get("sportColor") || "#10b981";

  const [processing, setProcessing] = useState(false);
  const [customAlert, setCustomAlert] = useState<{ visible: boolean; title: string; message: string; type: "success" | "error"; onClose?: () => void }>({ visible: false, title: "", message: "", type: "success" });
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
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

  const handleConfirm = async () => {
    if (!profile) return;
    setProcessing(true);
    try {
      const basePriceNum = Number(price);
      if (isNaN(basePriceNum) || basePriceNum <= 0) throw new Error("Monto inválido");
      const discountAmount = appliedCoupon ? (basePriceNum * appliedCoupon.discount / 100) : 0;
      const priceNum = basePriceNum - discountAmount;
      const userProfile = profile as any;
      const clientName = userProfile?.displayName || userProfile?.fullName || userProfile?.name || "Jugador MVP";
      const uid = userProfile?.uid;

      if (isTournament) {
        if (!tournamentId || !teamId) throw new Error("Datos incompletos");
        const buyOrder = `TOR-${Date.now()}`;
        const returnUrl = `https://mvpsports.cl/player/torneos`;
        const res = await walletService.createWebpayTransaction(tournamentId, tenantId || "system", priceNum, buyOrder, undefined, returnUrl);
        if (!res?.url) throw new Error("No se recibió URL de pago");
        const form = document.createElement("form");
        form.method = "POST";
        form.action = res.url;
        form.style.display = "none";
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "token_ws";
        input.value = res.token;
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
      } else {
        const [sh, sm] = (startTime || "00:00").split(":").map(Number);
        const endH = sh + 1;
        const bookingDate = new Date(`${date}T00:00:00`);
        bookingDate.setHours(sh, sm || 0, 0, 0);
        if (sh < 6) bookingDate.setDate(bookingDate.getDate() + 1);

        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let id = bookingId || "";
        if (!id) { for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length)); }
        const buyOrder = `ORD-${Date.now()}`;
        const returnUrl = `https://mvpsports.cl/player/ticket?bookingId=${id}&sport=${sport || ""}&sportColor=${encodeURIComponent(sportColor || "")}&tenantName=${encodeURIComponent((tenantName || "").toUpperCase())}&courtName=${encodeURIComponent((courtName || "").toUpperCase())}&startTime=${startTime || ""}&date=${date || ""}&price=${priceNum}`;
        const bookingData = {
          userId: uid, tenantId: tenantId || "", tenantName: tenantName || "Recinto",
          courtId: courtId || "", courtName: courtName || "Cancha", clientName, clientPhone: userProfile?.phone || "+56900000000",
          date: Timestamp.fromDate(bookingDate), startTime: startTime || "",
          endTime: `${endH.toString().padStart(2, "0")}:${(sm || 0).toString().padStart(2, "0")}`,
          totalPrice: priceNum, originalPrice: basePriceNum,
          couponCode: appliedCoupon?.code || null, discountApplied: appliedCoupon?.discount || 0,
          status: "confirmed", paymentStatus: "pending", source: "web_app",
          createdBy: userProfile?.email || uid,
          sport: sport || "futbol", createdAt: Timestamp.now(),
          ...(selectedTeamId ? { teamId: selectedTeamId } : {}),
        };
        const res = await walletService.createWebpayTransaction(id, tenantId || "", priceNum, buyOrder, bookingData, returnUrl);
        if (!res?.url) throw new Error("No se recibió URL de pago");
        const form = document.createElement("form");
        form.method = "POST";
        form.action = res.url;
        form.style.display = "none";
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "token_ws";
        input.value = res.token;
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
      }
    } catch (error: any) {
      setCustomAlert({ visible: true, title: "Error de Pago", message: error.message || "Error al procesar.", type: "error" });
    } finally { setProcessing(false); }
  };

  const discountAmount = appliedCoupon ? (Number(price) * appliedCoupon.discount / 100) : 0;
  const finalPrice = Number(price) - discountAmount;

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <button onClick={() => router.back()} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center">{isTournament ? "Inscripción" : "Checkout"}</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-3 pb-32 space-y-4">
        <SectionPill label={isTournament ? "Torneo" : "Reserva"} />
        <GlowCard isDark={isDark}>
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${activeColor}18` }}>
                {isTournament ? <Trophy size={22} style={{ color: activeColor }} /> : <Calendar size={22} style={{ color: activeColor }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-base font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {isTournament ? (tournamentName || "").toUpperCase() : (tenantName || "").toUpperCase()}
                </p>
                <p className={`text-[10px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {isTournament ? `${sport || ""}` : `${sport || ""} • ${(courtName || "").toUpperCase()}`}
                </p>
              </div>
            </div>
            <div className={`h-px ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} />
            {isTournament ? (
              <div className="space-y-3">
                {[{ icon: Users, label: "Equipo", val: (teamName || "").toUpperCase() }, { icon: Trophy, label: "Modalidad", val: (tournamentType || "LIGA").toUpperCase() }, { icon: MapPin, label: "Recinto", val: (venueName || "POR CONFIRMAR").toUpperCase() }].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <r.icon size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>{r.label}</span>
                    </div>
                    <span className={`text-xs font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{r.val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Fecha</span>
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{date ? new Date(date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long" }) : ""}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Horario</span>
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{startTime} HRS</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MapPin size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Recinto</span>
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{tenantName || ""}</span>
                </div>
              </div>
            )}
            <div className={`h-px ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} />
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>{appliedCoupon ? "Subtotal" : "Total"}</p>
                {appliedCoupon ? (
                  <>
                    <p className={`text-sm font-semibold line-through ${isDark ? "text-slate-500" : "text-slate-400"}`}>${formatMoney(Number(price))}</p>
                    <p className="text-lg font-bold" style={{ color: activeColor }}>${formatMoney(finalPrice)}</p>
                  </>
                ) : (
                  <p className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>${formatMoney(Number(price))}</p>
                )}
              </div>
              {appliedCoupon && <span className="text-[9px] font-semibold px-2.5 py-1 rounded-[14px]" style={{ backgroundColor: `${activeColor}15`, color: activeColor }}>-{appliedCoupon.discount}%</span>}
            </div>
          </div>
        </GlowCard>

        <SectionPill label="Código Promocional" />
        <GlowCard isDark={isDark}>
          <div className="p-5">
            <div className="flex items-center gap-2.5">
              <div className={`flex-1 h-12 rounded-[14px] border flex items-center px-4 ${isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                <input className="w-full bg-transparent text-xs font-medium tracking-wider uppercase outline-none" style={{ color: appliedCoupon ? "#10b981" : isDark ? "#F8FAFC" : "#0F172A" }}
                  placeholder="Código" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} disabled={!!appliedCoupon || validatingCoupon} />
              </div>
              {appliedCoupon ? (
                <button onClick={() => setAppliedCoupon(null)} className="w-12 h-12 rounded-[14px] bg-red-500 flex items-center justify-center transition-all active:scale-90"><X size={18} className="text-white" /></button>
              ) : (
                <button onClick={handleApplyCoupon} disabled={validatingCoupon || !couponInput.trim()}
                  className="h-12 px-5 rounded-[14px] flex items-center justify-center text-white font-semibold text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: validatingCoupon || !couponInput.trim() ? (isDark ? "#1E293B" : "#CBD5E1") : activeColor }}>
                  {validatingCoupon ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Aplicar"}
                </button>
              )}
            </div>
          </div>
        </GlowCard>

        {!isTournament && (
          <>
            <SectionPill label="Equipo" />
            <GlowCard isDark={isDark}>
              <div className="p-5 space-y-2.5">
                {[{ id: null, label: "Sin equipo", icon: Users }, ...userTeams.map((t: any) => ({ id: t.id, label: t.name, icon: Trophy }))].map((opt) => (
                  <button key={opt.id || "none"} onClick={() => setSelectedTeamId(opt.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-[14px] border transition-all active:scale-[0.98] ${selectedTeamId === opt.id ? "border-emerald-500 bg-emerald-500/5" : isDark ? "border-white/[0.06] hover:bg-white/[0.02]" : "border-slate-200 hover:bg-slate-50"}`}>
                    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center ${selectedTeamId === opt.id ? "" : isDark ? "bg-white/[0.04]" : "bg-slate-100"}`}>
                      <opt.icon size={18} color={selectedTeamId === opt.id ? activeColor : isDark ? "#94A3B8" : "#64748B"} />
                    </div>
                    <span className={`flex-1 text-left text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{opt.label}</span>
                    {selectedTeamId === opt.id && <CheckCircle2 size={18} style={{ color: activeColor }} />}
                  </button>
                ))}
              </div>
            </GlowCard>
          </>
        )}

        <SectionPill label="Pago" />
        <GlowCard isDark={isDark}>
          <div className="p-5">
            <div className="flex items-center gap-4 p-4 rounded-[14px] border border-emerald-500 bg-emerald-500/5">
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-emerald-500/10">
                <CreditCard size={20} className="text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>Pago Online</p>
                <p className="text-[9px] font-medium text-emerald-500">Webpay Plus</p>
              </div>
              <ShieldCheck size={18} className="text-emerald-500" />
            </div>
          </div>
        </GlowCard>

        <div className="flex items-center justify-center gap-2 opacity-60 pt-2">
          <ShieldCheck size={14} style={{ color: activeColor }} />
          <span className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Transacción Protegida PCI-DSS</span>
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 p-5 lg:pl-72 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <button onClick={handleConfirm} disabled={processing}
          className="w-full h-14 rounded-[14px] flex items-center justify-center gap-3 shadow-lg transition-all active:scale-[0.98]"
          style={{ backgroundColor: activeColor, boxShadow: `0 4px 20px ${activeColor}40` }}>
          {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CreditCard size={20} className="text-white" /><span className="text-white font-semibold text-sm uppercase tracking-wider">{isTournament ? "Pagar Inscripción" : `Pagar $${formatMoney(finalPrice)}`}</span></>}
        </button>
      </div>

      {customAlert.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6" onClick={() => { setCustomAlert({ ...customAlert, visible: false }); if (customAlert.onClose) customAlert.onClose(); }}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 ${isDark ? "bg-[#0F172A] border border-white/[0.06]" : "bg-white border border-slate-200"} shadow-2xl text-center`} onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-[14px] flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: (customAlert.type === "success" ? "#10b981" : "#ef4444") + "15" }}>
              {customAlert.type === "success" ? <CheckCircle2 size={32} className="text-emerald-500" /> : <XCircle size={32} className="text-red-500" />}
            </div>
            <p className={`text-base font-semibold mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{customAlert.title}</p>
            <p className={`text-sm font-medium mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{customAlert.message}</p>
            <button onClick={() => { setCustomAlert({ ...customAlert, visible: false }); if (customAlert.onClose) customAlert.onClose(); }}
              className="w-full py-3.5 rounded-[14px] font-semibold text-sm text-white" style={{ backgroundColor: customAlert.type === "success" ? "#10b981" : "#ef4444" }}>
              {customAlert.type === "success" ? "Entendido" : "Reintentar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
