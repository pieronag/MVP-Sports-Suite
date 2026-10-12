"use client";
import { getOwnedTenantsSnap } from "@/services/client/ownedTenants";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listIncome } from '@/services/client/data/income';
import { incomeTotals, type IncomeItem, type IncomeKind } from '@/utils/incomeModel';
import { chileDateTime, chileToday } from '@/utils/chileTime';
import Link from 'next/link';
import {
    ArrowLeft01Icon,
    ArrowRight01Icon,
    BarChartIcon,
    Calendar03Icon,
    Cash01Icon,
    ChartBarDecreasingIcon,
    ChartBarIncreasingIcon,
    CheckmarkCircle02Icon,
    Clock01Icon,
    Coins01Icon,
    DocumentCodeIcon,
    FileExportIcon,
    MoneyBag01Icon,
    Mortarboard01Icon,
    RefreshIcon,
    Search01Icon,
    TrophyIcon,
} from '@hugeicons/core-free-icons';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';
// jsPDF (~400 KB) se carga solo al exportar
const loadPdf = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    return { jsPDF, autoTable };
};

// --- INTERFACES ---
interface Venue {
    id: string;
    name: string;
    features?: { analytics?: boolean };
}

const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount);
};

const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const KIND_LABEL: Record<IncomeKind, string> = { reserva: 'Reserva', torneo: 'Torneo', academia: 'Academia' };
const KIND_TONE: Record<IncomeKind, string> = {
    reserva: 'bg-blue-500/5 text-blue-500 border-blue-500/10',
    torneo: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10',
    academia: 'bg-indigo-500/5 text-indigo-500 border-indigo-500/10',
};
const LABEL_TONE: Record<string, string> = {
    'Pagado': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/10',
    'Anulada': 'text-slate-500 bg-slate-500/10 border-slate-500/10',
    'Reembolsado': 'text-rose-500 bg-rose-500/10 border-rose-500/10',
    'Inasistencia': 'text-red-500 bg-red-500/10 border-red-500/10',
    'Error en reembolso': 'text-amber-500 bg-amber-500/10 border-amber-500/10',
};
const StatusBadge = ({ label }: { label: string }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] md:text-[9px] font-bold uppercase border ${LABEL_TONE[label] || 'text-slate-500 bg-slate-500/10 border-slate-500/10'}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />{label}
    </span>
);
const paymentLabel = (t: IncomeItem) => (t.amount > 0 ? 'Mercado Pago' : 'Gratis');

// Mes calendario de Chile [inicio, fin]
const monthBounds = (year: number, month: number) => {
    const ymd = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const next = new Date(Date.UTC(year, month + 1, 1));
    return { from: chileDateTime(ymd(year, month), 0, 0), to: new Date(chileDateTime(ymd(next.getUTCFullYear(), next.getUTCMonth()), 0, 0).getTime() - 1) };
};

export default function FinancePage() {
    const { user } = useAuth();
    const nowChile = chileToday();
    const [myVenues, setMyVenues] = useState<Venue[]>([]);
    const [venuesLoaded, setVenuesLoaded] = useState(false);
    const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
    const [items, setItems] = useState<IncomeItem[]>([]);
    const [loadedKey, setLoadedKey] = useState('');
    const [loadError, setLoadError] = useState('');
    const [reloadTick, setReloadTick] = useState(0);
    const [filterType, setFilterType] = useState<'all' | IncomeKind>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(Number(nowChile.slice(5, 7)) - 1);
    const [selectedYear, setSelectedYear] = useState(Number(nowChile.slice(0, 4)));
    const [rowLimit, setRowLimit] = useState(20);

    // 1. Recintos del dueño
    useEffect(() => {
        if (!user?.uid) return;
        let active = true;
        getOwnedTenantsSnap(user.uid).then((snap) => {
            if (!active) return;
            setMyVenues(snap.docs.map(d => ({ id: d.id, name: d.data().name || 'Recinto', features: d.data().features || {} })));
        }).catch(() => { if (active) setLoadError('No se pudieron cargar tus recintos.'); })
          .finally(() => { if (active) setVenuesLoaded(true); });
        return () => { active = false; };
    }, [user?.uid]);

    // 2. Movimientos del mes elegido y del anterior (para comparar)
    const venueIds = selectedVenueId === 'all' ? myVenues.map(v => v.id) : [selectedVenueId];
    const queryKey = `${venueIds.join(',')}|${selectedYear}-${selectedMonth}|${reloadTick}`;
    useEffect(() => {
        if (!venueIds.length) return;
        let active = true;
        const prev = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
        const from = monthBounds(prev.getUTCFullYear(), prev.getUTCMonth()).from;
        const to = monthBounds(selectedYear, selectedMonth).to;
        listIncome(venueIds, from, to)
            .then((list) => { if (active) { setItems(list); setLoadError(''); } })
            .catch((e) => {
                console.error(e);
                if (active) setLoadError(e?.code === 'permission-denied' ? 'No tienes permiso para ver estos movimientos.' : 'No se pudieron cargar los movimientos. Revisa tu conexión.');
            })
            .finally(() => { if (active) setLoadedKey(queryKey); });
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryKey]);

    const loading = !venuesLoaded || (myVenues.length > 0 && loadedKey !== queryKey);
    const venueName = (id: string) => myVenues.find(v => v.id === id)?.name || 'Recinto';

    // 3. Derivados por mes
    const { from: curFrom, to: curTo } = monthBounds(selectedYear, selectedMonth);
    const currentTransactions = items.filter(t => t.date >= curFrom && t.date <= curTo);
    const prevTransactions = items.filter(t => t.date < curFrom);
    const stats = incomeTotals(currentTransactions);
    const prevStats = incomeTotals(prevTransactions);

    const trendPct = prevStats.total > 0
        ? Math.round(((stats.total - prevStats.total) / prevStats.total) * 100)
        : (stats.total > 0 ? 100 : 0);
    const trendUp = trendPct >= 0;
    const showTrend = prevStats.total > 0 || stats.total > 0;

    // 4. Filtros de la tabla
    const q = searchTerm.trim().toLowerCase();
    const filteredTransactions = currentTransactions.filter(t =>
        (filterType === 'all' || t.kind === filterType) &&
        (q === '' || t.clientName.toLowerCase().includes(q) || t.detail.toLowerCase().includes(q) || venueName(t.tenantId).toLowerCase().includes(q))
    );
    const visibleTransactions = filteredTransactions.slice(0, rowLimit);

    const changeMonth = (dir: number) => {
        const next = new Date(Date.UTC(selectedYear, selectedMonth + dir, 1));
        setSelectedMonth(next.getUTCMonth());
        setSelectedYear(next.getUTCFullYear());
        setRowLimit(20);
    };
    const isCurrentMonth = selectedYear * 12 + selectedMonth >= Number(nowChile.slice(0, 4)) * 12 + Number(nowChile.slice(5, 7)) - 1;

    const sumVisible = filteredTransactions.reduce((acc, t) => acc + (t.counts ? t.amount : 0), 0);

    // 5. Exportaciones
    const generatePDF = async () => {
        const { jsPDF, autoTable } = await loadPdf();
        const doc = new jsPDF();
        const venueName = selectedVenueId === 'all' ? 'Todos los Recintos' : myVenues.find(v => v.id === selectedVenueId)?.name || 'Recinto';
        const reportMonth = `${MONTHS[selectedMonth]} ${selectedYear}`;

        doc.setFillColor(0, 223, 130);
        doc.rect(0, 0, 210, 45, 'F');

        try {
            doc.addImage('/Logo.png', 'PNG', -15, -5, 60, 60);
        } catch (e) {
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(40);
            doc.setFont('helvetica', 'bold');
            doc.text('M', 8, 28);
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('MVP', 50, 20);
        doc.text('SPORTS', 75, 20);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('REPORTE FINANCIERO Y CONTROL DE INGRESOS', 50, 28);
        doc.text(`${venueName.toUpperCase()} | PERIODO: ${reportMonth.toUpperCase()}`, 50, 33);

        doc.setFontSize(10);
        doc.text(`FECHA REPORTE: ${new Date().toLocaleDateString('es-CL')}`, 150, 20);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("RESUMEN DE INGRESOS", 15, 60);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Ingresos totales: ${formatCLP(stats.total)}`, 15, 68);
        doc.text(`Reservas de canchas: ${formatCLP(stats.reserva)}`, 15, 74);
        doc.text(`Torneos: ${formatCLP(stats.torneo)}   ·   Academias: ${formatCLP(stats.academia)}`, 15, 80);

        const tableData = filteredTransactions.map(t => [
            t.date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            t.clientName.toUpperCase(),
            (t.kind === 'reserva' ? `${t.sport} - ${t.courtName}` : t.detail).toUpperCase(),
            paymentLabel(t).toUpperCase(),
            formatCLP(t.amount),
            t.label.toUpperCase(),
        ]);

        autoTable(doc, {
            startY: 95,
            head: [['FECHA', 'CLIENTE / EQUIPO', 'DETALLE', 'PAGO', 'MONTO', 'ESTADO']],
            body: tableData,
            styles: { fontSize: 8, font: 'helvetica', cellPadding: 3 },
            headStyles: { fillColor: [0, 223, 130], textColor: [0, 0, 0], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [241, 245, 249] },
        });

        doc.save(`Reporte_Finance_MVP_${venueName}_${reportMonth}.pdf`);
    };

    const exportCSV = () => {
        const header = ['FECHA', 'CLIENTE', 'RECINTO', 'TIPO', 'CANCHA', 'PAGO', 'MONTO', 'ESTADO'];
        const rows = filteredTransactions.map(t => [
            t.date.toLocaleDateString('es-CL'),
            t.clientName,
            venueName(t.tenantId),
            t.kind === 'reserva' ? `Cancha · ${t.sport}` : KIND_LABEL[t.kind],
            t.kind === 'reserva' ? t.courtName : t.detail,
            paymentLabel(t),
            String(t.amount),
            t.label,
        ]);
        const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Finance_${MONTHS[selectedMonth]}_${selectedYear}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const isAnalyticsLocked = myVenues.length > 0 && myVenues[0].features?.analytics === false;

    if (isAnalyticsLocked) {
        return (
            <div className="w-full space-y-5 pb-10 text-left relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="w-6 h-[2px] bg-emerald-500 rounded-md"></span>
                            <p className="text-[11px] md:text-[9px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Analítica de negocio</p>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                            Control <span className="text-emerald-500 dark:text-[#00df82]">Financiero</span>
                        </h1>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
                    <div className="flex flex-col items-center gap-5">
                        <div className="w-16 h-16 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82]">
                            <HugeiconsIcon icon={BarChartIcon} className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-tighter font-heading">Análisis de datos no incluido</h2>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-2 max-w-md leading-relaxed">
                                El análisis de datos y reportes financieros está disponible en planes superiores. Mejora tu plan para habilitar esta analítica.
                            </p>
                        </div>
                        <Link href="/dashboard/billing-subscription">
                            <span className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-emerald-500 text-white text-xs md:text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all">
                                Mejorar plan
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-5 pb-10 text-left relative">
            {/* CABECERA ADN */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md"></span>
                        <p className="text-xs md:text-[10px] font-bold text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">
                            Resumen de ingresos y pagos
                        </p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Control <span className="text-emerald-500 dark:text-[#00df82]">Financiero</span>
                    </h1>
                </div>

                {/* CONTROLES */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-white dark:bg-[#0B0F19] px-1.5 py-1 rounded-md border border-slate-200 dark:border-white/5 shadow-xs">
                        <button onClick={() => changeMonth(-1)} aria-label="Mes anterior" className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all" title="Mes anterior">
                            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                        <span className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-white whitespace-nowrap select-none">
                            {MONTHS[selectedMonth]} <span className="text-slate-400">{selectedYear}</span>
                        </span>
                        <button onClick={() => changeMonth(1)} disabled={isCurrentMonth} aria-label="Mes siguiente" className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none" title="Mes siguiente">
                            <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                    </div>

                    <select
                        value={selectedVenueId}
                        onChange={(e) => setSelectedVenueId(e.target.value)}
                        className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/5 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase outline-hidden text-slate-700 dark:text-white cursor-pointer shadow-xs"
                    >
                        <option value="all">TODOS LOS RECINTOS</option>
                        {myVenues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
            </div>

            {loadError && (
                <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-md border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400">
                    <p className="text-[11px] font-bold">{loadError}</p>
                    <button onClick={() => setReloadTick(t => t + 1)} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-red-500 text-white text-xs md:text-[10px] font-bold uppercase tracking-wider">
                        <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" strokeWidth={2} /> Reintentar
                    </button>
                </div>
            )}

            {/* KPI GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
                <TarjetaKpi
                    label={`INGRESOS ${MONTHS[selectedMonth].toUpperCase()}`}
                    value={formatCLP(stats.total)}
                    sub="Total pagado"
                    icon={<HugeiconsIcon icon={MoneyBag01Icon} />}
                    trend={showTrend ? { value: `${trendPct >= 0 ? '+' : ''}${trendPct}%`, isUp: trendUp } : undefined}
                    brillo
                />
                <TarjetaKpi label="RESERVAS" value={formatCLP(stats.reserva)} sub="Arriendo de canchas" icon={<HugeiconsIcon icon={Calendar03Icon} />} />
                <TarjetaKpi label="TORNEOS" value={formatCLP(stats.torneo)} sub="Inscripciones" icon={<HugeiconsIcon icon={TrophyIcon} />} />
                <TarjetaKpi label="ACADEMIAS" value={formatCLP(stats.academia)} sub="Clases" icon={<HugeiconsIcon icon={Mortarboard01Icon} />} />
            </div>

            {/* TENDENCIA + EXPORTACIÓN */}
            <PanelGlass className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${trendUp ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                <HugeiconsIcon icon={trendUp ? ChartBarIncreasingIcon : ChartBarDecreasingIcon} className="w-5 h-5" strokeWidth={1.8} />
                            </div>
                            <div>
                                <p className="text-[11px] md:text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Vs mes anterior</p>
                                <p className={`text-lg font-black font-mono leading-none ${trendUp ? 'text-emerald-600 dark:text-[#00df82]' : 'text-red-500'}`}>
                                    {showTrend ? `${trendPct >= 0 ? '+' : ''}${trendPct}%` : '—'}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={exportCSV} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 rounded-md text-[11px] md:text-[9px] font-bold uppercase tracking-widest hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all">
                                <HugeiconsIcon icon={FileExportIcon} className="w-3.5 h-3.5" strokeWidth={2} /> CSV
                            </button>
                            <button onClick={generatePDF} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md text-[11px] md:text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all">
                                <HugeiconsIcon icon={DocumentCodeIcon} className="w-3.5 h-3.5" strokeWidth={2} /> PDF
                            </button>
                        </div>
                    </div>
                </div>
            </PanelGlass>

            {/* TABLA */}
            <PanelGlass className="p-0 overflow-hidden">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4 p-6 bg-slate-50/50 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="flex w-full sm:w-auto overflow-x-auto bg-white dark:bg-[#020611] p-1 rounded-md border border-slate-200 dark:border-white/10">
                            {(['all', 'reserva', 'torneo', 'academia'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`flex-1 lg:flex-none whitespace-nowrap px-4 py-2 text-xs md:text-[10px] font-bold uppercase rounded-md transition-all ${
                                        filterType === type
                                            ? 'bg-slate-900 text-white dark:bg-[#00df82] dark:text-black'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                                    }`}
                                >
                                    {type === 'all' ? 'Todo' : type === 'reserva' ? 'Reservas' : type === 'torneo' ? 'Torneos' : 'Academias'}
                                </button>
                            ))}
                        </div>
                        <span className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'movimiento' : 'movimientos'}
                        </span>
                    </div>

                    <div className="relative w-full lg:w-80">
                        <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar cliente, recinto o detalle..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-[#020611] border border-slate-200 dark:border-white/10 rounded-md pl-10 pr-4 py-2.5 text-[11px] font-bold outline-hidden focus:ring-1 focus:ring-emerald-500/30 tracking-tight"
                        />
                    </div>
                </div>

                {/* Móvil: tarjetas */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
                    {loading ? (
                        <p className="py-16 text-center text-xs md:text-[10px] font-bold text-slate-400 uppercase animate-pulse">Cargando movimientos...</p>
                    ) : visibleTransactions.length === 0 ? (
                        <EmptyState />
                    ) : visibleTransactions.map((t) => (
                        <div key={`${t.kind}-${t.id}`} className="p-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded-md text-[11px] md:text-[9px] font-bold uppercase border ${KIND_TONE[t.kind]}`}>{KIND_LABEL[t.kind]}</span>
                                    <span className="text-xs md:text-[10px] font-mono text-slate-400">{t.date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}{t.timeRange ? ` · ${t.timeRange}` : ''}</span>
                                </div>
                                <p className="text-[12px] font-bold text-slate-900 dark:text-white uppercase truncate">{t.clientName}</p>
                                <p className="text-xs md:text-[10px] text-slate-500 dark:text-slate-400 truncate">{t.kind === 'reserva' ? `${t.sport} · ${t.courtName}` : t.detail} · {venueName(t.tenantId)}</p>
                            </div>
                            <div className="text-right shrink-0 space-y-1.5">
                                <p className={`text-[12px] font-black font-mono ${t.counts ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>{formatCLP(t.amount)}</p>
                                <StatusBadge label={t.label} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Escritorio: tabla */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/30 dark:bg-white/1">
                                <th className="px-5 py-4 text-xs md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-5 py-4 text-xs md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                                <th className="px-5 py-4 text-xs md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recinto</th>
                                <th className="px-5 py-4 text-xs md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                                <th className="px-5 py-4 text-xs md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detalle</th>
                                <th className="px-5 py-4 text-xs md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pago</th>
                                <th className="px-5 py-4 text-xs md:text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Monto</th>
                                <th className="px-5 py-4 text-xs md:text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center text-xs md:text-[10px] font-bold text-slate-400 uppercase animate-pulse">Cargando movimientos...</td>
                                </tr>
                            ) : visibleTransactions.length > 0 ? (
                                visibleTransactions.map((t) => (
                                    <tr key={`${t.kind}-${t.id}`} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors text-[11px]">
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 dark:text-white">{t.date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</span>
                                                <span className="text-[11px] md:text-[9px] text-slate-400 font-mono">{t.date.toLocaleDateString('es-CL', { year: 'numeric' })}</span>
                                                {t.timeRange && <span className="text-[11px] md:text-[9px] text-slate-400 font-mono mt-0.5">{t.timeRange}</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-bold text-slate-900 dark:text-white uppercase truncate block max-w-[160px]">{t.clientName}</span>
                                            {t.clientPhone && <p className="text-[11px] md:text-[9px] text-slate-400 font-mono">{t.clientPhone}</p>}
                                        </td>
                                        <td className="px-5 py-4"><span className="text-slate-500 dark:text-slate-300 uppercase truncate block max-w-[120px]">{venueName(t.tenantId)}</span></td>
                                        <td className="px-5 py-4"><span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] md:text-[9px] font-bold uppercase border ${KIND_TONE[t.kind]}`}>{KIND_LABEL[t.kind]}</span></td>
                                        <td className="px-5 py-4"><span className="text-slate-600 dark:text-slate-300 uppercase truncate block max-w-[200px]">{t.kind === 'reserva' ? `${t.sport} · ${t.courtName}` : t.detail}</span></td>
                                        <td className="px-5 py-4"><span className="text-xs md:text-[10px] font-bold uppercase text-sky-500">{paymentLabel(t)}</span></td>
                                        <td className="px-5 py-4 text-right">
                                            <span className={`font-bold font-mono block whitespace-nowrap ${t.counts ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>{formatCLP(t.amount)}</span>
                                        </td>
                                        <td className="px-5 py-4 text-center"><StatusBadge label={t.label} /></td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={8}><EmptyState /></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredTransactions.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/2">
                        <p className="text-xs md:text-[10px] font-bold uppercase tracking-widest text-slate-400">Total cobrado del listado ({filteredTransactions.length})</p>
                        <p className="text-xs md:text-[10px] font-black font-mono text-emerald-600 dark:text-[#00df82]">{formatCLP(sumVisible)}</p>
                    </div>
                )}

                {filteredTransactions.length > rowLimit && (
                    <button
                        onClick={() => setRowLimit(r => r + 20)}
                        className="w-full py-4 text-xs md:text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-[#00df82] hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors border-t border-slate-100 dark:border-white/5"
                    >
                        Mostrar más ({filteredTransactions.length - rowLimit} restantes)
                    </button>
                )}
            </PanelGlass>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="py-20 text-center space-y-3 px-4">
            <div className="w-14 h-14 bg-slate-50 dark:bg-white/5 rounded-md flex items-center justify-center mx-auto text-slate-300 border border-slate-200 dark:border-white/10">
                <HugeiconsIcon icon={Cash01Icon} className="w-7 h-7" strokeWidth={1.4} />
            </div>
            <p className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Sin movimientos en este periodo</p>
            <p className="text-xs md:text-[10px] font-bold text-slate-300 uppercase tracking-wider">Prueba con otro mes o recinto</p>
        </div>
    );
}
