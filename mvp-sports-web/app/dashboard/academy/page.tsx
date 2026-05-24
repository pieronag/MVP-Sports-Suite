"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { 
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, 
    doc, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { 
    AcademicCapIcon, PlusIcon, UserGroupIcon, CalendarDaysIcon, XMarkIcon, 
    CheckCircleIcon, ArrowPathIcon, ExclamationTriangleIcon, CurrencyDollarIcon, 
    PencilSquareIcon, TrashIcon, NoSymbolIcon, PlayCircleIcon, 
    SparklesIcon, ClockIcon, IdentificationIcon, DocumentTextIcon,
    ChevronDownIcon, UserIcon, Squares2X2Icon, ShieldCheckIcon, CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';

// --- COMPONENTE TOAST ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border animate-slideInRight backdrop-blur-md ${
            type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:text-emerald-400 dark:border-emerald-500/50' : 
            'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:text-red-400 dark:border-red-500/50'
        }`}>
            {type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
            <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
        </div>
    );
};

export default function AcademyPage() {
    const { user } = useAuth();
    
    // ESTADOS
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // MODALES
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [classToDelete, setClassToDelete] = useState<string | null>(null);

    const INITIAL_FORM_STATE = {
        name: '', instructor: '', ageGroup: 'libre', price: '', 
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
            } else {
                await addDoc(collection(db, "academy_classes"), {
                    ...payload, enrolledStudents: 0, status: 'active',
                    createdAt: serverTimestamp(), isVisibleInApp: true
                });
                addToast("Nueva clase publicada en App", 'success');
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

    const handleToggleStatus = async (id: string, current: string) => {
        const next = current === 'suspended' ? 'active' : 'suspended';
        try {
            await updateDoc(doc(db, "academy_classes", id), { status: next });
            addToast(`Clase ${next === 'suspended' ? 'suspendida' : 'activada'}`, 'success');
            fetchData();
        } catch (e) { addToast("Error al cambiar estado", 'error'); }
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

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-indigo-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 tracking-[0.2em] uppercase">Módulo Educativo</p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Gestión de <span className="text-indigo-500 dark:text-indigo-400">Academias</span></h1>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="px-6 py-2.5 bg-slate-950 dark:bg-indigo-600 text-white dark:text-slate-950 text-[10px] font-black uppercase rounded-xl shadow-xl flex items-center gap-2 active:scale-95 transition-all"><PlusIcon className="w-4 h-4" /> Nueva Clase</button>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <TarjetaKpi label="Clases" value={classes.length.toString()} icon={<AcademicCapIcon className="w-5 h-5" />} trend={{ value: 'TOTAL', isPositive: true }} />
                <TarjetaKpi label="Activas" value={classes.filter(c => c.status === 'active').length.toString()} icon={<PlayCircleIcon className="w-5 h-5" />} trend={{ value: 'EN CURSO', isPositive: true }} />
                <TarjetaKpi label="Alumnos" value={classes.reduce((acc, c) => acc + (c.enrolledStudents || 0), 0).toString()} icon={<UserGroupIcon className="w-5 h-5" />} trend={{ value: 'REGISTRADOS', isPositive: true }} />
                <TarjetaKpi label="Ingresos" value={`$${classes.reduce((acc, c) => acc + (c.enrolledStudents * (c.price || 0)), 0).toLocaleString()}`} icon={<CurrencyDollarIcon className="w-5 h-5" />} trend={{ value: 'PROYECTADO', isPositive: true }} />
            </div>

            {/* LISTADO */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-pulse">
                    <ArrowPathIcon className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando academia...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {classes.map((c: any) => (
                        <div key={c.id} className="flex flex-col h-full bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/20 overflow-hidden group transition-all duration-500 hover:border-indigo-500/30">
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-5">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                        <AcademicCapIcon className="w-6 h-6" />
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border backdrop-blur-md ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                        {c.status === 'active' ? 'En Curso' : 'Suspendida'}
                                    </span>
                                </div>
                                
                                <div className="space-y-1 mb-5">
                                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase truncate tracking-tight">{c.name}</h3>
                                    <p className="text-[9px] font-bold text-indigo-500 uppercase flex items-center gap-1.5"><UserIcon className="w-3 h-3" /> Prof. {c.instructor}</p>
                                </div>

                                <div className="flex flex-wrap gap-1.5 mb-6">
                                    {c.daysOfWeek?.map((d: string) => (
                                        <span key={d} className="px-2 py-0.5 bg-slate-50 dark:bg-white/5 text-[8px] font-black uppercase text-slate-500 rounded border border-slate-100 dark:border-white/5">{d.slice(0, 3)}</span>
                                    ))}
                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-[8px] font-black uppercase text-indigo-600 dark:text-indigo-400 rounded border border-indigo-100 dark:border-indigo-500/10 ml-auto flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {c.startTime}</span>
                                </div>

                                <div className="space-y-2 bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-100 dark:border-white/5 mb-6">
                                    <div className="flex items-center justify-between"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Inscripción</span><span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">${Number(c.price).toLocaleString()} / mes</span></div>
                                    <div className="flex items-center justify-between"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Alumnos</span><span className="text-[10px] font-black text-slate-900 dark:text-white">{c.enrolledStudents} / {c.maxStudents}</span></div>
                                    <div className="w-full h-1 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden mt-2"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${((c.enrolledStudents || 0) / (c.maxStudents || 1)) * 100}%` }} /></div>
                                </div>

                                <div className="mt-auto p-2 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex gap-2 -mx-6 -mb-6 rounded-b-2xl">
                                    <button onClick={() => handleOpenEdit(c)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm active:scale-95"><PencilSquareIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleToggleStatus(c.id, c.status)} className={`flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 ${c.status === 'active' ? 'hover:text-amber-500' : 'hover:text-emerald-500'} transition-all shadow-sm active:scale-95`}>{c.status === 'active' ? <NoSymbolIcon className="w-4 h-4" /> : <PlayCircleIcon className="w-4 h-4" />}</button>
                                    <button onClick={() => setClassToDelete(c.id)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shadow-sm active:scale-95"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL CREAR / EDITAR COMPACTO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={handleCloseModal}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#0B0F19] w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                            <h3 className="text-sm font-black uppercase text-black dark:text-white flex items-center gap-3"><div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20"><AcademicCapIcon className="w-5 h-5 text-white" /></div>{isEditing ? 'Sincronizar Clase' : 'Publicar Academia'}</h3>
                            <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateOrUpdate} className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* COLUMNA 1: IDENTIDAD */}
                                <div className="space-y-4">
                                    <InputGroupPremium label="Nombre de la Clase" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} icon={<IdentificationIcon className="w-4 h-4" />} />
                                    <InputGroupPremium label="Instructor Principal" value={formData.instructor} onChange={(e: any) => setFormData({ ...formData, instructor: e.target.value })} icon={<UserIcon className="w-4 h-4" />} />
                                    <InputGroupPremium label="Nivel Académico" type="select" value={formData.ageGroup} onChange={(e: any) => setFormData({ ...formData, ageGroup: e.target.value })} icon={<Squares2X2Icon className="w-4 h-4" />}>
                                        <option value="libre">TODOS LOS NIVELES</option>
                                        <option value="infantil">INFANTIL (SUB-12)</option>
                                        <option value="juvenil">JUVENIL (SUB-17)</option>
                                        <option value="adultos">ADULTOS</option>
                                    </InputGroupPremium>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[8px] font-black uppercase text-black">Descripción Ejecutiva</label>
                                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl text-[9px] font-bold outline-none h-20 uppercase resize-none focus:border-indigo-500 text-black dark:text-white" />
                                    </div>
                                </div>

                                {/* COLUMNA 2: PROGRAMACIÓN */}
                                <div className="space-y-4">
                                    <div className="p-3 bg-indigo-50/30 dark:bg-indigo-500/5 rounded-xl border border-indigo-100 dark:border-indigo-500/10">
                                        <label className="text-[8px] font-black uppercase text-indigo-600 mb-2 block">Días de Operación</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {WEEK_DAYS.map(day => (
                                                <button key={day} type="button" onClick={() => handleDayToggle(day)} className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all border ${formData.daysOfWeek.includes(day) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-500/20' : 'bg-white dark:bg-white/5 text-slate-400 border-slate-100 dark:border-white/5 hover:border-indigo-300'}`}>{day.slice(0, 3)}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputGroupPremium label="H. Inicio" type="time" value={formData.startTime} onChange={(e: any) => setFormData({ ...formData, startTime: e.target.value })} />
                                        <InputGroupPremium label="H. Fin" type="time" value={formData.endTime} onChange={(e: any) => setFormData({ ...formData, endTime: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <InputGroupPremium label="Mensualidad ($)" type="number" value={formData.price} onChange={(e: any) => setFormData({ ...formData, price: e.target.value })} icon={<CurrencyDollarIcon className="w-4 h-4" />} />
                                        <InputGroupPremium label="Cap. Alumnos" type="number" value={formData.maxStudents} onChange={(e: any) => setFormData({ ...formData, maxStudents: e.target.value })} icon={<UserGroupIcon className="w-4 h-4" />} />
                                        <InputGroupPremium label="Días de Alerta" type="number" value={formData.alertDays} onChange={(e: any) => setFormData({ ...formData, alertDays: e.target.value })} icon={<ClockIcon className="w-4 h-4" />} placeholder="Ej: 3" />
                                    </div>
                                </div>

                                {/* COLUMNA 3: TEMPORADA */}
                                <div className="space-y-4">
                                    <InputGroupPremium label="Inicio de Temporada" type="date" value={formData.startDate} onChange={(e: any) => setFormData({ ...formData, startDate: e.target.value })} icon={<CalendarDaysIcon className="w-4 h-4" />} />
                                    <InputGroupPremium label="Término de Temporada" type="date" value={formData.endDate} onChange={(e: any) => setFormData({ ...formData, endDate: e.target.value })} icon={<CalendarDaysIcon className="w-4 h-4" />} />
                                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 flex flex-col items-center justify-center gap-3 h-[140px] border-dashed border-2">
                                        <AcademicCapIcon className="w-10 h-10 text-slate-200 dark:text-white/10" />
                                        <p className="text-[7px] font-black uppercase text-slate-400 text-center leading-relaxed px-4">Esta configuración será visible inmediatamente en la App móvil para el registro de nuevos alumnos.</p>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" disabled={saving} className="w-full py-4 bg-black dark:bg-indigo-600 text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2">
                                {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ShieldCheckIcon className="w-4 h-4" />}
                                {isEditing ? 'ACTUALIZAR PLAN ACADÉMICO' : 'LANZAR CLASE EN APP'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR ESTANDARIZADO */}
            {classToDelete && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setClassToDelete(null)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-500/20">
                            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-black uppercase text-black dark:text-white mb-2 tracking-tighter">¿Eliminar Clase?</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Los alumnos ya no verán esta clase en la App. Esta acción es irreversible.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setClassToDelete(null)} className="flex-1 py-3 text-[10px] font-black uppercase rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">CANCELAR</button>
                            <button onClick={handleDelete} className="flex-1 py-3 text-[10px] font-black uppercase rounded-xl text-white bg-red-600 shadow-xl shadow-red-600/20">CONFIRMAR</button>
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
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20 group-focus-within:text-indigo-500 transition-colors">{icon}</div>}
                {type === 'select' ? (
                    <select value={value || ''} onChange={onChange} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-8 py-2 bg-white dark:bg-[#0B0F19] border border-slate-100 dark:border-white/5 rounded-xl text-[10px] font-bold text-black dark:text-white focus:border-indigo-500 outline-none transition-all appearance-none uppercase cursor-pointer shadow-sm`}>{children}</select>
                ) : (
                    <input type={type} value={value || ''} onChange={onChange} readOnly={readOnly} placeholder={placeholder} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-3 py-2 rounded-xl border text-[10px] font-bold transition-all outline-none shadow-sm ${readOnly ? 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-white/5 dark:border-white/5' : 'bg-white border-slate-100 text-black focus:border-indigo-500 dark:bg-[#0B0F19] dark:border-white/5 dark:text-white'}`} />
                )}
                {type === 'select' && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300"><ChevronDownIcon className="w-3 h-3" /></div>}
            </div>
        </div>
    );
}
