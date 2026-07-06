"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, limit, Timestamp } from 'firebase/firestore';
import {
    ChatBubbleLeftRightIcon, BuildingStorefrontIcon, StarIcon,
    UserCircleIcon, HandThumbUpIcon, HandThumbDownIcon,
    PaperAirplaneIcon, ArrowPathIcon, XMarkIcon, ExclamationTriangleIcon, 
    CheckCircleIcon, FunnelIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-[14px] shadow-2xl border animate-slideInRight backdrop-blur-md ${
            type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:text-emerald-400 dark:border-emerald-500/50' : 
            'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:text-red-400 dark:border-red-500/50'
        }`}>
            {type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
            <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
        </div>
    );
};

export default function FeedbackPage() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<any[]>([]);
    const [venues, setVenues] = useState<any[]>([]);
    const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
    const [filterRating, setFilterRating] = useState<number | 'all'>('all');

    const [replyText, setReplyText] = useState('');
    const [replyingId, setReplyingId] = useState<string | null>(null);
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const fetchData = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            // 1. Cargar recintos del owner
            const qVenues = query(collection(db, "tenants"), where("ownerId", "==", user.uid));
            const snapVenues = await getDocs(qVenues);
            const venueList = snapVenues.docs.map(d => ({ id: d.id, name: d.data().name }));
            setVenues(venueList);
            const venueIds = venueList.map(v => v.id);

            if (venueIds.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Cargar de la colección 'reviews' (Feedback específico)
            const qReviews = query(
                collection(db, "reviews"),
                where("ownerId", "==", user.uid),
                orderBy("date", "desc")
            );
            const snapReviews = await getDocs(qReviews);
            const reviewsList = snapReviews.docs.map(d => ({ id: d.id, ...d.data() }));

            // 3. Cargar de la colección 'bookings' (Calificaciones directas en la reserva)
            const qBookings = query(
                collection(db, "bookings"),
                where("tenantId", "in", venueIds.slice(0, 10)),
                orderBy("date", "desc")
            );
            const snapBookings = await getDocs(qBookings);
            const bookingsWithRating = snapBookings.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((b: any) => b.rating > 0);

            // 4. Normalizar y Combinar
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

            // Eliminar duplicados usando Map (priorizando reviews sobre bookings)
            const feedbackMap = new Map();
            
            // Función para generar una clave de contenido (para de-duplicar si no hay bookingId)
            const getContentKey = (item: any) => {
                const commentNorm = (item.comment || '').trim().toLowerCase().substring(0, 30);
                const timeStr = item.date?.seconds || item.date?.toString() || '';
                return `${item.userId}_${item.venueId}_${item.rating}_${commentNorm}_${timeStr}`;
            };

            // 1. Procesar reviews primero
            reviewsList.forEach(r => {
                const key = (r as any).bookingId || getContentKey(r);
                feedbackMap.set(key, r);
            });

            // 2. Procesar bookings normalizados (solo si no existe ya esa evaluación)
            normalizedBookings.forEach(b => {
                const key = (b as any).id;
                const contentKey = getContentKey(b);
                if (!feedbackMap.has(key) && !feedbackMap.has(contentKey)) {
                    feedbackMap.set(key, b);
                }
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

    useEffect(() => {
        fetchData();
    }, [user]);

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
            await updateDoc(doc(db, "reviews", reviewId), {
                reply: replyText,
                replyDate: Timestamp.now()
            });

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

    const MESES = [
        { id: 1, name: 'Enero' }, { id: 2, name: 'Febrero' }, { id: 3, name: 'Marzo' },
        { id: 4, name: 'Abril' }, { id: 5, name: 'Mayo' }, { id: 6, name: 'Junio' },
        { id: 7, name: 'Julio' }, { id: 8, name: 'Agosto' }, { id: 9, name: 'Septiembre' },
        { id: 10, name: 'Octubre' }, { id: 11, name: 'Noviembre' }, { id: 12, name: 'Diciembre' }
    ];

    return (
        <div className="w-full space-y-6 pb-12 relative animate-fadeIn">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

            {/* 1. CABECERA ADN STYLE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">
                            Módulo de Reputación
                        </p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                        Feedback de <span className="text-emerald-500 dark:text-emerald-400">Clientes</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Botón Actualizar */}
                    <button 
                        onClick={() => fetchData()}
                        className="p-2.5 rounded-[14px] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all group"
                        title="Actualizar Datos"
                    >
                        <ArrowPathIcon className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500`} />
                    </button>

                    {/* Filtro Recinto */}
                    <div className="relative">
                        <BuildingStorefrontIcon className="w-3.5 h-3.5 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                        <select
                            value={selectedVenueId}
                            onChange={(e) => setSelectedVenueId(e.target.value)}
                            className="appearance-none bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[14px] pl-8 pr-10 py-2 text-[9px] font-black outline-none text-slate-600 dark:text-slate-300 uppercase cursor-pointer transition-all hover:border-emerald-500/50"
                        >
                            <option value="all">TODOS LOS RECINTOS</option>
                            {venues.map(v => <option key={v.id} value={v.id}>{v.name.toUpperCase()}</option>)}
                        </select>
                    </div>

                    {/* Filtro Mes */}
                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                            className="appearance-none bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[14px] px-4 py-2 text-[9px] font-black outline-none text-slate-600 dark:text-slate-300 uppercase cursor-pointer transition-all hover:border-emerald-500/50"
                        >
                            <option value="all">TODOS LOS MESES</option>
                            {MESES.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                        </select>
                    </div>

                    {/* Filtro Año */}
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="appearance-none bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[14px] px-4 py-2 text-[9px] font-black outline-none text-slate-600 dark:text-slate-300 uppercase cursor-pointer transition-all hover:border-emerald-500/50"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-1 bg-white dark:bg-white/5 p-1 rounded-[14px] border border-slate-100 dark:border-white/10">
                        <button 
                            onClick={() => setFilterRating('all')} 
                            className={`px-3 py-1 rounded-[14px] text-[9px] font-black uppercase transition-all ${filterRating === 'all' ? 'bg-slate-950 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                        >
                            TODAS
                        </button>
                        {[5, 1].map(star => (
                            <button 
                                key={star} 
                                onClick={() => setFilterRating(star)} 
                                className={`flex items-center gap-1 px-3 py-1 rounded-[14px] text-[9px] font-black transition-all ${filterRating === star ? 'bg-slate-950 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                            >
                                {star} <StarIconSolid className="w-3 h-3 text-amber-500" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. KPIS PREMIUM */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <PanelGlass className="p-5 flex items-center justify-between col-span-1 md:col-span-2 lg:col-span-1">
                    <div>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5">Rating Promedio</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{avgRating}</h3>
                            <div className="flex text-amber-500 mb-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <StarIconSolid key={i} className={`w-3.5 h-3.5 ${i <= Math.round(Number(avgRating)) ? 'opacity-100' : 'opacity-20'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-[14px] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <StarIcon className="w-6 h-6" />
                    </div>
                </PanelGlass>

                <TarjetaKpi 
                    label="Opiniones Totales" 
                    value={filteredReviews.length.toString()} 
                    icon={<ChatBubbleLeftRightIcon className="w-5 h-5" />} 
                    trend={{ value: 'Actualizado', isUp: true }} 
                />
                
                <TarjetaKpi 
                    label="Positivas (4-5)" 
                    value={filteredReviews.filter(r => r.rating >= 4).length.toString()} 
                    icon={<HandThumbUpIcon className="w-5 h-5" />} 
                    trend={{ value: 'Alta Satisfacción', isUp: true }} 
                />

                <TarjetaKpi 
                    label="Por Mejorar (1-2)" 
                    value={filteredReviews.filter(r => r.rating <= 2).length.toString()} 
                    icon={<HandThumbDownIcon className="w-5 h-5" />} 
                    trend={{ value: 'Atención Crítica', isUp: false }} 
                />
            </div>

            {/* 3. LISTADO ADN STYLE */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <ArrowPathIcon className="w-8 h-8 text-emerald-500 animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sincronizando reputación global...</p>
                </div>
            ) : filteredReviews.length === 0 ? (
                <PanelGlass className="flex flex-col items-center justify-center py-24 text-slate-400 opacity-60">
                    <ChatBubbleLeftRightIcon className="w-12 h-12 mb-4 stroke-1" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Sín opiniones bajo estos criterios</p>
                </PanelGlass>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                    {filteredReviews.map((review) => (
                        <PanelGlass key={review.id} className="p-4 flex flex-col justify-between group hover:border-emerald-500/30 transition-all duration-500">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-[14px] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 dark:border-white/10 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-all">
                                            <UserCircleIcon className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                                                {typeof review.userName === 'string' ? review.userName : (review.userName?.userName || 'Jugador MVP')}
                                            </h4>
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                <span className="text-[7px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest truncate">{review.venueName}</span>
                                                <span className="text-[7px] font-bold text-slate-400 uppercase">
                                                    {review.date?.toDate ? review.date.toDate().toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : 'Reciente'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-[14px] border border-amber-500/10">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <StarIconSolid key={s} className={`w-2.5 h-2.5 ${s <= review.rating ? 'opacity-100' : 'opacity-10'}`} />
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <p className="text-[11px] text-slate-700 dark:text-slate-300 italic font-medium leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-[14px] border border-slate-100 dark:border-white/5 line-clamp-3 group-hover:line-clamp-none transition-all">
                                        "{typeof review.comment === 'string' ? review.comment : 'Sin comentario'}"
                                    </p>
                                    
                                    {review.bookingId && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            <div className="bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-[14px] border border-slate-100 dark:border-white/5 flex items-center gap-1.5">
                                                <span className="text-[7px] font-black text-slate-400 uppercase">ID</span>
                                                <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase">#{review.bookingId.toUpperCase()}</span>
                                            </div>
                                            {review.sport && (
                                                <div className="bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-[14px] border border-slate-100 dark:border-white/5 flex items-center gap-1.5">
                                                    <span className="text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase">
                                                        {typeof review.sport === 'string' ? review.sport : 'General'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECCIÓN INFO EXTRA (SIMPLE) */}
                            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${review.rating >= 4 ? 'bg-emerald-500' : review.rating >= 3 ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Verificado</p>
                                </div>
                                {review.reply && (
                                    <span className="text-[7px] font-bold text-emerald-600 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-[14px]">Analizado</span>
                                )}
                            </div>
                        </PanelGlass>
                    ))}
                </div>
            )}
        </div>
    );
}
