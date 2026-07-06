"use client";
import React, { useState, useEffect, useRef } from "react";
import {
    ArrowPathIcon, BuildingOffice2Icon, CheckBadgeIcon, CheckCircleIcon,
    ClockIcon, CloudArrowUpIcon, CurrencyDollarIcon, ExclamationTriangleIcon,
    InformationCircleIcon, MagnifyingGlassIcon, MapPinIcon, NoSymbolIcon,
    PencilSquareIcon, PhotoIcon, PlusIcon, TrashIcon, UserGroupIcon,
    UserIcon, XMarkIcon, ChevronDownIcon, ShieldCheckIcon, Squares2X2Icon,
    IdentificationIcon, GlobeAmericasIcon, PhoneIcon
} from "@heroicons/react/24/outline";
import {
    collection, getDocs, doc, updateDoc, addDoc, deleteDoc,
    query, orderBy, where, onSnapshot, serverTimestamp
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { PanelGlass, TarjetaKpi, BotonAccion } from "@/components/ui/DashboardWidgets";

// --- CONSTANTES ---
const REGIONES_CHILE = [
    "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo",
    "Valparaíso", "Metropolitana", "O'Higgins", "Maule", "Ñuble", "Biobío",
    "Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes"
];

// --- INTERFACES ---
interface Tenant {
    id: string; name: string; 
    ownerIds: string[]; // Soporte multi-dueño
    owners: string[]; // Nombres de los dueños
    ownerEmails?: string[];
    address: string; commune?: string; region?: string; city: string;
    coordinates?: { lat: number; lng: number }; imageURL?: string; imageUrl?: string;
    plan: string; mrr: number; status: string;
    infra: { courts: number; staff: number; sports: string[]; scheduleSummary: string; };
    todayStats: { bookings: number; capacity: number }; debt: number;
    lastSync: string; staffMembers: any[];
    rating?: number;
    totalFeedbacks?: number;
}

interface OwnerOption { id: string; name: string; email: string; }

const INITIAL_TENANT_STATE = {
    name: "", 
    selectedOwners: [] as OwnerOption[], // Lista de dueños seleccionados
    plan: "Básico", region: "Metropolitana",
    commune: "", address: "", lat: 0, lng: 0, imageFile: null as File | null,
    imagePreview: "",
};

export default function Page() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("Todos");
    const [searchTerm, setSearchTerm] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [ownersList, setOwnersList] = useState<OwnerOption[]>([]);
    const [newTenant, setNewTenant] = useState(INITIAL_TENANT_STATE);
    const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

    const [ownerSearchTerm, setOwnerSearchTerm] = useState("");
    const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);

    const addToast = (msg: string, type: "success" | "error" | "info" = "success") => {
        setNotification({ msg, type: type === 'info' ? 'success' : type as any });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const qTenants = query(collection(db, "tenants"), orderBy("name"));
            const snap = await getDocs(qTenants);
            const tenantsList = await Promise.all(snap.docs.map(async (d) => {
                const data = d.data();
                const tenantId = d.id;
                const snapCourts = await getDocs(query(collection(db, "courts"), where("tenantId", "==", tenantId)));
                const snapStaffNew = await getDocs(query(collection(db, "staff"), where("tenantIds", "array-contains", tenantId)));
                const snapStaffOld = await getDocs(query(collection(db, "staff"), where("tenantId", "==", tenantId)));
                
                const staffMap = new Map();
                [...snapStaffNew.docs, ...snapStaffOld.docs].forEach(s => {
                    if (!staffMap.has(s.id)) {
                        staffMap.set(s.id, { id: s.id, fullName: s.data().fullName, jobTitle: s.data().jobTitle || "Staff" });
                    }
                });
                const staffList = Array.from(staffMap.values());
                const schedule = data.schedule || {};
                let scheduleStr = "No definido";
                const sampleDay = Object.values(schedule)[0] as any;
                if (sampleDay?.isOpen) scheduleStr = `${sampleDay.open} - ${sampleDay.close}`;

                // CALCULAR RATING REAL (COMBINANDO REVIEWS Y BOOKINGS DE-DUPLICADOS)
                const qRev = query(collection(db, "reviews"), where("venueId", "==", tenantId));
                const snapRev = await getDocs(qRev);
                const revs = snapRev.docs.map(d => d.data());

                const qBook = query(collection(db, "bookings"), where("tenantId", "==", tenantId));
                const snapBook = await getDocs(qBook);
                const books = snapBook.docs.map(d => d.data()).filter((b: any) => b.rating > 0);

                const fMap = new Map();
                const gck = (item: any) => {
                    const commentNorm = (item.comment || item.feedback || '').trim().toLowerCase().substring(0, 30);
                    const timeStr = item.date?.seconds || item.date?.toString() || '';
                    return `${item.userId || item.createdBy || 'anon'}_${tenantId}_${item.rating}_${commentNorm}_${timeStr}`;
                };
                
                revs.forEach((r: any) => fMap.set(r.bookingId || gck(r), r));
                books.forEach((b: any) => { 
                    const k = b.id;
                    const ck = gck(b);
                    if(!fMap.has(k) && !fMap.has(ck)) fMap.set(k, b); 
                });

                const allEvals = Array.from(fMap.values());
                const rawAvg = allEvals.length > 0 
                    ? (allEvals.reduce((acc, e) => acc + (e.rating || 0), 0) / allEvals.length)
                    : 0;
                const realRating = Math.round(rawAvg * 10) / 10;
                const totalFeedbacks = allEvals.length;

                // Sincronizar con Firestore si el valor almacenado es diferente
                if (data.rating !== realRating || data.totalFeedbacks !== totalFeedbacks) {
                    const tenantRef = doc(db, "tenants", tenantId);
                    updateDoc(tenantRef, { rating: realRating, totalFeedbacks: totalFeedbacks }).catch(e => console.error(e));
                }

                // Manejo de multi-dueño con fallback a single-owner (ownerId/ownerName)
                const ownerIds = data.ownerIds || (data.ownerId ? [data.ownerId] : []);
                const ownerNames = data.ownerNames || (data.ownerName ? [data.ownerName] : (data.owner ? [data.owner] : []));
                const ownerEmails = data.ownerEmails || (data.ownerEmail ? [data.ownerEmail] : []);

                return {
                    id: tenantId, name: data.name, 
                    ownerIds, owners: ownerNames, ownerEmails,
                    address: data.address || "", commune: data.commune || "",
                    region: data.region || "", city: data.commune || data.city || "---",
                    coordinates: data.coordinates || { lat: 0, lng: 0 },
                    imageUrl: data.imageURL || data.imageUrl || "",
                    imageURL: data.imageURL || data.imageUrl || "",
                    plan: data.planId || data.plan || "free",
                    mrr: data.planPrice || 0, status: data.status,
                    infra: { courts: snapCourts.size, staff: staffList.length, sports: data.sports || [], scheduleSummary: scheduleStr },
                    todayStats: { bookings: 0, capacity: 0 }, debt: data.debtStatus === "Vencido" ? data.planPrice : 0,
                    lastSync: "En línea", staffMembers: staffList,
                    transbankConfig: data.transbankConfig || { commerceCode: "", apiKey: "" },
                    rating: Number(realRating.toFixed(1)),
                    totalFeedbacks: allEvals.length,
                };
            }));
            setTenants(tenantsList);
        } catch (error) { addToast("Error al cargar recintos", "error"); } finally { setLoading(false); }
    };

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "tenants"), () => fetchInitialData());
        const fetchOwners = async () => {
            // Solo dueños u owners según requerimiento
            const qOwners = query(collection(db, "users"), where("role", "in", ["owner", "dueño"]));
            const ownersSnap = await getDocs(qOwners);
            setOwnersList(ownersSnap.docs.map(doc => ({ 
                id: doc.id, 
                name: doc.data().displayName || doc.data().name || "Sin Nombre", 
                email: doc.data().email || "Sin Email" 
            })));
        };
        fetchOwners();
        return () => unsubscribe();
    }, []);

    const handleDeleteTenant = async () => {
        if (!tenantToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "tenants", tenantToDelete.id));
            setTenantToDelete(null); addToast("Recinto eliminado", "success");
        } catch (error) { addToast("Error al eliminar", "error"); } finally { setIsDeleting(false); }
    };

    const handleOpenEdit = (tenant: Tenant) => {
        setIsEditing(true); setEditingId(tenant.id);
        
        // Mapear dueños actuales a OwnerOption
        const currentOwners = tenant.ownerIds.map((id, index) => ({
            id,
            name: tenant.owners[index] || "Dueño",
            email: tenant.ownerEmails?.[index] || ""
        }));

        setNewTenant({
            name: tenant.name, 
            selectedOwners: currentOwners,
            // Normalizar plan para que coincida con las opciones del select (ej: "free" -> "Free")
            plan: tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1).toLowerCase(),
            region: tenant.region || "Metropolitana", commune: tenant.commune || "",
            address: tenant.address, lat: tenant.coordinates?.lat || 0, lng: tenant.coordinates?.lng || 0,
            imageFile: null, imagePreview: tenant.imageURL || tenant.imageUrl || "",
        });
        setOwnerSearchTerm("");
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false); setIsEditing(false); setEditingId(null);
        setNewTenant(INITIAL_TENANT_STATE); setOwnerSearchTerm(""); setShowOwnerDropdown(false);
    };

    const handleGeocode = async () => {
        if (!newTenant.address || !newTenant.commune) return addToast("Falta dirección o comuna", "error");
        setGeoLoading(true);
        try {
            const queryAddr = `${newTenant.address.replace(/[#]/g, "")}, ${newTenant.commune}, ${newTenant.region}, Chile`;
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (apiKey) {
                const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(queryAddr)}&key=${apiKey}`);
                const data = await res.json();
                if (data.status === "OK") {
                    const { lat, lng } = data.results[0].geometry.location;
                    setNewTenant(p => ({ ...p, lat, lng })); addToast("Ubicación verificada", "success");
                } else addToast("No se encontró la ubicación", "error");
            }
        } catch (e) { addToast("Error de conexión", "error"); } finally { setGeoLoading(false); }
    };

    const handleAddOwner = (owner: OwnerOption) => {
        if (newTenant.selectedOwners.some(o => o.id === owner.id)) return;
        setNewTenant(prev => ({
            ...prev,
            selectedOwners: [...prev.selectedOwners, owner]
        }));
        setOwnerSearchTerm("");
        setShowOwnerDropdown(false);
    };

    const handleRemoveOwner = (ownerId: string) => {
        setNewTenant(prev => ({
            ...prev,
            selectedOwners: prev.selectedOwners.filter(o => o.id !== ownerId)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (newTenant.selectedOwners.length === 0) throw new Error("Debe seleccionar al menos un dueño");
            
            const ownerIds = newTenant.selectedOwners.map(o => o.id);
            const ownerNames = newTenant.selectedOwners.map(o => o.name);
            const ownerEmails = newTenant.selectedOwners.map(o => o.email);

            const price = newTenant.plan === "Elite" ? 150000 : newTenant.plan === "Pro" ? 80000 : 40000;
            const data = {
                name: newTenant.name, 
                ownerIds, ownerNames, ownerEmails, // Multi-dueño
                // Legacy compatibility (primer dueño como principal)
                ownerId: ownerIds[0], ownerName: ownerNames[0], ownerEmail: ownerEmails[0],
                region: newTenant.region, commune: newTenant.commune, address: newTenant.address,
                fullAddress: `${newTenant.address}, ${newTenant.commune}, ${newTenant.region}`,
                coordinates: { lat: newTenant.lat, lng: newTenant.lng },
                imageURL: newTenant.imagePreview || "https://placehold.co/600x400/10b981/ffffff?text=Club+Sport",
                imageUrl: newTenant.imagePreview || "https://placehold.co/600x400/10b981/ffffff?text=Club+Sport",
                plan: newTenant.plan, planPrice: price,
            };
            if (isEditing) { await updateDoc(doc(db, "tenants", editingId!), data); addToast("Actualizado", "success"); }
            else { await addDoc(collection(db, "tenants"), { ...data, status: "Activo", debtStatus: "Al Día", createdAt: serverTimestamp() }); addToast("Creado", "success"); }
            handleCloseModal();
        } catch (e: any) { addToast(e.message, "error"); } finally { setIsSubmitting(false); }
    };

    const toggleStatus = async (id: string, current: string) => {
        const next = current === "Suspendido" ? "Activo" : "Suspendido";
        try { await updateDoc(doc(db, "tenants", id), { status: next }); addToast(`Recinto ${next.toLowerCase()}`, "info"); }
        catch (e) { addToast("Error al cambiar estado", "error"); }
    };

    const filteredTenants = tenants.filter(t => {
        const matches = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.owners.some(on => on.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!matches) return false;
        if (filter === "Todos") return true;
        return t.status === filter.charAt(0) + filter.slice(1).toLowerCase();
    });

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {notification && (
                <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-[14px] shadow-2xl border animate-slideInRight backdrop-blur-md ${
                    notification.type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:text-emerald-400 dark:border-emerald-500/50' : 
                    'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:text-red-400 dark:border-red-500/50'
                }`}>
                    {notification.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
                    <span className="text-[10px] font-black uppercase tracking-wider">{notification.msg}</span>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">Red de Infraestructura</p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Gestión de <span className="text-emerald-500 dark:text-emerald-400">Recintos</span></h1>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="px-6 py-2.5 bg-slate-950 dark:bg-emerald-600 text-white dark:text-slate-950 text-[10px] font-black uppercase rounded-[14px] shadow-xl flex items-center gap-2 active:scale-95 transition-all"><PlusIcon className="w-4 h-4" /> Nuevo Recinto</button>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <TarjetaKpi titulo="RECINTOS" valor={tenants.length.toString()} sub="GLOBAL" icono={<BuildingOffice2Icon />} brillo />
                <TarjetaKpi titulo="CANCHAS" valor={tenants.reduce((a, t) => a + t.infra.courts, 0).toString()} sub="OPERATIVAS" icono={<CheckBadgeIcon />} />
                <TarjetaKpi titulo="STAFF" valor={tenants.reduce((a, t) => a + t.infra.staff, 0).toString()} sub="COLABORADORES" icono={<UserGroupIcon />} />
                <TarjetaKpi titulo="CLIENTES" valor={tenants.filter(t => t.plan !== 'free').length.toString()} sub="SUSCRIPCIONES" icono={<CurrencyDollarIcon />} brillo />
            </div>

            {/* TOOLS */}
            <PanelGlass className="flex flex-col md:flex-row gap-4 justify-between items-center py-3 px-4">
                <div className="relative w-full md:w-80">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input type="text" placeholder="BUSCAR RECINTO..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 rounded-[14px] text-[10px] font-black uppercase outline-none text-black dark:text-white transition-all shadow-sm" />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 p-1 rounded-[14px] border border-slate-100 dark:border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
                    {["Todos", "Suspendidos"].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-[14px] transition-all whitespace-nowrap ${filter === f ? "bg-white dark:bg-emerald-500 text-black shadow-sm" : "text-slate-400 hover:text-black dark:hover:text-white"}`}>{f.toUpperCase()}</button>
                    ))}
                    <BotonAccion icon={<ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />} onClick={fetchInitialData} />
                </div>
            </PanelGlass>

            {/* LISTADO CARDS */}
            <div className="relative min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-pulse">
                        <ArrowPathIcon className="w-8 h-8 text-emerald-500 animate-spin" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sincronizando centros operativos...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredTenants.map((t) => (
                            <div key={t.id} className={`bg-white dark:bg-[#0B0F19] rounded-[14px] border transition-all flex flex-col group overflow-hidden ${t.status === 'Activo' ? 'border-slate-100 dark:border-white/5' : 'border-red-100 opacity-70 shadow-none'}`}>
                                {/* Imagen de Portada con Overlay de Plan */}
                                <div className="h-40 w-full relative overflow-hidden">
                                    <img src={t.imageUrl || "https://placehold.co/600x400/0B0F19/ffffff?text=ADN+Recinto"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={t.name} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    
                                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                                        <span className={`px-2 py-1 rounded-[14px] text-[8px] font-black uppercase border shadow-lg ${t.plan.toLowerCase() === 'elite' ? 'bg-amber-500 text-black border-amber-400' : t.plan.toLowerCase() === 'pro' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-900 text-white border-white/10'}`}>
                                            PLAN {t.plan.toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="absolute top-4 right-4">
                                        <span className={`px-2 py-1 rounded-[14px] text-[8px] font-black uppercase border shadow-lg ${t.status === 'Activo' ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-red-500 text-white border-red-400'}`}>
                                            {t.status}
                                        </span>
                                    </div>

                                    <div className="absolute bottom-4 left-4 right-4">
                                        <h3 className="font-black text-white text-base uppercase leading-tight truncate drop-shadow-md">{t.name}</h3>
                                        <p className="text-[9px] text-slate-300 font-bold uppercase flex items-center gap-1 mt-0.5"><MapPinIcon className="w-3 h-3 text-emerald-400" /> {t.commune}, {t.region}</p>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 space-y-4">
                                    {/* Administración */}
                                    <div className="space-y-2">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Administración</p>
                                        <div className="flex flex-col gap-1.5">
                                            {t.owners.slice(0, 2).map((on, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    <UserIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    <span className="truncate">{on}</span>
                                                </div>
                                            ))}
                                            {t.owners.length > 2 && <p className="text-[8px] font-black text-emerald-500 uppercase ml-5">+{t.owners.length - 2} Dueños adicionales</p>}
                                        </div>
                                    </div>

                                    {/* Infraestructura */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-[14px] border border-slate-100 dark:border-white/10 flex flex-col items-center">
                                            <span className="text-lg font-black text-black dark:text-white leading-none">{t.infra.courts}</span>
                                            <span className="text-[7px] font-black text-slate-400 uppercase mt-1">Canchas</span>
                                        </div>
                                        <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-[14px] border border-slate-100 dark:border-white/10 flex flex-col items-center">
                                            <span className="text-lg font-black text-black dark:text-white leading-none">{t.infra.staff}</span>
                                            <span className="text-[7px] font-black text-slate-400 uppercase mt-1">Staff</span>
                                        </div>
                                        <div className="p-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-[14px] border border-emerald-500/20 flex flex-col items-center">
                                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{t.rating}</span>
                                            <span className="text-[7px] font-black text-emerald-500 uppercase mt-1">Rating</span>
                                        </div>
                                    </div>

                                    {/* Info Adicional */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-white/5">
                                        <div className="flex items-center gap-1.5">
                                            <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[8px] font-black text-slate-500 uppercase">{t.infra.scheduleSummary}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[8px] font-black text-slate-500 uppercase">Geo Status</span>
                                            {t.coordinates?.lat ? <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" /> : <NoSymbolIcon className="w-3.5 h-3.5 text-slate-300" />}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex gap-2">
                                    <button onClick={() => handleOpenEdit(t)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-[14px] border border-slate-200 dark:border-white/10 text-slate-400 hover:text-black dark:hover:text-white transition-all active:scale-90 shadow-sm">
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => toggleStatus(t.id, t.status)} className={`flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-[14px] border transition-all active:scale-90 shadow-sm ${t.status === 'Activo' ? 'border-red-50 text-red-400 hover:bg-red-50' : 'border-emerald-50 text-emerald-500 hover:bg-emerald-50'}`}>
                                        {t.status === 'Activo' ? <NoSymbolIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => setTenantToDelete(t)} className="flex-1 py-2 flex items-center justify-center bg-white dark:bg-white/5 rounded-[14px] border border-red-100 text-red-400 hover:bg-red-50 transition-all active:scale-90 shadow-sm">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL ALTA / EDITAR COMPACTO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={handleCloseModal}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#0B0F19] w-full max-w-5xl rounded-[14px] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                            <h3 className="text-sm font-black uppercase text-black dark:text-white flex items-center gap-3"><div className="p-2 bg-emerald-500 rounded-[14px] shadow-lg shadow-emerald-500/20"><BuildingOffice2Icon className="w-5 h-5 text-white" /></div>{isEditing ? 'Sincronizar Recinto' : 'Alta de Recinto'}</h3>
                            <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* COLUMNA 1: IDENTIDAD */}
                                <div className="space-y-4">
                                    <InputGroupPremium label="Nombre del Club" value={newTenant.name} onChange={(e: any) => setNewTenant({ ...newTenant, name: e.target.value })} icon={<BuildingOffice2Icon className="w-4 h-4" />} />
                                    
                                    <div className="flex flex-col gap-1 relative">
                                        <label className="text-[8px] font-black uppercase text-black">Buscar & Agregar Dueños</label>
                                        <div className="relative">
                                            <input type="text" placeholder="BUSCAR POR NOMBRE O EMAIL..." value={ownerSearchTerm} onChange={(e) => { setOwnerSearchTerm(e.target.value); setShowOwnerDropdown(true); }} onFocus={() => setShowOwnerDropdown(true)} className="w-full pl-9 pr-3 py-2 rounded-[14px] border border-slate-100 dark:border-white/5 text-[10px] font-bold bg-white dark:bg-[#0B0F19] text-black dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm uppercase" />
                                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        </div>
                                        {showOwnerDropdown && ownerSearchTerm && (
                                            <div className="absolute z-50 w-full mt-12 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-[14px] shadow-2xl max-h-48 overflow-y-auto no-scrollbar">
                                                {ownersList.filter(o => o.name.toLowerCase().includes(ownerSearchTerm.toLowerCase()) || o.email.toLowerCase().includes(ownerSearchTerm.toLowerCase())).map(o => (
                                                    <div key={o.id} onClick={() => handleAddOwner(o)} className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer border-b border-slate-100 dark:border-white/5 last:border-0 flex justify-between items-center group">
                                                        <div>
                                                            <p className="text-[10px] font-black text-black dark:text-white uppercase">{o.name}</p>
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase">{o.email}</p>
                                                        </div>
                                                        <PlusIcon className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Lista de Dueños Seleccionados */}
                                        <div className="mt-3 flex flex-col gap-2">
                                            <label className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Dueños Asignados ({newTenant.selectedOwners.length})</label>
                                            <div className="flex flex-wrap gap-2">
                                                {newTenant.selectedOwners.map(o => (
                                                    <div key={o.id} className="flex items-center gap-2 px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-[14px] group animate-fadeIn">
                                                        <UserIcon className="w-3 h-3 text-emerald-500" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black text-black dark:text-white uppercase truncate max-w-[100px]">{o.name}</span>
                                                            <span className="text-[6px] font-bold text-slate-400 uppercase truncate max-w-[100px]">{o.email}</span>
                                                        </div>
                                                        <button type="button" onClick={() => handleRemoveOwner(o.id)} className="p-1 hover:bg-red-50 text-red-400 rounded-[14px] transition-all"><XMarkIcon className="w-3 h-3" /></button>
                                                    </div>
                                                ))}
                                                {newTenant.selectedOwners.length === 0 && (
                                                    <div className="w-full py-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[14px] flex items-center justify-center">
                                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Sin dueños asignados</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <InputGroupPremium label="Plan Activo" type="select" value={newTenant.plan} onChange={(e: any) => setNewTenant({ ...newTenant, plan: e.target.value })} icon={<Squares2X2Icon className="w-4 h-4" />}>
                                        <option value="Básico">PLAN BÁSICO</option>
                                        <option value="Pro">PLAN PRO</option>
                                        <option value="Elite">PLAN ELITE</option>
                                        <option value="Free">PLAN FREE</option>
                                    </InputGroupPremium>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[8px] font-black uppercase text-black">Imagen de Portada</label>
                                        <div className="border-2 border-dashed border-slate-100 dark:border-white/10 rounded-[14px] h-32 flex flex-col items-center justify-center relative bg-slate-50 dark:bg-white/5 overflow-hidden group hover:border-emerald-500 transition-all cursor-pointer">
                                            {newTenant.imagePreview ? <img src={newTenant.imagePreview} className="w-full h-full object-cover" /> : <div className="text-center p-4"><PhotoIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" /><p className="text-[8px] font-black text-slate-400 uppercase">SUBIR FOTO</p></div>}
                                            <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) { const r = new FileReader(); r.onload = () => setNewTenant({ ...newTenant, imagePreview: r.result as string }); r.readAsDataURL(e.target.files[0]); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>

                                {/* COLUMNA 2: UBICACIÓN */}
                                <div className="space-y-4">
                                    <InputGroupPremium label="Región Administrativa" type="select" value={newTenant.region} onChange={(e: any) => setNewTenant({ ...newTenant, region: e.target.value })} icon={<GlobeAmericasIcon className="w-4 h-4" />}>
                                        {REGIONES_CHILE.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                                    </InputGroupPremium>
                                    <InputGroupPremium label="Comuna" value={newTenant.commune} onChange={(e: any) => setNewTenant({ ...newTenant, commune: e.target.value })} icon={<MapPinIcon className="w-4 h-4" />} />
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1"><InputGroupPremium label="Dirección Exacta" value={newTenant.address} onChange={(e: any) => setNewTenant({ ...newTenant, address: e.target.value })} icon={<IdentificationIcon className="w-4 h-4" />} /></div>
                                        <button type="button" onClick={handleGeocode} className="p-2.5 bg-slate-900 text-white rounded-[14px] shadow-lg active:scale-90 transition-all mb-0.5"><MapPinIcon className={`w-4 h-4 ${geoLoading ? 'animate-bounce' : ''}`} /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-white/5 p-4 rounded-[14px] border border-slate-100 dark:border-white/10">
                                        <InputGroupPremium label="Latitud" type="number" value={newTenant.lat} onChange={(e: any) => setNewTenant({ ...newTenant, lat: parseFloat(e.target.value) })} />
                                        <InputGroupPremium label="Longitud" type="number" value={newTenant.lng} onChange={(e: any) => setNewTenant({ ...newTenant, lng: parseFloat(e.target.value) })} />
                                    </div>
                                </div>

                                {/* COLUMNA 3: NOTIFICACIONES & INFO */}
                                <div className="space-y-4">
                                    <div className="p-6 bg-emerald-50/30 dark:bg-emerald-500/5 rounded-[14px] border border-emerald-100 dark:border-emerald-500/10 flex flex-col items-center justify-center text-center gap-3">
                                        <ShieldCheckIcon className="w-10 h-10 text-emerald-500 opacity-20" />
                                        <p className="text-[10px] font-black uppercase text-emerald-700 tracking-tighter leading-relaxed">Este recinto será habilitado inmediatamente en la red de búsqueda global de la App.</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-2">La configuración de pagos y facturación se gestiona directamente desde el perfil del dueño.</p>
                                    </div>
                                    
                                    <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-[14px] border border-slate-100 dark:border-white/10 flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <InformationCircleIcon className="w-4 h-4 text-indigo-500" />
                                            <span className="text-[9px] font-black uppercase text-black dark:text-white">Estado de Operación</span>
                                        </div>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase leading-relaxed">Asegúrese de que los dueños asignados tengan sus credenciales de Transbank actualizadas en su perfil para procesar pagos en línea.</p>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmitting || newTenant.selectedOwners.length === 0} className="w-full py-4 bg-black dark:bg-emerald-600 text-white dark:text-black rounded-[14px] text-[10px] font-black uppercase tracking-[0.3em] shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2">
                                {isSubmitting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ShieldCheckIcon className="w-4 h-4" />}
                                {isEditing ? 'ACTUALIZAR CENTRO OPERATIVO' : 'LANZAR NUEVO RECINTO'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR ESTANDARIZADO */}
            {tenantToDelete && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setTenantToDelete(null)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-[14px] p-6 border border-slate-200 dark:border-white/10 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-500/20"><ExclamationTriangleIcon className="w-8 h-8 text-red-600" /></div>
                        <h3 className="text-lg font-black uppercase text-black dark:text-white mb-2 tracking-tighter">¿Eliminar Recinto?</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 leading-relaxed">Estás por borrar <strong>{tenantToDelete.name}</strong>. Se perderán canchas y staff asociados.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setTenantToDelete(null)} className="flex-1 py-3 text-[10px] font-black uppercase rounded-[14px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">CANCELAR</button>
                            <button onClick={handleDeleteTenant} className="flex-1 py-3 text-[10px] font-black uppercase rounded-[14px] text-white bg-red-600 shadow-xl shadow-red-600/20">ELIMINAR</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InputGroupPremium({ label, value, onChange, placeholder, icon, readOnly, type = "text", children }: any) {
    return (
        <div className="flex flex-col gap-1 group w-full">
            <label className="text-[8px] font-black uppercase tracking-[0.1em] text-black transition-colors pl-0.5">{label}</label>
            <div className="relative">
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20 group-focus-within:text-emerald-500 transition-colors">{icon}</div>}
                {type === 'select' ? (
                    <select value={value || ''} onChange={onChange} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-8 py-2 bg-white dark:bg-[#0B0F19] border border-slate-100 dark:border-white/5 rounded-[14px] text-[10px] font-bold text-black dark:text-white focus:border-emerald-500 outline-none transition-all appearance-none uppercase cursor-pointer shadow-sm`}>{children}</select>
                ) : (
                    <input type={type} value={value || ''} onChange={onChange} readOnly={readOnly} placeholder={placeholder} className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-3 py-2 rounded-[14px] border text-[10px] font-bold transition-all outline-none shadow-sm ${readOnly ? 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-white/5 dark:border-white/5' : 'bg-white border-slate-100 text-black focus:border-emerald-500 dark:bg-[#0B0F19] dark:border-white/5 dark:text-white'}`} />
                )}
                {type === 'select' && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300"><ChevronDownIcon className="w-3 h-3" /></div>}
            </div>
        </div>
    );
}
