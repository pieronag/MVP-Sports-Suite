"use client";
import React, { useState, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { geocodeAddress } from "@/utils/geocode";
import ModalPortal from "@/components/ui/ModalPortal";
import { usePlans } from "@/components/landing/usePlans";
import {
    Building01Icon,
    UserGroupIcon,
    Add01Icon,
    Cancel01Icon,
    Search01Icon,
    Image01Icon,
    DashboardSquare01Icon,
    MapPinIcon,
    IdentityCardIcon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    SecurityCheckIcon,
    Tick02Icon,
    RefreshIcon,
    PencilEdit02Icon,
    MoneyBag01Icon,
    GlobalIcon,
    CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

export interface OwnerOption { id: string; name: string; email: string; }

export interface TenantFormState {
    name: string;
    selectedOwners: OwnerOption[];
    plan: string;
    region: string;
    commune: string;
    address: string;
    lat: number;
    lng: number;
    imagePreview: string;
}

export const EMPTY_TENANT_FORM: TenantFormState = {
    name: "",
    selectedOwners: [],
    plan: "Básico",
    region: "Metropolitana",
    commune: "",
    address: "",
    lat: 0,
    lng: 0,
    imagePreview: "",
};

const REGIONES_CHILE = [
    "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo",
    "Valparaíso", "Metropolitana", "O'Higgins", "Maule", "Ñuble", "Biobío",
    "Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes"
];

const PLAN_TAGS: Record<string, string> = { free: "Gratis", basic: "Inicial", pro: "Popular", elite: "Full" };

const STEPS = [
    { id: 1, label: "Identidad", hint: "Nombre, plan y dueños", icon: Building01Icon },
    { id: 2, label: "Ubicación", hint: "Dirección y coordenadas", icon: MapPinIcon },
    { id: 3, label: "Revisión", hint: "Confirma y publica", icon: SecurityCheckIcon },
];

interface TenantWizardProps {
    open: boolean;
    mode: "create" | "edit";
    initial: TenantFormState;
    ownersList: OwnerOption[];
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (form: TenantFormState) => void;
}

export default function TenantWizard({ open, mode, initial, ownersList, isSubmitting, onClose, onSubmit }: TenantWizardProps) {
    const { plans } = usePlans();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<TenantFormState>(initial);
    const [ownerSearch, setOwnerSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [geoMsg, setGeoMsg] = useState<{ text: string; ok: boolean } | null>(null);

    useEffect(() => {
        if (open) {
            setStep(1);
            setForm(initial);
            setOwnerSearch("");
            setShowDropdown(false);
            setGeoMsg(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, mode]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !isSubmitting) onClose(); };
        window.addEventListener("keydown", onKey);
        document.body.classList.add("overflow-hidden");
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.classList.remove("overflow-hidden");
        };
    }, [open, isSubmitting, onClose]);

    const set = (patch: Partial<TenantFormState>) => setForm((f) => ({ ...f, ...patch }));

    const step1Valid = form.name.trim().length >= 3 && form.selectedOwners.length > 0;
    const step2Valid = !!form.region && form.commune.trim().length > 0 && form.address.trim().length > 0;

    const filteredOwners = useMemo(
        () => ownersList.filter((o) =>
            o.name.toLowerCase().includes(ownerSearch.toLowerCase()) ||
            o.email.toLowerCase().includes(ownerSearch.toLowerCase())
        ),
        [ownersList, ownerSearch]
    );

    const addOwner = (owner: OwnerOption) => {
        if (form.selectedOwners.some((o) => o.id === owner.id)) return;
        set({ selectedOwners: [...form.selectedOwners, owner] });
        setOwnerSearch("");
        setShowDropdown(false);
    };

    const removeOwner = (id: string) => set({ selectedOwners: form.selectedOwners.filter((o) => o.id !== id) });

    const geocode = async () => {
        if (!form.address || !form.commune) {
            setGeoMsg({ text: "Ingresa dirección y comuna primero.", ok: false });
            return;
        }
        setGeoLoading(true);
        setGeoMsg(null);
        const queryAddr = `${form.address.replace(/[#]/g, "")}, ${form.commune}, ${form.region}, Chile`;
        const outcome = await geocodeAddress(queryAddr);

        if (outcome.status === "ok") {
            set({ lat: outcome.result.lat, lng: outcome.result.lng });
            setGeoMsg({ text: `Ubicación verificada: ${outcome.result.formattedAddress}`, ok: true });
        } else if (outcome.status === "permission-denied") {
            setGeoMsg({
                text: "La búsqueda de direcciones no está habilitada para esta API key. Puedes ingresar las coordenadas manualmente.",
                ok: false,
            });
        } else if (outcome.status === "not-found") {
            setGeoMsg({ text: "No encontramos esa dirección. Revísala e intenta de nuevo.", ok: false });
        } else {
            setGeoMsg({ text: "No se pudo verificar la ubicación. Inténtalo más tarde.", ok: false });
        }
        setGeoLoading(false);
    };

    if (!open) return null;

    const canNext = step === 1 ? step1Valid : step === 2 ? step2Valid : true;
    const hasCoords = !!(form.lat && form.lng);

    return (
        <ModalPortal>
        <div
            className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 dark:bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
            role="presentation"
            onClick={() => !isSubmitting && onClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="tenant-wizard-title"
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-4xl bg-white dark:bg-[#0B0F19] rounded-t-2xl sm:rounded-md border border-slate-200 dark:border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[94vh] sm:h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            >
                <div className="flex flex-1 min-h-0">
                    {/* ── SIDEBAR DE PASOS (desktop) ── */}
                    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] p-6 relative overflow-hidden">
                        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -left-10 w-40 h-40 bg-emerald-400/20 dark:bg-[#00df82]/15 blur-[70px] rounded-full" />

                        <div className="relative flex items-center gap-3 mb-8">
                            <span className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-[#00df82] flex items-center justify-center shrink-0">
                                <HugeiconsIcon icon={mode === "edit" ? PencilEdit02Icon : Building01Icon} className="w-5 h-5" strokeWidth={1.8} />
                            </span>
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-[#00df82]">
                                    {mode === "edit" ? "Editar" : "Nuevo"}
                                </span>
                                <h3 id="tenant-wizard-title" className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading leading-none mt-1">
                                    {mode === "edit" ? "Recinto" : "Alta de recinto"}
                                </h3>
                            </div>
                        </div>

                        <nav className="relative flex flex-col gap-1">
                            {STEPS.map((s) => {
                                const done = step > s.id;
                                const active = step === s.id;
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => { if (s.id < step || (s.id === 2 && step1Valid) || (s.id === 3 && step1Valid && step2Valid)) setStep(s.id); }}
                                        className={`group flex items-start gap-3 p-3 rounded-md text-left transition-all ${
                                            active ? "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm"
                                                : "border border-transparent hover:bg-white/60 dark:hover:bg-white/[0.03]"
                                        }`}
                                    >
                                        <span className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-black border shrink-0 transition-all ${
                                            done ? "bg-emerald-500 border-emerald-500 text-white dark:text-slate-950"
                                                : active ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-[#00df82]"
                                                    : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500"
                                        }`}>
                                            {done ? <HugeiconsIcon icon={Tick02Icon} className="w-3.5 h-3.5" strokeWidth={3} /> : s.id}
                                        </span>
                                        <span className="min-w-0">
                                            <span className={`block text-[12px] font-black uppercase tracking-wider ${active || done ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                                                {s.label}
                                            </span>
                                            <span className="block text-[10px] text-slate-400 mt-0.5">{s.hint}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="relative mt-auto pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Progreso</span>
                                <span className="text-[10px] font-black text-emerald-600 dark:text-[#00df82] font-mono">{Math.round((step / 3) * 100)}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#00df82] transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
                            </div>
                        </div>
                    </aside>

                    {/* ── CONTENIDO ── */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* HEADER móvil */}
                        <div className="md:hidden px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-9 h-9 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] flex items-center justify-center shrink-0">
                                    <HugeiconsIcon icon={mode === "edit" ? PencilEdit02Icon : Building01Icon} className="w-4.5 h-4.5" strokeWidth={1.8} />
                                </span>
                                <div className="min-w-0">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-[#00df82] block">
                                        Paso {step} de 3 · {STEPS[step - 1].label}
                                    </span>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading truncate leading-none mt-0.5">
                                        {mode === "edit" ? "Editar recinto" : "Alta de recinto"}
                                    </h3>
                                </div>
                            </div>
                            <button onClick={onClose} disabled={isSubmitting} aria-label="Cerrar" className="p-2 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer shrink-0">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} />
                            </button>
                        </div>
                        {/* barra progreso móvil */}
                        <div className="md:hidden h-1 bg-slate-100 dark:bg-white/5 shrink-0">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-[#00df82] transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
                        </div>

                        {/* HEADER desktop (cerrar) */}
                        <div className="hidden md:flex items-center justify-end px-6 py-3 border-b border-slate-100 dark:border-white/5 shrink-0">
                            <button onClick={onClose} disabled={isSubmitting} aria-label="Cerrar" className="p-2 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} />
                            </button>
                        </div>

                        {/* BODY */}
                        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
                            {step === 1 && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                                    {/* Portada */}
                                    <label className="group relative block rounded-md overflow-hidden border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 h-32 cursor-pointer hover:border-emerald-400 transition-all">
                                        {form.imagePreview ? (
                                            <>
                                                <img src={form.imagePreview} alt="Portada" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-white">Cambiar imagen</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                                <HugeiconsIcon icon={Image01Icon} className="w-7 h-7 text-slate-300 dark:text-white/20" strokeWidth={1.5} />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subir imagen de portada</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) { const r = new FileReader(); r.onload = () => set({ imagePreview: r.result as string }); r.readAsDataURL(e.target.files[0]); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </label>

                                    <Field label="Nombre del recinto" value={form.name} onChange={(e: any) => set({ name: e.target.value })} placeholder="Club Sport Providencia" icon={Building01Icon} />

                                    {/* Plan cards (sincronizadas con la BD) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Plan</label>
                                        <div className={`grid grid-cols-2 ${plans.length >= 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-2`}>
                                            {plans.map((p) => {
                                                const selected = form.plan === p.name || form.plan === p.id;
                                                const tag = PLAN_TAGS[p.id?.toLowerCase()] || p.name;
                                                return (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => set({ plan: p.name })}
                                                        className={`relative p-3 rounded-md border text-left transition-all cursor-pointer ${
                                                            selected ? "bg-emerald-500/10 border-emerald-500/50 dark:border-[#00df82]/50"
                                                                : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                                                        }`}
                                                    >
                                                        {selected && (
                                                            <span className="absolute top-2 right-2 text-emerald-600 dark:text-[#00df82]">
                                                                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={2} />
                                                            </span>
                                                        )}
                                                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">{tag}</span>
                                                        <span className={`block text-sm font-black font-heading mt-0.5 ${selected ? "text-emerald-700 dark:text-[#00df82]" : "text-slate-900 dark:text-white"}`}>{p.name}</span>
                                                        <span className="block text-[10px] font-bold text-slate-400 font-mono mt-0.5">${p.price.toLocaleString("es-CL")}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Dueños */}
                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Dueños asignados</label>
                                        <div className="relative">
                                            <HugeiconsIcon icon={Search01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                                            <input
                                                type="text"
                                                placeholder="Buscar por nombre o email…"
                                                value={ownerSearch}
                                                onChange={(e) => { setOwnerSearch(e.target.value); setShowDropdown(true); }}
                                                onFocus={() => setShowDropdown(true)}
                                                className="w-full pl-10 pr-3 py-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 dark:focus:border-[#00df82] outline-none transition-all"
                                            />
                                        </div>
                                        {showDropdown && ownerSearch && (
                                            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-md shadow-2xl max-h-52 overflow-y-auto no-scrollbar">
                                                {filteredOwners.length > 0 ? filteredOwners.map((o) => (
                                                    <button type="button" key={o.id} onClick={() => addOwner(o)} className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer border-b border-slate-100 dark:border-white/5 last:border-0 flex justify-between items-center text-left">
                                                        <div className="min-w-0">
                                                            <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{o.name}</p>
                                                            <p className="text-[10px] text-slate-400 truncate">{o.email}</p>
                                                        </div>
                                                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2} />
                                                    </button>
                                                )) : (
                                                    <p className="px-4 py-4 text-[11px] text-slate-400 text-center">Sin resultados</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {form.selectedOwners.map((o) => (
                                                <span key={o.id} className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-[#00df82] flex items-center justify-center text-[10px] font-black shrink-0">
                                                        {o.name.charAt(0).toUpperCase()}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-slate-900 dark:text-white max-w-[130px] truncate">{o.name}</span>
                                                    <button type="button" onClick={() => removeOwner(o.id)} aria-label={`Quitar ${o.name}`} className="p-1 rounded-md text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer">
                                                        <HugeiconsIcon icon={Cancel01Icon} className="w-3 h-3" strokeWidth={2.5} />
                                                    </button>
                                                </span>
                                            ))}
                                            {form.selectedOwners.length === 0 && (
                                                <span className="w-full py-4 border border-dashed border-slate-200 dark:border-white/10 rounded-md flex items-center justify-center">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sin dueños asignados</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Región</label>
                                            <select value={form.region} onChange={(e) => set({ region: e.target.value })} className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-semibold text-slate-900 dark:text-white focus:border-emerald-500 dark:focus:border-[#00df82] outline-none transition-all cursor-pointer">
                                                {REGIONES_CHILE.map((r) => <option key={r} value={r} className="bg-white text-slate-900 dark:bg-[#0B0F19] dark:text-white">{r}</option>)}
                                            </select>
                                        </div>
                                        <Field label="Comuna" value={form.commune} onChange={(e: any) => set({ commune: e.target.value })} placeholder="Providencia" icon={MapPinIcon} />
                                    </div>

                                    <Field label="Dirección exacta" value={form.address} onChange={(e: any) => set({ address: e.target.value })} placeholder="Av. Providencia 1234" icon={IdentityCardIcon} />

                                    {/* Geocode card */}
                                    <div className={`rounded-md border p-4 transition-all ${hasCoords ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"}`}>
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${hasCoords ? "bg-emerald-500/15 text-emerald-600 dark:text-[#00df82]" : "bg-slate-200/70 dark:bg-white/5 text-slate-400"}`}>
                                                    <HugeiconsIcon icon={GlobalIcon} className="w-4.5 h-4.5" strokeWidth={1.8} />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Geolocalización</p>
                                                    <p className="text-[10px] text-slate-400 truncate">
                                                        {hasCoords ? `${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}` : "Aún sin verificar"}
                                                    </p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={geocode} disabled={geoLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 dark:bg-[#00df82] text-white dark:text-slate-950 text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-60 cursor-pointer shrink-0">
                                                <HugeiconsIcon icon={geoLoading ? RefreshIcon : MapPinIcon} className={`w-4 h-4 ${geoLoading ? "animate-spin" : ""}`} strokeWidth={2} />
                                                <span className="hidden sm:inline">{hasCoords ? "Verificar" : "Geolocalizar"}</span>
                                            </button>
                                        </div>
                                        {geoMsg && (
                                            <p className={`text-[11px] font-semibold leading-relaxed ${geoMsg.ok ? "text-emerald-600 dark:text-[#00df82]" : "text-amber-600 dark:text-amber-400"}`}>{geoMsg.text}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Latitud" type="number" value={form.lat} onChange={(e: any) => set({ lat: parseFloat(e.target.value) || 0 })} />
                                        <Field label="Longitud" type="number" value={form.lng} onChange={(e: any) => set({ lng: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                                    {/* Preview card */}
                                    <div className="relative rounded-md overflow-hidden border border-slate-200 dark:border-white/10 h-40">
                                        {form.imagePreview ? (
                                            <img src={form.imagePreview} alt="Portada" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#0B0F19] dark:to-[#04231a] flex items-center justify-center">
                                                <HugeiconsIcon icon={Building01Icon} className="w-10 h-10 text-white/20" strokeWidth={1.4} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-black uppercase border shadow-lg bg-emerald-500 text-slate-950 border-emerald-400">
                                            Plan {form.plan}
                                        </span>
                                        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-md text-[10px] font-black uppercase border shadow-lg ${hasCoords ? "bg-white/90 text-slate-900 border-white/50" : "bg-amber-500 text-slate-950 border-amber-400"}`}>
                                            {hasCoords ? "Geo OK" : "Sin geo"}
                                        </span>
                                        <div className="absolute bottom-3 left-3 right-3">
                                            <h4 className="font-black text-white text-lg uppercase leading-tight truncate font-heading drop-shadow-md">
                                                {form.name || "Sin nombre"}
                                            </h4>
                                            <p className="text-[10px] text-slate-300 font-bold uppercase flex items-center gap-1 mt-0.5">
                                                <HugeiconsIcon icon={MapPinIcon} className="w-3 h-3 text-emerald-400" strokeWidth={2} />
                                                {form.commune || "—"}, {form.region}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="rounded-md border border-slate-200 dark:border-white/10 overflow-hidden">
                                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
                                                <HugeiconsIcon icon={IdentityCardIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Datos del recinto</span>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <ReviewRow label="Nombre" value={form.name || "—"} />
                                                <ReviewRow label="Plan" value={`${form.plan} · $${(plans.find(p => p.name === form.plan || p.id === form.plan)?.price ?? 0).toLocaleString("es-CL")}`} />
                                                <ReviewRow label="Región" value={form.region} />
                                                <ReviewRow label="Comuna" value={form.commune || "—"} />
                                                <ReviewRow label="Dirección" value={form.address || "—"} />
                                                <ReviewRow label="Coordenadas" value={hasCoords ? `${form.lat.toFixed(4)}, ${form.lng.toFixed(4)}` : "Sin geolocalizar"} />
                                            </div>
                                        </div>

                                        <div className="rounded-md border border-slate-200 dark:border-white/10 overflow-hidden">
                                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Dueños</span>
                                                </span>
                                                <span className="text-[10px] font-black text-emerald-600 dark:text-[#00df82] font-mono">{form.selectedOwners.length}</span>
                                            </div>
                                            <div className="p-4 space-y-2.5 max-h-[220px] overflow-y-auto no-scrollbar">
                                                {form.selectedOwners.length > 0 ? form.selectedOwners.map((o) => (
                                                    <div key={o.id} className="flex items-center gap-2.5">
                                                        <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] flex items-center justify-center text-[11px] font-black shrink-0">
                                                            {o.name.charAt(0).toUpperCase()}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{o.name}</p>
                                                            <p className="text-[10px] text-slate-400 truncate">{o.email}</p>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <p className="text-[11px] text-slate-400 text-center py-4">Sin dueños asignados</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-4 rounded-md bg-emerald-500/5 border border-emerald-500/15">
                                        <HugeiconsIcon icon={SecurityCheckIcon} className="w-5 h-5 text-emerald-600 dark:text-[#00df82] shrink-0 mt-0.5" strokeWidth={1.8} />
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                            Al confirmar, el recinto <strong className="text-slate-700 dark:text-slate-200">{mode === "edit" ? "se actualizará" : "quedará habilitado"}</strong> en la red global de búsqueda de la app. La configuración de pagos y facturación se gestiona desde el perfil del dueño.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 shrink-0 bg-slate-50/70 dark:bg-white/[0.02]">
                            {step > 1 ? (
                                <button type="button" onClick={() => setStep((s) => s - 1)} disabled={isSubmitting} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5 transition-all disabled:opacity-50 cursor-pointer">
                                    <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={2} />
                                    Atrás
                                </button>
                            ) : <span />}

                            {step < 3 ? (
                                <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider shadow-[0_0_25px_-8px_rgba(0,223,130,0.7)] hover:bg-[#3affa0] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                                    Siguiente
                                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={2} />
                                </button>
                            ) : (
                                <button type="button" onClick={() => onSubmit(form)} disabled={isSubmitting || !step1Valid || !step2Valid} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider shadow-[0_0_25px_-8px_rgba(0,223,130,0.7)] hover:bg-[#3affa0] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                                    <HugeiconsIcon icon={isSubmitting ? RefreshIcon : (mode === "edit" ? PencilEdit02Icon : SecurityCheckIcon)} className={`w-4 h-4 ${isSubmitting ? "animate-spin" : ""}`} strokeWidth={2} />
                                    {mode === "edit" ? "Guardar cambios" : "Crear recinto"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </ModalPortal>
    );
}

function Field({ label, icon: Icon, ...props }: any) {
    const id = props.id || props.name;
    return (
        <div className="space-y-1.5 text-left">
            <label htmlFor={id} className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{label}</label>
            <div className="relative">
                {Icon && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <HugeiconsIcon icon={Icon} className="w-4 h-4" strokeWidth={1.8} />
                    </span>
                )}
                <input
                    id={id}
                    className={`w-full ${Icon ? "pl-10" : "pl-3.5"} pr-3.5 py-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 dark:focus:border-[#00df82] focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all`}
                    {...props}
                />
            </div>
        </div>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 shrink-0">{label}</span>
            <span className="text-[12px] font-semibold text-slate-900 dark:text-white text-right truncate">{value}</span>
        </div>
    );
}
