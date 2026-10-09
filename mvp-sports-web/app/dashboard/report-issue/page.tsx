"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, onSnapshot, or } from 'firebase/firestore';
import { auditService } from '@/services/auditService';
import { SectionCard } from '@/components/ui/DashboardWidgets';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Ticket01Icon,
    RefreshIcon,
    CheckmarkCircle02Icon,
    Alert02Icon,
    ComputerIcon,
    Wrench01Icon,
    UserCircleIcon,
    Building01Icon,
    Clock01Icon,
    Message02Icon,
    Cancel01Icon,
    ArrowRight01Icon,
} from '@hugeicons/core-free-icons';

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

const inputCls = "w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-xs font-bold outline-none text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-emerald-500/40 transition-all";

export default function ReportIssuePage() {
    const { user, role, firestoreUser } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [tenantInfo, setTenantInfo] = useState<{ id: string; name: string; features?: any }>({ id: 'system_admin', name: 'Plataforma Central' });
    const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('Bug');
    const [priority, setPriority] = useState('Media');
    const [screen, setScreen] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState('');
    const [reportsList, setReportsList] = useState<UserReport[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);

    useEffect(() => {
        const resolveTenant = async () => {
            if (!user?.uid) return;
            if (role === 'admin' || role === 'superadmin') {
                setTenantInfo({ id: 'system_admin', name: 'Plataforma Central', features: {} });
                return;
            }
            try {
                const tenantIds = firestoreUser?.tenantIds || (firestoreUser?.tenantId ? [firestoreUser.tenantId] : []);
                if (tenantIds.length > 0) {
                    const q = query(collection(db, "tenants"), where("__name__", "==", tenantIds[0]));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        setTenantInfo({ id: tenantIds[0], name: snap.docs[0].data().name || 'Mi Recinto', features: snap.docs[0].data().features || {} });
                        return;
                    }
                }
                const qOwner = query(collection(db, "tenants"), or(where("ownerId", "==", user.uid), where("ownerIds", "array-contains", user.uid)));
                const snapOwner = await getDocs(qOwner);
                if (!snapOwner.empty) {
                    setTenantInfo({ id: snapOwner.docs[0].id, name: snapOwner.docs[0].data().name || 'Mi Recinto', features: snapOwner.docs[0].data().features || {} });
                } else {
                    setTenantInfo({ id: firestoreUser?.tenantId || 'externo', name: firestoreUser?.tenantName || 'Recinto Externo', features: {} });
                }
            } catch (err) {
                console.error("Error al resolver el tenant del reporte:", err);
            }
        };
        resolveTenant();
    }, [user, role, firestoreUser]);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Pendiente';
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        if (!user?.uid || activeTab !== 'list') return;
        setLoadingReports(true);
        const q = query(collection(db, "reports"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: UserReport[] = snapshot.docs.map(doc => {
                const data = doc.data();
                const raw = data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date();
                return {
                    id: doc.id,
                    subject: data.subject || 'Sin Asunto',
                    category: data.category || 'Otros',
                    priority: data.priority || 'Media',
                    screen: data.screen || 'No especificada',
                    description: data.description || 'Sin descripción',
                    stepsToReproduce: data.stepsToReproduce || 'No especificados',
                    status: data.status || 'Abierto',
                    createdAtRaw: raw,
                    createdAtFormatted: raw.toLocaleString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    response: data.response || '',
                    repliedAt: data.repliedAt || null,
                    repliedBy: data.repliedBy || '',
                };
            });
            setReportsList(list);
            setLoadingReports(false);
        });
        return () => unsubscribe();
    }, [user, activeTab]);

    const getBrowserAndOS = () => {
        if (typeof window === 'undefined') return { browser: 'Soporte Web', os: 'Desconocido' };
        const ua = navigator.userAgent;
        let browser = 'Otro / Desconocido';
        let os = 'Otro / Desconocido';
        if (ua.indexOf('Win') !== -1) os = 'Windows';
        else if (ua.indexOf('Mac') !== -1) os = 'macOS';
        else if (ua.indexOf('Linux') !== -1) os = 'Linux';
        else if (ua.indexOf('Android') !== -1) os = 'Android';
        else if (ua.indexOf('like Mac') !== -1) os = 'iOS';
        if (ua.indexOf('Firefox') !== -1) browser = 'Mozilla Firefox';
        else if (ua.indexOf('SamsungBrowser') !== -1) browser = 'Samsung Internet';
        else if (ua.indexOf('OPR') !== -1 || ua.indexOf('Opera') !== -1) browser = 'Opera';
        else if (ua.indexOf('Trident') !== -1) browser = 'Internet Explorer';
        else if (ua.indexOf('Edg') !== -1) browser = 'Microsoft Edge';
        else if (ua.indexOf('Chrome') !== -1) browser = 'Google Chrome';
        else if (ua.indexOf('Safari') !== -1) browser = 'Safari';
        return { browser, os };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim()) { setErrorMsg('El asunto es requerido'); return; }
        if (!description.trim()) { setErrorMsg('Por favor escribe una descripción del problema'); return; }

        setSubmitting(true);
        setErrorMsg('');
        try {
            const { browser, os } = getBrowserAndOS();
            const resolution = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'Desconocida';
            const windowSize = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Desconocida';
            const currentUrl = typeof window !== 'undefined' ? window.location.href : 'Desconocida';
            const actorName = firestoreUser?.fullName || firestoreUser?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Usuario';

            const reportData = {
                subject: subject.trim(), category, priority,
                screen: screen.trim() || 'No especificada',
                description: description.trim(),
                stepsToReproduce: steps.trim() || 'No especificados',
                status: 'Abierto',
                userId: user?.uid || 'anonimo',
                userEmail: user?.email || 'anonimo@mvpsports.cl',
                userName: actorName,
                userRole: role || 'guest',
                tenantId: tenantInfo.id,
                tenantName: tenantInfo.name,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconocido',
                browser, os, screenResolution: resolution, windowSize, originUrl: currentUrl,
                device: 'Web Console', sla: 100,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, "reports"), reportData);
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
            setSubject(''); setScreen(''); setDescription(''); setSteps('');
        } catch (error: any) {
            console.error("Error al enviar el reporte de incidencias:", error);
            setErrorMsg('Ocurrió un error al enviar el reporte. Por favor inténtalo de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    const getPriorityStyle = (p: string) => {
        switch (p) {
            case 'Crítica': return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30';
            case 'Alta': return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30';
            case 'Media': return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30';
            default: return 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10';
        }
    };
    const getStatusBadge = (s: string) => {
        switch (s) {
            case 'Abierto': return 'bg-white border-slate-300 text-slate-600 dark:bg-transparent dark:border-white/20 dark:text-slate-300';
            case 'En Proceso': return 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400';
            case 'Resuelto': return 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400';
            default: return 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-slate-400';
        }
    };

    const isSupportLocked = tenantInfo.id !== 'system_admin' && tenantInfo.features && tenantInfo.features.support === false;

    const HeaderBlock = ({ title, span, eyebrow }: { title: string; span: string; eyebrow: string }) => (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                    <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">{eyebrow}</p>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                    {title} <span className="text-emerald-500 dark:text-[#00df82]">{span}</span>
                </h1>
            </div>
        </div>
    );

    if (isSupportLocked) {
        return (
            <div className="w-full space-y-6 pb-12 animate-fadeIn">
                <HeaderBlock title="Soporte" span="Técnico" eyebrow="Soporte y ayuda directa" />
                <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
                    <div className="flex flex-col items-center gap-5">
                        <div className="w-16 h-16 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82]">
                            <HugeiconsIcon icon={Wrench01Icon} className="w-8 h-8" strokeWidth={1.6} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-tighter font-heading">Soporte 24/7 no incluido</h2>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-2 max-w-md leading-relaxed">
                                El beneficio de soporte técnico 24/7 está disponible en planes superiores. Mejora tu plan para habilitar el canal de reportes prioritario.
                            </p>
                        </div>
                        <Link href="/dashboard/billing-subscription">
                            <span className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all">
                                Mejorar plan
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            <HeaderBlock title="Reportar un" span="Problema" eyebrow="Soporte y ayuda directa" />

            {/* PESTAÑAS */}
            <div className="flex border-b border-slate-100 dark:border-white/5 gap-6">
                <button
                    onClick={() => { setActiveTab('create'); setSuccess(false); }}
                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'create' ? 'text-emerald-600 dark:text-[#00df82]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    Reportar problema
                    {activeTab === 'create' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500 rounded-md" />}
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'list' ? 'text-emerald-600 dark:text-[#00df82]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    Mis reportes enviados
                    {activeTab === 'list' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500 rounded-md" />}
                </button>
            </div>

            {activeTab === 'create' ? (
                success ? (
                    <SectionCard title="Reporte recibido" subtitle="Tu incidencia quedó registrada" icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5" strokeWidth={1.8} />} className="max-w-2xl mx-auto" bodyClassName="p-8">
                        <div className="text-center py-6">
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-16 h-16 text-emerald-500 mx-auto mb-4" strokeWidth={1.6} />
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 font-heading">¡Reporte recibido con éxito!</h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest max-w-md mx-auto mb-6">
                                Hemos registrado tu incidencia en nuestra central de soporte. Nuestro equipo técnico la revisará a la brevedad.
                            </p>
                            <div className="flex gap-4 justify-center flex-wrap">
                                <button onClick={() => setSuccess(false)} className="px-6 py-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[10px] uppercase rounded-md tracking-wider transition-all shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95">
                                    Reportar otro problema
                                </button>
                                <button onClick={() => setActiveTab('list')} className="px-6 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-black text-[10px] uppercase rounded-md tracking-wider transition-all hover:border-emerald-400/40">
                                    Ver mis reportes
                                </button>
                            </div>
                        </div>
                    </SectionCard>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* FORMULARIO */}
                        <div className="lg:col-span-8">
                            <SectionCard title="Nuevo reporte de soporte" subtitle="Describe el problema para que podamos ayudarte" icon={<HugeiconsIcon icon={Ticket01Icon} className="w-5 h-5" strokeWidth={1.8} />} bodyClassName="p-6">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {errorMsg && (
                                        <div className="p-4 rounded-md bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                                            <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 shrink-0" strokeWidth={2} />
                                            {errorMsg}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Categoría</label>
                                            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                                                <option value="Bug">Error del sistema (Bug)</option>
                                                <option value="Facturación">Problemas de facturación o pago</option>
                                                <option value="Funcionalidad">Sugerencia o funcionalidad faltante</option>
                                                <option value="Soporte">Soporte técnico de cancha</option>
                                                <option value="Otro">Otro asunto</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Gravedad / prioridad</label>
                                            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                                                <option value="Baja">Baja (consulta general o sugerencia)</option>
                                                <option value="Media">Media (afecta parcialmente la navegación)</option>
                                                <option value="Alta">Alta (impide acciones operativas básicas)</option>
                                                <option value="Crítica">Crítica (caída de pasarela, cobro indebido, bloqueo total)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Asunto principal</label>
                                            <input type="text" placeholder="Ej. error al confirmar arriendo de cancha" value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputCls}`} required />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Pantalla / módulo del error</label>
                                            <input type="text" placeholder="Ej. calendario / detalle de factura" value={screen} onChange={(e) => setScreen(e.target.value)} className={`${inputCls}`} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Descripción detallada del problema</label>
                                        <textarea rows={4} placeholder="Explica aquí qué pasó detalladamente..." value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} required />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Pasos para reproducir (opcional)</label>
                                        <textarea rows={3} placeholder="Ej: 1. ir a agenda, 2. click en hora 18:00, 3. elegir cliente y dar guardar" value={steps} onChange={(e) => setSteps(e.target.value)} className={`${inputCls}`} />
                                    </div>

                                    <div className="pt-2">
                                        <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[10px] uppercase rounded-md tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10 hover:brightness-110 active:scale-[0.99]">
                                            {submitting ? (<><HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" strokeWidth={2} /> Enviando ticket...</>) : (<><HugeiconsIcon icon={Ticket01Icon} className="w-4 h-4" strokeWidth={2} /> Enviar reporte de soporte</>)}
                                        </button>
                                    </div>
                                </form>
                            </SectionCard>
                        </div>

                        {/* DIAGNÓSTICO */}
                        <div className="lg:col-span-4 space-y-6">
                            <SectionCard title="Datos de diagnóstico" subtitle="Se envían automáticamente con tu reporte" icon={<HugeiconsIcon icon={ComputerIcon} className="w-5 h-5" strokeWidth={1.8} />} bodyClassName="p-5 space-y-4">
                                <div className="flex items-start gap-3">
                                    <HugeiconsIcon icon={ComputerIcon} className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.8} />
                                    <div>
                                        <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest leading-none">Navegador & sistema</p>
                                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1">{getBrowserAndOS().browser} ({getBrowserAndOS().os})</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <HugeiconsIcon icon={ComputerIcon} className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.8} />
                                    <div>
                                        <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest leading-none">Resolución / ventana</p>
                                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1">{typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'Desconocida'} / {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Desconocida'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <HugeiconsIcon icon={UserCircleIcon} className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.8} />
                                    <div>
                                        <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest leading-none">Usuario reportante</p>
                                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1">{firestoreUser?.fullName || user?.displayName || user?.email || 'Cargando...'}</p>
                                        <span className="text-[7.5px] font-black text-emerald-600 dark:text-[#00df82] uppercase tracking-widest">Rol: {role || 'Cargando...'}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <HugeiconsIcon icon={Building01Icon} className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.8} />
                                    <div>
                                        <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest leading-none">Recinto vinculado</p>
                                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1 uppercase">{tenantInfo.name}</p>
                                        <span className="text-[7.5px] font-black text-slate-400 uppercase font-mono">ID: {tenantInfo.id}</span>
                                    </div>
                                </div>
                            </SectionCard>

                            <div className="rounded-md bg-emerald-500/5 border border-emerald-500/15 p-5">
                                <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase mb-2 flex items-center gap-1.5 font-heading">
                                    <HugeiconsIcon icon={Ticket01Icon} className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                                    Compromiso de SLA
                                </h4>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal">
                                    Los tickets de prioridad <strong className="text-emerald-600 dark:text-[#00df82]">Crítica</strong> se derivan de inmediato al equipo de ingeniería (respuesta menor a 1 hora). Prioridades <strong>Baja</strong> o <strong>Media</strong> se resuelven en un plazo máximo de 24 horas hábiles.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div className="space-y-6">
                    {loadingReports ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400 rounded-md">
                            <HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 text-emerald-500 animate-spin mb-4" strokeWidth={1.6} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando tus tickets...</p>
                        </div>
                    ) : reportsList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-md bg-slate-50/50 dark:bg-white/[0.02]">
                            <HugeiconsIcon icon={Message02Icon} className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" strokeWidth={1.4} />
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">No has enviado ningún reporte de incidencia aún.</p>
                            <button onClick={() => setActiveTab('create')} className="mt-4 px-5 py-2 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[9px] uppercase rounded-md tracking-wider transition-all hover:brightness-110">
                                Reportar primer problema
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reportsList.map((ticket) => (
                                <div key={ticket.id} className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-6 transition-all hover:border-emerald-400/30">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-4 mb-4">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-[9px] font-black font-mono text-emerald-600 dark:text-[#00df82] bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                                ID: #{ticket.id.slice(0, 8).toUpperCase()}
                                            </span>
                                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">{ticket.category}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${getPriorityStyle(ticket.priority)}`}>Prioridad {ticket.priority}</span>
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${getStatusBadge(ticket.status)}`}>{ticket.status}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase leading-tight mb-1 font-heading">{ticket.subject}</h3>
                                            <p className="text-[9px] text-slate-400 flex items-center gap-1 font-semibold uppercase tracking-wider">
                                                <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5" strokeWidth={1.8} /> Enviado: {ticket.createdAtFormatted}
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-md space-y-2 border border-slate-200 dark:border-white/5">
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
                                                    <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-400">Módulo / pantalla:</h4>
                                                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase">{ticket.screen}</span>
                                                </div>
                                            )}
                                        </div>

                                        {ticket.response ? (
                                            <div className="p-4 rounded-md border border-emerald-500/20 bg-emerald-500/5 space-y-2 mt-3 animate-fadeIn">
                                                <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <HugeiconsIcon icon={Wrench01Icon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82] shrink-0" strokeWidth={1.8} />
                                                        <h4 className="text-[9px] font-black text-emerald-600 dark:text-[#00df82] uppercase tracking-wider">Respuesta oficial del soporte</h4>
                                                    </div>
                                                    {ticket.repliedAt && <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono font-bold">{formatDate(ticket.repliedAt)}</span>}
                                                </div>
                                                <p className="text-xs text-slate-700 dark:text-slate-200 font-bold leading-relaxed whitespace-pre-line">{ticket.response}</p>
                                                {ticket.repliedBy && (
                                                    <div className="text-[8px] text-slate-400 uppercase tracking-widest font-black text-right pt-1">
                                                        Respondido por: <span className="text-emerald-600 dark:text-[#00df82]">{ticket.repliedBy}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 rounded-md border border-slate-200 dark:border-white/5 bg-slate-50/50 text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-2">
                                                <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4 text-slate-400 animate-pulse" strokeWidth={1.8} />
                                                Esperando respuesta del soporte técnico...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}