"use client";
// Pestaña Fiscal: factura electrónica (SII) y medios de pago habilitados
import { HugeiconsIcon } from "@hugeicons/react";
import { ScaleIcon, CreditCardIcon, MoneyBag01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HeaderSeccion, Toggle, inputCls, panelCls, type SettingsData } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
const SII_ROWS = [
    { label: 'Facturación automática', desc: 'Emitir boleta y factura electrónica (SII)', key: 'enabled', color: 'bg-emerald-500 dark:bg-[#00df82]' },
    { label: 'Ambiente de certificación', desc: 'Emitir los documentos en el ambiente de pruebas del SII', key: 'testMode', color: 'bg-amber-500' },
    { label: 'Facturar a todos tus recintos', desc: 'Habilita el envío de DTE a cada sede', key: 'enableForTenants', color: 'bg-emerald-500 dark:bg-[#00df82]' },
] as const;

export default function FinanceTab({ sii, gateways, onChange }: {
    sii: SettingsData['sii'];
    gateways: SettingsData['paymentGateways'];
    onChange: (parent: 'sii' | 'paymentGateways', key: string, val: any) => void;
}) {
    return (
        <div className="space-y-8 animate-fadeIn">
            <HeaderSeccion titulo="Impuestos y facturación" desc="Factura electrónica (SII) y medios de pago para tus recintos." />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className={`${panelCls} space-y-5`}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82]"><HugeiconsIcon icon={ScaleIcon} className="w-5 h-5" strokeWidth={1.6} /></div>
                        <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest leading-none font-heading">Factura electrónica (SII)</h4>
                    </div>
                    <div className="space-y-4">
                        {SII_ROWS.map(row => (
                            <div key={row.key} className="flex items-center justify-between gap-4 bg-white dark:bg-white/5 p-4 rounded-md border border-slate-200 dark:border-white/10">
                                <div className="min-w-0">
                                    <p className="text-xs md:text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white">{row.label}</p>
                                    <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase mt-1">{row.desc}</p>
                                </div>
                                <Toggle on={!!sii[row.key]} label={row.label} onChange={() => onChange('sii', row.key, !sii[row.key])} color={row.color} />
                            </div>
                        ))}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label htmlFor="sii-rut" className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">RUT de la empresa</label>
                                <input id="sii-rut" type="text" maxLength={12} value={sii.rutEmpresa} onChange={e => onChange('sii', 'rutEmpresa', e.target.value)} className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="sii-iva" className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">IVA (%)</label>
                                <input id="sii-iva" type="number" min={0} max={100} value={sii.taxRate} onChange={e => onChange('sii', 'taxRate', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className={inputCls} />
                            </div>
                        </div>
                        <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase leading-relaxed">
                            <HugeiconsIcon icon={InformationCircleIcon} className="w-3 h-3 inline mr-1" strokeWidth={1.8} />
                            El IVA se aplica automáticamente a las liquidaciones del módulo de facturación.
                        </p>
                    </div>
                </div>

                <div className={`${panelCls} space-y-5 h-fit`}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500"><HugeiconsIcon icon={CreditCardIcon} className="w-5 h-5" strokeWidth={1.6} /></div>
                        <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest leading-none font-heading">Medios de pago</h4>
                    </div>
                    <div className="flex items-center justify-between gap-4 p-5 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center text-indigo-500"><HugeiconsIcon icon={MoneyBag01Icon} className="w-5 h-5" strokeWidth={1.6} /></div>
                            <div>
                                <p className="text-xs md:text-[10px] font-black uppercase text-slate-900 dark:text-white">Mercado Pago</p>
                                <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase mt-0.5">{gateways.mercadoPago ? 'Activa' : 'Inactiva'}</p>
                            </div>
                        </div>
                        <Toggle on={!!gateways.mercadoPago} label="Mercado Pago" onChange={() => onChange('paymentGateways', 'mercadoPago', !gateways.mercadoPago)} color="bg-indigo-600" />
                    </div>
                </div>
            </div>
        </div>
    );
}
