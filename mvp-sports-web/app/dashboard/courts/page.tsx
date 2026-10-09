"use client";
import { getOwnedTenantsSnap } from "@/services/ownedTenants";
import { uploadImage } from "@/services/imageUpload";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, getDocs, getDoc, query, where, orderBy, limit, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, onSnapshot, Timestamp, writeBatch, setDoc, or } from 'firebase/firestore';
import { auditService } from '@/services/auditService';
import {
    Add01Icon,
    Alert02Icon,
    ArrowDown01Icon,
    ArrowLeft01Icon,
    BarChartIcon,
    BoltIcon,
    Building01Icon,
    Calendar01Icon,
    Camera01Icon,
    Cancel01Icon,
    CheckmarkCircle02Icon,
    Clock01Icon,
    FilterIcon,
    Grid02Icon,
    Image01Icon,
    MapPinIcon,
    MoneyBag01Icon,
    PencilEdit02Icon,
    PuzzleIcon,
    RefreshIcon,
    Settings01Icon,
    SignalIcon,
    TrashIcon,
    TrophyIcon,
    UserGroupIcon,
    Wrench01Icon,
    FootballIcon,
    FootballPitchIcon,
    Store01Icon,
    ChartIncreaseIcon,
    Search01Icon,
    Copy01Icon,
    MagicWand01Icon,
    Layers01Icon,
    UmbrellaIcon,
    LightbulbIcon,
    BrickWallIcon,
    CircleDotIcon,
    Leaf01Icon,
    Sun01Icon,
    Video01Icon,
    Diamond01Icon,
} from '@hugeicons/core-free-icons';
import VenueCard from '@/components/courts/VenueCard';
import CourtModal from '@/components/courts/CourtModal';
import MaintenanceModal from '@/components/courts/MaintenanceModal';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';
import { SoccerIcon, PadelIcon, TennisIcon, BasketballIcon, VolleyballIcon } from '@/components/icons/SportsIcons';

// --- CONSTANTES ---
const AVAILABLE_SPORTS = ['Fútbol', 'Futbolito', 'Pádel', 'Tenis', 'Básquetbol', 'Vóleibol'];

const DAYS_MAP: { [key: string]: string } = {
    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
    friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
};

const DEFAULT_DAY_SCHEDULE = { isOpen: true, open: '09:00', close: '23:00' };

const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
    monday: { ...DEFAULT_DAY_SCHEDULE },
    tuesday: { ...DEFAULT_DAY_SCHEDULE },
    wednesday: { ...DEFAULT_DAY_SCHEDULE },
    thursday: { ...DEFAULT_DAY_SCHEDULE },
    friday: { ...DEFAULT_DAY_SCHEDULE },
    saturday: { ...DEFAULT_DAY_SCHEDULE, close: '02:00' },
    sunday: { ...DEFAULT_DAY_SCHEDULE, close: '20:00' }
};

// --- INTERFACES ---
interface PricingMap { [hour: string]: number; }
interface DayTypePricing { weekday: PricingMap; weekend: PricingMap; }
interface SportPricing { [sport: string]: DayTypePricing; }
interface DaySchedule { isOpen: boolean; open: string; close: string; }
interface WeeklySchedule { [key: string]: DaySchedule; }

interface Venue {
    id: string;
    name: string;
    address: string;
    imageURL?: string;
    activeSports: string[];
    amenities: string[];
    schedule: WeeklySchedule;
    pricing: SportPricing;
    realCourtCount?: number;
    features?: any;
    gallery?: string[];
    openingHours?: string;
}

interface Court {
    id: string;
    name: string;
    sport: string;
    surface: string;
    features: string[];
    tenantId: string;
    status?: string;
    maintenanceUntil?: any;
    maintenanceStart?: any;
}

function PanelHeader({ titulo, desc, icon: Icon, action }: any) {
    let content: React.ReactNode;
    if (React.isValidElement(Icon)) {
        content = Icon;
    } else if (Array.isArray(Icon)) {
        content = <HugeiconsIcon icon={Icon} className="w-4 h-4" strokeWidth={1.8} />;
    } else {
        content = <Icon className="w-4 h-4" />;
    }
    return (
        <div className="flex items-center justify-between gap-4 px-6 lg:px-7 py-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3 min-w-0">
                <span className="text-emerald-600 dark:text-[#00df82] shrink-0">{content}</span>
                <div className="min-w-0">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white truncate font-heading">{titulo}</h3>
                    <p className="text-[10px] font-bold text-slate-400 truncate">{desc}</p>
                </div>
            </div>
            {action}
        </div>
    );
}

function StatMini({ label, value }: { label: string; value: number }) {
    return (
        <div className="p-3 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">{value}</p>
        </div>
    );
}

function HeaderSeccion({ titulo, desc, icon: Icon }: any) {
    let content: React.ReactNode;
    if (React.isValidElement(Icon)) {
        content = Icon;
    } else if (Array.isArray(Icon)) {
        content = <HugeiconsIcon icon={Icon} className="w-5 h-5" strokeWidth={1.8} />;
    } else {
        content = <Icon className="w-5 h-5" />;
    }
    return (
        <div className="flex items-center gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0">
                {content}
            </div>
            <div className="space-y-1">
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white leading-tight">{titulo}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{desc}</p>
            </div>
        </div>
    );
}

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onCancel}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-md shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                <div className={`absolute top-0 left-0 w-full h-1 ${isDestructive ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-none">{title}</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-8 uppercase leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-all">Cancelar</button>
                    <button onClick={onConfirm} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-md text-white shadow-lg transition-all active:scale-95 ${isDestructive ? 'bg-red-600 shadow-red-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>Confirmar</button>
                </div>
            </div>
        </div>
    );
};

export default function CourtsPage() {
    const { user, role, firestoreUser } = useAuth();

    // ESTADOS
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [courts, setCourts] = useState<Court[]>([]);
    const [activeTab, setActiveTab] = useState<'config' | 'courts'>('config');
    const [dirty, setDirty] = useState(false);
    const markDirty = () => setDirty(true);
    const [confirmData, setConfirmData] = useState<{ isOpen: boolean, title: string, message: string, action: () => void, isDestructive: boolean }>({ 
        isOpen: false, title: '', message: '', action: () => { }, isDestructive: false 
    });

    // CONFIGURACIÓN
    const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
    const [selectedSports, setSelectedSports] = useState<string[]>([]);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [pricingMatrix, setPricingMatrix] = useState<SportPricing>({});
    const [activePricingTab, setActivePricingTab] = useState<string>('');
    const [activeDayTypeTab, setActiveDayTypeTab] = useState<'weekday' | 'weekend'>('weekday');
    const [opTab, setOpTab] = useState<'horario' | 'tarifas'>('horario');
    const [venueImageLoading, setVenueImageLoading] = useState(false);

    // HELPER PARA NORMALIZAR DEPORTES (TILDES Y MAYUSCULAS)
    const normalizeSport = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
    const isSportSelected = (sport: string) => selectedSports.some(s => normalizeSport(s) === normalizeSport(sport));

    // FILTRO Y MODAL
    const [filterSport, setFilterSport] = useState<string>('Todos');
    const [searchCourt, setSearchCourt] = useState<string>('');
    const [isCourtModalOpen, setIsCourtModalOpen] = useState(false);
    const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
    const [courtForm, setCourtForm] = useState({ name: '', sport: '', surface: '', features: [] as string[] });

    // REF IMAGEN
    const fileInputRef = useRef<HTMLInputElement>(null);

    // MAINTENANCE MODAL
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [maintenanceCourt, setMaintenanceCourt] = useState<Court | null>(null);
    const [maintenanceForm, setMaintenanceForm] = useState({
        type: 'hours' as 'hours' | 'days',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        endDate: new Date().toISOString().split('T')[0]
    });
    const [maintenanceConflicts, setMaintenanceConflicts] = useState<any[]>([]);

    // TOASTS
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Comprime y sube a Storage; devuelve la URL (antes: base64 dentro de Firestore)
    const compressImage = (file: File): Promise<string> => uploadImage(file, { folder: "courts", maxSize: 1200, quality: 0.75 });

    const fetchVenues = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            let snapTenantsDocs: any[] = [];
            if (role === 'manager' || role === 'staff') {
                const tenantIds = firestoreUser?.tenantIds || (firestoreUser?.tenantId ? [firestoreUser.tenantId] : []);
                if (tenantIds.length > 0) {
                    const chunkArray = (arr: any[], size: number) =>
                        Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
                    const promises = chunkArray(tenantIds, 10).map(async (chunk) => {
                        const q = query(collection(db, "tenants"), where("__name__", "in", chunk));
                        const snap = await getDocs(q);
                        return snap.docs;
                    });
                    const results = await Promise.all(promises);
                    snapTenantsDocs = results.flat();
                }
            } else {
                const snapTenants = await getOwnedTenantsSnap(user.uid);
                snapTenantsDocs = snapTenants.docs;
            }
            const venuesList: Venue[] = [];
            await Promise.all(snapTenantsDocs.map(async (docTenant) => {
                const venueData = docTenant.data() as Omit<Venue, 'id'>;
                const qCourts = query(collection(db, "courts"), where("tenantId", "==", docTenant.id));
                const snapCourts = await getDocs(qCourts);
                venuesList.push({ id: docTenant.id, ...venueData, realCourtCount: snapCourts.size });
            }));
            setVenues(venuesList);
            if (venuesList.length > 0) {
                const firstVenue = venuesList[0];
                const hasMultiRecinto = firstVenue.features?.multiRecinto;
                if (hasMultiRecinto === false) {
                    setSelectedVenue(firstVenue);
                }
            }
        } catch (error) {
            showToast("Error al cargar recintos", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVenues();
    }, [user, role, firestoreUser]);

    useEffect(() => {
        if (selectedVenue) {
            const fetchCourts = async () => {
                try {
                    const q = query(collection(db, "courts"), where("tenantId", "==", selectedVenue.id));
                    const snap = await getDocs(q);
                    const courtsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Court));
                    setCourts(courtsList);
                } catch (error) { console.error(error); }
            };
            fetchCourts();
            let loadedSchedule = { ...DEFAULT_WEEKLY_SCHEDULE };
            if (selectedVenue.schedule && Object.keys(selectedVenue.schedule).length > 0) {
                Object.keys(DEFAULT_WEEKLY_SCHEDULE).forEach(day => {
                    if (selectedVenue.schedule[day]) loadedSchedule[day] = selectedVenue.schedule[day];
                });
            }
            setWeeklySchedule(loadedSchedule);
            setSelectedSports(selectedVenue.activeSports || []);
            setSelectedAmenities(selectedVenue.amenities || []);
            
            // Migración/Carga de precios avanzada
            const loadedPricing = selectedVenue.pricing || {};
            const normalizedPricing: SportPricing = {};
            Object.keys(loadedPricing).forEach(sport => {
                const sportData = loadedPricing[sport] as any;
                if (sportData.weekday || sportData.weekend) {
                    normalizedPricing[sport] = sportData;
                } else {
                    normalizedPricing[sport] = { weekday: { ...sportData }, weekend: { ...sportData } };
                }
            });
            setPricingMatrix(normalizedPricing);

            if (selectedVenue.activeSports?.length > 0) setActivePricingTab(selectedVenue.activeSports[0]);
            if (selectedVenue.schedule && selectedVenue.activeSports?.length > 0) setActiveTab('courts');
            else setActiveTab('config');
        }
    }, [selectedVenue]);

    const handleVenueImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && selectedVenue) {
            setVenueImageLoading(true);
            try {
                const compressedBase64 = await compressImage(e.target.files[0]);
                await updateDoc(doc(db, "tenants", selectedVenue.id), { imageURL: compressedBase64 });
                setSelectedVenue({ ...selectedVenue, imageURL: compressedBase64 });
                setVenues(prev => prev.map(v => v.id === selectedVenue.id ? { ...v, imageURL: compressedBase64 } : v));
                showToast("Portada actualizada", 'success');
                
                await auditService.logAuditEvent({
                    action: 'RECINTO_IMAGEN',
                    module: 'Infraestructura/Canchas',
                    details: `Actualización de imagen de portada para el recinto ${selectedVenue.name} (${selectedVenue.id}).`,
                    severity: 'LOW',
                    status: 'SUCCESS'
                });
            } catch (error: any) { 
                showToast("Error al procesar", 'error'); 
                await auditService.logAuditEvent({
                    action: 'RECINTO_IMAGEN',
                    module: 'Infraestructura/Canchas',
                    details: `Falla al actualizar imagen de portada para el recinto ${selectedVenue.name} (${selectedVenue.id}). Error: ${error.message || error}`,
                    severity: 'LOW',
                    status: 'FAILED'
                });
            } finally { setVenueImageLoading(false); }
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && selectedVenue) {
            const currentGallery = selectedVenue.gallery || [];
            if (currentGallery.length >= 6) {
                showToast("Máximo 6 fotos permitidas", 'error');
                return;
            }
            try {
                const base64 = await compressImage(e.target.files[0]);
                const newGallery = [...currentGallery, base64];
                await updateDoc(doc(db, "tenants", selectedVenue.id), { gallery: newGallery });
                setSelectedVenue({ ...selectedVenue, gallery: newGallery });
                setVenues(prev => prev.map(v => v.id === selectedVenue.id ? { ...v, gallery: newGallery } : v));
                showToast("Foto añadida a galería", 'success');
            } catch (error) {
                showToast("Error al subir foto", 'error');
            }
        }
    };

    const handleRemoveGalleryImage = async (index: number) => {
        if (!selectedVenue) return;
        const currentGallery = selectedVenue.gallery || [];
        const newGallery = currentGallery.filter((_, i) => i !== index);
        try {
            await updateDoc(doc(db, "tenants", selectedVenue.id), { gallery: newGallery });
            setSelectedVenue({ ...selectedVenue, gallery: newGallery });
            setVenues(prev => prev.map(v => v.id === selectedVenue.id ? { ...v, gallery: newGallery } : v));
            showToast("Foto eliminada", 'success');
        } catch (error) {
            showToast("Error al eliminar foto", 'error');
        }
    };

    const getGlobalTimeSlots = () => {
        let minOpen = 24; let maxClose = 0;
        Object.values(weeklySchedule).forEach(day => {
            if (!day.isOpen) return;
            const openH = parseInt(day.open.split(':')[0]);
            let closeH = parseInt(day.close.split(':')[0]);
            if (closeH < openH) closeH += 24;
            if (closeH === 0 && day.close !== '00:00') closeH = 24;
            if (openH < minOpen) minOpen = openH;
            if (closeH > maxClose) maxClose = closeH;
        });
        if (minOpen === 24) return [];
        const uniqueSlots = new Set<string>();
        for (let i = minOpen; i < maxClose; i++) {
            const hour = i % 24;
            uniqueSlots.add(`${hour.toString().padStart(2, '0')}:00`);
        }
        return Array.from(uniqueSlots);
    };
    const timeSlots = getGlobalTimeSlots();

    const updateDaySchedule = (day: string, field: keyof DaySchedule, value: any) => {
        setWeeklySchedule(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
        markDirty();
    };
    const toggleSport = (sport: string) => {
        if (isSportSelected(sport)) {
            setSelectedSports(prev => prev.filter(s => normalizeSport(s) !== normalizeSport(sport)));
            if (normalizeSport(activePricingTab) === normalizeSport(sport)) setActivePricingTab('');
        } else {
            setSelectedSports(prev => [...prev, sport]);
            if (!activePricingTab) setActivePricingTab(sport);
        }
        markDirty();
    };
    const updatePrice = (sport: string, dayType: 'weekday' | 'weekend', time: string, price: number) => {
        setPricingMatrix(prev => {
            const currentSportData = prev[sport] || { weekday: {}, weekend: {} };
            return {
                ...prev,
                [sport]: {
                    ...currentSportData,
                    [dayType]: {
                        ...currentSportData[dayType],
                        [time]: price
                    }
                }
            };
        });
        markDirty();
    };
    const handleCopyPriceDown = (sport: string, dayType: 'weekday' | 'weekend', startIndex: number) => {
        const slotsToFill = timeSlots.slice(startIndex);
        const basePrice = pricingMatrix[sport]?.[dayType]?.[timeSlots[startIndex]] || 0;
        setPricingMatrix(prev => {
            const currentSportData = prev[sport] || { weekday: {}, weekend: {} };
            const newDayPricing = { ...currentSportData[dayType] };
            slotsToFill.forEach(time => { newDayPricing[time] = basePrice; });
            return {
                ...prev,
                [sport]: {
                    ...currentSportData,
                    [dayType]: newDayPricing
                }
            };
        });
        showToast("Tarifa replicada", 'success');
    };
    const getReferencePrice = (sport: string, dayType: 'weekday' | 'weekend') => {
        const dayPricing = pricingMatrix[sport]?.[dayType] || {};
        const first = timeSlots.find(t => (dayPricing[t] ?? 0) > 0);
        if (first !== undefined) return dayPricing[first];
        const anyPricing = pricingMatrix[sport] || {};
        const all = { ...(anyPricing.weekday || {}), ...(anyPricing.weekend || {}) };
        const any = timeSlots.find(t => (all[t] ?? 0) > 0);
        return any !== undefined ? all[any] : 0;
    };
    const handleFillMissingPrices = (sport: string, dayType: 'weekday' | 'weekend') => {
        const ref = getReferencePrice(sport, dayType);
        if (!ref) { showToast("Define al menos un precio primero", 'error'); return; }
        setPricingMatrix(prev => {
            const currentSportData = prev[sport] || { weekday: {}, weekend: {} };
            const newDayPricing = { ...currentSportData[dayType] };
            timeSlots.forEach(time => { if (!(newDayPricing[time] > 0)) newDayPricing[time] = ref; });
            return { ...prev, [sport]: { ...currentSportData, [dayType]: newDayPricing } };
        });
        markDirty();
        showToast("Tramos faltantes completados", 'success');
    };
    const handleApplyAllPrices = (sport: string, dayType: 'weekday' | 'weekend') => {
        const ref = getReferencePrice(sport, dayType);
        if (!ref) { showToast("Define al menos un precio primero", 'error'); return; }
        setPricingMatrix(prev => {
            const currentSportData = prev[sport] || { weekday: {}, weekend: {} };
            const newDayPricing = { ...currentSportData[dayType] };
            timeSlots.forEach(time => { newDayPricing[time] = ref; });
            return { ...prev, [sport]: { ...currentSportData, [dayType]: newDayPricing } };
        });
        markDirty();
        showToast("Precio aplicado a todos los tramos", 'success');
    };
    const handleCopyMondayToAll = () => {
        setWeeklySchedule(prev => {
            const monday = prev.monday || DEFAULT_DAY_SCHEDULE;
            const next: WeeklySchedule = {};
            Object.keys(prev).forEach(day => { next[day] = { ...monday }; });
            return next;
        });
        markDirty();
        showToast("Horario del Lunes copiado a todos los días", 'success');
    };
    const handleSaveConfig = async () => {
        if (!selectedVenue) return;
        try {
            let minOpenStr = '08:00';
            let maxCloseStr = '23:00';
            
            const openDays = Object.values(weeklySchedule).filter(day => day.isOpen);
            if (openDays.length > 0) {
                const sortedOpens = [...openDays].sort((a, b) => a.open.localeCompare(b.open));
                minOpenStr = sortedOpens[0].open;
                
                const sortedCloses = [...openDays].sort((a, b) => {
                    const parseToMinutes = (timeStr: string) => {
                        const [h, m] = timeStr.split(':').map(Number);
                        return h < 6 ? (h + 24) * 60 + m : h * 60 + m;
                    };
                    return parseToMinutes(b.close) - parseToMinutes(a.close);
                });
                maxCloseStr = sortedCloses[0].close;
            }

            const updateData = { 
                schedule: weeklySchedule, 
                activeSports: selectedSports, 
                amenities: selectedAmenities, 
                pricing: pricingMatrix,
                openTime: minOpenStr,
                closeTime: maxCloseStr,
                openingHours: `${minOpenStr} - ${maxCloseStr}`
            };
            await updateDoc(doc(db, "tenants", selectedVenue.id), updateData);
            setSelectedVenue({ ...selectedVenue, ...updateData });
            setVenues(prev => prev.map(v => v.id === selectedVenue.id ? { ...v, ...updateData } : v));
            setDirty(false);
            showToast("Infraestructura sincronizada", 'success');

            await auditService.logAuditEvent({
                action: 'RECINTO_EDITAR',
                module: 'Infraestructura/Canchas',
                details: `Modificación de la configuración del recinto ${selectedVenue.name} (${selectedVenue.id}) incluyendo matriz horaria y tarifas de deportes: ${selectedSports.join(', ')}.`,
                severity: 'LOW',
                status: 'SUCCESS'
            });
        } catch (error: any) { 
            showToast("Error al sincronizar", 'error'); 
            await auditService.logAuditEvent({
                action: 'RECINTO_EDITAR',
                module: 'Infraestructura/Canchas',
                details: `Falla al sincronizar configuración del recinto ${selectedVenue.name} (${selectedVenue.id}). Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
        }
    };

    const handleOpenCreate = () => { setEditingCourtId(null); setCourtForm({ name: '', sport: '', surface: '', features: [] }); setIsCourtModalOpen(true); };
    const handleOpenEdit = (c: Court) => { setEditingCourtId(c.id); setCourtForm({ name: c.name, sport: c.sport, surface: c.surface, features: c.features || [] }); setIsCourtModalOpen(true); };
    const toggleNewCourtFeature = (f: string) => {
        if (courtForm.features.includes(f)) setCourtForm(prev => ({ ...prev, features: prev.features.filter(x => x !== f) }));
        else setCourtForm(prev => ({ ...prev, features: [...prev.features, f] }));
    };
    const handleSaveCourt = async () => {
        if (!selectedVenue || !courtForm.name || !courtForm.sport || !courtForm.surface) return showToast("Faltan parámetros", 'error');
        try {
            const courtData = { tenantId: selectedVenue.id, ...courtForm, status: 'active' };
            if (editingCourtId) {
                await updateDoc(doc(db, "courts", editingCourtId), courtData);
                setCourts(prev => prev.map(c => c.id === editingCourtId ? { ...c, ...courtData } : c));
                showToast("Cancha actualizada", 'success');

                await auditService.logAuditEvent({
                    action: 'CANCHA_EDITAR',
                    module: 'Infraestructura/Canchas',
                    details: `Modificación de la cancha ${courtForm.name} (${editingCourtId}) del recinto ${selectedVenue.name}. Deporte: ${courtForm.sport}, Superficie: ${courtForm.surface}.`,
                    severity: 'LOW',
                    status: 'SUCCESS'
                });
            } else {
                const res = await addDoc(collection(db, "courts"), { ...courtData, createdAt: new Date() });
                setCourts(prev => [...prev, { id: res.id, ...courtData } as Court]);
                setVenues(prev => prev.map(v => v.id === selectedVenue.id ? { ...v, realCourtCount: (v.realCourtCount || 0) + 1 } : v));
                showToast("Cancha integrada", 'success');

                await auditService.logAuditEvent({
                    action: 'CANCHA_CREAR',
                    module: 'Infraestructura/Canchas',
                    details: `Creación de la cancha ${courtForm.name} (${res.id}) en el recinto ${selectedVenue.name}. Deporte: ${courtForm.sport}, Superficie: ${courtForm.surface}.`,
                    severity: 'LOW',
                    status: 'SUCCESS'
                });
            }
            setIsCourtModalOpen(false);
        } catch (error: any) { 
            showToast("Error al integrar", 'error'); 
            const isEdit = !!editingCourtId;
            await auditService.logAuditEvent({
                action: isEdit ? 'CANCHA_EDITAR' : 'CANCHA_CREAR',
                module: 'Infraestructura/Canchas',
                details: `Falla al ${isEdit ? 'editar' : 'crear'} cancha ${courtForm.name} en el recinto ${selectedVenue.name}. Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
        }
    };
    const handleDeleteCourt = async (courtId: string) => {
        const courtToDelete = courts.find(c => c.id === courtId);
        // No dejar reservas huérfanas: bloquear si hay reservas vigentes desde hoy
        try {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            // Solo filtro por cancha (no requiere índice compuesto); la fecha se filtra aquí
            const snap = await getDocs(query(collection(db, "bookings"), where("courtId", "==", courtId)));
            const active = snap.docs.filter(d => {
                const b = d.data();
                const when = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                return b.status !== 'cancelled' && when >= today;
            }).length;
            if (active > 0) {
                showToast(`No se puede eliminar: tiene ${active} reserva(s) vigente(s). Ponla en mantenimiento o reubica esas reservas primero.`, 'error');
                return;
            }
        } catch (e) {
            console.error("Error verificando reservas de la cancha:", e);
            showToast("No se pudo verificar si la cancha tiene reservas. Intenta nuevamente.", 'error');
            return;
        }
        setConfirmData({
            isOpen: true,
            title: "Eliminar Activo",
            message: "¿Seguro que deseas eliminar esta cancha permanentemente? Esta acción es irreversible.",
            isDestructive: true,
            action: async () => {
                try {
                    await deleteDoc(doc(db, "courts", courtId));
                    setCourts(courts.filter(c => c.id !== courtId));
                    setVenues(prev => prev.map(v => v.id === selectedVenue?.id ? { ...v, realCourtCount: Math.max(0, (v.realCourtCount || 0) - 1) } : v));
                    showToast("Cancha eliminada", 'success');

                    await auditService.logAuditEvent({
                        action: 'CANCHA_ELIMINAR',
                        module: 'Infraestructura/Canchas',
                        details: `Cancha ${courtToDelete?.name || ''} (${courtId}) eliminada del recinto ${selectedVenue?.name}.`,
                        severity: 'MEDIUM',
                        status: 'SUCCESS'
                    });
                } catch (e: any) { 
                    showToast("Error al eliminar", 'error'); 
                    await auditService.logAuditEvent({
                        action: 'CANCHA_ELIMINAR',
                        module: 'Infraestructura/Canchas',
                        details: `Falla al eliminar cancha ${courtToDelete?.name || ''} (${courtId}). Error: ${e.message || e}`,
                        severity: 'MEDIUM',
                        status: 'FAILED'
                    });
                }
                setConfirmData(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleOpenMaintenance = (court: Court) => { setMaintenanceCourt(court); setMaintenanceConflicts([]); setIsMaintenanceModalOpen(true); };
    const checkMaintenanceConflicts = async () => {
        if (!maintenanceCourt || !selectedVenue) return;
        let start = maintenanceForm.type === 'hours' ? new Date(`${maintenanceForm.date}T${maintenanceForm.startTime}`) : new Date(`${maintenanceForm.date}T00:00:00`);
        let end = maintenanceForm.type === 'hours' ? new Date(`${maintenanceForm.date}T${maintenanceForm.endTime}`) : new Date(`${maintenanceForm.endDate}T23:59:59`);
        try {
            const q = query(collection(db, "bookings"), where("tenantId", "==", selectedVenue.id), where("courtId", "==", maintenanceCourt.id), where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)));
            const snap = await getDocs(q);
            const active = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((d: any) => d.status !== 'cancelled');
            setMaintenanceConflicts(active);
            showToast(active.length > 0 ? `Se detectaron ${active.length} reservas.` : "Estado limpio", active.length > 0 ? 'info' : 'success');
        } catch (e) { console.error(e); }
    };
    const handleConfirmMaintenance = async () => {
        if (!maintenanceCourt) return;
        
        if (maintenanceConflicts.length > 0) {
            setConfirmData({
                isOpen: true,
                title: "Conflicto de Reservas",
                message: `Hay ${maintenanceConflicts.length} reservas activas en este periodo. ¿Confirmas el inicio de mantenimiento de todas formas?`,
                isDestructive: true,
                action: async () => {
                    await executeMaintenanceUpdate();
                    setConfirmData(prev => ({ ...prev, isOpen: false }));
                }
            });
            return;
        }
        await executeMaintenanceUpdate();
    };

    const executeMaintenanceUpdate = async () => {
        if (!maintenanceCourt) return;
        try {
            const start = maintenanceForm.type === 'hours' ? new Date(`${maintenanceForm.date}T${maintenanceForm.startTime}`) : new Date(`${maintenanceForm.date}T00:00:00`);
            const end = maintenanceForm.type === 'hours' ? new Date(`${maintenanceForm.date}T${maintenanceForm.endTime}`) : new Date(`${maintenanceForm.endDate}T23:59:59`);
            const mData = { status: 'maintenance', maintenanceUntil: end, maintenanceStart: start };
            await updateDoc(doc(db, "courts", maintenanceCourt.id), mData);
            setCourts(prev => prev.map(c => c.id === maintenanceCourt.id ? { ...c, ...mData } : c));
            showToast("Mantenimiento activado", 'success');
            setIsMaintenanceModalOpen(false);

            await auditService.logAuditEvent({
                action: 'CANCHA_MANTENIMIENTO_INICIAR',
                module: 'Infraestructura/Canchas',
                details: `Mantenimiento iniciado para la cancha ${maintenanceCourt.name} (${maintenanceCourt.id}) desde ${start.toLocaleString()} hasta ${end.toLocaleString()}.`,
                severity: 'LOW',
                status: 'SUCCESS'
            });
        } catch (e: any) { 
            showToast("Error", 'error'); 
            await auditService.logAuditEvent({
                action: 'CANCHA_MANTENIMIENTO_INICIAR',
                module: 'Infraestructura/Canchas',
                details: `Falla al iniciar mantenimiento para la cancha ${maintenanceCourt.name} (${maintenanceCourt.id}). Error: ${e.message || e}`,
                severity: 'LOW',
                status: 'FAILED'
            });
        }
    };
    const handleRestoreCourt = async (courtId: string) => {
        const courtToRestore = courts.find(c => c.id === courtId);
        try {
            await updateDoc(doc(db, "courts", courtId), { status: 'active', maintenanceUntil: null, maintenanceStart: null });
            setCourts(prev => prev.map(c => c.id === courtId ? { ...c, status: 'active', maintenanceUntil: null } : c));
            showToast("Cancha restaurada", 'success');

            await auditService.logAuditEvent({
                action: 'CANCHA_MANTENIMIENTO_FINALIZAR',
                module: 'Infraestructura/Canchas',
                details: `Mantenimiento finalizado y cancha ${courtToRestore?.name || ''} (${courtId}) restaurada a estado activo.`,
                severity: 'LOW',
                status: 'SUCCESS'
            });
        } catch (e: any) { 
            showToast("Falla técnica", 'error'); 
            await auditService.logAuditEvent({
                action: 'CANCHA_MANTENIMIENTO_FINALIZAR',
                module: 'Infraestructura/Canchas',
                details: `Falla al finalizar mantenimiento para la cancha ${courtToRestore?.name || ''} (${courtId}). Error: ${e.message || e}`,
                severity: 'LOW',
                status: 'FAILED'
            });
        }
    };

    // FUNCIONES SECUNDARIAS
    const filteredCourts = courts.filter(c => (filterSport === 'Todos' ? true : normalizeSport(c.sport) === normalizeSport(filterSport)))
        .filter(c => searchCourt.trim() === '' ? true : c.name.toLowerCase().includes(searchCourt.trim().toLowerCase()));
    const sportOrder: any = {};
    selectedSports.forEach((s, i) => { sportOrder[normalizeSport(s)] = i; });
    const sortedCourts = [...filteredCourts].sort((a, b) => {
        const oa = sportOrder[normalizeSport(a.sport)] ?? 999;
        const ob = sportOrder[normalizeSport(b.sport)] ?? 999;
        if (oa !== ob) return oa - ob;
        const ma = a.status === 'maintenance' ? 1 : 0;
        const mb = b.status === 'maintenance' ? 1 : 0;
        if (ma !== mb) return ma - mb;
        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });

    const FEATURE_ICONS: any = {
        'Techada': UmbrellaIcon,
        'Iluminación LED': LightbulbIcon,
        'Muro Panorámico': BrickWallIcon,
        'Pista Central': CircleDotIcon,
        'Césped FIFA': Leaf01Icon,
        'Outdoor (Aire Libre)': Sun01Icon,
        'Grabación de Partidos': Video01Icon,
        'Cristal Templado': Diamond01Icon,
    };

    const courtsBySport = (sport: string) => courts.filter(c => normalizeSport(c.sport) === normalizeSport(sport)).length;

    // PROGRESO DE CONFIGURACIÓN
    const configSteps = [
        { label: 'Imagen', done: !!selectedVenue?.imageURL },
        { label: 'Galería', done: (selectedVenue?.gallery || []).length > 0 },
        { label: 'Disciplinas', done: selectedSports.length > 0 },
        { label: 'Horario', done: Object.values(weeklySchedule).some(d => d.isOpen) },
        { label: 'Tarifas', done: selectedSports.some(s => timeSlots.some(t => ((pricingMatrix[s]?.weekday?.[t] ?? 0) > 0) || ((pricingMatrix[s]?.weekend?.[t] ?? 0) > 0))) },
    ];
    const configDoneCount = configSteps.filter(s => s.done).length;

    const courtBasePrice = (sport: string) => {
        const anyPricing = pricingMatrix[sport] || {};
        // Ambas tablas por separado: al mezclarlas como objeto, el fin de semana
        // pisaba los precios de semana del mismo horario y el "Desde" salía mal.
        const prices = [...Object.values(anyPricing.weekday || {}), ...Object.values(anyPricing.weekend || {})].map(Number).filter(p => p > 0);
        return prices.length > 0 ? Math.min(...prices) : 0;
    };

    const formatPrice = (n: number) => n.toLocaleString('es-CL');

    const activeCount = courts.filter(c => c.status !== 'maintenance').length;
    const maintenanceCount = courts.length - activeCount;
    const noPriceSports = selectedSports.filter(s => courtBasePrice(s) === 0).length;
    const pctActive = courts.length > 0 ? Math.round((activeCount / courts.length) * 100) : 0;
    const pctMaint = courts.length > 0 ? Math.round((maintenanceCount / courts.length) * 100) : 0;

    const totalCourts = venues.reduce((acc, v) => acc + (v.realCourtCount || 0), 0);
    const sportsSet = new Set<string>();
    venues.forEach(v => (v.activeSports || []).forEach(s => sportsSet.add(s)));
    const avgCourts = venues.length > 0 ? Math.round(totalCourts / venues.length) : 0;

    if (!selectedVenue) {
        return (
            <div className="w-full space-y-5 pb-10 text-left relative">
                {/* CABECERA ADN FINANCE STYLE */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-6 h-[2px] bg-emerald-500 rounded-md"></span>
                            <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">
                                Gestión de activos físicos
                            </p>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                            Infraestructura de <span className="text-emerald-500 dark:text-[#00df82]">Recintos</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 p-1.5 rounded-md">
                        <button 
                            onClick={fetchVenues} 
                            className="px-6 py-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[9px] uppercase tracking-[0.2em] rounded-md transition-all hover:brightness-110 active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center gap-2"
                        >
                            <HugeiconsIcon icon={RefreshIcon} className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> ACTUALIZAR RED
                        </button>
                    </div>
                </div>

                {/* KPIs REALES */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <TarjetaKpi titulo="Recintos" valor={venues.length} sub="Sedes activas" icono={<HugeiconsIcon icon={Store01Icon} className="w-6 h-6" strokeWidth={1.6} />} brillo />
                    <TarjetaKpi titulo="Canchas" valor={totalCourts} sub="Total de activos" icono={<HugeiconsIcon icon={FootballPitchIcon} className="w-6 h-6" strokeWidth={1.6} />} />
                    <TarjetaKpi titulo="Deportes" valor={sportsSet.size} sub="Disciplinas activas" icono={<HugeiconsIcon icon={FootballIcon} className="w-6 h-6" strokeWidth={1.6} />} />
                    <TarjetaKpi titulo="Promedio" valor={avgCourts} sub="Canchas por recinto" icono={<HugeiconsIcon icon={ChartIncreaseIcon} className="w-6 h-6" strokeWidth={1.6} />} />
                </div>

                {loading ? (
                    <div className="text-center py-40 animate-pulse">
                        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Escaneando Infraestructura...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {venues.map(v => <VenueCard key={v.id} venue={v} onClick={() => setSelectedVenue(v)} />)}
                    </div>
                )}
            </div>
        );
    }

    const isConfigured = selectedVenue.activeSports && selectedVenue.activeSports.length > 0;

return (
        <div className="w-full space-y-6 pb-28 text-left relative animate-fadeIn">
            {toast && <div className={`fixed top-6 right-6 px-6 py-3.5 rounded-md shadow-2xl text-[10px] font-black uppercase tracking-[0.1em] z-[1000] text-white flex items-center gap-3 animate-slideIn ${toast.type === 'success' ? 'bg-emerald-500 dark:bg-[#00df82] dark:text-black' : 'bg-red-600'}`}>{toast.type === 'success' ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" /> : <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4" />} {toast.msg}</div>}
            <ConfirmModal 
                isOpen={confirmData.isOpen} 
                title={confirmData.title} 
                message={confirmData.message} 
                onConfirm={confirmData.action} 
                onCancel={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} 
                isDestructive={confirmData.isDestructive} 
            />

            {/* BREADCRUMB */}
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                <button onClick={() => setSelectedVenue(null)} className="text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] transition-colors">Recintos</button>
                <span className="text-slate-300 dark:text-white/20">/</span>
                <span className="text-emerald-600 dark:text-[#00df82] truncate">{selectedVenue.name}</span>
                <span className="text-slate-300 dark:text-white/20">/</span>
                <span className="text-slate-400">{activeTab === 'config' ? 'Infraestructura' : 'Gestión de canchas'}</span>
            </div>

            {/* CABECERA MAESTRA */}
            <div className="relative overflow-hidden rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
                <div className="absolute inset-0 h-32 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 opacity-30 blur-3xl -top-10"></div>
                <div className="relative p-6 lg:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <button 
                                onClick={() => setSelectedVenue(null)} 
                                className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-md transition-all active:scale-95 hover:border-emerald-400/40 border border-slate-200 dark:border-white/10 text-slate-400 group shrink-0"
                                title="Volver a recintos"
                            >
                                <HugeiconsIcon icon={ArrowLeft01Icon} className="w-5 h-5 group-hover:-translate-x-1 transition-transform" strokeWidth={2} />
                            </button>
                            <div>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] text-[8px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">Gestión de activos</span>
                                    <span className="text-slate-300 dark:text-white/10">•</span>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                        <HugeiconsIcon icon={MapPinIcon} className="w-3 h-3" strokeWidth={1.8} /> {selectedVenue.address}
                                    </p>
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none font-heading flex items-center gap-3">
                                    {selectedVenue.name}
                                    {isConfigured && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-6 h-6 text-emerald-500 dark:text-[#00df82]" strokeWidth={1.8} />}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-1 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 w-fit">
                            <button 
                                onClick={() => setActiveTab('config')} 
                                className={`flex items-center gap-2.5 px-6 py-3 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'config' ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                            >
                                <HugeiconsIcon icon={Settings01Icon} className="w-4 h-4" /> Infraestructura
                            </button>
                            <button 
                                onClick={() => isConfigured ? setActiveTab('courts') : showToast("Define los deportes primero", 'error')} 
                                className={`flex items-center gap-2.5 px-6 py-3 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'courts' ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                            >
                                <HugeiconsIcon icon={Grid02Icon} className="w-4 h-4" /> Gestión de canchas
                            </button>
                        </div>
                    </div>

                    {/* STATS RÁPIDOS */}
                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Canchas</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">{courts.length}</p>
                        </div>
                        <div className="p-3.5 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Deportes</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">{selectedVenue.activeSports?.length || 0}</p>
                        </div>
                        <div className="p-3.5 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Horario</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">{selectedVenue.openingHours || '08:00 - 23:00'}</p>
                        </div>
                        <div className="p-3.5 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Tramos tarifarios</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">{timeSlots.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENIDO */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {activeTab === 'config' ? (
                    <>
                        {/* RESUMEN DE CONFIGURACIÓN */}
                        <div className="lg:col-span-4">
                            <div className="lg:sticky lg:top-6 space-y-6">
                                <PanelGlass className="p-6 rounded-md">
                                    <div className="flex items-center justify-between gap-3 mb-5">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-[#00df82] mb-1.5">Estado de configuración</p>
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">{configDoneCount} de 5 pasos</p>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-md text-[11px] font-black font-mono ${configDoneCount === 5 ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border border-emerald-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/10'}`}>{Math.round((configDoneCount / 5) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-6">
                                        <div className="h-full bg-emerald-500 dark:bg-[#00df82] rounded-full transition-all duration-500" style={{ width: `${(configDoneCount / 5) * 100}%` }} />
                                    </div>
                                    <div className="space-y-2.5">
                                        {configSteps.map((step, i) => (
                                            <div key={step.label} className={`flex items-center gap-3 p-2.5 rounded-md border transition-all ${step.done ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/15' : 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-100 dark:border-white/5'}`}>
                                                <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${step.done ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
                                                    {step.done ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={2} /> : <span className="font-mono text-[10px] font-black">{String(i + 1).padStart(2, '0')}</span>}
                                                </span>
                                                <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{step.label}</span>
                                                <span className={`text-[8px] font-black uppercase ${step.done ? 'text-emerald-600 dark:text-[#00df82]' : 'text-slate-300 dark:text-white/20'}`}>{step.done ? 'Listo' : 'Pendiente'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </PanelGlass>

                                <PanelGlass className="p-6 rounded-md">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Datos rápidos</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <StatMini label="Deportes" value={selectedSports.length} />
                                        <StatMini label="Canchas" value={courts.length} />
                                        <StatMini label="Días abiertos" value={Object.values(weeklySchedule).filter(d => d.isOpen).length} />
                                        <StatMini label="Tramos" value={timeSlots.length} />
                                    </div>
                                </PanelGlass>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: EDITOR */}
                        <div className="lg:col-span-8 space-y-6">
                            {/* IDENTIDAD VISUAL */}
                            <PanelGlass className="overflow-hidden">
                                <PanelHeader titulo="Identidad visual" desc="Portada y galería del recinto" icon={<HugeiconsIcon icon={Image01Icon} className="w-4 h-4" strokeWidth={1.8} />} />
                                <div className="p-6 lg:p-7">
                                    <div className="relative aspect-[16/7] rounded-md overflow-hidden border border-slate-200 dark:border-white/5 shadow-lg transition-all group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        {selectedVenue.imageURL ? (
                                            <img src={selectedVenue.imageURL} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-50 dark:bg-black/20 flex flex-col items-center justify-center text-slate-300 gap-3">
                                                <HugeiconsIcon icon={Camera01Icon} className="w-10 h-10 opacity-20" strokeWidth={1.4} />
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Sin imagen de portada</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                            <div className="bg-white/10 p-4 rounded-md border border-white/20">
                                                <HugeiconsIcon icon={PencilEdit02Icon} className="w-8 h-8 text-white" strokeWidth={1.6} />
                                            </div>
                                        </div>
                                        {venueImageLoading && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"><HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 text-white animate-spin" strokeWidth={1.6} /></div>}
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleVenueImageUpload} />

                                    <div className="flex items-center justify-between mt-6 mb-3">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Galería ({Math.min((selectedVenue.gallery || []).length, 6)}/6)</p>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-1">
                                        {(selectedVenue.gallery || []).map((img, idx) => (
                                            <div key={idx} className="relative w-28 h-16 shrink-0 rounded-md overflow-hidden group border border-slate-200 dark:border-white/5 shadow-md">
                                                <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button aria-label="Eliminar" onClick={() => handleRemoveGalleryImage(idx)} className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors shadow-lg">
                                                        <HugeiconsIcon icon={TrashIcon} className="w-3.5 h-3.5" strokeWidth={1.8} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {(selectedVenue.gallery || []).length < 6 && (
                                            <div className="relative w-28 h-16 shrink-0 rounded-md border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                                <HugeiconsIcon icon={Image01Icon} className="w-5 h-5 text-slate-300 dark:text-white/20 group-hover:text-emerald-500 transition-colors" strokeWidth={1.6} />
                                                <span className="text-[8px] font-black uppercase text-slate-400">Añadir</span>
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleGalleryUpload} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </PanelGlass>

                            {/* DEPORTES */}
                            <PanelGlass className="overflow-hidden">
                                <PanelHeader titulo="Deportes disponibles" desc="Define las disciplinas del recinto" icon={TrophyIcon} action={
                                    <span className="hidden sm:inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        {selectedSports.length} seleccionados
                                    </span>
                                } />
                                <div className="p-6 lg:p-7">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {AVAILABLE_SPORTS.map(s => {
                                            const selected = isSportSelected(s);
                                            return (
                                            <button
                                                key={s}
                                                onClick={() => toggleSport(s)}
                                                className={`p-4 rounded-md border transition-all flex items-center gap-3 ${selected ? 'bg-emerald-500 dark:bg-[#00df82] border-emerald-500 dark:border-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-emerald-500/30'}`}
                                            >
                                                {normalizeSport(s) === 'futbol' || normalizeSport(s) === 'futbolito' ? <SoccerIcon className={`w-6 h-6 shrink-0 ${selected ? 'text-white' : 'text-slate-300'}`} /> :
                                                 normalizeSport(s) === 'padel' ? <PadelIcon className={`w-6 h-6 shrink-0 ${selected ? 'text-white' : 'text-slate-300'}`} /> :
                                                 normalizeSport(s) === 'tenis' ? <TennisIcon className={`w-6 h-6 shrink-0 ${selected ? 'text-white' : 'text-slate-300'}`} /> :
                                                 normalizeSport(s) === 'basquetbol' ? <BasketballIcon className={`w-6 h-6 shrink-0 ${selected ? 'text-white' : 'text-slate-300'}`} /> :
                                                 normalizeSport(s) === 'voleibol' ? <VolleyballIcon className={`w-6 h-6 shrink-0 ${selected ? 'text-white' : 'text-slate-300'}`} /> :
                                                 <SoccerIcon className={`w-6 h-6 shrink-0 ${selected ? 'text-white' : 'text-slate-300'}`} />}
                                                <span className="flex-1 text-left">
                                                    <span className="block text-[11px] font-black uppercase tracking-tight">{s}</span>
                                                    <span className={`block text-[8px] font-black uppercase font-mono mt-0.5 ${selected ? 'text-white/80' : 'text-slate-300 dark:text-white/20'}`}>{courtsBySport(s)} canchas</span>
                                                </span>
                                                <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${selected ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/10'}`}>
                                                    {selected ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5" strokeWidth={2} /> : null}
                                                </span>
                                            </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </PanelGlass>

                            {/* OPERACIÓN Y TARIFAS */}
                            <PanelGlass className="overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 lg:px-7 py-4 border-b border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className="text-emerald-600 dark:text-[#00df82] shrink-0"><HugeiconsIcon icon={Settings01Icon} className="w-4 h-4" strokeWidth={1.8} /></span>
                                        <div>
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white truncate font-heading">Operación y tarifas</h3>
                                            <p className="text-[10px] font-bold text-slate-400 truncate">Horarios y precios por deporte</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 w-fit">
                                        <button onClick={() => setOpTab('horario')} className={`px-5 py-2 rounded-md text-[10px] font-black uppercase transition-all ${opTab === 'horario' ? 'bg-slate-900 dark:bg-[#00df82] text-white dark:text-black shadow-md' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>Horario</button>
                                        <button onClick={() => setOpTab('tarifas')} className={`px-5 py-2 rounded-md text-[10px] font-black uppercase transition-all ${opTab === 'tarifas' ? 'bg-slate-900 dark:bg-[#00df82] text-white dark:text-black shadow-md' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>Tarifas</button>
                                    </div>
                                </div>
                                <div className="p-6 lg:p-7">
                                    {opTab === 'horario' ? (
                                        <div className="animate-fadeIn">
                                            <div className="flex items-center justify-between gap-4 mb-5">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Disponibilidad semanal</p>
                                                <button onClick={handleCopyMondayToAll} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 rounded-md text-[9px] font-black uppercase tracking-widest hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all">
                                                    <HugeiconsIcon icon={Copy01Icon} className="w-3.5 h-3.5" strokeWidth={2} /> Copiar Lunes a todos
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {Object.keys(DAYS_MAP).map(dayKey => {
                                                    const day = weeklySchedule[dayKey] || DEFAULT_DAY_SCHEDULE;
                                                    return (
                                                        <div key={dayKey} className={`p-4 rounded-md border transition-all ${day.isOpen ? 'border-emerald-500/30 bg-emerald-500/[0.02] shadow-sm' : 'border-slate-200 dark:border-white/5 opacity-30 grayscale'}`}>
                                                            <div className="flex justify-between items-center mb-4">
                                                                <span className="text-[11px] font-black uppercase tracking-tighter text-slate-900 dark:text-white">{DAYS_MAP[dayKey]}</span>
                                                                <button
                                                                    onClick={() => updateDaySchedule(dayKey, 'isOpen', !day.isOpen)}
                                                                    className={`w-8 h-4 rounded-full relative transition-all ${day.isOpen ? 'bg-emerald-500 dark:bg-[#00df82] shadow-lg shadow-emerald-500/20' : 'bg-slate-200 dark:bg-white/10'}`}
                                                                >
                                                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${day.isOpen ? 'right-0.5' : 'left-0.5'}`}></div>
                                                                </button>
                                                            </div>
                                                            {day.isOpen && (
                                                                <div className="grid grid-cols-2 gap-2.5">
                                                                    <input type="time" value={day.open} onChange={e => updateDaySchedule(dayKey, 'open', e.target.value)} className="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[11px] font-black outline-none focus:border-emerald-500 text-center" />
                                                                    <input type="time" value={day.close} onChange={e => updateDaySchedule(dayKey, 'close', e.target.value)} className="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[11px] font-black outline-none focus:border-emerald-500 text-center" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        selectedSports.length > 0 ? (
                                            <div className="animate-fadeIn">
                                                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
                                                    <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
                                                        {selectedSports.map(s => (
                                                            <button key={s} onClick={() => setActivePricingTab(s)} className={`px-5 py-2.5 rounded-md text-[10px] font-black uppercase transition-all ${activePricingTab === s ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>{s}</button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {activePricingTab && (
                                                    <div className="space-y-6">
                                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-md w-fit border border-slate-200 dark:border-white/10">
                                                                <button onClick={() => setActiveDayTypeTab('weekday')} className={`px-6 py-2.5 rounded-md text-[10px] font-black uppercase transition-all ${activeDayTypeTab === 'weekday' ? 'bg-slate-900 dark:bg-[#00df82] text-white dark:text-black shadow-md' : 'text-slate-400'}`}>Lunes a viernes</button>
                                                                <button onClick={() => setActiveDayTypeTab('weekend')} className={`px-6 py-2.5 rounded-md text-[10px] font-black uppercase transition-all ${activeDayTypeTab === 'weekend' ? 'bg-slate-900 dark:bg-[#00df82] text-white dark:text-black shadow-md' : 'text-slate-400'}`}>Fines de semana</button>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <button onClick={() => handleFillMissingPrices(activePricingTab, activeDayTypeTab)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 rounded-md text-[9px] font-black uppercase tracking-widest hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all">
                                                                    <HugeiconsIcon icon={MagicWand01Icon} className="w-3.5 h-3.5" strokeWidth={2} /> Completar faltantes
                                                                </button>
                                                                <button onClick={() => handleApplyAllPrices(activePricingTab, activeDayTypeTab)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 rounded-md text-[9px] font-black uppercase tracking-widest hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all">
                                                                    <HugeiconsIcon icon={Layers01Icon} className="w-3.5 h-3.5" strokeWidth={2} /> Aplicar a todos los tramos
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                                            {timeSlots.map((time, idx) => {
                                                                const currentVal = pricingMatrix[activePricingTab]?.[activeDayTypeTab]?.[time] || '';
                                                                const missing = currentVal === '' || currentVal === 0;
                                                                return (
                                                                <div key={time} className={`p-4 bg-slate-50/50 dark:bg-white/[0.02] rounded-md border relative group hover:border-emerald-500/30 transition-all ${missing ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-white/5'}`}>
                                                                    <div className="flex items-center justify-between gap-2 mb-3">
                                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{time}</label>
                                                                        {missing && (
                                                                            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-amber-600 dark:text-amber-400">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Sin precio
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-300">$</span>
                                                                        <input
                                                                            type="number"
                                                                            value={pricingMatrix[activePricingTab]?.[activeDayTypeTab]?.[time] || ''}
                                                                            onChange={e => updatePrice(activePricingTab, activeDayTypeTab, time, parseInt(e.target.value) || 0)}
                                                                            className={`w-full pl-6 pr-2 py-3 bg-white dark:bg-black/40 border rounded-md text-[11px] font-black outline-none focus:ring-1 ring-emerald-500 text-emerald-600 dark:text-[#00df82] ${missing ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-white/10'}`}
                                                                            placeholder="0"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleCopyPriceDown(activePricingTab, activeDayTypeTab, idx)}
                                                                        className="absolute -right-2 -bottom-2 w-7 h-7 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl z-10"
                                                                        title="Replicar hacia abajo"
                                                                    >
                                                                        <HugeiconsIcon icon={ArrowDown01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                                                    </button>
                                                                </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center">
                                                <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Activa deportes para configurar tarifas</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </PanelGlass>
                        </div>
                    </>
                ) : (
                    <div className="lg:col-span-12 space-y-6 animate-fadeIn">
                        {/* HEADER + FLOTA + FILTROS */}
                        <div className="bg-white dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-white/5 overflow-hidden">
                            <PanelHeader
                                titulo="Unidades del recinto"
                                desc={`Canchas integradas en ${selectedVenue.name}`}
                                icon={Grid02Icon}
                                action={
                                    <button onClick={handleOpenCreate} className="flex items-center justify-center gap-2.5 px-6 py-3 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[10px] uppercase rounded-md shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all">
                                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> Integrar cancha
                                    </button>
                                }
                            />
                            <div className="p-6 lg:p-7 space-y-5">
                                {/* ESTADO DE LA FLOTA */}
                                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#00df82]"></span>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Activas <span className="font-mono text-emerald-600 dark:text-[#00df82]">{activeCount}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">En pausa <span className="font-mono text-red-500">{maintenanceCount}</span></p>
                                    </div>
                                    {noPriceSports > 0 && (
                                        <div className="flex items-center gap-2.5 text-amber-500">
                                            <HugeiconsIcon icon={Alert02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                            <p className="text-[10px] font-black uppercase tracking-widest">{noPriceSports} deporte{noPriceSports > 1 ? 's' : ''} sin tarifa</p>
                                        </div>
                                    )}
                                    <div className="ml-auto flex items-center gap-4 min-w-[220px]">
                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-emerald-500 dark:bg-[#00df82] transition-all" style={{ width: `${pctActive}%` }} />
                                            <div className="h-full bg-red-500 transition-all" style={{ width: `${pctMaint}%` }} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{sortedCourts.length} {sortedCourts.length === 1 ? 'cancha' : 'canchas'}</span>
                                    </div>
                                </div>

                                {/* FILTROS */}
                                <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-slate-100 dark:border-white/5">
                                    <span className="px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">Filtrar por deporte</span>
                                    <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
                                        <button onClick={() => setFilterSport('Todos')} className={`flex items-center gap-1.5 px-6 py-2.5 text-[10px] font-black uppercase rounded-md transition-all ${filterSport === 'Todos' ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>
                                            Todos <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-mono ${filterSport === 'Todos' ? 'bg-white/20 text-white' : 'bg-white dark:bg-white/10 text-slate-400'}`}>{courts.length}</span>
                                        </button>
                                        {selectedSports.map(s => <button key={s} onClick={() => setFilterSport(s)} className={`flex items-center gap-1.5 px-6 py-2.5 text-[10px] font-black uppercase rounded-md transition-all ${filterSport === s ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>
                                            {s} <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-mono ${filterSport === s ? 'bg-white/20 text-white' : 'bg-white dark:bg-white/10 text-slate-400'}`}>{courtsBySport(s)}</span>
                                        </button>)}
                                    </div>
                                    <div className="ml-auto flex items-center gap-3">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20"><HugeiconsIcon icon={Search01Icon} className="w-4 h-4" strokeWidth={2} /></span>
                                            <input
                                                type="text"
                                                value={searchCourt}
                                                onChange={e => setSearchCourt(e.target.value)}
                                                placeholder="Buscar cancha..."
                                                className="w-56 pl-9 pr-3 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-black outline-none focus:border-emerald-500 placeholder:text-slate-300 dark:placeholder:text-white/20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                            {sortedCourts.map(c => {
                                const sportAccent: any = {
                                    'Fútbol': 'bg-emerald-500', 'Futbolito': 'bg-emerald-400', 'Pádel': 'bg-orange-500',
                                    'Tenis': 'bg-sky-500', 'Básquetbol': 'bg-indigo-500', 'Vóleibol': 'bg-purple-500',
                                };
                                const sportTile: any = {
                                    'Fútbol': 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-[#00df82]', 'Futbolito': 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-500',
                                    'Pádel': 'bg-orange-50 dark:bg-orange-500/10 text-orange-500', 'Tenis': 'bg-sky-50 dark:bg-sky-500/10 text-sky-500',
                                    'Básquetbol': 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500', 'Vóleibol': 'bg-purple-50 dark:bg-purple-500/10 text-purple-500',
                                };
                                const accent = sportAccent[c.sport] || 'bg-slate-400';
                                const tile = sportTile[c.sport] || 'bg-slate-50 dark:bg-white/5 text-slate-400';
                                const courtSportIcon = (() => {
                                    const n = normalizeSport(c.sport);
                                    if (n === 'futbol' || n === 'futbolito') return <SoccerIcon className="w-5 h-5" />;
                                    if (n === 'padel') return <PadelIcon className="w-5 h-5" />;
                                    if (n === 'tenis') return <TennisIcon className="w-5 h-5" />;
                                    if (n === 'basquetbol') return <BasketballIcon className="w-5 h-5" />;
                                    if (n === 'voleibol') return <VolleyballIcon className="w-5 h-5" />;
                                    return <HugeiconsIcon icon={FootballIcon} className="w-5 h-5" strokeWidth={1.8} />;
                                })();
                                return (
                                <div key={c.id} className="bg-white dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-white/5 shadow-sm relative group hover:border-emerald-500/30 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none transition-all overflow-hidden flex flex-col">
                                    <div className={`h-1 w-full ${accent}`} />
                                    <div className="p-4 flex flex-col flex-1">
                                        {/* ESTADO + ACCIONES */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${c.status === 'maintenance' ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-500' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-[#00df82]'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'maintenance' ? 'bg-red-500' : 'bg-emerald-500 dark:bg-[#00df82]'}`} />
                                                {c.status === 'maintenance' ? 'En pausa' : 'Activo'}
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => handleOpenEdit(c)} className="p-2 bg-slate-50 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-emerald-400/40 border border-transparent transition-all" title="Editar"><HugeiconsIcon icon={PencilEdit02Icon} className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDeleteCourt(c.id)} className="p-2 bg-slate-50 dark:bg-white/5 rounded-md text-slate-400 hover:text-red-500 border border-transparent transition-all" title="Eliminar"><HugeiconsIcon icon={TrashIcon} className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>

                                        {/* IDENTIDAD */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${tile}`}>
                                                {courtSportIcon}
                                            </span>
                                            <div className="min-w-0">
                                                <h4 className="text-[14px] font-black text-slate-900 dark:text-white uppercase truncate tracking-tighter leading-none font-heading">{c.name}</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{c.sport}</span>
                                                    {courtBasePrice(c.sport) > 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-[#00df82] text-[8px] font-black font-mono">
                                                            Desde ${formatPrice(courtBasePrice(c.sport))}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase">
                                                            <HugeiconsIcon icon={Alert02Icon} className="w-2.5 h-2.5" strokeWidth={2} /> Sin tarifa
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {c.status === 'maintenance' && c.maintenanceUntil && (
                                            <div className="mb-3 px-2.5 py-1.5 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                                                    <HugeiconsIcon icon={Alert02Icon} className="w-3 h-3" strokeWidth={2} /> Hasta {new Date(c.maintenanceUntil.seconds ? c.maintenanceUntil.seconds * 1000 : c.maintenanceUntil).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                        )}

                                        {/* DATOS TÉCNICOS */}
                                        <div className="grid grid-cols-3 gap-2 py-3.5 border-t border-slate-100 dark:border-white/5">
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">Superficie</p>
                                                <p className="text-[9px] font-black text-slate-600 dark:text-slate-300 truncate">{c.surface || '—'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">Tarifa</p>
                                                <p className={`text-[9px] font-black font-mono truncate ${courtBasePrice(c.sport) > 0 ? 'text-emerald-600 dark:text-[#00df82]' : 'text-amber-500'}`}>
                                                    {courtBasePrice(c.sport) > 0 ? `$${formatPrice(courtBasePrice(c.sport))}` : 'Sin tarifa'}
                                                </p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">ID</p>
                                                <p className="text-[9px] font-black text-slate-400 font-mono">#{c.id.slice(0, 4).toUpperCase()}</p>
                                            </div>
                                        </div>

                                        {(c.features || []).length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-3">
                                                {c.features.slice(0, 3).map(f => (
                                                    <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                                                        {FEATURE_ICONS[f] && <HugeiconsIcon icon={FEATURE_ICONS[f]} className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00df82]" strokeWidth={2} />} {f}
                                                    </span>
                                                ))}
                                                {c.features.length > 3 && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-400 uppercase">+{c.features.length - 3}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* ACCIÓN */}
                                        <div className="mt-auto pt-4">
                                            {c.status === 'maintenance' ? (
                                                <button onClick={() => handleRestoreCourt(c.id)} className="w-full py-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md text-[9px] font-black uppercase tracking-widest transition-all hover:brightness-110 flex items-center justify-center gap-2">
                                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5" strokeWidth={2} /> Restaurar
                                                </button>
                                            ) : (
                                                <button onClick={() => handleOpenMaintenance(c)} className="w-full py-2.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-300 rounded-md text-[9px] font-black uppercase tracking-widest transition-all hover:bg-red-500 hover:text-white flex items-center justify-center gap-2">
                                                    <HugeiconsIcon icon={Wrench01Icon} className="w-3.5 h-3.5" strokeWidth={2} /> Mantenimiento
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                            {sortedCourts.length === 0 && (
                                <div className="col-span-full py-32 text-center space-y-5">
                                    <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-md flex items-center justify-center mx-auto text-slate-300 border border-slate-200 dark:border-white/10">
                                        <HugeiconsIcon icon={PuzzleIcon} className="w-12 h-12" strokeWidth={1.4} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[13px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest leading-none">Cero canchas registradas</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Agrega nuevas unidades para expandir tu infraestructura</p>
                                    </div>
                                    <button onClick={handleOpenCreate} className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[10px] uppercase rounded-md shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all">
                                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> Integrar primera cancha
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* BARRA DE GUARDADO FIJA (solo infraestructura) */}
            {activeTab === 'config' && (
                <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
                    <div className="max-w-6xl mx-auto pointer-events-auto rounded-md bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-2xl px-5 py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${dirty ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                {dirty ? 'Cambios sin guardar' : 'Infraestructura sincronizada'}
                            </p>
                        </div>
                        <button 
                            onClick={handleSaveConfig} 
                            disabled={!dirty}
                            className="flex items-center gap-2 px-8 py-3 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-md shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
                        >
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" /> Sincronizar cambios
                        </button>
                    </div>
                </div>
            )}

            <CourtModal isOpen={isCourtModalOpen} editingId={editingCourtId} form={courtForm} selectedSports={selectedVenue.activeSports} onClose={() => setIsCourtModalOpen(false)} onFormChange={(field, value) => setCourtForm({ ...courtForm, [field]: value })} onToggleFeature={toggleNewCourtFeature} onSave={handleSaveCourt} />
            <MaintenanceModal isOpen={isMaintenanceModalOpen} court={maintenanceCourt} form={maintenanceForm} conflicts={maintenanceConflicts} onClose={() => setIsMaintenanceModalOpen(false)} onFormChange={(field, value) => setMaintenanceForm({ ...maintenanceForm, [field]: value })} onCheckConflicts={checkMaintenanceConflicts} onConfirm={handleConfirmMaintenance} />
        </div>
    );
}