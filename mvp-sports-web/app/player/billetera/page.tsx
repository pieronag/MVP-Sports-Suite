"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShieldCheck, Clock, CreditCard, Landmark, MapPin } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { bookingService, Booking } from "@/services/player/bookingService";
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from "@/services/firebase";

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
    <div className="flex items-center gap-3 px-6 mb-4 mt-8">
      <div className="h-[3px] w-6 rounded-full bg-emerald-500/60" />
      <span className="text-emerald-400 font-semibold text-[10px] tracking-[3px] uppercase">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
    </div>
  );
}

const formatMoney = (n: number) => '$' + new Intl.NumberFormat('es-CL').format(n);

const formatDate = (d: any) => {
  if (!d) return 'Reciente';
  const t = d?.seconds ? d.seconds * 1000 : new Date(d).getTime();
  return new Date(t).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
};

export default function BilleteraPage() {
  const router = useRouter();
  const { profile, theme } = usePlayer();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<(Booking & { amount: number })[]>([]);

  const onlineMethods = ['card', 'webpay', 'online', 'webpay_plus', 'oneclick'];

  useEffect(() => {
    const loadData = async () => {
      const uid = (profile as any)?.uid || (profile as any)?.userId;
      if (!uid) { setLoading(false); return; }
      setLoading(true);
      try {
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('userId', '==', uid), where('paymentStatus', 'in', ['paid', 'refunded']), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data(), amount: d.data().totalPrice || 0 })) as (Booking & { amount: number })[];
        setBookings(data);
      } catch {
        try {
          const fallback = await bookingService.getUserBookings(uid);
          const filtered = fallback.filter(b => b.paymentStatus === 'paid' || b.paymentStatus === 'refunded').map(b => ({ ...b, amount: b.totalPrice || 0 })).sort((a, b) => ((b.date as any)?.seconds || 0) - ((a.date as any)?.seconds || 0));
          setBookings(filtered.slice(0, 50));
        } catch {}
      } finally { setLoading(false); }
    };
    loadData();
  }, [profile]);

  const onlinePayments = bookings.filter(b => onlineMethods.includes(b.paymentMethod || ''));
  const venuePayments = bookings.filter(b => !onlineMethods.includes(b.paymentMethod || ''));
  const totalOnline = onlinePayments.reduce((s, b) => s + b.amount, 0);
  const totalVenue = venuePayments.reduce((s, b) => s + b.amount, 0);

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-emerald-400 text-[10px] font-semibold tracking-[3px] uppercase animate-pulse">Cargando</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <button onClick={() => router.back()} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center">Pagos</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 mt-3 space-y-4 pb-8">
        <GlowCard isDark={isDark}>
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Estado de Cuenta</p>
              <p className={`text-xl font-semibold tracking-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}>Activa</p>
              <p className="text-emerald-500 text-[10px] font-medium mt-0.5">Historial verificado</p>
            </div>
            <div className="w-14 h-14 rounded-[14px] flex items-center justify-center bg-emerald-500/10">
              <ShieldCheck size={28} className="text-emerald-500" />
            </div>
          </div>
        </GlowCard>

        <div className="flex gap-3">
          <GlowCard isDark={isDark} className="flex-1">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-[14px] flex items-center justify-center bg-emerald-500/10"><CreditCard size={14} className="text-emerald-500" /></div>
                <span className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Online</span>
              </div>
              <p className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{formatMoney(totalOnline)}</p>
              <p className={`text-[7px] font-medium mt-0.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>TOTAL TRANSACCIONADO</p>
            </div>
          </GlowCard>
          <GlowCard isDark={isDark} className="flex-1">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-[14px] flex items-center justify-center bg-blue-500/10"><MapPin size={14} className="text-blue-500" /></div>
                <span className={`text-[8px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Recinto</span>
              </div>
              <p className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{formatMoney(totalVenue)}</p>
              <p className={`text-[7px] font-medium mt-0.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>TOTAL POR RENDIR</p>
            </div>
          </GlowCard>
        </div>

        <SectionPill label="Movimientos" />
        <GlowCard isDark={isDark}>
          {bookings.length > 0 ? (
            <div className="divide-y divide-emerald-500/5">
              {bookings.map((b) => {
                const isOnline = onlineMethods.includes(b.paymentMethod || '');
                const isNoShow = b.status === 'no-show' || b.paymentStatus === 'no-show' || b.noShow === true;
                const badgeColor = isNoShow ? '#f43f5e' : isOnline ? '#10b981' : '#3b82f6';
                const badgeBg = isNoShow ? '#f43f5e15' : isOnline ? '#10b98115' : '#3b82f615';
                const badgeLabel = isNoShow ? 'RETENIDO' : isOnline ? 'ONLINE' : 'RECINTO';
                return (
                  <div key={b.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: badgeBg }}>
                      {isNoShow || isOnline ? <CreditCard size={18} style={{ color: badgeColor }} /> : <Landmark size={18} style={{ color: badgeColor }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{b.tenantName || 'Reserva'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{formatDate(b.date)}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-slate-500/40" />
                        <span className="text-[7px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: badgeBg, color: badgeColor }}>{badgeLabel}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>-{formatMoney(b.amount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center">
              <Clock size={32} strokeWidth={1.5} className={`${isDark ? "text-slate-600" : "text-slate-300"}`} />
              <p className={`text-sm font-medium mt-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Sin movimientos</p>
            </div>
          )}
        </GlowCard>

        <p className={`text-center text-[8px] font-medium pt-4 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>
      </div>
    </div>
  );
}
