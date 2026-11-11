"use client";
// Flujo del fixture de un torneo: validación, sorteo animado, emparejamientos y revisión (cuadro, calendario y posiciones)
import { shuffle, generateFixture, stageName, standings } from "@/utils/fixture";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/services/client/firebase';
import { doc, updateDoc} from 'firebase/firestore';
import {
    BarChartIcon,
    Cancel01Icon,
    CheckmarkCircle02Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    RefreshIcon,
    ShieldCheckIcon,
    TrophyIcon,
    UserGroupIcon,
    } from '@hugeicons/core-free-icons';
import ModalPortal from '@/components/ui/ModalPortal';

import { sportIcon, sportStyle, formatCLP } from "./sport";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function FixtureFlow({ tournament, onClose, onSaved }: { tournament: any; onClose: () => void; onSaved: () => void }) {
    // FIXTURE / DRAW
    const [fixtureModal, setFixtureModal] = useState<any>(() => {
        const t = tournament;
        if (t.fixture) return { isOpen: true, tournament: t, step: 'review', fixtureData: t.fixture, selectedRound: 1, view: 'calendar' };
        const teams = t.teams || [];
        const validations = [
            { label: "Equipos Mínimos (2)", ok: teams.length >= 2 },
            { label: "Cupos Completos", ok: teams.length >= t.maxTeams },
            { label: "Configuración de Premios", ok: !!t.prize1 }
        ];
        return { isOpen: true, tournament: t, step: 'validation', validations, selectedRound: 1, view: 'calendar' };
    });
    const [isPairsModalOpen, setIsPairsModalOpen] = useState(false);
    const [drawAnimation, setDrawAnimation] = useState<any>({
        isDrawing: false, remainingTeams: [], drawnTeams: [],
        currentPair: [null, null], completedMatches: [], revealed: false
    });
    const [reel, setReel] = useState<{ phase: 'idle' | 'spinning' | 'blink', name: string | null }>({ phase: 'idle', name: null });
    const spinRef = useRef<number | null>(null);
    const spinTimeoutRef = useRef<number | null>(null);
    const spinTimeoutRef2 = useRef<number | null>(null);

    const handleGenerateFixture = () => {
        const teams = shuffle(fixtureModal.tournament.teams || []);
        setDrawAnimation({ isDrawing: true, remainingTeams: teams, drawnTeams: [], currentPair: [null, null], completedMatches: [], revealed: false });
        setFixtureModal((prev: any) => ({ ...prev, step: 'draw' }));
    };

    const pickBall = () => {
        const names = drawAnimation.remainingTeams.map((t: any) => t.name);
        if (reel.phase !== 'idle' || drawAnimation.revealed || names.length === 0) return;
        const ball = drawAnimation.remainingTeams[0];
        setReel({ phase: 'spinning', name: null });
        let i = 0;
        spinRef.current = window.setInterval(() => {
            setReel({ phase: 'spinning', name: names[i % names.length] });
            i++;
        }, 130);
        // Fase 1: ~5s de giro (tragamonedas)
        spinTimeoutRef.current = window.setTimeout(() => {
            if (spinRef.current) window.clearInterval(spinRef.current);
            // Fase 2: ~5s parpadeando el equipo sorteado
            setReel({ phase: 'blink', name: ball?.name || null });
            spinTimeoutRef2.current = window.setTimeout(() => {
                // Fase 3: el equipo va a su lugar en el VS
                setDrawAnimation((prev: any) => {
                    const rem = [...prev.remainingTeams];
                    const b = rem.shift();
                    const pair = [...prev.currentPair];
                    if (!pair[0]) pair[0] = b.name; else pair[1] = b.name;
                    const complete = !!pair[0] && !!pair[1];
                    return {
                        ...prev, remainingTeams: rem, drawnTeams: [...prev.drawnTeams, b],
                        currentPair: pair,
                        completedMatches: complete ? [...prev.completedMatches, { t1: pair[0], t2: pair[1] }] : prev.completedMatches,
                        revealed: complete ? true : prev.revealed
                    };
                });
                setReel({ phase: 'idle', name: null });
            }, 5000);
        }, 5000);
    };

    const nextPair = () => {
        setDrawAnimation((prev: any) => ({ ...prev, revealed: false, currentPair: [null, null] }));
    };

    useEffect(() => {
        return () => {
            if (spinRef.current) window.clearInterval(spinRef.current);
            if (spinTimeoutRef.current) window.clearTimeout(spinTimeoutRef.current);
            if (spinTimeoutRef2.current) window.clearTimeout(spinTimeoutRef2.current);
        };
    }, []);

    const handleFinalizeDraw = async () => {
        const res = generateFixture(fixtureModal.tournament.type, drawAnimation.drawnTeams);
        setFixtureModal((prev: any) => ({ ...prev, step: 'review', fixtureData: res }));
        await updateDoc(doc(db, "tournaments", fixtureModal.tournament.id), { fixture: res, status: 'active' });
        onSaved();
    };

    const teamInitials = (name: string) => name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

    return (
        <>
            {/* MODAL FIXTURE */}
            {fixtureModal.isOpen && (
                <ModalPortal>
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn" onClick={() => onClose()}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#0B0F19] w-full max-w-6xl rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh]">
                        {/* HEADER */}
                        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                    <HugeiconsIcon icon={TrophyIcon} className="w-5 h-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5">Panel de competición</p>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">{fixtureModal.tournament?.name}</h3>
                                </div>
                            </div>
                            <button aria-label="Cerrar" onClick={() => onClose()} className="p-2 bg-slate-100 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shrink-0">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>

                        {/* STEPPER */}
                        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/40 dark:bg-white/1">
                            {[
                                { key: 'validation', label: 'Validación', icon: ShieldCheckIcon },
                                { key: 'draw', label: 'Sorteo', icon: RefreshIcon },
                                { key: 'review', label: 'Fixture', icon: TrophyIcon },
                            ].map((s, i) => {
                                const order = ['validation', 'draw', 'review'];
                                const cur = fixtureModal.step === s.key;
                                const done = order.indexOf(fixtureModal.step) > i;
                                return (
                                    <div key={s.key} className="flex items-center gap-3 flex-1">
                                        <div className={`flex items-center gap-2.5 ${cur ? 'text-amber-500' : done ? 'text-emerald-500 dark:text-[#00df82]' : 'text-slate-300 dark:text-white/20'}`}>
                                            <div className={`w-9 h-9 rounded-md flex items-center justify-center border transition-all ${done ? 'bg-emerald-500 border-emerald-500 text-white' : cur ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/25' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                                                {done ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" /> : <HugeiconsIcon icon={s.icon} className="w-4 h-4" strokeWidth={2} />}
                                            </div>
                                            <div className="leading-tight">
                                                <p className={`text-xs md:text-[10px] font-black uppercase tracking-widest ${cur || done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{s.label}</p>
                                                <p className="text-[11px] md:text-[8px] font-bold uppercase tracking-widest text-slate-400">{done ? 'Completado' : cur ? 'En curso' : `Paso ${i + 1}`}</p>
                                            </div>
                                        </div>
                                        {i < 2 && <div className={`flex-1 h-px ${done ? 'bg-emerald-500 dark:bg-[#00df82]' : 'bg-slate-200 dark:bg-white/10'}`} />}
                                    </div>
                                );
                            })}
                        </div>

                        {/* CONTENIDO (altura estable) */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-[540px] flex flex-col">
                            {/* HERO DEL TORNEO (solo en validación; sorteo y fixture usan todo el espacio) */}
                            {fixtureModal.step === 'validation' && (
                            <div className={`relative overflow-hidden rounded-md bg-linear-to-br ${sportStyle(fixtureModal.tournament?.sport).gradient} p-6 mb-6 shrink-0`}>
                                <div className="absolute -right-6 -bottom-10 opacity-10">{sportIcon(fixtureModal.tournament?.sport, 'w-32 h-32 text-white')}</div>
                                <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-white/80 mb-1">Fixture del torneo</p>
                                        <h2 className="text-lg font-black uppercase text-white tracking-tight font-heading">{fixtureModal.tournament?.name}</h2>
                                        <p className="text-[11px] md:text-[9px] font-bold text-white/90 uppercase mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                            <span className="flex items-center gap-1.5"><HugeiconsIcon icon={TrophyIcon} className="w-3 h-3" /> {fixtureModal.tournament?.sport || 'Deporte'}</span>
                                            <span className="flex items-center gap-1.5"><HugeiconsIcon icon={BarChartIcon} className="w-3 h-3" /> {fixtureModal.tournament?.type === 'liga' ? 'Liga' : fixtureModal.tournament?.type === 'eliminacion' ? 'Eliminación directa' : 'Grupos + Playoffs'}</span>
                                            <span className="flex items-center gap-1.5"><HugeiconsIcon icon={UserGroupIcon} className="w-3 h-3" /> {(fixtureModal.tournament?.teams?.length || 0)} equipos</span>
                                        </p>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <div className="px-4 py-2.5 rounded-md bg-white/15 backdrop-blur-md border border-white/25 text-center min-w-[90px]">
                                            <p className="text-[11px] md:text-[8px] font-black uppercase text-white/80 tracking-widest">Premio 1°</p>
                                            <p className="text-[11px] font-black text-white truncate max-w-[140px] uppercase">{fixtureModal.tournament?.prize1 || '---'}</p>
                                        </div>
                                        <div className="px-4 py-2.5 rounded-md bg-white/15 backdrop-blur-md border border-white/25 text-center min-w-[90px]">
                                            <p className="text-[11px] md:text-[8px] font-black uppercase text-white/80 tracking-widest">Inscripción</p>
                                            <p className="text-[11px] font-black text-white font-mono">${formatCLP(Number(fixtureModal.tournament?.price) || 0)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            )}

                            {/* ===== VALIDACIÓN ===== */}
                            {fixtureModal.step === 'validation' && (
                                <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full space-y-6 py-4 animate-fadeIn">
                                    <div className="text-center space-y-1.5">
                                        <p className="text-xs md:text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Estado del torneo</p>
                                        <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">Preparando el panel de competición</h4>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { icon: UserGroupIcon, value: `${fixtureModal.tournament?.teams?.length || 0} / ${fixtureModal.tournament?.maxTeams || 0}`, label: 'Equipos', ok: !!(fixtureModal.validations[1]?.ok) },
                                            { icon: BarChartIcon, value: fixtureModal.tournament?.type === 'liga' ? 'Liga' : fixtureModal.tournament?.type === 'eliminacion' ? 'Eliminación' : 'Grupos', label: 'Formato', ok: true },
                                            { icon: ShieldCheckIcon, value: fixtureModal.tournament?.prize1 ? 'Listo' : 'Pendiente', label: 'Premios', ok: !!(fixtureModal.validations[2]?.ok) },
                                        ].map((s, i) => (
                                            <div key={i} className={`relative p-4 rounded-md border text-center transition-all ${s.ok ? 'border-emerald-500/30 bg-emerald-500/3' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/2'}`}>
                                                {s.ok && (
                                                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 dark:bg-[#00df82] flex items-center justify-center">
                                                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3 h-3 text-white dark:text-black" strokeWidth={2.5} />
                                                    </span>
                                                )}
                                                <div className={`w-9 h-9 mx-auto mb-2 rounded-md flex items-center justify-center transition-all ${s.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82]' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    <HugeiconsIcon icon={s.icon} className="w-4 h-4" strokeWidth={1.8} />
                                                </div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white font-mono leading-none">{s.value}</p>
                                                <p className="text-[11px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1.5">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <button disabled={!fixtureModal.validations.every((v: any) => v.ok)} onClick={handleGenerateFixture} className="w-full bg-amber-500 text-white py-4 rounded-md text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5">
                                        <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4" /> Iniciar Sorteo de Bolillas
                                    </button>
                                </div>
                            )}

                            {/* ===== SORTEO ===== */}
                            {fixtureModal.step === 'draw' && (() => {
                                const st = sportStyle(fixtureModal.tournament?.sport);
                                const totalBalls = drawAnimation.drawnTeams.length + drawAnimation.remainingTeams.length;
                                return (
                                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full space-y-6 animate-fadeIn">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs md:text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Sorteo de bolillas</p>
                                            <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading mt-1">Emparejamiento en vivo</h4>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <div className="px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-[#00df82] text-xs md:text-[10px] font-black uppercase">
                                                {drawAnimation.completedMatches.length} emparejados
                                            </div>
                                            <div className="px-3 py-2 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 text-xs md:text-[10px] font-black uppercase">
                                                {drawAnimation.remainingTeams.length} por sortear
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-linear-to-r from-amber-500 to-orange-500 transition-all duration-500" style={{ width: `${(drawAnimation.drawnTeams.length / Math.max(drawAnimation.drawnTeams.length + drawAnimation.remainingTeams.length, 1)) * 100}%` }} />
                                    </div>

                                    {/* MESA DE SORTEO (COLOR DEL DEPORTE) */}
                                    <div className={`relative overflow-hidden rounded-md border border-white/20 bg-linear-to-br ${st.gradient} p-6 shadow-2xl`}>
                                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-white/10 blur-[80px] pointer-events-none" />
                                        <div className="absolute -bottom-24 right-0 w-72 h-72 rounded-full bg-white/10 blur-[80px] pointer-events-none" />

                                        <div className="relative z-10 space-y-6">
                                            {/* TOP STRIP */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-md bg-white/20 border border-white/30 flex items-center justify-center text-white">
                                                        <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4" strokeWidth={2} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs md:text-[10px] font-black uppercase tracking-[0.3em] text-white font-heading">Mesa de sorteo</p>
                                                        <p className="text-[11px] md:text-[8px] font-bold uppercase tracking-widest text-white/70">Emparejamiento automático en vivo</p>
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1.5 rounded-md bg-white/15 border border-white/25 text-white text-[11px] md:text-[9px] font-black uppercase tracking-widest">
                                                    {drawAnimation.drawnTeams.length} / {totalBalls} bolillas
                                                </span>
                                            </div>

                                            {/* ESCENARIO DE EMPAREJAMIENTO */}
                                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6">
                                                {/* SLOT 1 */}
                                                <div className={`rounded-lg border-2 p-5 text-center transition-all duration-300 ${drawAnimation.currentPair[0] ? 'border-white/70 bg-white text-slate-900 shadow-xl shadow-black/10' : 'border-dashed border-white/40 bg-white/10'}`}>
                                                    {drawAnimation.currentPair[0] ? (
                                                        <div className="space-y-2 animate-fadeIn">
                                                            <div className={`w-14 h-14 mx-auto rounded-full bg-linear-to-br ${st.gradient} flex items-center justify-center text-white text-sm font-black font-heading shadow-lg`}>
                                                                {teamInitials(drawAnimation.currentPair[0])}
                                                            </div>
                                                            <p className="text-slate-900 font-black uppercase text-sm truncate font-heading">{drawAnimation.currentPair[0]}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <div className="w-14 h-14 mx-auto rounded-full border-2 border-dashed border-white/40 flex items-center justify-center text-white/50 text-xl font-black">?</div>
                                                            <p className="text-white/60 font-black uppercase text-[11px] md:text-[9px] tracking-widest">Esperando equipo</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* VS */}
                                                <div className="flex flex-col items-center gap-2 shrink-0">
                                                    <div className="w-12 h-12 rounded-full bg-white text-slate-900 font-black text-sm flex items-center justify-center shadow-xl">VS</div>
                                                    <p className="text-[11px] md:text-[8px] font-black uppercase text-white/70 tracking-widest">Partido</p>
                                                </div>

                                                {/* SLOT 2 */}
                                                <div className={`rounded-lg border-2 p-5 text-center transition-all duration-300 ${drawAnimation.currentPair[1] ? 'border-white/70 bg-white text-slate-900 shadow-xl shadow-black/10' : 'border-dashed border-white/40 bg-white/10'}`}>
                                                    {drawAnimation.currentPair[1] ? (
                                                        <div className="space-y-2 animate-fadeIn">
                                                            <div className={`w-14 h-14 mx-auto rounded-full bg-linear-to-br ${st.gradient} flex items-center justify-center text-white text-sm font-black font-heading shadow-lg`}>
                                                                {teamInitials(drawAnimation.currentPair[1])}
                                                            </div>
                                                            <p className="text-slate-900 font-black uppercase text-sm truncate font-heading">{drawAnimation.currentPair[1]}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <div className="w-14 h-14 mx-auto rounded-full border-2 border-dashed border-white/40 flex items-center justify-center text-white/50 text-xl font-black">?</div>
                                                            <p className="text-white/60 font-black uppercase text-[11px] md:text-[9px] tracking-widest">Esperando equipo</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ACCIÓN: PAR CONFIRMADO (manual) O TRAGAMONEDAS */}
                                            {drawAnimation.revealed ? (
                                                <div className="flex flex-col items-center gap-3.5">
                                                    <div className="px-6 py-3 rounded-md bg-white/15 backdrop-blur-md border border-white/30 flex items-center gap-3 text-white animate-fadeIn">
                                                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5" strokeWidth={2} />
                                                        <p className="text-[11px] font-black uppercase tracking-widest">¡Partido #{drawAnimation.completedMatches.length} confirmado!</p>
                                                    </div>
                                                    {drawAnimation.remainingTeams.length > 0 ? (
                                                        <button onClick={nextPair} className="px-12 py-4 rounded-full bg-white text-slate-900 font-black text-[11px] uppercase tracking-[0.25em] shadow-xl hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-3">
                                                            Siguiente Sorteo <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <button onClick={handleFinalizeDraw} className="px-12 py-4 rounded-full bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[11px] uppercase tracking-[0.25em] shadow-xl shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition-all flex items-center gap-3">
                                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5" /> Confirmar Fixture y Lanzar Torneo
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-4 w-full">
                                                    {/* TRAGAMONEDAS */}
                                                    <div className="relative w-full max-w-md">
                                                        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-transparent via-white/70 to-transparent rounded-full" />
                                                        <div className="relative rounded-lg border-2 border-white/30 bg-black/50 backdrop-blur-sm px-6 py-4 text-center overflow-hidden shadow-inner">
                                                            <div className="absolute inset-0 bg-linear-to-b from-white/5 via-transparent to-white/10 pointer-events-none" />
                                                            <p className="relative text-[11px] md:text-[8px] font-black uppercase tracking-[0.3em] text-white/60 mb-1">Bolillero tragamonedas</p>
                                                            <div className="relative h-16 flex items-center justify-center">
                                                                {reel.phase === 'spinning' ? (
                                                                    <div key={reel.name || 'spin'} className="text-3xl font-black uppercase text-white font-heading animate-pulse">{reel.name || '•••'}</div>
                                                                ) : reel.phase === 'blink' ? (
                                                                    <div className="relative">
                                                                        <div className="absolute inset-0 m-auto w-44 h-44 bg-amber-400/20 rounded-full blur-2xl animate-pulse pointer-events-none" />
                                                                        <div className="text-3xl font-black uppercase text-white font-heading animate-pulse drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]">{reel.name}</div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-3xl font-black uppercase text-white/25 font-heading">?</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-transparent via-white/70 to-transparent rounded-full" />
                                                    </div>

                                                    <button onClick={pickBall} disabled={reel.phase !== 'idle' || drawAnimation.remainingTeams.length === 0} className="px-14 py-4 rounded-full bg-white text-slate-900 font-black text-[11px] uppercase tracking-[0.25em] shadow-[0_0_45px_rgba(255,255,255,0.4)] hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-3">
                                                        {reel.phase === 'spinning' ? <><HugeiconsIcon icon={RefreshIcon} className="w-5 h-5 animate-spin" /> Sorteando...</> : reel.phase === 'blink' ? <><HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5" /> ¡{reel.name} confirmado!</> : <><HugeiconsIcon icon={RefreshIcon} className="w-5 h-5" /> Sacar Bolilla</>}
                                                    </button>

                                                    <div className="flex flex-wrap gap-1.5 justify-center max-w-xl mx-auto">
                                                        {drawAnimation.remainingTeams.map((t: any, i: number) => (
                                                            <div key={i} className={`w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[11px] md:text-[8px] font-black text-white/80 transition-all hover:bg-white/35 ${reel.phase !== 'idle' ? 'animate-pulse' : ''}`} title={t.name}>{teamInitials(t.name)}</div>
                                                        ))}
                                                        {drawAnimation.remainingTeams.length === 0 && <p className="text-xs md:text-[10px] font-black uppercase text-white/70 tracking-widest">Todas las bolillas fueron sacadas</p>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* EMPAREJAMIENTOS (abre modal) */}
                                    <button onClick={() => setIsPairsModalOpen(true)} className="w-full flex items-center justify-between px-5 py-4 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-xs hover:border-amber-400/50 hover:shadow-md transition-all active:scale-[0.99]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                                <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" strokeWidth={1.8} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-tight">Emparejamientos en curso</p>
                                                <p className="text-[11px] md:text-[8px] font-bold uppercase text-slate-400 tracking-widest">Ver los partidos formados</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 text-xs md:text-[10px] font-black font-mono">{drawAnimation.completedMatches.length}</span>
                                            <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-slate-400" />
                                        </div>
                                    </button>

                                    {!drawAnimation.revealed && drawAnimation.remainingTeams.length === 0 && (
                                        <button onClick={handleFinalizeDraw} className="w-full max-w-xl mx-auto block bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black py-4 rounded-md text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2.5">
                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" /> Confirmar Fixture y Lanzar Torneo
                                        </button>
                                    )}
                                </div>
                                );
                            })()}

                            {/* ===== REVISIÓN ===== */}
                            {fixtureModal.step === 'review' && (() => {
                                const isKnockout = fixtureModal.tournament?.type === 'eliminacion';
                                const totalRounds = fixtureModal.fixtureData?.totalRounds || 1;
                                const roundMatches = (r: number) => (fixtureModal.fixtureData?.matches || []).filter((m: any) => m.round === r);
                                const st = sportStyle(fixtureModal.tournament?.sport);
                                return (
                                    <div className="flex-1 flex flex-col space-y-6 animate-fadeIn">
                                        {/* RESUMEN DEL TORNEO */}
                                        <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/2 shrink-0">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className={`w-11 h-11 rounded-md bg-linear-to-br ${st.gradient} flex items-center justify-center text-white shrink-0`}>
                                                    {sportIcon(fixtureModal.tournament?.sport, 'w-6 h-6')}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5">Fixture del torneo</p>
                                                    <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white truncate font-heading">{fixtureModal.tournament?.name}</h3>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] md:text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                                                    <HugeiconsIcon icon={UserGroupIcon} className="w-3 h-3" /> {(fixtureModal.tournament?.teams?.length || 0)} equipos
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] md:text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                                                    <HugeiconsIcon icon={BarChartIcon} className="w-3 h-3" /> {isKnockout ? 'Eliminación' : fixtureModal.tournament?.type === 'liga' ? 'Liga' : 'Grupos + Playoffs'}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] md:text-[9px] font-black uppercase">
                                                    <HugeiconsIcon icon={TrophyIcon} className="w-3 h-3" /> {fixtureModal.tournament?.prize1 || 'Sin premio'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-1 w-fit border-b border-slate-100 dark:border-white/10 shrink-0">
                                            {[
                                                { key: 'calendar', label: 'Calendario' },
                                                { key: 'bracket', label: isKnockout ? 'Cuadro' : 'Rondas' },
                                                { key: 'standings', label: 'Posiciones' },
                                            ].map(t => {
                                                const count = t.key === 'calendar' ? roundMatches(fixtureModal.selectedRound).length : t.key === 'bracket' ? (fixtureModal.fixtureData?.matches?.length || 0) : (standings(fixtureModal.fixtureData?.matches || []).length);
                                                return (
                                                    <button key={t.key} onClick={() => setFixtureModal((p: any) => ({ ...p, view: t.key }))} className={`pb-2.5 px-5 text-xs md:text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${fixtureModal.view === t.key ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>
                                                        {t.label}
                                                        <span className={`px-1.5 py-0.5 rounded-md text-[11px] md:text-[8px] font-black font-mono ${fixtureModal.view === t.key ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>{count}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* CUADRO / RONDAS */}
                                        {fixtureModal.view === 'bracket' && (
                                            <div className="flex-1 flex gap-5 overflow-x-auto pb-4 pt-2 custom-scrollbar items-stretch">
                                                {Array.from({ length: totalRounds }).map((_, ri) => {
                                                    const round = ri + 1;
                                                    const matches = roundMatches(round);
                                                    return (
                                                        <div key={round} className={`min-w-[240px] shrink-0 flex flex-col ${ri > 0 ? 'border-l-2 border-dashed border-amber-200/50 dark:border-amber-500/20 pl-5' : ''}`}>
                                                            <div className="text-center mb-4 shrink-0">
                                                                <p className="text-xs md:text-[10px] font-black uppercase tracking-widest text-amber-600 font-heading">{isKnockout ? stageName(totalRounds, round) : `Jornada ${round}`}</p>
                                                                <p className="text-[11px] md:text-[8px] font-black uppercase text-slate-400 font-mono">{matches.length} partidos</p>
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-center gap-3">
                                                                {matches.map((m: any, i: number) => (
                                                                    <div key={i} className="bg-white dark:bg-[#0B0F19] rounded-md border border-slate-200 dark:border-white/10 shadow-xs overflow-hidden transition-all hover:border-amber-500/40">
                                                                        <div className={`h-1 w-full ${m.status === 'finished' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                                        <div className="p-3 space-y-2">
                                                                            <div className={`flex items-center justify-between gap-2 text-xs md:text-[10px] font-bold uppercase ${m.score1 != null && m.score1 > (m.score2 ?? -1) ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                                                                <span className="truncate">{m.team1_name}</span>
                                                                                <span className="font-mono font-black">{m.score1 ?? '-'}</span>
                                                                            </div>
                                                                            <div className="h-px bg-slate-100 dark:bg-white/10" />
                                                                            <div className={`flex items-center justify-between gap-2 text-xs md:text-[10px] font-bold uppercase ${m.score2 != null && m.score2 > (m.score1 ?? -1) ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                                                                <span className="truncate">{m.team2_name}</span>
                                                                                <span className="font-mono font-black">{m.score2 ?? '-'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* CALENDARIO */}
                                        {fixtureModal.view === 'calendar' && (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                                    {roundMatches(fixtureModal.selectedRound).map((match: any, idx: number) => (
                                                        <div key={idx} className="bg-white dark:bg-[#0B0F19] p-5 rounded-md border border-slate-200 dark:border-white/10 shadow-xs space-y-4 transition-transform hover:scale-[1.02]">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">#{idx + 1}{match.stage ? ` · ${match.stage}` : ''}{match.group ? ` · ${match.group}` : ''}</span>
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] md:text-[8px] font-black uppercase ${match.status === 'finished' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-[#00df82]' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${match.status === 'finished' ? 'bg-emerald-500' : 'bg-amber-500'}`} /> {match.status === 'finished' ? 'Finalizado' : 'Próximamente'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex-1 text-center space-y-1.5">
                                                                    <div className={`w-12 h-12 rounded-md mx-auto flex items-center justify-center text-xs md:text-[10px] font-black shadow-inner transition-all ${match.score1 != null && match.score1 > (match.score2 ?? -1) ? 'bg-emerald-500 text-white dark:bg-[#00df82] dark:text-black' : 'bg-slate-50 dark:bg-white/5 text-slate-500'}`}>{teamInitials(match.team1_name)}</div>
                                                                    <p className="text-[11px] md:text-[9px] font-bold uppercase truncate text-slate-900 dark:text-white">{match.team1_name}</p>
                                                                </div>
                                                                <div className="flex flex-col items-center gap-1 shrink-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xl font-black text-slate-950 dark:text-white font-mono">{match.score1 ?? '-'}</span>
                                                                        <span className="text-xs md:text-[10px] font-black text-slate-300 italic px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5">VS</span>
                                                                        <span className="text-xl font-black text-slate-950 dark:text-white font-mono">{match.score2 ?? '-'}</span>
                                                                    </div>
                                                                    <span className="text-[11px] md:text-[8px] font-black uppercase text-slate-400">{match.status === 'finished' ? 'Resultado' : 'Pendiente'}</span>
                                                                </div>
                                                                <div className="flex-1 text-center space-y-1.5">
                                                                    <div className={`w-12 h-12 rounded-md mx-auto flex items-center justify-center text-xs md:text-[10px] font-black shadow-inner transition-all ${match.score2 != null && match.score2 > (match.score1 ?? -1) ? 'bg-emerald-500 text-white dark:bg-[#00df82] dark:text-black' : 'bg-slate-50 dark:bg-white/5 text-slate-500'}`}>{teamInitials(match.team2_name)}</div>
                                                                    <p className="text-[11px] md:text-[9px] font-bold uppercase truncate text-slate-900 dark:text-white">{match.team2_name}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex items-center justify-center gap-5 pt-6 border-t border-slate-100 dark:border-white/5 shrink-0">
                                                    <button aria-label="Anterior" onClick={() => setFixtureModal((p: any) => ({ ...p, selectedRound: Math.max(1, p.selectedRound - 1) }))} className="p-3 rounded-md bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-20" disabled={fixtureModal.selectedRound <= 1}><HugeiconsIcon icon={ArrowLeft01Icon} className="w-5 h-5 text-slate-900 dark:text-white" /></button>
                                                    <div className="flex items-center gap-2">
                                                        {Array.from({ length: totalRounds }).map((_, i) => (
                                                            <button key={i} onClick={() => setFixtureModal((p: any) => ({ ...p, selectedRound: i + 1 }))} className={`w-9 h-9 rounded-md text-[11px] font-black uppercase transition-all ${fixtureModal.selectedRound === i + 1 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}>{i + 1}</button>
                                                        ))}
                                                    </div>
                                                    <button aria-label="Siguiente" onClick={() => setFixtureModal((p: any) => ({ ...p, selectedRound: Math.min(totalRounds, p.selectedRound + 1) }))} className="p-3 rounded-md bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-20" disabled={fixtureModal.selectedRound >= totalRounds}><HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5 text-slate-900 dark:text-white" /></button>
                                                </div>
                                            </>
                                        )}

                                        {/* POSICIONES */}
                                        {fixtureModal.view === 'standings' && (() => {
                                            // Torneo por grupos: una tabla por grupo (antes una sola tabla mezclaba a todos los grupos)
                                            const all: any[] = fixtureModal.fixtureData?.matches || [];
                                            const names = [...new Set(all.map((m) => m.group).filter(Boolean))] as string[];
                                            const sections = names.length ? names.map((g) => ({ title: g, matches: all.filter((m) => m.group === g) })) : [{ title: '', matches: all }];
                                            return (
                                                <div className="space-y-6">
                                                    {sections.map((section) => (
                                                        <div key={section.title || 'tabla'} className="space-y-2">
                                                            {section.title && <p className="max-w-2xl mx-auto text-[11px] font-black uppercase tracking-widest text-amber-600">{section.title}</p>}
                                                            <div className="max-w-2xl mx-auto w-full overflow-hidden rounded-md border border-slate-200 dark:border-white/10 shadow-xs">
                                                                        <table className="w-full text-left">
                                                                            <thead className="bg-slate-50/50 dark:bg-white/2 text-[11px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                                                                <tr><th className="px-4 py-3.5">#</th><th className="px-4 py-3.5">Equipo</th><th className="px-3 py-3.5 text-center">PJ</th><th className="px-3 py-3.5 text-center">G</th><th className="px-3 py-3.5 text-center">E</th><th className="px-3 py-3.5 text-center">P</th><th className="px-3 py-3.5 text-center">DG</th><th className="px-4 py-3.5 text-center">Pts</th></tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[11px] font-bold uppercase">
                                                                                {(() => {
                                                                                    const table = standings(section.matches);
                                                                                    if (table.length === 0) return <tr><td colSpan={8} className="px-4 py-14 text-center text-xs md:text-[10px] text-slate-400 tracking-widest">Sin resultados registrados aún</td></tr>;
                                                                                    const medals = ['🥇', '🥈', '🥉'];
                                                                                    return table.map((s, i) => (
                                                                                        <tr key={s.id} className={i < 3 ? 'bg-amber-500/5' : 'hover:bg-slate-50/50 dark:hover:bg-white/2'}>
                                                                                            <td className="px-4 py-3.5 text-slate-400 font-mono font-black">{i < 3 ? medals[i] : i + 1}</td>
                                                                                            <td className="px-4 py-3.5 text-slate-900 dark:text-white truncate max-w-[180px]">{s.name}</td>
                                                                                            <td className="px-3 py-3.5 text-center text-slate-500 font-mono">{s.pj}</td>
                                                                                            <td className="px-3 py-3.5 text-center text-slate-500 font-mono">{s.pg}</td>
                                                                                            <td className="px-3 py-3.5 text-center text-slate-500 font-mono">{s.pe}</td>
                                                                                            <td className="px-3 py-3.5 text-center text-slate-500 font-mono">{s.pp}</td>
                                                                                            <td className="px-3 py-3.5 text-center text-slate-500 font-mono">{s.gf - s.gc}</td>
                                                                                            <td className="px-4 py-3.5 text-center text-amber-600 dark:text-amber-400 font-mono font-black text-[13px]">{s.pts}</td>
                                                                                        </tr>
                                                                                    ));
                                                                                })()}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}

            {/* MODAL EMPAREJAMIENTOS */}
            {isPairsModalOpen && (
                <ModalPortal>
                <div className="fixed inset-0 z-260 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setIsPairsModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-lg rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                    <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5">Sorteo en vivo</p>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">Emparejamientos</h3>
                                </div>
                            </div>
                            <button aria-label="Cerrar" onClick={() => setIsPairsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shrink-0">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-2 custom-scrollbar">
                            {drawAnimation.currentPair[0] && (
                                <div className="bg-amber-500/5 p-3.5 rounded-md border border-amber-500/25 flex items-center gap-3 text-[11px] font-black uppercase animate-pulse">
                                    <span className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center text-[11px] md:text-[9px] font-black font-mono shrink-0">{drawAnimation.completedMatches.length + 1}</span>
                                    <span className="truncate flex-1 text-left text-amber-600">{drawAnimation.currentPair[0]}</span>
                                    <span className="text-amber-500 italic text-[11px] md:text-[9px] font-black shrink-0">VS</span>
                                    <span className="truncate flex-1 text-right text-slate-300 dark:text-white/30 tracking-tighter">{drawAnimation.currentPair[1] || '? ? ?'}</span>
                                </div>
                            )}
                            {drawAnimation.completedMatches.map((m: any, idx: number) => (
                                <div key={idx} className="bg-white dark:bg-white/5 p-3.5 rounded-md border border-slate-100 dark:border-white/10 flex items-center gap-3 text-[11px] font-black uppercase shadow-xs">
                                    <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center text-[11px] md:text-[9px] font-black font-mono shrink-0">{idx + 1}</span>
                                    <span className="truncate flex-1 text-left text-slate-900 dark:text-white">{m.t1}</span>
                                    <span className="text-amber-500 italic text-[11px] md:text-[9px] font-black shrink-0">VS</span>
                                    <span className="truncate flex-1 text-right text-slate-900 dark:text-white">{m.t2}</span>
                                </div>
                            ))}
                            {drawAnimation.completedMatches.length === 0 && !drawAnimation.currentPair[0] && (
                                <div className="py-16 text-center space-y-3">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-md flex items-center justify-center mx-auto text-slate-300 border border-slate-200 dark:border-white/10">
                                        <HugeiconsIcon icon={UserGroupIcon} className="w-8 h-8" strokeWidth={1.4} />
                                    </div>
                                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Aún no hay emparejamientos</p>
                                    <p className="text-[11px] md:text-[9px] font-bold uppercase text-slate-300">Saca la primera bolilla en la mesa</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 flex items-center justify-between">
                            <span className="text-[11px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">Partidos formados</span>
                            <span className="text-base font-black font-mono text-amber-500">{drawAnimation.completedMatches.length}</span>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}

            {/* MODAL ELIMINAR ESTANDARIZADO */}
        </>
    );
}
