"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ChevronLeft, Mail, AlertCircle, CheckCircle2,
    Shield, Activity, ArrowRight, Smartphone, User
} from "lucide-react";
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from "@/services/firebase";
import { usePlayer } from "@/context/PlayerContext";

const COLORS = {
    accent: '#10b981',
    error: '#f43f5e',
};

const CATEGORIES = [
    { id: 'Bug', label: 'Error (Bug)', color: '#ef4444' },
    { id: 'Pago', label: 'Pago / Cobros', color: '#3b82f6' },
    { id: 'Sugerencia', label: 'Sugerencia', color: '#ec4899' },
    { id: 'Soporte', label: 'Soporte', color: '#10b981' },
    { id: 'Otro', label: 'Otro', color: '#64748b' },
];

const PRIORITIES = [
    { id: 'Baja', label: 'Baja', color: '#10b981' },
    { id: 'Media', label: 'Media', color: '#f59e0b' },
    { id: 'Alta', label: 'Alta', color: '#f97316' },
    { id: 'Crítica', label: 'Crítica', color: '#ef4444' },
];

export default function ReportePage() {
    const router = useRouter();
    const { profile, theme } = usePlayer();
    const isDark = theme === 'dark';

    const [activeTab, setActiveTab] = useState<'nuevo' | 'historial'>('nuevo');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [myReports, setMyReports] = useState<any[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);

    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('Bug');
    const [priority, setPriority] = useState('Media');
    const [screen, setScreen] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const uid = (profile as any)?.uid;
    const displayName = (profile as any)?.displayName || 'Jugador';
    const userEmail = (profile as any)?.email || 'anonimo@mvpsports.cl';

    const fetchMyReports = async () => {
        if (!uid) return;
        setLoadingReports(true);
        try {
            const q = query(collection(db, 'reports'), where('userId', '==', uid));
            const snapshot = await getDocs(q);
            const reportsData = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                createdAt: d.data().createdAt?.seconds ? new Date(d.data().createdAt.seconds * 1000) : new Date(),
            }));
            reportsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            setMyReports(reportsData);
        } catch (error) {
            console.error("Error loading reports:", error);
        } finally {
            setLoadingReports(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'historial') fetchMyReports();
    }, [activeTab]);

    const handleSubmit = async () => {
        if (!subject.trim()) { setErrorMsg('El asunto principal es requerido.'); return; }
        if (!description.trim()) { setErrorMsg('Por favor describe detalladamente la incidencia.'); return; }
        setSubmitting(true);
        setErrorMsg('');

        try {
            const browserInfo = typeof window !== 'undefined' ? `${navigator.userAgent} | ${navigator.platform}` : 'Server-side render';
            const reportData = {
                subject: subject.trim(),
                category,
                priority,
                screen: screen.trim() || 'No especificada',
                description: description.trim(),
                stepsToReproduce: steps.trim() || 'No especificados',
                status: 'Abierto',
                userId: uid || 'anonimo',
                userEmail,
                userName: displayName,
                userRole: 'player',
                tenantId: 'system_web',
                tenantName: 'App Web - Jugador',
                userAgent: browserInfo,
                browser: typeof window !== 'undefined' ? window.navigator.userAgent : 'Node.js',
                os: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
                screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'Unknown',
                windowSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown',
                originUrl: typeof window !== 'undefined' ? window.location.href : 'app://player/reporte',
                device: 'Web App',
                sla: 100,
                createdAt: Timestamp.now(),
            };

            const docRef = await addDoc(collection(db, 'reports'), reportData);
            setSuccess(true);
            setSubject('');
            setScreen('');
            setDescription('');
            setSteps('');
        } catch (error: any) {
            console.error("Error submitting report:", error);
            setErrorMsg('Hubo un problema al enviar el reporte. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = (field: string) =>
        `w-full rounded-[14px] border px-4 h-[52px] flex items-center mb-5 transition-colors ${
            focusedField === field ? 'border-emerald-500' : 'border-white/[0.08]'
        }`;

    const textareaClass = (field: string) =>
        `w-full rounded-[14px] border px-4 py-3 mb-5 transition-colors min-h-[100px] ${
            focusedField === field ? 'border-emerald-500' : 'border-white/[0.08]'
        }`;

    return (
        <div className={`min-h-screen pb-32 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
            {/* HEADER */}
            <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
                <button onClick={() => router.back()} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
                    <ChevronLeft size={20} className="text-emerald-500" />
                </button>
                <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center">Soporte</h1>
                <div className="w-10" />
            </div>

            {/* TABS */}
            <div className="flex gap-2.5 px-5 pt-3 pb-4">
                <button onClick={() => setActiveTab('nuevo')}
                    className={`flex-1 h-11 rounded-[14px] text-[10px] font-semibold uppercase tracking-wider transition-all active:scale-[0.98] ${activeTab === 'nuevo' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" : isDark ? "bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    NUEVO REPORTE
                </button>
                <button onClick={() => setActiveTab('historial')}
                    className={`flex-1 h-11 rounded-[14px] text-[10px] font-semibold uppercase tracking-wider transition-all active:scale-[0.98] ${activeTab === 'historial' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" : isDark ? "bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    MIS REPORTES
                </button>
            </div>

            <div className="max-w-2xl mx-auto px-5">
                {success && activeTab === 'nuevo' ? (
                    <div className="flex flex-col items-center justify-center py-16 px-5">
                        <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#10b98115', border: '2px solid #10b98130' }}>
                            <CheckCircle2 size={52} strokeWidth={1.5} style={{ color: '#10b981' }} />
                        </div>
                        <h2 className="text-lg font-semibold mb-2" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>¡Reporte Recibido!</h2>
                        <span className="px-3 py-1.5 rounded-[14px] text-[8px] font-semibold tracking-widest mb-4" style={{ backgroundColor: '#10b981', color: 'white' }}>SOPORTE ACTIVO</span>
                        <p className="text-[12px] font-medium text-center leading-5 max-w-[280px] mb-8" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                            Tu ticket se ha ingresado con éxito. Nuestro equipo de soporte lo atenderá con prioridad.
                        </p>
                        <button onClick={() => setSuccess(false)}
                            className="w-full h-[52px] rounded-[14px] font-semibold uppercase tracking-wider text-white text-[11px] flex items-center justify-center gap-2 mb-3 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25"
                            style={{ backgroundColor: '#10b981' }}>
                            Reportar otro Problema <ArrowRight size={15} />
                        </button>
                        <button onClick={() => setActiveTab('historial')}
                            className={`w-full h-[52px] rounded-[14px] font-semibold uppercase tracking-wider text-[11px] flex items-center justify-center border transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] text-[#94A3B8] border-white/[0.06]" : "bg-slate-100 text-[#64748B] border-slate-200"}`}>
                            Ver mis Reportes
                        </button>
                    </div>
                ) : activeTab === 'historial' ? (
                    <div className="pt-3 pb-8">
                        {loadingReports ? (
                            <div className="py-16 flex flex-col items-center justify-center">
                                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                                <p className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Cargando reportes...</p>
                            </div>
                        ) : myReports.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center">
                                <AlertCircle size={36} className={isDark ? "text-slate-600" : "text-slate-300"} />
                                <p className={`text-sm font-semibold mt-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>No hay reportes</p>
                                <p className={`text-[11px] font-medium mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Aún no has enviado ningún reporte.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {myReports.map(report => (
                                    <div key={report.id} className={`relative rounded-[14px] ${isDark ? "bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.06]" : "bg-white/80 backdrop-blur-xl border border-slate-200/60"} shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"}`}>
                                        <div className="p-5">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="px-2.5 py-1 rounded-[14px] text-[8px] font-semibold uppercase tracking-wider border"
                                                    style={{
                                                        backgroundColor: report.status === 'Resuelto' ? '#10b98115' : '#3b82f615',
                                                        borderColor: report.status === 'Resuelto' ? '#10b98130' : '#3b82f630',
                                                        color: report.status === 'Resuelto' ? '#10b981' : '#3b82f6'
                                                    }}>
                                                    {report.status}
                                                </span>
                                                <span className={`text-[10px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                    {report.createdAt?.toLocaleDateString?.() || ''}
                                                </span>
                                            </div>
                                            <p className={`text-[15px] font-semibold mb-1.5 ${isDark ? "text-[#F8FAFC]" : "text-[#0F172A]"}`}>{report.subject}</p>
                                            <p className={`text-[12px] font-medium leading-5 line-clamp-3 ${isDark ? "text-[#94A3B8]" : "text-[#64748B]"}`}>{report.description}</p>
                                            {report.response && (
                                                <div className={`mt-3.5 p-4 rounded-[14px] border ${isDark ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"}`}>
                                                    <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#E2E8F0"}` }}>
                                                        <Shield size={14} style={{ color: '#10b981' }} />
                                                        <span className="text-[9px] font-semibold tracking-wider" style={{ color: '#10b981' }}>SOPORTE MVP ({report.repliedBy || 'Oficial'})</span>
                                                    </div>
                                                    <p className={`text-[12px] font-medium leading-5 ${isDark ? "text-[#F8FAFC]" : "text-[#0F172A]"}`}>{report.response}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="pt-8">
                        {errorMsg && (
                            <div className="flex items-center gap-2.5 p-4 rounded-[14px] border mb-5" style={{ backgroundColor: '#ef444415', borderColor: '#ef444430' }}>
                                <AlertCircle size={20} style={{ color: '#ef4444' }} />
                                <span className="text-[12px] font-semibold flex-1" style={{ color: '#ef4444' }}>{errorMsg}</span>
                            </div>
                        )}

                        {/* BANNER */}
                        <div className="rounded-[14px] p-6 mb-8" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-[38px] h-[38px] rounded-[14px] flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                    <Mail size={20} style={{ color: 'white' }} />
                                </div>
                                <span className="text-[8px] font-semibold text-white px-2 py-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
                                    SLA GARANTIZADO
                                </span>
                            </div>
                            <p className="text-[22px] font-semibold tracking-tight text-white">Centro de Ayuda MVP</p>
                            <p className="text-[11px] font-semibold mt-1.5 leading-4 text-white/85">
                                Reporta bugs o incidencias en la app directamente a nuestro equipo de desarrollo.
                            </p>
                        </div>

                        {/* CATEGORY */}
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#10b981' }}>Categoría del Problema</p>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {CATEGORIES.map(cat => (
                                <button key={cat.id} onClick={() => setCategory(cat.id)}
                                    className="px-4 py-2.5 rounded-[14px] text-[12px] font-semibold border"
                                    style={{
                                        backgroundColor: category === cat.id ? cat.color : '#0F172A',
                                        borderColor: category === cat.id ? cat.color : 'rgba(255,255,255,0.08)',
                                        color: category === cat.id ? 'white' : '#F8FAFC'
                                    }}>
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* PRIORITY */}
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#10b981' }}>Gravedad / Prioridad</p>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {PRIORITIES.map(prio => (
                                <button key={prio.id} onClick={() => setPriority(prio.id)}
                                    className="px-4 py-2.5 rounded-[14px] text-[12px] font-semibold border"
                                    style={{
                                        backgroundColor: priority === prio.id ? prio.color : '#0F172A',
                                        borderColor: priority === prio.id ? prio.color : 'rgba(255,255,255,0.08)',
                                        color: priority === prio.id ? 'white' : '#F8FAFC'
                                    }}>
                                    {prio.label}
                                </button>
                            ))}
                        </div>

                        {/* SUBJECT */}
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>ASUNTO PRINCIPAL *</p>
                        <div className={inputClass('subject')} style={{ backgroundColor: '#0F172A' }}>
                            <input
                                placeholder="EJ. ERROR AL CONFIRMAR PARTIDO"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                onFocus={() => setFocusedField('subject')}
                                onBlur={() => setFocusedField(null)}
                                className="w-full bg-transparent text-[15px] font-semibold outline-none"
                                style={{ color: '#F8FAFC' }}
                            />
                        </div>

                        {/* SCREEN */}
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>PANTALLA O SECCIÓN (OPCIONAL)</p>
                        <div className={inputClass('screen')} style={{ backgroundColor: '#0F172A' }}>
                            <input
                                placeholder="EJ. ESTADISTICAS / MENU PRINCIPAL"
                                value={screen}
                                onChange={e => setScreen(e.target.value)}
                                onFocus={() => setFocusedField('screen')}
                                onBlur={() => setFocusedField(null)}
                                className="w-full bg-transparent text-[15px] font-semibold outline-none"
                                style={{ color: '#F8FAFC' }}
                                autoCapitalize="characters"
                            />
                        </div>

                        {/* DESCRIPTION */}
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>DESCRIPCIÓN DETALLADA *</p>
                        <div className={textareaClass('description')} style={{ backgroundColor: '#0F172A' }}>
                            <textarea
                                placeholder="EXPLICA AQUÍ DETALLADAMENTE QUÉ SUCEDIÓ..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                onFocus={() => setFocusedField('description')}
                                onBlur={() => setFocusedField(null)}
                                className="w-full bg-transparent text-[15px] font-semibold outline-none resize-none h-full"
                                style={{ color: '#F8FAFC' }}
                                rows={4}
                            />
                        </div>

                        {/* STEPS */}
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>PASOS PARA REPRODUCIR (OPCIONAL)</p>
                        <div className={textareaClass('steps')} style={{ backgroundColor: '#0F172A' }}>
                            <textarea
                                placeholder="1. IR A JUGAR, 2. CLICK EN EDITAR, 3. DAR CLICK EN GUARDAR..."
                                value={steps}
                                onChange={e => setSteps(e.target.value)}
                                onFocus={() => setFocusedField('steps')}
                                onBlur={() => setFocusedField(null)}
                                className="w-full bg-transparent text-[15px] font-semibold outline-none resize-none h-full"
                                style={{ color: '#F8FAFC' }}
                                rows={3}
                                autoCapitalize="characters"
                            />
                        </div>

                        {/* DIAGNOSTICS */}
                        <div className="rounded-[14px] p-5 border mb-9" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F1F5F9', borderColor: 'rgba(255,255,255,0.08)' }}>
                            <div className="flex items-center mb-2">
                                <Smartphone size={16} style={{ color: '#10b981' }} />
                                <p className="text-[13px] font-semibold uppercase ml-2 tracking-tight" style={{ color: '#F8FAFC' }}>Información de Diagnóstico</p>
                            </div>
                            <p className="text-[11px] font-semibold leading-4 mb-4" style={{ color: '#94A3B8' }}>
                                Los siguientes metadatos se enviarán automáticamente en segundo plano.
                            </p>
                            {[
                                { icon: Activity, label: 'Navegador/UA', value: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'Server' },
                                { icon: User, label: 'Usuario Reportante', value: displayName },
                                { icon: Shield, label: 'Rol de Cuenta', value: 'PLAYER', accent: true },
                            ].map((row, i) => (
                                <div key={i} className="flex justify-between items-center py-2.5" style={{ borderTop: '1px solid rgba(100,116,139,0.08)' }}>
                                    <div className="flex items-center">
                                        <row.icon size={12} style={{ color: '#94A3B8' }} />
                                        <span className="text-[11px] font-semibold ml-1.5" style={{ color: '#94A3B8' }}>{row.label}</span>
                                    </div>
                                    <span className="text-[11px] font-semibold truncate max-w-[50%]" style={{ color: row.accent ? '#10b981' : '#F8FAFC' }}>{row.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* SUBMIT */}
                        <button onClick={handleSubmit} disabled={submitting}
                            className="w-full h-[60px] rounded-[14px] font-semibold uppercase tracking-wider text-white text-sm flex items-center justify-center gap-2.5"
                            style={{ backgroundColor: COLORS.accent, opacity: submitting ? 0.6 : 1, boxShadow: '0 10px 20px rgba(16,185,129,0.2)' }}>
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>Enviar Reporte Técnico <ArrowRight size={18} /></>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
