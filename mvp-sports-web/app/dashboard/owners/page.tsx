"use client";
import React, { useState, useEffect } from 'react';
import {
    MagnifyingGlassIcon,
    BuildingStorefrontIcon,
    PhoneIcon,
    EnvelopeIcon,
    NoSymbolIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    XMarkIcon,
    IdentificationIcon,
    InformationCircleIcon,
    KeyIcon,
    LockClosedIcon,
    ArrowPathIcon,
    ClipboardDocumentIcon,
    CurrencyDollarIcon,
    ChevronDownIcon,
    BuildingOffice2Icon,
    ShieldCheckIcon,
    UserIcon,
    GlobeAmericasIcon,
    MapPinIcon
} from '@heroicons/react/24/outline';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where, orderBy, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { PanelGlass, TarjetaKpi, BotonAccion } from '@/components/ui/DashboardWidgets';

// --- INTERFACES ---
interface Owner {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    rut: string;
    billingAddress: string;
    tier: string;
    totalMrr: number;
    debt: number;
    paymentHistory: string[];
    venues: { name: string; plan: string }[];
    photoURL?: string;
    status: string;
    createdAt: any;
}

const INITIAL_OWNER_STATE = {
    name: '',
    email: '',
    phone: '',
    company: '',
    rut: '',
    billingAddress: '',
    password: ''
};

export default function Page() {
    const [owners, setOwners] = useState<Owner[]>([]);
    const [filter, setFilter] = useState('Todos');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newOwner, setNewOwner] = useState(INITIAL_OWNER_STATE);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordOwnerId, setPasswordOwnerId] = useState<string | null>(null);
    const [manualPassword, setManualPassword] = useState('');

    const [createdCredentials, setCreatedCredentials] = useState<{ email: string, pass: string } | null>(null);
    const [ownerToDelete, setOwnerToDelete] = useState<Owner | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

    const addToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ msg, type: type === 'info' ? 'success' : type as any });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchOwners = async () => {
        setLoading(true);
        try {
            const settingsSnap = await getDoc(doc(db, "settings", "global"));
            let priceMap: Record<string, number> = {};
            if (settingsSnap.exists()) {
                const plans = settingsSnap.data().plans || [];
                plans.forEach((p: any) => {
                    if (p.name) priceMap[p.name.trim()] = p.price;
                    if (p.id) priceMap[p.id] = p.price;
                });
            }

            const qOwners = query(collection(db, "users"), where("role", "==", "owner"));
            const ownersSnapshot = await getDocs(qOwners);
            const qTenants = query(collection(db, "tenants"));
            const tenantsSnapshot = await getDocs(qTenants);
            const allTenants = tenantsSnapshot.docs.map(d => ({ ...d.data(), id: d.id }));

            const loadedOwners: Owner[] = ownersSnapshot.docs.map(doc => {
                const data = doc.data();
                const myTenants = allTenants.filter((t: any) => t.ownerId === doc.id || (t.ownerIds && t.ownerIds.includes(doc.id)));
                const ownerVenues = myTenants.map((t: any) => ({ name: t.name, plan: t.plan }));
                const totalMrr = myTenants.reduce((sum: number, t: any) => sum + (priceMap[t.plan] || priceMap[t.plan?.toLowerCase()] || t.planPrice || 0), 0);
                const totalDebt = myTenants.filter((t: any) => t.debtStatus === 'Vencido').reduce((sum: number, t: any) => sum + (priceMap[t.plan] || priceMap[t.plan?.toLowerCase()] || t.planPrice || 0), 0);

                let tier = 'ESTÁNDAR';
                if (totalMrr > 500000) tier = 'VIP PLATINO';
                else if (totalMrr > 200000) tier = 'ORO';

                return {
                    id: doc.id,
                    name: data.displayName || "Sin Nombre",
                    company: data.companyName || "Particular",
                    email: data.email || "-",
                    phone: data.phone || "+56 9 .... ....",
                    rut: data.rut || "---",
                    billingAddress: data.billingAddress || "---",
                    tier, totalMrr, debt: totalDebt,
                    paymentHistory: data.paymentHistory || [],
                    venues: ownerVenues,
                    photoURL: data.photoURL || "",
                    status: data.status === 'active' ? 'Activo' : 'Suspendido',
                    createdAt: data.createdAt
                };
            });
            setOwners(loadedOwners);
        } catch (error) { addToast("Error al cargar dueños", 'error'); } finally { setLoading(false); }
    };

    useEffect(() => { fetchOwners(); }, []);

    const handleDeleteOwner = async () => {
        if (!ownerToDelete) return;
        setIsDeleting(true);
        try {
            await fetch('/dashboard/owners/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', uid: ownerToDelete.id }) });
            await deleteDoc(doc(db, "users", ownerToDelete.id));
            setOwners(prev => prev.filter(o => o.id !== ownerToDelete.id));
            setOwnerToDelete(null); addToast("Dueño y cuenta eliminados correctamente", 'success');
        } catch (error) { addToast("Error al eliminar dueño", 'error'); } finally { setIsDeleting(false); }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false); setIsEditing(false); setEditingId(null);
        setNewOwner(INITIAL_OWNER_STATE);
    };

    const handleOpenEdit = (owner: Owner) => {
        setIsEditing(true); setEditingId(owner.id);
        setNewOwner({ name: owner.name, email: owner.email, phone: owner.phone, company: owner.company, rut: owner.rut, billingAddress: owner.billingAddress, password: '' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const ownerData = { displayName: newOwner.name, email: newOwner.email, phone: newOwner.phone, companyName: newOwner.company, rut: newOwner.rut, billingAddress: newOwner.billingAddress, role: 'owner', updatedAt: new Date() };
            if (isEditing && editingId) {
                await updateDoc(doc(db, "users", editingId), ownerData);
                addToast("Actualizado", 'success'); handleCloseModal();
            } else {
                if (!newOwner.password || newOwner.password.length < 6) throw new Error("Mínimo 6 caracteres.");
                const response = await fetch('/dashboard/owners/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', email: newOwner.email, password: newOwner.password, displayName: newOwner.name, role: 'owner' }) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                await setDoc(doc(db, "users", result.uid), { ...ownerData, status: 'active', createdAt: serverTimestamp(), paymentHistory: [] });
                setCreatedCredentials({ email: newOwner.email, pass: newOwner.password });
                addToast("Dueño registrado", 'success'); handleCloseModal();
            }
            fetchOwners();
        } catch (error: any) { addToast(error.message, 'error'); } finally { setIsSubmitting(false); }
    };

    const handleManualPasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordOwnerId || manualPassword.length < 6) return addToast("Mínimo 6 caracteres", "error");
        setIsSubmitting(true);
        try {
            const res = await fetch('/dashboard/owners/api', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ action: 'updatePassword', uid: passwordOwnerId, password: manualPassword }) 
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error en el servidor");
            
            addToast("Contraseña actualizada con éxito", "success"); 
            setIsPasswordModalOpen(false); 
            setManualPassword('');
        } catch (err: any) { 
            addToast(err.message || "Error al actualizar", "error"); 
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleSuspend = async (id: string, currentStatus: string) => {
        const next = currentStatus === 'Activo' ? 'suspended' : 'active';
        const uiNext = currentStatus === 'Activo' ? 'Suspendido' : 'Activo';
        try {
            await updateDoc(doc(db, "users", id), { status: next });
            setOwners(prev => prev.map(o => o.id === id ? { ...o, status: uiNext } : o));
            addToast(`Usuario ${uiNext.toLowerCase()}`, 'info');
        } catch (e) { addToast("Error al cambiar estado", 'error'); }
    };

    const filteredOwners = owners.filter(o => {
        const matches = o.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.email.toLowerCase().includes(searchTerm.toLowerCase()) || o.company.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matches) return false;
        if (filter === 'Todos') return true;
        if (filter === 'Morosos') return o.debt > 0;
        if (filter === 'Suspendidos') return o.status === 'Suspendido';
        return true;
    });

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);

    const handleOpenPasswordModal = (id: string) => {
        setPasswordOwnerId(id);
        setIsPasswordModalOpen(true);
    };

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {notification && (
                <div className={`fixed top-6 right-6 z-[250] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border animate-slideInRight backdrop-blur-md ${notification.type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:text-emerald-400 dark:border-emerald-500/50' : 'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:text-red-400 dark:border-red-500/50'}`}>
                    {notification.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
                    <span className="text-[10px] font-black uppercase tracking-wider">{notification.msg}</span>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">Cartera de Partners</p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Gestión de <span className="text-emerald-500 dark:text-emerald-400">Dueños</span></h1>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="px-6 py-2.5 bg-slate-950 dark:bg-emerald-600 text-white dark:text-slate-950 text-[10px] font-black uppercase rounded-xl shadow-xl flex items-center gap-2 active:scale-95 transition-all"><PlusIcon className="w-4 h-4" /> Nuevo Partner</button>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <TarjetaKpi titulo="TOTAL DUEÑOS" valor={owners.length.toString()} sub="GLOBAL" icono={<BuildingStorefrontIcon />} brillo />
                <TarjetaKpi titulo="INGRESOS MRR" valor={formatCLP(owners.reduce((a, o) => a + o.totalMrr, 0))} sub="PROYECTADO" icono={<CurrencyDollarIcon />} />
                <TarjetaKpi titulo="EN MORA" valor={owners.filter(o => o.debt > 0).length.toString()} sub="ATENCIÓN" icono={<ExclamationTriangleIcon className="text-red-500" />} />
                <TarjetaKpi titulo="TICKET PROM." valor={formatCLP(owners.length > 0 ? owners.reduce((a, o) => a + o.totalMrr, 0) / owners.length : 0)} sub="MENSUAL" icono={<InformationCircleIcon />} />
            </div>

            {/* TOOLS */}
            <PanelGlass className="flex flex-col md:flex-row gap-4 justify-between items-center py-3 px-4">
                <div className="relative w-full md:w-80">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input type="text" placeholder="BUSCAR POR NOMBRE O EMPRESA..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 rounded-xl text-[10px] font-black uppercase outline-none text-black dark:text-white transition-all shadow-sm" />
                </div>
                <div className="flex bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-slate-100 dark:border-white/10">
                    {['Todos', 'Morosos', 'Suspendidos'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${filter === f ? 'bg-white dark:bg-emerald-500 text-black shadow-sm' : 'text-slate-400 hover:text-black dark:hover:text-white'}`}>{f.toUpperCase()}</button>
                    ))}
                </div>
            </PanelGlass>

            {/* LISTADO CARDS */}
            {loading ? (
                <div className="py-20 text-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" /><p className="text-[10px] font-black uppercase text-slate-400">Sincronizando Partners...</p></div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredOwners.map((owner) => (
                        <div key={owner.id} className={`bg-white dark:bg-[#0B0F19] rounded-3xl border transition-all flex flex-col group overflow-hidden ${owner.status === 'Activo' ? 'border-slate-100 dark:border-white/5' : 'border-red-100 opacity-70 shadow-none'}`}>
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-6">
                                    {owner.photoURL ? (
                                        <div className="w-12 h-12 rounded-2xl border border-slate-100 dark:border-white/10 overflow-hidden shadow-inner shrink-0">
                                            <img src={owner.photoURL} className="w-full h-full object-cover" alt={owner.name} />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center font-black text-emerald-500 text-xl shadow-inner shrink-0">{owner.name.charAt(0)}</div>
                                    )}
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase border ${owner.status === 'Activo' ? 'bg-emerald-50 border-emerald-500/20 text-emerald-600' : 'bg-red-50 border-red-500/20 text-red-600'}`}>
                                            {owner.status}
                                        </span>
                                        <span className="px-2 py-0.5 bg-slate-50 dark:bg-white/5 rounded-lg text-[7px] font-black text-slate-400 border border-slate-100 dark:border-white/10 uppercase">{owner.tier}</span>
                                    </div>
                                </div>
                                
                                <h3 className="font-black text-slate-900 dark:text-white text-lg uppercase truncate leading-tight group-hover:text-emerald-500 transition-colors">{owner.name}</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mb-5 tracking-tighter line-clamp-1">{owner.company}</p>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                        <IdentificationIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="truncate">{owner.rut}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                        <EnvelopeIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="truncate">{owner.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                        <PhoneIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span>{owner.phone}</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">Centros Operativos</span>
                                        <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded text-[7px] font-black">{owner.venues.length}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {owner.venues.slice(0, 3).map((v, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-white dark:bg-white/5 text-[7px] font-black uppercase text-slate-500 rounded-lg border border-slate-200 dark:border-white/10">{v.name}</span>
                                        ))}
                                        {owner.venues.length > 3 && <span className="text-[7px] font-black text-emerald-500">+{owner.venues.length - 3} MÁS</span>}
                                        {owner.venues.length === 0 && <span className="text-[7px] font-bold text-slate-300 italic">SIN ASIGNACIONES</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-950 flex flex-col gap-1 border-t border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Facturación MRR</span>
                                    <span className="text-xs font-black text-white">{formatCLP(owner.totalMrr)}</span>
                                </div>
                                {owner.debt > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Deuda Pendiente</span>
                                        <span className="text-[10px] font-black text-red-400">{formatCLP(owner.debt)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex gap-2">
                                <button title="Cambiar Password" onClick={() => handleOpenPasswordModal(owner.id)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-black dark:hover:text-white transition-all active:scale-90"><KeyIcon className="w-4 h-4" /></button>
                                <button title="Editar Perfil" onClick={() => handleOpenEdit(owner)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-black dark:hover:text-white transition-all active:scale-90"><PencilSquareIcon className="w-4 h-4" /></button>
                                <button title={owner.status === 'Activo' ? 'Suspender' : 'Activar'} onClick={() => toggleSuspend(owner.id, owner.status)} className={`flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-xl border transition-all active:scale-90 ${owner.status === 'Activo' ? 'border-red-50 text-red-400 hover:bg-red-50' : 'border-emerald-50 text-emerald-500 hover:bg-emerald-50'}`}>{owner.status === 'Activo' ? <NoSymbolIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}</button>
                                <button title="Eliminar" onClick={() => setOwnerToDelete(owner)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 transition-all active:scale-90"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
             {/* MODAL ALTA / EDITAR (ADN VISUAL) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={handleCloseModal}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#0B0F19] w-full max-w-4xl rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-500">
                        {/* Cabecera Premium */}
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02] relative">
                            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 dark:from-white/[0.03] to-transparent pointer-events-none"></div>
                            <h3 className="relative z-10 text-xl font-black uppercase text-slate-800 dark:text-white flex items-center gap-4 italic tracking-tighter">
                                <div className="p-3 bg-emerald-500 rounded-2xl shadow-xl shadow-emerald-500/30">
                                    <BuildingStorefrontIcon className="w-6 h-6 text-white" />
                                </div>
                                {isEditing ? 'SINCRONIZAR PARTNER' : 'ALTA DE PARTNER ELITE'}
                            </h3>
                            <button onClick={handleCloseModal} className="relative z-10 p-3 text-slate-300 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all shadow-sm active:scale-90">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 overflow-y-auto space-y-10 custom-scrollbar relative z-10">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                <div className="space-y-5">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.3em] mb-2 flex items-center gap-2"><UserIcon className="w-4 h-4 text-emerald-500" /> Identidad Personal</h4>
                                    <InputGroupPremium label="Nombre Dueño" value={newOwner.name} onChange={(e: any) => setNewOwner({ ...newOwner, name: e.target.value })} icon={<UserIcon className="w-4 h-4" />} />
                                    <InputGroupPremium label="Email Corporativo" type="email" value={newOwner.email} onChange={(e: any) => setNewOwner({ ...newOwner, email: e.target.value })} icon={<EnvelopeIcon className="w-4 h-4" />} readOnly={isEditing} />
                                    {!isEditing && <InputGroupPremium label="Password Inicial" type="text" value={newOwner.password} onChange={(e: any) => setNewOwner({ ...newOwner, password: e.target.value })} icon={<LockClosedIcon className="w-4 h-4" />} placeholder="Mín. 6 caracteres" />}
                                    <InputGroupPremium label="Teléfono Directo" value={newOwner.phone} onChange={(e: any) => setNewOwner({ ...newOwner, phone: e.target.value })} icon={<PhoneIcon className="w-4 h-4" />} />
                                </div>

                                <div className="space-y-5">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.3em] mb-2 flex items-center gap-2"><BuildingOffice2Icon className="w-4 h-4 text-emerald-500" /> Datos de Empresa</h4>
                                    <InputGroupPremium label="Razón Social" value={newOwner.company} onChange={(e: any) => setNewOwner({ ...newOwner, company: e.target.value })} icon={<BuildingOffice2Icon className="w-4 h-4" />} />
                                    <InputGroupPremium label="RUT / Identificador Fiscal" value={newOwner.rut} onChange={(e: any) => setNewOwner({ ...newOwner, rut: e.target.value })} icon={<IdentificationIcon className="w-4 h-4" />} />
                                    <InputGroupPremium label="Dirección Facturación" value={newOwner.billingAddress} onChange={(e: any) => setNewOwner({ ...newOwner, billingAddress: e.target.value })} icon={<MapPinIcon className="w-4 h-4" />} />
                                </div>

                                <div className="space-y-5">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.3em] mb-2 flex items-center gap-2"><ShieldCheckIcon className="w-4 h-4 text-emerald-500" /> Seguridad & Roles</h4>
                                    <div className="p-6 bg-emerald-50/30 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100 dark:border-emerald-500/10 flex flex-col items-center justify-center text-center gap-4 group">
                                        <ShieldCheckIcon className="w-12 h-12 text-emerald-500 opacity-20 group-hover:scale-110 transition-transform duration-500" />
                                        <p className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-tighter leading-relaxed">Notificación de Credenciales Automática</p>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1 leading-loose">El sistema despachará un acceso cifrado una vez validada el alta del partner.</p>
                                    </div>
                                    <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/10 flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <GlobeAmericasIcon className="w-5 h-5 text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-widest">Atributos Globales</span>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-relaxed">Permisos administrativos totales sobre recintos y facturación vinculada.</p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSubmitting} 
                                className="w-full py-5 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-900 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4"
                            >
                                {isSubmitting ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <ShieldCheckIcon className="w-6 h-6" />}
                                {isEditing ? 'SINCRONIZAR DATOS PARTNER' : 'VALIDAR Y REGISTRAR PARTNER'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL PASSWORD (ADN VISUAL) */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsPasswordModalOpen(false)}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-[3rem] p-10 border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-center relative overflow-hidden animate-in zoom-in duration-300">
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 dark:from-white/[0.03] to-transparent pointer-events-none"></div>
                        
                        <div className="relative z-10 w-20 h-20 bg-amber-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-amber-500/20 shadow-xl shadow-amber-500/10">
                            <KeyIcon className="w-10 h-10 text-amber-500" />
                        </div>
                        
                        <h3 className="relative z-10 text-2xl font-black uppercase text-slate-800 dark:text-white mb-2 tracking-tighter italic">NUEVO ACCESO</h3>
                        <p className="relative z-10 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-10">ACTUALIZACIÓN DE SEGURIDAD</p>
                        
                        <form onSubmit={handleManualPasswordUpdate} className="relative z-10 space-y-6">
                            <div className="group">
                                <label className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 block text-left pl-2 mb-1.5 tracking-widest">NUEVA CONTRASEÑA</label>
                                <div className="relative">
                                    <LockClosedIcon className="w-5 h-5 text-slate-300 dark:text-slate-600 group-focus-within:text-amber-500 absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                                    <input 
                                        type="text" 
                                        value={manualPassword} 
                                        onChange={e => setManualPassword(e.target.value)} 
                                        placeholder="MÍN. 6 CARACTERES" 
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-xs font-black uppercase outline-none text-slate-800 dark:text-white focus:border-amber-500 transition-all shadow-inner" 
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 py-4 text-[9px] font-black uppercase rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 transition-all">CANCELAR</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 text-[9px] font-black uppercase rounded-2xl text-white bg-amber-600 shadow-2xl shadow-amber-600/30 flex items-center justify-center gap-3 active:scale-95 transition-all">
                                    {isSubmitting ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <ShieldCheckIcon className="w-5 h-5" />}
                                    APLICAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR (ADN VISUAL) */}
            {ownerToDelete && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setOwnerToDelete(null)}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-[3rem] p-10 border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-center relative overflow-hidden animate-in zoom-in duration-300">
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 dark:from-white/[0.03] to-transparent pointer-events-none"></div>
                        
                        <div className="relative z-10 w-20 h-20 bg-rose-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-rose-500/20 shadow-xl shadow-rose-500/10">
                            <ExclamationTriangleIcon className="w-10 h-10 text-rose-500" />
                        </div>
                        
                        <h3 className="relative z-10 text-2xl font-black uppercase text-slate-800 dark:text-white mb-3 tracking-tighter italic">¿ELIMINAR PARTNER?</h3>
                        <p className="relative z-10 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-10 leading-relaxed">ESTA ACCIÓN ES IRREVERSIBLE. SE REVOCARÁ TODO ACCESO A <strong>{ownerToDelete.name.toUpperCase()}</strong>.</p>
                        
                        <div className="relative z-10 flex gap-4">
                            <button onClick={() => setOwnerToDelete(null)} className="flex-1 py-4 text-[9px] font-black uppercase rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 transition-all">CANCELAR</button>
                            <button onClick={handleDeleteOwner} disabled={isDeleting} className="flex-1 py-4 text-[9px] font-black uppercase rounded-2xl text-white bg-rose-600 shadow-2xl shadow-rose-600/30 active:scale-95 transition-all">
                                {isDeleting ? 'BORRANDO...' : 'SÍ, ELIMINAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CREDENCIALES (ADN VISUAL) */}
            {createdCredentials && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-[3.5rem] p-10 border-2 border-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.3)] text-center relative overflow-hidden animate-in zoom-in duration-700">
                        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-emerald-500/10 dark:from-emerald-500/5 to-transparent pointer-events-none"></div>
                        
                        <CheckCircleIcon className="relative z-10 w-24 h-24 text-emerald-500 mx-auto mb-6 drop-shadow-lg" />
                        <h3 className="relative z-10 text-2xl font-black uppercase text-slate-800 dark:text-white mb-2 tracking-tighter italic">¡PARTNER REGISTRADO!</h3>
                        <p className="relative z-10 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase mb-8 tracking-[0.2em]">ACCESO GENERADO EXITOSAMENTE</p>
                        
                        <div className="relative z-10 bg-slate-50 dark:bg-white/[0.02] p-8 rounded-[2rem] border border-slate-100 dark:border-white/10 text-left space-y-6 mb-10 shadow-inner">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-2">EMAIL DE ACCESO</p>
                                <p className="font-mono text-sm font-black text-slate-800 dark:text-white">{createdCredentials.email}</p>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-2">PASSWORD TEMPORAL</p>
                                <div className="flex items-center justify-between">
                                    <p className="font-mono text-3xl font-black text-emerald-500 tracking-tighter">{createdCredentials.pass}</p>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(createdCredentials.pass); addToast("Copiado al portapapeles", 'success') }} 
                                        className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-2xl transition-all active:scale-90"
                                        title="Copiar Password"
                                    >
                                        <ClipboardDocumentIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setCreatedCredentials(null)} 
                            className="relative z-10 w-full py-5 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-900 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all"
                        >
                            CONCLUIR ALTA
                        </button>
                    </div>
                </div>
            )}
        </div>

    );
}

function InputGroupPremium({ label, value, onChange, placeholder, icon, readOnly, type = "text", children }: any) {
    return (
        <div className="flex flex-col gap-1 group w-full text-left">
            <label className="text-[8px] font-black uppercase tracking-[0.1em] text-black dark:text-white transition-colors pl-0.5">{label}</label>
            <div className="relative">
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20 group-focus-within:text-emerald-500 transition-colors">{icon}</div>}
                {type === 'select' ? (
                    <select value={value || ''} onChange={onChange} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-8 py-2 bg-white dark:bg-[#0B0F19] border border-slate-100 dark:border-white/5 rounded-xl text-[10px] font-bold text-black dark:text-white focus:border-emerald-500 outline-none transition-all appearance-none uppercase cursor-pointer shadow-sm`}>{children}</select>
                ) : (
                    <input type={type} value={value || ''} onChange={onChange} readOnly={readOnly} placeholder={placeholder} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-3 py-2 rounded-xl border text-[10px] font-bold transition-all outline-none shadow-sm ${readOnly ? 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-white/5 dark:border-white/5' : 'bg-white border-slate-100 text-black focus:border-emerald-500 dark:bg-[#0B0F19] dark:border-white/5 dark:text-white'}`} />
                )}
                {type === 'select' && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300"><ChevronDownIcon className="w-3 h-3" /></div>}
            </div>
        </div>
    );
}
