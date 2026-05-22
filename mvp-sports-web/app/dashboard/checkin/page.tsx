"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { auditService } from '@/services/auditService';
import { collection, query, where, getDocs, getDoc, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import {
    MagnifyingGlassIcon,
    QrCodeIcon,
    CheckCircleIcon,
    CurrencyDollarIcon,
    ArrowPathIcon,
    IdentificationIcon,
    TicketIcon,
    XMarkIcon,
    VideoCameraSlashIcon,
    MapPinIcon,
    BuildingStorefrontIcon,
    ChevronDownIcon,
    CameraIcon,
    BanknotesIcon,
    ExclamationCircleIcon,
    HandThumbUpIcon,
    InformationCircleIcon,
    UserGroupIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    NoSymbolIcon
} from '@heroicons/react/24/outline';

const StatusModal = ({ isOpen, title, message, type, onClose }: any) => {
    if (!isOpen) return null;
    const isError = type === 'error';
    const isWarning = type === 'warning';

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6 overflow-hidden relative text-center" onClick={(e) => e.stopPropagation()}>
                <div className={`absolute top-0 left-0 w-full h-1 ${isError ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${isError ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : isWarning ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'}`}>
                    {isError ? <XMarkIcon className="w-8 h-8" /> : isWarning ? <ExclamationCircleIcon className="w-8 h-8" /> : <InformationCircleIcon className="w-8 h-8" />}
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">{title}</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-8 uppercase leading-relaxed">{message}</p>
                <button onClick={onClose} className={`w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl text-white shadow-lg transition-all active:scale-95 ${isError ? 'bg-red-600 shadow-red-500/20' : isWarning ? 'bg-amber-600 shadow-amber-500/20' : 'bg-slate-900 dark:bg-emerald-600 shadow-emerald-500/20'}`}>
                    Entendido
                </button>
            </div>
        </div>
    );
};

// --- INTERFACES ---
interface Booking {
    id: string;
    courtId?: string;
    courtName: string;
    sport?: string;
    clientName: string;
    startTime: Timestamp;
    endTime: Timestamp;
    date?: Timestamp;
    startTimeStr?: string | null;
    endTimeStr?: string | null;
    status: string;
    paymentStatus: 'paid' | 'pending' | 'partial' | 'no-show';
    paymentMethod?: string;
    price: number;
    totalPrice?: number;
    deposit?: number;
    remainingBalance?: number;
    checkIn?: boolean;
    checkInTime?: Timestamp;
    userId?: string;
    noShow?: boolean;
    notes?: string;
}

// --- HELPER: CHILE TIME ---
const getChileNow = () => {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }));
};

export default function CheckInPage() {
    const { user, role, firestoreUser } = useAuth();

    // ESTADOS DE DATOS
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [venues, setVenues] = useState<{ id: string, name: string }[]>([]);
    const [selectedVenueId, setSelectedVenueId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled' | 'noshow'>('pending');
    const [selectedBookingForConfirm, setSelectedBookingForConfirm] = useState<Booking | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
    const [confirmActionType, setConfirmActionType] = useState<'pay' | 'checkin'>('checkin');
    // ESTADOS DE CÁMARA
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
    const qrScannerRef = useRef<Html5Qrcode | null>(null);
    const [statusModal, setStatusModal] = useState<{ isOpen: boolean, title: string, message: string, type: 'info' | 'error' | 'warning' }>({
        isOpen: false, title: '', message: '', type: 'info'
    });

    // --- 1. CARGAR RECINTOS ---
    useEffect(() => {
        const fetchVenues = async () => {
            if (!user?.uid) return;
            try {
                let list: { id: string, name: string }[] = [];
                if (role === 'manager' || role === 'staff') {
                    const tenantIds = firestoreUser?.tenantIds || (firestoreUser?.tenantId ? [firestoreUser.tenantId] : []);
                    if (tenantIds.length > 0) {
                        const chunkArray = (arr: any[], size: number) =>
                            Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
                        const promises = chunkArray(tenantIds, 10).map(async (chunk) => {
                            const q = query(collection(db, "tenants"), where("__name__", "in", chunk));
                            const snap = await getDocs(q);
                            return snap.docs.map(d => ({ id: d.id, name: d.data().name }));
                        });
                        const results = await Promise.all(promises);
                        list = results.flat();
                    }
                } else {
                    const q = query(collection(db, "tenants"), where("ownerId", "==", user.uid));
                    const snap = await getDocs(q);
                    list = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
                }
                setVenues(list);
                if (list.length > 0) setSelectedVenueId(list[0].id);
            } catch (error) { console.error("Error venues:", error); }
        };
        fetchVenues();
    }, [user, role, firestoreUser]);

    // --- 1.B CARGAR RESERVAS DEL DÍA ---
    const fetchTodayBookings = async () => {
        if (!selectedVenueId) return;
        setLoading(true);
        try {
            const now = getChileNow();
            if (now.getHours() < 6) {
                now.setDate(now.getDate() - 1);
            }
            const startOfDay = new Date(now);
            startOfDay.setHours(6, 0, 0, 0);
            const endOfDay = new Date(now);
            endOfDay.setDate(endOfDay.getDate() + 1);
            endOfDay.setHours(5, 59, 59, 999);
            // Query por campo 'date' (Timestamp)
            const q1 = query(
                collection(db, "bookings"),
                where("tenantId", "==", selectedVenueId),
                where("date", ">=", Timestamp.fromDate(startOfDay)),
                where("date", "<=", Timestamp.fromDate(endOfDay))
            );
            // Query por campo 'startTime' como Timestamp (reservas antiguas)
            const q2 = query(
                collection(db, "bookings"),
                where("tenantId", "==", selectedVenueId),
                where("startTime", ">=", Timestamp.fromDate(startOfDay)),
                where("startTime", "<=", Timestamp.fromDate(endOfDay))
            );

            const [snap1, snap2] = await Promise.all([
                getDocs(q1).catch(() => ({ docs: [] as any[] })),
                getDocs(q2).catch(() => ({ docs: [] as any[] }))
            ]);

            // Merge + deduplicate
            const allDocsMap = new Map<string, any>();
            [...snap1.docs, ...snap2.docs].forEach(d => {
                if (!allDocsMap.has(d.id)) allDocsMap.set(d.id, d);
            });

            const list = Array.from(allDocsMap.values()).map(d => {
                const data = d.data();
                // Normalize date/startTime fields
                const dateTs = data.date && data.date.toDate ? data.date : (data.startTime && data.startTime.toDate ? data.startTime : Timestamp.now());
                const endTs = data.endTime && typeof data.endTime !== 'string' ? data.endTime : (dateTs ? Timestamp.fromDate(new Date(dateTs.toDate().getTime() + 3600000)) : null);

                return {
                    id: d.id,
                    ...data,
                    price: data.price !== undefined ? data.price : (data.totalPrice || 0),
                    sport: data.sport || data.category || '',
                    date: dateTs,
                    startTime: dateTs,
                    endTime: endTs,
                    startTimeStr: typeof data.startTime === 'string' ? data.startTime : null,
                    endTimeStr: typeof data.endTime === 'string' ? data.endTime : null
                } as Booking;
            });

            // Obtener todos los bookingIds para buscar pagos en la colección 'payments'
            const bookingIds = list.map(b => b.id);
            const paidBookingIds = new Set<string>();

            if (bookingIds.length > 0) {
                const chunks: string[][] = [];
                for (let i = 0; i < bookingIds.length; i += 30) {
                    chunks.push(bookingIds.slice(i, i + 30));
                }

                const paymentSnaps = await Promise.all(
                    chunks.map(chunk => 
                        getDocs(query(
                            collection(db, "payments"),
                            where("bookingId", "in", chunk)
                        )).catch(() => ({ docs: [] as any[] }))
                    )
                );

                paymentSnaps.forEach(snap => {
                    snap.docs.forEach(doc => {
                        const payData = doc.data();
                        if (payData && payData.bookingId) {
                            paidBookingIds.add(payData.bookingId);
                        }
                    });
                });
            }

            // Actualizar localmente el estado de pago a 'paid' si existe registro en 'payments'
            const updatedList = list.map(b => {
                if (paidBookingIds.has(b.id)) {
                    return {
                        ...b,
                        paymentStatus: 'paid'
                    } as Booking;
                }
                return b;
            });

            setBookings(updatedList);
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedVenueId) fetchTodayBookings();
    }, [selectedVenueId]);

    // --- 2. CÁMARA (Usando html5-qrcode para máxima compatibilidad) ---
    const startCamera = async () => {
        // Intentamos primero el modo streaming (solo funcionará en HTTPS)
        setIsCameraOpen(true);
        setCameraError(null);

        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode("qr-reader");
                qrScannerRef.current = scanner;
                await scanner.start(
                    { facingMode: "environment" },
                    { 
                        fps: 30, 
                        qrbox: (w, h) => {
                            const size = Math.floor(Math.min(w, h) * 0.8);
                            return { width: size, height: size };
                        },
                    },
                    (decodedText) => {
                        const found = bookings.find(b => b.id === decodedText || b.id.slice(-6).toUpperCase() === decodedText.toUpperCase());
                        if (found) {
                            if (found.checkIn) {
                                setStatusModal({ isOpen: true, title: "Ya Ingresó", message: `${found.clientName} ya registró su entrada para esta reserva.`, type: 'warning' });
                            } else {
                                handleCheckInAction(found);
                            }
                            stopCamera();
                        }
                    },
                    () => { }
                );
            } catch (err) {
                // Si falla el streaming (ej. no hay HTTPS), activamos automáticamente el fallback nativo
                console.warn("Streaming not supported, triggering native camera fallback.");
                stopCamera();
                const nativeInput = document.getElementById('native-camera-input') as HTMLInputElement;
                if (nativeInput) nativeInput.click();
            }
        }, 300);
    };

    const handleNativeCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Mostrar un pequeño loader si fuera necesario
        const scanner = new Html5Qrcode("qr-reader-hidden");
        try {
            const decodedText = await scanner.scanFile(file, true);
            const found = bookings.find(b => b.id === decodedText || b.id.slice(-6).toUpperCase() === decodedText.toUpperCase());
            if (found) {
                if (found.checkIn) setStatusModal({ isOpen: true, title: "Ya Ingresó", message: `${found.clientName} ya registró su entrada.`, type: 'warning' });
                else handleCheckInAction(found);
            } else {
                setStatusModal({ isOpen: true, title: "QR Inválido", message: "No se reconoció ninguna reserva vigente en la imagen capturada.", type: 'error' });
            }
        } catch (err) {
            setStatusModal({ isOpen: true, title: "Error de Escaneo", message: "No se detectó un código QR. Intenta tomar la foto más cerca, enfocada y con buena iluminación.", type: 'error' });
        }
    };

    const stopCamera = async () => {
        if (qrScannerRef.current) {
            try {
                if (qrScannerRef.current.isScanning) {
                    await qrScannerRef.current.stop();
                }
            } catch (e) {
                console.warn("Error stopping scanner:", e);
            }
            qrScannerRef.current = null;
        }
        setIsCameraOpen(false);
    };

    useEffect(() => {
        return () => {
            if (qrScannerRef.current && qrScannerRef.current.isScanning) {
                qrScannerRef.current.stop().catch(() => { });
            }
        };
    }, []);

    // Auto-check camera permission on mount (prompt on mobile)
    useEffect(() => {
        const checkCameraPermission = async () => {
            try {
                if (navigator.permissions && navigator.permissions.query) {
                    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
                    setCameraPermission(result.state as any);
                    result.onchange = () => setCameraPermission(result.state as any);
                } else {
                    setCameraPermission('unknown');
                }
            } catch {
                setCameraPermission('unknown');
            }
        };
        checkCameraPermission();
    }, []);

    const validateCheckInTime = (booking: Booking): { valid: boolean, message: string, isLate: boolean } => {
        const now = getChileNow();
        const start = booking.startTime.toDate();
        const startChile = new Date(start.toLocaleString("en-US", { timeZone: "America/Santiago" }));

        if (booking.startTimeStr) {
            const [hours, minutes] = booking.startTimeStr.split(':').map(Number);
            startChile.setHours(hours, minutes, 0, 0);
        }

        const twoHoursBefore = new Date(startChile.getTime() - 2 * 60 * 60 * 1000);
        const fifteenMinsAfter = new Date(startChile.getTime() + 15 * 60 * 1000);

        if (now < twoHoursBefore) {
            const h = twoHoursBefore.getHours().toString().padStart(2, '0');
            const m = twoHoursBefore.getMinutes().toString().padStart(2, '0');
            return { valid: false, message: `Demasiado temprano. El ingreso se habilita a las ${h}:${m} hrs.`, isLate: false };
        }

        if (now > fifteenMinsAfter) {
            return { valid: false, message: "Límite de espera excedido (15 min). La reserva se considera cancelada.", isLate: true };
        }

        return { valid: true, message: "", isLate: now > startChile };
    };

    const handleCheckInAction = (booking: Booking) => {
        const validation = validateCheckInTime(booking);
        if (!validation.valid) {
            setStatusModal({ isOpen: true, title: "Acceso Denegado", message: validation.message, type: 'error' });
            return;
        }

        // Asegurar que el startTime/endTime sean Timestamps válidos
        let startTimeDate: Date;
        if (booking.startTime && (booking.startTime as any).toDate) {
            startTimeDate = booking.startTime.toDate();
        } else if (booking.date && (booking.date as any).toDate) {
            startTimeDate = booking.date.toDate();
        } else {
            startTimeDate = new Date();
        }

        let endTimeDate: Date;
        if (booking.endTime && (booking.endTime as any).toDate) {
            endTimeDate = booking.endTime.toDate();
        } else {
            endTimeDate = new Date(startTimeDate.getTime() + 3600000);
        }

        setSelectedBookingForConfirm({
            ...booking,
            startTime: Timestamp.fromDate(startTimeDate),
            endTime: Timestamp.fromDate(endTimeDate)
        });
        setSelectedPaymentMethod('cash');
        setIsConfirmModalOpen(true);
    };

    const confirmCheckIn = async () => {
        if (!selectedBookingForConfirm) return;

        const booking = selectedBookingForConfirm;
        setProcessingId(booking.id);

        try {
            const updateData: any = {};
            if (confirmActionType === 'pay') {
                updateData.paymentStatus = 'paid';
                updateData.remainingBalance = 0;
                updateData.paymentMethod = selectedPaymentMethod;
                
                await updateDoc(doc(db, "bookings", booking.id), updateData);
                setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, paymentStatus: 'paid', paymentMethod: selectedPaymentMethod, remainingBalance: 0 } : b));
                
                await auditService.logAuditEvent({
                    action: 'RESERVA_PAGO',
                    module: 'Acceso/CheckIn',
                    details: `Registro de pago exitoso para la reserva ${booking.id} (${booking.clientName}) de la cancha ${booking.courtName}. Método: ${selectedPaymentMethod}.`,
                    severity: 'LOW',
                    status: 'SUCCESS'
                });

                setStatusModal({ isOpen: true, title: "Pago Registrado", message: `El pago de ${booking.clientName} ha sido procesado exitosamente.`, type: 'info' });
            } else {
                updateData.checkIn = true;
                updateData.checkInTime = Timestamp.now();
                updateData.status = 'active';
                
                await updateDoc(doc(db, "bookings", booking.id), updateData);
                setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, checkIn: true, status: 'active' } : b));
                
                await auditService.logAuditEvent({
                    action: 'RESERVA_CHECKIN',
                    module: 'Acceso/CheckIn',
                    details: `Ingreso registrado para la reserva ${booking.id} (${booking.clientName}) de la cancha ${booking.courtName}.`,
                    severity: 'LOW',
                    status: 'SUCCESS'
                });

                setStatusModal({ isOpen: true, title: "Ingreso Exitoso", message: `El ingreso de ${booking.clientName} ha sido registrado correctamente y la reserva está en juego.`, type: 'info' });
            }

            setIsConfirmModalOpen(false);
            setSelectedBookingForConfirm(null);
        } catch (error: any) {
            console.error("Error confirming check-in:", error);
            const isPay = confirmActionType === 'pay';
            await auditService.logAuditEvent({
                action: isPay ? 'RESERVA_PAGO' : 'RESERVA_CHECKIN',
                module: 'Acceso/CheckIn',
                details: `Falla al procesar ${isPay ? 'pago' : 'ingreso'} para la reserva ${booking.id} (${booking.clientName}). Error: ${error.message || error}`,
                severity: 'MEDIUM',
                status: 'FAILED'
            });

            const errorMsg = error?.code === 'permission-denied'
                ? "Permiso denegado. Tu cuenta no tiene privilegios para modificar esta reserva."
                : "Hubo un error al procesar el ingreso. Reintenta.";
            setStatusModal({ isOpen: true, title: "Falla de Sistema", message: errorMsg, type: 'error' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleNoShow = async (booking: Booking) => {
        if (!booking.id) return;
        setProcessingId(booking.id);
        try {
            const batchData: any = {
                status: 'cancelled',
                noShow: true,
                updatedAt: Timestamp.now()
            };

            // 1. Actualizar Reserva
            await updateDoc(doc(db, "bookings", booking.id), batchData);

            await auditService.logAuditEvent({
                action: 'RESERVA_NOSHOW',
                module: 'Acceso/CheckIn',
                details: `Reserva ${booking.id} de ${booking.clientName} marcada como No-Show.`,
                severity: 'MEDIUM',
                status: 'SUCCESS'
            });

            // 2. Aplicar Strike al Usuario si existe
            if (booking.userId) {
                const userRef = doc(db, 'users', booking.userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    await updateDoc(userRef, {
                        strikes: (userSnap.data().strikes || 0) + 1,
                        lastStrikeAt: Timestamp.now()
                    });

                    await auditService.logAuditEvent({
                        action: 'JUGADOR_STRIKE',
                        module: 'Acceso/CheckIn',
                        details: `Strike aplicado al usuario ${booking.userId} por inasistencia (No-Show) a la reserva ${booking.id}.`,
                        severity: 'HIGH',
                        status: 'SUCCESS'
                    });
                }
            }

            setBookings(prev => prev.map(b =>
                b.id === booking.id ? { ...b, status: 'cancelled', noShow: true } : b
            ));

            setStatusModal({
                isOpen: true,
                title: "No-Show Registrado",
                message: `Se ha cancelado la reserva y aplicado un strike a ${booking.clientName}.`,
                type: 'info'
            });
        } catch (error: any) {
            console.error("Error in handleNoShow:", error);
            await auditService.logAuditEvent({
                action: 'RESERVA_NOSHOW',
                module: 'Acceso/CheckIn',
                details: `Falla al registrar No-Show para la reserva ${booking.id} (${booking.clientName}). Error: ${error.message || error}`,
                severity: 'HIGH',
                status: 'FAILED'
            });

            setStatusModal({ isOpen: true, title: "Falla de Sistema", message: "No se pudo registrar el No-Show.", type: 'error' });
        } finally {
            setProcessingId(null);
        }
    };

    const processManualCode = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim()) return;
        const found = bookings.find(b =>
            b.id.slice(-6).toUpperCase() === manualCode.toUpperCase() ||
            b.clientName.toLowerCase().includes(manualCode.toLowerCase())
        );
        if (found) {
            if (found.checkIn) setStatusModal({ isOpen: true, title: "Ya Ingresó", message: `${found.clientName} ya registró su entrada anteriormente.`, type: 'warning' });
            else handleCheckInAction(found);
            setManualCode('');
        } else {
            setStatusModal({ isOpen: true, title: "Sin Resultados", message: "No se encontró ninguna reserva para hoy con los datos ingresados.", type: 'warning' });
        }
    };

    // FORMATTERS
    const formatMoney = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);
    const formatTime = (ts: Timestamp) => {
        const d = ts.toDate();
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    // HELPERS DE MOTIVOS DE CANCELACIÓN
    const isBookingNoShow = (b: Booking) => {
        if (b.paymentStatus === 'no-show' || b.noShow === true) return true;
        if (b.notes && (b.notes.toLowerCase().includes('no-show') || b.notes.toLowerCase().includes('inasistencia'))) return true;
        return false;
    };

    const isBookingNoShowOrLate = (b: Booking) => {
        if (isBookingNoShow(b)) return true;
        if (!b.checkIn && b.status !== 'cancelled' && validateCheckInTime(b).isLate) return true;
        return false;
    };

    // FILTROS
    const filteredBookings = bookings.filter(b => {
        const matchesSearch = b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || b.courtName.toLowerCase().includes(searchTerm.toLowerCase());
        if (filter === 'pending') return matchesSearch && !b.checkIn && b.status !== 'cancelled' && !isBookingNoShowOrLate(b);
        if (filter === 'completed') return matchesSearch && b.checkIn;
        if (filter === 'cancelled') return matchesSearch && b.status === 'cancelled' && !isBookingNoShow(b);
        if (filter === 'noshow') return matchesSearch && isBookingNoShowOrLate(b);
        return matchesSearch;
    });

    const stats = {
        total: bookings.length,
        in: bookings.filter(b => b.checkIn || (isBookingNoShowOrLate(b) && (b.paymentStatus === 'paid' || b.paymentStatus === 'partial'))).length,
        pending: bookings.filter(b => !b.checkIn && b.status !== 'cancelled' && !validateCheckInTime(b).isLate).length,
        noShow: bookings.filter(b => isBookingNoShowOrLate(b)).length,
        cancelled: bookings.filter(b => b.status === 'cancelled' && !isBookingNoShow(b)).length,
        paidCount: bookings.filter(b => b.paymentStatus === 'paid').length,
        unpaidCount: bookings.filter(b => b.paymentStatus !== 'paid' && b.status !== 'cancelled' && !isBookingNoShow(b)).length,
        totalDebt: bookings.reduce((acc, b) => {
            if (b.paymentStatus === 'paid' || b.status === 'cancelled' || isBookingNoShow(b)) return acc;
            const price = b.totalPrice || b.price || 0;
            const paid = b.paymentStatus === 'partial' ? (b.deposit || 0) : 0;
            return acc + (price - paid);
        }, 0),
        totalCollected: bookings.reduce((acc, b) => {
            if (b.paymentStatus === 'paid') return acc + (b.totalPrice || b.price || 0);
            if (b.paymentStatus === 'partial') return acc + (b.deposit || 0);
            return acc;
        }, 0),
        lostRevenue: bookings.filter(b => !b.checkIn && (b.status === 'cancelled' || isBookingNoShowOrLate(b)) && b.paymentStatus !== 'paid').reduce((acc, b) => {
            const price = b.totalPrice || b.price || 0;
            const paid = b.paymentStatus === 'partial' ? (b.deposit || 0) : 0;
            return acc + (price - paid);
        }, 0),
        potentialTotal: bookings.reduce((acc, b) => acc + (b.totalPrice || b.price || 0), 0)
    };

    return (
        <div className="space-y-6 animate-fadeIn font-sans pb-10 text-slate-600 dark:text-slate-300">
            <StatusModal
                isOpen={statusModal.isOpen}
                title={statusModal.title}
                message={statusModal.message}
                type={statusModal.type}
                onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
            />

            {/* === MODAL DE CÁMARA (Overlay Completo — funciona en móvil y web) === */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-fadeIn">
                    {/* Header Cámara */}
                    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
                        <span className="text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]"></span> Escaneando QR
                        </span>
                        <button onClick={stopCamera} className="p-2 bg-white/20 rounded-full text-white backdrop-blur-md active:scale-95 transition-transform">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Viewfinder Tunnel View - Ajustado según el ALTO */}
                    <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                        {!cameraError ? (
                            <div className="relative w-[70vh] h-[70vh] max-w-[90vw] max-h-[90vw] md:max-w-[400px] md:max-h-[400px] rounded-3xl overflow-hidden border-2 border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                                <div id="qr-reader" className="w-full h-full [&>video]:object-contain [&>video]:-scale-x-100"></div>
                                
                                {/* Guías Visuales Internas */}
                                <div className="absolute inset-0 pointer-events-none z-10">
                                    <div className="absolute border-[3px] border-transparent border-t-emerald-400 border-r-emerald-400 w-10 h-10 top-0 right-0 rounded-tr-2xl"></div>
                                    <div className="absolute border-[3px] border-transparent border-t-emerald-400 border-l-emerald-400 w-10 h-10 top-0 left-0 rounded-tl-2xl"></div>
                                    <div className="absolute border-[3px] border-transparent border-b-emerald-400 border-l-emerald-400 w-10 h-10 bottom-0 left-0 rounded-bl-2xl"></div>
                                    <div className="absolute border-[3px] border-transparent border-b-emerald-400 border-r-emerald-400 w-10 h-10 bottom-0 right-0 rounded-br-2xl"></div>
                                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_15px_#34D399] animate-scan-vertical opacity-80"></div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-white/70 gap-4 px-8 text-center max-w-sm">
                                <div className="p-4 bg-red-500/20 rounded-full"><VideoCameraSlashIcon className="w-10 h-10 text-red-500" /></div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-white">Cámara inaccesible</p>
                                    <p className="text-xs text-white/60 leading-relaxed">{cameraError}</p>
                                </div>
                                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                                    <button onClick={startCamera} className="w-full px-5 py-2.5 bg-white text-black rounded-xl text-xs font-black uppercase tracking-wide">Reintentar</button>
                                    <button onClick={stopCamera} className="w-full px-5 py-2.5 bg-red-500/20 text-red-500 rounded-xl text-xs font-bold uppercase tracking-wide">Cerrar</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* === HEADER FINANCE STYLE === */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">
                            Terminal de Control Operativo
                        </p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                        Gestión de <span className="text-emerald-500 dark:text-emerald-400">Acceso</span>
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                            <BuildingStorefrontIcon className="w-3.5 h-3.5" />
                        </div>
                        <select
                            value={selectedVenueId}
                            onChange={(e) => setSelectedVenueId(e.target.value)}
                            className="appearance-none bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-8 py-2 text-[9px] font-black outline-none text-slate-700 dark:text-white uppercase cursor-pointer shadow-sm transition-all focus:border-emerald-500"
                        >
                            {venues.map(v => <option key={v.id} value={v.id} className="dark:bg-[#0B0F19]">{v.name}</option>)}
                        </select>
                        <ChevronDownIcon className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button onClick={fetchTodayBookings} className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all active:scale-90" title="Sincronizar Datos">
                        <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* === KPI GRID PREMIUM COMPACT === */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="p-1.5 bg-slate-50 dark:bg-white/5 rounded-lg text-slate-400 group-hover:text-emerald-500 transition-colors">
                            <UserGroupIcon className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Afluencia Total</p>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.total}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase">{formatMoney(stats.potentialTotal)}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20 shadow-lg shadow-emerald-500/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-bl-full"></div>
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-500">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Ingresos OK</p>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{stats.in}</p>
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">{formatMoney(stats.totalCollected)}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-xl border border-amber-100 dark:border-amber-500/20 shadow-sm group">
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-500">
                            <BanknotesIcon className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Saldo por Cobrar</p>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tighter">{stats.unpaidCount}</p>
                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">{formatMoney(stats.totalDebt)}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-xl border border-red-100 dark:border-red-500/20 shadow-sm group">
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="p-1.5 bg-red-50 dark:bg-red-500/10 rounded-lg text-red-500">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[8px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Inasistencias</p>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <p className="text-2xl font-black text-red-600 dark:text-red-400 tracking-tighter">{stats.noShow}</p>
                        <p className="text-[8px] font-black text-red-600 dark:text-red-400 uppercase">Por Inasistencia</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm group">
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="p-1.5 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-400">
                            <NoSymbolIcon className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Anuladas</p>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <p className="text-2xl font-black text-slate-500 tracking-tighter">{stats.cancelled}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Cancelado por Jugador</p>
                    </div>
                </div>
            </div>

            {/* === ACCIÓN CENTRALIZADA COMPACT === */}
            <div className="flex flex-col sm:flex-row gap-2">
                <button
                    onClick={startCamera}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 h-12 px-6 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all shrink-0 group"
                    title="Activar Escáner de Acceso"
                >
                    <QrCodeIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Escáner de Acceso</span>
                </button>
                <form onSubmit={processManualCode} className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por código de reserva o nombre..."
                        className="w-full h-12 pl-10 pr-24 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 uppercase placeholder:normal-case placeholder:font-medium shadow-sm transition-all text-slate-800 dark:text-white"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-[9px] font-black uppercase active:scale-95 transition-all shadow-md disabled:opacity-50"
                        disabled={!manualCode}
                    >
                        Validar
                    </button>
                </form>
            </div>

            {/* Hidden inputs para el modo nativo / fallback */}
            <input
                id="native-camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleNativeCapture}
            />
            <div id="qr-reader-hidden" className="hidden"></div>

            {/* Camera permission hint on mobile */}
            {cameraPermission === 'denied' && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 text-[10px] text-amber-700 dark:text-amber-400 font-bold flex items-center gap-2">
                    <CameraIcon className="w-4 h-4 shrink-0" />
                    <span>Permiso de cámara bloqueado. Habilítalo en la configuración del navegador para escanear códigos QR.</span>
                </div>
            )}

            {/* === BUSCAR === */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Filtrar por nombre o cancha..."
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition-colors shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* === LISTA DE RESERVAS FINANCE STYLE COMPACT === */}
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <h3 className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2 shrink-0">
                        <ClockIcon className="w-3.5 h-3.5 text-emerald-500" /> Registro de Hoy
                    </h3>
                    <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-thin">
                        {(['all', 'pending', 'completed', 'cancelled', 'noshow'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase whitespace-nowrap transition-all border ${filter === f
                                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-md'
                                    : 'bg-white dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/10 hover:border-slate-300'}`}
                            >
                                {f === 'all' ? `Todos (${stats.total})` : f === 'pending' ? `Pendientes (${stats.pending})` : f === 'completed' ? `Listos (${stats.in})` : f === 'cancelled' ? `Por Jugador (${stats.cancelled})` : `Por Inasistencia (${stats.noShow})`}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {loading && bookings.length === 0 ? (
                        <div className="py-12 text-center flex flex-col items-center gap-2">
                            <ArrowPathIcon className="w-6 h-6 animate-spin text-emerald-500/40" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sincronizando datos...</p>
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-full">
                                <IdentificationIcon className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest">Sin registros encontrados</p>
                        </div>
                    ) : (
                        filteredBookings.map((booking) => {
                            const isPaid = booking.paymentStatus === 'paid';
                            const isCheckedIn = booking.checkIn;
                            const validation = validateCheckInTime(booking);
                            const isLateNoShow = !isCheckedIn && booking.status !== 'cancelled' && validation.isLate;
                            const isNoShow = isBookingNoShow(booking) || isLateNoShow;

                            return (
                                <div key={booking.id} className={`group flex items-center gap-4 p-3.5 transition-all hover:bg-slate-50/50 dark:hover:bg-white/[0.01] ${(isCheckedIn || booking.status === 'cancelled' || isLateNoShow) ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                                    {/* INDICADOR DE HORA COMPACT */}
                                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shrink-0 group-hover:scale-105 transition-transform">
                                        <span className="text-[11px] font-black tracking-tighter">{booking.startTimeStr || formatTime(booking.startTime)}</span>
                                        <span className="text-[6px] font-black uppercase opacity-60">HORA</span>
                                    </div>

                                    {/* INFO COMPACT */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">
                                                {booking.clientName}
                                            </h3>
                                            {!isCheckedIn && booking.status !== 'cancelled' && !isLateNoShow ? (
                                                isPaid ? (
                                                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[7px] font-black uppercase rounded border border-emerald-500/20">Pagado</span>
                                                ) : (
                                                    <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[7px] font-black uppercase rounded border border-amber-500/20">Pendiente</span>
                                                )
                                            ) : (booking.status === 'cancelled' || isLateNoShow) ? (
                                                isNoShow ? (
                                                    booking.paymentStatus === 'paid' ? (
                                                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[7px] font-black uppercase rounded border border-emerald-500/20">No-Show con Pago Aprobado</span>
                                                    ) : booking.paymentStatus === 'partial' ? (
                                                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[7px] font-black uppercase rounded border border-amber-500/20">No-Show con Seña Retenida</span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[7px] font-black uppercase rounded border border-red-500/20">Cancelado por No-Show</span>
                                                    )
                                                ) : (
                                                    <span className="px-1.5 py-0.5 bg-slate-500/10 text-slate-500 text-[7px] font-black uppercase rounded border border-slate-500/20">Cancelado por Jugador</span>
                                                )
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <MapPinIcon className="w-3 h-3 text-emerald-500" />
                                                <span className="text-[9px] font-bold tracking-tight">
                                                    <span className="uppercase">{booking.courtName}</span>
                                                    {booking.sport && <span className="ml-1 text-slate-400 capitalize">· {booking.sport.toLowerCase()}</span>}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <TicketIcon className="w-3 h-3" />
                                                <span className="text-[9px] font-mono font-bold uppercase">#{booking.id.slice(-6)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ACCIONES COMPACT */}
                                    <div className="shrink-0 flex items-center gap-4">
                                        {!isPaid && booking.status !== 'cancelled' && !isLateNoShow && (
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[8px] font-black text-amber-500 uppercase mb-0.5">Por Cobrar</p>
                                                <p className="text-[10px] font-black text-amber-600 dark:text-amber-400">
                                                    {formatMoney(booking.remainingBalance !== undefined ? booking.remainingBalance : (booking.price - (booking.deposit || 0)))}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            {isCheckedIn ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                                        <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Acceso OK</span>
                                                    </div>
                                                    <span className="text-[7px] font-bold text-slate-400 uppercase mr-1">Listo</span>
                                                </div>
                                            ) : (booking.status === 'cancelled' || isLateNoShow) ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                                                        isNoShow && (booking.paymentStatus === 'paid' || booking.paymentStatus === 'partial')
                                                            ? 'bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                                            : 'bg-red-500/10 border border-red-500/20'
                                                    }`}>
                                                        {isNoShow && (booking.paymentStatus === 'paid' || booking.paymentStatus === 'partial') ? (
                                                            <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                                                        ) : (
                                                            <NoSymbolIcon className="w-3.5 h-3.5 text-red-500" />
                                                        )}
                                                        <span className={`text-[8px] font-black uppercase tracking-widest ${
                                                            isNoShow && (booking.paymentStatus === 'paid' || booking.paymentStatus === 'partial')
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : 'text-red-600 dark:text-red-400'
                                                        }`}>
                                                            {isNoShow 
                                                                ? (booking.paymentStatus === 'paid' || booking.paymentStatus === 'partial' ? 'PAGO RETENIDO' : 'INASISTENCIA')
                                                                : 'CANCELADO'
                                                            }
                                                        </span>
                                                    </div>
                                                    <span className="text-[7px] font-bold text-slate-400 uppercase mr-1">
                                                        {isNoShow 
                                                            ? (booking.paymentStatus === 'paid' ? 'No-Show Pagado' : booking.paymentStatus === 'partial' ? 'Seña Retenida' : 'No-Show')
                                                            : 'Por Jugador'
                                                        }
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => { setConfirmActionType(isPaid ? 'checkin' : 'pay'); handleCheckInAction(booking); }}
                                                        className={`h-9 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95
                                                            ${isPaid
                                                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:scale-105 shadow-slate-900/10'
                                                                : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                                                            }`}
                                                    >
                                                        {isPaid ? 'Ingresar' : 'Cobrar'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleNoShow(booking)}
                                                        disabled={processingId === booking.id}
                                                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                                        title="Marcar como No-Show (Sanción)"
                                                    >
                                                        <NoSymbolIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* === MODAL DE CONFIRMACIÓN DE CHECK-IN === */}
            {isConfirmModalOpen && selectedBookingForConfirm && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 animate-scaleIn">
                        {/* Header Modal FINANCE STYLE */}
                        <div className="p-8 pb-4 text-center">
                            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 mx-auto border ${confirmActionType === 'pay' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                                {confirmActionType === 'pay' ? <BanknotesIcon className="w-8 h-8 text-amber-500" /> : <ShieldCheckIcon className="w-8 h-8 text-emerald-500" />}
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                {confirmActionType === 'pay' ? (
                                    <>Registro de <span className="text-amber-500">Pago</span></>
                                ) : (
                                    <>Autorización de <span className="text-emerald-500">Acceso</span></>
                                )}
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">
                                {confirmActionType === 'pay' ? 'Módulo de Caja' : 'Protocolo de Seguridad v2.0'}
                            </p>
                        </div>

                        {/* Contenido Datos PREMIUM COMPACT */}
                        <div className="px-6 py-4 space-y-3">
                            <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 space-y-3 border border-slate-100 dark:border-white/5 shadow-inner">
                                <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-white/5 pb-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</span>
                                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{selectedBookingForConfirm?.clientName}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-white/5 pb-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cancha</span>
                                    <div className="text-right">
                                        <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase">{selectedBookingForConfirm?.courtName}</div>
                                        {selectedBookingForConfirm?.sport && <div className="text-[8px] font-bold text-slate-400 capitalize">{selectedBookingForConfirm.sport.toLowerCase()}</div>}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-white/5 pb-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Horario</span>
                                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase font-mono tracking-tighter">
                                        {(() => {
                                            if (!selectedBookingForConfirm) return '--:--';
                                            const start = selectedBookingForConfirm.startTimeStr || formatTime(selectedBookingForConfirm.startTime);
                                            const endStr = selectedBookingForConfirm.endTimeStr;
                                            if (endStr) return `${start} - ${endStr}`;
                                            // Calcular endTime como start + 1 hora
                                            const startDate = selectedBookingForConfirm.startTime?.toDate?.() || new Date();
                                            const endDate = new Date(startDate.getTime() + 3600000);
                                            const end = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
                                            return `${start} - ${end}`;
                                        })()}
                                    </span>

                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado Pago</span>
                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${selectedBookingForConfirm?.paymentStatus === 'paid'
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 animate-pulse'
                                        }`}>
                                        {selectedBookingForConfirm?.paymentStatus === 'paid' ? 'Al Día' : `Debe ${formatMoney(selectedBookingForConfirm?.remainingBalance !== undefined ? selectedBookingForConfirm.remainingBalance : ((selectedBookingForConfirm?.totalPrice || selectedBookingForConfirm?.price || 0) - (selectedBookingForConfirm?.deposit || 0)))}`}
                                    </span>
                                </div>
                            </div>

                            {selectedBookingForConfirm?.paymentStatus !== 'paid' && (
                                <div className="space-y-3 mt-3">
                                    <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 flex gap-2.5">
                                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                                        <p className="text-[9px] leading-relaxed font-bold text-amber-700 dark:text-amber-400 uppercase">
                                            Alerta: El cliente tiene saldos pendientes. Al autorizar, se registrará el pago.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Pago</label>
                                        <select 
                                            value={selectedPaymentMethod} 
                                            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none cursor-pointer appearance-none"
                                        >
                                            <option value="cash" className="dark:bg-[#0B0F19]">Efectivo</option>
                                            <option value="transfer" className="dark:bg-[#0B0F19]">Transferencia</option>
                                            <option value="pos" className="dark:bg-[#0B0F19]">Tarjeta / POS en Recinto</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Modal Acciones PREMIUM COMPACT */}
                        <div className="p-6 flex gap-2">
                            <button
                                onClick={() => { setIsConfirmModalOpen(false); setSelectedBookingForConfirm(null); }}
                                className="flex-1 py-3.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmCheckIn}
                                disabled={!!processingId}
                                className={`flex-[2] py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${confirmActionType === 'pay' ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950'}`}
                            >
                                {processingId ? (
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    confirmActionType === 'pay' ? <>Confirmar Cobro <BanknotesIcon className="w-4 h-4" /></> : <>Confirmar Entrada <CheckCircleIcon className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
