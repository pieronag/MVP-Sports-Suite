"use client";
import React, { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import ModalPortal from "@/components/ui/ModalPortal";
import {
    UserMultipleIcon, IdentityCardIcon, Mail01Icon, CallIcon, MapPinIcon,
    Building01Icon, Store01Icon, MoneyBag01Icon, Alert02Icon,
    CheckmarkCircle02Icon, Cancel01Icon, Key01Icon, PencilEdit02Icon, Delete01Icon,
} from "@hugeicons/core-free-icons";

interface OwnerProfileModalProps {
    owner: any;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (owner: any) => void;
    onChangePassword: (owner: any) => void;
    onToggleStatus?: (owner: any) => void;
    onDelete?: (owner: any) => void;
}

const TIER_STYLE: Record<string, string> = {
    "VIP PLATINO": "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
    "ORO": "bg-amber-400 text-amber-950",
    "ESTÁNDAR": "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300",
};

const formatCLP = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n || 0);

export default function OwnerProfileModal({ owner, isOpen, onClose, onEdit, onChangePassword, onToggleStatus, onDelete }: OwnerProfileModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        document.body.classList.add("overflow-hidden");
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.classList.remove("overflow-hidden");
        };
    }, [isOpen, onClose]);

    if (!isOpen || !owner) return null;

    const isActive = owner.status === "Activo";
    const hasDebt = owner.debt > 0;
    const tierStyle = TIER_STYLE[owner.tier] || TIER_STYLE["ESTÁNDAR"];

    const infoRows = [
        { icon: IdentityCardIcon, label: "RUT", value: owner.rut || "—" },
        { icon: Mail01Icon, label: "Email", value: owner.email || "—" },
        { icon: CallIcon, label: "Teléfono", value: owner.phone || "—" },
        { icon: Building01Icon, label: "Empresa", value: owner.company || "Particular" },
        { icon: MapPinIcon, label: "Facturación", value: owner.billingAddress || "Sin dirección" },
    ];

    return (
        <ModalPortal>
            <div
                className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 dark:bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
                role="presentation"
                onClick={onClose}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="owner-profile-title"
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full sm:max-w-3xl bg-white dark:bg-[#0B0F19] rounded-t-2xl sm:rounded-md border border-slate-200 dark:border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[94vh] sm:h-[88vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
                >
                    {/* HEADER */}
                    <div className="relative px-5 sm:px-6 py-5 border-b border-slate-100 dark:border-white/5 shrink-0 overflow-hidden">
                        <div aria-hidden="true" className="pointer-events-none absolute -top-16 left-4 w-40 h-40 bg-emerald-400/20 dark:bg-[#00df82]/15 blur-[70px] rounded-full" />
                        <div className="relative flex items-start justify-between gap-3">
                            <div className="flex items-center gap-4 min-w-0">
                                {owner.photoURL ? (
                                    <img src={owner.photoURL} alt={owner.name} className="w-16 h-16 rounded-md object-cover border border-slate-200 dark:border-white/10 shrink-0" />
                                ) : (
                                    <span className="w-16 h-16 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-800 text-white flex items-center justify-center font-black text-2xl shrink-0">
                                        {owner.name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${tierStyle}`}>{owner.tier}</span>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-[#00df82] border-emerald-500/25" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25"}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                                            {owner.status}
                                        </span>
                                    </div>
                                    <h2 id="owner-profile-title" className="mt-1.5 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading leading-none truncate">
                                        {owner.name}
                                    </h2>
                                    <p className="text-[11px] text-slate-400 font-semibold truncate mt-0.5">{owner.company}</p>
                                </div>
                            </div>
                            <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} />
                            </button>
                        </div>
                    </div>

                    {/* BODY */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
                        {/* KPIs */}
                        <div className="grid grid-cols-3 gap-2.5">
                            <div className="p-3 rounded-md border border-slate-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-center">
                                <span className="block text-xl font-black text-slate-900 dark:text-white font-mono leading-none">{owner.venues?.length ?? 0}</span>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Recintos</span>
                            </div>
                            <div className="p-3 rounded-md border border-emerald-500/25 bg-emerald-500/5 text-center">
                                <span className="block text-base font-black text-emerald-600 dark:text-[#00df82] font-mono leading-none truncate">{formatCLP(owner.totalMrr)}</span>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">MRR</span>
                            </div>
                            <div className={`p-3 rounded-md border text-center ${hasDebt ? "border-red-500/25 bg-red-500/5" : "border-slate-100 dark:border-white/5 bg-white dark:bg-white/[0.02]"}`}>
                                <span className={`block text-base font-black font-mono leading-none truncate ${hasDebt ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>{hasDebt ? formatCLP(owner.debt) : "—"}</span>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Deuda</span>
                            </div>
                        </div>

                        {/* Información */}
                        <div className="rounded-md border border-slate-200 dark:border-white/10 overflow-hidden">
                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
                                <HugeiconsIcon icon={UserMultipleIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Información del dueño</span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {infoRows.map((row) => (
                                    <div key={row.label} className="flex items-center gap-3 px-4 py-3">
                                        <HugeiconsIcon icon={row.icon} className="w-4 h-4 shrink-0 text-slate-400" strokeWidth={1.8} />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 w-24 shrink-0">{row.label}</span>
                                        <span className="text-[12px] font-semibold text-slate-900 dark:text-white truncate">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recintos */}
                        <div className="rounded-md border border-slate-200 dark:border-white/10 overflow-hidden">
                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <HugeiconsIcon icon={Store01Icon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Recintos asignados</span>
                                </span>
                                <span className="text-[10px] font-black text-emerald-600 dark:text-[#00df82] font-mono">{owner.venues?.length ?? 0}</span>
                            </div>
                            <div className="p-4 flex flex-wrap gap-2">
                                {owner.venues?.length > 0 ? owner.venues.map((v: any, i: number) => (
                                    <span key={i} className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-white/5 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 truncate max-w-[180px]">
                                        {v.name}
                                    </span>
                                )) : <p className="text-[11px] text-slate-400 py-1">Sin recintos asignados</p>}
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] shrink-0 space-y-2.5">
                        <div className="flex items-center gap-2.5">
                            <button onClick={() => onChangePassword(owner)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[11px] font-black uppercase tracking-wider border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all cursor-pointer">
                                <HugeiconsIcon icon={Key01Icon} className="w-4 h-4" strokeWidth={2} />
                                <span className="hidden sm:inline">Contraseña</span>
                            </button>
                            {onToggleStatus && (
                                <button onClick={() => onToggleStatus(owner)} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer ${isActive ? "border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-[#00df82] dark:hover:bg-emerald-500/10"}`}>
                                    <HugeiconsIcon icon={isActive ? Alert02Icon : CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={2} />
                                    {isActive ? "Suspender" : "Activar"}
                                </button>
                            )}
                            {onDelete && (
                                <button onClick={() => onDelete(owner)} aria-label="Eliminar dueño" className="inline-flex items-center justify-center px-3 py-2.5 rounded-md border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer">
                                    <HugeiconsIcon icon={Delete01Icon} className="w-4 h-4" strokeWidth={2} />
                                </button>
                            )}
                            <button onClick={() => onEdit(owner)} className="ml-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider shadow-[0_0_25px_-8px_rgba(0,223,130,0.7)] hover:bg-[#3affa0] active:scale-95 transition-all cursor-pointer">
                                <HugeiconsIcon icon={PencilEdit02Icon} className="w-4 h-4" strokeWidth={2} />
                                Editar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
