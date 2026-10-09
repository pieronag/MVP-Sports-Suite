"use client";
import { getOwnedTenantsSnap } from "@/services/ownedTenants";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, auth } from '@/services/firebase';
import { collection, getDocs, getDoc, query, where, orderBy, limit, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, onSnapshot, Timestamp, writeBatch, setDoc, or } from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { updateStaffPassword } from './actions';
import { auditService } from '@/services/auditService';
import { TarjetaKpi } from '@/components/ui/DashboardWidgets';
import {
    Add01Icon,
    Alert02Icon,
    Briefcase01Icon,
    Building01Icon,
    Cancel01Icon,
    CheckmarkCircle02Icon,
    EyeIcon,
    EyeOffIcon,
    Grid02Icon,
    IdentityCardIcon,
    LockIcon,
    Mail01Icon,
    PencilEdit02Icon,
    PhoneIcon,
    PowerIcon,
    RefreshIcon,
    Search01Icon,
    ShieldCheckIcon,
    TrashIcon,
    UserCircleIcon,
    UserGroupIcon,
    UserIcon,
} from '@hugeicons/core-free-icons';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-5 right-5 z-[160] flex items-center gap-3 px-4 py-3 rounded-md shadow-xl border animate-slideIn ${type === 'success' ? 'bg-white border-emerald-500 text-emerald-700 dark:bg-[#0B0F19] dark:text-[#00df82] dark:border-emerald-500/50' : 'bg-white border-red-500 text-red-700 dark:bg-[#0B0F19] dark:text-red-400 dark:border-red-500/50'}`}>
            {type === 'success' ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5" /> : <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">{message}</span>
        </div>
    );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onCancel}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-md shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase">{title}</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-6 uppercase">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 text-[10px] font-bold uppercase rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">CANCELAR</button>
                    <button onClick={onConfirm} className={`px-4 py-2 text-[10px] font-bold uppercase rounded-md text-white ${isDestructive ? 'bg-red-600' : 'bg-emerald-600'}`}>CONFIRMAR</button>
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
            <div className="bg-white dark:bg-[#0B0F19] rounded-md shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Cambiar Clave</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Usuario: {memberName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-md border border-emerald-100 dark:border-emerald-500/20">
                        <label className="text-[10px] font-bold text-emerald-700 dark:text-[#00df82] uppercase tracking-wide block mb-1.5">Nueva Contraseña</label>
                        <div className="relative">
                            <HugeiconsIcon icon={LockIcon} className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-9 pr-10 py-3 bg-white dark:bg-[#0B0F19] border border-emerald-200 dark:border-emerald-500/30 rounded-md text-xs font-bold outline-none" placeholder="MÍNIMO 6 CARACTERES" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">{showPassword ? <HugeiconsIcon icon={EyeOffIcon} className="w-5 h-5" /> : <HugeiconsIcon icon={EyeIcon} className="w-5 h-5" />}</button>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 text-[10px] font-bold uppercase rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">CANCELAR</button>
                        <button type="submit" disabled={isSaving || password.length < 6} className="flex-2 px-6 py-3 text-[10px] font-bold uppercase rounded-md text-white bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSaving ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" /> : <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" />}
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
                const snapVenues = await getOwnedTenantsSnap(user.uid);
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
        const idToken = await auth.currentUser?.getIdToken();
        const res = await updateStaffPassword(passwordModal.member.uid, newPassword, idToken || '');
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
    const sortedStaff = [...filteredStaff].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' });
    });
    const activeCount = staffList.filter(s => s.status === 'active').length;
    const inactiveCount = staffList.length - activeCount;
    const venueName = (id: string) => venues.find(v => v.id === id)?.name || id;
    const initials = (name: string) => name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const avatarTones = ['bg-emerald-500/10 text-emerald-600 dark:text-[#00df82]', 'bg-sky-500/10 text-sky-500', 'bg-indigo-500/10 text-indigo-500', 'bg-amber-500/10 text-amber-500', 'bg-rose-500/10 text-rose-500'];
    const avatarTone = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
        return avatarTones[hash % avatarTones.length];
    };

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
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">
                            Gestión de Talento Humano
                        </p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Administración de <span className="text-emerald-500 dark:text-[#00df82]">Staff</span>
                    </h1>
                </div>

                <div className="flex items-center gap-2 p-1.5 rounded-md">
                    <span className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hidden md:inline-flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#00df82]" /> {activeCount} activos · {inactiveCount} suspendidos
                    </span>
                    <button 
                        onClick={() => handleOpenModal()} 
                        className="px-6 py-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[9px] uppercase tracking-[0.2em] rounded-md transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center gap-2 border border-emerald-400/20 dark:border-white/10"
                    >
                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> NUEVO PERSONAL
                    </button>
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-[#0B0F19] p-4 rounded-md border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="relative">
                    <select 
                        value={filterVenueId} 
                        onChange={(e) => setFilterVenueId(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-white/5 border-0 rounded-md pl-3 pr-8 py-3 text-[10px] font-bold uppercase outline-none text-slate-600 dark:text-white cursor-pointer appearance-none"
                    >
                        <option value="ALL">TODOS LOS RECINTOS</option>
                        {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <HugeiconsIcon icon={Building01Icon} className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative lg:col-span-3">
                    <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text" 
                        placeholder="BUSCAR POR NOMBRE..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-md text-[10px] font-bold outline-none uppercase placeholder:text-slate-400" 
                    />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <TarjetaKpi label="Total Personal" value={staffList.length} sub="Miembros registrados" icon={<HugeiconsIcon icon={UserGroupIcon} />} brillo />
                <TarjetaKpi label="Activos" value={activeCount} sub="Con acceso habilitado" icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} />} />
                <TarjetaKpi label="Suspendidos" value={inactiveCount} sub="Acceso restringido" icon={<HugeiconsIcon icon={PowerIcon} />} />
                <TarjetaKpi label="Recintos" value={venues.length} sub="Sedes con personal" icon={<HugeiconsIcon icon={Building01Icon} />} />
            </div>

            {loading ? (
                <div className="text-center py-20 text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                    Cargando personal...
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {sortedStaff.map((member) => (
                        <div key={member.id} className={`bg-white dark:bg-[#0B0F19] rounded-md border transition-all flex flex-col overflow-hidden ${member.status === 'active' ? 'border-slate-100 dark:border-white/5' : 'border-red-100 dark:border-red-500/20'}`}>
                            <div className={`h-1 w-full ${member.status === 'active' ? 'bg-emerald-500 dark:bg-[#00df82]' : 'bg-red-500'}`} />
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-11 h-11 rounded-md flex items-center justify-center font-black text-sm ${avatarTone(member.fullName)}`}>
                                        {initials(member.fullName)}
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${member.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:text-[#00df82] border-emerald-100 dark:border-emerald-500/20' : 'bg-red-50 text-red-500 border-red-100 dark:border-red-500/20'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500 dark:bg-[#00df82] animate-pulse' : 'bg-red-500'}`} />
                                        {member.status === 'active' ? 'Activo' : 'Suspendido'}
                                    </span>
                                </div>
                                <h3 className="font-black text-slate-900 dark:text-white text-base uppercase truncate mb-1">{member.fullName}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-3 flex items-center gap-1.5">
                                    <HugeiconsIcon icon={Briefcase01Icon} className="w-3.5 h-3.5" /> {member.jobTitle || 'PERSONAL'}
                                </p>
                                {member.rut && <p className="text-[9px] text-slate-400 font-mono mb-3">RUT: {member.rut}</p>}
                                <div className="space-y-2 text-[10px] font-bold uppercase text-slate-500 mb-4">
                                    <p className="flex items-center gap-2 truncate"><HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5 shrink-0" /> {member.email}</p>
                                    <p className="flex items-center gap-2"><HugeiconsIcon icon={PhoneIcon} className="w-3.5 h-3.5 shrink-0" /> {member.phone || '---'}</p>
                                </div>
                                {(member.tenantIds || []).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {member.tenantIds.slice(0, 3).map(id => (
                                            <span key={id} className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[8px] font-bold uppercase text-slate-500 dark:text-slate-300 truncate max-w-[120px]">
                                                <HugeiconsIcon icon={Building01Icon} className="w-2.5 h-2.5 mr-1 text-emerald-600 dark:text-[#00df82]" strokeWidth={2} /> {venueName(id)}
                                            </span>
                                        ))}
                                        {member.tenantIds.length > 3 && (
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[8px] font-bold uppercase text-slate-400">+{member.tenantIds.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex gap-2">
                                <button onClick={() => handleOpenModal(member)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-900 hover:border-emerald-400/40 transition-all" title="Editar">
                                    <HugeiconsIcon icon={PencilEdit02Icon} className="w-4 h-4" />
                                </button>
                                <button onClick={() => setPasswordModal({ isOpen: true, member })} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 text-slate-400 hover:text-emerald-500 hover:border-emerald-400/40 transition-all" title="Cambiar clave">
                                    <HugeiconsIcon icon={LockIcon} className="w-4 h-4" />
                                </button>
                                <button onClick={() => requestToggleStatus(member)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 text-slate-400 hover:text-blue-500 transition-all" title="Cambiar estado">
                                    <HugeiconsIcon icon={PowerIcon} className="w-4 h-4" />
                                </button>
                                <button onClick={() => requestDelete(member.id, member.uid)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-md border border-red-100 dark:border-red-500/20 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all" title="Eliminar">
                                    <HugeiconsIcon icon={TrashIcon} className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {sortedStaff.length === 0 && (
                        <div className="col-span-full py-24 text-center space-y-3">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-md flex items-center justify-center mx-auto text-slate-300 border border-slate-200 dark:border-white/10">
                                <HugeiconsIcon icon={UserGroupIcon} className="w-8 h-8" strokeWidth={1.4} />
                            </div>
                            <p className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Sin personal encontrado</p>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Agrega miembros o cambia los filtros</p>
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-lg rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0">
                                    <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-[#00df82] mb-0.5">{editingId ? 'Editar miembro' : 'Nuevo miembro'}</p>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">{editingId ? 'Editar Staff' : 'Crear y Dar Acceso'}</h3>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shrink-0">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Nombre Completo</label>
                                <input type="text" required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="Ej: Carlos Soto" className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-bold outline-none uppercase focus:border-emerald-500 transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Cargo</label>
                                    <input type="text" value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} placeholder="Ej: Recepcionista" className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-bold outline-none uppercase focus:border-emerald-500 transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">RUT</label>
                                    <input type="text" value={formData.rut} onChange={e => setFormData({ ...formData, rut: e.target.value })} placeholder="12.345.678-9" className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-bold outline-none font-mono focus:border-emerald-500 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Correo Electrónico</label>
                                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-bold outline-none focus:border-emerald-500 transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Teléfono</label>
                                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-bold outline-none focus:border-emerald-500 transition-all" />
                                </div>
                            </div>
                            {!editingId && (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Contraseña Inicial</label>
                                    <div className="relative">
                                        <HugeiconsIcon icon={LockIcon} className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                                        <input type={showPassword ? "text" : "password"} required minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="MÍNIMO 6 CARACTERES" className="w-full pl-9 pr-10 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-md text-[11px] font-bold outline-none focus:border-emerald-500 transition-all" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-[#00df82]">
                                            {showPassword ? <HugeiconsIcon icon={EyeOffIcon} className="w-4 h-4" /> : <HugeiconsIcon icon={EyeIcon} className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asignar Recintos</label>
                                    <button type="button" onClick={() => {
                                        if (formData.tenantIds.length === venues.length) setFormData({ ...formData, tenantIds: [] });
                                        else setFormData({ ...formData, tenantIds: venues.map(v => v.id) });
                                    }} className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-[#00df82] hover:underline">
                                        {formData.tenantIds.length === venues.length && venues.length > 0 ? 'Quitar todos' : 'Seleccionar todos'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                    {venues.map(v => (
                                        <div key={v.id} onClick={() => handleToggleVenueSelection(v.id)} className={`p-2.5 rounded-md border cursor-pointer transition-all flex items-center gap-2 ${formData.tenantIds.includes(v.id) ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-slate-100 dark:border-white/10 text-slate-400'}`}>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.tenantIds.includes(v.id) ? 'bg-emerald-500 dark:bg-[#00df82] border-emerald-500 dark:border-[#00df82]' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/20'}`}>
                                                {formData.tenantIds.includes(v.id) && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3 h-3 text-white dark:text-black" />}
                                            </div>
                                            <span className="text-[9px] font-black uppercase truncate">{v.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={isSaving} className="w-full py-3 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[10px] uppercase tracking-widest rounded-md shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSaving ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" /> : <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" />}
                                {editingId ? 'Guardar Cambios' : 'Crear y Dar Acceso'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
