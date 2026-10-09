"use client";
import React, { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import ModalPortal from "@/components/ui/ModalPortal";
import {
    UserIcon,
    Building01Icon,
    IdentityCardIcon,
    Mail01Icon,
    CallIcon,
    MapPinIcon,
    SquareLock01Icon,
    SecurityCheckIcon,
    Tick02Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    PencilEdit02Icon,
    RefreshIcon,
    ViewIcon,
    ViewOffIcon,
    CheckmarkCircle02Icon,
    Cancel01Icon,
} from "@hugeicons/core-free-icons";

export interface OwnerFormState {
    name: string;
    email: string;
    phone: string;
    company: string;
    rut: string;
    billingAddress: string;
    password: string;
}

export const EMPTY_OWNER_FORM: OwnerFormState = {
    name: "",
    email: "",
    phone: "",
    company: "",
    rut: "",
    billingAddress: "",
    password: "",
};

const STEPS = [
    { id: 1, label: "Identidad", hint: "Nombre y contacto", icon: UserIcon },
    { id: 2, label: "Empresa", hint: "Datos de facturación", icon: Building01Icon },
    { id: 3, label: "Acceso", hint: "Credenciales y revisión", icon: SecurityCheckIcon },
];

const emailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

interface OwnerWizardProps {
    open: boolean;
    mode: "create" | "edit";
    initial: OwnerFormState;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (form: OwnerFormState) => void;
}

export default function OwnerWizard({ open, mode, initial, isSubmitting, onClose, onSubmit }: OwnerWizardProps) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<OwnerFormState>(initial);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (open) {
            setStep(1);
            setForm(initial);
            setShowPassword(false);
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

    const set = (patch: Partial<OwnerFormState>) => setForm((f) => ({ ...f, ...patch }));

    const step1Valid = form.name.trim().length >= 3 && emailValid(form.email) && form.phone.trim().length >= 8;
    const step2Valid = form.company.trim().length >= 2 && form.rut.trim().length >= 6;
    const step3Valid = mode === "edit" ? true : form.password.trim().length >= 6;

    if (!open) return null;

    const canNext = step === 1 ? step1Valid : step === 2 ? step2Valid : true;

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
                    aria-labelledby="owner-wizard-title"
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full sm:max-w-4xl bg-white dark:bg-[#0B0F19] rounded-t-2xl sm:rounded-md border border-slate-200 dark:border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[94vh] sm:h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
                >
                    <div className="flex flex-1 min-h-0">
                        {/* SIDEBAR DE PASOS */}
                        <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] p-6 relative overflow-hidden">
                            <div aria-hidden="true" className="pointer-events-none absolute -top-16 -left-10 w-40 h-40 bg-emerald-400/20 dark:bg-[#00df82]/15 blur-[70px] rounded-full" />

                            <div className="relative flex items-center gap-3 mb-8">
                                <span className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-[#00df82] flex items-center justify-center shrink-0">
                                    <HugeiconsIcon icon={mode === "edit" ? PencilEdit02Icon : UserIcon} className="w-5 h-5" strokeWidth={1.8} />
                                </span>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-[#00df82]">
                                        {mode === "edit" ? "Editar" : "Nuevo"}
                                    </span>
                                    <h3 id="owner-wizard-title" className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading leading-none mt-1">
                                        {mode === "edit" ? "Dueño" : "Alta de dueño"}
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
                                            className={`flex items-start gap-3 p-3 rounded-md text-left transition-all ${
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
                                                <span className={`block text-[12px] font-black uppercase tracking-wider ${active || done ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>{s.label}</span>
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

                        {/* CONTENIDO */}
                        <div className="flex-1 flex flex-col min-w-0">
                            {/* HEADER móvil */}
                            <div className="md:hidden px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-9 h-9 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] flex items-center justify-center shrink-0">
                                        <HugeiconsIcon icon={mode === "edit" ? PencilEdit02Icon : UserIcon} className="w-4.5 h-4.5" strokeWidth={1.8} />
                                    </span>
                                    <div className="min-w-0">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-[#00df82] block">
                                            Paso {step} de 3 · {STEPS[step - 1].label}
                                        </span>
                                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading truncate leading-none mt-0.5">
                                            {mode === "edit" ? "Editar dueño" : "Alta de dueño"}
                                        </h3>
                                    </div>
                                </div>
                                <button onClick={onClose} disabled={isSubmitting} aria-label="Cerrar" className="p-2 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer shrink-0">
                                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} />
                                </button>
                            </div>
                            <div className="md:hidden h-1 bg-slate-100 dark:bg-white/5 shrink-0">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-[#00df82] transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
                            </div>

                            {/* HEADER desktop */}
                            <div className="hidden md:flex items-center justify-end px-6 py-3 border-b border-slate-100 dark:border-white/5 shrink-0">
                                <button onClick={onClose} disabled={isSubmitting} aria-label="Cerrar" className="p-2 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer">
                                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} />
                                </button>
                            </div>

                            {/* BODY */}
                            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
                                {step === 1 && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                                        <div className="flex items-center gap-4 p-4 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                                            <span className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00df82] flex items-center justify-center text-xl font-black shrink-0">
                                                {form.name.trim().charAt(0).toUpperCase() || <HugeiconsIcon icon={UserIcon} className="w-6 h-6" strokeWidth={1.8} />}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-black uppercase tracking-tight text-slate-900 dark:text-white truncate font-heading">
                                                    {form.name || "Nuevo dueño"}
                                                </p>
                                                <p className="text-[11px] text-slate-400 truncate">{form.email || "Sin email"}</p>
                                            </div>
                                        </div>

                                        <Field label="Nombre completo" value={form.name} onChange={(e: any) => set({ name: e.target.value })} placeholder="Juan Pérez" icon={UserIcon} autoComplete="name" />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Field label="Email corporativo" type="email" value={form.email} onChange={(e: any) => set({ email: e.target.value })} placeholder="juan@empresa.cl" icon={Mail01Icon} autoComplete="email" disabled={mode === "edit"} hint={mode === "edit" ? "El email no se puede modificar" : undefined} />
                                            <Field label="Teléfono" type="tel" value={form.phone} onChange={(e: any) => set({ phone: e.target.value })} placeholder="+56 9 1234 5678" icon={CallIcon} autoComplete="tel" />
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                                        <Field label="Razón social / Empresa" value={form.company} onChange={(e: any) => set({ company: e.target.value })} placeholder="Complejo Deportivo SpA" icon={Building01Icon} />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Field label="RUT / Identificación fiscal" value={form.rut} onChange={(e: any) => set({ rut: e.target.value })} placeholder="76.123.456-7" icon={IdentityCardIcon} />
                                            <Field label="Dirección de facturación" value={form.billingAddress} onChange={(e: any) => set({ billingAddress: e.target.value })} placeholder="Av. Providencia 1234, Santiago" icon={MapPinIcon} />
                                        </div>
                                        <div className="flex items-start gap-3 p-4 rounded-md bg-emerald-500/5 border border-emerald-500/15">
                                            <HugeiconsIcon icon={Building01Icon} className="w-5 h-5 text-emerald-600 dark:text-[#00df82] shrink-0 mt-0.5" strokeWidth={1.8} />
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                                Estos datos se usan para la facturación mensual del recinto. Podrás editarlos después desde el perfil del dueño.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                                        {mode === "create" && (
                                            <div className="space-y-1.5">
                                                <label htmlFor="owner-password" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Contraseña inicial</label>
                                                <div className="relative">
                                                    <HugeiconsIcon icon={SquareLock01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" strokeWidth={1.8} />
                                                    <input
                                                        id="owner-password"
                                                        type={showPassword ? "text" : "password"}
                                                        value={form.password}
                                                        onChange={(e) => set({ password: e.target.value })}
                                                        placeholder="Mínimo 6 caracteres"
                                                        autoComplete="new-password"
                                                        className="w-full pl-10 pr-11 py-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 dark:focus:border-[#00df82] focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword((v) => !v)}
                                                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00df82] transition-colors cursor-pointer"
                                                    >
                                                        <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} className="w-4 h-4" strokeWidth={1.8} />
                                                    </button>
                                                </div>
                                                {form.password.length > 0 && form.password.length < 6 && (
                                                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Mínimo 6 caracteres.</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="rounded-md border border-slate-200 dark:border-white/10 overflow-hidden">
                                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
                                                <HugeiconsIcon icon={SecurityCheckIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Resumen del dueño</span>
                                            </div>
                                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                                <ReviewRow label="Nombre" value={form.name || "—"} />
                                                <ReviewRow label="Email" value={form.email || "—"} />
                                                <ReviewRow label="Teléfono" value={form.phone || "—"} />
                                                <ReviewRow label="Empresa" value={form.company || "—"} />
                                                <ReviewRow label="RUT" value={form.rut || "—"} />
                                                <ReviewRow label="Dirección" value={form.billingAddress || "—"} />
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-4 rounded-md bg-emerald-500/5 border border-emerald-500/15">
                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5 text-emerald-600 dark:text-[#00df82] shrink-0 mt-0.5" strokeWidth={1.8} />
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                                {mode === "edit"
                                                    ? "Al confirmar, se actualizarán los datos del dueño. Su acceso se mantiene intacto."
                                                    : "Al confirmar, se creará la cuenta del dueño con acceso al panel. Te mostraremos las credenciales para compartirlas."}
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
                                    <button aria-label="Editar" type="button" onClick={() => onSubmit(form)} disabled={isSubmitting || !step1Valid || !step2Valid || !step3Valid} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider shadow-[0_0_25px_-8px_rgba(0,223,130,0.7)] hover:bg-[#3affa0] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                                        <HugeiconsIcon icon={isSubmitting ? RefreshIcon : (mode === "edit" ? PencilEdit02Icon : SecurityCheckIcon)} className={`w-4 h-4 ${isSubmitting ? "animate-spin" : ""}`} strokeWidth={2} />
                                        {mode === "edit" ? "Guardar cambios" : "Crear dueño"}
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

function Field({ label, icon: Icon, hint, ...props }: any) {
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
                    className={`w-full ${Icon ? "pl-10" : "pl-3.5"} pr-3.5 py-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 dark:focus:border-[#00df82] focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                    {...props}
                />
            </div>
            {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
        </div>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 shrink-0">{label}</span>
            <span className="text-[12px] font-semibold text-slate-900 dark:text-white text-right truncate">{value}</span>
        </div>
    );
}
