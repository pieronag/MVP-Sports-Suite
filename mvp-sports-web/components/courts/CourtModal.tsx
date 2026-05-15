"use client";
import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0B0F19] rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg p-6 animate-fadeIn max-h-[90vh] overflow-y-auto custom-scrollbar">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-4">{editingId ? 'Editar Cancha' : 'Nueva Cancha'}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre</label>
                        <input 
                            type="text" 
                            placeholder="Ej: Cancha Central" 
                            value={form.name} 
                            onChange={e => onFormChange('name', e.target.value)} 
                            className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs" 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Deporte</label>
                            <select 
                                value={form.sport} 
                                onChange={e => onFormChange('sport', e.target.value)} 
                                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs appearance-none"
                            >
                                <option value="">Seleccionar...</option>
                                {selectedSports.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Superficie</label>
                            <select 
                                value={form.surface} 
                                onChange={e => onFormChange('surface', e.target.value)} 
                                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs appearance-none"
                            >
                                <option value="">Seleccionar...</option>
                                {SURFACE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Características</label>
                        <div className="grid grid-cols-2 gap-2">
                            {COURT_FEATURES_LIST.map(feature => (
                                <label key={feature} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${form.features.includes(feature) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-300'}`}>
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${form.features.includes(feature) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-white/30'}`}>{form.features.includes(feature) && <CheckCircleIcon className="w-3 h-3 text-white" />}</div>
                                    <input type="checkbox" className="hidden" checked={form.features.includes(feature)} onChange={() => onToggleFeature(feature)} />
                                    <span className={`text-[9px] font-bold uppercase text-slate-600 dark:text-slate-300`}>{feature}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="pt-2 flex gap-2">
                        <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-lg">Cancelar</button>
                        <button onClick={onSave} className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-emerald-700">{editingId ? 'Guardar Cambios' : 'Crear Cancha'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
