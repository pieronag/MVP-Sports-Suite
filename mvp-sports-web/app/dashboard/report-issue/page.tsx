"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { auditService } from '@/services/auditService';
import { PanelGlass } from '@/components/ui/DashboardWidgets';
import { 
    FlagIcon, 
    ArrowPathIcon, 
    CheckCircleIcon, 
    ExclamationTriangleIcon,
    DevicePhoneMobileIcon,
    ComputerDesktopIcon,
    WrenchIcon,
    UserIcon,
    BuildingOfficeIcon,
    ClockIcon,
    ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface UserReport {
    id: string;
    subject: string;
    category: string;
    priority: string;
    screen: string;
    description: string;
    stepsToReproduce: string;
    status: string;
    createdAtRaw: any;
    createdAtFormatted: string;
    response?: string;
    repliedAt?: any;
    repliedBy?: string;
}

export default function ReportIssuePage() {
    const { user, role, firestoreUser } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [tenantInfo, setTenantInfo] = useState({ id: 'system_admin', name: 'Plataforma Central' });
    const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

    // Campos del Formulario
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('Bug');
    const [priority, setPriority] = useState('Media');
    const [screen, setScreen] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState('');

    // Historial de reportes
    const [reportsList, setReportsList] = useState<UserReport[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);

    // Cargar información de Tenant (Complejo Deportivo) correspondiente
    useEffect(() => {
        const resolveTenant = async () => {
            if (!user?.uid) return;
            if (role === 'admin' || role === 'superadmin') {
                setTenantInfo({ id: 'system_admin', name: 'Plataforma Central' });
                return;
            }

            try {
                // Si el usuario tiene tenantIds asignados en su perfil
                const tenantIds = firestoreUser?.tenantIds || (firestoreUser?.tenantId ? [firestoreUser.tenantId] : []);
                if (tenantIds.length > 0) {
                    const firstTenantId = tenantIds[0];
                    const tenantsRef = collection(db, "tenants");
                    const q = query(tenantsRef, where("__name__", "==", firstTenantId));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        setTenantInfo({ id: firstTenantId, name: snap.docs[0].data().name || 'Mi Recinto' });
                        return;
                    }
                }

                // Fallback: buscar recintos por ownerId
                const qOwner = query(collection(db, "tenants"), where("ownerId", "==", user.uid));
                const snapOwner = await getDocs(qOwner);
                if (!snapOwner.empty) {
                    setTenantInfo({ id: snapOwner.docs[0].id, name: snapOwner.docs[0].data().name || 'Mi Recinto' });
                } else {
                    setTenantInfo({ id: firestoreUser?.tenantId || 'externo', name: firestoreUser?.tenantName || 'Recinto Externo' });
                }
            } catch (err) {
                console.error("Error al resolver el tenant del reporte:", err);
            }
        };
        resolveTenant();
    }, [user, role, firestoreUser]);

    // Auxiliar de formato de fecha local en Chile
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Pendiente';
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleString('es-CL', {
            timeZone: 'America/Santiago',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Escuchar reportes en tiempo real
    useEffect(() => {
        if (!user?.uid || activeTab !== 'list') return;

        setLoadingReports(true);
        const reportsRef = collection(db, "reports");
        const q = query(reportsRef, where("userId", "==", user.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: UserReport[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    subject: data.subject || 'Sin Asunto',
                    category: data.category || 'Otros',
                    priority: data.priority || 'Media',
                    screen: data.screen || 'No especificada',
                    description: data.description || 'Sin descripción',
                    stepsToReproduce: data.stepsToReproduce || 'No especificados',
                    status: data.status || 'Abierto',
                    createdAtRaw: data.createdAt,
                    createdAtFormatted: formatDate(data.createdAt),
                    response: data.response || '',
                    repliedAt: data.repliedAt || null,
                    repliedBy: data.repliedBy || ''
                };
            });

            // Ordenar por fecha decreciente en memoria
            list.sort((a, b) => {
                const dateA = a.createdAtRaw?.seconds || 0;
                const dateB = b.createdAtRaw?.seconds || 0;
                return dateB - dateA;
            });

            setReportsList(list);
            setLoadingReports(false);
        }, (err) => {
            console.error("Error al cargar reportes en tiempo real:", err);
            setLoadingReports(false);
        });

        return () => unsubscribe();
    }, [user, activeTab]);

    // Función auxiliar para obtener navegador y sistema operativo desde UserAgent
    const getBrowserAndOS = () => {
        if (typeof window === 'undefined') return { browser: 'Unknown', os: 'Unknown' };
        const ua = navigator.userAgent;
        let browser = 'Otro / Desconocido';
        let os = 'Otro / Desconocido';

        // Detectar OS
        if (ua.indexOf('Win') !== -1) os = 'Windows';
        else if (ua.indexOf('Mac') !== -1) os = 'macOS';
        else if (ua.indexOf('Linux') !== -1) os = 'Linux';
        else if (ua.indexOf('Android') !== -1) os = 'Android';
        else if (ua.indexOf('like Mac') !== -1) os = 'iOS';

        // Detectar Navegador
        if (ua.indexOf('Firefox') !== -1) browser = 'Mozilla Firefox';
        else if (ua.indexOf('SamsungBrowser') !== -1) browser = 'Samsung Internet';
        else if (ua.indexOf('Opera') !== -1 || ua.indexOf('OPR') !== -1) browser = 'Opera';
        else if (ua.indexOf('Trident') !== -1) browser = 'Internet Explorer';
        else if (ua.indexOf('Edge') !== -1 || ua.indexOf('Edg') !== -1) browser = 'Microsoft Edge';
        else if (ua.indexOf('Chrome') !== -1) browser = 'Google Chrome';
        else if (ua.indexOf('Safari') !== -1) browser = 'Safari';

        return { browser, os };
    };

    const getPriorityStyle = (p: string) => {
        switch (p) {
            case 'Crítica': return 'text-red-600 bg-red-50 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
            case 'Alta': return 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20';
            case 'Media': return 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
            default: return 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10';
        }
    };

    const getStatusStyle = (s: string) => {
        switch (s) {
            case 'Abierto': return 'bg-white border-slate-300 text-slate-600 dark:bg-transparent dark:border-white/20 dark:text-slate-300';
            case 'En Proceso': return 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400';
            case 'Resuelto': return 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400';
            default: return 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-slate-400';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim()) {
            setErrorMsg('El asunto es requerido');
            return;
        }
        if (!description.trim()) {
            setErrorMsg('Por favor escribe una descripción del problema');
            return;
        }

        setSubmitting(true);
        setErrorMsg('');

        try {
            const { browser, os } = getBrowserAndOS();
            const resolution = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'Desconocida';
            const windowSize = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Desconocida';
            const currentUrl = typeof window !== 'undefined' ? window.location.href : 'Desconocida';

            const actorName = firestoreUser?.fullName || firestoreUser?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Usuario';

            const reportData = {
                subject: subject.trim(),
                category,
                priority,
                screen: screen.trim() || 'No especificada',
                description: description.trim(),
                stepsToReproduce: steps.trim() || 'No especificados',
                status: 'Abierto',
                // Actor Info
                userId: user?.uid || 'anonimo',
                userEmail: user?.email || 'anonimo@mvpsports.cl',
                userName: actorName,
                userRole: role || 'guest',
                // Tenant Info
                tenantId: tenantInfo.id,
                tenantName: tenantInfo.name,
                // Technical Info (Device/Environment Info)
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconocido',
                browser,
                os,
                screenResolution: resolution,
                windowSize,
                originUrl: currentUrl,
                device: 'Web Console',
                sla: 100, // SLA inicial
                createdAt: serverTimestamp()
            };

            // 1. Guardar ticket en la colección `/reports`
            const docRef = await addDoc(collection(db, "reports"), reportData);

            // 2. Registrar evento de auditoría
            await auditService.logAuditEvent({
                action: 'REPORTE_INCIDENCIA_CREADO',
                module: 'Soporte Técnico',
                details: `Ticket N° ${docRef.id} creado: "${subject.trim()}" en recinto "${tenantInfo.name}" (${priority})`,
                severity: priority === 'Crítica' ? 'HIGH' : 'LOW',
                status: 'SUCCESS',
                actor: actorName,
                role: role || 'guest',
                email: user?.email || 'anonimo@mvpsports.cl'
            });

            setSuccess(true);
            // Limpiar formulario
            setSubject('');
            setScreen('');
            setDescription('');
            setSteps('');
        } catch (error: any) {
            console.error("Error al enviar el reporte de incidencias:", error);
            setErrorMsg('Ocurrió un error al enviar el reporte. Por favor inténtalo de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full space-y-6 pb-12 font-sans text-left animate-fadeIn">
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">
                            Soporte y Ayuda Directa
                        </p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                        Reportar un <span className="text-emerald-500 dark:text-emerald-400">Problema</span>
                    </h1>
                </div>
            </div>

            {/* PESTAÑAS (TABS) */}
            <div className="flex border-b border-slate-100 dark:border-white/5 pb-0.5 gap-6">
                <button
                    onClick={() => {
                        setActiveTab('create');
                        setSuccess(false);
                    }}
                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'create' ? 'text-emerald-500 font-extrabold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    Reportar Problema
                    {activeTab === 'create' && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500 rounded-full"></span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'list' ? 'text-emerald-500 font-extrabold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    Mis Reportes Enviados
                    {activeTab === 'list' && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500 rounded-full"></span>
                    )}
                </button>
            </div>

            {activeTab === 'create' ? (
                success ? (
                    <PanelGlass className="max-w-2xl mx-auto p-8 text-center border-none shadow-xl shadow-slate-200/20 py-16">
                        <CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-bounce" />
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                            ¡Reporte Recibido con Éxito!
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest max-w-md mx-auto mb-6">
                            Hemos registrado tu incidencia en nuestra central de soporte. Nuestro equipo técnico la revisará a la brevedad.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setSuccess(false)}
                                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase rounded-xl tracking-wider transition-all shadow-lg shadow-emerald-500/20"
                            >
                                Reportar otro Problema
                            </button>
                            <button
                                onClick={() => setActiveTab('list')}
                                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white font-black text-[10px] uppercase rounded-xl tracking-wider transition-all"
                            >
                                Ver Mis Reportes
                            </button>
                        </div>
                    </PanelGlass>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* FORMULARIO */}
                        <div className="lg:col-span-8">
                            <PanelGlass className="p-8 border-none shadow-xl shadow-slate-200/20">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {errorMsg && (
                                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                                            <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                                            {errorMsg}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Categoría */}
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Categoría</label>
                                            <select
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white focus:border-emerald-500/50 transition-all"
                                            >
                                                <option value="Bug">Error del Sistema (Bug)</option>
                                                <option value="Facturación">Problemas de Facturación o Pago</option>
                                                <option value="Funcionalidad">Sugerencia o Funcionalidad Faltante</option>
                                                <option value="Soporte">Soporte Técnico de Cancha</option>
                                                <option value="Otro">Otro Asunto</option>
                                            </select>
                                        </div>

                                        {/* Prioridad */}
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Gravedad / Prioridad</label>
                                            <select
                                                value={priority}
                                                onChange={(e) => setPriority(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white focus:border-emerald-500/50 transition-all"
                                            >
                                                <option value="Baja">Baja (Consulta general o sugerencia)</option>
                                                <option value="Media">Media (Afecta parcialmente la navegación)</option>
                                                <option value="Alta">Alta (Impide realizar acciones operativas básicas)</option>
                                                <option value="Crítica">Crítica (Caída de pasarela, cobro indebido, bloqueo total)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Asunto */}
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Asunto Principal</label>
                                            <input
                                                type="text"
                                                placeholder="EJ. ERROR AL CONFIRMAR ARRIENDO DE CANCHA"
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500/50 transition-all uppercase"
                                                required
                                            />
                                        </div>

                                        {/* Pantalla donde ocurrió */}
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Pantalla / Módulo de Error</label>
                                            <input
                                                type="text"
                                                placeholder="EJ. CALENDARIO / DETALLE DE FACTURA"
                                                value={screen}
                                                onChange={(e) => setScreen(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500/50 transition-all uppercase"
                                            />
                                        </div>
                                    </div>

                                    {/* Descripción */}
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Descripción Detallada del Problema</label>
                                        <textarea
                                            rows={4}
                                            placeholder="EXPLICA AQUÍ QUÉ PASÓ DETALLADAMENTE..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500/50 transition-all"
                                            required
                                        />
                                    </div>

                                    {/* Pasos para reproducir */}
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Pasos para Reproducir (Opcional)</label>
                                        <textarea
                                            rows={3}
                                            placeholder="EJ: 1. IR A AGENDA, 2. CLICK EN HORA 18:00, 3. ELEGIR CLIENTE Y DAR GUARDAR"
                                            value={steps}
                                            onChange={(e) => setSteps(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500/50 transition-all uppercase"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase rounded-xl tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10 active:scale-[0.99]"
                                        >
                                            {submitting ? (
                                                <>
                                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                    Enviando Ticket Técnico...
                                                </>
                                            ) : (
                                                <>
                                                    <FlagIcon className="w-4 h-4" />
                                                    Enviar Reporte de Soporte
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </PanelGlass>
                        </div>

                        {/* METADATOS DE DIAGNÓSTICO EN TIEMPO REAL */}
                        <div className="lg:col-span-4 space-y-6">
                            <PanelGlass className="p-6 border-none shadow-xl shadow-slate-200/20 bg-slate-50/50 dark:bg-[#0E1322]">
                                <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <WrenchIcon className="w-4 h-4 text-emerald-500" /> Datos de Diagnóstico
                                </h3>
                                <p className="text-[8.5px] text-slate-400 uppercase font-bold tracking-wider mb-5">
                                    Información de entorno que será enviada automáticamente junto a tu reporte para agilizar la resolución:
                                </p>

                                <div className="space-y-4">
                                    {/* Dispositivo / OS */}
                                    <div className="flex items-start gap-3">
                                        <ComputerDesktopIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest leading-none">Navegador & Sistema</p>
                                            <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1">
                                                {typeof window !== 'undefined' ? getBrowserAndOS().browser : 'Soporte Web'} ({typeof window !== 'undefined' ? getBrowserAndOS().os : 'Desconocido'})
                                            </p>
                                        </div>
                                    </div>

                                    {/* Resolución de Pantalla */}
                                    <div className="flex items-start gap-3">
                                        <ComputerDesktopIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest leading-none">Resolución / Ventana</p>
                                            <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1">
                                                {typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'Desconocida'} / {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Desconocida'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Usuario */}
                                    <div className="flex items-start gap-3">
                                        <UserIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest leading-none">Usuario Reportante</p>
                                            <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1">
                                                {firestoreUser?.fullName || user?.displayName || user?.email || 'Cargando...'}
                                            </p>
                                            <span className="text-[7.5px] font-black text-emerald-500 uppercase tracking-widest">Rol: {role || 'Cargando...'}</span>
                                        </div>
                                    </div>

                                    {/* Tenant */}
                                    <div className="flex items-start gap-3">
                                        <BuildingOfficeIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest leading-none">Recinto Vinculado</p>
                                            <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1 uppercase">
                                                {tenantInfo.name}
                                            </p>
                                            <span className="text-[7.5px] font-black text-slate-400 uppercase font-mono">ID: {tenantInfo.id}</span>
                                        </div>
                                    </div>
                                </div>
                            </PanelGlass>

                            <PanelGlass className="p-6 border-none shadow-xl shadow-slate-200/20 bg-emerald-500/5 dark:bg-emerald-500/[0.02] border border-emerald-500/10">
                                <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase mb-2 flex items-center gap-1.5">
                                    <FlagIcon className="w-3.5 h-3.5 text-emerald-500" />
                                    Compromiso de SLA
                                </h4>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal">
                                    Los tickets de prioridad <strong>Crítica</strong> son derivados de inmediato a nuestro equipo de ingeniería con tiempos de respuesta menores a 1 hora. Consultas de prioridad <strong>Baja</strong> o <strong>Media</strong> se resuelven en un plazo máximo de 24 horas hábiles.
                                </p>
                            </PanelGlass>
                        </div>
                    </div>
                )
            ) : (
                /* SECCIÓN DE HISTORIAL / MIS REPORTES ENVIADOS */
                <div className="space-y-6">
                    {loadingReports ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl">
                            <ArrowPathIcon className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando tus tickets...</p>
                        </div>
                    ) : reportsList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-slate-50/50 dark:bg-white/[0.02] border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
                            <ChatBubbleLeftRightIcon className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700 stroke-1" />
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">No has enviado ningún reporte de incidencia aún.</p>
                            <button
                                onClick={() => setActiveTab('create')}
                                className="mt-4 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase rounded-xl tracking-wider transition-all"
                            >
                                Reportar Primer Problema
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reportsList.map((ticket) => (
                                <PanelGlass key={ticket.id} className="p-6 border-none shadow-lg shadow-slate-200/10 dark:shadow-none hover:border-emerald-500/20 transition-all border border-transparent">
                                    {/* Cabecera del ticket */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-4 mb-4">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-[9px] font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                                ID: #{ticket.id.slice(0, 8).toUpperCase()}
                                            </span>
                                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                                                {ticket.category}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getPriorityStyle(ticket.priority)}`}>
                                                Prioridad {ticket.priority}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getStatusStyle(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Contenido */}
                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase leading-tight mb-1">
                                                {ticket.subject}
                                            </h3>
                                            <p className="text-[9px] text-slate-400 flex items-center gap-1 font-semibold uppercase tracking-wider">
                                                <ClockIcon className="w-3.5 h-3.5" /> Enviado: {ticket.createdAtFormatted}
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-xl space-y-2 border border-slate-100 dark:border-white/5">
                                            <div>
                                                <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-400">Descripción del problema:</h4>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium whitespace-pre-line mt-1">{ticket.description}</p>
                                            </div>
                                            {ticket.stepsToReproduce && ticket.stepsToReproduce !== 'No especificados' && (
                                                <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                                                    <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pasos para reproducir:</h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-pre-line mt-1">{ticket.stepsToReproduce}</p>
                                                </div>
                                            )}
                                            {ticket.screen && ticket.screen !== 'No especificada' && (
                                                <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex gap-1 items-center">
                                                    <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-400">Módulo / Pantalla:</h4>
                                                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase">{ticket.screen}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Respuesta Oficial de Soporte */}
                                        {ticket.response ? (
                                            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/[0.02] space-y-2 mt-3 animate-fadeIn">
                                                <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <WrenchIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                                        <h4 className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                                            Respuesta Oficial del Soporte Técnico
                                                        </h4>
                                                    </div>
                                                    {ticket.repliedAt && (
                                                        <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono font-bold">
                                                            {formatDate(ticket.repliedAt)}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-700 dark:text-slate-200 font-bold leading-relaxed whitespace-pre-line">
                                                    {ticket.response}
                                                </p>
                                                {ticket.repliedBy && (
                                                    <div className="text-[8px] text-slate-400 uppercase tracking-widest font-black text-right pt-1">
                                                        Respondido por: <span className="text-emerald-500">{ticket.repliedBy}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-2">
                                                <ClockIcon className="w-4 h-4 text-slate-400 animate-pulse" />
                                                Esperando respuesta del soporte técnico...
                                            </div>
                                        )}
                                    </div>
                                </PanelGlass>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
