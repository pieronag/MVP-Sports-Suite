"use client";
import { hideBrokenImg } from "@/utils/img";
import FixtureFlow from "@/components/tournaments/FixtureFlow";
import { sportIcon, sportStyle, getSportConfig, formatCLP, TOURNAMENT_SPORTS } from "@/components/tournaments/sport";
import { useNow } from "@/hooks/useNow";
import PageTitle, { Accent } from "@/components/dashboard/PageTitle";
import { useFeedback } from "@/components/ui/Feedback";
import { getOwnedTenantsSnap } from "@/services/client/ownedTenants";
import { tournamentIssue } from "@/utils/tournament";
import { uploadImage } from "@/services/client/imageUpload";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useEffect} from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/client/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp} from 'firebase/firestore';
import {
    Add01Icon,
    BarChartIcon,
    Building01Icon,
    Cancel01Icon,
    ArrowDown01Icon,
    Clock01Icon,
    CloudUploadIcon,
    Flag01Icon,
    Grid02Icon,
    IdentityCardIcon,
    Image01Icon,
    MoneyBag01Icon,
    PencilEdit02Icon,
    CallIcon,
    PlayCircleIcon,
    RefreshIcon,
    ShieldCheckIcon,
    SparklesIcon,
    StarIcon,
    Delete02Icon,
    TrophyIcon,
    UserGroupIcon,
    UserIcon,
} from '@hugeicons/core-free-icons';
import { TarjetaKpi } from '@/components/ui/DashboardWidgets';

export default function ChampionshipsPage() {
  const now = useNow();
    const { user } = useAuth();

    // ESTADOS
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // MODALES
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const [fixtureFor, setFixtureFor] = useState<any>(null);
    const [participantsModal, setParticipantsModal] = useState<any>({ isOpen: false, tournament: null });

    const INITIAL_FORM_STATE = {
        name: '', imageUrl: '', imagePreview: '', tenantId: '',
        type: 'liga', category: 'libre', skillLevel: 'todo_competidor',
        maxTeams: 16, price: '', registrationStartDate: '', registrationEndDate: '',
        tournamentStartDate: '', tournamentEndDate: '', description: '', rules: '',
        prize1: '', prize2: '', prize3: '', isHomeAway: false, isFinalSingleMatch: true, sport: '',
        startTime: '', endTime: '', teamSize: 2, matchDuration: 60, contactPhone: ''
    };
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);

    const { toast: addToast, confirm } = useFeedback();

    // CARGA
    const fetchData = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            // Solo los torneos de sus recintos (antes también aparecían los torneos sin dueño de otros recintos)
            const snapT = await getOwnedTenantsSnap(user.uid);
            const myTenantIds = new Set(snapT.docs.map(d => d.id));
            const snap = await getDocs(collection(db, "tournaments"));
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((t: any) => t.ownerId === user.uid || myTenantIds.has(t.tenantId));
            setTournaments(list);
            setTenants(snapT.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [user]);

    // MANEJO DE IMAGEN
    // Comprime y sube a Storage; devuelve la URL (antes: base64 dentro de Firestore)
    const compressImage = (file: File): Promise<string> => uploadImage(file, { folder: "tournaments", maxSize: 1200, quality: 0.75 });

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const base64 = await compressImage(file);
            setFormData(prev => ({ ...prev, imagePreview: base64 }));
        }
    };

    // ACCIONES
    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid) return;
        const issue = tournamentIssue(formData);
        if (issue) { addToast(issue, 'error'); return; }
        setSaving(true);
        try {
            const payload = {
                ...formData,
                imageUrl: formData.imagePreview || formData.imageUrl,
                ownerId: user.uid,
                price: Number(formData.price),
                maxTeams: Number(formData.maxTeams),
                enrolledTeams: isEditing ? (tournaments.find(t => t.id === editId)?.enrolledTeams || 0) : 0,
                status: isEditing ? (tournaments.find(t => t.id === editId)?.status || 'upcoming') : 'upcoming'
            };
            delete (payload as any).imagePreview;

            if (isEditing) await updateDoc(doc(db, "tournaments", editId!), payload);
            else await addDoc(collection(db, "tournaments"), { ...payload, createdAt: serverTimestamp(), isVisibleInApp: true });

            addToast("Torneo guardado exitosamente", 'success');
            handleCloseModal(); fetchData();
        } catch { addToast("Error al guardar el torneo", 'error'); } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!(await confirm({ title: "¿Eliminar torneo?", message: "Esta acción no se puede deshacer y borrará toda la información asociada.", tone: "danger" }))) return;
        try {
            await deleteDoc(doc(db, "tournaments", id));
            addToast("Torneo eliminado", 'success');
            fetchData();
        } catch { addToast("Error al eliminar", 'error'); }
    };

    const handleOpenEdit = (t: any) => {
        setFormData({
            ...INITIAL_FORM_STATE, ...t,
            price: t.price?.toString() || '',
            imagePreview: t.imageUrl || ''
        });
        setEditId(t.id); setIsEditing(true); setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false); setIsEditing(false); setEditId(null);
        setFormData(INITIAL_FORM_STATE);
    };

    const handleSportSelect = (sport: string) => {
        const cfg = getSportConfig(sport);
        setFormData(prev => ({ ...prev, sport, teamSize: cfg.teamSize, matchDuration: cfg.matchDuration, type: cfg.type, category: cfg.category, skillLevel: cfg.skillLevel }));
    };

    // FIXTURE ACTIONS
    const handleOpenFixture = (t: any) => setFixtureFor(t);

    const sportCfg = getSportConfig(formData.sport);

    const skillLabel = (s: string) => ({ todo_competidor: 'Todo competidor', amateur: 'Amateur', profesional: 'Profesional', principiante: 'Principiante', avanzado: 'Avanzado' }[s] || s || '—');
    const teamInitials = (name: string) => name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <PageTitle eyebrow="Módulo de Competiciones" tone="amber">Gestión de <Accent tone="amber">Campeonatos</Accent></PageTitle>
                <div className="flex items-center gap-2.5">
                    <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-amber-500 text-white font-black text-xs md:text-[10px] uppercase rounded-md shadow-xl shadow-amber-500/25 flex items-center gap-2.5 hover:brightness-110 active:scale-95 transition-all"><HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> Nuevo Torneo</button>
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
                <TarjetaKpi label="Torneos" value={tournaments.length.toString()} sub="Competiciones" icon={<HugeiconsIcon icon={TrophyIcon} />} />
                <TarjetaKpi label="Activos" value={tournaments.filter(t => t.status === 'active').length.toString()} sub="En curso" icon={<HugeiconsIcon icon={PlayCircleIcon} />} />
                <TarjetaKpi label="Equipos" value={tournaments.reduce((acc, t) => acc + (t.teams?.length || 0), 0).toString()} sub="Participantes" icon={<HugeiconsIcon icon={UserGroupIcon} />} />
                <TarjetaKpi label="Potencial" value={`$${formatCLP(tournaments.reduce((acc, t) => acc + (t.maxTeams * (t.price || 0)), 0))}`} sub="Ingresos proyectados" icon={<HugeiconsIcon icon={MoneyBag01Icon} />} />
            </div>

            {/* LISTADO */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-pulse">
                    <HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 text-amber-500 animate-spin" />
                    <p className="text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando competiciones...</p>
                </div>
            ) : tournaments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white dark:bg-[#0B0F19] rounded-md border border-slate-200 dark:border-white/5 shadow-xs">
                    <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-md flex items-center justify-center text-amber-500 border border-amber-100 dark:border-amber-500/20">
                        <HugeiconsIcon icon={TrophyIcon} className="w-8 h-8" strokeWidth={1.4} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Sin competiciones</p>
                        <p className="text-xs md:text-[10px] font-bold text-slate-300 uppercase tracking-wider">Crea tu primer campeonato</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-md text-xs md:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all">
                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> Nuevo Torneo
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tournaments.map((t: any) => {
                        const occupancy = t.maxTeams > 0 ? Math.min(Math.round(((t.teams?.length || 0) / t.maxTeams) * 100), 100) : 0;
                        const st = sportStyle(t.sport);
                        return (
                        <div key={t.id} className="group flex flex-col h-full bg-white dark:bg-[#0B0F19] rounded-md border border-slate-100 dark:border-white/5 shadow-xs overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-black/40 hover:-translate-y-0.5">
                            {/* HERO */}
                            <div className={`relative h-36 bg-linear-to-br ${st.gradient} overflow-hidden shrink-0`}>
                                {t.imageUrl ? <img src={t.imageUrl} referrerPolicy="no-referrer" onError={hideBrokenImg} className="absolute inset-0 w-full h-full object-cover" alt="" /> : null}
                                <div className="absolute -right-5 -bottom-9 opacity-10 group-hover:opacity-20 transition-opacity">
                                    {sportIcon(t.sport, 'w-28 h-28 text-white')}
                                </div>
                                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/10" />
                                <div className="absolute top-3 left-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-md text-white text-[11px] md:text-[8px] font-black uppercase tracking-widest border border-white/20 ${t.status === 'upcoming' ? 'bg-emerald-500/40' : 'bg-amber-500/40'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'upcoming' ? 'bg-white' : 'bg-amber-200 animate-pulse'}`} /> {t.status === 'upcoming' ? 'Inscripciones' : 'En Vivo'}
                                    </span>
                                </div>
                                <div className="absolute top-3 right-3 w-11 h-11 rounded-md bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-lg" title={t.sport || 'Deporte'}>
                                    {sportIcon(t.sport, 'w-6 h-6')}
                                </div>
                                <div className="absolute bottom-3 left-3 right-3">
                                    <h3 className="text-base font-black text-white uppercase truncate drop-shadow-lg font-heading">{t.name}</h3>
                                    <p className="text-[11px] md:text-[9px] font-bold text-white/90 uppercase mt-0.5 flex items-center gap-1.5">
                                        <HugeiconsIcon icon={Building01Icon} className="w-3 h-3" strokeWidth={2} /> {tenants.find(v => v.id === t.tenantId)?.name || 'Recinto'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                                {/* CHIPS */}
                                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] md:text-[8px] font-black uppercase border w-fit ${st.chip}`}>
                                        {sportIcon(t.sport, 'w-3 h-3')} {t.sport || 'Deporte'}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] md:text-[8px] font-black uppercase text-slate-500 dark:text-slate-300">
                                        {t.type === 'liga' ? 'Liga' : t.type === 'eliminacion' ? 'Eliminación' : 'Grupos + Playoffs'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] md:text-[8px] font-black uppercase text-slate-500 dark:text-slate-300 ml-auto">
                                        <HugeiconsIcon icon={StarIcon} className="w-3 h-3 text-amber-500" strokeWidth={2} /> {skillLabel(t.skillLevel)}
                                    </span>
                                </div>

                                {/* SPECS GRID */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="p-2.5 rounded-md bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5">
                                        <p className="text-[11px] md:text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Inscripción</p>
                                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] font-mono">${formatCLP(Number(t.price) || 0)}</p>
                                    </div>
                                    <div className="p-2.5 rounded-md bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5">
                                        <p className="text-[11px] md:text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Equipo</p>
                                        <p className="text-[11px] font-black text-slate-900 dark:text-white font-mono">{t.teamSize || 2} jug.</p>
                                    </div>
                                    <div className="p-2.5 rounded-md bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5">
                                        <p className="text-[11px] md:text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Duración</p>
                                        <p className="text-[11px] font-black text-slate-900 dark:text-white font-mono">{t.matchDuration || 60} min</p>
                                    </div>
                                    <div className="p-2.5 rounded-md bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5">
                                        <p className="text-[11px] md:text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Jornada</p>
                                        <p className="text-[11px] font-black text-slate-900 dark:text-white font-mono">{t.startTime || '--:--'}{t.endTime ? ` - ${t.endTime}` : ''}</p>
                                    </div>
                                </div>

                                {/* EQUIPOS INSCRITOS */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Equipos inscritos</span>
                                        <span className="text-xs md:text-[10px] font-black text-slate-900 dark:text-white font-mono">{(t.teams?.length || 0)} / {t.maxTeams}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        {(t.teams || []).slice(0, 3).map((team: any, i: number) => (
                                            <span key={i} className="w-7 h-7 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[11px] md:text-[8px] font-black text-slate-500 dark:text-slate-300" title={team.name}>{teamInitials(team.name)}</span>
                                        ))}
                                        {(t.teams?.length || 0) > 3 && <span className="text-[11px] md:text-[9px] font-black text-slate-400">+{(t.teams?.length || 0) - 3} más</span>}
                                        <span className={`ml-auto text-[11px] md:text-[9px] font-black font-mono ${occupancy === 100 ? 'text-emerald-600 dark:text-[#00df82]' : 'text-amber-500'}`}>{occupancy}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-linear-to-r from-amber-500 to-orange-500 transition-all duration-1000" style={{ width: `${occupancy}%` }} />
                                    </div>
                                </div>

                                {/* PREMIOS */}
                                <div className="space-y-1.5 bg-slate-50 dark:bg-white/3 p-3 rounded-md border border-slate-100 dark:border-white/5 mb-4">
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /><span className="text-[11px] md:text-[8px] font-black text-amber-600 uppercase w-12">1°:</span><span className="text-[11px] md:text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate uppercase">{t.prize1 || '---'}</span></div>
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /><span className="text-[11px] md:text-[8px] font-black text-slate-500 uppercase w-12">2°:</span><span className="text-[11px] md:text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate uppercase">{t.prize2 || '---'}</span></div>
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-800" /><span className="text-[11px] md:text-[8px] font-black text-amber-800 uppercase w-12">3°:</span><span className="text-[11px] md:text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate uppercase">{t.prize3 || '---'}</span></div>
                                </div>

                                {/* FOOTER ACCIONES */}
                                <div className="mt-auto p-2 bg-slate-50 dark:bg-white/2 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-2 -mx-4 -mb-4">
                                    <button onClick={() => handleOpenFixture(t)} className="py-2 flex items-center justify-center gap-1 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 text-[11px] md:text-[8px] font-black uppercase tracking-widest hover:text-emerald-500 hover:border-emerald-400/40 transition-all active:scale-95" title="Fixture">
                                        <HugeiconsIcon icon={PlayCircleIcon} className="w-3 h-3" /> Fixture
                                    </button>
                                    <button onClick={() => setParticipantsModal({ isOpen: true, tournament: t })} className="py-2 flex items-center justify-center gap-1 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 text-[11px] md:text-[8px] font-black uppercase tracking-widest hover:text-blue-500 hover:border-blue-400/40 transition-all active:scale-95" title="Equipos">
                                        <HugeiconsIcon icon={UserGroupIcon} className="w-3 h-3" /> Equipos
                                    </button>
                                    <button onClick={() => handleOpenEdit(t)} className="py-2 flex items-center justify-center gap-1 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 text-[11px] md:text-[8px] font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white hover:border-amber-400/40 transition-all active:scale-95" title="Editar">
                                        <HugeiconsIcon icon={PencilEdit02Icon} className="w-3 h-3" /> Editar
                                    </button>
                                    <button onClick={() => ((t.teams?.length || t.enrolledTeams || 0) > 0) ? addToast("Tiene equipos inscritos: no se puede eliminar. Puedes editarlo o esperar a que termine.", 'error') : handleDelete(t.id)} className="py-2 flex items-center justify-center gap-1 bg-white dark:bg-white/5 rounded-md border border-red-100 dark:border-red-500/20 text-red-400 text-[11px] md:text-[8px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95" title="Eliminar">
                                        <HugeiconsIcon icon={Delete02Icon} className="w-3 h-3" /> Borrar
                                    </button>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL CREAR / EDITAR */}
            {isModalOpen && (
                <div className="fixed inset-0 z-180 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn" onClick={handleCloseModal}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#0B0F19] w-full max-w-5xl rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                    <HugeiconsIcon icon={TrophyIcon} className="w-5 h-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5">{isEditing ? 'Editar competición' : 'Nueva competición'}</p>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">{isEditing ? 'Configurar Competición' : 'Lanzar Torneo'}</h3>
                                </div>
                            </div>
                            <button aria-label="Cerrar" onClick={handleCloseModal} className="p-2 bg-slate-100 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shrink-0">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrUpdate} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                            {/* SELECCIÓN DE DEPORTE */}
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-4 bg-amber-500 rounded-md"></span>
                                        <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Deporte</p>
                                    </div>
                                    <span className="text-[11px] md:text-[9px] font-black uppercase text-amber-500">{formData.sport || 'Seleccionar'}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {TOURNAMENT_SPORTS.map(s => {
                                        const on = formData.sport === s;
                                        return (
                                            <button key={s} type="button" onClick={() => handleSportSelect(s)} className={`flex flex-col items-center gap-1.5 p-3 rounded-md border transition-all active:scale-95 ${on ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/25' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-amber-400/40 hover:text-amber-500'}`}>
                                                {sportIcon(s, `w-5 h-5 ${on ? 'text-white' : 'text-amber-500'}`)}
                                                <span className="text-[11px] md:text-[9px] font-black uppercase">{s}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* COLUMNA 1: IDENTIDAD */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-4 bg-amber-500 rounded-md"></span>
                                        <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Identidad</p>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[11px] md:text-[8px] font-black uppercase tracking-widest text-slate-400 block">Imagen de Portada</label>
                                        <div className="relative group aspect-video bg-slate-50 dark:bg-white/5 rounded-md border-2 border-dashed border-slate-200 dark:border-white/10 overflow-hidden flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-amber-500/50 transition-all">
                                            {formData.imagePreview ? (
                                                <>
                                                    <img src={formData.imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><HugeiconsIcon icon={CloudUploadIcon} className="w-6 h-6 text-white" /></div>
                                                </>
                                            ) : (
                                                <>
                                                    <HugeiconsIcon icon={Image01Icon} className="w-8 h-8 text-slate-300 dark:text-white/10" />
                                                    <p className="text-[11px] md:text-[7px] font-black uppercase text-slate-400">Subir Banner</p>
                                                </>
                                            )}
                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                                        </div>
                                    </div>
                                    <InputGroupPremium label="Nombre del Torneo" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} icon={<HugeiconsIcon icon={IdentityCardIcon} className="w-4 h-4" />} placeholder="Ej: Copa de Verano" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputGroupPremium label="Categoría" type="select" value={formData.category} onChange={(e: any) => setFormData({ ...formData, category: e.target.value })} icon={<HugeiconsIcon icon={Grid02Icon} className="w-4 h-4" />}>
                                            {sportCfg.categories.map((c: any) => <option key={c.v} value={c.v}>{c.l.toUpperCase()}</option>)}
                                        </InputGroupPremium>
                                        <InputGroupPremium label="Nivel" type="select" value={formData.skillLevel} onChange={(e: any) => setFormData({ ...formData, skillLevel: e.target.value })} icon={<HugeiconsIcon icon={StarIcon} className="w-4 h-4" />}>
                                            {sportCfg.levels.map((l: any) => <option key={l.v} value={l.v}>{l.l.toUpperCase()}</option>)}
                                        </InputGroupPremium>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] md:text-[8px] font-black uppercase tracking-widest text-slate-400">Descripción</label>
                                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3.5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-xs md:text-[10px] font-bold outline-hidden h-20 resize-none focus:border-amber-500 text-slate-700 dark:text-white" placeholder="Reglas y condiciones..." />
                                    </div>
                                </div>

                                {/* COLUMNA 2: ORGANIZACIÓN */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-4 bg-amber-500 rounded-md"></span>
                                        <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Organización</p>
                                    </div>
                                    <InputGroupPremium label="Recinto" type="select" value={formData.tenantId} onChange={(e: any) => setFormData({ ...formData, tenantId: e.target.value })} icon={<HugeiconsIcon icon={Building01Icon} className="w-4 h-4" />}>
                                        <option value="">SELECCIONAR...</option>
                                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                                    </InputGroupPremium>
                                    <InputGroupPremium label="Formato Principal" type="select" value={formData.type} onChange={(e: any) => setFormData({ ...formData, type: e.target.value })} icon={<HugeiconsIcon icon={BarChartIcon} className="w-4 h-4" />}>
                                        <option value="liga">LIGA (ROUND ROBIN)</option>
                                        <option value="eliminacion">ELIMINACIÓN DIRECTA</option>
                                        <option value="fase_grupos">FASE DE GRUPOS + PLAYOFFS</option>
                                    </InputGroupPremium>
                                    <p className="text-[11px] md:text-[8px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5 -mt-2">
                                        <HugeiconsIcon icon={SparklesIcon} className="w-3 h-3" strokeWidth={2} /> Recomendado para {formData.sport || 'este deporte'}: {formData.type === 'liga' ? 'Liga' : formData.type === 'eliminacion' ? 'Eliminación directa' : 'Grupos + Playoffs'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputGroupPremium label="Max. Equipos" type="number" value={formData.maxTeams} onChange={(e: any) => setFormData({ ...formData, maxTeams: e.target.value })} icon={<HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" />} />
                                        <InputGroupPremium label="Inscripción ($)" type="number" value={formData.price} onChange={(e: any) => setFormData({ ...formData, price: e.target.value })} icon={<HugeiconsIcon icon={MoneyBag01Icon} className="w-4 h-4" />} />
                                    </div>
                                    <InputGroupPremium label={sportCfg.teamHint} type="select" value={formData.teamSize} onChange={(e: any) => setFormData({ ...formData, teamSize: Number(e.target.value) })} icon={<HugeiconsIcon icon={UserIcon} className="w-4 h-4" />}>
                                        {sportCfg.teamSizes.map((n: number) => <option key={n} value={n}>{n} {n === 1 ? 'JUGADOR (SINGLES)' : n === 2 ? 'JUGADORES (PAREJAS)' : 'JUGADORES'}</option>)}
                                    </InputGroupPremium>
                                    <InputGroupPremium label="WhatsApp Organizador" value={formData.contactPhone} onChange={(e: any) => setFormData({ ...formData, contactPhone: e.target.value })} icon={<HugeiconsIcon icon={CallIcon} className="w-4 h-4 text-emerald-500" />} placeholder="+56 9..." />
                                </div>

                                {/* COLUMNA 3: CALENDARIO Y PREMIOS */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-4 bg-amber-500 rounded-md"></span>
                                        <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Calendario y premios</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputGroupPremium label="Inicio Registro" type="date" value={formData.registrationStartDate} onChange={(e: any) => setFormData({ ...formData, registrationStartDate: e.target.value })} />
                                        <InputGroupPremium label="Fin Registro" type="date" value={formData.registrationEndDate} onChange={(e: any) => setFormData({ ...formData, registrationEndDate: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputGroupPremium label="Inicio Torneo" type="date" value={formData.tournamentStartDate} onChange={(e: any) => setFormData({ ...formData, tournamentStartDate: e.target.value })} />
                                        <InputGroupPremium label="Fin Torneo" type="date" value={formData.tournamentEndDate} onChange={(e: any) => setFormData({ ...formData, tournamentEndDate: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputGroupPremium label="H. Inicio Jornada" type="time" value={formData.startTime} onChange={(e: any) => setFormData({ ...formData, startTime: e.target.value })} icon={<HugeiconsIcon icon={Clock01Icon} className="w-4 h-4" />} />
                                        <InputGroupPremium label="H. Fin Jornada" type="time" value={formData.endTime} onChange={(e: any) => setFormData({ ...formData, endTime: e.target.value })} icon={<HugeiconsIcon icon={Clock01Icon} className="w-4 h-4" />} />
                                    </div>
                                    <InputGroupPremium label={sportCfg.matchHint} type="number" value={formData.matchDuration} onChange={(e: any) => setFormData({ ...formData, matchDuration: Number(e.target.value) })} icon={<HugeiconsIcon icon={BarChartIcon} className="w-4 h-4" />} />
                                    <div className="space-y-2">
                                        <InputGroupPremium label="1° Premio (Oro)" value={formData.prize1} onChange={(e: any) => setFormData({ ...formData, prize1: e.target.value })} icon={<HugeiconsIcon icon={TrophyIcon} className="w-4 h-4 text-amber-500" />} />
                                        <InputGroupPremium label="2° Premio (Plata)" value={formData.prize2} onChange={(e: any) => setFormData({ ...formData, prize2: e.target.value })} icon={<HugeiconsIcon icon={StarIcon} className="w-4 h-4 text-slate-400" />} />
                                        <InputGroupPremium label="3° Premio (Bronce)" value={formData.prize3} onChange={(e: any) => setFormData({ ...formData, prize3: e.target.value })} icon={<HugeiconsIcon icon={StarIcon} className="w-4 h-4 text-amber-800" />} />
                                    </div>
                                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
                                        <div className="flex flex-col">
                                            <span className="text-xs md:text-[10px] font-black uppercase text-slate-700 dark:text-white">Ida y Vuelta</span>
                                            <span className="text-[11px] md:text-[7px] text-slate-400 uppercase font-bold mt-1">Doble partido · Final a partido único</span>
                                        </div>
                                        <button type="button" onClick={() => setFormData({ ...formData, isHomeAway: !formData.isHomeAway })} className={`w-10 h-5 rounded-full transition-all flex items-center px-1 ${formData.isHomeAway ? 'bg-amber-500' : 'bg-slate-200 dark:bg-white/10'}`}><div className={`w-3 h-3 rounded-full bg-white transition-all ${formData.isHomeAway ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                                    </div>
                                </div>
                            </div>

                            {/* VISTA PREVIA */}
                            <div className="rounded-md border border-slate-200 dark:border-white/10 overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50/50 dark:bg-white/2 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-amber-500 rounded-md"></span>
                                    <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Vista previa del torneo</p>
                                </div>
                                <div className="p-4 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                        {formData.imagePreview ? <img src={formData.imagePreview} className="w-full h-full object-cover rounded-md" alt="" /> : sportIcon(formData.sport, 'w-6 h-6')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black uppercase text-slate-900 dark:text-white truncate font-heading">{formData.name || 'Nombre del torneo'}</p>
                                        <p className="text-[11px] md:text-[9px] font-bold text-amber-500 uppercase mt-0.5">{(formData.sport || 'Deporte')} · {formData.type === 'liga' ? 'Liga' : formData.type === 'eliminacion' ? 'Eliminación' : 'Grupos + Playoffs'} · {tenants.find(v => v.id === formData.tenantId)?.name?.toUpperCase() || 'Recinto'}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-black text-emerald-600 dark:text-[#00df82] font-mono">${formatCLP(Number(formData.price) || 0)}</p>
                                        <p className="text-[11px] md:text-[8px] font-black uppercase text-slate-400">inscripción</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={handleCloseModal} className="flex-1 py-3.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-md text-xs md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Cancelar</button>
                                <button type="submit" disabled={saving} className="flex-2 py-3.5 bg-amber-500 text-white rounded-md text-xs md:text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" /> : <HugeiconsIcon icon={ShieldCheckIcon} className="w-4 h-4" />}
                                    {isEditing ? 'Actualizar Competición' : 'Lanzar Competición'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {fixtureFor && <FixtureFlow tournament={fixtureFor} onClose={() => setFixtureFor(null)} onSaved={fetchData} />}

            {/* MODAL PARTICIPANTES (EQUIPOS INSCRITOS) */}
            {participantsModal.isOpen && (
                <div className="fixed inset-0 z-180 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setParticipantsModal({ isOpen: false, tournament: null })}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-2xl rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500 rounded-md shadow-lg shadow-blue-500/20"><HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5 text-white" /></div>
                                <div>
                                    <h3 className="text-xs font-black uppercase text-black dark:text-white tracking-widest">Equipos Inscritos</h3>
                                    <p className="text-[11px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">{participantsModal.tournament?.name}</p>
                                </div>
                            </div>
                            <button aria-label="Cerrar" onClick={() => setParticipantsModal({ isOpen: false, tournament: null })} className="p-2 text-slate-400 hover:text-black dark:hover:text-white transition-colors"><HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {!participantsModal.tournament?.teams || participantsModal.tournament?.teams.length === 0 ? (
                                <div className="text-center py-20">
                                    <HugeiconsIcon icon={UserGroupIcon} className="w-12 h-12 text-slate-200 dark:text-white/5 mx-auto mb-4" />
                                    <p className="text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay equipos inscritos aún</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {participantsModal.tournament?.teams.map((team: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/3 rounded-md border border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden">
                                                    {team.logo ? <img src={team.logo} referrerPolicy="no-referrer" onError={hideBrokenImg} className="w-full h-full object-cover" alt="" /> : <HugeiconsIcon icon={Flag01Icon} className="w-5 h-5 text-slate-300" />}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-black dark:text-white uppercase">{team.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] md:text-[8px] font-black text-slate-400 uppercase">Inscrito</p>
                                                <p className="text-xs md:text-[10px] font-black text-emerald-600 dark:text-[#00df82]">{new Date(team.registeredAt || now).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 flex justify-between items-center px-8">
                            <span className="text-xs md:text-[10px] font-black text-black dark:text-white uppercase">Total Inscritos</span>
                            <span className="text-base font-black text-blue-600 dark:text-blue-400">{participantsModal.tournament?.teams?.length || 0} / {participantsModal.tournament?.maxTeams}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- COMPONENTES AUXILIARES ---
function InputGroupPremium({ label, value, onChange, placeholder, icon, readOnly, type = "text", children }: any) {
    return (
        <div className="flex flex-col gap-1 group w-full">
            <label className="text-[11px] md:text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</label>
            <div className="relative">
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20 group-focus-within:text-amber-500 transition-colors">{icon}</div>}
                {type === 'select' ? (
                    <select value={value || ''} onChange={onChange} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-8 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-xs md:text-[10px] font-bold text-slate-700 dark:text-white focus:border-amber-500 outline-hidden transition-all appearance-none uppercase cursor-pointer`}>{children}</select>
                ) : (
                    <input type={type} value={value || ''} onChange={onChange} readOnly={readOnly} placeholder={placeholder} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-3 py-2.5 rounded-md border text-xs md:text-[10px] font-bold transition-all outline-hidden ${readOnly ? 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-white/5 dark:border-white/5' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white focus:border-amber-500'}`} />
                )}
                {type === 'select' && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300"><HugeiconsIcon icon={ArrowDown01Icon} className="w-3 h-3" /></div>}
            </div>
        </div>
    );
}
