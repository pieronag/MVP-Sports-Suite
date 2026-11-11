"use client";
// Torneos: apariencia por deporte (color, ícono, configuración) y formato de montos
import React from 'react';
import { SoccerIcon, PadelIcon, TennisIcon, BasketballIcon, VolleyballIcon } from '@/components/icons/SportsIcons';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const TOURNAMENT_SPORTS = ['Fútbol', 'Pádel', 'Tenis', 'Básquetbol', 'Vóleibol'];
export const normalizeSportName = (str: string) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
export const sportIcon = (sport: string, cls: string) => {
    const n = normalizeSportName(sport);
    if (n === 'futbol' || n === 'futbolito') return <SoccerIcon className={cls} />;
    if (n === 'padel') return <PadelIcon className={cls} />;
    if (n === 'tenis') return <TennisIcon className={cls} />;
    if (n === 'basquetbol') return <BasketballIcon className={cls} />;
    if (n === 'voleibol') return <VolleyballIcon className={cls} />;
    return <PadelIcon className={cls} />;
};

// Configuración dinámica por deporte: cada disciplina cambia el equipo, duración,
// categorías, niveles y el formato recomendado.
export const SPORT_CONFIG: Record<string, any> = {
    'Fútbol': {
        teamSize: 7, matchDuration: 100, type: 'liga', category: 'libre', skillLevel: 'todo_competidor',
        teamSizes: [5, 7, 11],
        categories: [{ v: 'libre', l: 'Libre' }, { v: 'sub-18', l: 'Sub-18' }, { v: 'femenino', l: 'Femenino' }, { v: 'senior', l: 'Senior' }],
        levels: [{ v: 'todo_competidor', l: 'Todo competidor' }, { v: 'amateur', l: 'Amateur' }, { v: 'profesional', l: 'Profesional' }],
        matchHint: 'Duración del partido (2×25 min)',
        teamHint: 'Jugadores por equipo',
    },
    'Pádel': {
        teamSize: 2, matchDuration: 60, type: 'liga', category: 'libre', skillLevel: 'todo_competidor',
        teamSizes: [2],
        categories: [{ v: 'libre', l: 'Libre' }, { v: 'tercera', l: '3ª Categoría' }, { v: 'cuarta', l: '4ª Categoría' }, { v: 'femenino', l: 'Femenino' }],
        levels: [{ v: 'todo_competidor', l: 'Todo competidor' }, { v: 'principiante', l: 'Principiante' }, { v: 'avanzado', l: 'Avanzado' }],
        matchHint: 'Duración del partido (set a 6 juegos)',
        teamHint: 'Jugadores por equipo (parejas)',
    },
    'Tenis': {
        teamSize: 1, matchDuration: 90, type: 'eliminacion', category: 'libre', skillLevel: 'todo_competidor',
        teamSizes: [1, 2],
        categories: [{ v: 'libre', l: 'Libre' }, { v: 'sub-18', l: 'Sub-18' }, { v: 'femenino', l: 'Femenino' }, { v: 'senior', l: 'Senior' }],
        levels: [{ v: 'todo_competidor', l: 'Todo competidor' }, { v: 'amateur', l: 'Amateur' }, { v: 'profesional', l: 'Profesional' }],
        matchHint: 'Duración del partido (2-3 sets)',
        teamHint: 'Jugadores por equipo (singles/dobles)',
    },
    'Básquetbol': {
        teamSize: 5, matchDuration: 40, type: 'liga', category: 'libre', skillLevel: 'todo_competidor',
        teamSizes: [5],
        categories: [{ v: 'libre', l: 'Libre' }, { v: 'sub-18', l: 'Sub-18' }, { v: 'femenino', l: 'Femenino' }, { v: 'senior', l: 'Senior' }],
        levels: [{ v: 'todo_competidor', l: 'Todo competidor' }, { v: 'amateur', l: 'Amateur' }, { v: 'profesional', l: 'Profesional' }],
        matchHint: 'Duración del partido (4×10 min)',
        teamHint: 'Jugadores por equipo',
    },
    'Vóleibol': {
        teamSize: 6, matchDuration: 75, type: 'liga', category: 'libre', skillLevel: 'todo_competidor',
        teamSizes: [6],
        categories: [{ v: 'libre', l: 'Libre' }, { v: 'sub-18', l: 'Sub-18' }, { v: 'femenino', l: 'Femenino' }, { v: 'senior', l: 'Senior' }],
        levels: [{ v: 'todo_competidor', l: 'Todo competidor' }, { v: 'amateur', l: 'Amateur' }, { v: 'profesional', l: 'Profesional' }],
        matchHint: 'Duración del partido (sets a 25)',
        teamHint: 'Jugadores por equipo',
    },
};
export const getSportConfig = (sport: string) => SPORT_CONFIG[sport] || SPORT_CONFIG['Pádel'];

export const sportStyle = (sport: string) => {
    const map: any = {
        'Fútbol': { gradient: 'from-emerald-500 to-teal-600', chip: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border-emerald-100 dark:border-emerald-500/20' },
        'Futbolito': { gradient: 'from-emerald-500 to-lime-600', chip: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border-emerald-100 dark:border-emerald-500/20' },
        'Pádel': { gradient: 'from-orange-500 to-amber-600', chip: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 border-orange-100 dark:border-orange-500/20' },
        'Tenis': { gradient: 'from-sky-500 to-blue-600', chip: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 border-sky-100 dark:border-sky-500/20' },
        'Básquetbol': { gradient: 'from-red-500 to-rose-600', chip: 'bg-red-50 dark:bg-red-500/10 text-red-600 border-red-100 dark:border-red-500/20' },
        'Vóleibol': { gradient: 'from-yellow-500 to-amber-600', chip: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 border-yellow-100 dark:border-yellow-500/20' },
    };
    return map[sport] || { gradient: 'from-amber-500 to-orange-600', chip: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 border-amber-100 dark:border-amber-500/20' };
};

// --- INTERFACES ---


export const formatCLP = (n: number) => n.toLocaleString('es-CL');
