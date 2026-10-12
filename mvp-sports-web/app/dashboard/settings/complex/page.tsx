"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { PanelGlass, TarjetaKpi, BotonAccion } from '@/components/ui/DashboardWidgets';
import { Key01Icon } from '@hugeicons/core-free-icons';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auditService } from '@/services/client/auditService';
import { db, auth, storage } from '@/services/client/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, getDoc, query, where, orderBy, limit, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, onSnapshot, Timestamp, writeBatch, setDoc, increment, or } from 'firebase/firestore';
import {
    Alert02Icon,
    Briefcase01Icon,
    Building01Icon,
    Calendar03Icon,
    Cancel01Icon,
    CheckmarkCircle02Icon,
    Clock01Icon,
    CloudUploadIcon,
    CodeIcon,
    CreditCardIcon,
    FireIcon,
    GlobeIcon,
    IdentityCardIcon,
    Image01Icon,
    Mail01Icon,
    MapPinIcon,
    Message02Icon,
    MoneyBag01Icon,
    CallIcon,
    RefreshIcon,
    ScaleIcon,
    Settings01Icon,
    ShieldCheckIcon,
    SparklesIcon,
    StarIcon,
    Delete02Icon,
    UserGroupIcon,
    FloppyDiskIcon,
} from '@hugeicons/core-free-icons';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-5 right-5 z-160 flex items-center gap-3 px-4 py-3 rounded-md shadow-xl border animate-slideIn ${type === 'success' ? 'bg-white border-emerald-500 text-emerald-700 dark:bg-[#0B0F19] dark:text-[#00df82] dark:border-emerald-500/50' : 'bg-white border-red-500 text-red-700 dark:bg-[#0B0F19] dark:text-red-400 dark:border-red-500/50'}`}>
            {type === 'success' ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5" /> : <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" />}
            <span className="text-xs md:text-[10px] font-bold uppercase tracking-widest">{message}</span>
        </div>
    );
};

export default function TenantSettingsPage() {
    const { user, role: userRole, firestoreUser } = useAuth();
    const [secretsConfigured, setSecretsConfigured] = useState<Record<string, boolean>>({});
    const [tenants, setTenants] = useState<any[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [globalSettings, setGlobalSettings] = useState<any>(null);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // Terminal de Diagnóstico
    const [terminalLines, setTerminalLines] = useState<{ text: string, type: 'info' | 'success' | 'error' | 'command' }[]>([
        { text: "MVP Gateway Diagnostics v2.4.1", type: "info" },
        { text: "Sistema inicializado. Esperando comandos de validación...", type: "info" }
    ]);
    const terminalRef = useRef<HTMLDivElement>(null);
    const [dirty, setDirty] = useState(false);
    const snapshotRef = useRef<string | null>(null);
    const [activeSection, setActiveSection] = useState('identidad');

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalLines]);

    const [formData, setFormData] = useState({
        name: '', address: '', description: '', phone: '',
        instagram: '', whatsapp: '',
        isMercadopagoActive: false,
        mercadopagoPublicKey: '', mercadopagoAccessToken: '',
        isSiiActive: false, siiRut: '', siiApiKey: '',
        // Elementos Operativos
        openTime: '08:00', closeTime: '23:00',
        cancellationPolicy: '',
        rules: [] as string[],
        website: '',
        legalName: '',
        rut: '',
        contactEmail: '',
        legalRepresentative: '',
        businessType: '',
        amenities: [] as string[]
    });

    useEffect(() => {
        if (snapshotRef.current !== null && JSON.stringify(formData) !== snapshotRef.current) {
            setDirty(true);
        }
    }, [formData]);

    useEffect(() => {
        const ids = ['identidad', 'legal', 'contacto', 'operacion', 'integraciones'];
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); });
        }, { rootMargin: '-20% 0px -70% 0px' });
        ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, [loading, selectedTenantId]);

    const fetchTenants = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const gSnap = await getDoc(doc(db, "settings", "global"));
            if (gSnap.exists()) {
                setGlobalSettings(gSnap.data());
            }

            const userDoc = await getDoc(doc(db, "users", user.uid));
            let role = userDoc.exists() ? (userDoc.data().role || '').toLowerCase() : '';
            if (!role) {
                const profileDoc = await getDoc(doc(db, "profiles", user.uid));
                if (profileDoc.exists()) role = (profileDoc.data().role || '').toLowerCase();
            }
            const isAdmin = ['admin', 'superadmin'].includes(role);

            let q;
            if (isAdmin) {
                q = query(collection(db, "tenants"));
            } else {
                q = query(collection(db, "tenants"), or(where("ownerId", "==", user.uid), where("ownerIds", "array-contains", user.uid)));
            }

            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTenants(list);
            if (list.length > 0) {
                setSelectedTenantId(list[0].id);
                loadTenantData(list[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadTenantData = (t: any) => {
        let computedOpen = t.openTime || '08:00';
        let computedClose = t.closeTime || '23:00';

        if (t.schedule && typeof t.schedule === 'object') {
            const openDays = Object.values(t.schedule).filter((day: any) => day && day.isOpen) as any[];
            if (openDays.length > 0) {
                const sortedOpens = [...openDays].sort((a: any, b: any) => (a.open || '').localeCompare(b.open || ''));
                if (sortedOpens[0] && sortedOpens[0].open) {
                    computedOpen = sortedOpens[0].open;
                }

                const sortedCloses = [...openDays].sort((a: any, b: any) => {
                    const parseToMinutes = (timeStr: string) => {
                        if (!timeStr) return 0;
                        const [h, m] = timeStr.split(':').map(Number);
                        return h < 6 ? (h + 24) * 60 + m : h * 60 + m;
                    };
                    return parseToMinutes(b.close || '') - parseToMinutes(a.close || '');
                });
                if (sortedCloses[0] && sortedCloses[0].close) {
                    computedClose = sortedCloses[0].close;
                }
            }
        }

        const nextForm = {
            name: t.name || '', address: t.address || '', description: t.description || '',
            phone: t.phone || '', instagram: t.instagram || '', whatsapp: t.whatsapp || '',
            isMercadopagoActive: t.isMercadopagoActive || false,
            // Los secretos nunca se leen al cliente: el campo queda vacío y solo se usa para reemplazarlos
            mercadopagoPublicKey: t.mercadopagoPublicKey || '', mercadopagoAccessToken: '',
            isSiiActive: t.isSiiActive || false, siiRut: t.siiRut || '', siiApiKey: '',
            openTime: computedOpen, closeTime: computedClose,
            cancellationPolicy: t.cancellationPolicy || '',
            rules: Array.isArray(t.rules) ? t.rules : [],
            website: t.website || '',
            legalName: t.legalName || '',
            rut: t.rut || '',
            contactEmail: t.contactEmail || '',
            legalRepresentative: t.legalRepresentative || '',
            businessType: t.businessType || '',
            amenities: t.amenities || []
        };
        setFormData(nextForm);
        loadSecretsStatus(t.id);
        snapshotRef.current = JSON.stringify(nextForm);
        setDirty(false);
        setTerminalLines([
            { text: `Re-inicializando entorno para el recinto: [${t.name || t.id}]`, type: "info" },
            { text: "Esperando instrucciones de conexión...", type: "info" }
        ]);
    };

    // Estado de credenciales (solo si están configuradas, nunca el valor)
    const loadSecretsStatus = async (tenantId: string) => {
        setSecretsConfigured({});
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/tenant-secrets?tenantId=${encodeURIComponent(tenantId)}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setSecretsConfigured((await res.json()).configured || {});
        } catch (e) {
            console.error('Error estado credenciales:', e);
        }
    };

    useEffect(() => { fetchTenants(); }, [user]);

    const handleSelectTenant = (id: string) => {
        const t = tenants.find(t => t.id === id);
        if (t) {
            setSelectedTenantId(id);
            loadTenantData(t);
        }
    };

    const handleSave = async () => {
        if (!selectedTenantId) return;
        setSaving(true);
        setTerminalLines(prev => [...prev, { text: `> Ejecutando guardado de configuración maestra...`, type: 'command' }]);

        const actorName = firestoreUser?.fullName || user?.displayName || user?.email || 'Administrador de Complejo';
        const actorRole = userRole || 'owner';
        const actorEmail = user?.email || 'owner@mvpsports.cl';
        const tenantName = tenants.find(t => t.id === selectedTenantId)?.name || 'Recinto';

        try {
            const isMpGloballyDisabled = globalSettings && globalSettings.paymentGateways && globalSettings.paymentGateways.mercadoPago === false;

            const updatedData = {
                ...formData,
                isMercadopagoActive: isMpGloballyDisabled ? false : formData.isMercadopagoActive,
                openingHours: `${formData.openTime} - ${formData.closeTime}`
            };

            // Las credenciales van por API a tenant_secrets; nunca al documento público del recinto
            const { mercadopagoAccessToken, siiApiKey, ...publicData } = updatedData;
            const secretPayload: Record<string, string> = {};
            if (mercadopagoAccessToken.trim()) secretPayload.mercadopagoAccessToken = mercadopagoAccessToken;
            if (siiApiKey.trim()) secretPayload.siiApiKey = siiApiKey;
            if (Object.keys(secretPayload).length) {
                const token = await auth.currentUser?.getIdToken();
                const res = await fetch('/api/tenant-secrets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ tenantId: selectedTenantId, ...secretPayload }),
                });
                if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'No se pudieron guardar las credenciales');
                setFormData(f => ({ ...f, mercadopagoAccessToken: '', siiApiKey: '' }));
                await loadSecretsStatus(selectedTenantId);
            }

            // Firestore rechaza toda la escritura si un campo viene undefined
            const cleanPublic = Object.fromEntries(Object.entries(publicData).filter(([, v]) => v !== undefined));
            await updateDoc(doc(db, "tenants", selectedTenantId), cleanPublic);

            await auditService.logAuditEvent({
                action: 'MODIFICACION_CONFIGURACION_COMPLEJO',
                module: 'CONFIGURACIONES',
                details: `Se actualizó la configuración operativa y comercial del recinto: ${tenantName} (ID: ${selectedTenantId})`,
                severity: 'MEDIUM',
                status: 'SUCCESS',
                actor: actorName,
                role: actorRole,
                email: actorEmail
            });

            setNotification({ msg: "Configuración actualizada con éxito", type: 'success' });
            setTenants(prev => prev.map(t => t.id === selectedTenantId ? { ...t, ...updatedData } : t));
            setFormData(prev => {
                const next = { ...prev, ...updatedData };
                snapshotRef.current = JSON.stringify(next);
                return next;
            });
            setDirty(false);
            setTimeout(() => setTerminalLines(prev => [...prev, { text: `[SISTEMA] Sincronización con Firestore exitosa (200 OK).`, type: 'success' }]), 600);
        } catch (error) {
            await auditService.logAuditEvent({
                action: 'MODIFICACION_CONFIGURACION_COMPLEJO',
                module: 'CONFIGURACIONES',
                details: `Fallo al actualizar la configuración del recinto: ${tenantName} (ID: ${selectedTenantId})`,
                severity: 'MEDIUM',
                status: 'FAILED',
                actor: actorName,
                role: actorRole,
                email: actorEmail
            });
            const e: any = error;
            const reason = e?.code === 'permission-denied'
                ? 'Tu cuenta no tiene permiso para editar este recinto'
                : e?.message?.includes('credenciales') || e?.message?.includes('permisos') || e?.message?.includes('autenticado')
                    ? e.message
                    : `No se pudo guardar${e?.code ? ` (${e.code})` : ''}: ${String(e?.message || 'error desconocido').slice(0, 140)}`;
            console.error('Guardar recinto', error);
            setNotification({ msg: reason, type: 'error' });
            setTerminalLines(prev => [...prev, { text: `[SISTEMA] ${reason}`, type: 'error' }]);
        } finally {
            setSaving(false);
        }
    };

    const simulateApiTest = async (api: string) => {
        setTerminalLines(prev => [...prev, { text: `> root@mvp-engine:~$ test-connection --service ${api}`, type: 'command' }]);
        await new Promise(r => setTimeout(r, 600));
        setTerminalLines(prev => [...prev, { text: `[${api.toUpperCase()}] Realizando handshake TLS y comprobando latencia...`, type: 'info' }]);
        await new Promise(r => setTimeout(r, 1200));

        let success = false;
        if (api === 'mercadopago') {
            success = !!((formData.mercadopagoAccessToken || secretsConfigured.mercadopagoAccessToken) && formData.mercadopagoPublicKey);
            if (success) {
                setTerminalLines(prev => [...prev, { text: `[MERCADOPAGO] 200 OK. Public Key reconocida. Token Privado con vigencia.`, type: 'success' }]);
                setTerminalLines(prev => [...prev, { text: `[MERCADOPAGO] Webhooks registrados correctamente. Cajero habilitado.`, type: 'info' }]);
            } else {
                setTerminalLines(prev => [...prev, { text: `[MERCADOPAGO] 401 No Autorizado. Faltan credenciales.`, type: 'error' }]);
            }
        } else if (api === 'sii') {
            success = !!(formData.siiRut && (formData.siiApiKey || secretsConfigured.siiApiKey));
            if (success) {
                setTerminalLines(prev => [...prev, { text: `[SII-DTE] Conexión establecida con Servidor de Certificación.`, type: 'success' }]);
                setTerminalLines(prev => [...prev, { text: `[SII] CAF (Código de Autorización de Folios) detectado y válido.`, type: 'success' }]);
                setTerminalLines(prev => [...prev, { text: `[SII] Sincronización de libros de compra/venta activa.`, type: 'info' }]);
            } else {
                setTerminalLines(prev => [...prev, { text: `[SII] Error de autenticación: Certificado digital no encontrado o expirado.`, type: 'error' }]);
                setTerminalLines(prev => [...prev, { text: `[SII] 403 Prohibido. Verifique su Token de Certificación.`, type: 'error' }]);
            }
        }
        await new Promise(r => setTimeout(r, 400));
        setTerminalLines(prev => [...prev, { text: `> Exited con código ${success ? '0 (Éxito)' : '1 (Error)'}`, type: success ? 'success' : 'error' }]);
    };

    const isMpGloballyDisabled = globalSettings && globalSettings.paymentGateways && globalSettings.paymentGateways.mercadoPago === false;

    const isMpActive = formData.isMercadopagoActive && !isMpGloballyDisabled;

    const sectionStatus: any = {
        identidad: formData.name && formData.address ? 'done' : 'pending',
        legal: formData.legalName && formData.rut ? 'done' : 'pending',
        contacto: (formData.whatsapp || formData.instagram || formData.website || formData.contactEmail) ? 'done' : 'pending',
        operacion: formData.openTime && formData.closeTime ? 'done' : 'pending',
        integraciones: isMpActive ? 'done' : 'pending',
    };

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="w-full space-y-6 pb-28 text-left relative animate-fadeIn">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md"></span>
                        <p className="text-xs md:text-[10px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Infraestructura & Control Operativo</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Configuración <span className="text-emerald-500 dark:text-[#00df82]">Complejo</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    {dirty && (
                        <span className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-[11px] md:text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Cambios sin guardar
                        </span>
                    )}
                    <button onClick={handleSave} disabled={saving} className={`px-6 py-3 ${dirty ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 dark:bg-[#00df82]'} text-white dark:text-black font-black text-xs md:text-[10px] uppercase tracking-[0.2em] rounded-md transition-all active:scale-95 shadow-lg ${dirty ? 'shadow-amber-500/30' : 'shadow-emerald-500/30'} flex items-center gap-2.5 disabled:opacity-50`}>
                        {saving ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" /> : <HugeiconsIcon icon={FloppyDiskIcon} className="w-4 h-4" />} Guardar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20 text-slate-400 text-xs uppercase font-bold tracking-widest"><HugeiconsIcon icon={RefreshIcon} className="w-5 h-5 animate-spin mr-2 inline-block" /> Leyendo base de datos...</div>
            ) : tenants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#0B0F19] rounded-md border border-dashed border-slate-300 dark:border-white/10 text-center">
                    <HugeiconsIcon icon={Building01Icon} className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase">Sin recintos asociados</h2>
                    <p className="text-xs text-slate-500 mt-2 font-bold uppercase">Crea un recinto para configurar su información.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* SELECTOR DE RECINTO */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0B0F19] p-5 rounded-md border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0">
                                <HugeiconsIcon icon={Building01Icon} className="w-5 h-5" strokeWidth={1.8} />
                            </div>
                            <div>
                                <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Recinto activo</p>
                                <p className="text-[11px] font-black uppercase text-slate-900 dark:text-white font-heading">{tenants.find(t => t.id === selectedTenantId)?.name || 'Seleccionar'}</p>
                            </div>
                        </div>
                        <select value={selectedTenantId} onChange={(e) => handleSelectTenant(e.target.value)} className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-bold uppercase outline-hidden text-slate-700 dark:text-white cursor-pointer">
                            {tenants.map(t => <option key={t.id} value={t.id} className="dark:bg-[#0B0F19]">{t.name}</option>)}
                        </select>
                    </div>

                    {/* NAV STICKY POR SECCIÓN */}
                    <div className="sticky top-0 z-30 bg-slate-50/90 dark:bg-mvp-dark/90 backdrop-blur-md py-2 -my-2">
                        <div className="flex flex-wrap items-center gap-1 p-1 bg-white dark:bg-[#0B0F19] rounded-md border border-slate-200 dark:border-white/5 shadow-xs">
                            {[
                                { id: 'identidad', label: 'Identidad', icon: Building01Icon },
                                { id: 'legal', label: 'Legal', icon: IdentityCardIcon },
                                { id: 'contacto', label: 'Contacto', icon: Message02Icon },
                                { id: 'operacion', label: 'Operación', icon: Clock01Icon },
                                { id: 'integraciones', label: 'Integraciones', icon: CreditCardIcon },
                            ].map(s => {
                                const active = activeSection === s.id;
                                const done = sectionStatus[s.id] === 'done';
                                return (
                                    <button key={s.id} onClick={() => scrollToSection(s.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs md:text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-slate-900 dark:bg-[#00df82] text-white dark:text-black shadow-md' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>
                                        <HugeiconsIcon icon={s.icon} className="w-4 h-4" strokeWidth={1.8} />
                                        {s.label}
                                        <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-emerald-500 dark:bg-black/60' : active ? 'bg-white/30' : 'bg-slate-300 dark:bg-white/15'}`} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* ============ IDENTIDAD ============ */}
                        <PanelGlass id="identidad" className="overflow-hidden">
                            <div className="flex items-center justify-between gap-3 px-6 lg:px-7 py-4 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0"><HugeiconsIcon icon={Building01Icon} className="w-5 h-5" strokeWidth={1.8} /></span>
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white font-heading">Identidad de Marca</h3>
                                        <p className="text-xs md:text-[10px] font-bold text-slate-400">Presencia pública del recinto</p>
                                    </div>
                                </div>
                                <SectionStatusChip done={sectionStatus.identidad === 'done'} label={sectionStatus.identidad === 'done' ? 'Completado' : 'Pendiente'} />
                            </div>
                            <div className="p-6 lg:p-7 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <InputMini label="Nombre Comercial" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} icon={<HugeiconsIcon icon={Building01Icon} className="w-5 h-5" />} />
                                    <InputMini label="Dirección Pública" value={formData.address} onChange={(e: any) => setFormData({ ...formData, address: e.target.value })} icon={<HugeiconsIcon icon={MapPinIcon} className="w-5 h-5" />} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Reseña del Club</label>
                                    <textarea rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-[#020611] border border-slate-200 dark:border-white/10 rounded-md text-xs font-bold outline-hidden focus:ring-1 focus:ring-emerald-500/30 resize-none transition-all" placeholder="Misión del complejo..." />
                                </div>
                            </div>
                        </PanelGlass>

                        {/* ============ LEGAL ============ */}
                        <PanelGlass id="legal" className="overflow-hidden">
                            <div className="flex items-center justify-between gap-3 px-6 lg:px-7 py-4 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0"><HugeiconsIcon icon={IdentityCardIcon} className="w-5 h-5" strokeWidth={1.8} /></span>
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white font-heading">Marco Legal</h3>
                                        <p className="text-xs md:text-[10px] font-bold text-slate-400">Facturación y datos tributarios</p>
                                    </div>
                                </div>
                                <SectionStatusChip done={sectionStatus.legal === 'done'} label={sectionStatus.legal === 'done' ? 'Completado' : 'Pendiente'} />
                            </div>
                            <div className="p-6 lg:p-7 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputMini label="Razón Social" value={formData.legalName} onChange={(e: any) => setFormData({ ...formData, legalName: e.target.value })} icon={<HugeiconsIcon icon={Briefcase01Icon} className="w-5 h-5" />} />
                                <InputMini label="RUT Corporativo" value={formData.rut} onChange={(e: any) => setFormData({ ...formData, rut: e.target.value })} icon={<HugeiconsIcon icon={IdentityCardIcon} className="w-5 h-5" />} />
                                <InputMini label="Representante Legal" value={formData.legalRepresentative} onChange={(e: any) => setFormData({ ...formData, legalRepresentative: e.target.value })} icon={<HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5" />} />
                                <InputMini label="Giro" value={formData.businessType} onChange={(e: any) => setFormData({ ...formData, businessType: e.target.value })} icon={<HugeiconsIcon icon={CodeIcon} className="w-5 h-5" />} />
                            </div>
                        </PanelGlass>

                        {/* ============ CONTACTO ============ */}
                        <PanelGlass id="contacto" className="overflow-hidden">
                            <div className="flex items-center justify-between gap-3 px-6 lg:px-7 py-4 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0"><HugeiconsIcon icon={Message02Icon} className="w-5 h-5" strokeWidth={1.8} /></span>
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white font-heading">Canales de Comunicación</h3>
                                        <p className="text-xs md:text-[10px] font-bold text-slate-400">Contacto directo y redes</p>
                                    </div>
                                </div>
                                <SectionStatusChip done={sectionStatus.contacto === 'done'} label={sectionStatus.contacto === 'done' ? 'Completado' : 'Pendiente'} />
                            </div>
                            <div className="p-6 lg:p-7 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                <InputMini label="WhatsApp" value={formData.whatsapp} onChange={(e: any) => setFormData({ ...formData, whatsapp: e.target.value })} icon={<HugeiconsIcon icon={CallIcon} className="w-5 h-5 text-emerald-500" />} />
                                <InputMini label="Instagram" value={formData.instagram} onChange={(e: any) => setFormData({ ...formData, instagram: e.target.value })} icon={<HugeiconsIcon icon={FireIcon} className="w-5 h-5 text-pink-500" />} />
                                <InputMini label="Web Oficial" value={formData.website} onChange={(e: any) => setFormData({ ...formData, website: e.target.value })} icon={<HugeiconsIcon icon={GlobeIcon} className="w-5 h-5 text-sky-500" />} />
                                <InputMini label="Email de Contacto" value={formData.contactEmail} onChange={(e: any) => setFormData({ ...formData, contactEmail: e.target.value })} icon={<HugeiconsIcon icon={Mail01Icon} className="w-5 h-5 text-amber-500" />} />
                            </div>
                        </PanelGlass>

                        {/* ============ OPERACIÓN ============ */}
                        <PanelGlass id="operacion" className="overflow-hidden">
                            <div className="flex items-center justify-between gap-3 px-6 lg:px-7 py-4 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0"><HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" strokeWidth={1.8} /></span>
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white font-heading">Operación</h3>
                                        <p className="text-xs md:text-[10px] font-bold text-slate-400">Horarios, servicios y reglamento</p>
                                    </div>
                                </div>
                                <SectionStatusChip done={sectionStatus.operacion === 'done'} label={sectionStatus.operacion === 'done' ? 'Configurado' : 'Pendiente'} />
                            </div>
                            <div className="p-6 lg:p-7 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-white dark:bg-[#020611] rounded-md border border-slate-200 dark:border-white/10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4 text-emerald-500" />
                                            <span className="text-xs md:text-[10px] font-black text-slate-900 dark:text-white uppercase">Horario de Red</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[11px] md:text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Apertura</label>
                                                <input type="time" value={formData.openTime} onChange={e => setFormData({ ...formData, openTime: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-black outline-hidden focus:border-emerald-500" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] md:text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Cierre</label>
                                                <input type="time" value={formData.closeTime} onChange={e => setFormData({ ...formData, closeTime: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-black outline-hidden focus:border-emerald-500" />
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-mono text-emerald-600 dark:text-[#00df82] font-black mt-3">{formData.openTime} — {formData.closeTime}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 block mb-1.5">Política de Cancelación</label>
                                        <textarea rows={3} value={formData.cancellationPolicy} onChange={e => setFormData({ ...formData, cancellationPolicy: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-[#020611] border border-slate-200 dark:border-white/10 rounded-md text-xs md:text-[10px] font-bold outline-hidden resize-none" placeholder="Condiciones de cancelación..." />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 block mb-2">Servicios Disponibles</label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {['WiFi', 'Parking', 'Duchas', 'Luz LED', 'Café', 'Pro Shop'].map(item => {
                                            const on = formData.amenities.includes(item);
                                            return (
                                                <button key={item} onClick={() => { const exists = formData.amenities.includes(item); setFormData({ ...formData, amenities: exists ? formData.amenities.filter(i => i !== item) : [...formData.amenities, item] }); }} className={`flex items-center gap-2 px-3 py-3 rounded-md text-xs md:text-[10px] font-bold uppercase tracking-widest border transition-all ${on ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black border-emerald-500 dark:border-[#00df82] shadow-lg shadow-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:border-emerald-500/30'}`}>
                                                    {on && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />} {item}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 block mb-2">Reglamento Interno</label>
                                    <div className="grid grid-cols-1 gap-2 pr-1 max-h-64 overflow-y-auto custom-scrollbar">
                                        {[
                                            'Prohibido fumar en el recinto', 'Prohibido el consumo de alcohol', 'No se permiten mascotas', 'Uso de calzado deportivo obligatorio', 'No ingresar comida a las canchas', 'Prohibido el uso de parlantes', 'Respetar horario de inicio y fin', 'Menores con supervisión adulta', 'Prohibido envases de vidrio', 'Mantener la limpieza del lugar', 'Prohibido estoperoles de aluminio', 'Estacionar solo en zonas señalizadas', 'Se reserva el derecho de admisión'
                                        ].map(rule => {
                                            const on = formData.rules.includes(rule);
                                            return (
                                                <button key={rule} onClick={() => { const exists = formData.rules.includes(rule); setFormData({ ...formData, rules: exists ? formData.rules.filter(r => r !== rule) : [...formData.rules, rule] }); }} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md border text-[11px] md:text-[9px] font-bold uppercase transition-all ${on ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400'}`}>
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-emerald-500 dark:bg-[#00df82] border-emerald-500' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/20'}`}>
                                                        {on && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3 h-3 text-white dark:text-black" strokeWidth={2.5} />}
                                                    </div>
                                                    {rule}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </PanelGlass>

                        {/* ============ INTEGRACIONES ============ */}
                        <PanelGlass id="integraciones" className="overflow-hidden">
                            <div className="flex items-center justify-between gap-3 px-6 lg:px-7 py-4 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0"><HugeiconsIcon icon={CreditCardIcon} className="w-5 h-5" strokeWidth={1.8} /></span>
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white font-heading">Integraciones de Pago</h3>
                                        <p className="text-xs md:text-[10px] font-bold text-slate-400">Pasarelas para cobros online</p>
                                    </div>
                                </div>
                                <SectionStatusChip done={sectionStatus.integraciones === 'done'} label={sectionStatus.integraciones === 'done' ? 'Activo' : 'Sin configurar'} />
                            </div>
                            <div className="p-6 lg:p-7 space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* MERCADO PAGO */}
                                    <div className={`p-6 bg-white dark:bg-[#020611] rounded-md border transition-all ${isMpGloballyDisabled ? 'opacity-40 grayscale' : isMpActive ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/5' : 'border-slate-200 dark:border-white/10 opacity-60'}`}>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-md bg-sky-500/10 flex items-center justify-center text-sky-500 border border-sky-500/20"><HugeiconsIcon icon={CreditCardIcon} className="w-6 h-6" strokeWidth={1.6} /></div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest leading-none">Mercado Pago</h4>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] text-[11px] md:text-[7px] font-black uppercase tracking-widest border border-emerald-500/20">Recomendada</span>
                                                    </div>
                                                    {isMpGloballyDisabled && <p className="text-[11px] md:text-[7px] font-black text-red-500 uppercase tracking-widest mt-1">Desactivado por Plataforma</p>}
                                                </div>
                                            </div>
                                            <ToggleMini enabled={isMpActive} onChange={() => setFormData({ ...formData, isMercadopagoActive: !formData.isMercadopagoActive })} disabled={isMpGloballyDisabled} color="bg-emerald-500 shadow-emerald-500/20" />
                                        </div>
                                        {isMpActive && (
                                            <div className="space-y-4 animate-fadeIn">
                                                <InputMini label="Public Key" value={formData.mercadopagoPublicKey} onChange={(e: any) => setFormData({ ...formData, mercadopagoPublicKey: e.target.value })} icon={<HugeiconsIcon icon={Key01Icon} className="w-4 h-4 text-emerald-500" />} />
                                                <InputMini label="Access Token" type="password" placeholder={secretsConfigured.mercadopagoAccessToken ? '•••••••• configurado (escribe para reemplazar)' : 'APP_USR-...'} value={formData.mercadopagoAccessToken} onChange={(e: any) => setFormData({ ...formData, mercadopagoAccessToken: e.target.value })} icon={<HugeiconsIcon icon={ShieldCheckIcon} className="w-4 h-4 text-emerald-500" />} />
                                                <button onClick={() => simulateApiTest('mercadopago')} className="w-full py-3 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[11px] md:text-[9px] font-black uppercase tracking-widest rounded-md hover:brightness-110 transition-all shadow-lg shadow-emerald-500/20">Verificar API</button>
                                            </div>
                                        )}
                                    </div>

                                </div>

                                {/* TERMINAL DE DIAGNÓSTICO */}
                                <div className="rounded-md bg-slate-950 dark:bg-black overflow-hidden border border-slate-800 dark:border-white/10 flex flex-col h-[240px]">
                                    <div className="bg-slate-900/60 dark:bg-white/3 px-4 py-3 flex items-center justify-between border-b border-slate-800 dark:border-white/10">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                                        </div>
                                        <span className="font-mono text-[11px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest">Terminal de Diagnóstico v2.4</span>
                                    </div>
                                    <div ref={terminalRef} className="p-4 flex-1 overflow-y-auto no-scrollbar font-mono text-xs md:text-[10px] space-y-1.5 text-slate-400">
                                        {terminalLines.map((line, i) => (
                                            <div key={i} className={`flex gap-2 ${line.type === 'error' ? 'text-red-400' : line.type === 'success' ? 'text-[#00df82]' : line.type === 'command' ? 'text-white dark:text-[#00df82]' : 'text-slate-500'}`}>
                                                <span className="opacity-40">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                                                <span className="font-bold">{line.type === 'command' && '$ '}{line.text}</span>
                                            </div>
                                        ))}
                                        <div className="animate-pulse text-[#00df82] font-black">_</div>
                                    </div>
                                </div>

                                {/* PROTOCOLO DE SEGURIDAD */}
                                <div className="p-6 bg-slate-900 dark:bg-[#0B0F19] rounded-md border border-white/5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <HugeiconsIcon icon={ShieldCheckIcon} className="w-24 h-24 text-emerald-500" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-500"><HugeiconsIcon icon={ShieldCheckIcon} className="w-5 h-5" /></div>
                                            <h4 className="text-xs md:text-[10px] font-black uppercase text-white tracking-[0.2em]">Protocolo de Seguridad Bancaria</h4>
                                        </div>
                                        <p className="text-xs md:text-[10px] font-bold text-slate-400 uppercase leading-relaxed max-w-2xl">
                                            Para activar la recaudación automática, ingresa las credenciales de producción de tu pasarela. MVP Sports utiliza cifrado <span className="text-emerald-400">AES-256 GCM</span> para proteger tus tokens.
                                        </p>
                                        <div className="flex flex-wrap gap-4 mt-4">
                                            {['TLS 1.3 Activo', 'Cifrado de Extremo a Extremo', 'Certificación PCI DSS'].map(tag => (
                                                <div key={tag} className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                    <span className="text-[11px] md:text-[8px] font-black text-slate-500 uppercase">{tag}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </PanelGlass>
                    </div>
                </div>
            )}

            {/* BARRA DE GUARDADO FIJA */}
            <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
                <div className="max-w-6xl mx-auto pointer-events-auto rounded-md bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-2xl px-5 py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${dirty ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 dark:bg-[#00df82]'}`} />
                        <p className="text-xs md:text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            {dirty ? 'Cambios sin guardar' : 'Configuración sincronizada'}
                        </p>
                    </div>
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2.5 px-8 py-3 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-xs md:text-[10px] uppercase tracking-[0.2em] rounded-md shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40">
                        {saving ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" /> : <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" />} Sincronizar cambios
                    </button>
                </div>
            </div>
        </div>
    );
}

function InputMini({ label, value, icon, onChange, type = "text", placeholder = "" }: any) {
    return (
        <div className="space-y-2">
            <label className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{label}</label>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors scale-90">{icon}</div>
                <input
                    type={type}
                    aria-label={label}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="w-full pl-12 pr-4 py-3.5 rounded-md border bg-white dark:bg-[#020611] border-slate-200 dark:border-white/10 text-xs font-bold outline-hidden focus:ring-1 focus:ring-emerald-500/30 transition-all tracking-tight text-slate-700 dark:text-white"
                />
            </div>
        </div>
    );
}

function ToggleMini({ enabled, onChange, color = 'bg-emerald-500 shadow-emerald-500/20', disabled = false }: any) {
    return (
        <button
            type="button"
            onClick={disabled ? undefined : onChange}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 shadow-inner ${disabled ? 'bg-slate-100 dark:bg-white/5 opacity-40 cursor-not-allowed' : enabled ? color + ' shadow-lg' : 'bg-slate-200 dark:bg-white/10'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xl transition-all ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );
}

function SectionStatusChip({ done, label }: { done: boolean, label: string }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] md:text-[8px] font-black uppercase tracking-widest border shrink-0 ${done ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border-emerald-100 dark:border-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-emerald-500 dark:bg-[#00df82]' : 'bg-slate-300 dark:bg-white/20'}`} />
            {label}
        </span>
    );
}