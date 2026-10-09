"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Medal01Icon,
    TrophyIcon,
    SparklesIcon,
    Shield01Icon,
    FireIcon,
    StarIcon,
    UserGroupIcon,
    BarChartIcon,
    RefreshIcon,
    CheckmarkCircle02Icon,
    Mortarboard01Icon,
    BoltIcon,
    AlertCircleIcon,
    InformationCircleIcon,
    HeartIcon,
    CpuIcon,
    Target01Icon,
    Search01Icon,
    CrownIcon,
    Award01Icon,
    GlobeIcon,
} from '@hugeicons/core-free-icons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import ModalPortal from '@/components/ui/ModalPortal';

interface BadgeTier {
    bronze: number;
    silver: number;
    gold: number;
}

interface BadgeConfig {
    id: string;
    name: string;
    description: string;
    icon: any;
    unit: string;
    thresholds: BadgeTier;
}

const INITIAL_BADGES: BadgeConfig[] = [
    { id: 'scorer', name: 'Artillero', description: 'Goles anotados', icon: FireIcon, unit: 'Goles', thresholds: { bronze: 1, silver: 10, gold: 30 } },
    { id: 'playmaker', name: 'Maestro', description: 'Asistencias acumuladas', icon: SparklesIcon, unit: 'Asist', thresholds: { bronze: 1, silver: 8, gold: 25 } },
    { id: 'defender', name: 'Muralla', description: 'Vallas invictas', icon: Shield01Icon, unit: 'Vallas', thresholds: { bronze: 1, silver: 5, gold: 15 } },
    { id: 'wins', name: 'Ganador', description: 'Partidos ganados', icon: TrophyIcon, unit: 'Victorias', thresholds: { bronze: 1, silver: 5, gold: 15 } },
    { id: 'mvp', name: 'Estrella', description: 'Elegido MVP', icon: StarIcon, unit: 'MVPs', thresholds: { bronze: 1, silver: 3, gold: 8 } },
    { id: 'experience', name: 'Leyenda', description: 'Partidos disputados', icon: UserGroupIcon, unit: 'Partidos', thresholds: { bronze: 1, silver: 10, gold: 30 } },
    { id: 'invictus', name: 'Invicto', description: 'Mejor racha de victorias', icon: CrownIcon, unit: 'Victorias', thresholds: { bronze: 2, silver: 4, gold: 8 } },
    { id: 'stamina', name: 'Motor', description: 'Minutos jugados', icon: CpuIcon, unit: 'Min.', thresholds: { bronze: 60, silver: 300, gold: 900 } },
    { id: 'weekend_warrior', name: 'Guerrero FDS', description: 'Partidos de fin de semana', icon: UserGroupIcon, unit: 'Partidos', thresholds: { bronze: 1, silver: 8, gold: 20 } },
    { id: 'morning_player', name: 'Madrugador', description: 'Partidos de mañana', icon: SparklesIcon, unit: 'Partidos', thresholds: { bronze: 1, silver: 5, gold: 15 } },
    { id: 'night_player', name: 'Nocturno', description: 'Partidos de noche', icon: StarIcon, unit: 'Partidos', thresholds: { bronze: 1, silver: 5, gold: 15 } },
    { id: 'loyal', name: 'Fiel', description: 'Meses de permanencia', icon: HeartIcon, unit: 'Meses', thresholds: { bronze: 1, silver: 3, gold: 6 } },
    { id: 'multi_sport', name: 'Atleta Total', description: 'Deportes distintos jugados', icon: Target01Icon, unit: 'Deportes', thresholds: { bronze: 2, silver: 3, gold: 5 } },
    { id: 'scout', name: 'Explorador', description: 'Recintos distintos visitados', icon: GlobeIcon, unit: 'Recintos', thresholds: { bronze: 2, silver: 5, gold: 10 } },
    { id: 'streak', name: 'En Racha', description: 'Mejor racha de partidos seguidos', icon: BoltIcon, unit: 'Partidos', thresholds: { bronze: 3, silver: 6, gold: 10 } },
    { id: 'consistent', name: 'Constante', description: 'Partidos en un mismo mes', icon: BarChartIcon, unit: 'Partidos', thresholds: { bronze: 4, silver: 8, gold: 16 } },
    { id: 'veteran', name: 'Veterano', description: 'Meses consecutivos jugando', icon: Award01Icon, unit: 'Meses', thresholds: { bronze: 2, silver: 4, gold: 8 } },
    { id: 'socializer', name: 'Compañero', description: 'Partidos con distintos compañeros', icon: Mortarboard01Icon, unit: 'Partidos', thresholds: { bronze: 3, silver: 8, gold: 20 } },
];

const TIERS: { tier: keyof BadgeTier; label: string; accent: string; ring: string }[] = [
    { tier: 'bronze', label: 'Bronce', accent: 'text-amber-700 dark:text-amber-500', ring: 'focus:border-amber-500 focus:ring-amber-500/20' },
    { tier: 'silver', label: 'Plata', accent: 'text-slate-500 dark:text-slate-400', ring: 'focus:border-slate-400 focus:ring-slate-400/20' },
    { tier: 'gold', label: 'Oro', accent: 'text-yellow-600 dark:text-yellow-500', ring: 'focus:border-yellow-500 focus:ring-yellow-500/20' },
];

export default function BadgesConfigModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [badges, setBadges] = useState<BadgeConfig[]>(INITIAL_BADGES);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
        window.addEventListener('keydown', onKey);
        document.body.classList.add('overflow-hidden');
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.classList.remove('overflow-hidden');
        };
    }, [isOpen, saving, onClose]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchBadges = async () => {
            setLoading(true);
            setSearch('');
            setNotification(null);
            try {
                const docRef = doc(db, 'settings', 'global');
                const snap = await getDoc(docRef);
                if (snap.exists() && snap.data().badges) {
                    const savedBadges = snap.data().badges;
                    setBadges(INITIAL_BADGES.map(b => ({
                        ...b,
                        thresholds: savedBadges[b.id] || b.thresholds
                    })));
                } else {
                    setBadges(INITIAL_BADGES);
                }
            } catch (err) {
                console.error("Error cargando insignias:", err);
                setNotification({ msg: "No se pudieron cargar las insignias", type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchBadges();
    }, [isOpen]);

    const updateThreshold = (id: string, tier: keyof BadgeTier, value: number) => {
        setBadges(prev => prev.map(b =>
            b.id === id ? { ...b, thresholds: { ...b.thresholds, [tier]: Math.max(0, value) } } : b
        ));
    };

    const hasInvalid = useMemo(
        () => badges.some(b => b.thresholds.bronze > b.thresholds.silver || b.thresholds.silver > b.thresholds.gold),
        [badges]
    );

    const filteredBadges = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return badges;
        return badges.filter(b => b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
    }, [badges, search]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const badgesData: Record<string, BadgeTier> = {};
            badges.forEach(b => { badgesData[b.id] = b.thresholds; });
            await setDoc(doc(db, 'settings', 'global'), { badges: badgesData }, { merge: true });
            setNotification({ msg: "Arsenal actualizado correctamente", type: 'success' });
            setTimeout(() => onClose(), 900);
        } catch (err) {
            console.error("Error guardando insignias:", err);
            setNotification({ msg: "Error al guardar los cambios", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div
                className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 dark:bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
                role="presentation"
                onClick={() => !saving && onClose()}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="badges-modal-title"
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full sm:max-w-5xl bg-white dark:bg-[#0B0F19] rounded-t-2xl sm:rounded-md border border-slate-200 dark:border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[94vh] sm:h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
                >
                    {/* HEADER */}
                    <div className="relative px-5 sm:px-6 py-5 border-b border-slate-100 dark:border-white/5 shrink-0 overflow-hidden">
                        <div aria-hidden="true" className="pointer-events-none absolute -top-16 left-4 w-40 h-40 bg-emerald-400/20 dark:bg-[#00df82]/15 blur-[70px] rounded-full" />
                        <div className="relative flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="w-11 h-11 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-[#00df82] flex items-center justify-center shrink-0">
                                    <HugeiconsIcon icon={Medal01Icon} className="w-5 h-5" strokeWidth={1.8} />
                                </span>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-[#00df82]">
                                        Mérito deportivo
                                    </span>
                                    <h2 id="badges-modal-title" className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading leading-none mt-1">
                                        Configuración de insignias
                                    </h2>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                disabled={saving}
                                aria-label="Cerrar"
                                className="p-2 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                            >
                                <HugeiconsIcon icon={AlertCircleIcon} className="hidden" />
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        {/* Buscador */}
                        <div className="relative mt-4">
                            <HugeiconsIcon icon={Search01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                            <input
                                type="text"
                                placeholder="Buscar insignia…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 dark:focus:border-[#00df82] outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* BODY */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 animate-spin text-emerald-500 dark:text-[#00df82]" strokeWidth={2} />
                                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Sincronizando arsenal…</span>
                            </div>
                        ) : filteredBadges.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-3">
                                <HugeiconsIcon icon={Medal01Icon} className="w-10 h-10 text-slate-200 dark:text-white/10" strokeWidth={1.5} />
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin insignias que coincidan</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredBadges.map((badge) => {
                                    const invalid = badge.thresholds.bronze > badge.thresholds.silver || badge.thresholds.silver > badge.thresholds.gold;
                                    return (
                                        <div
                                            key={badge.id}
                                            className={`relative p-4 rounded-md border bg-white dark:bg-white/[0.02] transition-all ${invalid ? "border-red-300 dark:border-red-500/30" : "border-slate-200 dark:border-white/5 hover:border-emerald-300 dark:hover:border-[#00df82]/30"}`}
                                        >
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="w-10 h-10 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] flex items-center justify-center shrink-0">
                                                    <HugeiconsIcon icon={badge.icon} className="w-5 h-5" strokeWidth={1.8} />
                                                </span>
                                                <div className="min-w-0">
                                                    <h3 className="text-[13px] font-black uppercase tracking-tight text-slate-900 dark:text-white truncate font-heading">{badge.name}</h3>
                                                    <p className="text-[10px] font-medium text-slate-400 truncate">{badge.description}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                {TIERS.map((t) => (
                                                    <div key={t.tier} className="space-y-1.5">
                                                        <label className={`text-[9px] font-black uppercase tracking-wider block text-center ${t.accent}`}>{t.label}</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={badge.thresholds[t.tier]}
                                                            onChange={(e) => updateThreshold(badge.id, t.tier, Number(e.target.value))}
                                                            aria-label={`${badge.name} ${t.label}`}
                                                            className={`w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-2 py-2.5 text-sm font-mono font-black text-center text-slate-900 dark:text-white outline-none transition-all focus:ring-2 ${t.ring}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{badge.unit} requeridos</span>
                                                {invalid && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-red-500">
                                                        <HugeiconsIcon icon={AlertCircleIcon} className="w-3 h-3" strokeWidth={2.5} />
                                                        Bronce ≤ Plata ≤ Oro
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] shrink-0">
                        {notification && (
                            <div role="alert" className={`mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-[11px] font-bold ${notification.type === 'success' ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-[#00df82]" : "border-red-500/20 bg-red-500/10 text-red-500"}`}>
                                <HugeiconsIcon icon={notification.type === 'success' ? CheckmarkCircle02Icon : AlertCircleIcon} className="w-4 h-4 shrink-0" strokeWidth={2} />
                                {notification.msg}
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <p className="text-[10px] font-medium text-slate-400 flex items-center gap-2">
                                <HugeiconsIcon icon={InformationCircleIcon} className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.8} />
                                Los cambios afectan el cálculo de insignias de todos los jugadores.
                            </p>
                            <div className="flex gap-2.5">
                                <button
                                    onClick={onClose}
                                    disabled={saving}
                                    className="px-5 py-2.5 rounded-md text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button aria-label="Actualizar"
                                    onClick={handleSave}
                                    disabled={saving || loading || hasInvalid}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider shadow-[0_0_25px_-8px_rgba(0,223,130,0.7)] hover:bg-[#3affa0] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <HugeiconsIcon icon={saving ? RefreshIcon : CheckmarkCircle02Icon} className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} strokeWidth={2} />
                                    {saving ? "Guardando…" : "Guardar cambios"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
