"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auditService } from '@/services/auditService';
import {
    Add01Icon,
    Alert02Icon,
    BlockedIcon,
    Calendar03Icon,
    Cancel01Icon,
    CheckmarkCircle02Icon,
    ChevronDownIcon,
    Clock01Icon,
    Grid02Icon,
    IdentityCardIcon,
    MoneyBag01Icon,
    Mortarboard01Icon,
    PencilEdit02Icon,
    PlayCircleIcon,
    RefreshIcon,
    ShieldCheckIcon,
    TrashIcon,
    UserGroupIcon,
    UserIcon,
    BellIcon,
    Coins01Icon,
} from '@hugeicons/core-free-icons';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';
import { SoccerIcon, PadelIcon, TennisIcon, BasketballIcon, VolleyballIcon } from '@/components/icons/SportsIcons';

const SPORTS = ['Fútbol', 'Pádel', 'Tenis', 'Básquetbol', 'Vóleibol'];
const normalizeSport = (str: string) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
const sportIcon = (sport: string, cls: string) => {
    const n = normalizeSport(sport);
    if (n === 'futbol') return <SoccerIcon className={cls} />;
    if (n === 'padel') return <PadelIcon className={cls} />;
    if (n === 'tenis') return <TennisIcon className={cls} />;
    if (n === 'basquetbol') return <BasketballIcon className={cls} />;
    if (n === 'voleibol') return <VolleyballIcon className={cls} />;
    return <PadelIcon className={cls} />;
};

// --- COMPONENTE TOAST ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-md shadow-2xl border animate-slideInRight backdrop-blur-md ${
            type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:text-[#00df82] dark:border-emerald-500/50' : 
            'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:text-red-400 dark:border-red-500/50'
        }`}>
            {type === 'success' ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5" /> : <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" />}
            <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
        </div>
    );
};

export default function AcademyPage() {
    const { user } = useAuth();

    // ESTADOS
    const [classes, setClasses] = useState<any[]>([]);
    // Alumnos inscritos desde la app (academy_enrollments)
    const [studentsModal, setStudentsModal] = useState<{ cls: any; list: any[]; loading: boolean } | null>(null);
    const openStudents = async (cls: any) => {
        setStudentsModal({ cls, list: [], loading: true });
        try {
            const snap = await getDocs(query(collection(db, "academy_enrollments"), where("classId", "==", cls.id)));
            setStudentsModal({ cls, loading: false, list: snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((e: any) => e.status !== 'cancelled') });
        } catch (e) {
            console.error(e);
            setStudentsModal({ cls, loading: false, list: [] });
            addToast("No se pudieron cargar los alumnos", 'error');
        }
    };
    const markPaid = async (enrollment: any) => {
        try {
            await updateDoc(doc(db, "academy_enrollments", enrollment.id), { paymentStatus: 'paid', paymentMethod: enrollment.paymentMethod === 'mercadopago' ? 'mercadopago' : 'venue', paidAt: serverTimestamp() });
            setStudentsModal(m => m && ({ ...m, list: m.list.map(x => x.id === enrollment.id ? { ...x, paymentStatus: 'paid' } : x) }));
            addToast("Pago registrado", 'success');
        } catch (e) { addToast("No se pudo registrar el pago", 'error'); }
    };
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // MODALES
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [classToDelete, setClassToDelete] = useState<string | null>(null);
    const [statusConfirm, setStatusConfirm] = useState<{ isOpen: boolean, classId: string | null, name: string, nextStatus: 'active' | 'suspended' }>({ isOpen: false, classId: null, name: '', nextStatus: 'active' });

    const INITIAL_FORM_STATE = {
        name: '', instructor: '', sport: 'Pádel', ageGroup: 'libre', price: '',
        maxStudents: 20, startDate: '', endDate: '', startTime: '',
        endTime: '', daysOfWeek: [] as string[], description: '', alertDays: 3
    };
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);

    const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    const addToast = (msg: string, type: 'success' | 'error') => setNotification({ msg, type });

    // CARGA
    const fetchData = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const q = query(collection(db, "academy_classes"), where("ownerId", "==", user.uid));
            const snap = await getDocs(q);
            setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [user]);

    // ACCIONES
    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid) return;

        if (formData.daysOfWeek.length === 0) return addToast("Selecciona al menos un día", 'error');
        if (!formData.name || !formData.instructor) return addToast("Faltan datos de la clase", 'error');

        setSaving(true);
        try {
            const payload = {
                ...formData,
                ownerId: user.uid,
                price: Number(formData.price),
                maxStudents: Number(formData.maxStudents),
                alertDays: Number(formData.alertDays),
            };

            if (isEditing) {
                await updateDoc(doc(db, "academy_classes", editId!), payload);
                addToast("Clase sincronizada correctamente", 'success');
                await auditService.logAuditEvent({
                    action: 'ACADEMIA_EDITAR',
                    module: 'Academia',
                    details: `Edición de la clase: ${formData.name}`,
                    severity: 'LOW',
                    status: 'SUCCESS'
                });
            } else {
                await addDoc(collection(db, "academy_classes"), {
                    ...payload, enrolledStudents: 0, status: 'active',
                    createdAt: serverTimestamp(), isVisibleInApp: true
                });
                addToast("Nueva clase publicada en App", 'success');
                await auditService.logAuditEvent({
                    action: 'ACADEMIA_CREAR',
                    module: 'Academia',
                    details: `Creación de la clase: ${formData.name}`,
                    severity: 'LOW',
                    status: 'SUCCESS'
                });
            }

            handleCloseModal(); fetchData();
        } catch (e) { addToast("Error al procesar la clase", 'error'); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!classToDelete) return;
        try {
            await deleteDoc(doc(db, "academy_classes", classToDelete));
            addToast("Clase eliminada", 'success');
            setClassToDelete(null); fetchData();
        } catch (e) { addToast("Error al eliminar", 'error'); }
    };

    const requestToggleStatus = (c: any) => {
        const next = c.status === 'suspended' ? 'active' : 'suspended';
        setStatusConfirm({ isOpen: true, classId: c.id, name: c.name, nextStatus: next });
    };

    const confirmToggleStatus = async () => {
        if (!statusConfirm.classId) return;
        try {
            await updateDoc(doc(db, "academy_classes", statusConfirm.classId), { status: statusConfirm.nextStatus });
            addToast(`Clase ${statusConfirm.nextStatus === 'suspended' ? 'suspendida' : 'reactivada'}`, 'success');
            fetchData();
        } catch (e) { addToast("Error al cambiar estado", 'error'); }
        setStatusConfirm({ isOpen: false, classId: null, name: '', nextStatus: 'active' });
    };

    const handleDayToggle = (day: string) => {
        setFormData(prev => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(day)
                ? prev.daysOfWeek.filter(d => d !== day)
                : [...prev.daysOfWeek, day]
        }));
    };

    const handleOpenEdit = (c: any) => {
        setFormData({ ...INITIAL_FORM_STATE, ...c, price: c.price?.toString() || '' });
        setEditId(c.id); setIsEditing(true); setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false); setIsEditing(false); setEditId(null);
        setFormData(INITIAL_FORM_STATE);
    };

    const seedDemoClasses = async () => {
        if (!user?.uid) return;
        setSaving(true);
        const demo = [
            { name: 'Escuela de Fútbol Infantil', sport: 'Fútbol', instructor: 'Carlos Rojas', ageGroup: 'infantil', price: 45000, maxStudents: 20, enrolledStudents: 14, startTime: '17:00', endTime: '18:30', daysOfWeek: ['Lunes', 'Miércoles', 'Viernes'], alertDays: 2, description: 'Formación técnica y táctica para menores', status: 'active' },
            { name: 'Clínica de Pádel', sport: 'Pádel', instructor: 'Matías Herrera', ageGroup: 'adultos', price: 38000, maxStudents: 16, enrolledStudents: 9, startTime: '19:00', endTime: '20:30', daysOfWeek: ['Martes', 'Jueves'], alertDays: 1, description: 'Nivelación y perfeccionamiento de parejas', status: 'active' },
            { name: 'Academia de Tenis', sport: 'Tenis', instructor: 'Felipe Gutiérrez', ageGroup: 'juvenil', price: 50000, maxStudents: 12, enrolledStudents: 5, startTime: '16:00', endTime: '17:30', daysOfWeek: ['Lunes', 'Jueves'], alertDays: 3, description: 'Técnica de golpes y saque', status: 'active' },
            { name: 'Básquetbol Formativo', sport: 'Básquetbol', instructor: 'Andrés Vidal', ageGroup: 'infantil', price: 40000, maxStudents: 24, enrolledStudents: 18, startTime: '18:00', endTime: '19:30', daysOfWeek: ['Miércoles', 'Viernes'], alertDays: 2, description: 'Fundamentos y trabajo en equipo', status: 'active' },
            { name: 'Escuela de Vóleibol', sport: 'Vóleibol', instructor: 'Camila Fuentes', ageGroup: 'juvenil', price: 35000, maxStudents: 18, enrolledStudents: 11, startTime: '17:30', endTime: '19:00', daysOfWeek: ['Martes', 'Jueves', 'Sábado'], alertDays: 2, description: 'Recepción, armado y remate', status: 'active' },
            { name: 'Pádel Elite', sport: 'Pádel', instructor: 'Ramiro Salas', ageGroup: 'adultos', price: 55000, maxStudents: 8, enrolledStudents: 8, startTime: '20:00', endTime: '21:30', daysOfWeek: ['Lunes', 'Miércoles'], alertDays: 1, description: 'Nivel competitivo de parejas', status: 'suspended' },
        ];
        try {
            let created = 0;
            for (const c of demo) {
                const existing = await getDocs(query(collection(db, "academy_classes"), where("name", "==", c.name), where("ownerId", "==", user.uid)));
                if (existing.empty) {
                    await addDoc(collection(db, "academy_classes"), { ...c, ownerId: user.uid, startDate: '2026-10-01', endDate: '2026-12-20', createdAt: serverTimestamp(), isVisibleInApp: true });
                    created++;
                }
            }
            addToast(created > 0 ? `${created} clases de ejemplo creadas para todos los deportes` : 'Los ejemplos ya estaban cargados', 'success');
            fetchData();
        } catch (e) { addToast("Error al crear datos de ejemplo", 'error'); } finally { setSaving(false); }
    };

    const formatCLP = (n: number) => n.toLocaleString('es-CL');
    const ageGroupLabel = (g: string) => {
        const map: any = { libre: 'Todos los niveles', infantil: 'Infantil (Sub-12)', juvenil: 'Juvenil (Sub-17)', adultos: 'Adultos' };
        return map[g] || g || '—';
    };
    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—';
    const SPORT_STYLE: any = {
        'Fútbol': { gradient: 'from-emerald-500 to-teal-600', chip: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border-emerald-100 dark:border-emerald-500/20' },
        'Pádel': { gradient: 'from-orange-500 to-amber-600', chip: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 border-orange-100 dark:border-orange-500/20' },
        'Tenis': { gradient: 'from-sky-500 to-blue-600', chip: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 border-sky-100 dark:border-sky-500/20' },
        'Básquetbol': { gradient: 'from-red-500 to-rose-600', chip: 'bg-red-50 dark:bg-red-500/10 text-red-600 border-red-100 dark:border-red-500/20' },
        'Vóleibol': { gradient: 'from-yellow-500 to-amber-600', chip: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 border-yellow-100 dark:border-yellow-500/20' },
    };
    const sportStyle = (sport: string) => SPORT_STYLE[sport] || { gradient: 'from-slate-500 to-slate-700', chip: 'bg-slate-50 dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10' };

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {studentsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setStudentsModal(null)}>
                    <div className="w-full max-w-lg rounded-md border bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Alumnos inscritos</p>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white font-heading">{studentsModal.cls.name}</h3>
                            </div>
                            <button aria-label="Cerrar" onClick={() => setStudentsModal(null)} className="p-2 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-2">
                            {studentsModal.loading ? <p className="text-xs text-slate-400 text-center py-6">Cargando…</p>
                                : studentsModal.list.length === 0 ? <p className="text-xs text-slate-400 text-center py-6">Aún no hay alumnos inscritos desde la app.</p>
                                : studentsModal.list.map((e: any) => (
                                    <div key={e.id} className="flex items-center justify-between gap-3 p-3 rounded-md border border-slate-100 dark:border-white/5">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{e.userName || 'Jugador'}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{e.userEmail || ''}</p>
                                        </div>
                                        {e.paymentStatus === 'paid'
                                            ? <span className="px-2 py-1 rounded-md text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-[#00df82]">Pagado</span>
                                            : <button onClick={() => markPaid(e)} className="px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase bg-amber-500 text-white">Marcar pagado</button>}
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-indigo-500 rounded-md"></span>
                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-[0.2em] uppercase">Módulo Educativo</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">Gestión de <span className="text-emerald-500 dark:text-[#00df82]">Academias</span></h1>
                </div>
                <div className="flex items-center gap-2.5">
                    <button onClick={seedDemoClasses} disabled={saving} title="Insertar clases de ejemplo para todos los deportes" className="px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 rounded-md text-[10px] font-black uppercase tracking-widest hover:border-indigo-400/40 hover:text-indigo-500 transition-all active:scale-95">
                        Datos demo
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-indigo-500 text-white font-black text-[10px] uppercase rounded-md shadow-xl shadow-indigo-500/25 flex items-center gap-2.5 hover:brightness-110 active:scale-95 transition-all">
                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> Nueva Clase
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <TarjetaKpi label="Clases" value={classes.length.toString()} sub="Total de planes" icon={<HugeiconsIcon icon={Mortarboard01Icon} />} />
                <TarjetaKpi label="Activas" value={classes.filter(c => c.status === 'active').length.toString()} sub="En curso" icon={<HugeiconsIcon icon={PlayCircleIcon} />} />
                <TarjetaKpi label="Alumnos" value={classes.reduce((acc, c) => acc + (c.enrolledStudents || 0), 0).toString()} sub="Inscritos" icon={<HugeiconsIcon icon={UserGroupIcon} />} />
                <TarjetaKpi label="Ingresos" value={`$${formatCLP(classes.reduce((acc, c) => acc + ((c.enrolledStudents || 0) * (c.price || 0)), 0))}`} sub="Proyectado mensual" icon={<HugeiconsIcon icon={MoneyBag01Icon} />} />
            </div>

            {/* LISTADO */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-pulse">
                    <HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando academia...</p>
                </div>
            ) : classes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white dark:bg-[#0B0F19] rounded-md border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-md flex items-center justify-center text-indigo-500 border border-indigo-100 dark:border-indigo-500/20">
                        <HugeiconsIcon icon={Mortarboard01Icon} className="w-8 h-8" strokeWidth={1.4} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Sin clases publicadas</p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Crea tu primer plan académico</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-md text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/25 hover:brightness-110 active:scale-95 transition-all">
                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> Nueva Clase
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
{classes.map((c: any) => {
                        const occupancy = c.maxStudents > 0 ? Math.min(Math.round(((c.enrolledStudents || 0) / c.maxStudents) * 100), 100) : 0;
                        const st = sportStyle(c.sport);
                        return (
                            <div key={c.id} className="group flex flex-col h-full bg-white dark:bg-[#0B0F19] rounded-md border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-black/40 hover:-translate-y-0.5">
                                {/* HERO */}
                                <div className={`relative h-32 bg-gradient-to-br ${st.gradient} overflow-hidden shrink-0`}>
                                    <div className="absolute -right-5 -bottom-9 opacity-10 group-hover:opacity-20 transition-opacity">
                                        {sportIcon(c.sport, 'w-28 h-28 text-white')}
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
                                    <div className="absolute top-3 left-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest border border-white/20 ${c.status === 'active' ? 'bg-white/15' : 'bg-amber-500/40'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-white animate-pulse' : 'bg-amber-200'}`} />
                                            {c.status === 'active' ? 'En Curso' : 'Suspendida'}
                                        </span>
                                    </div>
                                    <div className="absolute top-3 right-3 w-11 h-11 rounded-md bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-lg" title={c.sport || 'Pádel'}>
                                        {sportIcon(c.sport, 'w-6 h-6')}
                                    </div>
                                    <div className="absolute bottom-3 left-3 right-3">
                                        <h3 className="text-base font-black text-white uppercase truncate drop-shadow-lg font-heading">{c.name}</h3>
                                        <p className="text-[9px] font-bold text-white/90 uppercase mt-0.5 flex items-center gap-1.5">
                                            <HugeiconsIcon icon={UserIcon} className="w-3 h-3" strokeWidth={2} /> Prof. {c.instructor}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 flex-1 flex flex-col">
                                    {/* CHIPS */}
                                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[8px] font-black uppercase border w-fit ${st.chip}`}>
                                            {sportIcon(c.sport, 'w-3 h-3')} {c.sport || 'Pádel'}
                                        </span>
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[8px] font-black uppercase text-slate-500 dark:text-slate-300">
                                            {ageGroupLabel(c.ageGroup)}
                                        </span>
                                    </div>

                                    {/* SCHEDULE */}
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {(c.daysOfWeek || []).map((d: string) => (
                                            <span key={d} className="px-2 py-0.5 bg-slate-50 dark:bg-white/5 text-[8px] font-black uppercase text-slate-500 rounded-md border border-slate-100 dark:border-white/5">{d.slice(0, 3)}</span>
                                        ))}
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ml-auto flex items-center gap-1 ${st.chip}`}>
                                            <HugeiconsIcon icon={Clock01Icon} className="w-3 h-3" /> {c.startTime}{c.endTime ? `-${c.endTime}` : ''}
                                        </span>
                                    </div>

                                    {/* STATS */}
                                    <div className="space-y-2 bg-slate-50 dark:bg-white/[0.03] p-3.5 rounded-md border border-slate-100 dark:border-white/5 mb-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mensualidad</span>
                                            <span className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] font-mono">${formatCLP(Number(c.price) || 0)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Alumnos</span>
                                            <button onClick={() => openStudents(c)} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 font-mono hover:underline">{c.enrolledStudents || 0} / {c.maxStudents} · {occupancy}% · Ver alumnos</button>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 dark:bg-[#00df82] transition-all duration-1000" style={{ width: `${occupancy}%` }} />
                                        </div>
                                        <div className="flex items-center justify-between pt-0.5">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Temporada</span>
                                            <span className="text-[9px] font-black text-slate-500 dark:text-slate-300 font-mono">{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</span>
                                        </div>
                                    </div>

                                    {/* FOOTER ACCIONES */}
                                    <div className="mt-auto p-2 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 grid grid-cols-3 gap-2 -mx-4 -mb-4">
                                        <button onClick={() => handleOpenEdit(c)} className="py-2 flex items-center justify-center gap-1.5 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 text-[8px] font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white hover:border-indigo-400/40 transition-all active:scale-95" title="Editar">
                                            <HugeiconsIcon icon={PencilEdit02Icon} className="w-3 h-3" /> Editar
                                        </button>
                                        {c.status === 'active' ? (
                                            <button onClick={() => requestToggleStatus(c)} className="py-2 flex items-center justify-center gap-1.5 bg-white dark:bg-white/5 rounded-md border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all active:scale-95" title="Suspender">
                                                <HugeiconsIcon icon={BlockedIcon} className="w-3 h-3" /> Suspender
                                            </button>
                                        ) : (
                                            <button onClick={() => requestToggleStatus(c)} className="py-2 flex items-center justify-center gap-1.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md text-[8px] font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95" title="Reactivar">
                                                <HugeiconsIcon icon={PlayCircleIcon} className="w-3 h-3" /> Reactivar
                                            </button>
                                        )}
                                        <button onClick={() => setClassToDelete(c.id)} className="py-2 flex items-center justify-center gap-1.5 bg-white dark:bg-white/5 rounded-md border border-red-100 dark:border-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95" title="Eliminar">
                                            <HugeiconsIcon icon={TrashIcon} className="w-3 h-3" /> Eliminar
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
                <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={handleCloseModal}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#0B0F19] w-full max-w-3xl rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                                    <HugeiconsIcon icon={Mortarboard01Icon} className="w-5 h-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-0.5">{isEditing ? 'Editar plan' : 'Nuevo plan'}</p>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">{isEditing ? 'Sincronizar Clase' : 'Publicar Academia'}</h3>
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
                                        <span className="w-1.5 h-4 bg-indigo-500 rounded-md"></span>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Deporte</p>
                                    </div>
                                    <span className="text-[9px] font-black uppercase text-indigo-500">{formData.sport}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {SPORTS.map(s => {
                                        const on = formData.sport === s;
                                        return (
                                            <button key={s} type="button" onClick={() => setFormData({ ...formData, sport: s })} className={`flex flex-col items-center gap-1.5 p-3 rounded-md border transition-all active:scale-95 ${on ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-indigo-400/40 hover:text-indigo-500'}`}>
                                                {sportIcon(s, `w-5 h-5 ${on ? 'text-white' : 'text-indigo-400'}`)}
                                                <span className="text-[9px] font-black uppercase">{s}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* COLUMNA 1: IDENTIDAD */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-4 bg-indigo-500 rounded-md"></span>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Identidad del plan</p>
                                    </div>
                                    <InputGroupPremium label="Nombre de la Clase" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} icon={<HugeiconsIcon icon={IdentityCardIcon} className="w-4 h-4" />} placeholder="Ej: Escuela de Pádel" />
                                    <InputGroupPremium label="Instructor Principal" value={formData.instructor} onChange={(e: any) => setFormData({ ...formData, instructor: e.target.value })} icon={<HugeiconsIcon icon={UserIcon} className="w-4 h-4" />} placeholder="Prof. Nombre" />
                                    <InputGroupPremium label="Nivel Académico" type="select" value={formData.ageGroup} onChange={(e: any) => setFormData({ ...formData, ageGroup: e.target.value })} icon={<HugeiconsIcon icon={Grid02Icon} className="w-4 h-4" />}>
                                        <option value="libre">TODOS LOS NIVELES</option>
                                        <option value="infantil">INFANTIL (SUB-12)</option>
                                        <option value="juvenil">JUVENIL (SUB-17)</option>
                                        <option value="adultos">ADULTOS</option>
                                    </InputGroupPremium>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Descripción Ejecutiva</label>
                                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3.5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[10px] font-bold outline-none h-24 resize-none focus:border-indigo-500 text-slate-700 dark:text-white" placeholder="Objetivos y metodología..." />
                                    </div>
                                </div>

                                {/* COLUMNA 2: PROGRAMACIÓN */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-4 bg-indigo-500 rounded-md"></span>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Programación</p>
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Días de Operación</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {WEEK_DAYS.map(day => {
                                                const on = formData.daysOfWeek.includes(day);
                                                return (
                                                    <button key={day} type="button" onClick={() => handleDayToggle(day)} className={`px-2.5 py-1.5 rounded-md text-[8px] font-black uppercase transition-all border ${on ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20' : 'bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/5 hover:border-indigo-400/40'}`}>{day.slice(0, 3)}</button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputGroupPremium label="H. Inicio" type="time" value={formData.startTime} onChange={(e: any) => setFormData({ ...formData, startTime: e.target.value })} />
                                        <InputGroupPremium label="H. Fin" type="time" value={formData.endTime} onChange={(e: any) => setFormData({ ...formData, endTime: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputGroupPremium label="Capacidad" type="number" value={formData.maxStudents} onChange={(e: any) => setFormData({ ...formData, maxStudents: e.target.value })} icon={<HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" />} />
                                        <InputGroupPremium label="Mensualidad ($)" type="number" value={formData.price} onChange={(e: any) => setFormData({ ...formData, price: e.target.value })} icon={<HugeiconsIcon icon={Coins01Icon} className="w-4 h-4" />} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputGroupPremium label="Inicio Temporada" type="date" value={formData.startDate} onChange={(e: any) => setFormData({ ...formData, startDate: e.target.value })} icon={<HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4" />} />
                                        <InputGroupPremium label="Fin Temporada" type="date" value={formData.endDate} onChange={(e: any) => setFormData({ ...formData, endDate: e.target.value })} icon={<HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4" />} />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 block flex items-center gap-1.5"><HugeiconsIcon icon={BellIcon} className="w-3.5 h-3.5 text-indigo-500" strokeWidth={2} /> Alerta a alumnos (días antes)</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 7].map(d => (
                                                <button key={d} type="button" onClick={() => setFormData({ ...formData, alertDays: d })} className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase transition-all ${formData.alertDays === d ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-indigo-500'}`}>{d} día{d > 1 ? 's' : ''}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-indigo-50/40 dark:bg-indigo-500/5 rounded-md border border-indigo-100 dark:border-indigo-500/15 flex items-center gap-3">
                                <HugeiconsIcon icon={ShieldCheckIcon} className="w-5 h-5 text-indigo-500 shrink-0" />
                                <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 leading-relaxed">Esta configuración será visible inmediatamente en la App móvil para el registro de nuevos alumnos.</p>
                            </div>

                            {/* VISTA PREVIA EN VIVO */}
                            <div className="rounded-md border border-slate-200 dark:border-white/10 overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-indigo-500 rounded-md"></span>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Vista previa del plan</p>
                                </div>
                                <div className="p-4 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                                        {sportIcon(formData.sport, 'w-6 h-6')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black uppercase text-slate-900 dark:text-white truncate font-heading">{formData.name || 'Nombre de la clase'}</p>
                                        <p className="text-[9px] font-bold text-indigo-500 uppercase mt-0.5">Prof. {formData.instructor || 'Instructor'} · {formData.sport} · {ageGroupLabel(formData.ageGroup)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-black text-emerald-600 dark:text-[#00df82] font-mono">${formatCLP(Number(formData.price) || 0)}</p>
                                        <p className="text-[8px] font-black uppercase text-slate-400">/ mes</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={handleCloseModal} className="flex-1 py-3.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Cancelar</button>
                                <button type="submit" disabled={saving} className="flex-[2] py-3.5 bg-indigo-500 text-white rounded-md text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" /> : <HugeiconsIcon icon={ShieldCheckIcon} className="w-4 h-4" />}
                                    {isEditing ? 'Actualizar Plan Académico' : 'Lanzar Clase en App'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CONFIRMAR ESTADO */}
            {statusConfirm.isOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setStatusConfirm({ ...statusConfirm, isOpen: false })}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-md p-6 border border-slate-200 dark:border-white/10 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                        <div className={`w-16 h-16 ${statusConfirm.nextStatus === 'suspended' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20'} rounded-md flex items-center justify-center mx-auto mb-4 border`}>
                            <HugeiconsIcon icon={statusConfirm.nextStatus === 'suspended' ? BlockedIcon : PlayCircleIcon} className={`w-8 h-8 ${statusConfirm.nextStatus === 'suspended' ? 'text-amber-500' : 'text-emerald-600 dark:text-[#00df82]'}`} />
                        </div>
                        <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white mb-2 tracking-tighter font-heading">{statusConfirm.nextStatus === 'suspended' ? 'Suspender Clase' : 'Reactivar Clase'}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">
                            {statusConfirm.nextStatus === 'suspended'
                                ? `¿Confirmas suspender "${statusConfirm.name}"? Los alumnos ya no podrán inscribirse hasta que la reactives.`
                                : `¿Confirmas reactivar "${statusConfirm.name}"? Volverá a ser visible en la App para inscripciones.`}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setStatusConfirm({ ...statusConfirm, isOpen: false })} className="flex-1 py-3 text-[10px] font-black uppercase rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">CANCELAR</button>
                            <button onClick={confirmToggleStatus} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-md text-white shadow-xl ${statusConfirm.nextStatus === 'suspended' ? 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-600' : 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-emerald-500/25 hover:brightness-110'}`}>
                                {statusConfirm.nextStatus === 'suspended' ? 'SUSPENDER' : 'REACTIVAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR */}
            {classToDelete && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setClassToDelete(null)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-md p-6 border border-slate-200 dark:border-white/10 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-md flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-500/20">
                            <HugeiconsIcon icon={Alert02Icon} className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white mb-2 tracking-tighter font-heading">¿Eliminar Clase?</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Los alumnos ya no verán esta clase en la App. Esta acción es irreversible.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setClassToDelete(null)} className="flex-1 py-3 text-[10px] font-black uppercase rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">CANCELAR</button>
                            <button onClick={handleDelete} className="flex-1 py-3 text-[10px] font-black uppercase rounded-md text-white bg-red-600 shadow-xl shadow-red-600/20">CONFIRMAR</button>
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
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-500 transition-colors">{icon}</div>}
                {type === 'select' ? (
                    <select value={value || ''} onChange={onChange} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-8 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[10px] font-bold text-slate-700 dark:text-white focus:border-indigo-500 outline-none transition-all appearance-none uppercase cursor-pointer`}>{children}</select>
                ) : (
                    <input type={type} value={value || ''} onChange={onChange} readOnly={readOnly} placeholder={placeholder} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-3 py-2.5 rounded-md border text-[10px] font-bold transition-all outline-none ${readOnly ? 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-white/5 dark:border-white/5' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white focus:border-indigo-500'}`} />
                )}
                {type === 'select' && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300"><HugeiconsIcon icon={ChevronDownIcon} className="w-3 h-3" /></div>}
            </div>
        </div>
    );
}