"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Alert02Icon,
    Building01Icon,
    Cancel01Icon,
    CheckmarkCircle02Icon,
    FilterIcon,
    Message02Icon,
    RefreshIcon,
    Search01Icon,
    SendIcon,
    StarIcon,
    UserCircleIcon,
    Download01Icon,
} from '@hugeicons/core-free-icons';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, Timestamp, or } from 'firebase/firestore';
import { TarjetaKpi, SectionCard } from '@/components/ui/DashboardWidgets';

const inputCls = "w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-xs font-bold outline-none text-slate-800 dark:text-white focus:border-emerald-500/40 transition-all";

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-md shadow-2xl border animate-slideInRight backdrop-blur-md ${
            type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:text-[#00df82] dark:border-emerald-500/50' :
            'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:text-red-400 dark:border-red-500/50'
        }`}>
            {type === 'success' ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5" strokeWidth={2} /> : <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" strokeWidth={2} />}
            <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
        </div>
    );
};

const MESES = [
    { id: 1, name: 'Enero' }, { id: 2, name: 'Febrero' }, { id: 3, name: 'Marzo' },
    { id: 4, name: 'Abril' }, { id: 5, name: 'Mayo' }, { id: 6, name: 'Junio' },
    { id: 7, name: 'Julio' }, { id: 8, name: 'Agosto' }, { id: 9, name: 'Septiembre' },
    { id: 10, name: 'Octubre' }, { id: 11, name: 'Noviembre' }, { id: 12, name: 'Diciembre' }
];

export default function FeedbackPage() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<any[]>([]);
    const [venues, setVenues] = useState<any[]>([]);
    const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
    const [filterRating, setFilterRating] = useState<number | 'all'>('all');
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const [replyText, setReplyText] = useState('');
    const [replyingId, setReplyingId] = useState<string | null>(null);
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const fetchData = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const qVenues = query(collection(db, "tenants"), or(where("ownerId", "==", user.uid), where("ownerIds", "array-contains", user.uid)));
            const snapVenues = await getDocs(qVenues);
            const venueList = snapVenues.docs.map(d => ({ id: d.id, name: d.data().name }));
            setVenues(venueList);
            const venueIds = venueList.map(v => v.id);

            if (venueIds.length === 0) { setLoading(false); return; }

            const qReviews = query(collection(db, "reviews"), where("ownerId", "==", user.uid), orderBy("date", "desc"));
            const snapReviews = await getDocs(qReviews);
            const reviewsList = snapReviews.docs.map(d => ({ id: d.id, ...d.data() }));

            const qBookings = query(collection(db, "bookings"), where("tenantId", "in", venueIds.slice(0, 10)), orderBy("date", "desc"));
            const snapBookings = await getDocs(qBookings);
            const bookingsWithRating = snapBookings.docs.map(d => ({ id: d.id, ...d.data() })).filter((b: any) => b.rating > 0);

            const normalizedBookings = bookingsWithRating.map((b: any) => ({
                id: b.id,
                venueId: b.tenantId,
                venueName: b.tenantName || venueList.find(v => v.id === b.tenantId)?.name || 'Recinto',
                userId: b.userId || b.clientId || b.createdBy || 'anon',
                userName: b.clientName || b.userName || 'Jugador MVP',
                rating: b.rating,
                comment: b.feedback || b.comment || 'Sin comentario',
                date: b.date,
                bookingId: b.id,
                sport: b.sport,
                bookingTime: b.startTime,
                isFromBooking: true
            }));

            const getContentKey = (item: any) => {
                const commentNorm = (item.comment || '').trim().toLowerCase().substring(0, 30);
                const timeStr = item.date?.seconds || item.date?.toString() || '';
                return `${item.userId}_${item.venueId}_${item.rating}_${commentNorm}_${timeStr}`;
            };

            const feedbackMap = new Map();
            reviewsList.forEach(r => { const key = (r as any).bookingId || getContentKey(r); feedbackMap.set(key, r); });
            normalizedBookings.forEach(b => {
                const key = (b as any).id;
                const contentKey = getContentKey(b);
                if (!feedbackMap.has(key) && !feedbackMap.has(contentKey)) feedbackMap.set(key, b);
            });

            const uniqueFeedback = Array.from(feedbackMap.values()).sort((a: any, b: any) => {
                const dateA = a.date?.seconds || 0;
                const dateB = b.date?.seconds || 0;
                return dateB - dateA;
            });

            setReviews(uniqueFeedback);
        } catch (error) {
            console.error("Error al cargar feedback:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [user]);

    const filteredReviews = reviews.filter(r => {
        const matchVenue = selectedVenueId === 'all' || r.venueId === selectedVenueId;
        const matchRating = filterRating === 'all' || Math.floor(r.rating) === filterRating;
        const revDate = r.date?.toDate();
        const matchMonth = selectedMonth === 'all' || (revDate && revDate.getMonth() + 1 === selectedMonth);
        const matchYear = revDate && revDate.getFullYear() === selectedYear;
        return matchVenue && matchRating && matchMonth && matchYear;
    });

    const handleReply = async (reviewId: string) => {
        if (!replyText.trim()) return;
        setIsSubmittingReply(true);
        try {
            const review = reviews.find(r => r.id === reviewId);
            const ref = doc(db, review?.isFromBooking ? "bookings" : "reviews", reviewId);
            await updateDoc(ref, { reply: replyText, replyDate: Timestamp.now() });
            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reply: replyText } : r));
            setReplyingId(null);
            setReplyText('');
            setNotification({ msg: "Respuesta publicada correctamente", type: 'success' });
        } catch (error) {
            setNotification({ msg: "Error al publicar la respuesta", type: 'error' });
        } finally {
            setIsSubmittingReply(false);
        }
    };

    const avgRating = filteredReviews.length > 0
        ? (Math.round((filteredReviews.reduce((acc, r) => acc + r.rating, 0) / filteredReviews.length) * 10) / 10).toFixed(1)
        : '0.0';

    const exportCSV = () => {
        const sep = ';';
        const esc = (v: any) => { const s = String(v ?? ''); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
        const line = (cells: any[]) => cells.map(esc).join(sep);
        const headers = ['Cliente', 'Recinto', 'Rating', 'Comentario', 'Fecha', 'Respuesta'];
        const body = filteredReviews.map(r => line([
            typeof r.userName === 'string' ? r.userName : 'Jugador', r.venueName, r.rating,
            typeof r.comment === 'string' ? r.comment : '', r.date?.toDate?.().toISOString() || '', r.reply || '',
        ]));
        const blob = new Blob(["\ufeff" + [line(headers)].concat(body).join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `feedback_mvp_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full space-y-6 pb-12 relative animate-fadeIn">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Módulo de reputación</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Feedback de <span className="text-emerald-500 dark:text-[#00df82]">Clientes</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => fetchData()} title="Actualizar datos" className="p-2.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all">
                        <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4" strokeWidth={2} />
                    </button>
                    <button onClick={exportCSV} disabled={filteredReviews.length === 0} className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all disabled:opacity-40">
                        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2} /> Exportar
                    </button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="flex flex-col xl:flex-row gap-3 justify-between items-start xl:items-center p-4 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <HugeiconsIcon icon={Building01Icon} className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00df82] shrink-0" strokeWidth={2} />
                        <select value={selectedVenueId} onChange={(e) => setSelectedVenueId(e.target.value)} className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 dark:text-white">
                            <option value="all">Todos los recintos</option>
                            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} className="px-2.5 py-2 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase outline-none text-slate-700 dark:text-white">
                        <option value="all">Todos los meses</option>
                        {MESES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-2.5 py-2 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase outline-none text-slate-700 dark:text-white">
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="flex bg-white dark:bg-white/5 p-1 rounded-md border border-slate-200 dark:border-white/10">
                    <button onClick={() => setFilterRating('all')} className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-md transition-all ${filterRating === 'all' ? 'bg-slate-900 dark:bg-[#00df82] text-white dark:text-black' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>Todas</button>
                    {[5, 4, 3, 2, 1].map(star => (
                        <button key={star} onClick={() => setFilterRating(star)} className={`flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-black rounded-md transition-all ${filterRating === star ? 'bg-slate-900 dark:bg-[#00df82] text-white dark:text-black' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>
                            {star} <HugeiconsIcon icon={StarIcon} className="w-3 h-3 text-amber-500" strokeWidth={2} />
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-[#00df82] uppercase tracking-widest mb-1.5">Rating promedio</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none font-mono">{avgRating}</h3>
                            <div className="flex text-amber-500 mb-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <HugeiconsIcon icon={StarIcon} key={i} className={`w-3.5 h-3.5 ${i <= Math.round(Number(avgRating)) ? '' : 'opacity-20'}`} strokeWidth={1.8} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82]">
                        <HugeiconsIcon icon={StarIcon} className="w-6 h-6" strokeWidth={1.6} />
                    </div>
                </div>
                <TarjetaKpi titulo="Opiniones totales" valor={filteredReviews.length} icono={<HugeiconsIcon icon={Message02Icon} className="w-6 h-6" strokeWidth={1.6} />} sub="Según el filtro" />
                <TarjetaKpi titulo="Positivas (4-5)" valor={filteredReviews.filter(r => r.rating >= 4).length} icono={<HugeiconsIcon icon={StarIcon} className="w-6 h-6" strokeWidth={1.6} />} sub="Alta satisfacción" brillo />
                <TarjetaKpi titulo="Por mejorar (1-2)" valor={filteredReviews.filter(r => r.rating <= 2).length} icono={<HugeiconsIcon icon={Alert02Icon} className="w-6 h-6" strokeWidth={1.6} />} sub="Atención crítica" />
            </div>

            {/* LISTADO */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 text-emerald-500 animate-spin" strokeWidth={1.6} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sincronizando reputación global...</p>
                </div>
            ) : (
                <SectionCard
                    title="Opiniones de clientes"
                    subtitle={`${filteredReviews.length} opinión(es) en la vista`}
                    icon={<HugeiconsIcon icon={Message02Icon} className="w-5 h-5" strokeWidth={1.8} />}
                    bodyClassName="p-5"
                >
                    {filteredReviews.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <HugeiconsIcon icon={Message02Icon} className="w-12 h-12 mb-4" strokeWidth={1.4} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Sin opiniones bajo estos criterios</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredReviews.map((review) => {
                                const displayName = typeof review.userName === 'string' ? review.userName : (review.userName?.userName || 'Jugador MVP');
                                const comment = typeof review.comment === 'string' ? review.comment : 'Sin comentario';
                                const sport = typeof review.sport === 'string' ? review.sport : '';
                                const isReplying = replyingId === review.id;
                                return (
                                    <div key={review.id} className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-4 flex flex-col justify-between transition-all hover:border-emerald-400/40">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 dark:border-white/10">
                                                        <HugeiconsIcon icon={UserCircleIcon} className="w-5 h-5" strokeWidth={1.6} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{displayName}</h4>
                                                        <span className="text-[7px] font-black text-emerald-600 dark:text-[#00df82] uppercase tracking-widest truncate block">{review.venueName}</span>
                                                        <span className="text-[7px] font-bold text-slate-400 uppercase">{review.date?.toDate ? review.date.toDate().toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : 'Reciente'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/15">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <HugeiconsIcon icon={StarIcon} key={s} className={`w-2.5 h-2.5 ${s <= review.rating ? '' : 'opacity-10'}`} strokeWidth={1.8} />
                                                    ))}
                                                </div>
                                            </div>

                                            <p className="text-[11px] text-slate-700 dark:text-slate-300 italic font-medium leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-md border border-slate-200 dark:border-white/5 line-clamp-3">{comment}</p>

                                            {(review.bookingId || sport) && (
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {review.bookingId && (
                                                        <span className="bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md border border-slate-200 dark:border-white/10 text-[8px] font-black text-emerald-600 dark:text-[#00df82] uppercase">#{review.bookingId.slice(0, 8).toUpperCase()}</span>
                                                    )}
                                                    {sport && (
                                                        <span className="bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md border border-slate-200 dark:border-white/10 text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase">{sport}</span>
                                                    )}
                                                </div>
                                            )}

                                            {review.reply ? (
                                                <div className="mt-3 p-3 rounded-md bg-emerald-500/5 border border-emerald-500/15">
                                                    <p className="text-[7px] font-black text-emerald-600 dark:text-[#00df82] uppercase tracking-widest mb-1">Respuesta del recinto</p>
                                                    <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">{typeof review.reply === 'string' ? review.reply : ''}</p>
                                                </div>
                                            ) : isReplying ? (
                                                <div className="mt-3 space-y-2">
                                                    <textarea rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Escribe tu respuesta..." className={inputCls} autoFocus />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleReply(review.id)} disabled={isSubmittingReply || !replyText.trim()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[8px] font-black uppercase tracking-wider disabled:opacity-40 active:scale-95 transition-all">
                                                            <HugeiconsIcon icon={SendIcon} className="w-3 h-3" strokeWidth={2} /> {isSubmittingReply ? 'Enviando...' : 'Publicar'}
                                                        </button>
                                                        <button onClick={() => { setReplyingId(null); setReplyText(''); }} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 text-[8px] font-black uppercase tracking-wider transition-all">Cancelar</button>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${review.rating >= 4 ? 'bg-emerald-500' : review.rating >= 3 ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Verificado</p>
                                            </div>
                                            {!review.reply && (
                                                <button onClick={() => setReplyingId(isReplying ? null : review.id)} className="text-[8px] font-black text-emerald-600 dark:text-[#00df82] uppercase tracking-wider hover:underline">
                                                    Responder
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>
            )}
        </div>
    );
}