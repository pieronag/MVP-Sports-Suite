"use client";
import { hideBrokenImg } from "@/utils/img";
import CourtFleet from "@/components/courts/CourtFleet";
import { PanelHeader, StatMini } from "@/components/courts/ui";
import { maintenanceRange, mergePricing, timeSlotsFor, type SportPricing, type WeeklySchedule } from "@/utils/courtConfig";
import OperationPanel, { DEFAULT_DAY_SCHEDULE } from "@/components/courts/OperationPanel";
import PageTitle, { Accent } from "@/components/dashboard/PageTitle";
import { useFeedback } from "@/components/ui/Feedback";
import { getOwnedTenantsSnap } from "@/services/client/ownedTenants";
import { canonicalSport } from "@/utils/sports";
import { postApi } from "@/services/client/apiClient";
import { listBookings } from "@/services/client/data/bookings";
import { normalizeBooking, isReal } from "@/utils/bookingModel";
import { uploadImage } from "@/services/client/imageUpload";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/client/firebase';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { auditService } from '@/services/client/auditService';
import {
    ArrowLeft01Icon,
    Camera01Icon,
    CheckmarkCircle02Icon,
    Grid02Icon,
    Image01Icon,
    MapPinIcon,
    PencilEdit02Icon,
    RefreshIcon,
    Settings01Icon,
    Delete02Icon,
    TrophyIcon,
    FootballIcon,
    FootballPitchIcon,
    Store01Icon,
    ChartIncreaseIcon,
    } from '@hugeicons/core-free-icons';
import VenueCard from '@/components/courts/VenueCard';
import CourtModal from '@/components/courts/CourtModal';
import MaintenanceModal from '@/components/courts/MaintenanceModal';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';
import { SoccerIcon, PadelIcon, TennisIcon, BasketballIcon, VolleyballIcon } from '@/components/icons/SportsIcons';

// --- CONSTANTES ---
const AVAILABLE_SPORTS = ['Fútbol', 'Futbolito', 'Pádel', 'Tenis', 'Básquetbol', 'Vóleibol'];

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
interface Venue {
    id: string;
    name: string;
    address: string;
    imageUrl?: string;
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

export default function CourtsPage() {
    const { user, role, firestoreUser } = useAuth();

    // ESTADOS
    const [loading, setLoading] = useState(true);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [courts, setCourts] = useState<Court[]>([]);
    const [activeTab, setActiveTab] = useState<'config' | 'courts'>('config');
    const [dirty, setDirty] = useState(false);
    const markDirty = () => setDirty(true);

    // CONFIGURACIÓN
    const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
    const [selectedSports, setSelectedSports] = useState<string[]>([]);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [pricingMatrix, setPricingMatrix] = useState<SportPricing>({});
    const [venueImageLoading, setVenueImageLoading] = useState(false);

    // HELPER PARA NORMALIZAR DEPORTES (TILDES Y MAYUSCULAS)
    const normalizeSport = (str: string) => canonicalSport(str);
    const isSportSelected = (sport: string) => selectedSports.some(s => normalizeSport(s) === normalizeSport(sport));

    // FILTRO Y MODAL
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

    const { toast: showToast, confirm } = useFeedback();

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
                // Imagen principal: imageUrl (la vigente) o imageURL (variante antigua); deportes con nombre oficial
                const image = venueData.imageUrl || venueData.imageURL;
                venuesList.push({ id: docTenant.id, ...venueData, imageUrl: image, imageURL: image,
                    activeSports: [...new Set((venueData.activeSports || []).map(canonicalSport))], realCourtCount: snapCourts.size });
            }));
            setVenues(venuesList);
            if (venuesList.length > 0) {
                const firstVenue = venuesList[0];
                const hasMultiRecinto = firstVenue.features?.multiRecinto;
                if (hasMultiRecinto === false) {
                    setSelectedVenue(firstVenue);
                }
            }
        } catch {
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
            const loadedSchedule = { ...DEFAULT_WEEKLY_SCHEDULE };
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

            if (selectedVenue.schedule && selectedVenue.activeSports?.length > 0) setActiveTab('courts');
            else setActiveTab('config');
        }
    }, [selectedVenue]);

    const handleVenueImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && selectedVenue) {
            setVenueImageLoading(true);
            try {
                const compressedBase64 = await compressImage(e.target.files[0]);
                await updateDoc(doc(db, "tenants", selectedVenue.id), { imageUrl: compressedBase64, imageURL: deleteField() });
                setSelectedVenue({ ...selectedVenue, imageUrl: compressedBase64, imageURL: compressedBase64 });
                setVenues(prev => prev.map(v => v.id === selectedVenue.id ? { ...v, imageUrl: compressedBase64, imageURL: compressedBase64 } : v));
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
            } catch {
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
        } catch {
            showToast("Error al eliminar foto", 'error');
        }
    };

    const timeSlots = timeSlotsFor(weeklySchedule);

    const toggleSport = (sport: string) => {
        if (isSportSelected(sport)) {
            setSelectedSports(prev => prev.filter(s => normalizeSport(s) !== normalizeSport(sport)));
        } else {
            setSelectedSports(prev => [...prev, sport]);
        }
        markDirty();
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
                activeSports: [...new Set(selectedSports.map(canonicalSport))],
                amenities: selectedAmenities,
                // Precios por deporte con el nombre oficial (antes convivían "Pádel" y "Padel")
                pricing: mergePricing(pricingMatrix, selectedSports),
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
            const courtData = { tenantId: selectedVenue.id, ...courtForm, sport: canonicalSport(courtForm.sport), status: 'active' };
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
            const now = new Date();
            // Filtro por recinto y cancha (dos igualdades: sin índice compuesto); la fecha se filtra aquí.
            // El recinto es obligatorio: las reglas solo dejan leer reservas de los recintos donde se trabaja.
            const snap = await getDocs(query(collection(db, "bookings"), where("tenantId", "==", courtToDelete?.tenantId || ""), where("courtId", "==", courtId)));
            const active = snap.docs.map(d => normalizeBooking(d.id, d.data()))
                .filter(b => isReal(b) && b.state !== 'cancelled' && !b.isNoShow && b.start && b.start >= now).length;
            if (active > 0) {
                showToast(`No se puede eliminar: tiene ${active} ${active === 1 ? 'reserva pagada próxima' : 'reservas pagadas próximas'}. Ponla en mantenimiento (se anulan con devolución) o espera a que pasen.`, 'error');
                return;
            }
        } catch (e) {
            console.error("Error verificando reservas de la cancha:", e);
            showToast("No se pudo verificar si la cancha tiene reservas. Intenta nuevamente.", 'error');
            return;
        }
        if (!(await confirm({ title: "Eliminar Activo", message: "¿Seguro que deseas eliminar esta cancha permanentemente? Esta acción es irreversible.", tone: "danger" }))) return;
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
            
    };

    const handleOpenMaintenance = (court: Court) => { setMaintenanceCourt(court); setMaintenanceConflicts([]); setIsMaintenanceModalOpen(true); };
    const checkMaintenanceConflicts = async () => {
        if (!maintenanceCourt || !selectedVenue) return;
        const { start, end } = maintenanceRange(maintenanceForm);
        if (!(end > start)) { showToast("El término debe ser posterior al inicio", 'error'); return []; }
        try {
            // Reservas pagadas y vigentes de esa cancha que se cruzan con la ventana (incluye las que empiezan antes)
            const list = await listBookings([selectedVenue.id], { from: new Date(start.getTime() - 4 * 3600000), to: end });
            const active = list.filter(b => b.courtId === maintenanceCourt.id && isReal(b) && b.state !== 'cancelled' && !b.isNoShow && b.start
                && b.start < end && new Date(b.start.getTime() + 3600000) > start)
                .map(b => ({ ...b.raw, id: b.id, clientName: b.clientName, startTime: b.startTime, price: b.price, start: b.start }));
            setMaintenanceConflicts(active);
            showToast(active.length > 0 ? `Hay ${active.length} ${active.length === 1 ? 'reserva pagada' : 'reservas pagadas'} en ese periodo.` : "Sin reservas en ese periodo", active.length > 0 ? 'info' : 'success');
            return active;
        } catch (e: any) {
            console.error(e);
            showToast(e?.code === 'permission-denied' ? "No tienes permisos para revisar estas reservas" : "No se pudieron revisar las reservas. Intenta de nuevo.", 'error');
            return null;
        }
    };
    const handleConfirmMaintenance = async () => {
        if (!maintenanceCourt) return;
        // Siempre se revisa antes de bloquear (aunque no se haya pulsado "Verificar conflictos")
        const conflicts = await checkMaintenanceConflicts();
        if (conflicts === null || conflicts === undefined) return;
        if (conflicts.length > 0) {
            const total = conflicts.reduce((acc: number, c: any) => acc + Number(c.price || 0), 0);
            if (!(await confirm({ title: "Hay reservas pagadas", message: `${conflicts.length === 1 ? 'Hay 1 reserva pagada' : `Hay ${conflicts.length} reservas pagadas`} en ese periodo (${conflicts.map((c: any) => `${c.clientName} ${c.startTime}`).join(', ')}). Si continúas, se anularán y se devolverá el 100% ($${formatPrice(total)}) a cada cliente por Mercado Pago.`, tone: "danger" }))) return;
                const failed: string[] = [];
                for (const c of conflicts) {
                    try {
                        const r = await postApi<{ success: boolean }>('/api/bookings/cancel', { bookingId: c.id, reason: 'Mantenimiento de cancha' });
                        if (!r.success) failed.push(`${c.clientName} ${c.startTime} (reembolso pendiente)`);
                    } catch (e: any) { failed.push(`${c.clientName} ${c.startTime}: ${e?.message || 'error'}`); }
                }
                await executeMaintenanceUpdate();
                if (failed.length) showToast(`Mantenimiento activado. Revisa: ${failed.join('; ')}`, 'error');
                
            return;
        }
        await executeMaintenanceUpdate();
    };

    const executeMaintenanceUpdate = async () => {
        if (!maintenanceCourt) return;
        try {
            const { start, end } = maintenanceRange(maintenanceForm);
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

    const courtsBySport = (sport: string) => courts.filter(c => normalizeSport(c.sport) === normalizeSport(sport)).length;
    const formatPrice = (n: number) => n.toLocaleString('es-CL');

    // PROGRESO DE CONFIGURACIÓN
    const configSteps = [
        { label: 'Imagen', done: !!selectedVenue?.imageURL },
        { label: 'Galería', done: (selectedVenue?.gallery || []).length > 0 },
        { label: 'Disciplinas', done: selectedSports.length > 0 },
        { label: 'Horario', done: Object.values(weeklySchedule).some(d => d.isOpen) },
        { label: 'Tarifas', done: selectedSports.some(s => timeSlots.some(t => ((pricingMatrix[s]?.weekday?.[t] ?? 0) > 0) || ((pricingMatrix[s]?.weekend?.[t] ?? 0) > 0))) },
    ];
    const configDoneCount = configSteps.filter(s => s.done).length;

    const totalCourts = venues.reduce((acc, v) => acc + (v.realCourtCount || 0), 0);
    const sportsSet = new Set<string>();
    venues.forEach(v => (v.activeSports || []).forEach(s => sportsSet.add(s)));
    const avgCourts = venues.length > 0 ? Math.round(totalCourts / venues.length) : 0;

    if (!selectedVenue) {
        return (
            <div className="w-full space-y-5 pb-10 text-left relative">
                {/* CABECERA ADN FINANCE STYLE */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
                    <PageTitle eyebrow="Gestión de activos físicos">Infraestructura de <Accent>Recintos</Accent></PageTitle>

                    <div className="flex items-center gap-2 p-1.5 rounded-md">
                        <button
                            onClick={fetchVenues}
                            className="px-6 py-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[11px] md:text-[9px] uppercase tracking-[0.2em] rounded-md transition-all hover:brightness-110 active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center gap-2"
                        >
                            <HugeiconsIcon icon={RefreshIcon} className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> ACTUALIZAR RED
                        </button>
                    </div>
                </div>

                {/* KPIs REALES */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
                    <TarjetaKpi titulo="Recintos" valor={venues.length} sub="Sedes activas" icono={<HugeiconsIcon icon={Store01Icon} className="w-6 h-6" strokeWidth={1.6} />} brillo />
                    <TarjetaKpi titulo="Canchas" valor={totalCourts} sub="Total de activos" icono={<HugeiconsIcon icon={FootballPitchIcon} className="w-6 h-6" strokeWidth={1.6} />} />
                    <TarjetaKpi titulo="Deportes" valor={sportsSet.size} sub="Disciplinas activas" icono={<HugeiconsIcon icon={FootballIcon} className="w-6 h-6" strokeWidth={1.6} />} />
                    <TarjetaKpi titulo="Promedio" valor={avgCourts} sub="Canchas por recinto" icono={<HugeiconsIcon icon={ChartIncreaseIcon} className="w-6 h-6" strokeWidth={1.6} />} />
                </div>

                {loading ? (
                    <div className="text-center py-40 animate-pulse">
                        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Escaneando Infraestructura...</p>
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
            {/* BREADCRUMB */}
            <div className="flex items-center gap-2 text-xs md:text-[10px] font-black uppercase tracking-wider">
                <button onClick={() => setSelectedVenue(null)} className="text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] transition-colors">Recintos</button>
                <span className="text-slate-300 dark:text-white/20">/</span>
                <span className="text-emerald-600 dark:text-[#00df82] truncate">{selectedVenue.name}</span>
                <span className="text-slate-300 dark:text-white/20">/</span>
                <span className="text-slate-400">{activeTab === 'config' ? 'Infraestructura' : 'Gestión de canchas'}</span>
            </div>

            {/* CABECERA MAESTRA */}
            <div className="relative overflow-hidden rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
                <div className="absolute inset-0 h-32 bg-linear-to-r from-emerald-500/20 to-indigo-500/20 opacity-30 blur-3xl -top-10"></div>
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
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] text-[11px] md:text-[8px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">Gestión de activos</span>
                                    <span className="text-slate-300 dark:text-white/10">•</span>
                                    <p className="text-[11px] md:text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
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
                                className={`flex items-center gap-2.5 px-6 py-3 text-xs md:text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'config' ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                            >
                                <HugeiconsIcon icon={Settings01Icon} className="w-4 h-4" /> Infraestructura
                            </button>
                            <button
                                onClick={() => isConfigured ? setActiveTab('courts') : showToast("Define los deportes primero", 'error')}
                                className={`flex items-center gap-2.5 px-6 py-3 text-xs md:text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'courts' ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                            >
                                <HugeiconsIcon icon={Grid02Icon} className="w-4 h-4" /> Gestión de canchas
                            </button>
                        </div>
                    </div>

                    {/* STATS RÁPIDOS */}
                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <p className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Canchas</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">{courts.length}</p>
                        </div>
                        <div className="p-3.5 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <p className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Deportes</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">{selectedVenue.activeSports?.length || 0}</p>
                        </div>
                        <div className="p-3.5 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <p className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Horario</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">{selectedVenue.openingHours || '08:00 - 23:00'}</p>
                        </div>
                        <div className="p-3.5 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <p className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Tramos tarifarios</p>
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
                                            <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-[#00df82] mb-1.5">Estado de configuración</p>
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">{configDoneCount} de 5 pasos</p>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-md text-[11px] font-black font-mono ${configDoneCount === 5 ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border border-emerald-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/10'}`}>{Math.round((configDoneCount / 5) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-6">
                                        <div className="h-full bg-emerald-500 dark:bg-[#00df82] rounded-full transition-all duration-500" style={{ width: `${(configDoneCount / 5) * 100}%` }} />
                                    </div>
                                    <div className="space-y-2.5">
                                        {configSteps.map((step, i) => (
                                            <div key={step.label} className={`flex items-center gap-3 p-2.5 rounded-md border transition-all ${step.done ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/15' : 'bg-slate-50/50 dark:bg-white/2 border-slate-100 dark:border-white/5'}`}>
                                                <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${step.done ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
                                                    {step.done ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={2} /> : <span className="font-mono text-xs md:text-[10px] font-black">{String(i + 1).padStart(2, '0')}</span>}
                                                </span>
                                                <span className="flex-1 text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{step.label}</span>
                                                <span className={`text-[11px] md:text-[8px] font-black uppercase ${step.done ? 'text-emerald-600 dark:text-[#00df82]' : 'text-slate-300 dark:text-white/20'}`}>{step.done ? 'Listo' : 'Pendiente'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </PanelGlass>

                                <PanelGlass className="p-6 rounded-md">
                                    <p className="text-xs md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Datos rápidos</p>
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
                                    <div className="relative aspect-16/7 rounded-md overflow-hidden border border-slate-200 dark:border-white/5 shadow-lg transition-all group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        {selectedVenue.imageURL ? (
                                            <img src={selectedVenue.imageURL} alt="Portada del recinto" referrerPolicy="no-referrer" onError={hideBrokenImg} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-50 dark:bg-black/20 flex flex-col items-center justify-center text-slate-300 gap-3">
                                                <HugeiconsIcon icon={Camera01Icon} className="w-10 h-10 opacity-20" strokeWidth={1.4} />
                                                <span className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em]">Sin imagen de portada</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                                            <div className="bg-white/10 p-4 rounded-md border border-white/20">
                                                <HugeiconsIcon icon={PencilEdit02Icon} className="w-8 h-8 text-white" strokeWidth={1.6} />
                                            </div>
                                        </div>
                                        {venueImageLoading && <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center"><HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 text-white animate-spin" strokeWidth={1.6} /></div>}
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleVenueImageUpload} />

                                    <div className="flex items-center justify-between mt-6 mb-3">
                                        <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Galería ({Math.min((selectedVenue.gallery || []).length, 6)}/6)</p>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-1">
                                        {(selectedVenue.gallery || []).map((img, idx) => (
                                            <div key={idx} className="relative w-28 h-16 shrink-0 rounded-md overflow-hidden group border border-slate-200 dark:border-white/5 shadow-md">
                                                <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button aria-label="Eliminar" onClick={() => handleRemoveGalleryImage(idx)} className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors shadow-lg">
                                                        <HugeiconsIcon icon={Delete02Icon} className="w-3.5 h-3.5" strokeWidth={1.8} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {(selectedVenue.gallery || []).length < 6 && (
                                            <div className="relative w-28 h-16 shrink-0 rounded-md border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                                <HugeiconsIcon icon={Image01Icon} className="w-5 h-5 text-slate-300 dark:text-white/20 group-hover:text-emerald-500 transition-colors" strokeWidth={1.6} />
                                                <span className="text-[11px] md:text-[8px] font-black uppercase text-slate-400">Añadir</span>
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleGalleryUpload} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </PanelGlass>

                            {/* DEPORTES */}
                            <PanelGlass className="overflow-hidden">
                                <PanelHeader titulo="Deportes disponibles" desc="Define las disciplinas del recinto" icon={TrophyIcon} action={
                                    <span className="hidden sm:inline-flex items-center gap-2 text-[11px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">
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
                                                    <span className={`block text-[11px] md:text-[8px] font-black uppercase font-mono mt-0.5 ${selected ? 'text-white/80' : 'text-slate-300 dark:text-white/20'}`}>{courtsBySport(s)} canchas</span>
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
                            <OperationPanel
                                schedule={weeklySchedule} onScheduleChange={(next) => { setWeeklySchedule(next); markDirty(); }}
                                sports={selectedSports} pricing={pricingMatrix} onPricingChange={(next) => { setPricingMatrix(next); markDirty(); }}
                                timeSlots={timeSlots} notify={showToast} />
                        </div>
                    </>
                ) : (
                    <CourtFleet courts={courts} selectedSports={selectedSports} pricingMatrix={pricingMatrix} venueName={selectedVenue.name}
                        onCreate={handleOpenCreate} onEdit={handleOpenEdit} onMaintenance={handleOpenMaintenance}
                        onRestore={handleRestoreCourt} onDelete={handleDeleteCourt} />
                )}
            </div>

            {/* BARRA DE GUARDADO FIJA (solo infraestructura) */}
            {activeTab === 'config' && (
                <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
                    <div className="max-w-6xl mx-auto pointer-events-auto rounded-md bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-2xl px-5 py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${dirty ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <p className="text-xs md:text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                {dirty ? 'Cambios sin guardar' : 'Infraestructura sincronizada'}
                            </p>
                        </div>
                        <button
                            onClick={handleSaveConfig}
                            disabled={!dirty}
                            className="flex items-center gap-2 px-8 py-3 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-xs md:text-[10px] uppercase tracking-[0.2em] rounded-md shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
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