"use client";
// Configuración central (superadmin): tipos, valores por defecto y piezas visuales compartidas por las pestañas
import { TrophyIcon, UserGroupIcon, BarChartIcon, MarketingIcon, LifebuoyIcon } from "@hugeicons/core-free-icons";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Plan { id: string; name: string; price: number; commission: number; priorityScore: number; features: Record<string, boolean>; [k: string]: any }

export interface SettingsData {
    platformName: string; supportEmail: string; maintenanceMode: boolean;
    corporateData: { rut: string; razonSocial: string; direccion: string; giro: string; representante: string; emailFacturacion: string };
    plans: Plan[]; paymentGateways: { mercadoPago: boolean }; legal: { terms: string; privacy: string };
    sii: { enabled: boolean; testMode: boolean; taxRate: number; rutEmpresa: string; enableForTenants: boolean };
}

export interface AdminUser { uid: string; fullName?: string; email: string; role: string; status: string }

export const DEFAULT_SETTINGS: SettingsData = {
    platformName: 'MVP Sports Suite', supportEmail: 'central@mvpsports.cl', maintenanceMode: false,
    corporateData: { rut: '78.392.951-1', razonSocial: 'ORION TECHNOLOGY SpA', direccion: 'San Pedro 1417, Rancagua', giro: 'Desarrollo de Software', representante: 'Representante legal', emailFacturacion: 'soporte@mvpsports.cl' },
    plans: [
        { id: 'free', name: 'Free', price: 0, commission: 4.0, priorityScore: 10, features: {} },
        { id: 'basic', name: 'Básico', price: 29990, commission: 3.0, priorityScore: 30, features: { topPosition: true } },
        { id: 'pro', name: 'Pro', price: 59990, commission: 2.0, priorityScore: 60, features: { topPosition: true, multiRecinto: true, analytics: true, marketing: true } },
        { id: 'elite', name: 'Elite', price: 99990, commission: 0, priorityScore: 100, features: { topPosition: true, multiRecinto: true, analytics: true, marketing: true, support: true } }
    ],
    paymentGateways: { mercadoPago: true },
    legal: { terms: 'Términos y condiciones de uso de la plataforma...', privacy: 'Política de privacidad y tratamiento de datos...' },
    sii: { enabled: false, testMode: true, taxRate: 19, rutEmpresa: '78.392.951-1', enableForTenants: false }
};

/** Plan de un recinto por su planId/plan (id o nombre, sin distinguir mayúsculas) */
export const resolvePlan = (plans: Plan[], t: any): Plan | undefined => {
    const ref = (t?.planId || t?.plan || '').toString().trim().toLowerCase();
    return ref ? plans.find((p) => (p.id || '').toLowerCase() === ref || (p.name || '').toLowerCase() === ref) : undefined;
};

export const benefitCatalog = [
    { key: 'topPosition', label: 'Prioridad en búsquedas', icon: TrophyIcon },
    { key: 'multiRecinto', label: 'Multi-recinto', icon: UserGroupIcon },
    { key: 'analytics', label: 'Análisis de datos', icon: BarChartIcon },
    { key: 'marketing', label: 'Cupones y marketing', icon: MarketingIcon },
    { key: 'support', label: 'Soporte 24/7', icon: LifebuoyIcon },
];

export const formatCLP = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

export const inputCls = "w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-4 py-2.5 text-xs font-bold outline-hidden text-slate-800 dark:text-white focus:border-emerald-500/40 transition-all";
export const panelCls = "rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-6";

export function HeaderSeccion({ titulo, desc }: { titulo: string; desc: string }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
                <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none font-heading">{titulo}</h3>
            </div>
            <p className="text-xs md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed pl-9">{desc}</p>
        </div>
    );
}

export function Toggle({ on, onChange, label, color = 'bg-emerald-500 dark:bg-[#00df82]' }: { on: boolean; onChange: () => void; label: string; color?: string }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={onChange} aria-label={label} className={`w-11 h-6 rounded-full relative transition-all shrink-0 ${on ? color : 'bg-slate-200 dark:bg-white/10'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${on ? 'right-0.5' : 'left-0.5'}`}></div>
        </button>
    );
}
