"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    TrashIcon,
    Mail01Icon,
    RotateCcwIcon,
    RefreshIcon,
    Alert02Icon,
    ChevronDownIcon,
    EyeIcon,
    Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { collection, getDocs, query, orderBy, where, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
// jsPDF (~400 KB) se carga solo al exportar
const loadPdf = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    return { jsPDF, autoTable };
};
import { TarjetaKpi, SectionCard } from '@/components/ui/DashboardWidgets';

const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount);
};

const ic = "w-6 h-6";

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
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'alert' | 'confirm';
        onConfirm?: () => void;
    }>({ isOpen: false, title: '', message: '', type: 'alert' });

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

            const qBook = query(collection(db, "bookings"), where("paymentStatus", "==", "paid"));
            const bookSnap = await getDocs(qBook);
            setBookings(bookSnap.docs.map(d => ({ ...d.data(), id: d.id })));
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
        setShowConfirmModal(false);
        try {
            const settingsSnap = await getDoc(doc(db, "settings", "global"));
            const settingsData = settingsSnap.exists() ? settingsSnap.data() : null;
            const globalPlans = settingsData?.plans || [];
            const globalCommissionRate = typeof settingsData?.commissionRate === 'number' ? settingsData.commissionRate : 8;

            const tenantsSnap = await getDocs(collection(db, "tenants"));
            const tenants = tenantsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

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
                const planConfig = globalPlans.find((p: any) => (p.id || '').toLowerCase() === (t.planId || t.plan || '').toLowerCase() || (p.name || '').toLowerCase() === (t.planId || t.plan || '').toLowerCase());
                const commRate = planConfig ? (planConfig.commission ?? globalCommissionRate) : globalCommissionRate;
                const planCost = planConfig ? Number(planConfig.price || 0) : 0;

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

const buildPdf = async (inv: Invoice) => {
        const { jsPDF, autoTable } = await loadPdf();
        const docPDF = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const b = inv.breakdown || {};
        const corp = globalSettings?.corporateData || {
            razonSocial: 'ORION TECHNOLOGY SpA',
            rut: '76.123.456-7',
            direccion: 'Centenario 611',
            emailFacturacion: 'contacto@oriontechnology.cl',
            giro: 'Desarrollo de Software',
            representante: 'Director General'
        };
        const supportEmail = globalSettings?.supportEmail || 'soporte@mvpsports.cl';
        const platformName = globalSettings?.platformName || 'MVP Sports Suite';
        const taxRate = globalSettings?.sii?.taxRate ?? 19;
        const monthName = (raw: string) => {
            const [y, m] = (raw || '2024-01').split('-').map(Number);
            const label = new Date(y || 2024, (m || 1) - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
            return label.charAt(0).toUpperCase() + label.slice(1);
        };

        // ============ DATOS DEL PERIODO ============
        const [selYear, selMonth] = inv.rawDate.split('-').map(Number);
        const paidBookings = bookings.filter(book => {
            const bDate = book.date?.toDate ? book.date.toDate() : (book.date?.seconds ? new Date(book.date.seconds * 1000) : null);
            return book.tenantId === inv.tenantId &&
                bDate && bDate.getFullYear() === selYear && (bDate.getMonth() + 1) === selMonth &&
                book.paymentStatus === 'paid';
        });
        const commRate = b.commissionRate || 0;
        const totalBookings = b.totalBookings || paidBookings.length || 0;
        const grossRevenue = b.totalRevenue || paidBookings.reduce((acc, bk) => acc + Number(bk.totalPrice || 0), 0);
        const sumComisiones = paidBookings.reduce((acc, bk) => acc + Math.round(Number(bk.totalPrice || 0) * (commRate / 100)), 0);
        const planTotal = b.planCost || 0;
        const commTotal = b.commissionTotal || sumComisiones;
        const grandTotal = planTotal + commTotal;
        const ivaFactor = taxRate / 100;
        const planNeto = Math.round(planTotal / (1 + ivaFactor));
        const planIva = planTotal - planNeto;
        const commNeto = Math.round(commTotal / (1 + ivaFactor));
        const commIva = commTotal - commNeto;
        const subTotal = planNeto + commNeto;
        const totalIva = planIva + commIva;

        // ============ ESTILO · FUENTE ÚNICA ============
        const f = (b: boolean) => docPDF.setFont('helvetica', b ? 'bold' : 'normal');
        const DARK: [number, number, number] = [15, 23, 42];
        const BODY: [number, number, number] = [51, 65, 85];
        const MUTE: [number, number, number] = [148, 163, 184];
        const GREEN: [number, number, number] = [0, 223, 130];
        const GREEN_D: [number, number, number] = [0, 150, 90];
        const AMBER: [number, number, number] = [217, 119, 6];
        const LINE: [number, number, number] = [226, 232, 240];
        const clp = (n: number) => formatCLP(n || 0);

        const fill = (c: [number, number, number]) => docPDF.setFillColor(c[0], c[1], c[2]);
        const stroke = (c: [number, number, number], w = 0.25) => { docPDF.setDrawColor(c[0], c[1], c[2]); docPDF.setLineWidth(w); };
        const hrule = (y: number, x0 = 18, x1 = 192, c: [number, number, number] = LINE, w = 0.25) => { stroke(c, w); docPDF.line(x0, y, x1, y); };
const section = (x: number, y: number, t: string) => {
            fill(GREEN);
            docPDF.circle(x + 1, y - 1.4, 1.2, 'F');
            f(true);
            docPDF.setFontSize(6.6);
            docPDF.setTextColor(DARK[0], DARK[1], DARK[2]);
            docPDF.text(t.toUpperCase(), x + 5, y, { charSpace: 0.4 });
        };
        const label = (x: number, y: number, t: string, c: [number, number, number] = MUTE) => {
            f(false);
            docPDF.setFontSize(5.6);
            docPDF.setTextColor(c[0], c[1], c[2]);
            docPDF.text(t.toUpperCase(), x, y, { charSpace: 0.3 });
        };
        const estadoColor = inv.status === 'Pagada' ? GREEN_D : AMBER;
        // estilos de tabla compartidos
const TH = { fillColor: [255, 255, 255] as [number, number, number], textColor: [148, 163, 184] as [number, number, number], fontStyle: 'bold' as const, fontSize: 5.6, lineWidth: 0.3, lineColor: [226, 232, 240] as [number, number, number] };
        const TD = { fontSize: 6.4, cellPadding: 2.6, textColor: [51, 65, 85] as [number, number, number], lineColor: [241, 245, 249] as [number, number, number], lineWidth: 0.15 };

        const metodoPago = (book: any): string => {
            const m = (book.paymentMethod || '').toLowerCase();
            const s = (book.source || '').toLowerCase();
            if (m === 'card' || m === 'webpay') return 'WEBPAY';
            if (m === 'oneclick') return 'ONECLICK';
            if (m === 'cash' || m === 'efectivo') return 'EFECTIVO';
            if (m === 'transfer' || m === 'transferencia') return 'TRANSFERENCIA';
            if (s === 'mobile_app') return 'ONLINE APP';
            if (s === 'manual' || s === 'web_dashboard') return 'MANUAL';
            return '—';
        };

        // ============ PÁGINA 1 · RESUMEN ============
        // header
        fill(GREEN);
        docPDF.rect(0, 0, 210, 2, 'F');
        fill(DARK);
        docPDF.rect(0, 2, 210, 40, 'F');
        fill(GREEN);
        docPDF.rect(0, 42, 210, 0.8, 'F');

        try {
            docPDF.addImage('/Logo.png', 'PNG', 15, 8, 30, 30);
        } catch (e) {
            f(true);
            docPDF.setFontSize(12);
            docPDF.setTextColor(GREEN_D[0], GREEN_D[1], GREEN_D[2]);
            docPDF.text('M', 25, 30);
        }
f(true);
        docPDF.setFontSize(16);
        const wMVP = docPDF.getTextWidth('MVP');
        docPDF.setTextColor(255, 255, 255);
        docPDF.text('MVP', 50, 19);
        docPDF.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
        docPDF.text('SPORTS', 50 + wMVP + 1.5, 19);
        f(false);
        docPDF.setFontSize(5.4);
        docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
        docPDF.text(platformName.toUpperCase(), 50, 23, { charSpace: 0.5 });
        f(true);
        docPDF.setFontSize(10);
        docPDF.setTextColor(255, 255, 255);
        docPDF.text('LIQUIDACIÓN DE SERVICIOS', 50, 30);
        f(false);
        docPDF.setFontSize(5);
        docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
        docPDF.text('DOCUMENTO DE COBRO · POST PAGO', 50, 33.5, { charSpace: 0.3 });

        // folio (alineado a la derecha)
        f(false);
        docPDF.setFontSize(5.6);
        docPDF.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
        docPDF.text('LIQUIDACIÓN N°', 195, 13, { align: 'right' });
        f(true);
        docPDF.setFontSize(14);
        docPDF.setTextColor(255, 255, 255);
        docPDF.text(inv.id.slice(0, 8).toUpperCase(), 195, 20, { align: 'right' });
        stroke(GREEN, 0.3);
        docPDF.line(145, 23, 195, 23);
        f(false);
        docPDF.setFontSize(5.6);
        docPDF.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
        docPDF.text('POST PAGO', 195, 28, { align: 'right' });
        docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
        docPDF.text('PERIODO ' + monthName(inv.rawDate), 195, 33, { align: 'right' });

        // ============ META (tabla) ============
        autoTable(docPDF, {
            startY: 48,
            head: [['FECHA DE EMISIÓN', 'FECHA DE VENCIMIENTO', 'PERIODO FACTURADO', 'ESTADO']],
            body: [[inv.issueDate, inv.dueDate, monthName(inv.rawDate), inv.status.toUpperCase()]],
            theme: 'plain',
            headStyles: TH,
            styles: TD,
            columnStyles: { 3: { fontStyle: 'bold', textColor: [estadoColor[0], estadoColor[1], estadoColor[2]] } }
        });

// ============ EMISOR (línea compacta) + DATOS DEL CLIENTE ============
        const emY = (docPDF as any).lastAutoTable.finalY + 10;
        f(false);
        docPDF.setFontSize(5.6);
        docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
        docPDF.text('EMISOR · ' + corp.razonSocial.toUpperCase() + ' · RUT ' + corp.rut, 18, emY);
        docPDF.text(corp.giro + ' · ' + corp.direccion + ' · ' + corp.emailFacturacion, 18, emY + 4);
        hrule(emY + 7);

        section(18, emY + 15, 'Datos del cliente');
        autoTable(docPDF, {
            startY: emY + 19,
            head: [['CAMPO', 'VALOR']],
            body: [
                ['Recinto', inv.tenant],
                ['Representante', inv.owner],
                ['Email', inv.ownerEmail || '—'],
                ['Plan contratado', b.planName || 'Base'],
                ['Comisión del plan', (commRate || 0) + '%'],
            ],
            theme: 'plain',
            headStyles: TH,
            styles: TD,
            columnStyles: {
                0: { fontStyle: 'bold', textColor: [100, 116, 139], cellPadding: 2.6 },
                1: { fontStyle: 'bold', textColor: [15, 23, 42] }
            }
        });

        // ============ INDICADORES (tabla) ============
        section(18, (docPDF as any).lastAutoTable.finalY + 10, 'Indicadores del periodo');
        autoTable(docPDF, {
            startY: (docPDF as any).lastAutoTable.finalY + 14,
            head: [['RESERVAS PAGADAS', 'INGRESO BRUTO', 'PLAN MENSUAL', 'COMISIÓN APLICADA']],
            body: [[String(totalBookings), clp(grossRevenue), clp(planTotal), clp(commTotal)]],
            theme: 'plain',
            headStyles: TH,
            styles: { ...TD, fontSize: 8.4, cellPadding: 3.4 },
            columnStyles: { 2: { fontStyle: 'bold', textColor: [0, 150, 90] }, 3: { fontStyle: 'bold', textColor: [0, 150, 90] } }
        });

        // ============ SERVICIOS (tabla) ============
        section(18, (docPDF as any).lastAutoTable.finalY + 10, 'Servicios del periodo');
        autoTable(docPDF, {
            startY: (docPDF as any).lastAutoTable.finalY + 14,
            head: [['ÍTEM', 'DESCRIPCIÓN', 'DETALLE', 'CANT', 'TOTAL']],
            body: [
                ['01', 'Suscripción mensual MVP', 'Plan ' + (b.planName || 'Base') + ' · costo fijo', '1', clp(planTotal)],
                ['02', 'Comisiones por reservas pagadas', (commRate || 0) + '% sobre ' + totalBookings + ' reservas', String(totalBookings), clp(commTotal)],
            ],
            theme: 'plain',
            headStyles: TH,
            styles: TD,
            columnStyles: {
                0: { fontStyle: 'bold', textColor: [0, 150, 90] },
                1: { fontStyle: 'bold', textColor: [15, 23, 42] },
                3: { halign: 'center' },
                4: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
            }
        });

        // ============ TOTALES ============
        const totY = (docPDF as any).lastAutoTable.finalY + 10;
        const tX = 112;
        const totRow = (y: number, l: string, v: string, c: [number, number, number] = BODY) => {
            f(false);
            docPDF.setFontSize(6.4);
            docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
            docPDF.text(l, tX, y);
            f(true);
            docPDF.setFontSize(7.2);
            docPDF.setTextColor(c[0], c[1], c[2]);
            docPDF.text(v, 192, y, { align: 'right' });
        };

        totRow(totY, 'Neto plan', clp(planNeto));
        totRow(totY + 5.5, 'IVA ' + taxRate + '% plan', clp(planIva));
        totRow(totY + 11, 'Neto comisiones', clp(commNeto));
        totRow(totY + 16.5, 'IVA ' + taxRate + '% comisiones', clp(commIva));
        hrule(totY + 20, tX, 192, DARK, 0.4);
        f(true);
        docPDF.setFontSize(7.6);
        docPDF.setTextColor(DARK[0], DARK[1], DARK[2]);
        docPDF.text('SUB TOTAL', tX, totY + 25);
        docPDF.text(clp(subTotal), 192, totY + 25, { align: 'right' });

fill(DARK);
        docPDF.roundedRect(tX, totY + 30, 80, 15, 5, 5, 'F');
f(true);
        docPDF.setFontSize(7.2);
        docPDF.setTextColor(255, 255, 255);
        docPDF.text('TOTAL A PAGAR', tX + 7, totY + 38);
        f(true);
        docPDF.setFontSize(11.5);
        docPDF.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
        docPDF.text(clp(grandTotal), tX + 73, totY + 38.5, { align: 'right' });

        // info de pago
        const payY = totY + 53;
        section(18, payY, 'Información de pago');
        f(false);
        docPDF.setFontSize(6.4);
        docPDF.setTextColor(BODY[0], BODY[1], BODY[2]);
        docPDF.text('Los fondos recaudados por reservas pagadas en línea ingresan directamente a la cuenta del recinto. Liquidación post-pago.', 18, payY + 5);
        docPDF.text('Plazo de pago de 5 a 10 días corridos desde la emisión. Ante dudas contacta a ' + supportEmail + '.', 18, payY + 9.5);

        // footer página 1
        const p1H = docPDF.internal.pageSize.getHeight();
        fill(DARK);
        docPDF.rect(0, p1H - 9, 210, 9, 'F');
        fill(GREEN);
        docPDF.rect(0, p1H - 9, 210, 0.8, 'F');
        f(false);
        docPDF.setFontSize(5.6);
        docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
        docPDF.text(corp.razonSocial + ' · RUT ' + corp.rut + ' · ' + corp.emailFacturacion, 10, p1H - 2.5);
        f(true);
        docPDF.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
        docPDF.text('01', 200, p1H - 2.5, { align: 'right' });

        // ============ PÁGINA 2+ · HISTORIAL COMPLETO ============
        docPDF.addPage();

        const dailyRows = paidBookings.map(book => {
            const bDate = book.date?.toDate ? book.date.toDate() : (book.date?.seconds ? new Date(book.date.seconds * 1000) : null);
            const price = Number(book.totalPrice || 0);
            const comm = Math.round(price * (commRate / 100));
            const timeRaw = book.startTime;
            const time = typeof timeRaw === 'string' && timeRaw.includes(':')
                ? timeRaw
                : bDate ? `${String(bDate.getHours()).padStart(2, '0')}:${String(bDate.getMinutes()).padStart(2, '0')}` : '--:--';
            const code = book.transactionId || book.bookingId || (book.id ? `#${book.id.slice(0, 5)}` : '—');
            return [
                `${bDate?.toLocaleDateString('es-CL') || '-'} ${time}`,
                code.toUpperCase().slice(0, 12),
                book.customerName?.toUpperCase() || 'JUGADOR APP',
                `${book.sport?.toUpperCase() || 'FÚTBOL'} / ${book.courtName?.toUpperCase() || 'PISTA'}`,
                metodoPago(book),
                clp(price),
                `${commRate}%`,
                clp(comm)
            ];
        });

        section(18, 24, 'Historial de reservas pagadas');
        label(23, 30, monthName(inv.rawDate) + ' · ' + inv.tenant.toUpperCase() + ' · ' + totalBookings + ' reserva(s)');
        hrule(34);

        autoTable(docPDF, {
            startY: 39,
            head: [['FECHA / HORA', 'CÓDIGO', 'CLIENTE', 'DEPORTE / CANCHA', 'MÉTODO', 'MONTO', '%', 'COMISIÓN']],
            body: dailyRows.length > 0 ? dailyRows : [['Sin reservas pagadas en el periodo', '-', '-', '-', '-', '-', '-', '-']],
            foot: dailyRows.length > 0 ? [['', '', 'TOTAL DEL MES', '', '', clp(grossRevenue), '', clp(sumComisiones)]] : undefined,
            theme: 'plain',
            headStyles: TH,
            footStyles: { fillColor: [15, 23, 42], textColor: [0, 223, 130], fontStyle: 'bold', fontSize: 6, lineWidth: 0 },
            styles: { fontSize: 5.8, cellPadding: 2, textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: 0.15 },
            columnStyles: {
                5: { halign: 'right' },
                6: { halign: 'center' },
                7: { halign: 'right', fontStyle: 'bold', textColor: [0, 150, 90] }
            },
            didDrawPage: (data) => {
                const pageH = docPDF.internal.pageSize.getHeight();
                fill(DARK);
                docPDF.rect(0, 0, 210, 7, 'F');
                fill(GREEN);
                docPDF.rect(0, 7, 210, 0.6, 'F');
                f(true);
                docPDF.setFontSize(6.5);
                docPDF.setTextColor(255, 255, 255);
                docPDF.text('MVP SPORTS', 18, 5);
                f(false);
                docPDF.setFontSize(5.4);
                docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
                docPDF.text(monthName(inv.rawDate), 195, 5, { align: 'right' });
                fill(DARK);
                docPDF.rect(0, pageH - 9, 210, 9, 'F');
                fill(GREEN);
                docPDF.rect(0, pageH - 9, 210, 0.8, 'F');
                f(false);
                docPDF.setFontSize(5.6);
                docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
                docPDF.text(corp.razonSocial + ' · RUT ' + corp.rut, 10, pageH - 2.5);
                f(true);
                docPDF.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
                docPDF.text(String(data.pageNumber).padStart(2, '0'), 200, pageH - 2.5, { align: 'right' });
            }
        });

        return docPDF;
    };

    const handleDownload = async (inv: Invoice) => {
        const doc = await buildPdf(inv);
        doc.save(`Liquidacion_MVP_${inv.tenant.replace(/\s+/g, '_')}_${inv.rawDate}.pdf`);
    };

    const openPreview = async (inv: Invoice) => {
        try {
            const doc = await buildPdf(inv);
            setPreview({ url: doc.output('datauristring'), inv });
        } catch (e) {
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
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Control financiero</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Gestión de <span className="text-emerald-500 dark:text-[#00df82]">Facturación</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="relative" ref={exportRef}>
                        <button
                            onClick={() => setExportMenuOpen(o => !o)}
                            disabled={filteredInvoices.length === 0}
                            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-wider hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2} />
                            Exportar
                            <HugeiconsIcon icon={ChevronDownIcon} className={`w-3.5 h-3.5 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
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
                                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">CSV (Excel)</span>
                                        <span className="text-[9px] text-slate-400">Listado filtrado</span>
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
                                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">PDF</span>
                                        <span className="text-[9px] text-slate-400">Primera liquidación</span>
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => showAlert("Envío Masivo", "Enviando recordatorios a recintos con saldos pendientes...")}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-wider hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all"
                    >
                        <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" strokeWidth={1.8} />
                        Envío masivo
                    </button>
                    <button
                        onClick={() => setShowConfirmModal(true)}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[11px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <HugeiconsIcon icon={ReceiptIcon} className="w-4 h-4" strokeWidth={2} />
                        Generar masivo
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <TarjetaKpi titulo="Total facturado" valor={formatCLP(totalInvoiced)} sub="Solo pagos aceptados" icono={<HugeiconsIcon icon={MoneyBag01Icon} className={ic} strokeWidth={1.6} />} brillo />
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
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/40 dark:focus:border-[#00df82]/40 rounded-md text-[10px] font-black uppercase outline-none text-slate-700 dark:text-white placeholder:text-slate-400 transition-all shadow-sm"
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
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${monthAll ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black' : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-[#00df82]'}`}
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
                            className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 dark:text-white"
                        >
                            {plansList.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="flex bg-white dark:bg-white/5 p-1 rounded-md border border-slate-200 dark:border-white/10">
                        {["Todas", "Pendientes", "Pagadas"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilterStatus(f)}
                                className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-md transition-all ${filterStatus === f ? "bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black" : "text-slate-400 hover:text-slate-700 dark:hover:text-white"}`}
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
                            <tr className="bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Centro operativo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Administración</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Periodo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Plan / Comisión</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Monto</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filteredInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none mb-1">{inv.tenant}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter font-mono">ID: {inv.id.slice(0, 8)}</p>
                                            <span className="mt-1 text-[8px] font-black text-emerald-600 dark:text-[#00df82] uppercase tracking-tighter">
                                                {inv.breakdown?.totalBookings || 0} reservas pagadas
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{inv.owner}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[160px]">{inv.ownerEmail}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase font-mono">{monthShort(inv.rawDate)}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Vence: {inv.dueDate}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border w-fit ${planBadgeStyle(inv.breakdown?.planName)}`}>
                                                {inv.breakdown?.planName?.toUpperCase() || 'BASE'}
                                            </span>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                                Com. {inv.breakdown?.commissionRate || 0}% · Base {formatCLP(inv.breakdown?.totalRevenue || 0)}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <p className="text-sm font-black text-slate-900 dark:text-white font-mono">{formatCLP(inv.amount)}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                                Plan {formatCLP(inv.breakdown?.planCost || 0)} + Com. {formatCLP(inv.breakdown?.commissionTotal || 0)}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase border ${statusStyle(inv.status)}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot(inv.status)}`} />
                                            {inv.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openPreview(inv)} title="Ver liquidación" className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] rounded-md transition-all">
                                                <HugeiconsIcon icon={EyeIcon} className="w-4 h-4" strokeWidth={1.8} />
                                            </button>
                                            <button onClick={() => handleDeleteInvoice(inv.id)} title="Eliminar" className="p-2 hover:bg-red-50 text-red-400 rounded-md transition-all dark:hover:bg-red-500/10">
                                                <HugeiconsIcon icon={TrashIcon} className="w-4 h-4" strokeWidth={1.8} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(inv)}
                                                title={inv.status === 'Pagada' ? 'Marcar como pendiente' : 'Marcar como pagada'}
                                                className={`p-2 rounded-md transition-all ${inv.status === 'Pagada' ? 'hover:bg-amber-50 text-amber-500 dark:hover:bg-amber-500/10' : 'hover:bg-emerald-50 text-emerald-500 dark:hover:bg-emerald-500/10'}`}
                                            >
                                                <HugeiconsIcon icon={inv.status === 'Pagada' ? RotateCcwIcon : CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={1.8} />
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

            {/* MODAL GENERACION MASIVA */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setShowConfirmModal(false)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-md p-8 border border-slate-200 dark:border-white/10 shadow-2xl text-center relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 dark:from-white/[0.03] to-transparent pointer-events-none"></div>
                        <div className="relative z-10 w-16 h-16 bg-emerald-500/10 dark:bg-[#00df82]/10 rounded-md flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                            <HugeiconsIcon icon={ReceiptIcon} className="w-8 h-8 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.6} />
                        </div>
                        <h3 className="relative z-10 text-xl font-black uppercase text-slate-900 dark:text-white mb-2 tracking-tighter font-heading">Liquidación masiva</h3>
                        <p className="relative z-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 leading-relaxed px-4">
                            Se generarán las facturas considerando <strong>únicamente pagos aceptados</strong> para el periodo {monthAll ? 'seleccionado' : selectedMonth}.
                        </p>
                        <div className="relative z-10 flex gap-4">
                            <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 text-[9px] font-black uppercase rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Cancelar</button>
                            <button onClick={handleGenerateBulk} disabled={isGenerating} className="flex-1 py-3 text-[9px] font-black uppercase rounded-md text-white bg-emerald-500 dark:bg-[#00df82] dark:text-black shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-60">
                                {isGenerating ? 'Generando...' : 'Proceder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-md p-8 border border-slate-200 dark:border-white/10 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-14 h-14 bg-emerald-500/10 dark:bg-[#00df82]/10 rounded-md flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-7 h-7 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.6} />
                        </div>
                        <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white mb-2 tracking-tighter font-heading">{modalConfig.title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 leading-relaxed">{modalConfig.message}</p>
                        <div className="flex gap-4">
                            {modalConfig.type === 'confirm' && (
                                <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="flex-1 py-3 text-[9px] font-black uppercase rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Cancelar</button>
                            )}
                            <button onClick={() => { modalConfig.onConfirm?.(); setModalConfig({ ...modalConfig, isOpen: false }); }} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-md transition-all ${modalConfig.type === 'confirm' ? 'bg-emerald-500 dark:bg-[#00df82] dark:text-black text-white shadow-lg shadow-emerald-500/25 active:scale-95' : 'bg-emerald-500 dark:bg-[#00df82] dark:text-black text-white shadow-lg shadow-emerald-500/25 active:scale-95'}`}>
                                {modalConfig.type === 'confirm' ? 'Confirmar' : 'Entendido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL VISTA PREVIA PDF */}
            {preview.url && (
                <div className="fixed inset-0 z-[400] flex flex-col bg-black/70 backdrop-blur-md animate-fadeIn p-3 sm:p-5" onClick={closePreview}>
                    <div className="flex items-center justify-between gap-3 mb-3 w-full max-w-5xl mx-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-500/15 border border-emerald-500/25 shrink-0">
                                <HugeiconsIcon icon={EyeIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[11px] font-black uppercase text-white tracking-wider truncate font-heading">
                                    Liquidacin  {preview.inv?.tenant}
                                </p>
                                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Periodo {preview.inv?.rawDate}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => preview.inv && handleDownload(preview.inv)}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all"
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
