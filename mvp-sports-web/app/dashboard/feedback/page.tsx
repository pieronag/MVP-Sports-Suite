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
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border animate-slideInRight backdrop-blur-md ${
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

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.uid) return;
            setLoading(true);
            try {
                const qVenues = query(collection(db, "tenants"), where("ownerId", "==", user.uid));
                const snapVenues = await getDocs(qVenues);
                const venueList = snapVenues.docs.map(d => ({ id: d.id, name: d.data().name }));
                setVenues(venueList);

                const qReviews = query(
                    collection(db, "reviews"),
                    where("ownerId", "==", user.uid),
                    orderBy("date", "desc"),
                    limit(100)
                );

                const snapReviews = await getDocs(qReviews);
                const reviewsList = snapReviews.docs.map(d => {
                    const data = d.data();
                    const venueName = data.venueName || venueList.find(v => v.id === data.venueId)?.name || 'Recinto';
                    return { id: d.id, ...data, venueName };
                });

                setReviews(reviewsList);
            } catch (error) {
                console.error("Error al cargar feedback:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const filteredReviews = reviews.filter(r => {
        const matchVenue = selectedVenueId === 'all' || r.venueId === selectedVenueId;
        const matchRating = filterRating === 'all' || Math.floor(r.rating) === filterRating;
        return matchVenue && matchRating;
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
        ? (filteredReviews.reduce((acc, r) => acc + r.rating, 0) / filteredReviews.length).toFixed(1)
        : '0.0';

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

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <BuildingStorefrontIcon className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                        <select
                            value={selectedVenueId}
                            onChange={(e) => setSelectedVenueId(e.target.value)}
                            className="appearance-none bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-[10px] font-black outline-none text-slate-600 dark:text-slate-300 uppercase cursor-pointer transition-all hover:border-emerald-500/50"
                        >
                            <option value="all">TODOS LOS RECINTOS</option>
                            {venues.map(v => <option key={v.id} value={v.id}>{v.name.toUpperCase()}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-1 bg-white dark:bg-white/5 p-1 rounded-xl border border-slate-100 dark:border-white/10">
                        <button 
                            onClick={() => setFilterRating('all')} 
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${filterRating === 'all' ? 'bg-slate-950 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                        >
                            TODAS
                        </button>
                        {[5, 1].map(star => (
                            <button 
                                key={star} 
                                onClick={() => setFilterRating(star)} 
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${filterRating === star ? 'bg-slate-950 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                            >
                                {star} <StarIconSolid className="w-3.5 h-3.5 text-amber-500" />
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
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <StarIcon className="w-6 h-6" />
                    </div>
                </PanelGlass>

                <TarjetaKpi 
                    label="Opiniones Totales" 
                    value={filteredReviews.length.toString()} 
                    icon={<ChatBubbleLeftRightIcon className="w-5 h-5" />} 
                    trend={{ value: 'Actualizado', isPositive: true }} 
                />
                
                <TarjetaKpi 
                    label="Positivas (4-5)" 
                    value={filteredReviews.filter(r => r.rating >= 4).length.toString()} 
                    icon={<HandThumbUpIcon className="w-5 h-5" />} 
                    trend={{ value: 'Alta Satisfacción', isPositive: true }} 
                />

                <TarjetaKpi 
                    label="Por Mejorar (1-2)" 
                    value={filteredReviews.filter(r => r.rating <= 2).length.toString()} 
                    icon={<HandThumbDownIcon className="w-5 h-5" />} 
                    trend={{ value: 'Atención Crítica', isPositive: false }} 
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                    {filteredReviews.map((review) => (
                        <PanelGlass key={review.id} className="p-6 flex flex-col justify-between group hover:border-emerald-500/30 transition-all duration-500">
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 dark:border-white/10 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-all">
                                            <UserCircleIcon className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{review.userName || 'Usuario Anónimo'}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">{review.venueName}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {review.date?.toDate().toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex text-amber-500 bg-amber-500/5 px-2.5 py-1 rounded-xl border border-amber-500/10">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <StarIconSolid key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'opacity-100' : 'opacity-10'}`} />
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-8 relative">
                                    <p className="text-xs text-slate-700 dark:text-slate-300 italic font-medium leading-relaxed bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                        "{review.comment}"
                                    </p>
                                </div>
                            </div>

                            {/* SECCIÓN RESPUESTA PREMIUM */}
                            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5">
                                {review.reply ? (
                                    <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 relative">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-2xl"></div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Respuesta del Recinto</p>
                                        </div>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed">{review.reply}</p>
                                    </div>
                                ) : (
                                    <div>
                                        {replyingId === review.id ? (
                                            <div className="flex flex-col gap-3 animate-fadeIn">
                                                <textarea
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="ESCRIBE TU RESPUESTA PÚBLICA..."
                                                    className="w-full bg-white dark:bg-white/5 border border-emerald-500/30 rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:border-emerald-500 transition-all resize-none h-24 uppercase"
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => setReplyingId(null)} 
                                                        className="flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-500 border border-slate-100 dark:border-white/10 rounded-xl hover:bg-slate-50 transition-all"
                                                    >
                                                        CANCELAR
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReply(review.id)} 
                                                        disabled={isSubmittingReply} 
                                                        className="flex-1 bg-slate-950 dark:bg-emerald-500 text-white dark:text-slate-950 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                    >
                                                        {isSubmittingReply ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
                                                        PUBLICAR
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setReplyingId(review.id)} 
                                                className="w-full text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 py-3 rounded-2xl flex items-center justify-center gap-3 transition-all uppercase tracking-[0.15em]"
                                            >
                                                <ChatBubbleLeftRightIcon className="w-4 h-4" /> Responder al Cliente
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </PanelGlass>
                    ))}
                </div>
            )}
        </div>
    );
}
