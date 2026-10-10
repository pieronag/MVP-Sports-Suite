"use client";
import React from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    MapPinIcon,
    FootballIcon,
    FootballPitchIcon,
    Image01Icon,
    Alert02Icon,
    ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { SoccerIcon, PadelIcon, TennisIcon, BasketballIcon, VolleyballIcon } from '@/components/icons/SportsIcons';

interface Venue {
    id: string;
    name: string;
    address: string;
    imageURL?: string;
    activeSports: string[];
    realCourtCount?: number;
}

interface VenueCardProps {
    venue: Venue;
    onClick: () => void;
}

const sportIcon = (s: string, cls: string) => {
    const n = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (n === 'futbol' || n === 'futbolito') return <SoccerIcon className={cls} />;
    if (n === 'padel') return <PadelIcon className={cls} />;
    if (n === 'tenis') return <TennisIcon className={cls} />;
    if (n === 'basquetbol') return <BasketballIcon className={cls} />;
    if (n === 'voleibol') return <VolleyballIcon className={cls} />;
    return <HugeiconsIcon icon={FootballIcon} className={cls} strokeWidth={1.8} />;
};

export default function VenueCard({ venue, onClick }: VenueCardProps) {
    const isConfigured = venue.activeSports && venue.activeSports.length > 0;

    return (
        <div
            onClick={onClick}
            className="group cursor-pointer bg-white dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-white/5 hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-black/40 transition-all overflow-hidden relative active:scale-[0.98]"
        >
            {/* IMAGEN */}
            <div className="h-40 bg-slate-100 dark:bg-white/5 relative overflow-hidden">
                {venue.imageURL ? (
                    <img
                        src={venue.imageURL}
                        alt={venue.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10">
                        <HugeiconsIcon icon={Image01Icon} className="w-12 h-12 text-slate-300 dark:text-white/10" strokeWidth={1.4} />
                    </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />

                {/* BADGE ESTADO */}
                <div className="absolute top-3 right-3">
                    {isConfigured ? (
                        <span className="px-2.5 py-1 bg-white/90 dark:bg-[#00df82]/90 backdrop-blur-md text-emerald-700 dark:text-black text-[9px] font-black uppercase rounded-md flex items-center gap-1.5 shadow-lg border border-emerald-100 dark:border-[#00df82]/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-black/50 animate-pulse" /> Activo
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 bg-white/90 dark:bg-amber-500/90 backdrop-blur-md text-amber-600 dark:text-black text-[9px] font-black uppercase rounded-md flex items-center gap-1.5 shadow-lg border border-amber-100 dark:border-amber-400/30">
                            <HugeiconsIcon icon={Alert02Icon} className="w-3 h-3" strokeWidth={2} /> Configurar
                        </span>
                    )}
                </div>
            </div>

            {/* CONTENIDO */}
            <div className="p-5">
                <h3 className="font-black text-slate-900 dark:text-white text-lg mb-1 uppercase tracking-tight leading-tight font-heading group-hover:text-emerald-600 dark:group-hover:text-[#00df82] transition-colors">
                    {venue.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-4 font-medium leading-none">
                    <HugeiconsIcon icon={MapPinIcon} className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} /> {venue.address || "Sin dirección definida"}
                </p>

                {/* DEPORTES */}
                {(venue.activeSports || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                        {venue.activeSports.slice(0, 3).map(s => (
                            <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-white/5 text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase border border-slate-200 dark:border-white/10">
                                {sportIcon(s, 'w-3.5 h-3.5 text-emerald-600 dark:text-[#00df82]')} {s}
                            </span>
                        ))}
                        {venue.activeSports.length > 3 && (
                            <span className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-white/5 text-[9px] font-black text-slate-400 uppercase border border-slate-200 dark:border-white/10">+{venue.activeSports.length - 3}</span>
                        )}
                    </div>
                )}

                {/* MÉTRICAS */}
                <div className="flex items-center gap-8 text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-white/5 pt-5 mt-1">
                    <div className="flex items-center gap-2.5">
                        <HugeiconsIcon icon={FootballIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                        <span className="font-black text-slate-900 dark:text-white font-mono text-[13px]">{venue.activeSports?.length || 0}</span>
                        <span className="uppercase tracking-widest font-bold opacity-60">Deportes</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <HugeiconsIcon icon={FootballPitchIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                        <span className="font-black text-slate-900 dark:text-white font-mono text-[13px]">{venue.realCourtCount || 0}</span>
                        <span className="uppercase tracking-widest font-bold opacity-60">Canchas</span>
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-4">
                    <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-[#00df82] group-hover:gap-3 transition-all">
                        Gestionar infraestructura <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                    </span>
                </div>
            </div>
        </div>
    );
}