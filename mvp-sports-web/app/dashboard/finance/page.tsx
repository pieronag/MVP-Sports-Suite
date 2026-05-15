"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { 
    collection, query, where, getDocs, orderBy, Timestamp, onSnapshot, doc, getDoc 
} from 'firebase/firestore';
import { 
    CurrencyDollarIcon, 
    ArrowPathIcon, 
    FunnelIcon,
    MagnifyingGlassIcon,
    TrophyIcon,
    CalendarDaysIcon,
    BanknotesIcon,
    ArrowDownTrayIcon,
    CheckCircleIcon,
    ClockIcon,
    ChartBarIcon,
    IdentificationIcon,
    ChevronDownIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import { PanelGlass, TarjetaKpi, BotonAccion } from '@/components/ui/DashboardWidgets';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- INTERFACES ---
interface Transaction {
    id: string;
    type: 'reserva' | 'torneo';
    amount: number;
    date: Date;
    clientName: string;
    details: string;
    status: string;
    venueName: string;
    paymentStatus: string;
}

interface Venue {
    id: string;
    name: string;
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

export default function FinancePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [myVenues, setMyVenues] = useState<Venue[]>([]);
    const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filterType, setFilterType] = useState<'all' | 'reserva' | 'torneo' | 'pending'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filtro por mes
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [stats, setStats] = useState({
        totalRevenue: 0,
        reservaRevenue: 0,
        torneoRevenue: 0,
        pendingRevenue: 0
    });

    // 1. Cargar recintos del dueño
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, "tenants"), where("ownerId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, name: d.data().name } as Venue));
            setMyVenues(list);
        });
        return () => unsubscribe();
    }, [user]);

    // 2. Cargar transacciones
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
                return {
                    id: doc.id,
                    type: 'reserva',
                    amount: Number(data.totalPrice || data.price || 0),
                    date: data.date?.toDate() || new Date(),
                    clientName: data.clientName || 'Cliente Externo',
                    details: `${data.courtName || 'Cancha'} - ${data.startTime || '--:--'}`,
                    status: data.status,
                    venueName: myVenues.find(v => v.id === data.tenantId)?.name || 'Recinto',
                    paymentStatus: data.paymentStatus || 'pending'
                };
            });

            // Filtrar en cliente
            const bookingsList = allBookings.filter(b => 
                b.date.getMonth() === selectedMonth && 
                b.date.getFullYear() === selectedYear
            );

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
                            type: 'torneo',
                            amount: Number(data.paidAmount || 0),
                            date: data.createdAt?.toDate() || new Date(),
                            clientName: data.teamName || data.userName || 'Equipo',
                            details: `Torneo: ${tInfo?.name || 'Copa MVP'}`,
                            status: data.status,
                            venueName: myVenues.find(v => v.id === tInfo?.tenantId)?.name || 'Recinto',
                            paymentStatus: 'paid'
                        } as Transaction;
                    }).filter(r => 
                        r.date.getMonth() === selectedMonth && 
                        r.date.getFullYear() === selectedYear
                    );
                    tournamentRegs = [...tournamentRegs, ...regs];
                }
            }

            const consolidated = [...bookingsList, ...tournamentRegs].sort((a, b) => b.date.getTime() - a.date.getTime());
            setTransactions(consolidated);

            const s = consolidated.reduce((acc, curr) => {
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
            
            setStats(s);
            setLoading(false);
        });

        return () => unsubBookings();
    }, [user, myVenues, selectedVenueId, selectedMonth, selectedYear]);

    const filteredTransactions = transactions.filter(t => {
        const matchesType = filterType === 'all' || t.type === filterType || 
            (filterType === 'pending' && t.paymentStatus !== 'paid' && t.type !== 'torneo');
        const matchesSearch = t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             t.details.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const generatePDF = () => {
        const doc = new jsPDF();
        const venueName = selectedVenueId === 'all' ? 'Todos los Recintos' : myVenues.find(v => v.id === selectedVenueId)?.name || 'Recinto';
        const reportMonth = `${MONTHS[selectedMonth]} ${selectedYear}`;

        // HEADER VERDE ESMERALDA MVP SPORTS STYLE
        doc.setFillColor(16, 185, 129); 
        doc.rect(0, 0, 210, 45, 'F');
        
        // LOGO OFICIAL CON ZOOM (SIMULADO)
        doc.setFillColor(255, 255, 255);
        doc.circle(0, 22.5, 45, 'F'); 
        try {
            doc.addImage('/Logo.png', 'PNG', -15, -5, 60, 60);
        } catch (e) {
            doc.setTextColor(16, 185, 129);
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

        // RESUMEN KPI
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

        // TABLA DETALLADA CON CLIENTE, DEPORTE Y CANCHA
        const tableData = filteredTransactions.map(t => {
            const sport = t.type === 'torneo' ? 'TORNEO' : (t.details.split('-')[0].trim() || 'FÚTBOL');
            const court = t.type === 'torneo' ? 'VARIAS' : (t.details.split('-')[1]?.trim() || 'PISTA');
            
            return [
                t.date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                t.clientName.toUpperCase(),
                `${sport.toUpperCase()} - ${court.toUpperCase()}`,
                formatCLP(t.amount),
                (t.paymentStatus === 'paid' || t.type === 'torneo') ? 'PAGADO' : 'PENDIENTE'
            ];
        });

        autoTable(doc, {
            startY: 95,
            head: [['FECHA', 'CLIENTE / EQUIPO', 'DEPORTE - CANCHA', 'MONTO', 'ESTADO']],
            body: tableData,
            styles: { fontSize: 8, font: 'helvetica', cellPadding: 3 },
            headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [241, 245, 249] },
        });

        doc.save(`Reporte_Finance_MVP_${venueName}_${reportMonth}.pdf`);
    };

    return (
        <div className="w-full space-y-5 pb-10 text-left relative">
            {/* CABECERA COMPACTA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
                            Resumen de ingresos y pagos
                        </p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                        Control <span className="text-emerald-500 dark:text-[#4ADE80]">Financiero</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#0B0F19] p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-lg">
                    {/* Selectores */}
                    <div className="flex items-center gap-2 px-3 border-r border-slate-100 dark:border-white/5">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-transparent text-[11px] font-bold uppercase outline-none text-slate-700 dark:text-white cursor-pointer"
                        >
                            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-transparent text-[11px] font-bold uppercase outline-none text-slate-700 dark:text-white cursor-pointer"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="relative group">
                        <select
                            value={selectedVenueId}
                            onChange={(e) => setSelectedVenueId(e.target.value)}
                            className="bg-transparent border-none rounded-lg px-2 py-1 text-[11px] font-bold outline-none text-slate-700 dark:text-white uppercase cursor-pointer"
                        >
                            <option value="all">TODOS LOS RECINTOS</option>
                            {myVenues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                    
                    <BotonAccion 
                        icon={<DocumentTextIcon />} 
                        etiqueta="REPORTE PDF" 
                        onClick={generatePDF}
                    />
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <TarjetaKpi 
                    label={`INGRESOS ${MONTHS[selectedMonth].toUpperCase()}`}
                    value={formatCLP(stats.totalRevenue)} 
                    sub="Monto total pagado"
                    icon={<BanknotesIcon />}
                    brillo
                />
                <TarjetaKpi 
                    label="RESERVAS CANCHAS" 
                    value={formatCLP(stats.reservaRevenue)} 
                    sub="Arriendos normales"
                    icon={<CalendarDaysIcon />}
                />
                <TarjetaKpi 
                    label="INSCRIPCIONES" 
                    value={formatCLP(stats.torneoRevenue)} 
                    sub="Torneos y ligas"
                    icon={<TrophyIcon />}
                />
                <TarjetaKpi 
                    label="POR COBRAR" 
                    value={formatCLP(stats.pendingRevenue)} 
                    sub="Pagos pendientes"
                    icon={<ClockIcon />}
                />
            </div>

            {/* TABLA ADN SIMPLIFICADA */}
            <PanelGlass className="border-none shadow-xl dark:shadow-none p-0 overflow-hidden">
                <div className="p-6 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div className="flex bg-white dark:bg-[#020611] p-1 rounded-lg border border-slate-200 dark:border-white/10 w-full lg:w-auto">
                        {(['all', 'reserva', 'torneo', 'pending'] as const).map((type) => (
                            <button 
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`flex-1 lg:flex-none px-5 py-2 text-[10px] font-bold uppercase rounded-md transition-all ${
                                    filterType === type 
                                    ? type === 'pending' 
                                        ? 'bg-amber-500 text-white dark:bg-amber-500 dark:text-slate-950'
                                        : 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950' 
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                                }`}
                            >
                                {type === 'all' ? 'Ver Todo' : type === 'reserva' ? 'Reservas' : type === 'torneo' ? 'Torneos' : 'Pendientes'}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full lg:w-80">
                        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text"
                            placeholder="BUSCAR CLIENTE O DETALLE..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-[#020611] border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-[11px] font-bold outline-none focus:ring-1 focus:ring-emerald-500/30 uppercase tracking-tight"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/30 dark:bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detalle</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Monto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-[10px] font-bold text-slate-400 uppercase">Cargando registros...</td>
                                </tr>
                            ) : filteredTransactions.length > 0 ? (
                                filteredTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group text-[11px]">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 dark:text-white">
                                                    {t.date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-mono">{t.date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-900 dark:text-white uppercase truncate block max-w-[150px]">
                                                {t.clientName}
                                            </span>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{t.venueName}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                                t.type === 'reserva' 
                                                ? 'bg-blue-500/5 text-blue-500 border-blue-500/10' 
                                                : 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10'
                                            }`}>
                                                {t.type === 'reserva' ? 'Cancha' : 'Torneo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-500 dark:text-slate-400 uppercase truncate block max-w-[200px]">
                                                {t.details}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-slate-900 dark:text-white font-mono">
                                                {formatCLP(t.amount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold uppercase ${
                                                    t.paymentStatus === 'paid' || t.type === 'torneo'
                                                    ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/10'
                                                    : 'text-amber-500 bg-amber-500/10 border border-amber-500/10'
                                                }`}>
                                                    {(t.paymentStatus === 'paid' || t.type === 'torneo') ? 'Pagado' : 'Pendiente'}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center text-[10px] font-bold text-slate-400 uppercase">Sin movimientos en este periodo</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </PanelGlass>
        </div>
    );
}
