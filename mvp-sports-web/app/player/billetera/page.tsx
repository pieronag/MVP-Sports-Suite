"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShieldCheck, Clock, CreditCard, Landmark, MapPin, Plus, Trash2, Star, Pencil, CheckCircle2, XCircle, X } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { bookingService, Booking } from "@/services/player/bookingService";
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from "@/services/firebase";
import { walletService, PaymentCard } from "@/services/player/walletService";

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

function CardBrandIcon({ brand }: { brand: string }) {
  const colors: Record<string, string> = { Visa: "#1a1f71", Mastercard: "#eb001b", Amex: "#2e77bc", Discover: "#ff6000" };
  return (
    <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: (colors[brand] || "#64748b") + "15" }}>
      <CreditCard size={18} style={{ color: colors[brand] || "#64748b" }} />
    </div>
  );
}

const brandColors: Record<string, string> = { Visa: "#1a1f71", Mastercard: "#eb001b", Amex: "#2e77bc", Discover: "#ff6000" };
const brandGradients: Record<string, string> = {
  Visa: "from-blue-900 via-blue-800 to-indigo-900",
  Mastercard: "from-orange-600 via-red-600 to-yellow-700",
  Amex: "from-blue-700 via-blue-600 to-indigo-800",
  Discover: "from-orange-500 via-red-500 to-amber-600",
};
const defaultGradient = "from-slate-800 via-slate-700 to-slate-900";

function detectCardBrand(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, "");
  if (/^4/.test(cleaned)) return "Visa";
  if (/^5[1-5]/.test(cleaned)) return "Mastercard";
  if (/^3[47]/.test(cleaned)) return "Amex";
  if (/^6(?:011|5)/.test(cleaned)) return "Discover";
  return "";
}

function formatCardNumber(value: string): string {
  const v = value.replace(/\D/g, "").slice(0, 16);
  return v.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export default function BilleteraPage() {
  const router = useRouter();
  const { profile, theme } = usePlayer();
  const isDark = theme === "dark";
  const uid = (profile as any)?.uid || (profile as any)?.userId;

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<(Booking & { amount: number })[]>([]);
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ cardNumber: "", expiry: "", cvv: "", holderName: "" });
  const [editForm, setEditForm] = useState({ holderName: "", expiryMonth: "", expiryYear: "" });
  const [processing, setProcessing] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: "success" | "error" } | null>(null);

  const loadCards = async () => {
    if (!uid) return;
    const userCards = await walletService.getCards(uid);
    setCards(userCards);
  };

  useEffect(() => {
    const loadData = async () => {
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
      }
      await loadCards();
      setLoading(false);
    };
    loadData();
  }, [profile]);

  const handleAddCard = async () => {
    if (!uid) return;
    setProcessing(true);
    const parts = addForm.expiry.replace(/[\s/]/g, "").match(/^(\d{2})(\d{2})$/);
    if (!parts) {
      setAlert({ visible: true, title: "Error", message: "Formato de vencimiento inválido. Usa MM/AA.", type: "error" });
      setProcessing(false);
      return;
    }
    const payload = {
      cardNumber: addForm.cardNumber,
      expiryMonth: parts[1],
      expiryYear: "20" + parts[2],
      cvv: addForm.cvv,
      holderName: addForm.holderName,
    };
    const result = await walletService.addCard(uid, payload);
    if (result.success) {
      setAlert({ visible: true, title: "Tarjeta Agregada", message: "La tarjeta se vinculó correctamente.", type: "success" });
      setShowAddCard(false);
      setAddForm({ cardNumber: "", expiry: "", cvv: "", holderName: "" });
      await loadCards();
    } else {
      setAlert({ visible: true, title: "Error", message: result.error || "No se pudo agregar la tarjeta.", type: "error" });
    }
    setProcessing(false);
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!uid) return;
    setProcessing(true);
    try {
      await walletService.deleteCard(uid, cardId);
      setAlert({ visible: true, title: "Tarjeta Eliminada", message: "La tarjeta se eliminó correctamente.", type: "success" });
      await loadCards();
    } catch {
      setAlert({ visible: true, title: "Error", message: "No se pudo eliminar la tarjeta.", type: "error" });
    }
    setProcessing(false);
  };

  const handleSetDefault = async (cardId: string) => {
    if (!uid) return;
    setProcessing(true);
    try {
      await walletService.setDefaultCard(uid, cardId);
      setAlert({ visible: true, title: "Tarjeta Predeterminada", message: "Tarjeta actualizada como principal.", type: "success" });
      await loadCards();
    } catch {
      setAlert({ visible: true, title: "Error", message: "No se pudo actualizar.", type: "error" });
    }
    setProcessing(false);
  };

  const openEdit = (card: PaymentCard) => {
    setEditingCard(card.id || null);
    setEditForm({ holderName: card.holderName || "", expiryMonth: card.expiryMonth || "", expiryYear: card.expiryYear || "" });
  };

  const handleEditCard = async () => {
    if (!uid || !editingCard) return;
    setProcessing(true);
    try {
      await walletService.updateCard(uid, editingCard, editForm);
      setAlert({ visible: true, title: "Tarjeta Actualizada", message: "Los cambios se guardaron correctamente.", type: "success" });
      setEditingCard(null);
      await loadCards();
    } catch {
      setAlert({ visible: true, title: "Error", message: "No se pudo actualizar la tarjeta.", type: "error" });
    }
    setProcessing(false);
  };

  const onlineMethods = ['card', 'webpay', 'online', 'webpay_plus', 'oneclick'];
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
        <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center">Billetera</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 mt-3 space-y-4 pb-8">
        {/* Status */}
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

        {/* Summary */}
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

        {/* Cards Section */}
        <SectionPill label="Mis Tarjetas" />
        <GlowCard isDark={isDark}>
          <div className="divide-y divide-emerald-500/5">
            {cards.length > 0 ? cards.map((card) => (
              <div key={card.id} className="px-5 py-4">
                {editingCard === card.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                      <CardBrandIcon brand={card.brand} />
                      <span className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>•••• {card.last4}</span>
                    </div>
                    <input value={editForm.holderName} onChange={e => setEditForm(p => ({ ...p, holderName: e.target.value }))} placeholder="Titular" className={`w-full px-4 py-2.5 rounded-[14px] text-xs font-medium outline-none ${isDark ? "bg-white/[0.06] border border-white/[0.06] text-white" : "bg-slate-50 border border-slate-200 text-slate-900"}`} />
                    <div className="flex gap-2">
                      <input value={editForm.expiryMonth} onChange={e => setEditForm(p => ({ ...p, expiryMonth: e.target.value }))} placeholder="MM" maxLength={2} className={`flex-1 px-4 py-2.5 rounded-[14px] text-xs font-mono font-medium outline-none ${isDark ? "bg-white/[0.06] border border-white/[0.06] text-white" : "bg-slate-50 border border-slate-200 text-slate-900"}`} />
                      <input value={editForm.expiryYear} onChange={e => setEditForm(p => ({ ...p, expiryYear: e.target.value }))} placeholder="AA" maxLength={4} className={`flex-1 px-4 py-2.5 rounded-[14px] text-xs font-mono font-medium outline-none ${isDark ? "bg-white/[0.06] border border-white/[0.06] text-white" : "bg-slate-50 border border-slate-200 text-slate-900"}`} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleEditCard} disabled={processing} className="flex-1 py-3 rounded-[14px] bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider">Guardar</button>
                      <button onClick={() => setEditingCard(null)} className="flex-1 py-3 rounded-[14px] bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <CardBrandIcon brand={card.brand} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>•••• {card.last4}</p>
                        {card.isDefault && <Star size={12} className="text-amber-500 fill-amber-500" />}
                      </div>
                      <p className={`text-[10px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{card.holderName || "Sin titular"} {card.expiryMonth && card.expiryYear ? `• ${card.expiryMonth}/${card.expiryYear.slice(-2)}` : ""}</p>
                      <p className={`text-[8px] font-medium ${brandColors[card.brand] || "text-slate-400"}`}>{card.brand}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!card.isDefault && (
                        <button onClick={() => handleSetDefault(card.id!)} disabled={processing} className="w-8 h-8 rounded-[14px] flex items-center justify-center hover:bg-amber-500/10 text-amber-500 transition-all" title="Hacer principal"><Star size={14} /></button>
                      )}
                      <button onClick={() => openEdit(card)} className="w-8 h-8 rounded-[14px] flex items-center justify-center hover:bg-blue-500/10 text-blue-500 transition-all" title="Editar"><Pencil size={14} /></button>
                      <button onClick={() => handleDeleteCard(card.id!)} disabled={processing} className="w-8 h-8 rounded-[14px] flex items-center justify-center hover:bg-red-500/10 text-red-500 transition-all" title="Eliminar"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            )) : (
              <div className="py-10 flex flex-col items-center">
                <CreditCard size={28} strokeWidth={1.5} className={`${isDark ? "text-slate-600" : "text-slate-300"}`} />
                <p className={`text-sm font-medium mt-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Sin tarjetas guardadas</p>
                <p className={`text-[9px] font-medium mt-1 ${isDark ? "text-slate-600" : "text-slate-400"}`}>Agrega una para pagar más rápido</p>
              </div>
            )}
          </div>
          {!showAddCard && (
            <div className="px-5 py-4 border-t border-emerald-500/5">
              <button onClick={() => setShowAddCard(true)} className="w-full py-3 rounded-[14px] border-2 border-dashed border-emerald-500/30 text-emerald-500 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-500/5 transition-all">
                <Plus size={14} /> Agregar Tarjeta
              </button>
            </div>
          )}
        </GlowCard>

        {/* Transactions */}
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

      {showAddCard && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => { setShowAddCard(false); setAddForm({ cardNumber: "", expiry: "", cvv: "", holderName: "" }); }}>
          <div className={`w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] p-6 sm:p-8 ${isDark ? "bg-[#0B0F19] border border-white/[0.06]" : "bg-white border border-slate-200"} shadow-2xl max-h-[95vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold uppercase tracking-widest">Nueva Tarjeta</h2>
              <button onClick={() => { setShowAddCard(false); setAddForm({ cardNumber: "", expiry: "", cvv: "", holderName: "" }); }} className="w-8 h-8 rounded-[14px] flex items-center justify-center bg-slate-200 dark:bg-white/10 text-slate-500">
                <X size={16} />
              </button>
            </div>

            <div className={`relative rounded-[20px] p-5 pb-6 mb-6 bg-gradient-to-br ${brandGradients[detectCardBrand(addForm.cardNumber)] || defaultGradient} shadow-xl overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full -ml-10 -mb-10 blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/60" />
                    <span className="text-[7px] font-bold text-white/40 uppercase tracking-[3px]">TARJETA</span>
                  </div>
                  {detectCardBrand(addForm.cardNumber) ? (
                    <span className="text-[9px] font-black text-white/90 uppercase tracking-wider px-2.5 py-1 rounded-[8px] bg-white/10 backdrop-blur-sm">{detectCardBrand(addForm.cardNumber)}</span>
                  ) : (
                    <span className="text-[7px] font-semibold text-white/30 uppercase tracking-[2px]">DÉBITO / CRÉDITO</span>
                  )}
                </div>
                <p className="text-lg sm:text-xl font-mono font-bold tracking-[3px] sm:tracking-[5px] text-white mb-5 drop-shadow-sm truncate">
                  {addForm.cardNumber.replace(/\s/g, "") ? formatCardNumber(addForm.cardNumber) : "•••• •••• •••• ••••"}
                </p>
                <div className="flex items-end justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[6px] font-semibold text-white/50 uppercase tracking-[2px]">Titular</p>
                    <p className="text-xs font-semibold text-white uppercase tracking-wider drop-shadow-sm">
                      {addForm.holderName || "NOMBRE DEL TITULAR"}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[6px] font-semibold text-white/50 uppercase tracking-[2px]">Vence</p>
                    <p className="text-xs font-mono font-semibold text-white drop-shadow-sm">
                      {addForm.expiry || "MM/AA"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-[8px] font-bold uppercase tracking-[2px] mb-1.5 pl-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Número de tarjeta</label>
                <input value={addForm.cardNumber} onChange={e => setAddForm(p => ({ ...p, cardNumber: formatCardNumber(e.target.value) }))} placeholder="1234 5678 9012 3456" className={`w-full px-4 py-3 rounded-[14px] text-xs font-mono font-medium outline-none transition-all ${isDark ? "bg-white/[0.06] border border-white/[0.06] text-white focus:border-emerald-500/40" : "bg-slate-50 border border-slate-200 text-slate-900 focus:border-emerald-500/40"}`} />
              </div>
              <div>
                <label className={`block text-[8px] font-bold uppercase tracking-[2px] mb-1.5 pl-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Nombre del titular</label>
                <input value={addForm.holderName} onChange={e => setAddForm(p => ({ ...p, holderName: e.target.value.toUpperCase() }))} placeholder="Como aparece en la tarjeta" className={`w-full px-4 py-3 rounded-[14px] text-xs font-medium outline-none transition-all uppercase ${isDark ? "bg-white/[0.06] border border-white/[0.06] text-white focus:border-emerald-500/40" : "bg-slate-50 border border-slate-200 text-slate-900 focus:border-emerald-500/40"}`} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`block text-[8px] font-bold uppercase tracking-[2px] mb-1.5 pl-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Vencimiento</label>
                  <input value={addForm.expiry} onChange={e => {
                    let v = e.target.value.replace(/[^\d]/g, "");
                    if (v.length > 4) v = v.slice(0, 4);
                    if (v.length >= 2) v = v.slice(0, 2) + "/" + v.slice(2);
                    setAddForm(p => ({ ...p, expiry: v }));
                  }} placeholder="MM/AA" maxLength={5} className={`w-full px-4 py-3 rounded-[14px] text-xs font-mono font-medium outline-none transition-all ${isDark ? "bg-white/[0.06] border border-white/[0.06] text-white focus:border-emerald-500/40" : "bg-slate-50 border border-slate-200 text-slate-900 focus:border-emerald-500/40"}`} />
                </div>
                <div className="flex-1">
                  <label className={`block text-[8px] font-bold uppercase tracking-[2px] mb-1.5 pl-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>CVV</label>
                  <input value={addForm.cvv} onChange={e => setAddForm(p => ({ ...p, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="•••" maxLength={4} type="password" className={`w-full px-4 py-3 rounded-[14px] text-xs font-mono font-medium outline-none transition-all ${isDark ? "bg-white/[0.06] border border-white/[0.06] text-white focus:border-emerald-500/40" : "bg-slate-50 border border-slate-200 text-slate-900 focus:border-emerald-500/40"}`} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleAddCard} disabled={processing}
                className="flex-1 py-4 rounded-[16px] bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-[2px] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50">
                {processing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={15} /> Vincular Tarjeta</>}
              </button>
              <button onClick={() => { setShowAddCard(false); setAddForm({ cardNumber: "", expiry: "", cvv: "", holderName: "" }); }}
                className="px-6 py-4 rounded-[16px] bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-[2px] hover:bg-slate-300 dark:hover:bg-white/20 transition-all active:scale-[0.98]">
                Cancelar
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span className={`text-[7px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Cifrado SSL de 256 bits &bull; No almacenamos CVV</span>
            </div>
          </div>
        </div>
      )}

      {alert?.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6" onClick={() => setAlert(null)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 ${isDark ? "bg-[#0F172A] border border-white/[0.06]" : "bg-white border border-slate-200"} shadow-2xl text-center`} onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-[14px] flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: (alert.type === "success" ? "#10b981" : "#ef4444") + "15" }}>
              {alert.type === "success" ? <CheckCircle2 size={32} className="text-emerald-500" /> : <XCircle size={32} className="text-red-500" />}
            </div>
            <p className={`text-base font-semibold mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{alert.title}</p>
            <p className={`text-sm font-medium mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{alert.message}</p>
            <button onClick={() => setAlert(null)} className="w-full py-3.5 rounded-[14px] font-semibold text-sm text-white" style={{ backgroundColor: alert.type === "success" ? "#10b981" : "#ef4444" }}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}
