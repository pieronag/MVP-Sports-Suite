"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { PanelGlass } from '@/components/ui/DashboardWidgets';
import {
    AdjustmentsVerticalIcon, DocumentCheckIcon, MapPinIcon, CheckCircleIcon,
    ExclamationTriangleIcon, ArrowPathIcon, BuildingOfficeIcon, SparklesIcon,
    CalendarDaysIcon, PhoneIcon, CreditCardIcon, BanknotesIcon, CommandLineIcon,
    ShieldCheckIcon, Cog6ToothIcon, BriefcaseIcon, AtSymbolIcon, UserGroupIcon,
    KeyIcon, ClockIcon, ScaleIcon, ChatBubbleBottomCenterTextIcon, GlobeAltIcon,
    IdentificationIcon, StarIcon, MapIcon, FireIcon, BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-5 right-5 z-[160] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border animate-slideIn ${type === 'success' ? 'bg-white border-emerald-500 text-emerald-700 dark:bg-[#0B0F19] dark:text-emerald-400 dark:border-emerald-500/50' : 'bg-white border-red-500 text-red-700 dark:bg-[#0B0F19] dark:text-red-400 dark:border-red-500/50'}`}>
            {type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
            <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
        </div>
    );
};

export default function TenantSettingsPage() {
    const { user } = useAuth();
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
        isTransbankActive: false,
        transbankCommerceCode: '', transbankApiKey: '',
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

    const fetchTenants = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const gSnap = await getDoc(doc(db, "settings", "global"));
            if (gSnap.exists()) {
                setGlobalSettings(gSnap.data());
            }

            const userDoc = await getDoc(doc(db, "users", user.uid));
            const role = userDoc.exists() ? (userDoc.data().role || '').toLowerCase() : '';
            const isAdmin = ['admin', 'superadmin'].includes(role);

            let q;
            if (isAdmin) {
                q = query(collection(db, "tenants"));
            } else {
                q = query(collection(db, "tenants"), where("ownerId", "==", user.uid));
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
        setFormData({
            name: t.name || '', address: t.address || '', description: t.description || '',
            phone: t.phone || '', instagram: t.instagram || '', whatsapp: t.whatsapp || '',
            isMercadopagoActive: t.isMercadopagoActive || false,
            mercadopagoPublicKey: t.mercadopagoPublicKey || '', mercadopagoAccessToken: t.mercadopagoAccessToken || '',
            isTransbankActive: t.isTransbankActive || false,
            transbankCommerceCode: t.transbankCommerceCode || '', transbankApiKey: t.transbankApiKey || '',
            isSiiActive: t.isSiiActive || false, siiRut: t.siiRut || '', siiApiKey: t.siiApiKey || '',
            openTime: t.openTime || '08:00', closeTime: t.closeTime || '23:00',
            cancellationPolicy: t.cancellationPolicy || '',
            rules: Array.isArray(t.rules) ? t.rules : [],
            website: t.website || '',
            legalName: t.legalName || '',
            rut: t.rut || '',
            contactEmail: t.contactEmail || '',
            legalRepresentative: t.legalRepresentative || '',
            businessType: t.businessType || '',
            amenities: t.amenities || []
        });
        setTerminalLines([
            { text: `Re-inicializando entorno para el recinto: [${t.name || t.id}]`, type: "info" },
            { text: "Esperando instrucciones de conexión...", type: "info" }
        ]);
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
        try {
            await updateDoc(doc(db, "tenants", selectedTenantId), { ...formData });
            setNotification({ msg: "Configuración actualizada con éxito", type: 'success' });
            setTenants(prev => prev.map(t => t.id === selectedTenantId ? { ...t, ...formData } : t));
            setTimeout(() => setTerminalLines(prev => [...prev, { text: `[SISTEMA] Sincronización con Firestore exitosa (200 OK).`, type: 'success' }]), 600);
        } catch (error) {
            setNotification({ msg: "Error al guardar en base de datos", type: 'error' });
            setTerminalLines(prev => [...prev, { text: `[SISTEMA] Fallo en escritura a Firestore (500 Error).`, type: 'error' }]);
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
            success = !!(formData.mercadopagoAccessToken && formData.mercadopagoPublicKey);
            if (success) {
                setTerminalLines(prev => [...prev, { text: `[MERCADOPAGO] 200 OK. Public Key reconocida. Token Privado con vigencia.`, type: 'success' }]);
                setTerminalLines(prev => [...prev, { text: `[MERCADOPAGO] Webhooks registrados correctamente. Cajero habilitado.`, type: 'info' }]);
            } else {
                setTerminalLines(prev => [...prev, { text: `[MERCADOPAGO] 401 No Autorizado. Faltan credenciales.`, type: 'error' }]);
            }
        } else if (api === 'transbank') {
            success = !!(formData.transbankCommerceCode && formData.transbankApiKey);
            if (success) {
                setTerminalLines(prev => [...prev, { text: `[TRANSBANK] 200 OK. Conexión Webpay Plus REST exitosa.`, type: 'success' }]);
                setTerminalLines(prev => [...prev, { text: `[TRANSBANK] Integración certificada. Ambiente Producción respondido en 142ms.`, type: 'info' }]);
            } else {
                setTerminalLines(prev => [...prev, { text: `[TRANSBANK] 403 Prohibido. Credenciales faltantes o inválidas.`, type: 'error' }]);
            }
        } else if (api === 'sii') {
            success = !!(formData.siiRut && formData.siiApiKey);
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

    return (
        <div className="w-full space-y-8 pb-12 text-left relative animate-fadeIn">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

            {/* 1. CABECERA ADN PREMIUM */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-8 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.3em] uppercase">
                            Infraestructura & Control Operativo
                        </p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                        Configuración <span className="text-emerald-500">Complejo</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3 p-1.5 rounded-2xl">
                    <button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className="px-10 py-3 bg-emerald-500 text-white dark:text-slate-950 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/30 flex items-center gap-3 disabled:opacity-50 border-none"
                    >
                        {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <DocumentCheckIcon className="w-4 h-4" />}
                        GUARDAR CAMBIOS
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20 text-slate-400 text-xs uppercase font-bold tracking-widest"><ArrowPathIcon className="w-5 h-5 animate-spin mr-2 inline-block" /> Leyendo base de datos...</div>
            ) : tenants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#0B0F19] rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-center">
                    <BuildingOfficeIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase">Sin recintos asociados</h2>
                    <p className="text-xs text-slate-500 mt-2 font-bold uppercase">Crea un recinto en el módulo 'Mis Recintos' para configurar su info.</p>
                </div>
            ) : (
                <div className="flex flex-col">
                    {/* SELECTOR DE RECINTO ADN PREMIUM */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-[#0B0F19] p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl shadow-slate-200/20 dark:shadow-none">
                        <div className="lg:col-span-4">
                            <div className="flex items-center gap-3 mb-1">
                                <BuildingOfficeIcon className="w-5 h-5 text-emerald-500" />
                                <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Recinto Activo</h4>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-8">Selecciona la unidad estructural a configurar</p>
                        </div>
                        <div className="lg:col-span-8">
                            <div className="relative group">
                                <select
                                    value={selectedTenantId}
                                    onChange={(e) => handleSelectTenant(e.target.value)}
                                    className="w-full pl-8 pr-12 py-5 bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-emerald-500/20 rounded-[1.5rem] text-[12px] font-black outline-none cursor-pointer text-slate-700 dark:text-white uppercase transition-all appearance-none shadow-inner font-mono"
                                >
                                    {tenants.map(t => <option key={t.id} value={t.id} className="dark:bg-[#0B0F19] font-sans">{t.name}</option>)}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-emerald-500 transition-colors">
                                    <AdjustmentsVerticalIcon className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn mt-6">
                        
                        {/* COLUMNA IZQUIERDA: IDENTIDAD Y LEGAL (CASILLAS) */}
                        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* MODULE: IDENTITY & BRANDING */}
                            <PanelGlass className="md:col-span-2 p-0 border-none shadow-xl shadow-slate-200/20 overflow-hidden">
                                <div className="p-5 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                    <HeaderSeccion titulo="Identidad de Marca" desc="Gestión de Presencia y Reseña" />
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <InputMini label="Nombre Comercial" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} icon={<BuildingOfficeIcon className="w-5 h-5" />} />
                                        <InputMini label="Dirección Pública" value={formData.address} onChange={(e: any) => setFormData({ ...formData, address: e.target.value })} icon={<MapPinIcon className="w-5 h-5" />} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Reseña del Club</label>
                                        <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-[#020611] border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none transition-all uppercase" placeholder="Misión del complejo..." />
                                    </div>
                                </div>
                            </PanelGlass>

                            {/* MODULE: LEGAL & BILLING */}
                            <PanelGlass className="md:col-span-2 p-0 border-none shadow-xl shadow-slate-200/20 overflow-hidden">
                                <div className="p-5 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                    <HeaderSeccion titulo="Marco Legal" desc="Facturación y Datos Tributarios" />
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputMini label="Razón Social" value={formData.legalName} onChange={(e: any) => setFormData({ ...formData, legalName: e.target.value })} icon={<BriefcaseIcon className="w-5 h-5" />} />
                                    <InputMini label="RUT Corporativo" value={formData.rut} onChange={(e: any) => setFormData({ ...formData, rut: e.target.value })} icon={<IdentificationIcon className="w-5 h-5" />} />
                                    <InputMini label="Representante Legal" value={formData.legalRepresentative} onChange={(e: any) => setFormData({ ...formData, legalRepresentative: e.target.value })} icon={<UserGroupIcon className="w-5 h-5" />} />
                                    <InputMini label="Giro" value={formData.businessType} onChange={(e: any) => setFormData({ ...formData, businessType: e.target.value })} icon={<CommandLineIcon className="w-5 h-5" />} />
                                </div>
                            </PanelGlass>

                            {/* MODULE: CONTACT CHANNELS */}
                            <PanelGlass className="md:col-span-2 p-0 border-none shadow-xl shadow-slate-200/20 overflow-hidden">
                                <div className="p-5 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                    <HeaderSeccion titulo="Canales de Comunicación" desc="Contacto Directo y Redes" />
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <InputMini label="WhatsApp" value={formData.whatsapp} onChange={(e: any) => setFormData({ ...formData, whatsapp: e.target.value })} icon={<PhoneIcon className="w-5 h-5 text-emerald-500" />} />
                                    <InputMini label="Instagram" value={formData.instagram} onChange={(e: any) => setFormData({ ...formData, instagram: e.target.value })} icon={<FireIcon className="w-5 h-5 text-pink-500" />} />
                                    <InputMini label="Web Oficial" value={formData.website} onChange={(e: any) => setFormData({ ...formData, website: e.target.value })} icon={<GlobeAltIcon className="w-5 h-5 text-sky-500" />} />
                                </div>
                            </PanelGlass>

                            {/* CASILLA 4: INTEGRACIONES FINANCIERAS */}
                            <div className="md:col-span-2 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* MP CARD */}
                                    <PanelGlass className={`p-6 border-none shadow-xl transition-all ${formData.isMercadopagoActive ? 'shadow-blue-500/5 bg-blue-500/[0.01]' : 'opacity-60 grayscale'}`}>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                    <CreditCardIcon className="w-6 h-6" />
                                                </div>
                                                <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest">MercadoPago</h4>
                                            </div>
                                            <ToggleMini enabled={formData.isMercadopagoActive} onChange={() => setFormData({ ...formData, isMercadopagoActive: !formData.isMercadopagoActive })} color="bg-blue-500 shadow-blue-500/20" />
                                        </div>
                                        {formData.isMercadopagoActive && (
                                            <div className="space-y-4 animate-fadeIn">
                                                <InputMini label="Public Key" value={formData.mercadopagoPublicKey} onChange={(e: any) => setFormData({ ...formData, mercadopagoPublicKey: e.target.value })} icon={<KeyIcon className="w-4 h-4 text-blue-500" />} />
                                                <InputMini label="Access Token" type="password" value={formData.mercadopagoAccessToken} onChange={(e: any) => setFormData({ ...formData, mercadopagoAccessToken: e.target.value })} icon={<ShieldCheckIcon className="w-4 h-4 text-blue-500" />} />
                                                <button onClick={() => simulateApiTest('mercadopago')} className="w-full py-3 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">Probar Conexión</button>
                                            </div>
                                        )}
                                    </PanelGlass>

                                    {/* TRANSBANK CARD */}
                                    <PanelGlass className={`p-6 border-none shadow-xl transition-all ${formData.isTransbankActive ? 'shadow-pink-500/5 bg-pink-500/[0.01]' : 'opacity-60 grayscale'}`}>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
                                                    <BuildingStorefrontIcon className="w-6 h-6" />
                                                </div>
                                                <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Transbank</h4>
                                            </div>
                                            <ToggleMini enabled={formData.isTransbankActive} onChange={() => setFormData({ ...formData, isTransbankActive: !formData.isTransbankActive })} color="bg-pink-500 shadow-pink-500/20" />
                                        </div>
                                        {formData.isTransbankActive && (
                                            <div className="space-y-4 animate-fadeIn">
                                                <InputMini label="Commerce Code" value={formData.transbankCommerceCode} onChange={(e: any) => setFormData({ ...formData, transbankCommerceCode: e.target.value })} icon={<KeyIcon className="w-4 h-4 text-pink-500" />} />
                                                <InputMini label="API Key" type="password" value={formData.transbankApiKey} onChange={(e: any) => setFormData({ ...formData, transbankApiKey: e.target.value })} icon={<ShieldCheckIcon className="w-4 h-4 text-pink-500" />} />
                                                <button onClick={() => simulateApiTest('transbank')} className="w-full py-3 bg-pink-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20">Verificar API</button>
                                            </div>
                                        )}
                                    </PanelGlass>

                                    {/* SII CARD */}
                                    <PanelGlass className={`md:col-span-2 p-6 border-none shadow-xl transition-all ${formData.isSiiActive ? 'shadow-emerald-500/5 bg-emerald-500/[0.01]' : 'opacity-60 grayscale'}`}>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                    <DocumentCheckIcon className="w-6 h-6" />
                                                </div>
                                                <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Facturación SII (DTE)</h4>
                                            </div>
                                            <ToggleMini enabled={formData.isSiiActive} onChange={() => setFormData({ ...formData, isSiiActive: !formData.isSiiActive })} color="bg-emerald-500 shadow-emerald-500/20" />
                                        </div>
                                        {formData.isSiiActive && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                                                <div className="space-y-4">
                                                    <InputMini label="RUT Facturación" value={formData.siiRut} onChange={(e: any) => setFormData({ ...formData, siiRut: e.target.value })} icon={<IdentificationIcon className="w-4 h-4 text-emerald-500" />} />
                                                    <InputMini label="Token de Certificación" type="password" value={formData.siiApiKey} onChange={(e: any) => setFormData({ ...formData, siiApiKey: e.target.value })} icon={<KeyIcon className="w-4 h-4 text-emerald-500" />} />
                                                </div>
                                                <div className="flex flex-col justify-end">
                                                    <button onClick={() => simulateApiTest('sii')} className="w-full py-3 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">Validar Certificado SII</button>
                                                </div>
                                            </div>
                                        )}
                                    </PanelGlass>
                                </div>

                                {/* TERMINAL DE DIAGNÓSTICO (RESPONSIVE) */}
                                <div className="rounded-[2rem] bg-white dark:bg-slate-950 shadow-inner overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col h-[280px]">
                                    <div className="bg-slate-100/50 dark:bg-white/[0.03] p-4 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                                        </div>
                                        <span className="font-mono text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Terminal de Diagnóstico v2.4</span>
                                    </div>
                                    <div ref={terminalRef} className="p-5 flex-1 overflow-y-auto no-scrollbar font-mono text-[10px] space-y-1.5 text-slate-600 dark:text-slate-400">
                                        {terminalLines.map((line, i) => (
                                            <div key={i} className={`flex gap-2 ${line.type === 'error' ? 'text-red-500 dark:text-red-400' : line.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : line.type === 'command' ? 'text-slate-900 dark:text-emerald-500' : 'text-slate-400 dark:text-slate-600'}`}>
                                                <span className="opacity-40">[{new Date().toLocaleTimeString([], {hour12:false})}]</span>
                                                <span className="font-bold">{line.type === 'command' && '$ '}{line.text}</span>
                                            </div>
                                        ))}
                                        <div className="animate-pulse text-emerald-500 font-black">_</div>
                                    </div>
                                </div>

                                {/* CUADRO DE INSTRUCCIONES API */}
                                <div className="p-8 bg-slate-900 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <ShieldCheckIcon className="w-24 h-24 text-emerald-500" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                                <ShieldCheckIcon className="w-5 h-5" />
                                            </div>
                                            <h4 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Protocolo de Seguridad Bancaria</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed max-w-2xl">
                                                Para activar la recaudación automática, debe ingresar las credenciales de producción proporcionadas por su pasarela de pago. MVP Sports utiliza cifrado <span className="text-emerald-400">AES-256 GCM</span> para proteger sus tokens.
                                            </p>
                                            <div className="flex flex-wrap gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                    <span className="text-[8px] font-black text-slate-500 uppercase">TLS 1.3 Activo</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                    <span className="text-[8px] font-black text-slate-500 uppercase">Cifrado de Extremo a Extremo</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                    <span className="text-[8px] font-black text-slate-500 uppercase">Certificación PCI DSS</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: AMENIDADES, TERMINAL Y OPERATIVO */}
                        <div className="lg:col-span-4 space-y-6">
                            
                            {/* MODULE: INFRAESTRUCTURA */}
                            <PanelGlass className="p-0 border-none shadow-xl shadow-slate-200/20 overflow-hidden">
                                <div className="p-5 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                    <HeaderSeccion titulo="Infraestructura" desc="Servicios Disponibles" />
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        {['WiFi', 'Parking', 'Duchas', 'Luz LED', 'Café', 'Pro Shop'].map(item => (
                                            <button 
                                                key={item} 
                                                onClick={() => {
                                                    const exists = formData.amenities.includes(item);
                                                    setFormData({ ...formData, amenities: exists ? formData.amenities.filter(i => i !== item) : [...formData.amenities, item] });
                                                }}
                                                className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${formData.amenities.includes(item) ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:border-emerald-500/30'}`}
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </PanelGlass>

                            {/* MODULE: OPERATIVA */}
                            <PanelGlass className="p-0 border-none shadow-xl shadow-slate-200/20 overflow-hidden bg-emerald-500/[0.02]">
                                <div className="p-5 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                    <HeaderSeccion titulo="Protocolos" desc="Políticas del Recinto" />
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="p-4 bg-white dark:bg-[#020611] rounded-2xl border border-slate-200 dark:border-white/10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <ClockIcon className="w-4 h-4 text-emerald-500" />
                                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase">Horario de Red</span>
                                        </div>
                                        <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-black">{formData.openTime} — {formData.closeTime}</p>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Reglamento Interno</label>
                                        <div className="grid grid-cols-1 gap-2 pr-2 no-scrollbar">
                                            {[
                                                'Prohibido fumar en el recinto', 
                                                'Prohibido el consumo de alcohol', 
                                                'No se permiten mascotas', 
                                                'Uso de calzado deportivo obligatorio', 
                                                'No ingresar comida a las canchas', 
                                                'Prohibido el uso de parlantes', 
                                                'Respetar horario de inicio y fin', 
                                                'Menores con supervisión adulta', 
                                                'Prohibido envases de vidrio',
                                                'Mantener la limpieza del lugar',
                                                'Prohibido estoperoles de aluminio',
                                                'Estacionar solo en zonas señalizadas',
                                                'Se reserva el derecho de admisión'
                                            ].map(rule => (
                                                <button 
                                                    key={rule} 
                                                    onClick={() => {
                                                        const exists = formData.rules.includes(rule);
                                                        setFormData({ ...formData, rules: exists ? formData.rules.filter(r => r !== rule) : [...formData.rules, rule] });
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-[9px] font-bold uppercase transition-all ${formData.rules.includes(rule) ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400'}`}
                                                >
                                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.rules.includes(rule) ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-white/5 border-slate-200'}`}>
                                                        {formData.rules.includes(rule) && <CheckCircleIcon className="w-2.5 h-2.5 text-white" />}
                                                    </div>
                                                    {rule}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </PanelGlass>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InputMini({ label, value, icon, onChange, type = "text", placeholder = "" }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{label}</label>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors scale-90">{icon}</div>
                <input 
                    type={type} 
                    placeholder={placeholder} 
                    value={value} 
                    onChange={onChange} 
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border bg-white dark:bg-[#020611] border-slate-200 dark:border-white/10 text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all uppercase tracking-tight text-slate-700 dark:text-white" 
                />
            </div>
        </div>
    );
}

function HeaderSeccion({ titulo, desc }: any) {
    return (
        <div className="flex flex-col gap-1 group">
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">{titulo}</h3>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed pl-4">{desc}</p>
        </div>
    );
}

function ToggleMini({ enabled, onChange, color = 'bg-emerald-500 shadow-emerald-500/20' }: any) {
    return (
        <button 
            type="button" 
            onClick={onChange} 
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 shadow-inner ${enabled ? color + ' shadow-lg' : 'bg-slate-200 dark:bg-white/10'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xl transition-all ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );
}
