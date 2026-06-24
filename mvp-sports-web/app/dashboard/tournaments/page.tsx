"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import {
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
    doc, serverTimestamp, getDoc, setDoc
} from 'firebase/firestore';
import {
    TrophyIcon, PlusIcon, UserGroupIcon, CalendarDaysIcon, XMarkIcon,
    CheckCircleIcon, ArrowPathIcon, ExclamationTriangleIcon, CurrencyDollarIcon,
    InformationCircleIcon, PencilSquareIcon, TrashIcon, PlayCircleIcon,
    SparklesIcon, ExclamationCircleIcon, ChartBarIcon, StarIcon,
    ChevronLeftIcon, ChevronRightIcon, PhotoIcon, CloudArrowUpIcon,
    ShieldCheckIcon, IdentificationIcon, DocumentTextIcon, PencilIcon, NoSymbolIcon,
    BuildingStorefrontIcon, PowerIcon, LockClosedIcon, Squares2X2Icon,
    ChevronDownIcon, UserIcon, FlagIcon, MapPinIcon
} from '@heroicons/react/24/outline';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';

// --- INTERFACES ---
interface Team {
    id: string;
    name: string;
    logo?: string;
    userId?: string;
}

interface Match {
    id: string;
    team1_id: string;
    team1_name: string;
    team2_id: string;
    team2_name: string;
    score1: number | null;
    score2: number | null;
    status: 'pending' | 'finished';
    round: number;
    stage?: string;
    group?: string;
    date?: string;
    time?: string;
    court?: string;
}

// --- UTILS DE TORNEO ---
const shuffleArray = (array: any[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

const generateFixture = (tournament: any, teams: any[]) => {
    const { type } = tournament;
    if (type === 'liga') return generateRoundRobin(teams);
    if (type === 'eliminacion') return generateKnockout(teams);
    return generateGroups(teams);
};

const generateRoundRobin = (teams: any[]) => {
    const matches: any[] = [];
    const n = teams.length;
    const tempTeams = [...teams];
    if (n % 2 !== 0) tempTeams.push({ id: 'bye', name: 'DESCANSO' });
    const numTeams = tempTeams.length;
    const rounds = numTeams - 1;

    for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < numTeams / 2; i++) {
            const team1 = tempTeams[i];
            const team2 = tempTeams[numTeams - 1 - i];
            if (team1.id !== 'bye' && team2.id !== 'bye') {
                matches.push({
                    id: Math.random().toString(36).substr(2, 9),
                    team1_id: team1.id, team1_name: team1.name,
                    team2_id: team2.id, team2_name: team2.name,
                    score1: null, score2: null, status: 'pending', round: r + 1
                });
            }
        }
        tempTeams.splice(1, 0, tempTeams.pop());
    }
    return { matches, totalRounds: rounds };
};

const generateKnockout = (teams: any[]) => {
    const matches: any[] = [];
    const n = teams.length;
    const rounds = Math.ceil(Math.log2(n));
    const bracketSize = Math.pow(2, rounds);

    for (let i = 0; i < bracketSize / 2; i++) {
        const t1 = teams[i * 2] || { id: 'bye', name: '---' };
        const t2 = teams[i * 2 + 1] || { id: 'bye', name: '---' };
        matches.push({
            id: Math.random().toString(36).substr(2, 9),
            team1_id: t1.id, team1_name: t1.name,
            team2_id: t2.id, team2_name: t2.name,
            score1: t2.id === 'bye' ? 1 : null,
            score2: t2.id === 'bye' ? 0 : null,
            status: t2.id === 'bye' ? 'finished' : 'pending',
            round: 1, stage: getStageName(rounds, 1)
        });
    }
    return { matches, totalRounds: rounds };
};

const getStageName = (totalRounds: number, currentRound: number) => {
    const diff = totalRounds - currentRound;
    if (diff === 0) return 'Final';
    if (diff === 1) return 'Semifinal';
    if (diff === 2) return 'Cuartos de Final';
    if (diff === 3) return 'Octavos de Final';
    return `Ronda ${currentRound}`;
};

const generateGroups = (teams: any[]) => {
    return generateRoundRobin(teams.slice(0, 4));
};

// --- COMPONENTE TOAST ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border animate-slideInRight backdrop-blur-md ${type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:text-emerald-400 dark:border-emerald-500/50' :
                'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:text-red-400 dark:border-red-500/50'
            }`}>
            {type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
            <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
        </div>
    );
};

export default function ChampionshipsPage() {
    const { user } = useAuth();

    // ESTADOS
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // MODALES
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null);

    // FIXTURE / DRAW
    const [fixtureModal, setFixtureModal] = useState<any>({
        isOpen: false, tournament: null, step: 'validation',
        validations: [], fixtureData: null, selectedRound: 1
    });
    const [drawAnimation, setDrawAnimation] = useState<any>({
        isDrawing: false, remainingTeams: [], drawnTeams: [],
        currentPair: [null, null], completedMatches: []
    });

    const [participantsModal, setParticipantsModal] = useState<any>({ isOpen: false, tournament: null });

    const INITIAL_FORM_STATE = {
        name: '', imageUrl: '', imagePreview: '', tenantId: '',
        type: 'liga', category: 'libre', skillLevel: 'todo_competidor',
        maxTeams: 16, price: '', registrationStartDate: '', registrationEndDate: '',
        tournamentStartDate: '', tournamentEndDate: '', description: '', rules: '',
        prize1: '', prize2: '', prize3: '', isHomeAway: false, isFinalSingleMatch: true, sport: ''
    };
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);

    const addToast = (msg: string, type: 'success' | 'error') => setNotification({ msg, type });

    // CARGA
    const fetchData = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "tournaments"));
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((t: any) => t.ownerId === user.uid || !t.ownerId);
            setTournaments(list);
            const snapT = await getDocs(query(collection(db, "tenants"), where("ownerId", "==", user.uid)));
            setTenants(snapT.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [user]);

    // MANEJO DE IMAGEN
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 600;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                };
            };
        });
    };

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
        } catch (e) { addToast("Error al guardar el torneo", 'error'); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!tournamentToDelete) return;
        try {
            await deleteDoc(doc(db, "tournaments", tournamentToDelete));
            addToast("Torneo eliminado", 'success');
            setTournamentToDelete(null); fetchData();
        } catch (e) { addToast("Error al eliminar", 'error'); }
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

    // FIXTURE ACTIONS
    const handleStartTournament = (t: any) => {
        const teams = t.teams || [];
        const validations = [
            { label: "Equipos Mínimos (2)", ok: teams.length >= 2 },
            { label: "Cupos Completos", ok: teams.length >= t.maxTeams },
            { label: "Configuración de Premios", ok: !!t.prize1 }
        ];
        setFixtureModal({ isOpen: true, tournament: t, step: 'validation', validations, selectedRound: 1 });
    };

    const handleGenerateFixture = () => {
        const teams = shuffleArray(fixtureModal.tournament.teams || []);
        setDrawAnimation({ isDrawing: true, remainingTeams: teams, drawnTeams: [], currentPair: [null, null], completedMatches: [] });
        setFixtureModal((prev: any) => ({ ...prev, step: 'draw' }));
    };

    const pickBall = () => {
        setDrawAnimation((prev: any) => {
            const rem = [...prev.remainingTeams];
            if (rem.length === 0) return prev;
            const ball = rem.shift();
            const pair = [...prev.currentPair];
            if (!pair[0]) pair[0] = ball.name; else pair[1] = ball.name;
            const complete = !!pair[0] && !!pair[1];
            return {
                ...prev, remainingTeams: rem, drawnTeams: [...prev.drawnTeams, ball],
                currentPair: complete ? [null, null] : pair,
                completedMatches: complete ? [...prev.completedMatches, { t1: pair[0], t2: pair[1] }] : prev.completedMatches
            };
        });
    };

    const handleFinalizeDraw = async () => {
        const res = generateFixture(fixtureModal.tournament, drawAnimation.drawnTeams);
        setFixtureModal((prev: any) => ({ ...prev, step: 'review', fixtureData: res }));
        await updateDoc(doc(db, "tournaments", fixtureModal.tournament.id), { fixture: res, status: 'active' });
        fetchData();
    };

    const handleOpenFixture = (t: any) => {
        if (!t.fixture) return handleStartTournament(t);
        setFixtureModal({ isOpen: true, tournament: t, step: 'review', fixtureData: t.fixture, selectedRound: 1 });
    };

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-amber-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 tracking-[0.2em] uppercase">Módulo de Competiciones</p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Gestión de <span className="text-amber-500 dark:text-amber-400">Campeonatos</span></h1>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="px-6 py-2.5 bg-slate-950 dark:bg-amber-600 text-white dark:text-slate-950 text-[10px] font-black uppercase rounded-xl shadow-xl flex items-center gap-2 active:scale-95 transition-all"><PlusIcon className="w-4 h-4" /> Nuevo Torneo</button>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <TarjetaKpi label="Torneos" value={tournaments.length.toString()} icon={<TrophyIcon className="w-5 h-5" />} trend={{ value: 'TOTAL', isUp: true }} />
                <TarjetaKpi label="Activos" value={tournaments.filter(t => t.status === 'active').length.toString()} icon={<PlayCircleIcon className="w-5 h-5" />} trend={{ value: 'EN VIVO', isUp: true }} />
                <TarjetaKpi label="Equipos" value={tournaments.reduce((acc, t) => acc + (t.teams?.length || 0), 0).toString()} icon={<UserGroupIcon className="w-5 h-5" />} trend={{ value: 'PARTICIPANTES', isUp: true }} />
                <TarjetaKpi label="Potencial" value={`$${tournaments.reduce((acc, t) => acc + (t.maxTeams * (t.price || 0)), 0).toLocaleString()}`} icon={<CurrencyDollarIcon className="w-5 h-5" />} trend={{ value: 'INGRESOS', isUp: true }} />
            </div>

            {/* LISTADO */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-pulse">
                    <ArrowPathIcon className="w-8 h-8 text-amber-500 animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando competiciones...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tournaments.map((t: any) => (
                        <div key={t.id} className="flex flex-col h-full bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/20 overflow-hidden group transition-all duration-500">
                            <div className="relative h-44 overflow-hidden shrink-0">
                                {t.imageUrl ? <img src={t.imageUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" /> : <div className="absolute inset-0 bg-slate-900 flex items-center justify-center"><TrophyIcon className="w-12 h-12 text-white/5" /></div>}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90" />
                                <div className="absolute top-4 left-4"><span className={`px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest border backdrop-blur-md ${t.status === 'upcoming' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>{t.status === 'upcoming' ? 'Inscripciones' : 'En Vivo'}</span></div>
                                <div className="absolute bottom-4 left-4 right-4">
                                    <h3 className="text-base font-black text-white uppercase truncate drop-shadow-lg">{t.name}</h3>
                                    <p className="text-[8px] font-bold text-amber-500 uppercase mt-1 flex items-center gap-1"><BuildingStorefrontIcon className="w-3 h-3" /> {tenants.find(v => v.id === t.tenantId)?.name || 'RE-ACTIVATE'}</p>
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-slate-50 dark:bg-white/[0.03] p-2 rounded-xl border border-slate-100 dark:border-white/5"><p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Formato</p><p className="text-[9px] font-black text-slate-700 dark:text-slate-200 uppercase">{t.type}</p></div>
                                    <div className="bg-slate-50 dark:bg-white/[0.03] p-2 rounded-xl border border-slate-100 dark:border-white/5"><p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Inscripción</p><p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">${Number(t.price).toLocaleString()}</p></div>
                                </div>
                                <div className="space-y-3 mb-5">
                                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase"><span>Equipos Inscritos</span><span className="text-slate-900 dark:text-white">{(t.teams?.length || 0)} / {t.maxTeams}</span></div>
                                    <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${((t.teams?.length || 0) / (t.maxTeams || 1)) * 100}%` }} /></div>
                                </div>
                                <div className="space-y-1.5 bg-slate-50 dark:bg-white/[0.03] p-3 rounded-xl border border-slate-100 dark:border-white/5 mb-6">
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /><span className="text-[8px] font-black text-amber-600 uppercase w-12">1° Premio:</span><span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate uppercase">{t.prize1 || '---'}</span></div>
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /><span className="text-[8px] font-black text-slate-500 uppercase w-12">2° Premio:</span><span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate uppercase">{t.prize2 || '---'}</span></div>
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-800" /><span className="text-[8px] font-black text-amber-800 uppercase w-12">3° Premio:</span><span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate uppercase">{t.prize3 || '---'}</span></div>
                                </div>
                                <div className="mt-auto p-2 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex gap-2 -mx-5 -mb-5 rounded-b-2xl">
                                    <button onClick={() => handleOpenFixture(t)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-emerald-500 transition-all shadow-sm active:scale-95"><PlayCircleIcon className="w-4 h-4" /></button>
                                    <button onClick={() => setParticipantsModal({ isOpen: true, tournament: t })} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-blue-500 transition-all shadow-sm active:scale-95"><UserGroupIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleOpenEdit(t)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm active:scale-95"><PencilSquareIcon className="w-4 h-4" /></button>
                                    <button onClick={() => setTournamentToDelete(t.id)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shadow-sm active:scale-95"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL CREAR / EDITAR COMPLETO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn" onClick={handleCloseModal}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#0B0F19] w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-3"><div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20"><TrophyIcon className="w-5 h-5 text-white" /></div>{isEditing ? 'Configurar Competición' : 'Nueva Competición'}</h3>
                            <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleCreateOrUpdate} className="p-8 overflow-y-auto space-y-10 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* COLUMNA 1: IMAGEN Y BÁSICOS */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase text-black tracking-widest block">Imagen de Portada</label>
                                        <div className="relative group aspect-video bg-slate-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 overflow-hidden flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-amber-500/50 transition-all">
                                            {formData.imagePreview ? (
                                                <>
                                                    <img src={formData.imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><CloudArrowUpIcon className="w-6 h-6 text-white" /></div>
                                                </>
                                            ) : (
                                                <>
                                                    <PhotoIcon className="w-8 h-8 text-slate-300 dark:text-white/10" />
                                                    <p className="text-[7px] font-black uppercase text-slate-400">Subir Banner</p>
                                                </>
                                            )}
                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <InputGroupPremium label="Nombre del Torneo" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} icon={<IdentificationIcon className="w-4 h-4" />} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputGroupPremium label="Categoría" type="select" value={formData.category} onChange={(e: any) => setFormData({ ...formData, category: e.target.value })} icon={<Squares2X2Icon className="w-4 h-4" />}>
                                                <option value="libre">LIBRE</option>
                                                <option value="sub-18">SUB-18</option>
                                                <option value="senior">SENIOR</option>
                                                <option value="femenino">FEMENINO</option>
                                            </InputGroupPremium>
                                            <InputGroupPremium label="Nivel" type="select" value={formData.skillLevel} onChange={(e: any) => setFormData({ ...formData, skillLevel: e.target.value })} icon={<StarIcon className="w-4 h-4" />}>
                                                <option value="todo_competidor">TODO COMPETIDOR</option>
                                                <option value="amateur">AMATEUR</option>
                                                <option value="profesional">PROFESIONAL</option>
                                            </InputGroupPremium>
                                        </div>
                                    </div>
                                </div>

                                {/* COLUMNA 2: LOGÍSTICA Y FORMATO */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputGroupPremium label="Recinto" type="select" value={formData.tenantId} onChange={(e: any) => setFormData({ ...formData, tenantId: e.target.value })} icon={<BuildingStorefrontIcon className="w-4 h-4" />}>
                                                <option value="">SELECCIONAR...</option>
                                                {tenants.map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                                            </InputGroupPremium>
                                            <InputGroupPremium label="Deporte" type="select" value={formData.sport} onChange={(e: any) => setFormData({ ...formData, sport: e.target.value })} icon={<PlayCircleIcon className="w-4 h-4" />}>
                                                <option value="">DEPORTE...</option>
                                                {formData.tenantId && tenants.find(t => t.id === formData.tenantId)?.activeSports?.map((s: string) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                            </InputGroupPremium>
                                        </div>
                                        <InputGroupPremium label="Formato Principal" type="select" value={formData.type} onChange={(e: any) => setFormData({ ...formData, type: e.target.value })} icon={<ChartBarIcon className="w-4 h-4" />}>
                                            <option value="liga">LIGA (ROUND ROBIN)</option>
                                            <option value="eliminacion">ELIMINACIÓN DIRECTA</option>
                                            <option value="fase_grupos">FASE DE GRUPOS + PLAYOFFS</option>
                                        </InputGroupPremium>
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputGroupPremium label="Max. Equipos" type="number" value={formData.maxTeams} onChange={(e: any) => setFormData({ ...formData, maxTeams: e.target.value })} icon={<UserGroupIcon className="w-4 h-4" />} />
                                            <InputGroupPremium label="Inscripción ($)" type="number" value={formData.price} onChange={(e: any) => setFormData({ ...formData, price: e.target.value })} icon={<CurrencyDollarIcon className="w-4 h-4" />} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputGroupPremium label="Inicio Registro" type="date" value={formData.registrationStartDate} onChange={(e: any) => setFormData({ ...formData, registrationStartDate: e.target.value })} />
                                            <InputGroupPremium label="Fin Registro" type="date" value={formData.registrationEndDate} onChange={(e: any) => setFormData({ ...formData, registrationEndDate: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputGroupPremium label="Inicio Torneo" type="date" value={formData.tournamentStartDate} onChange={(e: any) => setFormData({ ...formData, tournamentStartDate: e.target.value })} />
                                            <InputGroupPremium label="Fin Torneo" type="date" value={formData.tournamentEndDate} onChange={(e: any) => setFormData({ ...formData, tournamentEndDate: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                {/* COLUMNA 3: PREMIOS Y REGLAS */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black uppercase text-amber-600 tracking-[0.2em] block mb-1 border-b border-amber-500/10 pb-1">Bolsa de Premios</label>
                                        <div className="space-y-2">
                                            <InputGroupPremium label="1° (ORO)" value={formData.prize1} onChange={(e: any) => setFormData({ ...formData, prize1: e.target.value })} />
                                            <InputGroupPremium label="2° (PLATA)" value={formData.prize2} onChange={(e: any) => setFormData({ ...formData, prize2: e.target.value })} />
                                            <InputGroupPremium label="3° (BRONCE)" value={formData.prize3} onChange={(e: any) => setFormData({ ...formData, prize3: e.target.value })} />
                                        </div>
                                        <div className="space-y-3 pt-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-black uppercase text-black">Reglas y Descripción</label>
                                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl text-[9px] font-normal outline-none h-16 uppercase resize-none focus:border-amber-500 text-black dark:text-white" />
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10">
                                                <div className="flex flex-col"><span className="text-[9px] font-black uppercase text-black dark:text-white">Ida y Vuelta</span><span className="text-[7px] text-slate-400 uppercase font-normal mt-1">Doble partido (La final es a partido único)</span></div>
                                                <button type="button" onClick={() => setFormData({ ...formData, isHomeAway: !formData.isHomeAway })} className={`w-10 h-5 rounded-full transition-all flex items-center px-1 ${formData.isHomeAway ? 'bg-amber-500' : 'bg-slate-200 dark:bg-white/10'}`}><div className={`w-3 h-3 rounded-full bg-white transition-all ${formData.isHomeAway ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" disabled={saving} className="w-full py-4 bg-black dark:bg-amber-600 text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2">
                                {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ShieldCheckIcon className="w-4 h-4" />}
                                {isEditing ? 'ACTUALIZAR COMPETICIÓN' : 'LANZAR COMPETICIÓN'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL FIXTURE (RESTAURADO) */}
            {fixtureModal.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn" onClick={() => setFixtureModal({ ...fixtureModal, isOpen: false })}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#0B0F19] w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-widest">{fixtureModal.tournament?.name} - Fixture</h3>
                            <button onClick={() => setFixtureModal({ ...fixtureModal, isOpen: false })} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-400"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {fixtureModal.step === 'validation' && (
                                <div className="max-w-md mx-auto space-y-6 text-center py-10">
                                    <div className="p-5 bg-amber-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 border border-amber-500/20"><TrophyIcon className="w-10 h-10 text-amber-600" /></div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter">Preparando Panel de Competición</h4>
                                    <div className="space-y-3">
                                        {fixtureModal.validations.map((v: any, idx: number) => (
                                            <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${v.ok ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20' : 'bg-red-50 border-red-100 dark:bg-red-500/5 dark:border-red-500/20'}`}>
                                                <div className="flex items-center gap-3">{v.ok ? <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> : <ExclamationCircleIcon className="w-5 h-5 text-red-500" />}<span className={`text-[10px] font-black uppercase ${v.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{v.label}</span></div>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${v.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{v.ok ? 'OK' : 'FAIL'}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button disabled={!fixtureModal.validations.every((v: any) => v.ok)} onClick={handleGenerateFixture} className="w-full bg-slate-950 dark:bg-amber-600 text-white dark:text-slate-950 py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">INICIAR SORTEO DE BOLILLAS</button>
                                </div>
                            )}
                            {fixtureModal.step === 'draw' && (
                                <div className="space-y-10 py-10 animate-fadeIn">
                                    <div className="grid grid-cols-2 gap-10 max-w-4xl mx-auto">
                                        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-[2.5rem] p-10 border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center space-y-8">
                                            <div className="w-40 h-40 rounded-full border-4 border-dashed border-amber-500/30 flex items-center justify-center relative animate-pulse">
                                                {drawAnimation.currentPair[0] || drawAnimation.currentPair[1] ? <div className="text-sm font-black text-amber-500 animate-bounce uppercase">{drawAnimation.currentPair[0] || drawAnimation.currentPair[1]}</div> : <TrophyIcon className="w-16 h-16 text-slate-200 dark:text-white/5" />}
                                            </div>
                                            <button onClick={pickBall} disabled={drawAnimation.remainingTeams.length === 0} className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all disabled:opacity-30">SACAR BOLILLA DEL BINGO</button>
                                        </div>
                                        <div className="space-y-5">
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Emparejamientos en Vivo</h5>
                                            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                                                {drawAnimation.completedMatches.map((m: any, idx: number) => (
                                                    <div key={idx} className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] font-black uppercase shadow-sm"><span className="truncate flex-1 text-left text-slate-900 dark:text-white">{m.t1}</span><span className="mx-4 text-amber-500 italic text-[9px]">VS</span><span className="truncate flex-1 text-right text-slate-900 dark:text-white">{m.t2}</span></div>
                                                ))}
                                                {drawAnimation.currentPair[0] && <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 flex items-center justify-between text-[11px] font-black uppercase animate-pulse"><span className="truncate flex-1 text-left text-amber-600">{drawAnimation.currentPair[0]}</span><span className="mx-4 text-amber-500 italic text-[9px]">VS</span><span className="truncate flex-1 text-right text-slate-300 tracking-tighter">? ? ?</span></div>}
                                            </div>
                                        </div>
                                    </div>
                                    {drawAnimation.remainingTeams.length === 0 && <button onClick={handleFinalizeDraw} className="w-full max-w-xl mx-auto block bg-emerald-600 text-white py-5 rounded-[2rem] text-[11px] font-black uppercase shadow-2xl animate-bounce">CONFIRMAR FIXTURE Y LANZAR TORNEO</button>}
                                </div>
                            )}
                            {fixtureModal.step === 'review' && (
                                <div className="space-y-8 animate-slideUp">
                                    <div className="flex justify-center gap-3 bg-slate-50 dark:bg-white/5 p-2 rounded-2xl w-fit mx-auto border border-slate-100 dark:border-white/5 shadow-sm">
                                        <button className="px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all bg-amber-500 text-white shadow-xl shadow-amber-500/20">Calendario de Jornadas</button>
                                        <button className="px-8 py-3 rounded-xl text-[10px] font-black uppercase text-slate-400">Tabla de Posiciones</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {fixtureModal.fixtureData?.matches?.filter((m: any) => m.round === fixtureModal.selectedRound).map((match: any, idx: number) => (
                                            <div key={idx} className="bg-white dark:bg-[#0B0F19] p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-lg space-y-5 transition-transform hover:scale-[1.02]">
                                                <div className="flex justify-between items-center"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Match #{idx + 1}</span><span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${match.status === 'finished' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{match.status === 'finished' ? 'Finalizado' : 'Próximamente'}</span></div>
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex-1 text-center space-y-2"><div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl mx-auto flex items-center justify-center text-[12px] font-black shadow-inner">{match.team1_name[0]}</div><p className="text-[10px] font-black uppercase truncate text-slate-900 dark:text-white">{match.team1_name}</p></div>
                                                    <div className="flex flex-col items-center gap-2"><div className="flex items-center gap-3"><span className="text-2xl font-black text-slate-950 dark:text-white">{match.score1 ?? '-'}</span><span className="text-[12px] font-black text-slate-300 italic">VS</span><span className="text-2xl font-black text-slate-950 dark:text-white">{match.score2 ?? '-'}</span></div><button className="text-[9px] font-black text-blue-600 uppercase hover:bg-blue-50 dark:hover:bg-blue-500/10 px-3 py-1 rounded-lg transition-all">Editar Score</button></div>
                                                    <div className="flex-1 text-center space-y-2"><div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl mx-auto flex items-center justify-center text-[12px] font-black shadow-inner">{match.team2_name[0]}</div><p className="text-[10px] font-black uppercase truncate text-slate-900 dark:text-white">{match.team2_name}</p></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-center gap-6 pt-10 border-t border-slate-100 dark:border-white/5">
                                        <button onClick={() => setFixtureModal((p: any) => ({ ...p, selectedRound: Math.max(1, p.selectedRound - 1) }))} className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 transition-all disabled:opacity-20"><ChevronLeftIcon className="w-6 h-6 text-slate-900 dark:text-white" /></button>
                                        <div className="flex flex-col items-center"><span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Jornada</span><span className="text-2xl font-black text-amber-500">{fixtureModal.selectedRound}</span></div>
                                        <button onClick={() => setFixtureModal((p: any) => ({ ...p, selectedRound: Math.min(fixtureModal.fixtureData?.totalRounds || 1, p.selectedRound + 1) }))} className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 transition-all disabled:opacity-20"><ChevronRightIcon className="w-6 h-6 text-slate-900 dark:text-white" /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR ESTANDARIZADO */}
            {tournamentToDelete && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setTournamentToDelete(null)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-500/20">
                            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-black uppercase text-black dark:text-white mb-2 tracking-tighter">¿Eliminar Registro?</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Esta acción no se puede deshacer y borrará toda la información asociada.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setTournamentToDelete(null)} className="flex-1 py-3 text-[10px] font-black uppercase rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">CANCELAR</button>
                            <button onClick={handleDelete} className="flex-1 py-3 text-[10px] font-black uppercase rounded-xl text-white bg-red-600 shadow-xl shadow-red-600/20">CONFIRMAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PARTICIPANTES (EQUIPOS INSCRITOS) */}
            {participantsModal.isOpen && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setParticipantsModal({ isOpen: false, tournament: null })}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20"><UserGroupIcon className="w-5 h-5 text-white" /></div>
                                <div>
                                    <h3 className="text-xs font-black uppercase text-black dark:text-white tracking-widest">Equipos Inscritos</h3>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">{participantsModal.tournament?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setParticipantsModal({ isOpen: false, tournament: null })} className="p-2 text-slate-400 hover:text-black dark:hover:text-white transition-colors"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {!participantsModal.tournament?.teams || participantsModal.tournament?.teams.length === 0 ? (
                                <div className="text-center py-20">
                                    <UserGroupIcon className="w-12 h-12 text-slate-200 dark:text-white/5 mx-auto mb-4" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay equipos inscritos aún</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {participantsModal.tournament?.teams.map((team: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden">
                                                    {team.logo ? <img src={team.logo} className="w-full h-full object-cover" alt="" /> : <FlagIcon className="w-5 h-5 text-slate-300" />}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-black dark:text-white uppercase">{team.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-slate-400 uppercase">Inscrito</p>
                                                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{new Date(team.registeredAt || Date.now()).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex justify-between items-center px-8">
                            <span className="text-[10px] font-black text-black dark:text-white uppercase">Total Inscritos</span>
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
            <label className="text-[8px] font-black uppercase tracking-[0.1em] text-black transition-colors pl-0.5">{label}</label>
            <div className="relative">
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20 group-focus-within:text-amber-500 transition-colors">{icon}</div>}
                {type === 'select' ? (
                    <select value={value || ''} onChange={onChange} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-8 py-2 bg-white dark:bg-[#0B0F19] border border-slate-100 dark:border-white/5 rounded-xl text-[10px] font-normal text-black dark:text-white focus:border-amber-500 outline-none transition-all appearance-none uppercase cursor-pointer shadow-sm`}>{children}</select>
                ) : (
                    <input type={type} value={value || ''} onChange={onChange} readOnly={readOnly} placeholder={placeholder} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-3 py-2 rounded-xl border text-[10px] font-normal transition-all outline-none shadow-sm ${readOnly ? 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-white/5 dark:border-white/5' : 'bg-white border-slate-100 text-black focus:border-amber-500 dark:bg-[#0B0F19] dark:border-white/5 dark:text-white'}`} />
                )}
                {type === 'select' && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300"><ChevronDownIcon className="w-3 h-3" /></div>}
            </div>
        </div>
    );
}
