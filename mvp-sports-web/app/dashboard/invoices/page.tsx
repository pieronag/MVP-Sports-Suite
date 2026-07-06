"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
    MagnifyingGlassIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ClockIcon,
    PrinterIcon,
    EnvelopeIcon,
    CurrencyDollarIcon,
    CalendarDaysIcon,
    TrashIcon,
    ArrowPathRoundedSquareIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import { collection, getDocs, query, orderBy, where, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';

const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount);
};

interface Invoice {
    id: string;
    tenantId: string;
    tenant: string;
    owner: string;
    ownerEmail: string;
    rawDate: string; 
    issueDate: string; 
    dueDate: string;   
    details: string;
    amount: number;
    status: string;
    breakdown?: any;
}

export default function Page() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('Todas');
    const [searchTerm, setSearchTerm] = useState('');
    const [globalSettings, setGlobalSettings] = useState<any>(null);

    const getPreviousMonth = () => {
        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };
    const [selectedMonth, setSelectedMonth] = useState(getPreviousMonth());
    const [isGenerating, setIsGenerating] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'alert' | 'confirm';
        onConfirm?: () => void;
    }>({ isOpen: false, title: '', message: '', type: 'alert' });

    const [emailModal, setEmailModal] = useState<{
        isOpen: boolean;
        invoice: Invoice | null;
        email: string;
    }>({ isOpen: false, invoice: null, email: '' });

    const showAlert = (title: string, message: string) => {
        setModalConfig({ isOpen: true, title, message, type: 'alert' });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setModalConfig({ isOpen: true, title, message, type: 'confirm', onConfirm });
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

            // Fetch Bookings for PDF/Audit - Only Paid Transactions
            const qBook = query(collection(db, "bookings"), where("paymentStatus", "==", "paid"));
            const bookSnap = await getDocs(qBook);
            setBookings(bookSnap.docs.map(d => ({ ...d.data(), id: d.id })));
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [selectedMonth]);

    const handleGenerateBulk = async () => {
        setIsGenerating(true);
        setShowConfirmModal(false);
        try {
            const settingsSnap = await getDoc(doc(db, "settings", "global"));
            const settingsData = settingsSnap.exists() ? settingsSnap.data() : null;
            const globalPlans = settingsData?.plans || [];
            const globalCommissionRate = settingsData?.commissionRate || 8;
            
            const tenantsSnap = await getDocs(collection(db, "tenants"));
            const tenants = tenantsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
            
            // FILTRAR ESTRICTAMENTE POR PAYMENTSTATUS === 'PAID'
            const qBookings = query(collection(db, "bookings"), where("paymentStatus", "==", "paid"));
            const bookingsSnap = await getDocs(qBookings);
            const allBookings = bookingsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
            
            const [selYear, selMonth] = selectedMonth.split('-').map(Number);
            const monthlyBookings = allBookings.filter(b => {
                const bDate = (b as any).date?.toDate ? (b as any).date.toDate() : ((b as any).date?.seconds ? new Date((b as any).date.seconds * 1000) : null);
                if (!bDate) return false;
                return bDate.getFullYear() === selYear && (bDate.getMonth() + 1) === selMonth;
            });

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
                const planConfig = globalPlans.find((p: any) => p.id.toLowerCase() === (t.planId || t.plan || 'inicial').toLowerCase());
                const commRate = planConfig ? (planConfig.commission ?? 5) : globalCommissionRate;
                const planCost = planConfig ? (planConfig.price ?? 0) : (Number(t.planPrice || 0));
                
                const tBookings = monthlyBookings.filter(b => (b as any).tenantId === t.id);
                const revenue = tBookings.reduce((acc, curr) => acc + (Number((curr as any).totalPrice || 0)), 0);
                const commTotal = Math.round(revenue * (commRate / 100));
                const total = commTotal + planCost;

                if (total <= 0) continue;

                await addDoc(collection(db, "invoices"), {
                    tenantId: t.id, tenantName: t.name, ownerName: t.ownerName || "Sin Dueño",
                    ownerEmail: t.ownerEmail || "", amount: total, status: "Pendiente",
                    rawDate: selectedMonth, issueDate: serverTimestamp(), dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
                    details: `Liquidación MVP - ${selectedMonth} (Solo Reservas Pagadas)`,
                    breakdown: { planName: planConfig?.name || "Base", planCost, commissionRate: commRate, commissionTotal: commTotal, totalBookings: tBookings.length, totalRevenue: revenue }
                });
            }
            showAlert("Completado", "Generación finalizada considerando solo transacciones pagadas.");
            fetchData();
        } catch (error) { showAlert("Error", "Error en el proceso."); } finally { setIsGenerating(false); }
    };

    const handleToggleStatus = async (inv: Invoice) => {
        const newStatus = inv.status === "Pagada" ? "Pendiente" : "Pagada";
        showConfirm("Actualizar Estado", `¿Confirmas el cambio de estado a ${newStatus.toUpperCase()}?`, async () => {
            try {
                await updateDoc(doc(db, "invoices", inv.id), { status: newStatus });
                fetchData();
            } catch (error) { showAlert("Error", "No se pudo actualizar el estado."); }
        });
    };

    const handleDeleteInvoice = async (id: string) => {
        showConfirm("Eliminar", "¿Estás seguro de eliminar esta liquidación? Esta acción es irreversible.", async () => {
            try {
                await deleteDoc(doc(db, "invoices", id));
                fetchData();
            } catch (error) { showAlert("Error", "No se pudo eliminar la liquidación."); }
        });
    };

    const handleDownload = async (inv: Invoice) => {
        const docPDF = new jsPDF();
        const b = inv.breakdown || {};
        const corp = globalSettings?.corporateData || {
            razonSocial: 'ORION TECHNOLOGY SpA',
            rut: '76.123.456-7',
            direccion: 'Centenario 611',
            emailFacturacion: 'contacto@oriontechnology.cl',
            giro: 'Desarrollo de Software'
        };
        
        // HEADER VERDE ESMERALDA
        docPDF.setFillColor(16, 185, 129); 
        docPDF.rect(0, 0, 210, 45, 'F');
        
        // LOGO OFICIAL CON ZOOM Y RECORTE (70%)
        try {
            // Intentamos cargar el logo directamente (jsPDF soporta URLs en browser en versiones modernas)
            // O usamos el círculo blanco de fondo para el recorte
            docPDF.setFillColor(255, 255, 255);
            docPDF.circle(0, 22.5, 45, 'F'); 
            
            // Posicionar el logo oficial con zoom (simulado con addImage y dimensiones grandes)
            docPDF.addImage('/Logo.png', 'PNG', -15, -5, 60, 60);
        } catch (e) {
            // Fallback si falla la carga de imagen
            docPDF.setTextColor(16, 185, 129);
            docPDF.setFontSize(40);
            docPDF.setFont('helvetica', 'bold');
            docPDF.text('M', 8, 28);
        }
        
        docPDF.setTextColor(255, 255, 255);
        docPDF.setFontSize(26);
        docPDF.setFont('helvetica', 'bold');
        docPDF.text('MVP', 55, 20);
        docPDF.setFontSize(26);
        docPDF.text('SPORTS', 83, 20);
        
        docPDF.setFontSize(8);
        docPDF.setFont('helvetica', 'normal');
        docPDF.text('LIQUIDACIÓN DE SERVICIOS PROFESIONALES', 55, 28);
        docPDF.text(`${corp.razonSocial.toUpperCase()}`, 55, 33);

        docPDF.setFontSize(10);
        docPDF.text(`LIQUIDACIÓN N°: ${inv.id.slice(0,8).toUpperCase()}`, 150, 20);
        docPDF.text(`FECHA: ${inv.issueDate}`, 150, 28);

        // EMISOR Y RECEPTOR
        docPDF.setTextColor(0, 0, 0);
        docPDF.setFontSize(9);
        docPDF.setFont('helvetica', 'bold');
        docPDF.text('EMISOR (DATOS DE FACTURACIÓN):', 15, 60);
        docPDF.setFont('helvetica', 'normal');
        docPDF.text(corp.razonSocial, 15, 65);
        docPDF.text(`RUT: ${corp.rut}`, 15, 70);
        docPDF.text(`Giro: ${corp.giro}`, 15, 75);
        docPDF.text(`Dirección: ${corp.direccion}`, 15, 80);
        docPDF.text(`Email: ${corp.emailFacturacion}`, 15, 85);

        docPDF.setFont('helvetica', 'bold');
        docPDF.text('CLIENTE / RECINTO:', 110, 60);
        docPDF.setFont('helvetica', 'normal');
        docPDF.text(inv.tenant.toUpperCase(), 110, 65);
        docPDF.text(`Representante: ${inv.owner.toUpperCase()}`, 110, 70);
        docPDF.text(`Email: ${inv.ownerEmail}`, 110, 75);
        docPDF.text(`Plan: ${b.planName || 'Base'} (${b.commissionRate || 0}% Com.)`, 110, 80);
        docPDF.text(`Periodo: ${inv.rawDate}`, 110, 85);

        // 3. TABLA SERVICIOS
        autoTable(docPDF, {
            startY: 95,
            head: [['ÍTEM', 'DESCRIPCIÓN', 'CANT', 'UNITARIO', 'TOTAL']],
            body: [
                ['01', `Suscripción Mensual MVP - Plan ${b.planName || 'Base'}`, '1', formatCLP(b.planCost || 0), formatCLP(b.planCost || 0)],
                ['02', `Comisiones por Reservas Realizadas (${b.commissionRate || 0}%)`, `${b.totalBookings || 0} Trans`, '-', formatCLP(b.commissionTotal || 0)],
            ],
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 4 }
        });

        // 4. HISTORIAL OPERATIVO Y COMISIONES
        const currentY = (docPDF as any).lastAutoTable.finalY + 10;
        docPDF.setFont('helvetica', 'bold');
        docPDF.text('HISTORIAL OPERATIVO Y COMISIONES:', 15, currentY);
        
        const [selYear, selMonth] = inv.rawDate.split('-').map(Number);
        const paidBookings = bookings.filter(book => {
            const bDate = book.date?.toDate ? book.date.toDate() : (book.date?.seconds ? new Date(book.date.seconds * 1000) : null);
            return book.tenantId === inv.tenantId && 
                   bDate && bDate.getFullYear() === selYear && (bDate.getMonth() + 1) === selMonth &&
                   book.paymentStatus === 'paid';
        });

        const commRate = b.commissionRate || 0;
        const dailyRows = paidBookings.map(book => {
            const bDate = book.date?.toDate ? book.date.toDate() : (book.date?.seconds ? new Date(book.date.seconds * 1000) : null);
            const price = Number(book.totalPrice || 0);
            const comm = Math.round(price * (commRate / 100));
            return [
                bDate?.toLocaleDateString('es-CL') || '-',
                book.customerName?.toUpperCase() || 'JUGADOR APP',
                `${book.sport?.toUpperCase() || 'FÚTBOL'} - ${book.courtName?.toUpperCase() || 'PISTA'}`,
                formatCLP(price),
                `${commRate}%`,
                formatCLP(comm)
            ];
        });

        autoTable(docPDF, {
            startY: currentY + 5,
            head: [['FECHA', 'CLIENTE', 'DEPORTE / CANCHA', 'MONTO', '% COM.', 'COMISIÓN']],
            body: dailyRows.length > 0 ? dailyRows : [['-', '-', '-', '-', '-', '-']],
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0] },
            columnStyles: { 5: { fontStyle: 'bold' } }
        });

        // 5. TOTALES DESGLOSADOS (NETO E IVA POR SEPARADO)
        const finalTableY = (docPDF as any).lastAutoTable.finalY + 10;
        
        const planTotal = b.planCost || 0;
        const planNeto = Math.round(planTotal / 1.19);
        const planIva = planTotal - planNeto;

        const commTotal = b.commissionTotal || 0;
        const commNeto = Math.round(commTotal / 1.19);
        const commIva = commTotal - commNeto;

        const grandTotal = planTotal + commTotal;

        docPDF.setFontSize(8);
        docPDF.setFont('helvetica', 'bold');
        docPDF.text('DESGLOSE TRIBUTARIO:', 135, finalTableY);
        
        docPDF.setFont('helvetica', 'normal');
        docPDF.text('Neto Plan / Suscripción:', 135, finalTableY + 6);
        docPDF.text(formatCLP(planNeto), 195, finalTableY + 6, { align: 'right' });
        docPDF.text('IVA Plan (19%):', 135, finalTableY + 11);
        docPDF.text(formatCLP(planIva), 195, finalTableY + 11, { align: 'right' });

        docPDF.setDrawColor(200, 200, 200);
        docPDF.line(135, finalTableY + 14, 195, finalTableY + 14);

        docPDF.text('Neto Comisiones:', 135, finalTableY + 20);
        docPDF.text(formatCLP(commNeto), 195, finalTableY + 20, { align: 'right' });
        docPDF.text('IVA Comisiones (19%):', 135, finalTableY + 25);
        docPDF.text(formatCLP(commIva), 195, finalTableY + 25, { align: 'right' });

        docPDF.setFillColor(16, 185, 129); // Emerald Green
        docPDF.rect(130, finalTableY + 30, 70, 12, 'F');
        docPDF.setTextColor(255, 255, 255);
        docPDF.setFont('helvetica', 'bold');
        docPDF.setFontSize(10);
        docPDF.text('TOTAL A PAGAR:', 135, finalTableY + 38);
        docPDF.text(formatCLP(grandTotal), 195, finalTableY + 38, { align: 'right' });

        // Footer
        docPDF.setTextColor(150, 150, 150);
        docPDF.setFontSize(7);
        docPDF.text('Documento generado por MVP Sports Suite - Liquidación de Servicios Electrónica.', 105, 285, { align: 'center' });
        docPDF.save(`Liquidacion_MVP_${inv.tenant.replace(/\s+/g, '_')}_${inv.rawDate}.pdf`);
    };

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            if (selectedMonth && inv.rawDate !== selectedMonth) return false;
            if (filterStatus === 'Pendientes' && (inv.status !== 'Pendiente' && inv.status !== 'Vencida')) return false;
            if (filterStatus === 'Pagadas' && inv.status !== 'Pagada') return false;
            if (searchTerm) {
                const lower = searchTerm.toLowerCase();
                return (inv.tenant.toLowerCase().includes(lower) || inv.owner.toLowerCase().includes(lower));
            }
            return true;
        });
    }, [invoices, filterStatus, searchTerm, selectedMonth]);

    const totalInvoiced = filteredInvoices.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPending = filteredInvoices.filter(i => i.status !== 'Pagada').reduce((acc, curr) => acc + curr.amount, 0);
    const payRate = filteredInvoices.length > 0 ? Math.round((filteredInvoices.filter(i => i.status === 'Pagada').length / filteredInvoices.length) * 100) : 0;

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {/* HEADER SIMPLIFICADO SIN ANALITICAS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">Control Financiero MVP</p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Gestión de <span className="text-emerald-500 dark:text-emerald-400">Facturación</span></h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => showAlert("Envío Masivo", "Enviando recordatorios a recintos con saldos pendientes...")} className="px-6 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-[10px] font-black uppercase rounded-[14px] border border-slate-200 dark:border-white/10 flex items-center gap-2 active:scale-95 transition-all"><EnvelopeIcon className="w-4 h-4 text-emerald-500" /> Envío Masivo</button>
                    <button onClick={() => setShowConfirmModal(true)} disabled={isGenerating} className="px-6 py-2.5 bg-slate-950 dark:bg-emerald-600 text-white dark:text-slate-950 text-[10px] font-black uppercase rounded-[14px] shadow-xl flex items-center gap-2 active:scale-95 transition-all"><CurrencyDollarIcon className="w-4 h-4" /> Generar Masivo</button>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <TarjetaKpi titulo="TOTAL FACTURADO" valor={formatCLP(totalInvoiced)} sub="SOLO PAGOS ACEPTADOS" icono={<DocumentTextIcon />} brillo />
                <TarjetaKpi titulo="PENDIENTE" valor={formatCLP(totalPending)} sub="POR RECAUDAR" icono={<ClockIcon />} />
                <TarjetaKpi titulo="TASA PAGO" valor={`${payRate}%`} sub="EFICIENCIA" icono={<CheckCircleIcon />} />
                <TarjetaKpi titulo="FACTURAS" valor={filteredInvoices.length.toString()} sub="PERIODO SELECCIONADO" icono={<InformationCircleIcon />} />
            </div>

            {/* TOOLS BAR */}
            <PanelGlass className="flex flex-col md:flex-row gap-4 justify-between items-center py-3 px-4">
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <input type="text" placeholder="BUSCAR POR RECINTO O DUEÑO..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 rounded-[14px] text-[10px] font-black uppercase outline-none text-black dark:text-white transition-all shadow-sm" />
                    </div>
                    <div className="relative">
                        <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 rounded-[14px] text-[10px] font-black uppercase outline-none text-black dark:text-white transition-all cursor-pointer" />
                    </div>
                </div>
                <div className="flex bg-slate-50 dark:bg-white/5 p-1 rounded-[14px] border border-slate-100 dark:border-white/10">
                    {["Todas", "Pendientes", "Pagadas"].map((f) => (
                        <button key={f} onClick={() => setFilterStatus(f)} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-[14px] transition-all ${filterStatus === f ? "bg-white dark:bg-emerald-500 text-black shadow-sm" : "text-slate-400 hover:text-black dark:hover:text-white"}`}>{f.toUpperCase()}</button>
                    ))}
                </div>
            </PanelGlass>

            {/* LISTADO DE FACTURAS */}
            <div className="rounded-[14px] border border-slate-100 dark:border-white/5 overflow-x-auto bg-white dark:bg-[#0B0F19] shadow-xl">
                <table className="w-full text-left min-w-[1000px]">
                    <thead className="bg-slate-50/50 dark:bg-white/[0.02] text-black dark:text-slate-400 font-black uppercase text-[8px] tracking-[0.2em] border-b border-slate-100 dark:border-white/5">
                        <tr>
                            <th className="px-6 py-4">Centro Operativo</th>
                            <th className="px-6 py-4">Administración</th>
                            <th className="px-6 py-4 text-center">Periodo</th>
                            <th className="px-6 py-4">Plan / Detalle</th>
                            <th className="px-6 py-4 text-right">Monto</th>
                            <th className="px-6 py-4 text-right">Estado / Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5 text-[11px]">
                        {filteredInvoices.map((inv) => (
                            <tr key={inv.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <p className="font-black text-black dark:text-white uppercase leading-none mb-1">{inv.tenant}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter italic">ID: {inv.id.slice(0, 8)}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <p className="font-black text-black dark:text-white uppercase text-[9px]">{inv.owner}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{inv.ownerEmail}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="inline-flex flex-col items-center">
                                        <p className="text-[10px] font-black text-black dark:text-white uppercase">{inv.rawDate}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">VENCE: {inv.dueDate}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-[14px] text-[8px] font-black text-slate-500 uppercase border border-slate-200 dark:border-white/10 w-fit">PLAN {inv.breakdown?.planName?.toUpperCase() || 'BASE'}</span>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter line-clamp-1 italic">{inv.details}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="font-black text-black dark:text-white text-sm">{formatCLP(inv.amount)}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className={`px-2.5 py-1 rounded-[14px] text-[9px] font-black uppercase border shadow-sm transition-all ${inv.status === 'Pagada' ? 'bg-emerald-50 border-emerald-500/30 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 border-rose-500/30 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>{inv.status.toUpperCase()}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleDownload(inv)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-black dark:hover:text-white rounded-[14px] transition-all"><PrinterIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDeleteInvoice(inv.id)} className="p-2 hover:bg-red-50 text-red-400 rounded-[14px] transition-all dark:hover:bg-red-500/10"><TrashIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleToggleStatus(inv)} title="Marcar como Pagada" className={`p-2 rounded-[14px] transition-all ${inv.status === 'Pagada' ? 'hover:bg-amber-50 text-amber-500 dark:hover:bg-amber-500/10' : 'hover:bg-emerald-50 text-emerald-500 dark:hover:bg-emerald-500/10'}`}>{inv.status === 'Pagada' ? <ArrowPathRoundedSquareIcon className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5" />}</button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL GENERACION MASIVA */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-[14px] p-8 border border-slate-200 dark:border-white/10 shadow-2xl text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 dark:from-white/[0.03] to-transparent pointer-events-none"></div>
                        <div className="relative z-10 w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-[14px] flex items-center justify-center mx-auto mb-6 border border-emerald-100 dark:border-emerald-500/20 shadow-xl shadow-emerald-500/10"><CurrencyDollarIcon className="w-10 h-10 text-emerald-600" /></div>
                        <h3 className="relative z-10 text-xl font-black uppercase text-black dark:text-white mb-2 tracking-tighter italic">Liquidación Masiva</h3>
                        <p className="relative z-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 leading-relaxed px-4">Se generarán las facturas considerando <strong>ÚNICAMENTE PAGOS ACEPTADOS</strong> para el periodo {selectedMonth}.</p>
                        <div className="relative z-10 flex gap-4">
                            <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-4 text-[9px] font-black uppercase rounded-[14px] bg-slate-100 dark:bg-white/5 text-slate-500">CANCELAR</button>
                            <button onClick={handleGenerateBulk} className="flex-1 py-4 text-[9px] font-black uppercase rounded-[14px] text-white bg-emerald-600 shadow-xl shadow-emerald-600/30 active:scale-95 transition-all">PROCEDER</button>
                        </div>
                    </div>
                </div>
            )}

            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-[14px] p-8 border border-slate-200 dark:border-white/10 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black uppercase text-black dark:text-white mb-2 tracking-tighter italic">{modalConfig.title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 leading-relaxed">{modalConfig.message}</p>
                        <button onClick={() => { modalConfig.onConfirm?.(); setModalConfig({ ...modalConfig, isOpen: false }); }} className="w-full py-4 text-[10px] font-black uppercase rounded-[14px] text-white bg-emerald-600 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">ENTENDIDO</button>
                    </div>
                </div>
            )}
        </div>
    );
}
