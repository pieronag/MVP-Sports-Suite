"use client";
import React, { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import ModalPortal from "@/components/ui/ModalPortal";
import { usePlans } from "@/components/landing/usePlans";
import {
    Building01Icon, MapPinIcon, UserGroupIcon, StarIcon, Clock01Icon,
    MoneyBag01Icon, Cancel01Icon, CrownIcon, Shield01Icon, CheckmarkCircle02Icon,
    Alert02Icon, GlobalIcon, PencilEdit02Icon, CallIcon, Mail01Icon, Delete01Icon,
} from "@hugeicons/core-free-icons";

interface TenantProfileModalProps {
    tenant: any;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (tenant: any) => void;
    onToggleStatus?: (tenant: any) => void;
    onDelete?: (tenant: any) => void;
}

export default function TenantProfileModal({ tenant, isOpen, onClose, onEdit, onToggleStatus, onDelete }: TenantProfileModalProps) {
    const { plans } = usePlans();
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

    if (!isOpen || !tenant) return null;

    const isActive = tenant.status === "Activo";
    const rating = Number(tenant.rating) || 0;
    const planKey = (tenant.plan || "").toLowerCase();
    const matchedPlan = plans.find(p => p.id.toLowerCase() === planKey || p.name.toLowerCase() === planKey);
    const sortedPrices = plans.map(p => Number(p.price || 0)).sort((a, b) => a - b);
    const maxPrice = sortedPrices[sortedPrices.length - 1] || 0;
    const paidPrices = sortedPrices.filter(p => p > 0);
    const planPriceValue = matchedPlan ? Number(matchedPlan.price || 0) : 0;
    const planStyle = planPriceValue <= 0
        ? "bg-slate-800/90 text-white"
        : planPriceValue >= maxPrice
            ? "bg-amber-400/95 text-amber-950"
            : (paidPrices.length >= 2 && planPriceValue >= paidPrices[paidPrices.length - 2])
                ? "bg-indigo-500/95 text-white"
                : "bg-sky-500/95 text-white";
    const planLabel = matchedPlan ? matchedPlan.name : (tenant.plan || "—");
    const planPrice = tenant.mrr || planPriceValue || 0;
    const hasCoords = !!tenant.coordinates?.lat;

    const infoRows = [
        { icon: MapPinIcon, label: "Ubicación", value: `${tenant.commune || "—"}, ${tenant.region || "—"}` },
        { icon: Building01Icon, label: "Dirección", value: tenant.address || "Sin dirección registrada" },
        { icon: GlobalIcon, label: "Coordenadas", value: hasCoords ? `${tenant.coordinates.lat.toFixed(4)}, ${tenant.coordinates.lng.toFixed(4)}` : "Sin geolocalizar", tone: hasCoords ? "ok" : "warn" },
        { icon: Clock01Icon, label: "Horario", value: tenant.infra?.scheduleSummary || "No definido" },
        { icon: UserGroupIcon, label: "Dueños", value: tenant.owners?.length ? tenant.owners.join(", ") : "Sin dueños asignados" },
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
                    aria-labelledby="tenant-profile-title"
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full sm:max-w-3xl bg-white dark:bg-[#0B0F19] rounded-t-2xl sm:rounded-md border border-slate-200 dark:border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[94vh] sm:h-[88vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
                >
                    {/* PORTADA */}
                    <div className="relative h-36 sm:h-44 shrink-0 overflow-hidden">
                        {tenant.imageUrl ? (
                            <img src={tenant.imageUrl} alt={tenant.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#0B0F19] dark:to-[#04231a]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

                        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-white/15 backdrop-blur shadow-lg ${planStyle}`}>
                            {planLabel}
                        </span>
                        <span className={`absolute top-3 left-3 mt-9 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border backdrop-blur shadow-lg ${isActive ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30" : "bg-red-500/20 text-red-300 border-red-400/30"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                            {tenant.status}
                        </span>

                        <button onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 p-2 rounded-md bg-black/40 backdrop-blur text-white/80 hover:text-white hover:bg-black/60 transition-colors cursor-pointer">
                            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} />
                        </button>

                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                            <div className="min-w-0">
                                <h2 id="tenant-profile-title" className="font-black text-white text-xl uppercase leading-tight truncate font-heading drop-shadow-md">
                                    {tenant.name}
                                </h2>
                                <p className="text-[11px] text-slate-300 font-semibold uppercase flex items-center gap-1 mt-1">
                                    <HugeiconsIcon icon={MapPinIcon} className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2} />
                                    {tenant.commune || "—"}, {tenant.region || "—"}
                                </p>
                            </div>
                            {rating > 0 && (
                                <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black/55 backdrop-blur border border-white/15">
                                    <HugeiconsIcon icon={StarIcon} className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
                                    <span className="text-sm font-black text-white font-mono">{rating.toFixed(1)}</span>
                                    <span className="text-[9px] font-bold text-slate-300 uppercase">({tenant.totalFeedbacks ?? 0})</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* BODY */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
                        {/* KPIs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="p-3 rounded-md border border-slate-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-center">
                                <span className="block text-xl font-black text-slate-900 dark:text-white font-mono leading-none">{tenant.infra?.courts ?? 0}</span>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Canchas</span>
                            </div>
                            <div className="p-3 rounded-md border border-slate-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-center">
                                <span className="block text-xl font-black text-slate-900 dark:text-white font-mono leading-none">{tenant.infra?.staff ?? 0}</span>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Staff</span>
                            </div>
                            <div className="p-3 rounded-md border border-slate-100 dark:border-white/5 bg-white dark:bg-white/[0.02] text-center">
                                <span className="block text-xl font-black text-slate-900 dark:text-white font-mono leading-none">{tenant.totalFeedbacks ?? 0}</span>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Reseñas</span>
                            </div>
                            <div className="p-3 rounded-md border border-emerald-500/25 bg-emerald-500/5 text-center">
                                <span className="block text-xl font-black text-emerald-600 dark:text-[#00df82] font-mono leading-none">${(planPrice / 1000).toFixed(0)}k</span>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">MRR</span>
                            </div>
                        </div>

                        {/* Información */}
                        <div className="rounded-md border border-slate-200 dark:border-white/10 overflow-hidden">
                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
                                <HugeiconsIcon icon={Building01Icon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Información del recinto</span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {infoRows.map((row) => (
                                    <div key={row.label} className="flex items-center gap-3 px-4 py-3">
                                        <HugeiconsIcon icon={row.icon} className={`w-4 h-4 shrink-0 ${row.tone === "warn" ? "text-amber-500" : "text-slate-400"}`} strokeWidth={1.8} />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 w-24 shrink-0">{row.label}</span>
                                        <span className={`text-[12px] font-semibold truncate ${row.tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dueños detalle */}
                        <div className="rounded-md border border-slate-200 dark:border-white/10 overflow-hidden">
                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Dueños</span>
                                </span>
                                <span className="text-[10px] font-black text-emerald-600 dark:text-[#00df82] font-mono">{tenant.owners?.length ?? 0}</span>
                            </div>
                            <div className="p-4 space-y-3">
                                {tenant.owners?.length > 0 ? tenant.owners.map((o: string, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] flex items-center justify-center text-[12px] font-black shrink-0">
                                            {o.charAt(0).toUpperCase()}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{o}</p>
                                            {tenant.ownerEmails?.[idx] && <p className="text-[10px] text-slate-400 truncate">{tenant.ownerEmails[idx]}</p>}
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-[11px] text-slate-400 text-center py-2">Sin dueños asignados</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-2.5 shrink-0">
                        {onDelete && (
                            <button onClick={() => onDelete(tenant)} aria-label="Eliminar recinto" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[11px] font-black uppercase tracking-wider border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10 transition-all cursor-pointer">
                                <HugeiconsIcon icon={Delete01Icon} className="w-4 h-4" strokeWidth={2} />
                                Eliminar
                            </button>
                        )}
                        <div className="flex items-center gap-2.5 ml-auto">
                            {onToggleStatus && (
                                <button onClick={() => onToggleStatus(tenant)} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer ${isActive ? "border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-[#00df82] dark:hover:bg-emerald-500/10"}`}>
                                    <HugeiconsIcon icon={isActive ? Shield01Icon : CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={2} />
                                    {isActive ? "Suspender" : "Activar"}
                                </button>
                            )}
                            <button onClick={() => onEdit(tenant)} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider shadow-[0_0_25px_-8px_rgba(0,223,130,0.7)] hover:bg-[#3affa0] active:scale-95 transition-all cursor-pointer">
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
