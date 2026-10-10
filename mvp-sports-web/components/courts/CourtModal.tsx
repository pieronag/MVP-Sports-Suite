"use client";
import React from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    FootballPitchIcon,
    Cancel01Icon,
    CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { SoccerIcon, PadelIcon, TennisIcon, BasketballIcon, VolleyballIcon } from '@/components/icons/SportsIcons';

const SURFACE_OPTIONS = [
    'Pasto Sintético', 'Arcilla / Polvo de Ladrillo', 'Cemento / Pista Dura',
    'Parquet / Madera', 'Moqueta / Alfombra', 'Césped Natural', 'Caucho / Goma', 'Otro'
];

const COURT_FEATURES_LIST = [
    'Techada', 'Iluminación LED', 'Muro Panorámico', 'Pista Central',
    'Césped FIFA', 'Outdoor (Aire Libre)', 'Grabación de Partidos', 'Cristal Templado'
];

interface CourtModalProps {
    isOpen: boolean;
    editingId: string | null;
    form: any;
    selectedSports: string[];
    onClose: () => void;
    onFormChange: (field: string, value: any) => void;
    onToggleFeature: (feature: string) => void;
    onSave: () => void;
}

const sportIcon = (sport: string, cls: string) => {
    const n = sport ? sport.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
    if (n === 'futbol' || n === 'futbolito') return <SoccerIcon className={cls} />;
    if (n === 'padel') return <PadelIcon className={cls} />;
    if (n === 'tenis') return <TennisIcon className={cls} />;
    if (n === 'basquetbol') return <BasketballIcon className={cls} />;
    if (n === 'voleibol') return <VolleyballIcon className={cls} />;
    return <HugeiconsIcon icon={FootballPitchIcon} className={cls} strokeWidth={1.8} />;
};

const inputCls = "w-full mt-1.5 px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-black text-slate-900 dark:text-white outline-hidden focus:border-emerald-500 focus:ring-1 ring-emerald-500 transition-all";
const labelCls = "block text-[10px] font-black uppercase tracking-widest text-slate-400";

export default function CourtModal({
    isOpen,
    editingId,
    form,
    selectedSports,
    onClose,
    onFormChange,
    onToggleFeature,
    onSave
}: CourtModalProps) {
    if (!isOpen) return null;

    const valid = form.name.trim() !== '' && form.sport !== '' && form.surface !== '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-md shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar animate-fadeIn" onClick={e => e.stopPropagation()}>
                {/* HEADER */}
                <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0">
                            <HugeiconsIcon icon={FootballPitchIcon} className="w-5 h-5" strokeWidth={1.8} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-[#00df82] mb-0.5">{editingId ? 'Editar activo' : 'Nuevo activo'}</p>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">{editingId ? 'Editar Cancha' : 'Integrar Cancha'}</h3>
                        </div>
                    </div>
                    <button aria-label="Cerrar" onClick={onClose} className="p-2 bg-slate-100 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shrink-0">
                        <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-6 space-y-5">
                    <div>
                        <label className={labelCls}>Nombre de la cancha</label>
                        <input
                            type="text"
                            placeholder="Ej: Cancha Central"
                            value={form.name}
                            onChange={e => onFormChange('name', e.target.value)}
                            className={inputCls}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Deporte</label>
                            <div className="relative mt-1.5">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {form.sport ? sportIcon(form.sport, 'w-4 h-4 text-emerald-600 dark:text-[#00df82]') : <SoccerIcon className="w-4 h-4 text-slate-300" />}
                                </span>
                                <select
                                    value={form.sport}
                                    onChange={e => onFormChange('sport', e.target.value)}
                                    className={`${inputCls} pl-9 appearance-none cursor-pointer ${!form.sport ? 'text-slate-400' : ''}`}
                                >
                                    <option value="">Seleccionar...</option>
                                    {selectedSports.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Superficie</label>
                            <select
                                value={form.surface}
                                onChange={e => onFormChange('surface', e.target.value)}
                                className={`${inputCls} appearance-none cursor-pointer ${!form.surface ? 'text-slate-400' : ''}`}
                            >
                                <option value="">Seleccionar...</option>
                                {SURFACE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2.5">
                            <label className={labelCls}>Características</label>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-white/20">{form.features.length} seleccionadas</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            {COURT_FEATURES_LIST.map(feature => {
                                const active = form.features.includes(feature);
                                return (
                                    <label key={feature} className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-all ${active ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30'}`}>
                                        <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${active ? 'bg-emerald-500 dark:bg-[#00df82] border-emerald-500 dark:border-[#00df82]' : 'border-slate-300 dark:border-white/20'}`}>
                                            {active && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3 h-3 text-white dark:text-black" strokeWidth={2.5} />}
                                        </span>
                                        <input type="checkbox" className="hidden" checked={active} onChange={() => onToggleFeature(feature)} />
                                        <span className={`text-[9px] font-black uppercase tracking-tight ${active ? 'text-emerald-700 dark:text-[#00df82]' : 'text-slate-500 dark:text-slate-300'}`}>{feature}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="px-6 pb-6 pt-1 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={onSave}
                        disabled={!valid}
                        className="flex-1 py-3 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[10px] font-black uppercase tracking-widest rounded-md shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={2} />
                        {editingId ? 'Guardar Cambios' : 'Crear Cancha'}
                    </button>
                </div>
            </div>
        </div>
    );
}