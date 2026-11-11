"use client";
// Canchas › Infraestructura: horario semanal y tarifas por deporte, tipo de día y tramo horario.
// Solo edita en memoria; la pantalla guarda con "Sincronizar cambios".
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, Copy01Icon, MagicWand01Icon, Layers01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { PanelGlass } from "@/components/ui/DashboardWidgets";
import { referencePrice, setSlotPrices, type DayType, type DaySchedule, type SportPricing, type WeeklySchedule } from "@/utils/courtConfig";

export const DAYS_MAP: Record<string, string> = {
    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
    friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
};
export const DEFAULT_DAY_SCHEDULE: DaySchedule = { isOpen: true, open: '09:00', close: '23:00' };

const segBtn = (on: boolean, accent = false) => `rounded-md text-xs md:text-[10px] font-black uppercase transition-all ${on
    ? accent ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'bg-slate-900 dark:bg-[#00df82] text-white dark:text-black shadow-md'
    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`;
const toolBtn = "flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 rounded-md text-[11px] md:text-[9px] font-black uppercase tracking-widest hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all";

export default function OperationPanel({ schedule, onScheduleChange, sports, pricing, onPricingChange, timeSlots, notify }: {
    schedule: WeeklySchedule;
    onScheduleChange: (next: WeeklySchedule) => void;
    sports: string[];
    pricing: SportPricing;
    onPricingChange: (next: SportPricing) => void;
    timeSlots: string[];
    notify: (message: string, type?: 'success' | 'error') => void;
}) {
    const [tab, setTab] = useState<'horario' | 'tarifas'>('horario');
    const [pickedSport, setPickedSport] = useState('');
    const [dayType, setDayType] = useState<DayType>('weekday');
    // Si el deporte elegido se desactiva, se muestra el primero activo
    const sport = sports.includes(pickedSport) ? pickedSport : sports[0] || '';

    const setDay = (key: string, field: keyof DaySchedule, value: string | boolean) =>
        onScheduleChange({ ...schedule, [key]: { ...(schedule[key] || DEFAULT_DAY_SCHEDULE), [field]: value } });
    const copyMondayToAll = () => {
        const monday = schedule.monday || DEFAULT_DAY_SCHEDULE;
        onScheduleChange(Object.fromEntries(Object.keys(DAYS_MAP).map((d) => [d, { ...monday }])));
        notify("Horario del lunes copiado a todos los días");
    };
    const fill = (onlyMissing: boolean) => {
        const ref = referencePrice(pricing, sport, dayType, timeSlots);
        if (!ref) return notify("Define al menos un precio primero", 'error');
        onPricingChange(setSlotPrices(pricing, sport, dayType, timeSlots, ref, onlyMissing));
        notify(onlyMissing ? "Tramos faltantes completados" : "Precio aplicado a todos los tramos");
    };
    const copyDown = (index: number) => {
        const price = pricing[sport]?.[dayType]?.[timeSlots[index]] || 0;
        onPricingChange(setSlotPrices(pricing, sport, dayType, timeSlots.slice(index), price));
        notify("Tarifa replicada hacia abajo");
    };

    return (
        <PanelGlass className="overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 lg:px-7 py-4 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                    <span className="text-emerald-600 dark:text-[#00df82] shrink-0"><HugeiconsIcon icon={Settings01Icon} className="w-4 h-4" strokeWidth={1.8} /></span>
                    <div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white truncate font-heading">Operación y tarifas</h3>
                        <p className="text-xs md:text-[10px] font-bold text-slate-400 truncate">Horarios y precios por deporte</p>
                    </div>
                </div>
                <div role="tablist" className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 w-fit">
                    <button role="tab" aria-selected={tab === 'horario'} onClick={() => setTab('horario')} className={`px-5 py-2 ${segBtn(tab === 'horario')}`}>Horario</button>
                    <button role="tab" aria-selected={tab === 'tarifas'} onClick={() => setTab('tarifas')} className={`px-5 py-2 ${segBtn(tab === 'tarifas')}`}>Tarifas</button>
                </div>
            </div>
            <div className="p-4 sm:p-6 lg:p-7">
                {tab === 'horario' ? (
                    <div className="animate-fadeIn">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                            <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Disponibilidad semanal</p>
                            <button onClick={copyMondayToAll} className={toolBtn}>
                                <HugeiconsIcon icon={Copy01Icon} className="w-3.5 h-3.5" strokeWidth={2} /> Copiar lunes a todos
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {Object.entries(DAYS_MAP).map(([key, label]) => {
                                const day = schedule[key] || DEFAULT_DAY_SCHEDULE;
                                return (
                                    <div key={key} data-day={key} className={`p-4 rounded-md border transition-all ${day.isOpen ? 'border-emerald-500/30 bg-emerald-500/2 shadow-xs' : 'border-slate-200 dark:border-white/5'}`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className={`text-[11px] font-black uppercase tracking-tighter ${day.isOpen ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{label}{!day.isOpen && ' · cerrado'}</span>
                                            <button
                                                role="switch" aria-checked={day.isOpen} aria-label={`${label} abierto`}
                                                onClick={() => setDay(key, 'isOpen', !day.isOpen)}
                                                className={`w-9 h-5 rounded-full relative transition-all ${day.isOpen ? 'bg-emerald-500 dark:bg-[#00df82] shadow-lg shadow-emerald-500/20' : 'bg-slate-200 dark:bg-white/10'}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${day.isOpen ? 'right-0.5' : 'left-0.5'}`}></div>
                                            </button>
                                        </div>
                                        {day.isOpen && (
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <input type="time" aria-label={`${label} abre`} value={day.open} onChange={(e) => setDay(key, 'open', e.target.value)} className="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[11px] font-black outline-hidden focus:border-emerald-500 text-center text-slate-900 dark:text-white" />
                                                <input type="time" aria-label={`${label} cierra`} value={day.close} onChange={(e) => setDay(key, 'close', e.target.value)} className="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[11px] font-black outline-hidden focus:border-emerald-500 text-center text-slate-900 dark:text-white" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : sports.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Activa deportes para configurar tarifas</p>
                    </div>
                ) : (
                    <div className="animate-fadeIn space-y-6">
                        <div role="tablist" aria-label="Deporte" className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 w-fit">
                            {sports.map((s) => (
                                <button key={s} role="tab" aria-selected={sport === s} onClick={() => setPickedSport(s)} className={`px-5 py-2.5 ${segBtn(sport === s, true)}`}>{s}</button>
                            ))}
                        </div>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div role="tablist" aria-label="Tipo de día" className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-md w-fit border border-slate-200 dark:border-white/10">
                                <button role="tab" aria-selected={dayType === 'weekday'} onClick={() => setDayType('weekday')} className={`px-4 sm:px-6 py-2.5 ${segBtn(dayType === 'weekday')}`}>Lunes a viernes</button>
                                <button role="tab" aria-selected={dayType === 'weekend'} onClick={() => setDayType('weekend')} className={`px-4 sm:px-6 py-2.5 ${segBtn(dayType === 'weekend')}`}>Fines de semana</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => fill(true)} className={toolBtn}>
                                    <HugeiconsIcon icon={MagicWand01Icon} className="w-3.5 h-3.5" strokeWidth={2} /> Completar faltantes
                                </button>
                                <button onClick={() => fill(false)} className={toolBtn}>
                                    <HugeiconsIcon icon={Layers01Icon} className="w-3.5 h-3.5" strokeWidth={2} /> Aplicar a todos los tramos
                                </button>
                            </div>
                        </div>

                        {timeSlots.length === 0 ? (
                            <p className="py-8 text-center text-[11px] font-black uppercase text-slate-400 tracking-widest">Abre al menos un día en el horario para definir tarifas</p>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                {timeSlots.map((time, idx) => {
                                    const value = pricing[sport]?.[dayType]?.[time] || 0;
                                    const missing = !(value > 0);
                                    return (
                                        <div key={time} data-slot={time} className={`p-3 sm:p-4 bg-slate-50/50 dark:bg-white/2 rounded-md border relative group hover:border-emerald-500/30 transition-all ${missing ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-white/5'}`}>
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <label htmlFor={`price-${time}`} className="text-xs md:text-[10px] font-black text-slate-500 uppercase tracking-tighter">{time}</label>
                                                {missing && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] md:text-[8px] font-black uppercase text-amber-600 dark:text-amber-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Sin precio
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-400">$</span>
                                                <input
                                                    id={`price-${time}`} type="number" inputMode="numeric" min={0}
                                                    value={value || ''}
                                                    onChange={(e) => onPricingChange(setSlotPrices(pricing, sport, dayType, [time], Math.max(0, parseInt(e.target.value) || 0)))}
                                                    className={`w-full pl-6 pr-2 py-3 bg-white dark:bg-black/40 border rounded-md text-[11px] font-black outline-hidden focus:ring-1 ring-emerald-500 text-emerald-600 dark:text-[#00df82] ${missing ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-white/10'}`}
                                                    placeholder="0"
                                                />
                                            </div>
                                            {idx < timeSlots.length - 1 && (
                                                <button
                                                    onClick={() => copyDown(idx)}
                                                    aria-label={`Replicar el precio de las ${time} a los tramos siguientes`}
                                                    title="Replicar hacia abajo"
                                                    className="absolute -right-2 -bottom-2 w-7 h-7 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all shadow-xl z-10"
                                                >
                                                    <HugeiconsIcon icon={ArrowDown01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </PanelGlass>
    );
}
