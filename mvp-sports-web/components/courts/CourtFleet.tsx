"use client";
// Flota de canchas del recinto: estado (activas / en mantenimiento), filtros por deporte y nombre, y acciones por cancha
import { pausedNow, maintenanceWindow} from "@/utils/courtConfig";
import { canonicalSport } from "@/utils/sports";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState} from 'react';
import {
    Add01Icon,
    Alert02Icon,
    CheckmarkCircle02Icon,
    Grid02Icon,
    PencilEdit02Icon,
    PuzzleIcon,
    Delete02Icon,
    Wrench01Icon,
    FootballIcon,
    Search01Icon,
    UmbrellaIcon,
    LightbulbIcon,
    BrickWallIcon,
    CircleDotIcon,
    Leaf01Icon,
    Sun01Icon,
    Video01Icon,
    Diamond01Icon,
} from '@hugeicons/core-free-icons';
import { SoccerIcon, PadelIcon, TennisIcon, BasketballIcon, VolleyballIcon } from '@/components/icons/SportsIcons';

import { PanelHeader} from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function CourtFleet({ courts, selectedSports, pricingMatrix, venueName, onCreate, onEdit, onMaintenance, onRestore, onDelete }: {
    courts: any[]; selectedSports: string[]; pricingMatrix: Record<string, any>; venueName: string;
    onCreate: () => void; onEdit: (c: any) => void; onMaintenance: (c: any) => void; onRestore: (id: string) => void; onDelete: (id: string) => void;
}) {
    const [filterSport, setFilterSport] = useState<string>('Todos');
    const [searchCourt, setSearchCourt] = useState<string>('');
    const normalizeSport = (str: string) => canonicalSport(str);
    const filteredCourts = courts.filter(c => (filterSport === 'Todos' ? true : normalizeSport(c.sport) === normalizeSport(filterSport)))
        .filter(c => searchCourt.trim() === '' ? true : c.name.toLowerCase().includes(searchCourt.trim().toLowerCase()));
    const sportOrder: any = {};
    selectedSports.forEach((s, i) => { sportOrder[normalizeSport(s)] = i; });
    const sortedCourts = [...filteredCourts].sort((a, b) => {
        const oa = sportOrder[normalizeSport(a.sport)] ?? 999;
        const ob = sportOrder[normalizeSport(b.sport)] ?? 999;
        if (oa !== ob) return oa - ob;
        const ma = a.status === 'maintenance' ? 1 : 0;
        const mb = b.status === 'maintenance' ? 1 : 0;
        if (ma !== mb) return ma - mb;
        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });

    const FEATURE_ICONS: any = {
        'Techada': UmbrellaIcon,
        'Iluminación LED': LightbulbIcon,
        'Muro Panorámico': BrickWallIcon,
        'Pista Central': CircleDotIcon,
        'Césped FIFA': Leaf01Icon,
        'Outdoor (Aire Libre)': Sun01Icon,
        'Grabación de Partidos': Video01Icon,
        'Cristal Templado': Diamond01Icon,
    };

    const courtsBySport = (sport: string) => courts.filter(c => normalizeSport(c.sport) === normalizeSport(sport)).length;
    const courtBasePrice = (sport: string) => {
        const anyPricing = pricingMatrix[sport] || {};
        // Ambas tablas por separado: al mezclarlas como objeto, el fin de semana
        // pisaba los precios de semana del mismo horario y el "Desde" salía mal.
        const prices = [...Object.values(anyPricing.weekday || {}), ...Object.values(anyPricing.weekend || {})].map(Number).filter(p => p > 0);
        return prices.length > 0 ? Math.min(...prices) : 0;
    };

    const formatPrice = (n: number) => n.toLocaleString('es-CL');

    const activeCount = courts.filter(c => !pausedNow(c)).length;
    const maintenanceCount = courts.length - activeCount;
    const noPriceSports = selectedSports.filter(s => courtBasePrice(s) === 0).length;
    const pctActive = courts.length > 0 ? Math.round((activeCount / courts.length) * 100) : 0;
    const pctMaint = courts.length > 0 ? Math.round((maintenanceCount / courts.length) * 100) : 0;

    return (
        <div className="lg:col-span-12 space-y-6 animate-fadeIn">
                        {/* HEADER + FLOTA + FILTROS */}
                        <div className="bg-white dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-white/5 overflow-hidden">
                            <PanelHeader
                                titulo="Unidades del recinto"
                                desc={`Canchas integradas en ${venueName}`}
                                icon={Grid02Icon}
                                action={
                                    <button onClick={onCreate} className="flex items-center justify-center gap-2.5 px-6 py-3 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-xs md:text-[10px] uppercase rounded-md shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all">
                                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> Integrar cancha
                                    </button>
                                }
                            />
                            <div className="p-6 lg:p-7 space-y-5">
                                {/* ESTADO DE LA FLOTA */}
                                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#00df82]"></span>
                                        <p className="text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Activas <span className="font-mono text-emerald-600 dark:text-[#00df82]">{activeCount}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                        <p className="text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">En pausa <span className="font-mono text-red-500">{maintenanceCount}</span></p>
                                    </div>
                                    {noPriceSports > 0 && (
                                        <div className="flex items-center gap-2.5 text-amber-500">
                                            <HugeiconsIcon icon={Alert02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                            <p className="text-xs md:text-[10px] font-black uppercase tracking-widest">{noPriceSports} deporte{noPriceSports > 1 ? 's' : ''} sin tarifa</p>
                                        </div>
                                    )}
                                    <div className="ml-auto flex items-center gap-4 min-w-[220px]">
                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-emerald-500 dark:bg-[#00df82] transition-all" style={{ width: `${pctActive}%` }} />
                                            <div className="h-full bg-red-500 transition-all" style={{ width: `${pctMaint}%` }} />
                                        </div>
                                        <span className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest">{sortedCourts.length} {sortedCourts.length === 1 ? 'cancha' : 'canchas'}</span>
                                    </div>
                                </div>

                                {/* FILTROS */}
                                <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-slate-100 dark:border-white/5">
                                    <span className="px-4 text-[11px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">Filtrar por deporte</span>
                                    <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
                                        <button onClick={() => setFilterSport('Todos')} className={`flex items-center gap-1.5 px-6 py-2.5 text-xs md:text-[10px] font-black uppercase rounded-md transition-all ${filterSport === 'Todos' ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>
                                            Todos <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] md:text-[8px] font-mono ${filterSport === 'Todos' ? 'bg-white/20 text-white' : 'bg-white dark:bg-white/10 text-slate-400'}`}>{courts.length}</span>
                                        </button>
                                        {selectedSports.map(s => <button key={s} onClick={() => setFilterSport(s)} className={`flex items-center gap-1.5 px-6 py-2.5 text-xs md:text-[10px] font-black uppercase rounded-md transition-all ${filterSport === s ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>
                                            {s} <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] md:text-[8px] font-mono ${filterSport === s ? 'bg-white/20 text-white' : 'bg-white dark:bg-white/10 text-slate-400'}`}>{courtsBySport(s)}</span>
                                        </button>)}
                                    </div>
                                    <div className="ml-auto flex items-center gap-3">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20"><HugeiconsIcon icon={Search01Icon} className="w-4 h-4" strokeWidth={2} /></span>
                                            <input
                                                type="text"
                                                value={searchCourt}
                                                onChange={e => setSearchCourt(e.target.value)}
                                                placeholder="Buscar cancha..."
                                                className="w-56 pl-9 pr-3 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-black outline-hidden focus:border-emerald-500 placeholder:text-slate-300 dark:placeholder:text-white/20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                            {sortedCourts.map(c => {
                                const sportAccent: any = {
                                    'Fútbol': 'bg-emerald-500', 'Futbolito': 'bg-emerald-400', 'Pádel': 'bg-orange-500',
                                    'Tenis': 'bg-sky-500', 'Básquetbol': 'bg-indigo-500', 'Vóleibol': 'bg-purple-500',
                                };
                                const sportTile: any = {
                                    'Fútbol': 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-[#00df82]', 'Futbolito': 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-500',
                                    'Pádel': 'bg-orange-50 dark:bg-orange-500/10 text-orange-500', 'Tenis': 'bg-sky-50 dark:bg-sky-500/10 text-sky-500',
                                    'Básquetbol': 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500', 'Vóleibol': 'bg-purple-50 dark:bg-purple-500/10 text-purple-500',
                                };
                                const accent = sportAccent[c.sport] || 'bg-slate-400';
                                const tile = sportTile[c.sport] || 'bg-slate-50 dark:bg-white/5 text-slate-400';
                                const courtSportIcon = (() => {
                                    const n = normalizeSport(c.sport);
                                    if (n === 'futbol' || n === 'futbolito') return <SoccerIcon className="w-5 h-5" />;
                                    if (n === 'padel') return <PadelIcon className="w-5 h-5" />;
                                    if (n === 'tenis') return <TennisIcon className="w-5 h-5" />;
                                    if (n === 'basquetbol') return <BasketballIcon className="w-5 h-5" />;
                                    if (n === 'voleibol') return <VolleyballIcon className="w-5 h-5" />;
                                    return <HugeiconsIcon icon={FootballIcon} className="w-5 h-5" strokeWidth={1.8} />;
                                })();
                                return (
                                <div key={c.id} className="bg-white dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-white/5 shadow-xs relative group hover:border-emerald-500/30 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none transition-all overflow-hidden flex flex-col">
                                    <div className={`h-1 w-full ${accent}`} />
                                    <div className="p-4 flex flex-col flex-1">
                                        {/* ESTADO + ACCIONES */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] md:text-[9px] font-black uppercase tracking-widest border ${c.status === 'maintenance' ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-500' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-[#00df82]'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'maintenance' ? 'bg-red-500' : 'bg-emerald-500 dark:bg-[#00df82]'}`} />
                                                {pausedNow(c) ? 'En pausa' : c.status === 'maintenance' ? 'Programada' : 'Activo'}
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => onEdit(c)} className="p-2 bg-slate-50 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-emerald-400/40 border border-transparent transition-all" title="Editar"><HugeiconsIcon icon={PencilEdit02Icon} className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => onDelete(c.id)} className="p-2 bg-slate-50 dark:bg-white/5 rounded-md text-slate-400 hover:text-red-500 border border-transparent transition-all" title="Eliminar"><HugeiconsIcon icon={Delete02Icon} className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>

                                        {/* IDENTIDAD */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${tile}`}>
                                                {courtSportIcon}
                                            </span>
                                            <div className="min-w-0">
                                                <h4 className="text-[14px] font-black text-slate-900 dark:text-white uppercase truncate tracking-tighter leading-none font-heading">{c.name}</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-[11px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">{c.sport}</span>
                                                    {courtBasePrice(c.sport) > 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-[#00df82] text-[11px] md:text-[8px] font-black font-mono">
                                                            Desde ${formatPrice(courtBasePrice(c.sport))}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] md:text-[8px] font-black uppercase">
                                                            <HugeiconsIcon icon={Alert02Icon} className="w-2.5 h-2.5" strokeWidth={2} /> Sin tarifa
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {c.status === 'maintenance' && c.maintenanceUntil && (
                                            <div className="mb-3 px-2.5 py-1.5 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                                                <p className="text-[11px] md:text-[9px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                                                    <HugeiconsIcon icon={Alert02Icon} className="w-3 h-3" strokeWidth={2} /> {maintenanceWindow(c)}
                                                </p>
                                            </div>
                                        )}

                                        {/* DATOS TÉCNICOS */}
                                        <div className="grid grid-cols-3 gap-2 py-3.5 border-t border-slate-100 dark:border-white/5">
                                            <div className="space-y-1">
                                                <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase">Superficie</p>
                                                <p className="text-[11px] md:text-[9px] font-black text-slate-600 dark:text-slate-300 truncate">{c.surface || '—'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase">Tarifa</p>
                                                <p className={`text-[11px] md:text-[9px] font-black font-mono truncate ${courtBasePrice(c.sport) > 0 ? 'text-emerald-600 dark:text-[#00df82]' : 'text-amber-500'}`}>
                                                    {courtBasePrice(c.sport) > 0 ? `$${formatPrice(courtBasePrice(c.sport))}` : 'Sin tarifa'}
                                                </p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase">ID</p>
                                                <p className="text-[11px] md:text-[9px] font-black text-slate-400 font-mono">#{c.id.slice(0, 4).toUpperCase()}</p>
                                            </div>
                                        </div>

                                        {(c.features || []).length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-3">
                                                {c.features.slice(0, 3).map((f: string) => (
                                                    <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs md:text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                                                        {FEATURE_ICONS[f] && <HugeiconsIcon icon={FEATURE_ICONS[f]} className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00df82]" strokeWidth={2} />} {f}
                                                    </span>
                                                ))}
                                                {c.features.length > 3 && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs md:text-[10px] font-bold text-slate-400 uppercase">+{c.features.length - 3}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* ACCIÓN */}
                                        <div className="mt-auto pt-4">
                                            {c.status === 'maintenance' ? (
                                                <button onClick={() => onRestore(c.id)} className="w-full py-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md text-[11px] md:text-[9px] font-black uppercase tracking-widest transition-all hover:brightness-110 flex items-center justify-center gap-2">
                                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5" strokeWidth={2} /> Restaurar
                                                </button>
                                            ) : (
                                                <button onClick={() => onMaintenance(c)} className="w-full py-2.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-300 rounded-md text-[11px] md:text-[9px] font-black uppercase tracking-widest transition-all hover:bg-red-500 hover:text-white flex items-center justify-center gap-2">
                                                    <HugeiconsIcon icon={Wrench01Icon} className="w-3.5 h-3.5" strokeWidth={2} /> Mantenimiento
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                            {sortedCourts.length === 0 && (
                                <div className="col-span-full py-32 text-center space-y-5">
                                    <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-md flex items-center justify-center mx-auto text-slate-300 border border-slate-200 dark:border-white/10">
                                        <HugeiconsIcon icon={PuzzleIcon} className="w-12 h-12" strokeWidth={1.4} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[13px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest leading-none">Cero canchas registradas</p>
                                        <p className="text-xs md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Agrega nuevas unidades para expandir tu infraestructura</p>
                                    </div>
                                    <button onClick={onCreate} className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-xs md:text-[10px] uppercase rounded-md shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all">
                                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> Integrar primera cancha
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
    );
}
