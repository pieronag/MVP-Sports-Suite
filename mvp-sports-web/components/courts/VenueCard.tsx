"use client";
import React from 'react';
import { 
    MapPinIcon, TrophyIcon, PuzzlePieceIcon, PhotoIcon, 
    ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

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

export default function VenueCard({ venue, onClick }: VenueCardProps) {
    const isConfigured = venue.activeSports && venue.activeSports.length > 0;

    return (
        <div 
            onClick={onClick} 
            className="group cursor-pointer bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-white/5 hover:border-emerald-500 hover:shadow-2xl transition-all overflow-hidden relative active:scale-[0.98]"
        >
            <div className="h-40 bg-slate-100 dark:bg-white/5 relative overflow-hidden">
                {venue.imageURL ? (
                    <img 
                        src={venue.imageURL} 
                        alt={venue.name} 
                        referrerPolicy="no-referrer" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10">
                        <PhotoIcon className="w-12 h-12 text-slate-300 dark:text-white/10" />
                    </div>
                )}
                <div className="absolute top-4 right-4">
                    {isConfigured ? (
                        <span className="px-3 py-1 bg-white/90 dark:bg-emerald-500/90 backdrop-blur-md text-emerald-600 dark:text-black text-[10px] font-black uppercase rounded-full flex items-center gap-1.5 shadow-xl border border-emerald-100 dark:border-emerald-400/30">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-black/40 animate-pulse"></span> Activo
                        </span>
                    ) : (
                        <span className="px-3 py-1 bg-white/90 dark:bg-amber-500/90 backdrop-blur-md text-amber-600 dark:text-black text-[10px] font-black uppercase rounded-full flex items-center gap-1.5 shadow-xl border border-amber-100 dark:border-amber-400/30">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Configurar
                        </span>
                    )}
                </div>
            </div>
            <div className="p-6">
                <h3 className="font-black text-slate-900 dark:text-white text-lg mb-1 uppercase tracking-tight leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {venue.name}
                </h3>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-5 font-medium leading-none">
                    <MapPinIcon className="w-4 h-4 text-emerald-500/50" /> {venue.address || "Sin dirección definida"}
                </p>
                <div className="flex items-center gap-6 text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-50 dark:border-white/5 pt-4">
                    <div className="flex items-center gap-2">
                        <TrophyIcon className="w-4 h-4 text-emerald-500" />
                        <span className="font-black dark:text-slate-300">{venue.activeSports?.length || 0}</span> 
                        <span className="uppercase tracking-widest font-bold opacity-60">Deportes</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <PuzzlePieceIcon className="w-4 h-4 text-emerald-500" />
                        <span className="font-black dark:text-slate-300">{venue.realCourtCount || 0}</span> 
                        <span className="uppercase tracking-widest font-bold opacity-60">Canchas</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
