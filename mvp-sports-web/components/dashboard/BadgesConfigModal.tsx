"use client";
import React, { useState, useEffect } from 'react';
import { 
    XMarkIcon, 
    TrophyIcon, 
    SparklesIcon, 
    ShieldCheckIcon, 
    FireIcon, 
    StarIcon, 
    UserGroupIcon,
    ChartBarIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    AcademicCapIcon,
    BoltIcon,
    CursorArrowRippleIcon,
    ClockIcon,
    HandRaisedIcon,
    ExclamationCircleIcon,
    ArrowUpCircleIcon,
    InformationCircleIcon,
    ArrowPathRoundedSquareIcon,
    VariableIcon,
    HeartIcon,
    ShieldExclamationIcon,
    CpuChipIcon
} from '@heroicons/react/24/outline';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';

interface BadgeTier {
    bronze: number;
    silver: number;
    gold: number;
}

interface BadgeConfig {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    color: string;
    unit: string;
    thresholds: BadgeTier;
}

const INITIAL_BADGES: BadgeConfig[] = [
    { id: 'scorer', name: 'Artillero', description: 'Puntos o goles anotados', icon: FireIcon, color: 'rose', unit: 'Pts', thresholds: { bronze: 10, silver: 50, gold: 150 } },
    { id: 'playmaker', name: 'Maestro', description: 'Asistencias y pases clave', icon: SparklesIcon, color: 'blue', unit: 'Asist', thresholds: { bronze: 5, silver: 20, gold: 50 } },
    { id: 'defender', name: 'Muralla', description: 'Defensas o vallas invictas', icon: ShieldCheckIcon, color: 'emerald', unit: 'Def', thresholds: { bronze: 5, silver: 20, gold: 50 } },
    { id: 'wins', name: 'Ganador', description: 'Partidos ganados acumulados', icon: TrophyIcon, color: 'amber', unit: 'Wins', thresholds: { bronze: 10, silver: 30, gold: 60 } },
    { id: 'mvp', name: 'Estrella', description: 'Veces elegido Mejor Jugador', icon: StarIcon, color: 'indigo', unit: 'MVPs', thresholds: { bronze: 2, silver: 5, gold: 12 } },
    { id: 'experience', name: 'Leyenda', description: 'Total de partidos disputados', icon: UserGroupIcon, color: 'slate', unit: 'Partidos', thresholds: { bronze: 20, silver: 50, gold: 100 } },
    { id: 'multi_sport', name: 'Atleta Total', description: 'Partidos en deportes distintos', icon: VariableIcon, color: 'teal', unit: 'Deportes', thresholds: { bronze: 2, silver: 4, gold: 6 } },
    { id: 'captaincy', name: 'Capitán', description: 'Partidos liderando equipo', icon: AcademicCapIcon, color: 'sky', unit: 'Capitán', thresholds: { bronze: 5, silver: 15, gold: 30 } },
    { id: 'comeback', name: 'Ave Fénix', description: 'Partidos ganados remontando', icon: ArrowPathRoundedSquareIcon, color: 'yellow', unit: 'Remont.', thresholds: { bronze: 1, silver: 3, gold: 7 } },
    { id: 'precision', name: 'Francotirador', description: 'Efectividad o precisión alta', icon: CursorArrowRippleIcon, color: 'purple', unit: 'Efect.', thresholds: { bronze: 5, silver: 15, gold: 30 } },
    { id: 'clutch', name: 'Clutch', description: 'Puntos decisivos al final', icon: ClockIcon, color: 'orange', unit: 'Pts', thresholds: { bronze: 2, silver: 5, gold: 10 } },
    { id: 'tournaments', name: 'Competidor', description: 'Torneos o ligas disputadas', icon: TrophyIcon, color: 'lime', unit: 'Torneos', thresholds: { bronze: 1, silver: 3, gold: 5 } },
    { id: 'invictus', name: 'Invicto', description: 'Rachas de victorias (invicto)', icon: FireIcon, color: 'red', unit: 'Racha', thresholds: { bronze: 3, silver: 6, gold: 10 } },
    { id: 'rivalry', name: 'Verdugo', description: 'Clásicos o revanchas ganadas', icon: BoltIcon, color: 'cyan', unit: 'Partidos', thresholds: { bronze: 2, silver: 6, gold: 12 } },
    { id: 'morning_player', name: 'Madrugador', description: 'Partidos jugados en la mañana', icon: SparklesIcon, color: 'amber', unit: 'Partidos', thresholds: { bronze: 5, silver: 15, gold: 30 } },
    { id: 'night_player', name: 'Nocturno', description: 'Partidos jugados en la noche', icon: StarIcon, color: 'indigo', unit: 'Partidos', thresholds: { bronze: 5, silver: 15, gold: 30 } },
    { id: 'loyal', name: 'Fiel', description: 'Meses de permanencia activa', icon: HeartIcon, color: 'rose', unit: 'Meses', thresholds: { bronze: 3, silver: 6, gold: 12 } },
    { id: 'weekend_warrior', name: 'Guerrero FDS', description: 'Partidos en fin de semana', icon: UserGroupIcon, color: 'gray', unit: 'Partidos', thresholds: { bronze: 10, silver: 30, gold: 60 } },
    { id: 'stamina', name: 'Motor', description: 'Minutos jugados acumulados', icon: CpuChipIcon, color: 'emerald', unit: 'Min.', thresholds: { bronze: 500, silver: 1500, gold: 3000 } },
    { id: 'social', name: 'Sociable', description: 'Partidos con invitados/amigos', icon: UserGroupIcon, color: 'blue', unit: 'Invit.', thresholds: { bronze: 5, silver: 15, gold: 30 } }
];

export default function BadgesConfigModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [badges, setBadges] = useState<BadgeConfig[]>(INITIAL_BADGES);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        
        const fetchBadges = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, 'settings', 'global');
                const snap = await getDoc(docRef);
                if (snap.exists() && snap.data().badges) {
                    const savedBadges = snap.data().badges;
                    setBadges(prev => prev.map(b => ({
                        ...b,
                        thresholds: savedBadges[b.id] || b.thresholds
                    })));
                }
            } catch (err) {
                console.error("Error cargando insignias:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBadges();
    }, [isOpen]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const badgesData: Record<string, BadgeTier> = {};
            badges.forEach(b => { badgesData[b.id] = b.thresholds; });
            
            await setDoc(doc(db, 'settings', 'global'), { badges: badgesData }, { merge: true });
            onClose();
        } catch (err) {
            console.error("Error guardando insignias:", err);
        } finally {
            setSaving(false);
        }
    };

    const updateThreshold = (id: string, tier: keyof BadgeTier, value: number) => {
        setBadges(prev => prev.map(b => 
            b.id === id ? { ...b, thresholds: { ...b.thresholds, [tier]: value } } : b
        ));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-white dark:bg-[#0B0F19] w-full max-w-6xl max-h-[90vh] rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/10 overflow-hidden flex flex-col relative animate-in zoom-in duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabecera Premium */}
                <div className="p-8 md:p-10 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02] relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30 flex items-center justify-center text-white group">
                            <TrophyIcon className="w-9 h-9 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white leading-none italic">
                                ARSENAL <span className="text-emerald-500">MÉRITO DEPORTIVO</span>
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-2">Configuración de Umbrales para 20 Insignias de Élite</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-3 hover:bg-white dark:hover:bg-white/5 rounded-[1.25rem] transition-all shadow-sm active:scale-90 text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                        <XMarkIcon className="w-7 h-7" />
                    </button>
                </div>

                {/* Grid de Insignias */}
                <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-white dark:bg-[#0B0F19] relative z-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-6">
                            <div className="relative">
                                <ArrowPathIcon className="w-16 h-16 animate-spin text-emerald-500/20" />
                                <TrophyIcon className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-[0.4em] animate-pulse">Sincronizando Arsenal...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {badges.map((badge) => (
                                <div key={badge.id} className="p-6 rounded-[2.5rem] bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 group hover:border-emerald-500/30 hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                        <badge.icon className="w-20 h-20" />
                                    </div>

                                    <div className="flex items-center gap-5 mb-8 relative z-10">
                                        <div className={`w-14 h-14 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-emerald-500 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                                            <badge.icon className="w-8 h-8" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white truncate italic">{badge.name}</h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mt-1.5 truncate tracking-widest">{badge.description}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 relative z-10">
                                        {[
                                            { tier: 'bronze', label: 'BRONCE', color: 'text-amber-700 dark:text-amber-500', focus: 'focus:ring-amber-500/50' },
                                            { tier: 'silver', label: 'PLATA', color: 'text-slate-500 dark:text-slate-400', focus: 'focus:ring-slate-400/50' },
                                            { tier: 'gold', label: 'ORO', color: 'text-yellow-600 dark:text-yellow-500', focus: 'focus:ring-yellow-500/50' }
                                        ].map((t) => (
                                            <div key={t.tier} className="space-y-2">
                                                <label className={`text-[8px] font-black uppercase tracking-widest block text-center ${t.color}`}>{t.label}</label>
                                                <input 
                                                    type="number"
                                                    value={badge.thresholds[t.tier as keyof BadgeTier]}
                                                    onChange={(e) => updateThreshold(badge.id, t.tier as keyof BadgeTier, Number(e.target.value))}
                                                    className={`w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-1 py-3 text-xs font-mono font-black text-center text-slate-700 dark:text-white focus:ring-4 ${t.focus} outline-none transition-all shadow-inner`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 flex justify-center">
                                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">{badge.unit} requeridos</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-8 md:p-10 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col md:flex-row justify-end items-center gap-6 relative z-10">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-auto flex items-center gap-3">
                        <InformationCircleIcon className="w-5 h-5 text-emerald-500" /> Los cambios afectarán el cálculo de insignias de todos los usuarios en tiempo real.
                    </p>
                    <div className="flex gap-4 w-full md:w-auto">
                        <button 
                            onClick={onClose} 
                            className="flex-1 md:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 md:flex-none px-12 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-2xl shadow-emerald-500/40 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {saving ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CheckCircleIcon className="w-6 h-6" />}
                            {saving ? 'PROCESANDO...' : 'APLICAR ARSENAL ELITE (20)'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

