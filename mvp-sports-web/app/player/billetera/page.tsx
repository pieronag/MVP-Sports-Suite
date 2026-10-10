"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, CreditCard, CheckCircle2, Receipt } from "@/components/player/icons";
import { usePlayer } from "@/context/PlayerContext";
import { bookingService, Booking } from "@/services/player/bookingService";

const formatMoney = (n: number) => "$" + new Intl.NumberFormat("es-CL").format(Math.round(n || 0));
const ONLINE = ["card", "mercadopago", "online", "webpay", "webpay_plus", "oneclick"];

// Inicio del partido (fecha Timestamp o "YYYY-MM-DD" + hora; bloques antes de las 06:00 son del día siguiente)
const startOf = (b: any): Date | null => {
  const r = b?.date;
  const d = r?.toDate ? r.toDate() : r?.seconds ? new Date(r.seconds * 1000) : /^\d{4}-\d{2}-\d{2}$/.test(String(r)) ? new Date(`${r}T12:00:00`) : r ? new Date(r) : null;
  if (!d || isNaN(d.getTime())) return null;
  const [h, m] = String(b?.startTime || "00:00").split(":").map(Number);
  const o = new Date(d); o.setHours(h || 0, m || 0, 0, 0); if ((h || 0) < 6) o.setDate(o.getDate() + 1);
  return o;
};

export default function BilleteraPage() {
  const router = useRouter();
  const { profile, theme } = usePlayer();
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const uid = (profile as any)?.uid;
    if (!uid) return;
    bookingService.getUserBookings(uid).then(setBookings).catch(() => setBookings([])).finally(() => setLoading(false));
  }, [(profile as any)?.uid]);

  const data = useMemo(() => {
    const now = Date.now();
    const year = new Date().getFullYear();
    const rows = (bookings as any[]).map((b) => ({ b, st: startOf(b), amount: Number(b.totalPrice || b.price || 0) }));
    const due = rows
      .filter((x) => x.b.status !== "cancelled" && x.b.paymentStatus === "pending" && !x.b.isInternalMatch && x.st && x.st.getTime() > now - 60 * 60_000)
      .sort((a, b) => a.st!.getTime() - b.st!.getTime());
    const moves = rows
      .filter((x) => x.b.paymentStatus === "paid" || x.b.paymentStatus === "refunded" || x.b.paymentStatus === "refund_failed")
      .sort((a, b) => (b.st?.getTime() || 0) - (a.st?.getTime() || 0));
    const paidYear = moves.filter((x) => x.b.paymentStatus === "paid" && x.st && x.st.getFullYear() === year).reduce((s, x) => s + x.amount, 0);
    return { due, dueTotal: due.reduce((s, x) => s + x.amount, 0), moves, paidYear };
  }, [bookings]);

  const card = isDark ? "bg-[#0A101D] border border-white/[0.06]" : "bg-white border border-slate-200";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const strong = isDark ? "text-slate-100" : "text-slate-900";

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center gap-3 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <button aria-label="Volver" onClick={() => router.back()} className={`w-10 h-10 rounded-md flex items-center justify-center ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-heading font-black text-[15px] tracking-tight uppercase flex-1 text-center">Pagos</h1>
        <div className="w-10" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="px-5 space-y-4 pb-8">
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`rounded-md ${card} p-4`}>
              <Clock size={18} color="#f59e0b" />
              <p className={`text-[18px] font-bold mt-1.5 tabular-nums ${strong}`}>{formatMoney(data.dueTotal)}</p>
              <p className={`text-[12px] ${muted}`}>por pagar en el recinto</p>
            </div>
            <div className={`rounded-md ${card} p-4`}>
              <CheckCircle2 size={18} color="#10b981" />
              <p className={`text-[18px] font-bold mt-1.5 tabular-nums ${strong}`}>{formatMoney(data.paidYear)}</p>
              <p className={`text-[12px] ${muted}`}>pagado en {new Date().getFullYear()}</p>
            </div>
          </div>

          {data.due.length > 0 && (
            <section aria-label="Por pagar">
              <h2 className={`text-[12px] font-semibold mb-2 ${muted}`}>Por pagar al llegar</h2>
              <ul className={`rounded-md ${card} divide-y ${isDark ? "divide-white/[0.06]" : "divide-slate-100"}`}>
                {data.due.map(({ b, st, amount }: any) => (
                  <li key={b.id}>
                    <Link href={`/player/ticket?bookingId=${b.id}`} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold truncate ${strong}`}>{b.tenantName || "Recinto"} · {b.courtName}</p>
                        <p className={`text-[12px] ${muted}`}>{st.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })} · {b.startTime} hrs</p>
                      </div>
                      <span className="text-[13px] font-semibold text-amber-500 tabular-nums">{formatMoney(amount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label="Movimientos">
            <h2 className={`text-[12px] font-semibold mb-2 ${muted}`}>Movimientos</h2>
            {data.moves.length === 0 ? (
              <div className={`rounded-md ${card} py-10 flex flex-col items-center text-center`}>
                <Receipt size={28} className={isDark ? "text-slate-600" : "text-slate-300"} />
                <p className={`text-[13px] mt-2 ${muted}`}>Aún no tienes pagos registrados</p>
              </div>
            ) : (
              <ul className={`rounded-md ${card} divide-y ${isDark ? "divide-white/[0.06]" : "divide-slate-100"}`}>
                {data.moves.map(({ b, st, amount }: any) => {
                  const refund = b.paymentStatus !== "paid";
                  return (
                    <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${refund ? "bg-sky-500/10" : "bg-emerald-500/10"}`}>
                        <CreditCard size={16} color={refund ? "#0ea5e9" : "#10b981"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold truncate ${strong}`}>{b.tenantName || "Recinto"} · {b.courtName}</p>
                        <p className={`text-[12px] ${muted}`}>
                          {st ? st.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }) : ""} · {ONLINE.includes(b.paymentMethod) ? "Online" : "En el recinto"}
                          {b.paymentStatus === "refunded" ? " · Reembolsado" : b.paymentStatus === "refund_failed" ? " · Reembolso pendiente" : ""}
                        </p>
                      </div>
                      <span className={`text-[13px] font-semibold tabular-nums ${refund ? "text-sky-500" : strong}`}>{refund ? "+" : ""}{formatMoney(refund ? b.refundAmount || 0 : amount)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
