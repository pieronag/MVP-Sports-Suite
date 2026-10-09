"use client";
import { uploadImage } from "@/services/imageUpload";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, getDocs, getDoc, query, where, orderBy, limit, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, onSnapshot, Timestamp, writeBatch, setDoc } from 'firebase/firestore';
import { auditService } from '@/services/auditService';
import {
    Add01Icon,
    Alert01Icon,
    Alert02Icon,
    BarChartIcon,
    BlockedIcon,
    Building01Icon,
    Calendar03Icon,
    Cancel01Icon,
    CheckmarkCircle02Icon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    Clock01Icon,
    CloudUploadIcon,
    DocumentCodeIcon,
    Flag01Icon,
    Grid02Icon,
    IdentityCardIcon,
    Image01Icon,
    InformationCircleIcon,
    LockIcon,
    MapPinIcon,
    MoneyBag01Icon,
    PencilEdit02Icon,
    PhoneIcon,
    PlayCircleIcon,
    PowerIcon,
    RefreshIcon,
    ShieldCheckIcon,
    SparklesIcon,
    StarIcon,
    TrashIcon,
    TrophyIcon,
    UserGroupIcon,
    UserIcon,
} from '@hugeicons/core-free-icons';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';
import ModalPortal from '@/components/ui/ModalPortal';
import { SoccerIcon, PadelIcon, TennisIcon, BasketballIcon, VolleyballIcon } from '@/components/icons/SportsIcons';

const TOURNAMENT_SPORTS = ['Fútbol', 'Pádel', 'Tenis', 'Básquetbol', 'Vóleibol'];
const normalizeSportName = (str: string) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
const sportIcon = (sport: string, cls: string) => {
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
const SPORT_CONFIG: Record<string, any> = {
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
const getSportConfig = (sport: string) => SPORT_CONFIG[sport] || SPORT_CONFIG['Pádel'];

const sportStyle = (sport: string) => {
    const map: any = {
        'Fútbol': { gradient: 'from-emerald-500 to-teal-600', chip: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border-emerald-100 dark:border-emerald-500/20' },
        'Futbolito': { gradient: 'from-emerald-500 to-lime-600', chip: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border-emerald-100 dark:border-emerald-500/20' },
        'Pádel': { gradient: 'from-orange-500 to-amber-600', chip: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 border-orange-100 dark:border-orange-500/20' },
        'Tenis': { gradient: 'from-sky-500 to-blue-600', chip: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 border-sky-100 dark:border-sky-500/20' },
        'Básquetbol': { gradient: 'from-indigo-500 to-violet-600', chip: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 border-indigo-100 dark:border-indigo-500/20' },
        'Vóleibol': { gradient: 'from-purple-500 to-fuchsia-600', chip: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 border-purple-100 dark:border-purple-500/20' },
    };
    return map[sport] || { gradient: 'from-amber-500 to-orange-600', chip: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 border-amber-100 dark:border-amber-500/20' };
};

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

const formatCLP = (n: number) => n.toLocaleString('es-CL');

const buildStandings = (matches: any[]) => {
    const table: any = {};
    (matches || []).filter(m => m.status === 'finished' && m.score1 != null && m.score2 != null).forEach(m => {
        const t1 = m.team1_name, t2 = m.team2_name;
        if (!table[t1]) table[t1] = { name: t1, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
        if (!table[t2]) table[t2] = { name: t2, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
        table[t1].pj++; table[t2].pj++;
        table[t1].gf += m.score1; table[t1].gc += m.score2;
        table[t2].gf += m.score2; table[t2].gc += m.score1;
        if (m.score1 > m.score2) { table[t1].pg++; table[t1].pts += 3; table[t2].pp++; }
        else if (m.score2 > m.score1) { table[t2].pg++; table[t2].pts += 3; table[t1].pp++; }
        else { table[t1].pe++; table[t2].pe++; table[t1].pts++; table[t2].pts++; }
    });
    return Object.values(table).sort((a: any, b: any) => (b.pts - a.pts) || ((b.gf - b.gc) - (a.gf - a.gc)));
};

// --- COMPONENTE TOAST ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-md shadow-2xl border animate-slideInRight backdrop-blur-md ${type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:text-[#00df82] dark:border-emerald-500/50' :
                'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:text-red-400 dark:border-red-500/50'
            }`}>
            {type === 'success' ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5" /> : <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" />}
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
        validations: [], fixtureData: null, selectedRound: 1, view: 'calendar'
    });
    const [drawAnimation, setDrawAnimation] = useState<any>({
        isDrawing: false, remainingTeams: [], drawnTeams: [],
        currentPair: [null, null], completedMatches: [], revealed: false
    });
    const [reel, setReel] = useState<{ phase: 'idle' | 'spinning' | 'blink', name: string | null }>({ phase: 'idle', name: null });
    const spinRef = useRef<number | null>(null);
    const spinTimeoutRef = useRef<number | null>(null);
    const spinTimeoutRef2 = useRef<number | null>(null);

    const [participantsModal, setParticipantsModal] = useState<any>({ isOpen: false, tournament: null });
    const [isPairsModalOpen, setIsPairsModalOpen] = useState(false);

    const INITIAL_FORM_STATE = {
        name: '', imageUrl: '', imagePreview: '', tenantId: '',
        type: 'liga', category: 'libre', skillLevel: 'todo_competidor',
        maxTeams: 16, price: '', registrationStartDate: '', registrationEndDate: '',
        tournamentStartDate: '', tournamentEndDate: '', description: '', rules: '',
        prize1: '', prize2: '', prize3: '', isHomeAway: false, isFinalSingleMatch: true, sport: '',
        startTime: '', endTime: '', teamSize: 2, matchDuration: 60, contactPhone: ''
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

    const handleSportSelect = (sport: string) => {
        const cfg = getSportConfig(sport);
        setFormData(prev => ({ ...prev, sport, teamSize: cfg.teamSize, matchDuration: cfg.matchDuration, type: cfg.type, category: cfg.category, skillLevel: cfg.skillLevel }));
    };

    const seedDemoTournaments = async () => {
        if (!user?.uid) return;
        setSaving(true);
        const tenantId = tenants[0]?.id || '';
        const teamNames = ['Furia Roja', 'Los Halcones', 'Team Cobra', 'Santiago FC', 'Deportes Andes', 'Cóndores', 'Leones del Sur', 'Lobos Urbanos', 'Titanes', 'Dragones', 'Vikingos', 'Guerreros', 'Atlético Norte', 'Real Patagonia', 'Celestes', 'Aurora', 'Fénix', 'Pumas', 'Águilas', 'Toros', 'Huracanes'];
        const futbolitoTeams = ['Los Cafeteros', 'Real Sociedad CHL', 'Atlético Valdivia', 'Deportes Arica', 'San Felipe Unido', 'Cóndor de Quillota', 'Los Diablos', 'Santiago Wanderers', 'Everton Viña', 'La Serena FC', 'Cobresal', 'O Higgins', 'Ñublense', 'Curicó Unido', 'Rangers de Talca', 'Melipilla', 'Unión San Felipe', 'San Luis', 'Coquimbo Unido', 'Puerto Montt', 'Deportes Temuco', 'Iberia', 'Malleco', 'Deportes Copiapó', 'Deportes Antofagasta', 'Cobreloa', 'Calama FC', 'Aguas Rojas', 'Cielo Austral', 'Ruta 68', 'Barrio Norte FC', 'Maipú Sports'].map((name, i) => ({ id: `demo-team-${i}-${Date.now()}`, name, registeredAt: new Date() }));
        const makeTeams = (n: number) => teamNames.slice(0, n).map((name, i) => ({ id: `demo-team-${i}-${Date.now()}`, name, registeredAt: new Date() }));
        const demos = [
            { name: 'Futbolito 32 · Copa King', sport: 'Futbolito', type: 'eliminacion', category: 'libre', skillLevel: 'todo_competidor', maxTeams: 32, teamSize: 7, matchDuration: 60, price: 40000, prize1: 'Trofeo + $500.000', prize2: '$200.000', prize3: 'Kit completo', description: 'Eliminación directa con 32 equipos. Cuadro completo.', startTime: '10:00', endTime: '23:00', customTeams: futbolitoTeams },
            { name: 'Copa Furia · Liga Fútbol', sport: 'Fútbol', type: 'liga', category: 'libre', skillLevel: 'todo_competidor', maxTeams: 8, teamSize: 7, matchDuration: 100, price: 50000, prize1: 'Trofeo + $200.000', prize2: 'Medallas', prize3: 'Kit deportivo', description: 'Torneo de prueba formato liga (round robin).', startTime: '10:00', endTime: '20:00' },
            { name: 'Masters Pádel · Eliminación', sport: 'Pádel', type: 'eliminacion', category: 'tercera', skillLevel: 'avanzado', maxTeams: 8, teamSize: 2, matchDuration: 60, price: 45000, prize1: '$150.000', prize2: 'Paletas', prize3: 'Accesorios', description: 'Eliminación directa 8 parejas.', startTime: '18:00', endTime: '23:00' },
            { name: 'Open Tenis · Eliminación', sport: 'Tenis', type: 'eliminacion', category: 'libre', skillLevel: 'profesional', maxTeams: 8, teamSize: 1, matchDuration: 90, price: 60000, prize1: '$300.000', prize2: '$100.000', prize3: 'Canastos', description: 'Cuadro de 8, singles.', startTime: '09:00', endTime: '19:00' },
            { name: 'Liga Básquetbol · Grupos', sport: 'Básquetbol', type: 'fase_grupos', category: 'sub-18', skillLevel: 'amateur', maxTeams: 4, teamSize: 5, matchDuration: 40, price: 40000, prize1: 'Trofeo + $80.000', prize2: 'Medallas', prize3: 'Balones', description: 'Fase de grupos + playoffs.', startTime: '17:00', endTime: '21:00' },
            { name: 'Torneo Vóleibol · Liga', sport: 'Vóleibol', type: 'liga', category: 'femenino', skillLevel: 'todo_competidor', maxTeams: 6, teamSize: 6, matchDuration: 75, price: 35000, prize1: '$120.000', prize2: 'Medallas', prize3: 'Red oficial', description: 'Liga femenina 6 equipos.', startTime: '16:00', endTime: '22:00' },
        ];
        try {
            let created = 0;
            for (const d of demos) {
                const existing = await getDocs(query(collection(db, "tournaments"), where("name", "==", d.name), where("ownerId", "==", user.uid)));
                if (!existing.empty) continue;
                await addDoc(collection(db, "tournaments"), {
                    ...d,
                    tenantId,
                    imageUrl: '',
                    registrationStartDate: '2026-10-01',
                    registrationEndDate: '2026-11-15',
                    tournamentStartDate: '2026-11-20',
                    tournamentEndDate: '2026-12-20',
                    isHomeAway: false,
                    isFinalSingleMatch: true,
                    contactPhone: '+56 9 5555 1234',
                    enrolledTeams: d.maxTeams,
                    teams: d.customTeams || makeTeams(d.maxTeams),
                    status: 'upcoming',
                    ownerId: user.uid,
                    isVisibleInApp: true,
                    createdAt: serverTimestamp(),
                });
                created++;
            }
            addToast(created > 0 ? `${created} torneos demo creados (100% inscripciones)` : 'Los torneos demo ya estaban cargados', 'success');
            fetchData();
        } catch (e) { addToast("Error al crear torneos demo", 'error'); } finally { setSaving(false); }
    };

    // FIXTURE ACTIONS
    const handleStartTournament = (t: any) => {
        const teams = t.teams || [];
        const validations = [
            { label: "Equipos Mínimos (2)", ok: teams.length >= 2 },
            { label: "Cupos Completos", ok: teams.length >= t.maxTeams },
            { label: "Configuración de Premios", ok: !!t.prize1 }
        ];
        setFixtureModal({ isOpen: true, tournament: t, step: 'validation', validations, selectedRound: 1, view: 'calendar' });
    };

    const handleGenerateFixture = () => {
        const teams = shuffleArray(fixtureModal.tournament.teams || []);
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
        const res = generateFixture(fixtureModal.tournament, drawAnimation.drawnTeams);
        setFixtureModal((prev: any) => ({ ...prev, step: 'review', fixtureData: res }));
        await updateDoc(doc(db, "tournaments", fixtureModal.tournament.id), { fixture: res, status: 'active' });
        fetchData();
    };

    const handleOpenFixture = (t: any) => {
        if (!t.fixture) return handleStartTournament(t);
        setFixtureModal({ isOpen: true, tournament: t, step: 'review', fixtureData: t.fixture, selectedRound: 1, view: 'calendar' });
    };

    const sportCfg = getSportConfig(formData.sport);

    const skillLabel = (s: string) => ({ todo_competidor: 'Todo competidor', amateur: 'Amateur', profesional: 'Profesional', principiante: 'Principiante', avanzado: 'Avanzado' }[s] || s || '—');
    const teamInitials = (name: string) => name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-amber-500 rounded-md"></span>
                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-[0.2em] uppercase">Módulo de Competiciones</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">Gestión de <span className="text-amber-500 dark:text-amber-400">Campeonatos</span></h1>
                </div>
                <div className="flex items-center gap-2.5">
                    <button onClick={seedDemoTournaments} disabled={saving} title="Cargar torneos demo con 100% de inscripciones para probar el fixture" className="px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 rounded-md text-[10px] font-black uppercase tracking-widest hover:border-amber-400/40 hover:text-amber-500 transition-all active:scale-95">
                        Datos demo
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-amber-500 text-white font-black text-[10px] uppercase rounded-md shadow-xl shadow-amber-500/25 flex items-center gap-2.5 hover:brightness-110 active:scale-95 transition-all"><HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> Nuevo Torneo</button>
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <TarjetaKpi label="Torneos" value={tournaments.length.toString()} sub="Competiciones" icon={<HugeiconsIcon icon={TrophyIcon} />} />
                <TarjetaKpi label="Activos" value={tournaments.filter(t => t.status === 'active').length.toString()} sub="En curso" icon={<HugeiconsIcon icon={PlayCircleIcon} />} />
                <TarjetaKpi label="Equipos" value={tournaments.reduce((acc, t) => acc + (t.teams?.length || 0), 0).toString()} sub="Participantes" icon={<HugeiconsIcon icon={UserGroupIcon} />} />
                <TarjetaKpi label="Potencial" value={`$${formatCLP(tournaments.reduce((acc, t) => acc + (t.maxTeams * (t.price || 0)), 0))}`} sub="Ingresos proyectados" icon={<HugeiconsIcon icon={MoneyBag01Icon} />} />
            </div>

            {/* LISTADO */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-pulse">
                    <HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 text-amber-500 animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando competiciones...</p>
                </div>
            ) : tournaments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white dark:bg-[#0B0F19] rounded-md border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-md flex items-center justify-center text-amber-500 border border-amber-100 dark:border-amber-500/20">
                        <HugeiconsIcon icon={TrophyIcon} className="w-8 h-8" strokeWidth={1.4} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Sin competiciones</p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Crea tu primer campeonato</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-md text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all">
                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> Nuevo Torneo
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tournaments.map((t: any) => {
                        const occupancy = t.maxTeams > 0 ? Math.min(Math.round(((t.teams?.length || 0) / t.maxTeams) * 100), 100) : 0;
                        const st = sportStyle(t.sport);
                        return (
                        <div key={t.id} className="group flex flex-col h-full bg-white dark:bg-[#0B0F19] rounded-md border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-black/40 hover:-translate-y-0.5">
                            {/* HERO */}
                            <div className={`relative h-36 bg-gradient-to-br ${st.gradient} overflow-hidden shrink-0`}>
                                {t.imageUrl ? <img src={t.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="" /> : null}
                                <div className="absolute -right-5 -bottom-9 opacity-10 group-hover:opacity-20 transition-opacity">
                                    {sportIcon(t.sport, 'w-28 h-28 text-white')}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
                                <div className="absolute top-3 left-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest border border-white/20 ${t.status === 'upcoming' ? 'bg-emerald-500/40' : 'bg-amber-500/40'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'upcoming' ? 'bg-white' : 'bg-amber-200 animate-pulse'}`} /> {t.status === 'upcoming' ? 'Inscripciones' : 'En Vivo'}
                                    </span>
                                </div>
                                <div className="absolute top-3 right-3 w-11 h-11 rounded-md bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-lg" title={t.sport || 'Deporte'}>
                                    {sportIcon(t.sport, 'w-6 h-6')}
                                </div>
                                <div className="absolute bottom-3 left-3 right-3">
                                    <h3 className="text-base font-black text-white uppercase truncate drop-shadow-lg font-heading">{t.name}</h3>
                                    <p className="text-[9px] font-bold text-white/90 uppercase mt-0.5 flex items-center gap-1.5">
                                        <HugeiconsIcon icon={Building01Icon} className="w-3 h-3" strokeWidth={2} /> {tenants.find(v => v.id === t.tenantId)?.name || 'Recinto'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                                {/* CHIPS */}
                                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[8px] font-black uppercase border w-fit ${st.chip}`}>
                                        {sportIcon(t.sport, 'w-3 h-3')} {t.sport || 'Deporte'}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[8px] font-black uppercase text-slate-500 dark:text-slate-300">
                                        {t.type === 'liga' ? 'Liga' : t.type === 'eliminacion' ? 'Eliminación' : 'Grupos + Playoffs'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[8px] font-black uppercase text-slate-500 dark:text-slate-300 ml-auto">
                                        <HugeiconsIcon icon={StarIcon} className="w-3 h-3 text-amber-500" strokeWidth={2} /> {skillLabel(t.skillLevel)}
                                    </span>
                                </div>

                                {/* SPECS GRID */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="p-2.5 rounded-md bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Inscripción</p>
                                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] font-mono">${formatCLP(Number(t.price) || 0)}</p>
                                    </div>
                                    <div className="p-2.5 rounded-md bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Equipo</p>
                                        <p className="text-[11px] font-black text-slate-900 dark:text-white font-mono">{t.teamSize || 2} jug.</p>
                                    </div>
                                    <div className="p-2.5 rounded-md bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Duración</p>
                                        <p className="text-[11px] font-black text-slate-900 dark:text-white font-mono">{t.matchDuration || 60} min</p>
                                    </div>
                                    <div className="p-2.5 rounded-md bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Jornada</p>
                                        <p className="text-[11px] font-black text-slate-900 dark:text-white font-mono">{t.startTime || '--:--'}{t.endTime ? ` - ${t.endTime}` : ''}</p>
                                    </div>
                                </div>

                                {/* EQUIPOS INSCRITOS */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Equipos inscritos</span>
                                        <span className="text-[10px] font-black text-slate-900 dark:text-white font-mono">{(t.teams?.length || 0)} / {t.maxTeams}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        {(t.teams || []).slice(0, 3).map((team: any, i: number) => (
                                            <span key={i} className="w-7 h-7 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[8px] font-black text-slate-500 dark:text-slate-300" title={team.name}>{teamInitials(team.name)}</span>
                                        ))}
                                        {(t.teams?.length || 0) > 3 && <span className="text-[9px] font-black text-slate-400">+{(t.teams?.length || 0) - 3} más</span>}
                                        <span className={`ml-auto text-[9px] font-black font-mono ${occupancy === 100 ? 'text-emerald-600 dark:text-[#00df82]' : 'text-amber-500'}`}>{occupancy}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000" style={{ width: `${occupancy}%` }} />
                                    </div>
                                </div>

                                {/* PREMIOS */}
                                <div className="space-y-1.5 bg-slate-50 dark:bg-white/[0.03] p-3 rounded-md border border-slate-100 dark:border-white/5 mb-4">
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /><span className="text-[8px] font-black text-amber-600 uppercase w-12">1°:</span><span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate uppercase">{t.prize1 || '---'}</span></div>
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /><span className="text-[8px] font-black text-slate-500 uppercase w-12">2°:</span><span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate uppercase">{t.prize2 || '---'}</span></div>
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-800" /><span className="text-[8px] font-black text-amber-800 uppercase w-12">3°:</span><span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate uppercase">{t.prize3 || '---'}</span></div>
                                </div>

                                {/* FOOTER ACCIONES */}
                                <div className="mt-auto p-2 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-2 -mx-4 -mb-4">
                                    <button onClick={() => handleOpenFixture(t)} className="py-2 flex items-center justify-center gap-1 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 text-[8px] font-black uppercase tracking-widest hover:text-emerald-500 hover:border-emerald-400/40 transition-all active:scale-95" title="Fixture">
                                        <HugeiconsIcon icon={PlayCircleIcon} className="w-3 h-3" /> Fixture
                                    </button>
                                    <button onClick={() => setParticipantsModal({ isOpen: true, tournament: t })} className="py-2 flex items-center justify-center gap-1 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 text-[8px] font-black uppercase tracking-widest hover:text-blue-500 hover:border-blue-400/40 transition-all active:scale-95" title="Equipos">
                                        <HugeiconsIcon icon={UserGroupIcon} className="w-3 h-3" /> Equipos
                                    </button>
                                    <button onClick={() => handleOpenEdit(t)} className="py-2 flex items-center justify-center gap-1 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 text-[8px] font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white hover:border-amber-400/40 transition-all active:scale-95" title="Editar">
                                        <HugeiconsIcon icon={PencilEdit02Icon} className="w-3 h-3" /> Editar
                                    </button>
                                    <button onClick={() => setTournamentToDelete(t.id)} className="py-2 flex items-center justify-center gap-1 bg-white dark:bg-white/5 rounded-md border border-red-100 dark:border-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95" title="Eliminar">
                                        <HugeiconsIcon icon={TrashIcon} className="w-3 h-3" /> Borrar
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
                <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn" onClick={handleCloseModal}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#0B0F19] w-full max-w-5xl rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                    <HugeiconsIcon icon={TrophyIcon} className="w-5 h-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5">{isEditing ? 'Editar competición' : 'Nueva competición'}</p>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">{isEditing ? 'Configurar Competición' : 'Lanzar Torneo'}</h3>
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 bg-slate-100 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shrink-0">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrUpdate} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                            {/* SELECCIÓN DE DEPORTE */}
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-4 bg-amber-500 rounded-md"></span>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Deporte</p>
                                    </div>
                                    <span className="text-[9px] font-black uppercase text-amber-500">{formData.sport || 'Seleccionar'}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {TOURNAMENT_SPORTS.map(s => {
                                        const on = formData.sport === s;
                                        return (
                                            <button key={s} type="button" onClick={() => handleSportSelect(s)} className={`flex flex-col items-center gap-1.5 p-3 rounded-md border transition-all active:scale-95 ${on ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/25' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-amber-400/40 hover:text-amber-500'}`}>
                                                {sportIcon(s, `w-5 h-5 ${on ? 'text-white' : 'text-amber-500'}`)}
                                                <span className="text-[9px] font-black uppercase">{s}</span>
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
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Identidad</p>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Imagen de Portada</label>
                                        <div className="relative group aspect-video bg-slate-50 dark:bg-white/5 rounded-md border-2 border-dashed border-slate-200 dark:border-white/10 overflow-hidden flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-amber-500/50 transition-all">
                                            {formData.imagePreview ? (
                                                <>
                                                    <img src={formData.imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><HugeiconsIcon icon={CloudUploadIcon} className="w-6 h-6 text-white" /></div>
                                                </>
                                            ) : (
                                                <>
                                                    <HugeiconsIcon icon={Image01Icon} className="w-8 h-8 text-slate-300 dark:text-white/10" />
                                                    <p className="text-[7px] font-black uppercase text-slate-400">Subir Banner</p>
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
                                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Descripción</label>
                                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3.5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[10px] font-bold outline-none h-20 uppercase resize-none focus:border-amber-500 text-slate-700 dark:text-white" placeholder="Reglas y condiciones..." />
                                    </div>
                                </div>

                                {/* COLUMNA 2: ORGANIZACIÓN */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-4 bg-amber-500 rounded-md"></span>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Organización</p>
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
                                    <p className="text-[8px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5 -mt-2">
                                        <HugeiconsIcon icon={SparklesIcon} className="w-3 h-3" strokeWidth={2} /> Recomendado para {formData.sport || 'este deporte'}: {formData.type === 'liga' ? 'Liga' : formData.type === 'eliminacion' ? 'Eliminación directa' : 'Grupos + Playoffs'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputGroupPremium label="Max. Equipos" type="number" value={formData.maxTeams} onChange={(e: any) => setFormData({ ...formData, maxTeams: e.target.value })} icon={<HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" />} />
                                        <InputGroupPremium label="Inscripción ($)" type="number" value={formData.price} onChange={(e: any) => setFormData({ ...formData, price: e.target.value })} icon={<HugeiconsIcon icon={MoneyBag01Icon} className="w-4 h-4" />} />
                                    </div>
                                    <InputGroupPremium label={sportCfg.teamHint} type="select" value={formData.teamSize} onChange={(e: any) => setFormData({ ...formData, teamSize: Number(e.target.value) })} icon={<HugeiconsIcon icon={UserIcon} className="w-4 h-4" />}>
                                        {sportCfg.teamSizes.map((n: number) => <option key={n} value={n}>{n} {n === 1 ? 'JUGADOR (SINGLES)' : n === 2 ? 'JUGADORES (PAREJAS)' : 'JUGADORES'}</option>)}
                                    </InputGroupPremium>
                                    <InputGroupPremium label="WhatsApp Organizador" value={formData.contactPhone} onChange={(e: any) => setFormData({ ...formData, contactPhone: e.target.value })} icon={<HugeiconsIcon icon={PhoneIcon} className="w-4 h-4 text-emerald-500" />} placeholder="+56 9..." />
                                </div>

                                {/* COLUMNA 3: CALENDARIO Y PREMIOS */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-4 bg-amber-500 rounded-md"></span>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Calendario y premios</p>
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
                                            <span className="text-[10px] font-black uppercase text-slate-700 dark:text-white">Ida y Vuelta</span>
                                            <span className="text-[7px] text-slate-400 uppercase font-bold mt-1">Doble partido · Final a partido único</span>
                                        </div>
                                        <button type="button" onClick={() => setFormData({ ...formData, isHomeAway: !formData.isHomeAway })} className={`w-10 h-5 rounded-full transition-all flex items-center px-1 ${formData.isHomeAway ? 'bg-amber-500' : 'bg-slate-200 dark:bg-white/10'}`}><div className={`w-3 h-3 rounded-full bg-white transition-all ${formData.isHomeAway ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                                    </div>
                                </div>
                            </div>

                            {/* VISTA PREVIA */}
                            <div className="rounded-md border border-slate-200 dark:border-white/10 overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-amber-500 rounded-md"></span>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Vista previa del torneo</p>
                                </div>
                                <div className="p-4 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                        {formData.imagePreview ? <img src={formData.imagePreview} className="w-full h-full object-cover rounded-md" alt="" /> : sportIcon(formData.sport, 'w-6 h-6')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black uppercase text-slate-900 dark:text-white truncate font-heading">{formData.name || 'Nombre del torneo'}</p>
                                        <p className="text-[9px] font-bold text-amber-500 uppercase mt-0.5">{(formData.sport || 'Deporte')} · {formData.type === 'liga' ? 'Liga' : formData.type === 'eliminacion' ? 'Eliminación' : 'Grupos + Playoffs'} · {tenants.find(v => v.id === formData.tenantId)?.name?.toUpperCase() || 'Recinto'}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-black text-emerald-600 dark:text-[#00df82] font-mono">${formatCLP(Number(formData.price) || 0)}</p>
                                        <p className="text-[8px] font-black uppercase text-slate-400">inscripción</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={handleCloseModal} className="flex-1 py-3.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Cancelar</button>
                                <button type="submit" disabled={saving} className="flex-[2] py-3.5 bg-amber-500 text-white rounded-md text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" /> : <HugeiconsIcon icon={ShieldCheckIcon} className="w-4 h-4" />}
                                    {isEditing ? 'Actualizar Competición' : 'Lanzar Competición'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL FIXTURE */}
            {fixtureModal.isOpen && (
                <ModalPortal>
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn" onClick={() => setFixtureModal({ ...fixtureModal, isOpen: false })}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#0B0F19] w-full max-w-6xl rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh]">
                        {/* HEADER */}
                        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                    <HugeiconsIcon icon={TrophyIcon} className="w-5 h-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5">Panel de competición</p>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">{fixtureModal.tournament?.name}</h3>
                                </div>
                            </div>
                            <button onClick={() => setFixtureModal({ ...fixtureModal, isOpen: false })} className="p-2 bg-slate-100 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shrink-0">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>

                        {/* STEPPER */}
                        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/40 dark:bg-white/[0.01]">
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
                                                <p className={`text-[10px] font-black uppercase tracking-widest ${cur || done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{s.label}</p>
                                                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">{done ? 'Completado' : cur ? 'En curso' : `Paso ${i + 1}`}</p>
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
                            <div className={`relative overflow-hidden rounded-md bg-gradient-to-br ${sportStyle(fixtureModal.tournament?.sport).gradient} p-6 mb-6 shrink-0`}>
                                <div className="absolute -right-6 -bottom-10 opacity-10">{sportIcon(fixtureModal.tournament?.sport, 'w-32 h-32 text-white')}</div>
                                <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/80 mb-1">Fixture del torneo</p>
                                        <h2 className="text-lg font-black uppercase text-white tracking-tight font-heading">{fixtureModal.tournament?.name}</h2>
                                        <p className="text-[9px] font-bold text-white/90 uppercase mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                            <span className="flex items-center gap-1.5"><HugeiconsIcon icon={TrophyIcon} className="w-3 h-3" /> {fixtureModal.tournament?.sport || 'Deporte'}</span>
                                            <span className="flex items-center gap-1.5"><HugeiconsIcon icon={BarChartIcon} className="w-3 h-3" /> {fixtureModal.tournament?.type === 'liga' ? 'Liga' : fixtureModal.tournament?.type === 'eliminacion' ? 'Eliminación directa' : 'Grupos + Playoffs'}</span>
                                            <span className="flex items-center gap-1.5"><HugeiconsIcon icon={UserGroupIcon} className="w-3 h-3" /> {(fixtureModal.tournament?.teams?.length || 0)} equipos</span>
                                        </p>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <div className="px-4 py-2.5 rounded-md bg-white/15 backdrop-blur-md border border-white/25 text-center min-w-[90px]">
                                            <p className="text-[8px] font-black uppercase text-white/80 tracking-widest">Premio 1°</p>
                                            <p className="text-[11px] font-black text-white truncate max-w-[140px] uppercase">{fixtureModal.tournament?.prize1 || '---'}</p>
                                        </div>
                                        <div className="px-4 py-2.5 rounded-md bg-white/15 backdrop-blur-md border border-white/25 text-center min-w-[90px]">
                                            <p className="text-[8px] font-black uppercase text-white/80 tracking-widest">Inscripción</p>
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
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Estado del torneo</p>
                                        <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">Preparando el panel de competición</h4>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { icon: UserGroupIcon, value: `${fixtureModal.tournament?.teams?.length || 0} / ${fixtureModal.tournament?.maxTeams || 0}`, label: 'Equipos', ok: !!(fixtureModal.validations[1]?.ok) },
                                            { icon: BarChartIcon, value: fixtureModal.tournament?.type === 'liga' ? 'Liga' : fixtureModal.tournament?.type === 'eliminacion' ? 'Eliminación' : 'Grupos', label: 'Formato', ok: true },
                                            { icon: ShieldCheckIcon, value: fixtureModal.tournament?.prize1 ? 'Listo' : 'Pendiente', label: 'Premios', ok: !!(fixtureModal.validations[2]?.ok) },
                                        ].map((s, i) => (
                                            <div key={i} className={`relative p-4 rounded-md border text-center transition-all ${s.ok ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]'}`}>
                                                {s.ok && (
                                                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 dark:bg-[#00df82] flex items-center justify-center">
                                                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3 h-3 text-white dark:text-black" strokeWidth={2.5} />
                                                    </span>
                                                )}
                                                <div className={`w-9 h-9 mx-auto mb-2 rounded-md flex items-center justify-center transition-all ${s.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82]' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    <HugeiconsIcon icon={s.icon} className="w-4 h-4" strokeWidth={1.8} />
                                                </div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white font-mono leading-none">{s.value}</p>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1.5">{s.label}</p>
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
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Sorteo de bolillas</p>
                                            <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading mt-1">Emparejamiento en vivo</h4>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <div className="px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-[#00df82] text-[10px] font-black uppercase">
                                                {drawAnimation.completedMatches.length} emparejados
                                            </div>
                                            <div className="px-3 py-2 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 text-[10px] font-black uppercase">
                                                {drawAnimation.remainingTeams.length} por sortear
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500" style={{ width: `${(drawAnimation.drawnTeams.length / Math.max(drawAnimation.drawnTeams.length + drawAnimation.remainingTeams.length, 1)) * 100}%` }} />
                                    </div>

                                    {/* MESA DE SORTEO (COLOR DEL DEPORTE) */}
                                    <div className={`relative overflow-hidden rounded-md border border-white/20 bg-gradient-to-br ${st.gradient} p-6 shadow-2xl`}>
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
                                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white font-heading">Mesa de sorteo</p>
                                                        <p className="text-[8px] font-bold uppercase tracking-widest text-white/70">Emparejamiento automático en vivo</p>
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1.5 rounded-md bg-white/15 border border-white/25 text-white text-[9px] font-black uppercase tracking-widest">
                                                    {drawAnimation.drawnTeams.length} / {totalBalls} bolillas
                                                </span>
                                            </div>

                                            {/* ESCENARIO DE EMPAREJAMIENTO */}
                                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6">
                                                {/* SLOT 1 */}
                                                <div className={`rounded-lg border-2 p-5 text-center transition-all duration-300 ${drawAnimation.currentPair[0] ? 'border-white/70 bg-white text-slate-900 shadow-xl shadow-black/10' : 'border-dashed border-white/40 bg-white/10'}`}>
                                                    {drawAnimation.currentPair[0] ? (
                                                        <div className="space-y-2 animate-fadeIn">
                                                            <div className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${st.gradient} flex items-center justify-center text-white text-sm font-black font-heading shadow-lg`}>
                                                                {teamInitials(drawAnimation.currentPair[0])}
                                                            </div>
                                                            <p className="text-slate-900 font-black uppercase text-sm truncate font-heading">{drawAnimation.currentPair[0]}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <div className="w-14 h-14 mx-auto rounded-full border-2 border-dashed border-white/40 flex items-center justify-center text-white/50 text-xl font-black">?</div>
                                                            <p className="text-white/60 font-black uppercase text-[9px] tracking-widest">Esperando equipo</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* VS */}
                                                <div className="flex flex-col items-center gap-2 shrink-0">
                                                    <div className="w-12 h-12 rounded-full bg-white text-slate-900 font-black text-sm flex items-center justify-center shadow-xl">VS</div>
                                                    <p className="text-[8px] font-black uppercase text-white/70 tracking-widest">Partido</p>
                                                </div>

                                                {/* SLOT 2 */}
                                                <div className={`rounded-lg border-2 p-5 text-center transition-all duration-300 ${drawAnimation.currentPair[1] ? 'border-white/70 bg-white text-slate-900 shadow-xl shadow-black/10' : 'border-dashed border-white/40 bg-white/10'}`}>
                                                    {drawAnimation.currentPair[1] ? (
                                                        <div className="space-y-2 animate-fadeIn">
                                                            <div className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${st.gradient} flex items-center justify-center text-white text-sm font-black font-heading shadow-lg`}>
                                                                {teamInitials(drawAnimation.currentPair[1])}
                                                            </div>
                                                            <p className="text-slate-900 font-black uppercase text-sm truncate font-heading">{drawAnimation.currentPair[1]}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <div className="w-14 h-14 mx-auto rounded-full border-2 border-dashed border-white/40 flex items-center justify-center text-white/50 text-xl font-black">?</div>
                                                            <p className="text-white/60 font-black uppercase text-[9px] tracking-widest">Esperando equipo</p>
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
                                                            Siguiente Sorteo <HugeiconsIcon icon={ChevronRightIcon} className="w-5 h-5" />
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
                                                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/70 to-transparent rounded-full" />
                                                        <div className="relative rounded-lg border-2 border-white/30 bg-black/50 backdrop-blur px-6 py-4 text-center overflow-hidden shadow-inner">
                                                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/10 pointer-events-none" />
                                                            <p className="relative text-[8px] font-black uppercase tracking-[0.3em] text-white/60 mb-1">Bolillero tragamonedas</p>
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
                                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-white/70 to-transparent rounded-full" />
                                                    </div>

                                                    <button onClick={pickBall} disabled={reel.phase !== 'idle' || drawAnimation.remainingTeams.length === 0} className="px-14 py-4 rounded-full bg-white text-slate-900 font-black text-[11px] uppercase tracking-[0.25em] shadow-[0_0_45px_rgba(255,255,255,0.4)] hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-3">
                                                        {reel.phase === 'spinning' ? <><HugeiconsIcon icon={RefreshIcon} className="w-5 h-5 animate-spin" /> Sorteando...</> : reel.phase === 'blink' ? <><HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5" /> ¡{reel.name} confirmado!</> : <><HugeiconsIcon icon={RefreshIcon} className="w-5 h-5" /> Sacar Bolilla</>}
                                                    </button>

                                                    <div className="flex flex-wrap gap-1.5 justify-center max-w-xl mx-auto">
                                                        {drawAnimation.remainingTeams.map((t: any, i: number) => (
                                                            <div key={i} className={`w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[8px] font-black text-white/80 transition-all hover:bg-white/35 ${reel.phase !== 'idle' ? 'animate-pulse' : ''}`} title={t.name}>{teamInitials(t.name)}</div>
                                                        ))}
                                                        {drawAnimation.remainingTeams.length === 0 && <p className="text-[10px] font-black uppercase text-white/70 tracking-widest">Todas las bolillas fueron sacadas</p>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* EMPAREJAMIENTOS (abre modal) */}
                                    <button onClick={() => setIsPairsModalOpen(true)} className="w-full flex items-center justify-between px-5 py-4 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm hover:border-amber-400/50 hover:shadow-md transition-all active:scale-[0.99]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                                <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" strokeWidth={1.8} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-tight">Emparejamientos en curso</p>
                                                <p className="text-[8px] font-bold uppercase text-slate-400 tracking-widest">Ver los partidos formados</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-black font-mono">{drawAnimation.completedMatches.length}</span>
                                            <HugeiconsIcon icon={ChevronRightIcon} className="w-4 h-4 text-slate-400" />
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
                                        <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shrink-0">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className={`w-11 h-11 rounded-md bg-gradient-to-br ${st.gradient} flex items-center justify-center text-white shrink-0`}>
                                                    {sportIcon(fixtureModal.tournament?.sport, 'w-6 h-6')}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5">Fixture del torneo</p>
                                                    <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white truncate font-heading">{fixtureModal.tournament?.name}</h3>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                                                    <HugeiconsIcon icon={UserGroupIcon} className="w-3 h-3" /> {(fixtureModal.tournament?.teams?.length || 0)} equipos
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                                                    <HugeiconsIcon icon={BarChartIcon} className="w-3 h-3" /> {isKnockout ? 'Eliminación' : fixtureModal.tournament?.type === 'liga' ? 'Liga' : 'Grupos + Playoffs'}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase">
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
                                                const count = t.key === 'calendar' ? roundMatches(fixtureModal.selectedRound).length : t.key === 'bracket' ? (fixtureModal.fixtureData?.matches?.length || 0) : (buildStandings(fixtureModal.fixtureData?.matches || []).length);
                                                return (
                                                    <button key={t.key} onClick={() => setFixtureModal((p: any) => ({ ...p, view: t.key }))} className={`pb-2.5 px-5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${fixtureModal.view === t.key ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>
                                                        {t.label}
                                                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black font-mono ${fixtureModal.view === t.key ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>{count}</span>
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
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 font-heading">{isKnockout ? getStageName(totalRounds, round) : `Jornada ${round}`}</p>
                                                                <p className="text-[8px] font-black uppercase text-slate-400 font-mono">{matches.length} partidos</p>
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-center gap-3">
                                                                {matches.map((m: any, i: number) => (
                                                                    <div key={i} className="bg-white dark:bg-[#0B0F19] rounded-md border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden transition-all hover:border-amber-500/40">
                                                                        <div className={`h-1 w-full ${m.status === 'finished' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                                        <div className="p-3 space-y-2">
                                                                            <div className={`flex items-center justify-between gap-2 text-[10px] font-bold uppercase ${m.score1 != null && m.score1 > (m.score2 ?? -1) ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                                                                <span className="truncate">{m.team1_name}</span>
                                                                                <span className="font-mono font-black">{m.score1 ?? '-'}</span>
                                                                            </div>
                                                                            <div className="h-px bg-slate-100 dark:bg-white/10" />
                                                                            <div className={`flex items-center justify-between gap-2 text-[10px] font-bold uppercase ${m.score2 != null && m.score2 > (m.score1 ?? -1) ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
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
                                                        <div key={idx} className="bg-white dark:bg-[#0B0F19] p-5 rounded-md border border-slate-200 dark:border-white/10 shadow-sm space-y-4 transition-transform hover:scale-[1.02]">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">#{idx + 1}{match.stage ? ` · ${match.stage}` : ''}</span>
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase ${match.status === 'finished' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-[#00df82]' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${match.status === 'finished' ? 'bg-emerald-500' : 'bg-amber-500'}`} /> {match.status === 'finished' ? 'Finalizado' : 'Próximamente'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex-1 text-center space-y-1.5">
                                                                    <div className={`w-12 h-12 rounded-md mx-auto flex items-center justify-center text-[10px] font-black shadow-inner transition-all ${match.score1 != null && match.score1 > (match.score2 ?? -1) ? 'bg-emerald-500 text-white dark:bg-[#00df82] dark:text-black' : 'bg-slate-50 dark:bg-white/5 text-slate-500'}`}>{teamInitials(match.team1_name)}</div>
                                                                    <p className="text-[9px] font-bold uppercase truncate text-slate-900 dark:text-white">{match.team1_name}</p>
                                                                </div>
                                                                <div className="flex flex-col items-center gap-1 shrink-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xl font-black text-slate-950 dark:text-white font-mono">{match.score1 ?? '-'}</span>
                                                                        <span className="text-[10px] font-black text-slate-300 italic px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5">VS</span>
                                                                        <span className="text-xl font-black text-slate-950 dark:text-white font-mono">{match.score2 ?? '-'}</span>
                                                                    </div>
                                                                    <span className="text-[8px] font-black uppercase text-slate-400">{match.status === 'finished' ? 'Resultado' : 'Pendiente'}</span>
                                                                </div>
                                                                <div className="flex-1 text-center space-y-1.5">
                                                                    <div className={`w-12 h-12 rounded-md mx-auto flex items-center justify-center text-[10px] font-black shadow-inner transition-all ${match.score2 != null && match.score2 > (match.score1 ?? -1) ? 'bg-emerald-500 text-white dark:bg-[#00df82] dark:text-black' : 'bg-slate-50 dark:bg-white/5 text-slate-500'}`}>{teamInitials(match.team2_name)}</div>
                                                                    <p className="text-[9px] font-bold uppercase truncate text-slate-900 dark:text-white">{match.team2_name}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex items-center justify-center gap-5 pt-6 border-t border-slate-100 dark:border-white/5 shrink-0">
                                                    <button onClick={() => setFixtureModal((p: any) => ({ ...p, selectedRound: Math.max(1, p.selectedRound - 1) }))} className="p-3 rounded-md bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-20" disabled={fixtureModal.selectedRound <= 1}><HugeiconsIcon icon={ChevronLeftIcon} className="w-5 h-5 text-slate-900 dark:text-white" /></button>
                                                    <div className="flex items-center gap-2">
                                                        {Array.from({ length: totalRounds }).map((_, i) => (
                                                            <button key={i} onClick={() => setFixtureModal((p: any) => ({ ...p, selectedRound: i + 1 }))} className={`w-9 h-9 rounded-md text-[11px] font-black uppercase transition-all ${fixtureModal.selectedRound === i + 1 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}>{i + 1}</button>
                                                        ))}
                                                    </div>
                                                    <button onClick={() => setFixtureModal((p: any) => ({ ...p, selectedRound: Math.min(totalRounds, p.selectedRound + 1) }))} className="p-3 rounded-md bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-20" disabled={fixtureModal.selectedRound >= totalRounds}><HugeiconsIcon icon={ChevronRightIcon} className="w-5 h-5 text-slate-900 dark:text-white" /></button>
                                                </div>
                                            </>
                                        )}

                                        {/* POSICIONES */}
                                        {fixtureModal.view === 'standings' && (
                                            <div className="max-w-2xl mx-auto w-full overflow-hidden rounded-md border border-slate-200 dark:border-white/10 shadow-sm">
                                                <table className="w-full text-left">
                                                    <thead className="bg-slate-50/50 dark:bg-white/[0.02] text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                                        <tr><th className="px-4 py-3.5">#</th><th className="px-4 py-3.5">Equipo</th><th className="px-3 py-3.5 text-center">PJ</th><th className="px-3 py-3.5 text-center">G</th><th className="px-3 py-3.5 text-center">E</th><th className="px-3 py-3.5 text-center">P</th><th className="px-3 py-3.5 text-center">DG</th><th className="px-4 py-3.5 text-center">Pts</th></tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[11px] font-bold uppercase">
                                                        {(() => {
                                                            const standings = buildStandings(fixtureModal.fixtureData?.matches || []);
                                                            if (standings.length === 0) return <tr><td colSpan={8} className="px-4 py-14 text-center text-[10px] text-slate-400 tracking-widest">Sin resultados registrados aún</td></tr>;
                                                            const medals = ['🥇', '🥈', '🥉'];
                                                            return standings.map((s: any, i: number) => (
                                                                <tr key={s.name} className={i < 3 ? 'bg-amber-500/5' : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'}>
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
                                        )}
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
                <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setIsPairsModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-lg rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                    <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5">Sorteo en vivo</p>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">Emparejamientos</h3>
                                </div>
                            </div>
                            <button onClick={() => setIsPairsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shrink-0">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-2 custom-scrollbar">
                            {drawAnimation.currentPair[0] && (
                                <div className="bg-amber-500/5 p-3.5 rounded-md border border-amber-500/25 flex items-center gap-3 text-[11px] font-black uppercase animate-pulse">
                                    <span className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center text-[9px] font-black font-mono shrink-0">{drawAnimation.completedMatches.length + 1}</span>
                                    <span className="truncate flex-1 text-left text-amber-600">{drawAnimation.currentPair[0]}</span>
                                    <span className="text-amber-500 italic text-[9px] font-black shrink-0">VS</span>
                                    <span className="truncate flex-1 text-right text-slate-300 dark:text-white/30 tracking-tighter">{drawAnimation.currentPair[1] || '? ? ?'}</span>
                                </div>
                            )}
                            {drawAnimation.completedMatches.map((m: any, idx: number) => (
                                <div key={idx} className="bg-white dark:bg-white/5 p-3.5 rounded-md border border-slate-100 dark:border-white/10 flex items-center gap-3 text-[11px] font-black uppercase shadow-sm">
                                    <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center text-[9px] font-black font-mono shrink-0">{idx + 1}</span>
                                    <span className="truncate flex-1 text-left text-slate-900 dark:text-white">{m.t1}</span>
                                    <span className="text-amber-500 italic text-[9px] font-black shrink-0">VS</span>
                                    <span className="truncate flex-1 text-right text-slate-900 dark:text-white">{m.t2}</span>
                                </div>
                            ))}
                            {drawAnimation.completedMatches.length === 0 && !drawAnimation.currentPair[0] && (
                                <div className="py-16 text-center space-y-3">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-md flex items-center justify-center mx-auto text-slate-300 border border-slate-200 dark:border-white/10">
                                        <HugeiconsIcon icon={UserGroupIcon} className="w-8 h-8" strokeWidth={1.4} />
                                    </div>
                                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Aún no hay emparejamientos</p>
                                    <p className="text-[9px] font-bold uppercase text-slate-300">Saca la primera bolilla en la mesa</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Partidos formados</span>
                            <span className="text-base font-black font-mono text-amber-500">{drawAnimation.completedMatches.length}</span>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}

            {/* MODAL ELIMINAR ESTANDARIZADO */}
            {tournamentToDelete && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setTournamentToDelete(null)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-md p-6 border border-slate-200 dark:border-white/10 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-500/20">
                            <HugeiconsIcon icon={Alert02Icon} className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-black uppercase text-black dark:text-white mb-2 tracking-tighter">¿Eliminar Registro?</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Esta acción no se puede deshacer y borrará toda la información asociada.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setTournamentToDelete(null)} className="flex-1 py-3 text-[10px] font-black uppercase rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">CANCELAR</button>
                            <button onClick={handleDelete} className="flex-1 py-3 text-[10px] font-black uppercase rounded-md text-white bg-red-600 shadow-xl shadow-red-600/20">CONFIRMAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PARTICIPANTES (EQUIPOS INSCRITOS) */}
            {participantsModal.isOpen && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setParticipantsModal({ isOpen: false, tournament: null })}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-2xl rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500 rounded-md shadow-lg shadow-blue-500/20"><HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5 text-white" /></div>
                                <div>
                                    <h3 className="text-xs font-black uppercase text-black dark:text-white tracking-widest">Equipos Inscritos</h3>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">{participantsModal.tournament?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setParticipantsModal({ isOpen: false, tournament: null })} className="p-2 text-slate-400 hover:text-black dark:hover:text-white transition-colors"><HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {!participantsModal.tournament?.teams || participantsModal.tournament?.teams.length === 0 ? (
                                <div className="text-center py-20">
                                    <HugeiconsIcon icon={UserGroupIcon} className="w-12 h-12 text-slate-200 dark:text-white/5 mx-auto mb-4" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay equipos inscritos aún</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {participantsModal.tournament?.teams.map((team: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.03] rounded-md border border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden">
                                                    {team.logo ? <img src={team.logo} className="w-full h-full object-cover" alt="" /> : <HugeiconsIcon icon={Flag01Icon} className="w-5 h-5 text-slate-300" />}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-black dark:text-white uppercase">{team.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-slate-400 uppercase">Inscrito</p>
                                                <p className="text-[10px] font-black text-emerald-600 dark:text-[#00df82]">{new Date(team.registeredAt || Date.now()).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
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
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</label>
            <div className="relative">
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20 group-focus-within:text-amber-500 transition-colors">{icon}</div>}
                {type === 'select' ? (
                    <select value={value || ''} onChange={onChange} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-8 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[10px] font-bold text-slate-700 dark:text-white focus:border-amber-500 outline-none transition-all appearance-none uppercase cursor-pointer`}>{children}</select>
                ) : (
                    <input type={type} value={value || ''} onChange={onChange} readOnly={readOnly} placeholder={placeholder} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-3 py-2.5 rounded-md border text-[10px] font-bold transition-all outline-none uppercase ${readOnly ? 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-white/5 dark:border-white/5' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white focus:border-amber-500'}`} />
                )}
                {type === 'select' && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300"><HugeiconsIcon icon={ChevronDownIcon} className="w-3 h-3" /></div>}
            </div>
        </div>
    );
}
