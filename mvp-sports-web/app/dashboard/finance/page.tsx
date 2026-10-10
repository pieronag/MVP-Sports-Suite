"use client";
import { getOwnedTenantsSnap } from "@/services/client/ownedTenants";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/client/firebase';
import { collection, getDocs, query, where, onSnapshot, or } from 'firebase/firestore';
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
interface Transaction {
    id: string;
    type: 'reserva' | 'torneo';
    amount: number;
    date: Date;
    clientName: string;
    clientPhone: string;
    details: string;
    status: string;
    venueName: string;
    paymentStatus: string;
    sport: string;
    courtName: string;
    timeRange: string;
    duration: number;
    paymentMethod: string;
    remainingBalance: number;
}

interface Venue {
    id: string;
    name: string;
    features?: any;
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

const computeStats = (list: Transaction[]) => {
    return list.reduce((acc, curr) => {
        const isPaid = curr.paymentStatus === 'paid' || curr.type === 'torneo';
        if (isPaid) {
            acc.totalRevenue += curr.amount;
            if (curr.type === 'reserva') acc.reservaRevenue += curr.amount;
            else acc.torneoRevenue += curr.amount;
        } else {
            acc.pendingRevenue += curr.amount;
        }
        return acc;
    }, { totalRevenue: 0, reservaRevenue: 0, torneoRevenue: 0, pendingRevenue: 0 });
};

const statusLabel = (t: Transaction) => {
    const ps = (t.paymentStatus || 'pending').toLowerCase();
    if (t.type === 'torneo' || ps === 'paid') return 'PAGADO';
    if (ps === 'partial') return 'PARCIAL';
    if (ps === 'refunded') return 'REEMBOLSADO';
    if (ps === 'no-show') return 'NO-SHOW';
    return 'PENDIENTE';
};

const paymentMethodLabel = (m: string) => {
    const v = (m || '').toLowerCase();
    if (v === 'cash' || v === 'efectivo') return 'Efectivo';
    if (v === 'transfer' || v === 'transferencia') return 'Transferencia';
    if (v === 'mercadopago' || v === 'mp') return 'Mercado Pago';
    if (v === 'webpay') return 'WebPay';
    if (v === 'card' || v === 'tarjeta') return 'Tarjeta';
    if (v === 'online') return 'Online';
    return v || '—';
};

const paymentMethodTone = (m: string) => {
    const v = (m || '').toLowerCase();
    if (v === 'cash' || v === 'efectivo') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/10';
    if (v === 'transfer' || v === 'transferencia') return 'text-sky-500 bg-sky-500/10 border-sky-500/10';
    if (v === 'mercadopago' || v === 'mp') return 'text-sky-500 bg-sky-500/10 border-sky-500/10';
    if (v === 'webpay') return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/10';
    if (v === 'card' || v === 'tarjeta') return 'text-violet-500 bg-violet-500/10 border-violet-500/10';
    return 'text-slate-400 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10';
};

export default function FinancePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [myVenues, setMyVenues] = useState<Venue[]>([]);
    const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [filterType, setFilterType] = useState<'all' | 'reserva' | 'torneo' | 'pending'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [rowLimit, setRowLimit] = useState(20);

    // 1. Cargar recintos del dueño
    useEffect(() => {
        if (!user?.uid) return;
        let active = true;
        getOwnedTenantsSnap(user.uid).then((snap) => {
            if (!active) return;
            const list = snap.docs.map(d => ({ id: d.id, name: d.data().name, features: d.data().features || {} } as Venue));
            setMyVenues(list);
        });
        return () => { active = false; };
    }, [user]);

    // 2. Cargar transacciones (todas, se filtran por mes en cliente)
    useEffect(() => {
        if (!user?.uid || myVenues.length === 0) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const venueIds = selectedVenueId === 'all' ? myVenues.map(v => v.id) : [selectedVenueId];

        const qBookings = query(
            collection(db, "bookings"),
            where("tenantId", "in", venueIds.slice(0, 30))
        );

        const unsubBookings = onSnapshot(qBookings, async (bSnap) => {
            const allBookings: Transaction[] = bSnap.docs.map(doc => {
                const data = doc.data();
                const isNoShow = data.status === 'no-show' ||
                    data.paymentStatus === 'no-show' ||
                    (data.notes && (data.notes.toLowerCase().includes('no-show') || data.notes.toLowerCase().includes('inasistencia')));

                return {
                    id: doc.id,
                    type: 'reserva' as const,
                    amount: Number(data.totalPrice || data.price || 0),
                    date: data.date?.toDate() || new Date(),
                    clientName: data.clientName || 'Cliente Externo',
                    clientPhone: data.clientPhone || '',
                    details: `${data.courtName || 'Cancha'} - ${data.startTime || '--:--'}`,
                    status: data.status,
                    venueName: myVenues.find(v => v.id === data.tenantId)?.name || 'Recinto',
                    paymentStatus: isNoShow ? 'no-show' : (data.paymentStatus || 'pending'),
                    sport: data.sport || 'General',
                    courtName: data.courtName || 'Cancha',
                    timeRange: `${data.startTime || '--:--'} - ${data.endTime || '--:--'}`,
                    duration: Number(data.duration || 1),
                    paymentMethod: data.paymentMethod || 'cash',
                    remainingBalance: Number(data.remainingBalance || 0)
                };
            });

            const qTournaments = query(
                collection(db, "tournaments"),
                where("tenantId", "in", venueIds.slice(0, 30))
            );
            const tSnap = await getDocs(qTournaments);
            const tIds = tSnap.docs.map(d => d.id);

            let tournamentRegs: Transaction[] = [];
            if (tIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < tIds.length; i += 10) {
                    chunks.push(tIds.slice(i, i + 10));
                }

                for (const chunk of chunks) {
                    const qRegs = query(
                        collection(db, "tournament_registrations"),
                        where("tournamentId", "in", chunk)
                    );
                    const rSnap = await getDocs(qRegs);
                    const regs = rSnap.docs.map(doc => {
                        const data = doc.data();
                        const tInfo = tSnap.docs.find(d => d.id === data.tournamentId)?.data();
                        return {
                            id: doc.id,
                            type: 'torneo' as const,
                            amount: Number(data.paidAmount || 0),
                            date: data.createdAt?.toDate() || new Date(),
                            clientName: data.teamName || data.userName || 'Equipo',
                            clientPhone: data.contactPhone || '',
                            details: `Torneo: ${tInfo?.name || 'Copa MVP'}`,
                            status: data.status,
                            venueName: myVenues.find(v => v.id === tInfo?.tenantId)?.name || 'Recinto',
                            paymentStatus: 'paid',
                            sport: 'Torneo',
                            courtName: 'Varias',
                            timeRange: '',
                            duration: 0,
                            paymentMethod: 'online',
                            remainingBalance: 0
                        } as Transaction;
                    });
                    tournamentRegs = [...tournamentRegs, ...regs];
                }
            }

            const consolidated = [...allBookings, ...tournamentRegs].sort((a, b) => b.date.getTime() - a.date.getTime());
            setAllTransactions(consolidated);
            setLoading(false);
        });

        return () => unsubBookings();
    }, [user, myVenues, selectedVenueId]);

    // 3. Derivados por mes
    const currentTransactions = useMemo(
        () => allTransactions
            .filter(t => t.date.getMonth() === selectedMonth && t.date.getFullYear() === selectedYear)
            .sort((a, b) => b.date.getTime() - a.date.getTime()),
        [allTransactions, selectedMonth, selectedYear]
    );

    const { prevYear, prevMonth } = useMemo(() => {
        const d = new Date(selectedYear, selectedMonth - 1, 1);
        return { prevYear: d.getFullYear(), prevMonth: d.getMonth() };
    }, [selectedYear, selectedMonth]);

    const prevTransactions = useMemo(
        () => allTransactions.filter(t => t.date.getMonth() === prevMonth && t.date.getFullYear() === prevYear),
        [allTransactions, prevMonth, prevYear]
    );

    const stats = useMemo(() => computeStats(currentTransactions), [currentTransactions]);
    const prevStats = useMemo(() => computeStats(prevTransactions), [prevTransactions]);

    const trendPct = prevStats.totalRevenue > 0
        ? Math.round(((stats.totalRevenue - prevStats.totalRevenue) / prevStats.totalRevenue) * 100)
        : (stats.totalRevenue > 0 ? 100 : 0);
    const trendUp = trendPct >= 0;
    const showTrend = prevStats.totalRevenue > 0 || stats.totalRevenue > 0;

    const collectable = stats.totalRevenue + stats.pendingRevenue;
    const collectionRate = collectable > 0 ? Math.round((stats.totalRevenue / collectable) * 100) : 0;

    // 4. Filtros de la tabla
    const filteredTransactions = useMemo(() => currentTransactions.filter(t => {
        const matchesType = filterType === 'all' || t.type === filterType ||
            (filterType === 'pending' && t.paymentStatus !== 'paid' && t.type !== 'torneo');
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch = q === '' ||
            t.clientName.toLowerCase().includes(q) ||
            t.details.toLowerCase().includes(q) ||
            t.venueName.toLowerCase().includes(q);
        return matchesType && matchesSearch;
    }), [currentTransactions, filterType, searchTerm]);

    const visibleTransactions = filteredTransactions.slice(0, rowLimit);

    useEffect(() => { setRowLimit(20); }, [filterType, searchTerm, selectedMonth, selectedYear, selectedVenueId]);

    const changeMonth = (dir: number) => {
        const next = new Date(selectedYear, selectedMonth + dir, 1);
        setSelectedMonth(next.getMonth());
        setSelectedYear(next.getFullYear());
    };

    const sumVisible = visibleTransactions.reduce((acc, t) => acc + t.amount, 0);

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
        doc.text(`Ingresos Totales (Pagados): ${formatCLP(stats.totalRevenue)}`, 15, 68);
        doc.text(`Canchas / Reservas: ${formatCLP(stats.reservaRevenue)}`, 15, 74);
        doc.text(`Inscripciones / Torneos: ${formatCLP(stats.torneoRevenue)}`, 15, 80);
        doc.text(`Saldo Pendiente: ${formatCLP(stats.pendingRevenue)}`, 15, 86);

        const tableData = filteredTransactions.map(t => {
            const sport = t.type === 'torneo' ? 'TORNEO' : (t.sport || 'FÚTBOL');
            const court = t.type === 'torneo' ? 'VARIAS' : (t.courtName || 'PISTA');

            return [
                t.date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                t.clientName.toUpperCase(),
                `${sport.toUpperCase()} - ${court.toUpperCase()}`,
                paymentMethodLabel(t.paymentMethod).toUpperCase(),
                formatCLP(t.amount),
                statusLabel(t)
            ];
        });

        autoTable(doc, {
            startY: 95,
            head: [['FECHA', 'CLIENTE / EQUIPO', 'DEPORTE - CANCHA', 'PAGO', 'MONTO', 'ESTADO']],
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
            t.venueName,
            t.type === 'reserva' ? `Cancha · ${t.sport}` : 'Torneo',
            t.courtName,
            paymentMethodLabel(t.paymentMethod),
            String(t.amount),
            statusLabel(t)
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
                            <p className="text-[9px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Analítica de negocio</p>
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
                            <span className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all">
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
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">
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
                        <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all" title="Mes anterior">
                            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                        <span className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-white whitespace-nowrap select-none">
                            {MONTHS[selectedMonth]} <span className="text-slate-400">{selectedYear}</span>
                        </span>
                        <button onClick={() => changeMonth(1)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all" title="Mes siguiente">
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

            {/* KPI GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <TarjetaKpi
                    label={`INGRESOS ${MONTHS[selectedMonth].toUpperCase()}`}
                    value={formatCLP(stats.totalRevenue)}
                    sub="Monto total pagado"
                    icon={<HugeiconsIcon icon={MoneyBag01Icon} />}
                    trend={showTrend ? { value: `${trendPct >= 0 ? '+' : ''}${trendPct}%`, isUp: trendUp } : undefined}
                    brillo
                />
                <TarjetaKpi
                    label="RESERVAS CANCHAS"
                    value={formatCLP(stats.reservaRevenue)}
                    sub="Arriendos normales"
                    icon={<HugeiconsIcon icon={Calendar03Icon} />}
                />
                <TarjetaKpi
                    label="INSCRIPCIONES"
                    value={formatCLP(stats.torneoRevenue)}
                    sub="Torneos y ligas"
                    icon={<HugeiconsIcon icon={TrophyIcon} />}
                />
                <TarjetaKpi
                    label="POR COBRAR"
                    value={formatCLP(stats.pendingRevenue)}
                    sub="Pagos pendientes"
                    icon={<HugeiconsIcon icon={Coins01Icon} />}
                />
            </div>

            {/* COBRANZA + TENDENCIA + EXPORTACIÓN */}
            <PanelGlass className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cobranza del periodo</p>
                            <p className="text-[10px] font-black font-mono text-emerald-600 dark:text-[#00df82]">{collectionRate}% cobrado</p>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500 dark:bg-[#00df82] transition-all duration-500" style={{ width: `${collectionRate}%` }} />
                            <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${100 - collectionRate}%` }} />
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-3 text-[10px]">
                            <span className="flex items-center gap-2 font-bold uppercase text-slate-500 dark:text-slate-300">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#00df82]" /> Pagado <b className="font-mono">{formatCLP(stats.totalRevenue)}</b>
                            </span>
                            <span className="flex items-center gap-2 font-bold uppercase text-slate-500 dark:text-slate-300">
                                <span className="w-2 h-2 rounded-full bg-amber-500" /> Por cobrar <b className="font-mono">{formatCLP(stats.pendingRevenue)}</b>
                            </span>
                        </div>
                    </div>

                    <div className="lg:border-l lg:border-slate-100 dark:border-white/5 lg:pl-6 flex items-center gap-5">
                        <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${trendUp ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                <HugeiconsIcon icon={trendUp ? ChartBarIncreasingIcon : ChartBarDecreasingIcon} className="w-5 h-5" strokeWidth={1.8} />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Vs mes anterior</p>
                                <p className={`text-lg font-black font-mono leading-none ${trendUp ? 'text-emerald-600 dark:text-[#00df82]' : 'text-red-500'}`}>
                                    {showTrend ? `${trendPct >= 0 ? '+' : ''}${trendPct}%` : '—'}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={exportCSV} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 rounded-md text-[9px] font-bold uppercase tracking-widest hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all">
                                <HugeiconsIcon icon={FileExportIcon} className="w-3.5 h-3.5" strokeWidth={2} /> CSV
                            </button>
                            <button onClick={generatePDF} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all">
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
                        <div className="flex bg-white dark:bg-[#020611] p-1 rounded-md border border-slate-200 dark:border-white/10">
                            {(['all', 'reserva', 'torneo', 'pending'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`flex-1 lg:flex-none px-5 py-2 text-[10px] font-bold uppercase rounded-md transition-all ${
                                        filterType === type
                                            ? type === 'pending'
                                                ? 'bg-amber-500 text-white dark:bg-amber-500 dark:text-slate-950'
                                                : 'bg-slate-900 text-white dark:bg-[#00df82] dark:text-black'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                                    }`}
                                >
                                    {type === 'all' ? 'Ver Todo' : type === 'reserva' ? 'Reservas' : type === 'torneo' ? 'Torneos' : 'Pendientes'}
                                </button>
                            ))}
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
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

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/30 dark:bg-white/1">
                                <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recinto</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deporte</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cancha</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pago</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Monto</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-20 text-center text-[10px] font-bold text-slate-400 uppercase animate-pulse">Cargando registros...</td>
                                </tr>
                            ) : visibleTransactions.length > 0 ? (
                                visibleTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors group text-[11px]">
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 dark:text-white">
                                                    {t.date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-mono">{t.date.toLocaleDateString('es-CL', { year: 'numeric' })}</span>
                                                {t.timeRange && <span className="text-[9px] text-slate-400 font-mono mt-0.5">{t.timeRange}</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-bold text-slate-900 dark:text-white uppercase truncate block max-w-[140px]">
                                                {t.clientName}
                                            </span>
                                            {t.clientPhone && <p className="text-[9px] text-slate-400 font-mono">{t.clientPhone}</p>}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-slate-500 dark:text-slate-300 uppercase truncate block max-w-[110px]">
                                                {t.venueName}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border w-fit ${
                                                t.type === 'reserva'
                                                    ? 'bg-blue-500/5 text-blue-500 border-blue-500/10'
                                                    : 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10'
                                            }`}>
                                                {t.type === 'reserva' ? 'Reserva' : 'Torneo'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-slate-600 dark:text-slate-300 uppercase font-bold truncate block max-w-[100px]">
                                                {t.sport}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-slate-500 dark:text-slate-400 uppercase truncate block max-w-[130px]">
                                                {t.courtName}
                                            </span>
                                            {t.duration > 0 && <p className="text-[9px] text-slate-400 font-mono">{t.duration}h</p>}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${paymentMethodTone(t.paymentMethod)}`}>
                                                {paymentMethodLabel(t.paymentMethod)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <span className="font-bold text-slate-900 dark:text-white font-mono block whitespace-nowrap">
                                                {formatCLP(t.amount)}
                                            </span>
                                            {t.paymentStatus === 'partial' && t.remainingBalance > 0 && (
                                                <span className="text-[9px] font-bold text-amber-500 font-mono uppercase whitespace-nowrap">Queda {formatCLP(t.remainingBalance)}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-center">
                                                {(() => {
                                                    const ps = (t.paymentStatus || 'pending').toLowerCase();
                                                    if (t.type === 'torneo' || ps === 'paid') {
                                                        return <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-bold uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/10"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Pagado</div>;
                                                    } else if (ps === 'partial') {
                                                        return <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-bold uppercase text-sky-500 bg-sky-500/10 border border-sky-500/10"><div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>Parcial</div>;
                                                    } else if (ps === 'refunded') {
                                                        return <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-bold uppercase text-rose-500 bg-rose-500/10 border border-rose-500/10"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>Reembolsado</div>;
                                                    } else if (ps === 'no-show') {
                                                        return <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-bold uppercase text-red-500 bg-red-500/10 border border-red-500/10"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>No-Show</div>;
                                                    } else {
                                                        return <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-bold uppercase text-amber-500 bg-amber-500/10 border border-amber-500/10"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>Pendiente</div>;
                                                    }
                                                })()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9}>
                                        <div className="py-24 text-center space-y-3">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-md flex items-center justify-center mx-auto text-slate-300 border border-slate-200 dark:border-white/10">
                                                <HugeiconsIcon icon={Cash01Icon} className="w-8 h-8" strokeWidth={1.4} />
                                            </div>
                                            <p className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Sin movimientos en este periodo</p>
                                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Prueba con otro mes o recinto</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredTransactions.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total del listado ({visibleTransactions.length})</p>
                        <p className="text-[10px] font-black font-mono text-emerald-600 dark:text-[#00df82]">{formatCLP(sumVisible)}</p>
                    </div>
                )}

                {filteredTransactions.length > rowLimit && (
                    <button
                        onClick={() => setRowLimit(r => r + 20)}
                        className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-[#00df82] hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors border-t border-slate-100 dark:border-white/5"
                    >
                        Mostrar más ({filteredTransactions.length - rowLimit} restantes)
                    </button>
                )}
            </PanelGlass>
        </div>
    );
}