"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { updateStaffPassword } from './actions';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { auditService } from '@/services/auditService';
import {
    UserGroupIcon, BuildingStorefrontIcon, PlusIcon,
    MagnifyingGlassIcon, PhoneIcon, EnvelopeIcon,
    UserCircleIcon, ShieldCheckIcon, TrashIcon, PencilSquareIcon,
    CheckCircleIcon, XMarkIcon, ArrowPathIcon,
    LockClosedIcon, PowerIcon, EyeIcon, EyeSlashIcon,
    BriefcaseIcon, IdentificationIcon, UserIcon, Squares2X2Icon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-5 right-5 z-[160] flex items-center gap-3 px-4 py-3 rounded-[14px] shadow-xl border animate-slideIn ${type === 'success' ? 'bg-white border-emerald-500 text-emerald-700 dark:bg-[#0B0F19] dark:text-emerald-400 dark:border-emerald-500/50' : 'bg-white border-red-500 text-red-700 dark:bg-[#0B0F19] dark:text-red-400 dark:border-red-500/50'}`}>
            {type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">{message}</span>
        </div>
    );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onCancel}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-[14px] shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase">{title}</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-6 uppercase">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 text-[10px] font-bold uppercase rounded-[14px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">CANCELAR</button>
                    <button onClick={onConfirm} className={`px-4 py-2 text-[10px] font-bold uppercase rounded-[14px] text-white ${isDestructive ? 'bg-red-600' : 'bg-emerald-600'}`}>CONFIRMAR</button>
                </div>
            </div>
        </div>
    );
};

interface Venue { id: string; name: string; }
interface StaffMember { id: string; uid?: string; fullName: string; rut: string; jobTitle: string; email: string; phone: string; role: string; tenantIds: string[]; status: 'active' | 'inactive'; }

const PasswordModal = ({ isOpen, onClose, onConfirm, memberName }: any) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    if (!isOpen) return null;
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) return;
        setIsSaving(true);
        await onConfirm(password);
        setIsSaving(false);
        setPassword('');
    };
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={onClose}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-[14px] shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Cambiar Clave</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Usuario: {memberName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-[14px] border border-emerald-100 dark:border-emerald-500/20">
                        <label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide block mb-1.5">Nueva Contraseña</label>
                        <div className="relative">
                            <LockClosedIcon className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-9 pr-10 py-3 bg-white dark:bg-[#0B0F19] border border-emerald-200 dark:border-emerald-500/30 rounded-[14px] text-xs font-bold outline-none" placeholder="MÍNIMO 6 CARACTERES" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">{showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}</button>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 text-[10px] font-bold uppercase rounded-[14px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">CANCELAR</button>
                        <button type="submit" disabled={isSaving || password.length < 6} className="flex-2 px-6 py-3 text-[10px] font-bold uppercase rounded-[14px] text-white bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSaving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                            ACTUALIZAR
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function StaffPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterVenueId, setFilterVenueId] = useState<string>('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmData, setConfirmData] = useState<{ isOpen: boolean, title: string, message: string, action: () => void, isDestructive: boolean }>({ isOpen: false, title: '', message: '', action: () => { }, isDestructive: false });
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean, member: StaffMember | null }>({ isOpen: false, member: null });
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ fullName: '', rut: '', jobTitle: '', email: '', phone: '', role: 'manager', password: '', status: 'active' as 'active' | 'inactive', tenantIds: [] as string[] });

    const notify = (msg: string, type: 'success' | 'error') => setNotification({ msg, type });

    useEffect(() => {
        const initData = async () => {
            if (!user?.uid) return;
            setLoading(true);
            try {
                const qVenues = query(collection(db, "tenants"), where("ownerId", "==", user.uid));
                const snapVenues = await getDocs(qVenues);
                const venuesData = snapVenues.docs.map(d => ({ id: d.id, ...d.data() } as Venue));
                setVenues(venuesData);
                let allStaff: StaffMember[] = [];
                const promises = venuesData.map(async (v) => {
                    const qStaffNew = query(collection(db, "staff"), where("tenantIds", "array-contains", v.id));
                    const snapStaffNew = await getDocs(qStaffNew);
                    const qStaffOld = query(collection(db, "staff"), where("tenantId", "==", v.id));
                    const snapStaffOld = await getDocs(qStaffOld);
                    const newDocs = snapStaffNew.docs.map(s => ({ id: s.id, ...s.data() } as StaffMember));
                    const oldDocs = snapStaffOld.docs.map(s => { const data = s.data(); return { id: s.id, ...data, tenantIds: data.tenantIds || [data.tenantId] } as StaffMember; });
                    return [...newDocs, ...oldDocs];
                });
                const staffArrays = await Promise.all(promises);
                const uniqueStaffMap = new Map();
                staffArrays.flat().forEach(s => uniqueStaffMap.set(s.id, s));
                allStaff = Array.from(uniqueStaffMap.values());
                setStaffList(allStaff);
            } catch (error) { notify("Error al cargar datos", "error"); } finally { setLoading(false); }
        };
        initData();
    }, [user]);

    const refetchAllStaff = async () => {
        if (!user?.uid) return;
        try {
            const promises = venues.map(async (v) => {
                const qStaffNew = query(collection(db, "staff"), where("tenantIds", "array-contains", v.id));
                const snapStaffNew = await getDocs(qStaffNew);
                const qStaffOld = query(collection(db, "staff"), where("tenantId", "==", v.id));
                const snapStaffOld = await getDocs(qStaffOld);
                const newDocs = snapStaffNew.docs.map(s => ({ id: s.id, ...s.data() } as StaffMember));
                const oldDocs = snapStaffOld.docs.map(s => { const data = s.data(); return { id: s.id, ...data, tenantIds: data.tenantIds || [data.tenantId] } as StaffMember; });
                return [...newDocs, ...oldDocs];
            });
            const staffArrays = await Promise.all(promises);
            const uniqueStaffMap = new Map();
            staffArrays.flat().forEach(s => uniqueStaffMap.set(s.id, s));
            setStaffList(Array.from(uniqueStaffMap.values()));
        } catch (e) { }
    };

    const handleOpenModal = (member?: StaffMember) => {
        setShowPassword(false);
        if (member) {
            setEditingId(member.id);
            setFormData({ fullName: member.fullName, rut: member.rut || '', jobTitle: member.jobTitle || '', email: member.email, phone: member.phone, role: 'manager', status: member.status, password: '', tenantIds: member.tenantIds || [] });
        } else {
            setEditingId(null);
            setFormData({ fullName: '', rut: '', jobTitle: '', email: '', phone: '', role: 'manager', password: '', status: 'active', tenantIds: filterVenueId !== 'ALL' ? [filterVenueId] : [] });
        }
        setIsModalOpen(true);
    };

    const handleToggleVenueSelection = (venueId: string) => {
        setFormData(prev => {
            const exists = prev.tenantIds.includes(venueId);
            if (exists) return { ...prev, tenantIds: prev.tenantIds.filter(id => id !== venueId) };
            return { ...prev, tenantIds: [...prev.tenantIds, venueId] };
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.tenantIds.length === 0) return notify("Selecciona al menos un recinto", "error");
        if (!formData.fullName || !formData.email) return notify("Faltan datos", "error");
        setIsSaving(true);
        try {
            let staffPayload: any = { 
                fullName: formData.fullName, 
                rut: formData.rut, 
                jobTitle: formData.jobTitle, 
                email: formData.email, 
                phone: formData.phone, 
                role: 'manager', 
                status: formData.status, 
                tenantIds: formData.tenantIds,
                tenantId: formData.tenantIds[0] || ""
            };
            if (editingId) {
                await updateDoc(doc(db, "staff", editingId), staffPayload);
                const staffSnap = await getDoc(doc(db, "staff", editingId));
                if (staffSnap.exists() && staffSnap.data().uid) {
                    try {
                        await updateDoc(doc(db, "users", staffSnap.data().uid), { 
                            fullName: formData.fullName, 
                            rut: formData.rut, 
                            jobTitle: formData.jobTitle, 
                            phone: formData.phone, 
                            status: formData.status, 
                            tenantIds: formData.tenantIds,
                            tenantId: formData.tenantIds[0] || ""
                        });
                    } catch (userErr) {
                        console.error("Error updating user document:", userErr);
                    }
                }
                notify("Actualizado con éxito", "success");
                await auditService.logAuditEvent({
                    action: 'STAFF_EDITAR',
                    module: 'Administración/Personal',
                    details: `Edición de datos del personal: ${formData.fullName} (${formData.email})`,
                    severity: 'MEDIUM',
                    status: 'SUCCESS'
                });
            } else {
                const secondaryAppName = "secondaryAppForUserCreation";
                let secondaryApp = getApps().find(app => app.name === secondaryAppName) || initializeApp(getApp().options, secondaryAppName);
                const secondaryAuth = getAuth(secondaryApp);
                try {
                    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
                    const newUid = userCredential.user.uid;
                    await signOut(secondaryAuth);
                    await setDoc(doc(db, "users", newUid), { 
                        uid: newUid, 
                        email: formData.email, 
                        fullName: formData.fullName, 
                        rut: formData.rut, 
                        jobTitle: formData.jobTitle, 
                        phone: formData.phone, 
                        role: 'manager', 
                        tenantIds: formData.tenantIds, 
                        tenantId: formData.tenantIds[0] || "",
                        status: 'active', 
                        createdAt: new Date() 
                    });
                    await addDoc(collection(db, "staff"), { ...staffPayload, uid: newUid, createdAt: new Date() });
                    notify("Creado con éxito", "success");
                    await auditService.logAuditEvent({
                        action: 'STAFF_CREAR',
                        module: 'Administración/Personal',
                        details: `Creación de nuevo miembro de staff: ${formData.fullName} (${formData.email})`,
                        severity: 'MEDIUM',
                        status: 'SUCCESS'
                    });
                } catch (err: any) { 
                    notify(err.message, "error"); 
                    setIsSaving(false); 
                    await auditService.logAuditEvent({
                        action: 'STAFF_CREAR',
                        module: 'Administración/Personal',
                        details: `Falla al crear autenticación de staff ${formData.fullName}: ${err.message || err}`,
                        severity: 'MEDIUM',
                        status: 'FAILED'
                    });
                    return; 
                }
            }
            await refetchAllStaff();
            setIsModalOpen(false);
        } catch (e: any) { 
            notify("Error al guardar", "error"); 
            await auditService.logAuditEvent({
                action: editingId ? 'STAFF_EDITAR' : 'STAFF_CREAR',
                module: 'Administración/Personal',
                details: `Falla al guardar staff en base de datos: ${e.message || e}`,
                severity: 'MEDIUM',
                status: 'FAILED'
            });
        } finally { setIsSaving(false); }
    };

    const requestToggleStatus = (member: StaffMember) => {
        const newStatus = member.status === 'active' ? 'inactive' : 'active';
        setConfirmData({
            isOpen: true,
            title: `${newStatus === 'active' ? 'Activar' : 'Suspender'} Usuario`,
            message: `¿Confirmas cambiar el acceso de ${member.fullName}?`,
            isDestructive: newStatus === 'inactive',
            action: async () => {
                try {
                    await updateDoc(doc(db, "staff", member.id), { status: newStatus });
                    if (member.uid) await updateDoc(doc(db, "users", member.uid), { status: newStatus });
                    setStaffList(prev => prev.map(s => s.id === member.id ? { ...s, status: newStatus } : s));
                    notify("Estado actualizado", "success");
                    await auditService.logAuditEvent({
                        action: 'STAFF_ESTADO',
                        module: 'Administración/Personal',
                        details: `Cambio de estado del personal ${member.fullName} a: ${newStatus}`,
                        severity: 'HIGH',
                        status: 'SUCCESS'
                    });
                } catch (e: any) { 
                    notify("Error al cambiar estado", "error"); 
                    await auditService.logAuditEvent({
                        action: 'STAFF_ESTADO',
                        module: 'Administración/Personal',
                        details: `Falla al cambiar estado de ${member.fullName} a ${newStatus}: ${e.message || e}`,
                        severity: 'HIGH',
                        status: 'FAILED'
                    });
                }
                setConfirmData(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const requestDelete = (id: string, uid?: string) => {
        const member = staffList.find(s => s.id === id);
        setConfirmData({
            isOpen: true,
            title: "Eliminar Registro",
            message: "Esta acción no se puede deshacer.",
            isDestructive: true,
            action: async () => {
                try {
                    await deleteDoc(doc(db, "staff", id));
                    if (uid) await deleteDoc(doc(db, "users", uid));
                    setStaffList(prev => prev.filter(s => s.id !== id));
                    notify("Eliminado", "success");
                    await auditService.logAuditEvent({
                        action: 'STAFF_ELIMINAR',
                        module: 'Administración/Personal',
                        details: `Eliminación definitiva del personal: ${member ? member.fullName : id}`,
                        severity: 'HIGH',
                        status: 'SUCCESS'
                    });
                } catch (e: any) { 
                    notify("Error al eliminar", "error"); 
                    await auditService.logAuditEvent({
                        action: 'STAFF_ELIMINAR',
                        module: 'Administración/Personal',
                        details: `Falla al eliminar personal ${member ? member.fullName : id}: ${e.message || e}`,
                        severity: 'HIGH',
                        status: 'FAILED'
                    });
                }
                setConfirmData(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleUpdatePassword = async (newPassword: string) => {
        if (!passwordModal.member?.uid) return;
        const res = await updateStaffPassword(passwordModal.member.uid, newPassword);
        if (res.success) { 
            notify("Clave actualizada", "success"); 
            setPasswordModal({ isOpen: false, member: null }); 
            await auditService.logAuditEvent({
                action: 'STAFF_CLAVE',
                module: 'Administración/Personal',
                details: `Cambio de contraseña del personal: ${passwordModal.member.fullName}`,
                severity: 'HIGH',
                status: 'SUCCESS'
            });
        }
        else {
            notify(res.error || "Error", "error");
            await auditService.logAuditEvent({
                action: 'STAFF_CLAVE',
                module: 'Administración/Personal',
                details: `Falla al actualizar contraseña del personal ${passwordModal.member.fullName}: ${res.error}`,
                severity: 'HIGH',
                status: 'FAILED'
            });
        }
    };

    const filteredStaff = staffList.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) && (filterVenueId === 'ALL' || (s.tenantIds && s.tenantIds.includes(filterVenueId))));

    return (
        <div className="w-full space-y-5 pb-10 text-left relative">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
            
            <ConfirmModal 
                isOpen={confirmData.isOpen} 
                title={confirmData.title} 
                message={confirmData.message} 
                onConfirm={confirmData.action} 
                onCancel={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} 
                isDestructive={confirmData.isDestructive} 
            />
            
            <PasswordModal 
                isOpen={passwordModal.isOpen} 
                memberName={passwordModal.member?.fullName} 
                onClose={() => setPasswordModal({ isOpen: false, member: null })} 
                onConfirm={handleUpdatePassword} 
            />

            {/* CABECERA ADN FINANCE STYLE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">
                            Gestión de Talento Humano
                        </p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                        Administración de <span className="text-emerald-500 dark:text-emerald-400">Staff</span>
                    </h1>
                </div>

                <div className="flex items-center gap-2 p-1.5 rounded-[14px]">
                    <button 
                        onClick={() => handleOpenModal()} 
                        className="px-6 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-black text-[9px] uppercase tracking-[0.2em] rounded-[14px] transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center gap-2 border border-emerald-400/20 dark:border-white/10"
                    >
                        <PlusIcon className="w-4 h-4" /> NUEVO PERSONAL
                    </button>
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-[#0B0F19] p-4 rounded-[14px] border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="relative">
                    <select 
                        value={filterVenueId} 
                        onChange={(e) => setFilterVenueId(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-white/5 border-0 rounded-[14px] pl-3 pr-8 py-3 text-[10px] font-bold uppercase outline-none text-slate-600 dark:text-white cursor-pointer appearance-none"
                    >
                        <option value="ALL">TODOS LOS RECINTOS</option>
                        {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <BuildingStorefrontIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative lg:col-span-3">
                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text" 
                        placeholder="BUSCAR POR NOMBRE..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[14px] text-[10px] font-bold outline-none uppercase placeholder:text-slate-400" 
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                    Cargando personal...
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {filteredStaff.map((member) => (
                        <div key={member.id} className={`bg-white dark:bg-[#0B0F19] rounded-[14px] border transition-all flex flex-col ${member.status === 'active' ? 'border-slate-100 dark:border-white/5' : 'border-red-100 opacity-70'}`}>
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-[14px] bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                        <UserCircleIcon className="w-6 h-6" />
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${member.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                        {member.status === 'active' ? 'ACTIVO' : 'SUSPENDIDO'}
                                    </span>
                                </div>
                                <h3 className="font-black text-slate-900 dark:text-white text-base uppercase truncate mb-1">{member.fullName}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 flex items-center gap-1">
                                    <BriefcaseIcon className="w-3.5 h-3.5" /> {member.jobTitle || 'PERSONAL'}
                                </p>
                                <div className="space-y-2 text-[10px] font-bold uppercase text-slate-500">
                                    <p className="flex items-center gap-2 truncate"><EnvelopeIcon className="w-3.5 h-3.5 shrink-0" /> {member.email}</p>
                                    <p className="flex items-center gap-2"><PhoneIcon className="w-3.5 h-3.5 shrink-0" /> {member.phone || '---'}</p>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex gap-2 rounded-[14px]">
                                <button onClick={() => handleOpenModal(member)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-[14px] border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-900 transition-all">
                                    <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => setPasswordModal({ isOpen: true, member })} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-[14px] border border-slate-200 dark:border-white/10 text-slate-400 hover:text-emerald-500 transition-all">
                                    <LockClosedIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => requestToggleStatus(member)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-[14px] border border-slate-200 dark:border-white/10 text-slate-400 hover:text-blue-500 transition-all">
                                    <PowerIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => requestDelete(member.id, member.uid)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-[14px] border border-red-100 text-red-400 hover:bg-red-50 transition-all">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-lg rounded-[14px] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white">{editingId ? 'Editar Staff' : 'Nuevo Staff'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nombre Completo</label>
                                    <input type="text" required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[14px] text-xs font-bold outline-none uppercase" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Correo Electrónico</label>
                                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[14px] text-xs font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Teléfono</label>
                                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[14px] text-xs font-bold outline-none" />
                                </div>
                                {!editingId && (
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Contraseña Inicial</label>
                                        <input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-[14px] text-xs font-bold outline-none" />
                                    </div>
                                )}
                            </div>
                            <div className="pt-4">
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Asignar Recintos</label>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                    {venues.map(v => (
                                        <div key={v.id} onClick={() => handleToggleVenueSelection(v.id)} className={`p-2.5 rounded-[14px] border cursor-pointer transition-all flex items-center gap-2 ${formData.tenantIds.includes(v.id) ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-slate-100 dark:border-white/10 text-slate-400'}`}>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.tenantIds.includes(v.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-white/5 border-slate-200'}`}>
                                                {formData.tenantIds.includes(v.id) && <CheckCircleIcon className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-[9px] font-black uppercase truncate">{v.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={isSaving} className="w-full py-3 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-[14px] shadow-xl active:scale-95 disabled:opacity-50">
                                {editingId ? 'Guardar Cambios' : 'Crear y Dar Acceso'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
