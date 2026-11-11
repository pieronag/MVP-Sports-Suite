"use client";
// Pestaña Identidad: nombre de la plataforma, soporte, textos legales y datos del emisor de las liquidaciones
import { HugeiconsIcon } from "@hugeicons/react";
import { ScaleIcon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HeaderSeccion, inputCls, panelCls, type SettingsData } from "./ui";

const CORPORATE_FIELDS: [keyof SettingsData['corporateData'], string][] = [
    ['razonSocial', 'Razón social'], ['rut', 'RUT'], ['direccion', 'Dirección'], ['giro', 'Giro'], ['representante', 'Representante'], ['emailFacturacion', 'Correo de facturación'],
];
const labelCls = "text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1";

export default function IdentityTab({ settings, onRoot, onNested }: {
    settings: SettingsData;
    onRoot: (key: 'platformName' | 'supportEmail', val: string) => void;
    onNested: (parent: 'legal' | 'corporateData', key: string, val: string) => void;
}) {
    return (
        <div className="space-y-8 animate-fadeIn">
            <HeaderSeccion titulo="Marca y datos de la empresa" desc="Nombre de la plataforma y datos legales que aparecen en los documentos." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5">
                    <div className={panelCls}>
                        <label htmlFor="id-name" className={`${labelCls} mb-2 block`}>Nombre de la plataforma</label>
                        <input id="id-name" type="text" maxLength={60} value={settings.platformName} onChange={e => onRoot('platformName', e.target.value)} className={inputCls} />
                    </div>
                    <div className={panelCls}>
                        <label htmlFor="id-support" className={`${labelCls} mb-2 block`}>Correo de soporte</label>
                        <input id="id-support" type="email" maxLength={120} value={settings.supportEmail} onChange={e => onRoot('supportEmail', e.target.value)} className={inputCls} />
                    </div>
                    {([['terms', 'Términos y condiciones'], ['privacy', 'Política de privacidad']] as const).map(([key, label]) => (
                        <div key={key} className={panelCls}>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor={`id-${key}`} className={labelCls}>{label}</label>
                                <span className="text-[11px] md:text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase">Legal</span>
                            </div>
                            <textarea id={`id-${key}`} rows={4} maxLength={20000} value={settings.legal[key]} onChange={e => onNested('legal', key, e.target.value)} className={`${inputCls} resize-y`} />
                        </div>
                    ))}
                </div>
                <div className={`${panelCls} space-y-4 h-fit`}>
                    <div className="flex items-center gap-3 mb-2">
                        <HugeiconsIcon icon={ScaleIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                        <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest font-heading">Datos legales</h4>
                    </div>
                    {CORPORATE_FIELDS.map(([key, label]) => (
                        <div key={key}>
                            <label htmlFor={`corp-${key}`} className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 block pl-1">{label}</label>
                            <input id={`corp-${key}`} type={key === 'emailFacturacion' ? 'email' : 'text'} maxLength={160} value={settings.corporateData[key]} onChange={e => onNested('corporateData', key, e.target.value)} className={inputCls} />
                        </div>
                    ))}
                    <div className="pt-2 flex items-start gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3">
                        <HugeiconsIcon icon={InformationCircleIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82] shrink-0 mt-0.5" strokeWidth={1.8} />
                        <p className="text-[11px] md:text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-relaxed">
                            Estos datos se usan como emisor en las liquidaciones PDF y en los documentos legales de la plataforma.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
