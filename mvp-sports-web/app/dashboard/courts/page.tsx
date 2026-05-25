"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { auditService } from '@/services/auditService';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import {
    BuildingStorefrontIcon, ClockIcon, CurrencyDollarIcon, MapPinIcon, PlusIcon,
    TrashIcon, CheckCircleIcon, ExclamationTriangleIcon, PuzzlePieceIcon, ArrowLeftIcon,
    Cog6ToothIcon, TrophyIcon, ArrowDownIcon, WifiIcon, PencilSquareIcon, FunnelIcon,
    ArrowPathIcon, PhotoIcon, CameraIcon, UserGroupIcon, WrenchScrewdriverIcon,
    XMarkIcon, CalendarIcon, BoltIcon, ChartBarIcon, Squares2X2Icon
} from '@heroicons/react/24/outline';
import VenueCard from '@/components/courts/VenueCard';
import CourtCard from '@/components/courts/CourtCard';
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
}

interface Court {
    id: string;
    name: string;
    sport: string;
    surface: string;
    features: string[];
    tenantId: string;
    status?: string;
}

function HeaderSeccion({ titulo, desc, icon: Icon }: any) {
    return (
        <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div className="space-y-0">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white leading-tight">{titulo}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{desc}</p>
            </div>
        </div>
    );
}

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onCancel}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                <div className={`absolute top-0 left-0 w-full h-1 ${isDestructive ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-none">{title}</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-8 uppercase leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-all">Cancelar</button>
                    <button onClick={onConfirm} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl text-white shadow-lg transition-all active:scale-95 ${isDestructive ? 'bg-red-600 shadow-red-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>Confirmar</button>
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
    const [venueImageLoading, setVenueImageLoading] = useState(false);

    // HELPER PARA NORMALIZAR DEPORTES (TILDES Y MAYUSCULAS)
    const normalizeSport = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
    const isSportSelected = (sport: string) => selectedSports.some(s => normalizeSport(s) === normalizeSport(sport));

    // FILTRO Y MODAL
    const [filterSport, setFilterSport] = useState<string>('Todos');
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

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const scaleSize = MAX_WIDTH / img.width;
                    const newWidth = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
                    const newHeight = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, newWidth, newHeight);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(compressedDataUrl);
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

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
                const qTenants = query(collection(db, "tenants"), where("ownerId", "==", user.uid));
                const snapTenants = await getDocs(qTenants);
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
    };
    const toggleSport = (sport: string) => {
        if (isSportSelected(sport)) {
            setSelectedSports(prev => prev.filter(s => normalizeSport(s) !== normalizeSport(sport)));
            if (normalizeSport(activePricingTab) === normalizeSport(sport)) setActivePricingTab('');
        } else {
            setSelectedSports(prev => [...prev, sport]);
            if (!activePricingTab) setActivePricingTab(sport);
        }
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
    const filteredCourts = courts.filter(c => filterSport === 'Todos' ? true : normalizeSport(c.sport) === normalizeSport(filterSport));
    const sortedCourts = [...filteredCourts].sort((a, b) => a.name.localeCompare(b.name));

    if (!selectedVenue) {
        return (
            <div className="w-full space-y-5 pb-10 text-left relative">
                {/* CABECERA ADN FINANCE STYLE */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">
                                Gestión de Activos Físicos
                            </p>
                        </div>
                        <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                            Infraestructura de <span className="text-emerald-500">Recintos</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 p-1.5 rounded-xl">
                        <button 
                            onClick={fetchVenues} 
                            className="px-6 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-black text-[9px] uppercase tracking-[0.2em] rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center gap-2 border border-emerald-400/20 dark:border-white/10"
                        >
                            <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> ACTUALIZAR RED
                        </button>
                    </div>
                </div>

                {/* KPI GRID - FINANCE COMPACT */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <TarjetaKpi titulo="RECINTOS" valor={venues.length} sub="SEDES ACTIVAS" icono={<BuildingStorefrontIcon className="w-4 h-4" />} brillo />
                    <TarjetaKpi titulo="CANCHAS" valor={venues.reduce((acc, v) => acc + (v.realCourtCount || 0), 0)} sub="TOTAL ACTIVOS" icono={<TrophyIcon className="w-4 h-4" />} />
                    <TarjetaKpi titulo="OCUPACIÓN" valor="78%" sub="PROMEDIO" icono={<ChartBarIcon className="w-4 h-4" />} brillo />
                    <TarjetaKpi titulo="ALERTAS" valor="2" sub="PENDIENTES" icono={<ExclamationTriangleIcon className="w-4 h-4" />} />
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
        <div className="w-full space-y-6 pb-10 text-left relative animate-fadeIn">
            {toast && <div className={`fixed top-6 right-6 px-6 py-3.5 rounded-2xl shadow-2xl text-[10px] font-black uppercase tracking-[0.1em] z-[1000] text-white flex items-center gap-3 animate-slideIn ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.type === 'success' ? <CheckCircleIcon className="w-4 h-4" /> : <ExclamationTriangleIcon className="w-4 h-4" />} {toast.msg}</div>}
            <ConfirmModal 
                isOpen={confirmData.isOpen} 
                title={confirmData.title} 
                message={confirmData.message} 
                onConfirm={confirmData.action} 
                onCancel={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} 
                isDestructive={confirmData.isDestructive} 
            />

            {/* CABECERA MAESTRA SEDE - FINANCE PREMIUM */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-100 dark:border-white/5 bg-white dark:bg-[#0B0F19] shadow-xl">
                {/* Banner de Fondo con Blur */}
                <div className="absolute inset-0 h-32 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 opacity-30 blur-3xl -top-10"></div>
                
                <div className="relative p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        {(!selectedVenue.features || selectedVenue.features.multiRecinto !== false) && (
                            <button 
                                onClick={() => setSelectedVenue(null)} 
                                className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-xl transition-all active:scale-95 hover:bg-slate-100 dark:hover:bg-white/10 shadow-sm border border-slate-200 dark:border-white/5 text-slate-400 group"
                            >
                                <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            </button>
                        )}
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
                                    Gestión de Activos
                                </span>
                                <span className="text-slate-300 dark:text-white/10">•</span>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                    <MapPinIcon className="w-3 h-3" /> {selectedVenue.address}
                                </p>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none flex items-center gap-3">
                                {selectedVenue.name}
                                {isConfigured && <CheckCircleIcon className="w-6 h-6 text-emerald-500" />}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-1 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5">
                        <button 
                            onClick={() => setActiveTab('config')} 
                            className={`flex items-center gap-2 px-6 py-2.5 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === 'config' ? 'bg-white dark:bg-emerald-500 shadow-lg text-slate-900 dark:text-slate-900' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                        >
                            <Cog6ToothIcon className="w-4 h-4" /> INFRAESTRUCTURA
                        </button>
                        <button 
                            onClick={() => isConfigured ? setActiveTab('courts') : showToast("Define los deportes primero", 'error')} 
                            className={`flex items-center gap-2 px-6 py-2.5 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === 'courts' ? 'bg-white dark:bg-emerald-500 shadow-lg text-slate-900 dark:text-slate-900' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                        >
                            <Squares2X2Icon className="w-4 h-4" /> GESTIÓN DE CANCHAS
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENIDO DINÁMICO ADN FINANCE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {activeTab === 'config' ? (
                    <>
                        {/* Sidebar de Configuración */}
                        <div className="lg:col-span-4 space-y-6">
                            <PanelGlass className="p-8 overflow-hidden group rounded-xl">
                                <HeaderSeccion titulo="Imagen Corporativa" desc="Identidad visual del recinto" icon={PhotoIcon} />
                                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-100 dark:border-white/5 shadow-2xl transition-all group-hover:scale-[1.01] cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    {selectedVenue.imageURL ? (
                                        <img src={selectedVenue.imageURL} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-50 dark:bg-black/20 flex flex-col items-center justify-center text-slate-300 gap-3">
                                            <CameraIcon className="w-10 h-10 opacity-20" />
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Sin Imagen de Portada</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                        <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                                            <PencilSquareIcon className="w-8 h-8 text-white" />
                                        </div>
                                    </div>
                                    {venueImageLoading && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 text-white animate-spin" /></div>}
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleVenueImageUpload} />
                            </PanelGlass>

                            <PanelGlass className="p-8 rounded-xl overflow-hidden group">
                                <HeaderSeccion titulo="Galería Fotográfica" desc="Imágenes del Recinto para App Móvil (Max 6)" icon={PhotoIcon} />
                                <div className="grid grid-cols-2 gap-4">
                                    {(selectedVenue.gallery || []).map((img, idx) => (
                                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-slate-100 dark:border-white/5 shadow-md">
                                            <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button onClick={() => handleRemoveGalleryImage(idx)} className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(selectedVenue.gallery || []).length < 6 && (
                                        <div className="relative aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                            <PhotoIcon className="w-6 h-6 text-slate-300 dark:text-white/20 group-hover:text-emerald-500 transition-colors" />
                                            <span className="text-[8px] font-black uppercase text-slate-400">Añadir Foto</span>
                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleGalleryUpload} />
                                        </div>
                                    )}
                                </div>
                            </PanelGlass>

                            <PanelGlass className="p-8 rounded-xl">
                                <HeaderSeccion titulo="Disciplinas" desc="Deportes disponibles" icon={TrophyIcon} />
                                <div className="grid grid-cols-2 gap-3">
                                    {AVAILABLE_SPORTS.map(s => (
                                        <button 
                                            key={s} 
                                            onClick={() => toggleSport(s)} 
                                            className={`p-3 rounded-lg text-[9px] font-black uppercase border transition-all flex flex-col items-center gap-2 ${isSportSelected(s) ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-400 hover:border-emerald-500/30'}`}
                                        >
                                            {normalizeSport(s) === 'futbol' || normalizeSport(s) === 'futbolito' ? <SoccerIcon className={`w-4 h-4 ${isSportSelected(s) ? 'text-white' : 'text-slate-300'}`} /> : 
                                             normalizeSport(s) === 'padel' ? <PadelIcon className={`w-4 h-4 ${isSportSelected(s) ? 'text-white' : 'text-slate-300'}`} /> :
                                             normalizeSport(s) === 'tenis' ? <TennisIcon className={`w-4 h-4 ${isSportSelected(s) ? 'text-white' : 'text-slate-300'}`} /> :
                                             normalizeSport(s) === 'basquetbol' ? <BasketballIcon className={`w-4 h-4 ${isSportSelected(s) ? 'text-white' : 'text-slate-300'}`} /> :
                                             normalizeSport(s) === 'voleibol' ? <VolleyballIcon className={`w-4 h-4 ${isSportSelected(s) ? 'text-white' : 'text-slate-300'}`} /> :
                                             <SoccerIcon className={`w-4 h-4 ${isSportSelected(s) ? 'text-white' : 'text-slate-300'}`} />}
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </PanelGlass>
                        </div>

                        {/* Configuración Principal (Horarios y Precios) */}
                        <div className="lg:col-span-8 space-y-8">
                            <PanelGlass className="p-8 rounded-xl">
                                <div className="flex items-center justify-between mb-8">
                                    <HeaderSeccion titulo="Matriz Horaria" desc="Disponibilidad operativa semanal" icon={ClockIcon} />
                                    <div className="h-px flex-1 bg-slate-100 dark:bg-white/5 mx-8 hidden md:block"></div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {Object.keys(DAYS_MAP).map(dayKey => {
                                        const day = weeklySchedule[dayKey] || DEFAULT_DAY_SCHEDULE;
                                        return (
                                            <div key={dayKey} className={`p-4 rounded-xl border transition-all ${day.isOpen ? 'border-emerald-500/30 bg-emerald-500/[0.02] shadow-sm' : 'border-slate-100 dark:border-white/5 opacity-30 grayscale'}`}>
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-[10px] font-black uppercase tracking-tighter text-slate-900 dark:text-white">{DAYS_MAP[dayKey]}</span>
                                                    <button 
                                                        onClick={() => updateDaySchedule(dayKey, 'isOpen', !day.isOpen)}
                                                        className={`w-8 h-4 rounded-full relative transition-all ${day.isOpen ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-200 dark:bg-white/10'}`}
                                                    >
                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${day.isOpen ? 'right-0.5' : 'left-0.5'}`}></div>
                                                    </button>
                                                </div>
                                                {day.isOpen && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input type="time" value={day.open} onChange={e => updateDaySchedule(dayKey, 'open', e.target.value)} className="bg-white dark:bg-black/40 border border-slate-100 dark:border-white/5 rounded-lg px-2 py-2 text-[10px] font-black outline-none focus:border-emerald-500 text-center" />
                                                        <input type="time" value={day.close} onChange={e => updateDaySchedule(dayKey, 'close', e.target.value)} className="bg-white dark:bg-black/40 border border-slate-100 dark:border-white/5 rounded-lg px-2 py-2 text-[10px] font-black outline-none focus:border-emerald-500 text-center" />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </PanelGlass>

                            {selectedSports.length > 0 && (
                                <PanelGlass className="p-8 rounded-xl">
                                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-100 dark:border-white/5">
                                        <HeaderSeccion titulo="Estructura Tarifaria" desc="Precios por deporte y tramo horario" icon={CurrencyDollarIcon} />
                                        <div className="flex flex-wrap gap-2 p-1 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-100 dark:border-white/5">
                                            {selectedSports.map(s => (
                                                <button key={s} onClick={() => setActivePricingTab(s)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activePricingTab === s ? 'bg-white dark:bg-emerald-500 shadow-xl text-slate-900 dark:text-slate-900' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}>{s}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {activePricingTab && (
                                        <div className="space-y-8 animate-fadeIn">
                                            <div className="flex gap-2 p-1 bg-slate-50 dark:bg-black/40 rounded-xl w-fit">
                                                <button onClick={() => setActiveDayTypeTab('weekday')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeDayTypeTab === 'weekday' ? 'bg-white dark:bg-slate-800 shadow-md text-slate-900 dark:text-white' : 'text-slate-400'}`}>Lunes a Viernes</button>
                                                <button onClick={() => setActiveDayTypeTab('weekend')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeDayTypeTab === 'weekend' ? 'bg-white dark:bg-slate-800 shadow-md text-slate-900 dark:text-white' : 'text-slate-400'}`}>Fines de Semana</button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                                {timeSlots.map((time, idx) => (
                                                    <div key={time} className="p-4 bg-slate-50/50 dark:bg-white/[0.02] rounded-xl border border-slate-100 dark:border-white/5 relative group hover:border-emerald-500/30 transition-all">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{time}</label>
                                                        </div>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">$</span>
                                                            <input
                                                                type="number"
                                                                value={pricingMatrix[activePricingTab]?.[activeDayTypeTab]?.[time] || ''}
                                                                onChange={e => updatePrice(activePricingTab, activeDayTypeTab, time, parseInt(e.target.value) || 0)}
                                                                className="w-full pl-6 pr-2 py-2.5 bg-white dark:bg-black/40 border border-slate-100 dark:border-white/5 rounded-lg text-[11px] font-black outline-none focus:ring-1 ring-emerald-500 text-emerald-600 dark:text-emerald-400"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={() => handleCopyPriceDown(activePricingTab, activeDayTypeTab, idx)} 
                                                            className="absolute -right-2 -bottom-2 w-7 h-7 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-900 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl z-10"
                                                        >
                                                            <ArrowDownIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </PanelGlass>
                            )}

                            <div className="flex justify-end pt-4">
                                <button 
                                    onClick={handleSaveConfig} 
                                    className="px-12 py-5 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all hover:-translate-y-1"
                                >
                                    Sincronizar Estructura Maestra
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="lg:col-span-12 space-y-8 animate-fadeIn">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#0B0F19] p-6 rounded-xl border border-slate-100 dark:border-white/5 shadow-xl">
                            <div className="flex items-center gap-3 p-1 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5">
                                <button onClick={() => setFilterSport('Todos')} className={`px-6 py-2.5 text-[9px] font-black uppercase rounded-lg transition-all ${filterSport === 'Todos' ? 'bg-white dark:bg-emerald-500 shadow-xl text-slate-900 dark:text-slate-900' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}>Todos</button>
                                {selectedSports.map(s => <button key={s} onClick={() => setFilterSport(s)} className={`px-6 py-2.5 text-[9px] font-black uppercase rounded-lg transition-all ${filterSport === s ? 'bg-white dark:bg-emerald-500 shadow-xl text-slate-900 dark:text-slate-900' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}>{s}</button>)}
                            </div>
                            <button onClick={handleOpenCreate} className="px-8 py-4 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-900 font-black text-[10px] uppercase rounded-xl flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-1">
                                <PlusIcon className="w-5 h-5" /> Integrar Nueva Cancha
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                            {sortedCourts.map(c => (
                                <div key={c.id} className="bg-white dark:bg-[#0B0F19] rounded-xl border border-slate-100 dark:border-white/5 p-4 shadow-sm relative group hover:border-emerald-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${c.status === 'maintenance' ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-500' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-500'}`}>
                                            {c.status === 'maintenance' ? 'En Pausa' : 'Activo'}
                                        </div>
                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenEdit(c)} className="p-1.5 bg-slate-50 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"><PencilSquareIcon className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDeleteCourt(c.id)} className="p-1.5 bg-slate-50 dark:bg-white/5 rounded-md text-slate-400 hover:text-red-500 transition-all"><TrashIcon className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-0.5 mb-4">
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{c.sport}</p>
                                        <h4 className="text-[15px] font-black text-slate-900 dark:text-white uppercase truncate tracking-tighter leading-none">{c.name}</h4>
                                    </div>

                                    {/* DATA TÉCNICA COMPACTA */}
                                    <div className="grid grid-cols-2 gap-y-2 py-3 border-t border-slate-100 dark:border-white/5">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Superficie</p>
                                            <p className="text-[11px] font-black text-slate-600 dark:text-slate-300 truncate">{c.surface}</p>
                                        </div>
                                        <div className="space-y-0.5 text-right">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Iluminación</p>
                                            <div className="flex items-center justify-end gap-1">
                                                <BoltIcon className="w-3 h-3 text-amber-500" />
                                                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">LED Pro</span>
                                            </div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Formato</p>
                                            <p className="text-[11px] font-black text-slate-600 dark:text-slate-300">Outdoor</p>
                                        </div>
                                        <div className="space-y-0.5 text-right">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">ID</p>
                                            <p className="text-[11px] font-black text-slate-400 font-mono">#{c.id.slice(0,4).toUpperCase()}</p>
                                        </div>
                                    </div>

                                    <div className="pt-3">
                                        {c.status === 'maintenance' ? (
                                            <button onClick={() => handleRestoreCourt(c.id)} className="w-full py-2 bg-emerald-500 text-slate-900 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all hover:scale-[1.02]">Restaurar</button>
                                        ) : (
                                            <button onClick={() => handleOpenMaintenance(c)} className="w-full py-2 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all hover:bg-red-600 hover:text-white">Mantenimiento</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {sortedCourts.length === 0 && (
                                <div className="col-span-full py-40 text-center space-y-4">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center mx-auto text-slate-300">
                                        <PuzzlePieceIcon className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest leading-none">Cero Canchas Registradas</p>
                                        <p className="text-[9px] font-bold text-slate-300 uppercase mt-2">Expande tu infraestructura agregando nuevas unidades</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <CourtModal isOpen={isCourtModalOpen} editingId={editingCourtId} form={courtForm} selectedSports={selectedVenue.activeSports} onClose={() => setIsCourtModalOpen(false)} onFormChange={(field, value) => setCourtForm({ ...courtForm, [field]: value })} onToggleFeature={toggleNewCourtFeature} onSave={handleSaveCourt} />
            <MaintenanceModal isOpen={isMaintenanceModalOpen} court={maintenanceCourt} form={maintenanceForm} conflicts={maintenanceConflicts} onClose={() => setIsMaintenanceModalOpen(false)} onFormChange={(field, value) => setMaintenanceForm({ ...maintenanceForm, [field]: value })} onCheckConflicts={checkMaintenanceConflicts} onConfirm={handleConfirmMaintenance} />
        </div>
    );
}
