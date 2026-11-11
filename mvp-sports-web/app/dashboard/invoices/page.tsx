"use client";
import { buildInvoicePdf, formatCLP, monthRange, type Invoice } from "@/services/client/invoicePdf";
import { useFeedback } from "@/components/ui/Feedback";
import PageTitle, { Accent } from "@/components/dashboard/PageTitle";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { listAllBookings} from "@/services/client/data/bookings";
import { invoiceFor } from "@/utils/invoiceCalc";
import type {} from "@/types/booking";

// Mes AAAA-MM en hora de Chile
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Search01Icon,
    Download01Icon,
    Calendar03Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    MoneyBag01Icon,
    Clock01Icon,
    CheckmarkCircle02Icon,
    ReceiptIcon,
    FilterIcon,
    PrinterIcon,
    Delete02Icon,
    RefreshIcon,
    Alert02Icon,
    ArrowDown01Icon,
    ViewIcon,
    Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { collection, getDocs, query, orderBy, where, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import { TarjetaKpi, SectionCard } from '@/components/ui/DashboardWidgets';

const ic = "w-6 h-6";

export default function Page() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('Todas');
    const [searchTerm, setSearchTerm] = useState('');
    const [planFilter, setPlanFilter] = useState('Todos');
    const [globalSettings, setGlobalSettings] = useState<any>(null);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);
    const [preview, setPreview] = useState<{ url: string; inv: Invoice | null }>({ url: '', inv: null });

    const getPreviousMonth = () => {
        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };
    const [selectedMonth, setSelectedMonth] = useState(getPreviousMonth());
    const [monthAll, setMonthAll] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const { alert: showAlert, confirm } = useFeedback();
    const showConfirm = async (title: string, message: string, onConfirm: () => void | Promise<void>) => {
        if (await confirm({ title, message })) await onConfirm();
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const settingsSnap = await getDoc(doc(db, "settings", "global"));
            if (settingsSnap.exists()) setGlobalSettings(settingsSnap.data());

            const qInv = query(collection(db, "invoices"), orderBy("issueDate", "desc"));
            const invSnap = await getDocs(qInv);
            const loadedInvoices: Invoice[] = invSnap.docs.map(doc => {
                const data = doc.data();
                const issueD = data.issueDate ? (data.issueDate.toDate ? data.issueDate.toDate() : new Date(data.issueDate)) : new Date();
                const dueD = data.dueDate ? (data.dueDate.toDate ? data.dueDate.toDate() : new Date(data.dueDate)) : new Date();
                return {
                    id: doc.id,
                    tenantId: data.tenantId || "",
                    tenant: data.tenantName || "Recinto Desconocido",
                    owner: data.ownerName || "Sin Dueño",
                    ownerEmail: data.ownerEmail || "",
                    rawDate: data.rawDate || "2024-01",
                    issueDate: issueD.toLocaleDateString("es-CL"),
                    dueDate: dueD.toLocaleDateString("es-CL"),
                    details: data.details || "Servicios Varios",
                    amount: data.amount || 0,
                    status: data.status || "Pendiente",
                    breakdown: data.breakdown || null
                };
            });
            setInvoices(loadedInvoices);

        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [selectedMonth, monthAll]);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportMenuOpen(false);
        };
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, []);

    const shiftMonth = (delta: number) => () => {
        const [y, m] = selectedMonth.split('-').map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        const now = new Date();
        if (d.getFullYear() > now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth())) return;
        setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        setMonthAll(false);
    };
    const monthLabel = (() => {
        const [y, m] = selectedMonth.split('-').map(Number);
        const label = new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    })();
    const isCurrentMonthSelected = (() => {
        const [y, m] = selectedMonth.split('-').map(Number);
        const now = new Date();
        return y === now.getFullYear() && m === now.getMonth() + 1;
    })();

    const handleGenerateBulk = async () => {
        setIsGenerating(true);
        try {
            const settingsSnap = await getDoc(doc(db, "settings", "global"));
            const settingsData = settingsSnap.exists() ? settingsSnap.data() : null;
            const globalPlans = settingsData?.plans || [];
            const globalCommissionRate = typeof settingsData?.commissionRate === 'number' ? settingsData.commissionRate : 8;

            const tenantsSnap = await getDocs(collection(db, "tenants"));
            const tenants = tenantsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

            const monthlyBookings = await listAllBookings(monthRange(selectedMonth), 20000);

            const qInvoices = query(collection(db, "invoices"), where("rawDate", "==", selectedMonth));
            const existingInvoicesSnap = await getDocs(qInvoices);
            const existingTenantIds = new Set(existingInvoicesSnap.docs.map(d => (d.data() as any).tenantId));
            const toProcess = (tenants as any[]).filter(t => !existingTenantIds.has(t.id));

            if (toProcess.length === 0) {
                showAlert("Sin Datos", "No hay nuevas reservas PAGADAS para facturar en este periodo.");
                return;
            }

            for (let i = 0; i < toProcess.length; i++) {
                const t = toProcess[i];
                const { amount: total, breakdown } = invoiceFor(t, monthlyBookings, globalPlans, globalCommissionRate);
                if (total <= 0) continue;

                await addDoc(collection(db, "invoices"), {
                    tenantId: t.id, tenantName: t.name, ownerName: t.ownerName || "Sin Dueño",
                    ownerEmail: t.ownerEmail || "", amount: total, status: "Pendiente",
                    rawDate: selectedMonth, issueDate: serverTimestamp(), dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
                    details: `Liquidación MVP - ${selectedMonth}`,
                    breakdown
                });
            }
            showAlert("Completado", "Generación finalizada considerando solo transacciones pagadas.");
            fetchData();
        } catch (error: any) {
            console.error(error);
            showAlert("Error", error?.code === 'permission-denied' ? "Tu cuenta no tiene permisos para generar liquidaciones." : "No se pudo completar la generación. Revisa tu conexión e inténtalo de nuevo.");
        } finally { setIsGenerating(false); }
    };

    const handleToggleStatus = async (inv: Invoice) => {
        const newStatus = inv.status === "Pagada" ? "Pendiente" : "Pagada";
        showConfirm("Actualizar Estado", `¿Confirmas el cambio de estado a ${newStatus.toUpperCase()}?`, async () => {
            try {
                await updateDoc(doc(db, "invoices", inv.id), { status: newStatus });
                fetchData();
            } catch { showAlert("Error", "No se pudo actualizar el estado."); }
        });
    };

    const handleDeleteInvoice = async (id: string) => {
        showConfirm("Eliminar", "¿Estás seguro de eliminar esta liquidación? Esta acción es irreversible.", async () => {
            try {
                await deleteDoc(doc(db, "invoices", id));
                fetchData();
            } catch { showAlert("Error", "No se pudo eliminar la liquidación."); }
        });
    };

    const handleDownload = async (inv: Invoice) => {
        const doc = await buildInvoicePdf(inv, globalSettings);
        doc.save(`Liquidacion_MVP_${inv.tenant.replace(/\s+/g, '_')}_${inv.rawDate}.pdf`);
    };

    const openPreview = async (inv: Invoice) => {
        try {
            const doc = await buildInvoicePdf(inv, globalSettings);
            setPreview({ url: doc.output('datauristring'), inv });
        } catch {
            showAlert('Error', 'No se pudo generar la vista previa.');
        }
    };

    const closePreview = () => setPreview({ url: '', inv: null });
    const plansList = useMemo(() => {
        const set = new Set<string>();
        invoices.forEach(inv => {
            const name = inv.breakdown?.planName;
            if (name) set.add(name);
        });
        return ['Todos', ...Array.from(set)];
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            if (!monthAll && selectedMonth && inv.rawDate !== selectedMonth) return false;
            if (filterStatus === 'Pendientes' && (inv.status !== 'Pendiente' && inv.status !== 'Vencida')) return false;
            if (filterStatus === 'Pagadas' && inv.status !== 'Pagada') return false;
            if (planFilter !== 'Todos' && inv.breakdown?.planName !== planFilter) return false;
            if (searchTerm) {
                const lower = searchTerm.toLowerCase();
                return (inv.tenant.toLowerCase().includes(lower) || inv.owner.toLowerCase().includes(lower) || inv.ownerEmail.toLowerCase().includes(lower));
            }
            return true;
        });
    }, [invoices, filterStatus, searchTerm, selectedMonth, monthAll, planFilter]);

    const totalInvoiced = filteredInvoices.reduce((acc, curr) => acc + curr.amount, 0);
    // Cobrado: solo las liquidaciones pagadas (antes se mostraba el total emitido como "solo pagos aceptados")
    const totalCollected = filteredInvoices.filter(i => i.status === 'Pagada').reduce((acc, curr) => acc + curr.amount, 0);
    const totalPending = filteredInvoices.filter(i => i.status !== 'Pagada').reduce((acc, curr) => acc + curr.amount, 0);
    const payRate = filteredInvoices.length > 0 ? Math.round((filteredInvoices.filter(i => i.status === 'Pagada').length / filteredInvoices.length) * 100) : 0;

    const exportCSV = () => {
        const sep = ';';
        const esc = (v: any) => {
            const s = String(v ?? '');
            return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const line = (cells: any[]) => cells.map(esc).join(sep);
        const headers = ['Centro Operativo', 'Dueño', 'Email', 'Periodo', 'Plan', 'Detalle', 'Monto', 'Estado', 'Vence'];
        const body = filteredInvoices.map(inv => line([
            inv.tenant, inv.owner, inv.ownerEmail, inv.rawDate,
            inv.breakdown?.planName || 'Base', inv.details, inv.amount, inv.status, inv.dueDate,
        ]));
        const blob = new Blob(["\ufeff" + [line(headers)].concat(body).join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 10);
        a.href = url; a.download = `facturacion_mvp_${stamp}.csv`;
        a.click(); URL.revokeObjectURL(url);
        setExportMenuOpen(false);
    };

    const exportPDF = () => {
        const first = filteredInvoices[0];
        if (first) handleDownload(first);
        setExportMenuOpen(false);
    };

    const statusStyle = (status: string): string => {
        const s = status.toLowerCase();
        if (s === 'pagada' || s === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/10 dark:text-[#00df82]';
        if (s === 'vencida' || s === 'overdue') return 'bg-red-50 text-red-600 border-red-500/30 dark:bg-red-500/10 dark:text-red-400';
        return 'bg-amber-50 text-amber-600 border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400';
    };
    const statusDot = (status: string): string => {
        const s = status.toLowerCase();
        if (s === 'pagada' || s === 'paid') return 'bg-emerald-500';
        if (s === 'vencida' || s === 'overdue') return 'bg-red-500';
        return 'bg-amber-500';
    };
    const planBadgeStyle = (plan?: string): string => {
        const p = (plan || '').toLowerCase();
        if (p.includes('elite')) return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-[#00df82]';
        if (p.includes('pro')) return 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-400';
        if (p.includes('basic') || p.includes('básico') || p.includes('basico')) return 'bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-400';
        return 'bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-400';
    };
    const monthShort = (raw: string): string => {
        const [y, m] = (raw || '2024-01').split('-').map(Number);
        const label = new Date(y || 2024, (m || 1) - 1, 1).toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
        return label.toUpperCase().replace('.', '');
    };

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <PageTitle eyebrow="Control financiero">Gestión de <Accent>Facturación</Accent></PageTitle>
                <div className="flex items-center gap-2.5">
                    <div className="relative" ref={exportRef}>
                        <button
                            onClick={() => setExportMenuOpen(o => !o)}
                            disabled={filteredInvoices.length === 0}
                            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-wider hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2} />
                            Exportar
                            <HugeiconsIcon icon={ArrowDown01Icon} className={`w-3.5 h-3.5 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
                        </button>
                        {exportMenuOpen && (
                            <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-52 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-200/60 dark:shadow-black/40 p-1.5 animate-fadeIn">
                                <button
                                    onClick={exportCSV}
                                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    <span className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border border-emerald-500/20 shrink-0">
                                        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={1.8} />
                                    </span>
                                    <span className="flex flex-col min-w-0">
                                        <span className="text-xs md:text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">CSV (Excel)</span>
                                        <span className="text-[11px] md:text-[9px] text-slate-400">Listado filtrado</span>
                                    </span>
                                </button>
                                <button
                                    onClick={exportPDF}
                                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    <span className="flex items-center justify-center w-8 h-8 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                                        <HugeiconsIcon icon={PrinterIcon} className="w-4 h-4" strokeWidth={1.8} />
                                    </span>
                                    <span className="flex flex-col min-w-0">
                                        <span className="text-xs md:text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">PDF</span>
                                        <span className="text-[11px] md:text-[9px] text-slate-400">Primera liquidación</span>
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => showConfirm("Liquidación masiva", `Se generarán las liquidaciones considerando únicamente pagos aceptados para ${monthAll ? "el periodo seleccionado" : selectedMonth}.`, handleGenerateBulk)}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[11px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <HugeiconsIcon icon={ReceiptIcon} className="w-4 h-4" strokeWidth={2} />
                        Generar masivo
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
                <TarjetaKpi titulo="Cobrado" valor={formatCLP(totalCollected)} sub={`De ${formatCLP(totalInvoiced)} emitido`} icono={<HugeiconsIcon icon={MoneyBag01Icon} className={ic} strokeWidth={1.6} />} brillo />
                <TarjetaKpi titulo="Pendiente" valor={formatCLP(totalPending)} sub="Por recaudar" icono={<HugeiconsIcon icon={Clock01Icon} className={ic} strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Tasa de pago" valor={`${payRate}%`} sub="Eficiencia" icono={<HugeiconsIcon icon={CheckmarkCircle02Icon} className={ic} strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Facturas" valor={filteredInvoices.length.toString()} sub="Periodo seleccionado" icono={<HugeiconsIcon icon={ReceiptIcon} className={ic} strokeWidth={1.6} />} />
            </div>

            {/* FILTROS */}
            <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center p-4 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64">
                        <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                        <input
                            type="text"
                            placeholder="Buscar recinto, dueño o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/40 dark:focus:border-[#00df82]/40 rounded-md text-xs md:text-[10px] font-black outline-hidden text-slate-700 dark:text-white placeholder:text-slate-400 transition-all shadow-xs"
                        />
                    </div>
                    <div className="flex items-center rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
                        <button
                            onClick={shiftMonth(-1)}
                            aria-label="Mes anterior"
                            className="p-2.5 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={2.2} />
                        </button>
                        <div className="flex items-center gap-2 px-2 min-w-[150px] justify-center border-x border-slate-200 dark:border-white/10">
                            <HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.8} />
                            <span className="text-[11px] font-black uppercase text-slate-700 dark:text-white whitespace-nowrap">{monthAll ? 'Todos los meses' : monthLabel}</span>
                        </div>
                        <button
                            onClick={shiftMonth(1)}
                            disabled={isCurrentMonthSelected}
                            aria-label="Mes siguiente"
                            className="p-2.5 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={2.2} />
                        </button>
                    </div>
                    <button
                        onClick={() => { setMonthAll(!monthAll); setSelectedMonth(getPreviousMonth()); }}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-md text-xs md:text-[10px] font-black uppercase tracking-wider transition-all ${monthAll ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black' : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-[#00df82]'}`}
                    >
                        <HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4" strokeWidth={1.8} />
                        Ver todo
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <HugeiconsIcon icon={FilterIcon} className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={2} />
                        <select
                            value={planFilter}
                            onChange={(e) => setPlanFilter(e.target.value)}
                            className="bg-transparent text-xs md:text-[10px] font-black uppercase outline-hidden text-slate-700 dark:text-white"
                        >
                            {plansList.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="flex bg-white dark:bg-white/5 p-1 rounded-md border border-slate-200 dark:border-white/10">
                        {["Todas", "Pendientes", "Pagadas"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilterStatus(f)}
                                className={`px-4 py-1.5 text-[11px] md:text-[9px] font-black uppercase rounded-md transition-all ${filterStatus === f ? "bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black" : "text-slate-400 hover:text-slate-700 dark:hover:text-white"}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* LISTADO DE FACTURAS */}
            <SectionCard
                title="Liquidaciones"
                subtitle={`${filteredInvoices.length} factura(s) en la vista`}
                icon={<HugeiconsIcon icon={ReceiptIcon} className="w-5 h-5" strokeWidth={1.8} />}
                bodyClassName="p-0"
                action={
                    <button onClick={fetchData} aria-label="Refrescar" title="Refrescar datos" className="p-2 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                        <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
                    </button>
                }
            >
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Centro operativo</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Administración</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Periodo</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Plan / Comisión</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Monto</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Estado</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filteredInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-white/2 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none mb-1">{inv.tenant}</p>
                                            <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter font-mono">ID: {inv.id.slice(0, 8)}</p>
                                            <span className="mt-1 text-[11px] md:text-[8px] font-black text-emerald-600 dark:text-[#00df82] uppercase tracking-tighter">
                                                {inv.breakdown?.totalBookings || 0} reservas pagadas
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{inv.owner}</p>
                                            <p className="text-[11px] md:text-[9px] font-bold text-slate-400 uppercase truncate max-w-[160px]">{inv.ownerEmail}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <p className="text-xs md:text-[10px] font-black text-slate-900 dark:text-white uppercase font-mono">{monthShort(inv.rawDate)}</p>
                                            <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Vence: {inv.dueDate}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[11px] md:text-[8px] font-black uppercase border w-fit ${planBadgeStyle(inv.breakdown?.planName)}`}>
                                                {inv.breakdown?.planName?.toUpperCase() || 'BASE'}
                                            </span>
                                            <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                                Com. {inv.breakdown?.commissionRate || 0}% · Base {formatCLP(inv.breakdown?.totalRevenue || 0)}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <p className="text-sm font-black text-slate-900 dark:text-white font-mono">{formatCLP(inv.amount)}</p>
                                            <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                                Plan {formatCLP(inv.breakdown?.planCost || 0)} + Com. {formatCLP(inv.breakdown?.commissionTotal || 0)}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] md:text-[9px] font-black uppercase border ${statusStyle(inv.status)}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot(inv.status)}`} />
                                            {inv.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openPreview(inv)} title="Ver liquidación" className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] rounded-md transition-all">
                                                <HugeiconsIcon icon={ViewIcon} className="w-4 h-4" strokeWidth={1.8} />
                                            </button>
                                            <button onClick={() => handleDeleteInvoice(inv.id)} title="Eliminar" className="p-2 hover:bg-red-50 text-red-400 rounded-md transition-all dark:hover:bg-red-500/10">
                                                <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" strokeWidth={1.8} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(inv)}
                                                title={inv.status === 'Pagada' ? 'Marcar como pendiente' : 'Marcar como pagada'}
                                                className={`p-2 rounded-md transition-all ${inv.status === 'Pagada' ? 'hover:bg-amber-50 text-amber-500 dark:hover:bg-amber-500/10' : 'hover:bg-emerald-50 text-emerald-500 dark:hover:bg-emerald-500/10'}`}
                                            >
                                                <HugeiconsIcon icon={inv.status === 'Pagada' ? RefreshIcon : CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={1.8} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredInvoices.length === 0 && (
                        <div className="py-16 text-center">
                            <HugeiconsIcon icon={Alert02Icon} className="w-10 h-10 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin liquidaciones en la vista seleccionada</p>
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* MODAL VISTA PREVIA PDF */}
            {preview.url && (
                <div className="fixed inset-0 z-400 flex flex-col bg-black/70 backdrop-blur-md animate-fadeIn p-3 sm:p-5" onClick={closePreview}>
                    <div className="flex items-center justify-between gap-3 mb-3 w-full max-w-5xl mx-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-500/15 border border-emerald-500/25 shrink-0">
                                <HugeiconsIcon icon={ViewIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[11px] font-black uppercase text-white tracking-wider truncate font-heading">
                                    Liquidacin  {preview.inv?.tenant}
                                </p>
                                <p className="text-[11px] md:text-[9px] font-bold uppercase text-slate-400 tracking-wider">Periodo {preview.inv?.rawDate}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => preview.inv && handleDownload(preview.inv)}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-xs md:text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all"
                            >
                                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2} />
                                Descargar
                            </button>
                            <button
                                onClick={closePreview}
                                aria-label="Cerrar vista previa"
                                className="p-2 rounded-md bg-white/10 border border-white/10 text-white hover:bg-white/20 active:scale-95 transition-all"
                            >
                                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 w-full max-w-5xl mx-auto bg-white rounded-md overflow-hidden shadow-2xl border border-white/10">
                        <iframe
                            src={preview.url}
                            title="Vista previa de la liquidacin"
                            className="w-full h-full min-h-0"
                            style={{ border: 'none' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
