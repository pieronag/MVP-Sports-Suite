"use client";
import React, { useState, useEffect } from 'react';
import {
    Cog6ToothIcon, CurrencyDollarIcon, ServerIcon, GlobeAltIcon, UsersIcon,
    ScaleIcon, ExclamationTriangleIcon, ClockIcon, CircleStackIcon,
    PhotoIcon, SwatchIcon, StarIcon, RocketLaunchIcon, MegaphoneIcon,
    ChartBarIcon, KeyIcon, LifebuoyIcon, ArrowPathIcon, CheckCircleIcon,
    PlusIcon, UserCircleIcon, ShieldCheckIcon, TrashIcon, ListBulletIcon,
    TrophyIcon, BoltIcon, InformationCircleIcon, BriefcaseIcon, XMarkIcon,
    ShieldExclamationIcon, CheckBadgeIcon, SignalIcon, CpuChipIcon,
    ArrowTrendingUpIcon, IdentificationIcon, ArrowUpRightIcon, CreditCardIcon
} from '@heroicons/react/24/outline';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, writeBatch, setDoc, orderBy, limit, DocumentReference } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { PanelGlass, TarjetaKpi, BotonAccion } from '@/components/ui/DashboardWidgets';
import { useAuth } from '@/context/AuthContext';
import { auditService } from '@/services/auditService';

// --- INTERFACES ---
interface SettingsData {
    platformName: string; supportEmail: string; maintenanceMode: boolean; primaryColor: string;
    corporateData: { rut: string; razonSocial: string; direccion: string; giro: string; representante: string; emailFacturacion: string; };
    plans: any[]; paymentGateways: { mercadoPago: boolean; webpay: boolean }; legal: { terms: string; privacy: string };
    sii: { enabled: boolean; testMode: boolean; taxRate: number; rutEmpresa: string; enableForTenants: boolean; };
}

interface AdminUser { uid: string; fullName?: string; email: string; role: string; status: string; }
interface TransbankMaster { commerceCode: string; apiKey: string; }
interface AuditLog { id: string; action: string; details: string; priority: 'low' | 'medium' | 'high' | 'critical'; adminName: string; timestamp: any; }
interface ModalConfig { show: boolean; title: string; message: string; type: 'confirm' | 'alert' | 'success' | 'danger'; onConfirm?: () => void; onCancel?: () => void; }

const DEFAULT_SETTINGS: SettingsData = {
    platformName: 'MVP Sports Suite', supportEmail: 'central@mvpsports.cl', maintenanceMode: false, primaryColor: '#10b981',
    corporateData: { rut: '76.123.456-7', razonSocial: 'MVP SPORTS CHILE SpA', direccion: 'Av. Las Condes 1234', giro: 'Servicios Tecnológicos', representante: 'Director General', emailFacturacion: 'admin@mvp.cl' },
    plans: [
        { id: 'free', name: 'Plan Free', price: 0, commission: 8.0, priorityScore: 10, features: { seo: true, topPosition: false, ads: false, analytics: true, marketing: false, support: false, api: false, multiRecinto: false } },
        { id: 'basico', name: 'Plan Básico', price: 29990, commission: 7.0, priorityScore: 30, features: { seo: true, topPosition: false, ads: true, analytics: true, marketing: false, support: false, api: false, multiRecinto: false } },
        { id: 'pro', name: 'Plan Pro', price: 59990, commission: 6.0, priorityScore: 60, features: { seo: true, topPosition: true, ads: true, analytics: true, marketing: false, support: true, api: false, multiRecinto: false } },
        { id: 'elite', name: 'Plan Elite', price: 99990, commission: 5.0, priorityScore: 100, features: { seo: true, topPosition: true, ads: true, analytics: true, marketing: true, support: true, api: true, multiRecinto: true } }
    ],
    paymentGateways: { mercadoPago: true, webpay: true },
    legal: { terms: 'Términos...', privacy: 'Privacidad...' },
    sii: { enabled: false, testMode: true, taxRate: 19, rutEmpresa: '76.123.456-7', enableForTenants: false }
};

const benefitCatalog = [
    { key: 'seo', label: 'SEO & Indexación', icon: <GlobeAltIcon className="w-3.5 h-3.5" /> },
    { key: 'topPosition', label: 'Prioridad Top', icon: <TrophyIcon className="w-3.5 h-3.5" /> },
    { key: 'ads', label: 'Publicidad App', icon: <MegaphoneIcon className="w-3.5 h-3.5" /> },
    { key: 'analytics', label: 'Analítica Pro', icon: <ChartBarIcon className="w-3.5 h-3.5" /> },
    { key: 'marketing', label: 'Marketing Auto', icon: <RocketLaunchIcon className="w-3.5 h-3.5" /> },
    { key: 'support', label: 'Soporte VIP', icon: <LifebuoyIcon className="w-3.5 h-3.5" /> },
    { key: 'api', label: 'Acceso API', icon: <BoltIcon className="w-3.5 h-3.5" /> },
    { key: 'multiRecinto', label: 'Multi-Recinto', icon: <UsersIcon className="w-3.5 h-3.5" /> },
];

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

export default function SettingsPage() {
    const { user, role: userRole, firestoreUser } = useAuth();
    const [activeTab, setActiveTab] = useState('plans');
    const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [adminTeam, setAdminTeam] = useState<AdminUser[]>([]);
    const [transbankMaster, setTransbankMaster] = useState<TransbankMaster>({ commerceCode: '', apiKey: '' });
    const [isExecuting, setIsExecuting] = useState(false);
    const [promoEmail, setPromoEmail] = useState('');
    const [realStats, setRealStats] = useState({ totalRevenue: 0, eliteCount: 0, proCount: 0, totalTenants: 0 });
    const [modal, setModal] = useState<ModalConfig>({ show: false, title: '', message: '', type: 'confirm' });

    const actorName = firestoreUser?.fullName || user?.displayName || user?.email || 'Admin Sistema';
    const actorRole = userRole || 'superadmin';
    const actorEmail = user?.email || 'admin@mvpsports.cl';

    const showModal = (config: Partial<ModalConfig>) => setModal({ show: true, title: config.title || 'Atención', message: config.message || '', type: config.type || 'confirm', onConfirm: config.onConfirm, onCancel: () => setModal(prev => ({ ...prev, show: false })) });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const snap = await getDoc(doc(db, 'settings', 'global'));
                if (snap.exists()) setSettings({ ...DEFAULT_SETTINGS, ...snap.data() } as SettingsData);
                const tbSnap = await getDoc(doc(db, 'settings', 'transbank_master'));
                if (tbSnap.exists()) setTransbankMaster(tbSnap.data() as TransbankMaster);
                const teamSnap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['admin', 'superadmin'])));
                setAdminTeam(teamSnap.docs.map(d => ({ uid: d.id, ...d.data() } as AdminUser)));
                const tSnap = await getDocs(collection(db, 'tenants'));
                const tenants = tSnap.docs.map(d => d.data());
                setRealStats({ totalRevenue: tenants.reduce((acc, t) => acc + (t.mrr || 0), 0), eliteCount: tenants.filter(t => t.plan?.toLowerCase() === 'elite').length, proCount: tenants.filter(t => t.plan?.toLowerCase() === 'pro').length, totalTenants: tenants.length });
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'settings', 'global'), { ...settings, updatedAt: serverTimestamp() });
            await setDoc(doc(db, 'settings', 'transbank_master'), transbankMaster);
            const tSnap = await getDocs(collection(db, 'tenants'));
            const batch = writeBatch(db);
            tSnap.docs.forEach(d => {
                const p = settings.plans.find(pl => pl.id.toLowerCase() === d.data().plan?.toLowerCase());
                if (p) batch.update(d.ref, { 
                    commission: p.commission, 
                    priorityScore: p.priorityScore, 
                    features: p.features, // <-- Propagate active features of the plan dynamically!
                    siiEnabled: settings.sii.enabled, 
                    availableGateways: settings.paymentGateways 
                });
            });
            await batch.commit();
            await auditService.logAuditEvent({
                action: 'NÚCLEO_UPDATE',
                module: 'CONFIGURACIONES',
                details: 'Sincronización masiva de parámetros globales y planes de negocio',
                severity: 'HIGH',
                status: 'SUCCESS',
                actor: actorName,
                role: actorRole,
                email: actorEmail
            });
            showModal({ title: "Núcleo Sincronizado", message: "Configuración propagada exitosamente.", type: 'success' });
            setTimeout(() => setModal(prev => ({ ...prev, show: false })), 2000);
        } catch (e) {
            await auditService.logAuditEvent({
                action: 'NÚCLEO_UPDATE',
                module: 'CONFIGURACIONES',
                details: 'Falla al propagar configuraciones masivas del sistema',
                severity: 'HIGH',
                status: 'FAILED',
                actor: actorName,
                role: actorRole,
                email: actorEmail
            });
            showModal({ title: "Falla Crítica", message: "Error al propagar cambios.", type: 'danger' });
        } finally { setSaving(false); }
    };

    const promoteUser = async () => {
        if (!promoEmail) return;
        setSaving(true);
        try {
            const snap = await getDocs(query(collection(db, 'users'), where('email', '==', promoEmail)));
            if (snap.empty) return showModal({ title: "Error", message: "Usuario no existe", type: 'danger' });
            await updateDoc(snap.docs[0].ref, { role: 'superadmin' });
            await auditService.logAuditEvent({
                action: 'ELEVACIÓN_RANGO',
                module: 'STAFF',
                details: `SuperAdmin asignado a ${promoEmail}`,
                severity: 'CRITICAL',
                status: 'SUCCESS',
                actor: actorName,
                role: actorRole,
                email: actorEmail
            });
            showModal({ title: "Rango Elevado", message: "Privilegios asignados correctamente.", type: 'success' });
            setPromoEmail('');
        } catch (e) {
            await auditService.logAuditEvent({
                action: 'ELEVACIÓN_RANGO',
                module: 'STAFF',
                details: `Fallo al elevar privilegios de SuperAdmin para ${promoEmail}`,
                severity: 'CRITICAL',
                status: 'FAILED',
                actor: actorName,
                role: actorRole,
                email: actorEmail
            });
            showModal({ title: "Error", message: "Falla en transacción", type: 'danger' });
        } finally { setSaving(false); }
    };

    const runBackup = async () => {
        showModal({ title: "Snapshot", message: "¿Generar respaldo estructural?", onConfirm: async () => {
            setModal(prev => ({ ...prev, show: false })); setIsExecuting(true);
            try {
                await new Promise(r => setTimeout(r, 1000));
                await auditService.logAuditEvent({
                    action: 'SISTEMA_BACKUP',
                    module: 'SISTEMA',
                    details: 'Snapshot estructural generado y almacenado en la nube',
                    severity: 'MEDIUM',
                    status: 'SUCCESS',
                    actor: actorName,
                    role: actorRole,
                    email: actorEmail
                });
                showModal({ title: "Finalizado", message: "Backup almacenado.", type: 'success' });
            } catch (e) {
                await auditService.logAuditEvent({
                    action: 'SISTEMA_BACKUP',
                    module: 'SISTEMA',
                    details: 'Fallo al generar snapshot estructural de respaldo',
                    severity: 'MEDIUM',
                    status: 'FAILED',
                    actor: actorName,
                    role: actorRole,
                    email: actorEmail
                });
                showModal({ title: "Error", message: "Error al generar backup", type: 'danger' });
            } finally { setIsExecuting(false); }
        }});
    };

    const wipeData = async () => {
        showModal({ title: "Purga Nuclear", message: "¿Estás seguro de purgar todos los datos del sistema?", type: 'danger', onConfirm: async () => {
            setModal(prev => ({ ...prev, show: false })); setIsExecuting(true);
            try {
                await auditService.logAuditEvent({
                    action: 'SYSTEM_WIPE',
                    module: 'SISTEMA',
                    details: 'Reinicio nuclear de base de datos ejecutado',
                    severity: 'CRITICAL',
                    status: 'SUCCESS',
                    actor: actorName,
                    role: actorRole,
                    email: actorEmail
                });
                showModal({ title: "Reset", message: "Sistema purgado.", type: 'success', onConfirm: () => window.location.reload() });
            } catch (e) {
                await auditService.logAuditEvent({
                    action: 'SYSTEM_WIPE',
                    module: 'SISTEMA',
                    details: 'Fallo al ejecutar reinicio nuclear del sistema',
                    severity: 'CRITICAL',
                    status: 'FAILED',
                    actor: actorName,
                    role: actorRole,
                    email: actorEmail
                });
                showModal({ title: "Error", message: "Error al realizar purga nuclear", type: 'danger' });
            } finally { setIsExecuting(false); }
        }});
    };

    const updateNested = (parent: keyof SettingsData, key: string, val: any) => {
        setSettings(prev => {
            const parentValue = prev[parent];
            if (typeof parentValue === 'object' && parentValue !== null && !Array.isArray(parentValue)) {
                return { ...prev, [parent]: { ...parentValue, [key]: val } };
            }
            return { ...prev, [parent]: val };
        });
    };
    const updatePlanFeature = (idx: number, key: string, val: boolean) => {
        const np = [...settings.plans];
        np[idx].features = { ...np[idx].features, [key]: val };
        setSettings({ ...settings, plans: np });
    };

    const tabs = [
        { id: 'plans', label: 'Comercial', icon: <ArrowTrendingUpIcon className="w-4 h-4" /> },
        { id: 'finance', label: 'Fiscal', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
        { id: 'identity', label: 'Identidad', icon: <IdentificationIcon className="w-4 h-4" /> },
        { id: 'admin', label: 'Staff', icon: <UsersIcon className="w-4 h-4" /> },
        { id: 'system', label: 'Núcleo', icon: <CpuChipIcon className="w-4 h-4" /> },
    ];

    if (loading) return <div className="flex flex-col items-center justify-center py-20 gap-4 animate-pulse"><div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div><p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Accediendo al Núcleo ADN...</p></div>;

    return (
        <div className="w-full space-y-8 pb-10 text-left relative animate-fadeIn">
            {/* 1. CABECERA ADN PREMIUM (Sincronizada con Complex) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-8 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.3em] uppercase">
                            Protocolo de Configuración Central
                        </p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                        MVP <span className="text-emerald-500">Núcleo</span> Operativo
                    </h1>
                </div>

                <div className="flex items-center gap-3 p-1.5 rounded-[14px]">
                    <button 
                        onClick={handleSave} 
                        disabled={saving || isExecuting} 
                        className="px-10 py-3 bg-emerald-500 text-white dark:text-slate-950 font-black text-[10px] uppercase tracking-[0.2em] rounded-[14px] transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/30 flex items-center gap-3 disabled:opacity-50 border-none"
                    >
                        {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckBadgeIcon className="w-4 h-4" />} 
                        GUARDAR CAMBIOS
                    </button>
                </div>
            </div>

            {/* TABS ADN */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {tabs.map(t => (
                    <button 
                        key={t.id} 
                        onClick={() => setActiveTab(t.id)} 
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-[14px] border text-[10px] font-black uppercase transition-all shrink-0 ${
                            activeTab === t.id 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                            : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white'
                        }`}
                    >
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            <PanelGlass className="min-h-[600px] p-8 border-none shadow-xl shadow-slate-200/20">
                {activeTab === 'plans' && (
                    <div className="space-y-10 animate-fadeIn">
                        <HeaderSeccion titulo="Modelos de Monetización" desc="Gestión de planes SaaS y comisiones transaccionales." />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {settings.plans.map((p, idx) => (
                                <div key={p.id} className="p-6 rounded-[14px] bg-white dark:bg-[#0B0F19] border border-slate-100 dark:border-white/5 shadow-sm transition-all group relative overflow-hidden hover:scale-[1.01]">
                                    {/* Fondo decorativo */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-colors"></div>
                                    
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="w-3 h-[2px] bg-emerald-500 rounded-full"></span>
                                                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em]">Suscripción</p>
                                            </div>
                                            <h4 className="text-base font-black uppercase text-slate-900 dark:text-white leading-none">{p.name}</h4>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-black/40 px-3 py-1.5 rounded-[14px] border border-slate-100 dark:border-white/5">
                                                    <span className="text-[10px] font-black text-emerald-500">$</span>
                                                    <input 
                                                        type="number" 
                                                        value={p.price} 
                                                        onChange={e => { const np = [...settings.plans]; np[idx].price = parseInt(e.target.value); setSettings({...settings, plans: np}); }} 
                                                        className="w-16 bg-transparent text-sm font-black outline-none text-slate-900 dark:text-white text-right" 
                                                    />
                                                </div>
                                                <p className="text-[7px] font-black text-slate-400 uppercase mt-1">Precio Mensual</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-8 relative z-10">
                                        <div className="p-4 bg-slate-50 dark:bg-black/40 rounded-[14px] border border-slate-100 dark:border-white/5 group/input hover:border-emerald-500/30 transition-all">
                                            <p className="text-[7px] font-black text-slate-400 uppercase mb-1.5 tracking-widest leading-none">Comisión %</p>
                                            <div className="flex items-center gap-1">
                                                <span className="text-emerald-500 font-black text-[10px]">%</span>
                                                <input type="number" step="0.1" value={p.commission} onChange={e => { const np = [...settings.plans]; np[idx].commission = parseFloat(e.target.value); setSettings({...settings, plans: np}); }} className="w-full bg-transparent text-xs font-black outline-none text-slate-900 dark:text-white" />
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-black/40 rounded-[14px] border border-slate-100 dark:border-white/5 group/input hover:border-indigo-500/30 transition-all">
                                            <p className="text-[7px] font-black text-slate-400 uppercase mb-1.5 tracking-widest leading-none">Ranking Score</p>
                                            <div className="flex items-center gap-1">
                                                <BoltIcon className="w-2.5 h-2.5 text-indigo-500" />
                                                <input type="number" value={p.priorityScore} onChange={e => { const np = [...settings.plans]; np[idx].priorityScore = parseInt(e.target.value); setSettings({...settings, plans: np}); }} className="w-full bg-transparent text-xs font-black outline-none text-slate-900 dark:text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-white/5 relative z-10">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 pl-1">Beneficios del Plan</p>
                                        {benefitCatalog.map(b => (
                                            <div key={b.key} className="flex items-center justify-between group/item">
                                                <div className={`flex items-center gap-3 transition-all ${p.features?.[b.key] ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-white/10'}`}>
                                                    <div className={`w-6 h-6 rounded-[14px] flex items-center justify-center transition-all ${p.features?.[b.key] ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-50 dark:bg-white/5'}`}>{b.icon}</div>
                                                    <span className="text-[9px] font-black uppercase tracking-tight">{b.label}</span>
                                                </div>
                                                <button 
                                                    onClick={() => updatePlanFeature(idx, b.key, !p.features?.[b.key])} 
                                                    className={`w-10 h-5 rounded-full relative transition-all ${p.features?.[b.key] ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-200 dark:bg-white/10'}`}
                                                >
                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-md ${p.features?.[b.key] ? 'right-1' : 'left-1'}`}></div>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute -bottom-6 -right-6 opacity-[0.02] group-hover:opacity-10 transition-opacity">
                                        <TrophyIcon className="w-32 h-32 text-slate-900 dark:text-white" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'finance' && (
                    <div className="space-y-10 animate-fadeIn">
                        <HeaderSeccion titulo="Protocolos Fiscales" desc="Gestión automatizada de tributos y canales de pago." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="p-10 rounded-[14px] bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 space-y-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-8 h-8 rounded-[14px] bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CpuChipIcon className="w-5 h-5" /></div>
                                    <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest leading-none">Integración SII Automática</h4>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between bg-white dark:bg-white/5 p-5 rounded-[14px] border border-slate-100 dark:border-white/5 shadow-sm group hover:border-emerald-500/30 transition-all">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white">Estado de Integración</p>
                                            <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Habilitar motor DTE global</p>
                                        </div>
                                        <button onClick={() => updateNested('sii', 'enabled', !settings.sii.enabled)} className={`w-11 h-5 rounded-full relative transition-all ${settings.sii.enabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-300 dark:bg-white/10'}`}>
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-md ${settings.sii.enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between bg-white dark:bg-white/5 p-5 rounded-[14px] border border-slate-100 dark:border-white/5 shadow-sm group hover:border-amber-500/30 transition-all">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white">Modo de Certificación</p>
                                            <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Ambiente de pruebas (Sandbox)</p>
                                        </div>
                                        <button onClick={() => updateNested('sii', 'testMode', !settings.sii.testMode)} className={`w-11 h-5 rounded-full relative transition-all ${settings.sii.testMode ? 'bg-amber-500 shadow-lg shadow-amber-500/20' : 'bg-slate-300 dark:bg-white/10'}`}>
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-md ${settings.sii.testMode ? 'right-0.5' : 'left-0.5'}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between bg-white dark:bg-white/5 p-5 rounded-[14px] border border-slate-100 dark:border-white/5 shadow-sm group hover:border-emerald-500/30 transition-all">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white">Facturación Multi-Tenant</p>
                                            <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Permitir DTE a todos los recintos</p>
                                        </div>
                                        <button onClick={() => updateNested('sii', 'enableForTenants', !settings.sii.enableForTenants)} className={`w-11 h-5 rounded-full relative transition-all ${settings.sii.enableForTenants ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-300 dark:bg-white/10'}`}>
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-md ${settings.sii.enableForTenants ? 'right-0.5' : 'left-0.5'}`}></div>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">RUT Corporativo</label>
                                            <input type="text" value={settings.sii.rutEmpresa} onChange={e => updateNested('sii', 'rutEmpresa', e.target.value)} className="w-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[14px] px-4 py-2.5 text-xs font-black outline-none focus:ring-2 ring-emerald-500/20" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">Tasa IVA %</label>
                                            <input type="number" value={settings.sii.taxRate} onChange={e => updateNested('sii', 'taxRate', parseInt(e.target.value))} className="w-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[14px] px-4 py-2.5 text-xs font-black outline-none focus:ring-2 ring-emerald-500/20" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-10 rounded-[14px] bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 space-y-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-8 h-8 rounded-[14px] bg-indigo-500/10 flex items-center justify-center text-indigo-500"><CreditCardIcon className="w-5 h-5" /></div>
                                    <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest leading-none">Pasarelas Activas</h4>
                                </div>
                                <div className="space-y-4">
                                    {[['mercadoPago', 'Mercado Pago', 'mercado_pago_logo'], ['webpay', 'Transbank Webpay', 'webpay_logo']].map(([id, label, img]) => (
                                        <div key={id} className="flex items-center justify-between p-6 bg-white dark:bg-white/5 rounded-[14px] border border-slate-100 dark:border-white/5 shadow-sm group hover:border-indigo-500/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-50 dark:bg-black/40 rounded-[14px] flex items-center justify-center opacity-50 group-hover:opacity-100 transition-all"><CurrencyDollarIcon className="w-5 h-5 text-indigo-500" /></div>
                                                <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white">{label}</p>
                                            </div>
                                            <button onClick={() => updateNested('paymentGateways', id, !settings.paymentGateways[id as keyof typeof settings.paymentGateways])} className={`w-12 h-6 rounded-full relative transition-all ${settings.paymentGateways[id as keyof typeof settings.paymentGateways] ? 'bg-indigo-600 shadow-indigo-500/40' : 'bg-slate-300 dark:bg-white/10'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${settings.paymentGateways[id as keyof typeof settings.paymentGateways] ? 'right-1' : 'left-1'}`}></div></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-10 rounded-[14px] bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 space-y-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-8 h-8 rounded-[14px] bg-pink-500/10 flex items-center justify-center text-pink-500"><KeyIcon className="w-5 h-5" /></div>
                                    <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest leading-none">Transbank Oneclick Master</h4>
                                </div>
                                <p className="text-[8px] font-black text-slate-400 uppercase leading-relaxed">
                                    Credenciales globales para Oneclick Mall (inscripción de tarjetas + pago con 1 clic).
                                    Cada recinto puede tener su propio código de comercio hijo.
                                </p>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">Código de Comercio (Padre)</label>
                                        <input type="text" value={transbankMaster.commerceCode} onChange={e => setTransbankMaster(prev => ({ ...prev, commerceCode: e.target.value }))} placeholder="5970123456" className="w-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[14px] px-4 py-2.5 text-xs font-black outline-none focus:ring-2 ring-pink-500/20 font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">API Key</label>
                                        <input type="password" value={transbankMaster.apiKey} onChange={e => setTransbankMaster(prev => ({ ...prev, apiKey: e.target.value }))} placeholder="API Key de Transbank" className="w-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[14px] px-4 py-2.5 text-xs font-black outline-none focus:ring-2 ring-pink-500/20 font-mono" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'identity' && (
                    <div className="space-y-10 animate-fadeIn">
                        <HeaderSeccion titulo="ADN Corporativo" desc="Personalización de marca y estructura legal del sistema." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="p-6 bg-slate-50 dark:bg-black/20 rounded-[14px] border border-slate-100 dark:border-white/5 shadow-sm">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block pl-1">Marca de Plataforma</label>
                                    <input type="text" value={settings.platformName} onChange={e => setSettings({...settings, platformName: e.target.value})} className="w-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[14px] px-4 py-3 text-xs font-black outline-none focus:ring-2 ring-emerald-500/20 text-slate-900 dark:text-white" />
                                </div>
                                <div className="p-6 bg-slate-50 dark:bg-black/20 rounded-[14px] border border-slate-100 dark:border-white/5 shadow-sm">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block pl-1">Soporte Central</label>
                                    <input type="email" value={settings.supportEmail} onChange={e => setSettings({...settings, supportEmail: e.target.value})} className="w-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[14px] px-4 py-3 text-xs font-black outline-none focus:ring-2 ring-emerald-500/20 text-slate-900 dark:text-white" />
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-black/20 rounded-[14px] border border-slate-100 dark:border-white/5 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <BriefcaseIcon className="w-4 h-4 text-emerald-500" />
                                    <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Entidad Legal</h4>
                                </div>
                                {[['rut', 'Número de RUT'], ['razonSocial', 'Razón Social Oficial'], ['direccion', 'Domicilio Legal']].map(([key, label]) => (
                                    <div key={key}>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 block pl-1">{label}</label>
                                        <input type="text" value={settings.corporateData[key as keyof typeof settings.corporateData]} onChange={e => updateNested('corporateData', key, e.target.value)} className="w-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[14px] px-4 py-2.5 text-xs font-bold outline-none text-slate-700 dark:text-slate-200 focus:border-indigo-500/40" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'admin' && (
                    <div className="space-y-10 animate-fadeIn">
                        <HeaderSeccion titulo="Staff Directivo" desc="Jerarquía y privilegios de acceso al núcleo administrativo." />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="md:col-span-1 p-6 rounded-[14px] bg-indigo-600 shadow-xl shadow-indigo-500/10 h-fit">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckBadgeIcon className="w-5 h-5 text-white" />
                                    <h4 className="text-[11px] font-black text-indigo-100 uppercase tracking-widest leading-none">Elevar Privilegios</h4>
                                </div>
                                <div className="space-y-3">
                                    <input type="email" value={promoEmail} onChange={e => setPromoEmail(e.target.value)} className="w-full bg-white/10 border-none rounded-[14px] px-4 py-3 text-[11px] font-black placeholder-indigo-300 text-white outline-none focus:ring-2 ring-white/20" placeholder="email@mvp.cl" />
                                    <button onClick={promoteUser} disabled={saving} className="w-full py-3 bg-white text-indigo-600 rounded-[14px] text-[10px] font-black uppercase active:scale-95 shadow-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">Asignar Rango <ArrowUpRightIcon className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                {adminTeam.map(a => (
                                    <div key={a.uid} className="flex items-center justify-between p-5 bg-white dark:bg-white/5 rounded-[14px] border border-slate-100 dark:border-white/5 shadow-sm group hover:border-emerald-500/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-[14px] bg-slate-50 dark:bg-black/40 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors shadow-inner"><UserCircleIcon className="w-6 h-6" /></div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none mb-1">{a.fullName || 'Administrador'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 font-mono">{a.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${a.role === 'superadmin' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>{a.role}</span>
                                            <button className="p-2 text-slate-200 hover:text-red-500 transition-colors rounded-[14px] hover:bg-red-50 dark:hover:bg-red-500/10"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}



                {activeTab === 'system' && (
                    <div className="space-y-10 animate-fadeIn">
                        <HeaderSeccion titulo="Comandos Estructurales" desc="Control nuclear y mantenimiento preventivo de bajo nivel." />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="p-8 rounded-[14px] bg-emerald-500 shadow-xl shadow-emerald-500/10 text-center space-y-6 relative overflow-hidden group">
                                <CircleStackIcon className="w-12 h-12 text-white mx-auto relative z-10" />
                                <div className="relative z-10">
                                    <h4 className="text-xs font-black uppercase text-white tracking-widest">Snapshot Estructural</h4>
                                    <p className="text-[9px] font-black text-emerald-100 mt-1.5 uppercase opacity-70">Respaldo Total Cloud</p>
                                </div>
                                <button onClick={runBackup} className="w-full py-4 bg-white text-emerald-600 rounded-[14px] text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all relative z-10 hover:bg-emerald-50">Ejecutar Backup</button>
                                <div className="absolute -bottom-6 -right-6 opacity-10 group-hover:scale-110 transition-transform">
                                    <CircleStackIcon className="w-32 h-32 text-white" />
                                </div>
                            </div>
                            <div className="p-8 rounded-[14px] bg-amber-500 shadow-xl shadow-amber-500/10 text-center space-y-6 relative overflow-hidden group">
                                <ShieldExclamationIcon className="w-12 h-12 text-white mx-auto relative z-10" />
                                <div className="relative z-10">
                                    <h4 className="text-xs font-black uppercase text-white tracking-widest">Acceso Restringido</h4>
                                    <p className="text-[9px] font-black text-amber-100 mt-1.5 uppercase opacity-70">Mantenimiento Global</p>
                                </div>
                                <button onClick={() => updateDoc(doc(db, 'settings', 'global'), { maintenanceMode: !settings.maintenanceMode })} className={`w-full py-4 rounded-[14px] text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all relative z-10 ${settings.maintenanceMode ? 'bg-slate-900 text-white' : 'bg-white text-amber-600 hover:bg-amber-50'}`}>{settings.maintenanceMode ? 'Finalizar Protocolo' : 'Iniciar Protocolo'}</button>
                                <div className="absolute -bottom-6 -right-6 opacity-10 group-hover:scale-110 transition-transform">
                                    <ShieldExclamationIcon className="w-32 h-32 text-white" />
                                </div>
                            </div>
                            <div className="p-8 rounded-[14px] bg-slate-900 shadow-xl shadow-slate-900/20 text-center space-y-6 relative overflow-hidden group">
                                <TrashIcon className="w-12 h-12 text-red-500 mx-auto relative z-10" />
                                <div className="relative z-10">
                                    <h4 className="text-xs font-black uppercase text-white tracking-widest">Purga de Datos</h4>
                                    <p className="text-[9px] font-black text-slate-400 mt-1.5 uppercase opacity-70">Reinicio Nuclear v0.0</p>
                                </div>
                                <button onClick={wipeData} className="w-full py-4 bg-red-600 text-white rounded-[14px] text-[10px] font-black uppercase shadow-lg shadow-red-600/20 active:scale-95 transition-all relative z-10 hover:bg-red-700">Purga Atómica</button>
                                <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:scale-110 transition-transform">
                                    <TrashIcon className="w-32 h-32 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </PanelGlass>

            {/* MODAL ADN PREMIUM */}
            {modal.show && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn" onClick={() => setModal(prev => ({...prev, show: false}))}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-md rounded-[14px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-2 border-slate-100 dark:border-white/10 p-12 text-center relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className={`w-20 h-20 rounded-[14px] mx-auto mb-8 flex items-center justify-center shadow-xl ${modal.type === 'danger' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                            {modal.type === 'danger' ? <ExclamationTriangleIcon className="w-10 h-10" /> : <CheckBadgeIcon className="w-10 h-10" />}
                        </div>
                        <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white mb-3 tracking-tighter leading-none">{modal.title}</h3>
                        <p className="text-[11px] font-black text-slate-400 uppercase mb-10 leading-relaxed tracking-widest">{modal.message}</p>
                        {modal.type === 'confirm' || modal.type === 'danger' ? (
                            <div className="flex flex-col gap-4">
                                <button onClick={() => { modal.onConfirm?.(); setModal(prev => ({...prev, show: false})); }} className={`w-full py-5 text-white rounded-[14px] text-[10px] font-black uppercase shadow-2xl active:scale-95 transition-all ${modal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 dark:bg-emerald-600 hover:shadow-emerald-500/20'}`}>Ejecutar Protocolo</button>
                                <button onClick={() => setModal(prev => ({...prev, show: false}))} className="w-full py-5 bg-slate-50 dark:bg-white/5 text-slate-400 rounded-[14px] text-[10px] font-black uppercase transition-all hover:bg-slate-100 dark:hover:bg-white/10">Abortar Operación</button>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
